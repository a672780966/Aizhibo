import type { YoutubeAuthPort } from './youtubeAuth.js';

// Health 形状与 packages/shared/src/health.ts 的契约逐字段一致（status/
// lastSuccessAt/latencyMs/error）。与 DEV-035/040/041 先例相同，用本地类型镜像
// 而非引入 workspace 依赖，保持 platform-youtube 零依赖（见 DECISIONS）。
// 模块内私有：仅用于 LiveChatPoller.getHealth() 返回签名，与 twitchAuth.ts 的
// Health 处理方式一致。
type Health = {
  status: 'OK' | 'DEGRADED' | 'DOWN';
  lastSuccessAt?: number;
  latencyMs?: number;
  error?: string;
};

/**
 * 本地镜像 XState v5 的 Clock 形状（eventSubClient.ts 同款注释：XState v5 不对外
 * 导出 Clock 接口，其内部声明不公开）。与 eventSubClient.ts/DEV-041 先例一致，
 * 在本包内本地镜像、不跨包 import。now() 本节点不使用（receivedAt 来自服务端
 * publishedAt，见 DECISIONS），保留可选成员保持与测试假时钟双向结构兼容。
 */
export interface Clock {
  setTimeout(fn: (...args: unknown[]) => void, timeout: number): unknown;
  clearTimeout(id: unknown): void;
  now?(): number;
}

/**
 * Dev Spec 第 46 节没有给出 YouTube 的状态拓扑（第 45 节的八态列表是 Twitch
 * 专属权威定义，YouTube 是长轮询而非 WebSocket 会话），照搬即发明。本节点只用
 * 真实机制如实反映的最小三态：STOPPED（未连接/已断开）、POLLING（长轮询进行中
 * 或已按 nextPageToken 排定下一次请求）、ERROR（凭据失败/请求失败，不自动重试）。
 */
export type LiveChatPollerState = 'STOPPED' | 'POLLING' | 'ERROR';

/**
 * 一条 YouTube 直播聊天消息的最小字段快照。字段来自真实 liveChatMessages.list
 * 响应：items[].id、items[].authorDetails.channelId、
 * items[].snippet.textMessageDetails.messageText、items[].snippet.publishedAt
 * （服务端权威时间，ISO 8601）。本节点只转发 textMessageEvent 类型（见 poller
 * 内的 toYoutubeChatMessage 过滤）。
 */
export interface YoutubeChatMessage {
  messageId: string;
  authorChannelId: string;
  text: string;
  publishedAt: string;
}

export interface LiveChatPollerConfig {
  /** 复用 DEV-080 冻结接口，本节点唯一的凭据来源。 */
  authPort: YoutubeAuthPort;
  liveChatId: string;
  /** 测试注入；默认 https://www.googleapis.com/youtube/v3。 */
  apiBaseUrl?: string;
  /** 测试注入；默认全局 fetch（Node ≥22 原生）。 */
  fetchImpl?: typeof fetch;
  /** 测试注入；默认真实时钟，驱动下一次轮询定时器。 */
  clock?: Clock;
  onMessage?: (message: YoutubeChatMessage) => void;
}

export interface LiveChatPoller {
  connect(): void;
  disconnect(): void;
  getState(): LiveChatPollerState;
  /** POLLING → OK；STOPPED/ERROR → DOWN（error 字段说明当前状态）。 */
  getHealth(): Health;
}

const DEFAULT_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createLiveChatPoller(config: LiveChatPollerConfig): LiveChatPoller {
  const baseUrl = config.apiBaseUrl ?? DEFAULT_API_BASE_URL;
  const fetchImpl = config.fetchImpl ?? fetch;

  let state: LiveChatPollerState = 'STOPPED';
  let timerId: unknown = undefined;
  // 本 episode 的 access token（随 connect 获取、disconnect 失效，同
  // eventSubClient.ts 的 accessToken 处置）。
  let accessToken: string | undefined;
  // episode 代数：disconnect() 后重新 connect() 期间，上一 episode 晚到的
  // token/响应不得驱动新 episode（同 eventSubClient.ts「晚到的 OK/FAIL 不再
  // 驱动状态机」的处置）。单飞不需要额外标志：同一 episode 内下一次轮询只会在
  // 上一次完成后才被排定（定时器只在 pollOnce 末尾创建），connect 竞态由
  // POLLING 状态守卫拦截。
  let generation = 0;

  function schedule(fn: () => void, timeoutMs: number): unknown {
    const clock = config.clock;
    return clock !== undefined ? clock.setTimeout(fn, timeoutMs) : setTimeout(fn, timeoutMs);
  }

  function cancel(id: unknown): void {
    const clock = config.clock;
    if (clock !== undefined) clock.clearTimeout(id);
    else clearTimeout(id as NodeJS.Timeout);
  }

  function clearTimer(): void {
    if (timerId !== undefined) {
      cancel(timerId);
      timerId = undefined;
    }
  }

  let errorReason: string | undefined = undefined;

  function enterError(reason: string): void {
    state = 'ERROR';
    errorReason = reason;
    clearTimer();
  }

  // 只对 snippet.type === 'textMessageEvent' 的 item 产出消息；其余类型
  // （superChatEvent/superStickerEvent/membershipGiftEvent/…）或字段缺失的
  // 畸形 item 一律静默跳过（同 Twitch subscriptionType !==
  // 'channel.chat.message' 时诚实忽略的先例），不抛错、不猜测。
  function toYoutubeChatMessage(item: unknown): YoutubeChatMessage | undefined {
    if (typeof item !== 'object' || item === null) return undefined;
    const record = item as Record<string, unknown>;
    const { id, snippet, authorDetails } = record;
    if (typeof id !== 'string') return undefined;
    if (typeof snippet !== 'object' || snippet === null) return undefined;
    const snippetRecord = snippet as Record<string, unknown>;
    if (snippetRecord.type !== 'textMessageEvent') return undefined;
    if (typeof snippetRecord.publishedAt !== 'string') return undefined;
    const textMessageDetails = snippetRecord.textMessageDetails;
    if (typeof textMessageDetails !== 'object' || textMessageDetails === null) return undefined;
    const { messageText } = textMessageDetails as Record<string, unknown>;
    if (typeof messageText !== 'string') return undefined;
    if (typeof authorDetails !== 'object' || authorDetails === null) return undefined;
    const { channelId } = authorDetails as Record<string, unknown>;
    if (typeof channelId !== 'string') return undefined;
    return {
      messageId: id,
      authorChannelId: channelId,
      text: messageText,
      publishedAt: snippetRecord.publishedAt,
    };
  }

  async function pollOnce(pageToken: string | undefined, gen: number): Promise<void> {
    if (accessToken === undefined) return;
    const params = new URLSearchParams({
      liveChatId: config.liveChatId,
      part: 'snippet,authorDetails',
    });
    if (pageToken !== undefined) params.set('pageToken', pageToken);
    const url = `${baseUrl.replace(/\/$/, '')}/liveChat/messages?${params.toString()}`;

    let body: unknown;
    try {
      const response = await fetchImpl(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      // 请求期间若已被 disconnect()/重新 connect() 打断则丢弃结果。
      if (state !== 'POLLING' || generation !== gen) return;
      if (!response.ok) {
        enterError(`live chat poll failed: ${response.status} ${response.statusText}`);
        return;
      }
      body = await response.json().catch(() => undefined);
    } catch (error) {
      if (state === 'POLLING' && generation === gen) {
        enterError(errorMessage(error));
      }
      return;
    }
    if (state !== 'POLLING' || generation !== gen) return;
    if (!isPollResponseBody(body)) {
      enterError('live chat poll response has an unexpected shape');
      return;
    }

    const items = body.items === undefined ? [] : (body.items as unknown[]);
    for (const item of items) {
      const message = toYoutubeChatMessage(item);
      if (message !== undefined) config.onMessage?.(message);
    }
    // onMessage 回调可能同步调用 disconnect()/重新 connect()（重入）：投递完当前批次后、
    // 排定下一次定时器前重新校验，否则回调内断开仍会照常排定新定时器（MAJOR-01）。
    if (state !== 'POLLING' || generation !== gen) return;

    // 用响应携带的 nextPageToken 与 pollingIntervalMillis 排定下一次带
    // pageToken 的请求（长轮询续传，无需自建高频轮询）。
    const nextPageToken = body.nextPageToken;
    if (typeof nextPageToken === 'string') {
      timerId = schedule(() => {
        timerId = undefined;
        void pollOnce(nextPageToken, gen);
      }, body.pollingIntervalMillis);
    } else {
      // nextPageToken 缺失 = API 告知直播聊天已结束（真实 YouTube 行为：
      // 聊天关闭后响应不再带游标）——停止轮询回 STOPPED，不是错误。
      state = 'STOPPED';
    }
  }

  return {
    connect(): void {
      if (state === 'POLLING') return; // 已在轮询，重复 connect 忽略
      // STOPPED/ERROR 均可（重新）发起；ERROR 后调用方直接再 connect()（A13）。
      generation += 1;
      const gen = generation;
      state = 'POLLING';
      errorReason = undefined;
      clearTimer();
      void config.authPort.getAccessToken().then((result) => {
        // 等待凭据期间若被 disconnect()/重新 connect() 打断，不再继续。
        if (state !== 'POLLING' || generation !== gen) return;
        if (!result.ok) {
          // 诚实失败：凭据不可用直接 ERROR，不发起任何 HTTP 请求。
          enterError(result.reason);
          return;
        }
        accessToken = result.token.accessToken;
        void pollOnce(undefined, gen); // 首次请求不带 pageToken
      });
    },
    disconnect(): void {
      generation += 1;
      clearTimer();
      accessToken = undefined;
      state = 'STOPPED';
      errorReason = undefined;
    },
    getState(): LiveChatPollerState {
      return state;
    },
    getHealth(): Health {
      return state === 'POLLING'
        ? { status: 'OK' }
        : { status: 'DOWN', error: errorReason ?? `state: ${state}` };
    },
  };
}

/** liveChatMessages.list 成功响应的最小形状：pollingIntervalMillis 真实必带。 */
function isPollResponseBody(value: unknown): value is {
  items?: unknown;
  nextPageToken?: unknown;
  pollingIntervalMillis: number;
} {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.pollingIntervalMillis !== 'number') return false;
  if (record.items !== undefined && !Array.isArray(record.items)) return false;
  if (record.nextPageToken !== undefined && typeof record.nextPageToken !== 'string') {
    return false;
  }
  return true;
}
