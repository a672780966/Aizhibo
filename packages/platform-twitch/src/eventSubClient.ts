import { createActor, createMachine } from 'xstate';
import type { TwitchAuthPort } from './twitchAuth.js';

// Health 形状与 packages/shared/src/health.ts 的契约逐字段一致（status/
// lastSuccessAt/latencyMs/error）。与 DEV-035/040 先例相同，用本地类型镜像而
// 非引入 workspace 依赖，保持 platform-twitch 零非 xstate 依赖（见 DECISIONS）。
// 模块内私有：仅用于 EventSubClient.getHealth() 返回签名，与 twitchAuth.ts 的
// Health 处理方式一致。
type Health = {
  status: 'OK' | 'DEGRADED' | 'DOWN';
  lastSuccessAt?: number;
  latencyMs?: number;
  error?: string;
};

/**
 * 本地镜像 XState v5 的 Clock 结构（runtime-kernel machine.ts 注释：XState v5
 * 不对外导出 Clock 接口，其内部声明不公开）。Constraint 7 要求 Clock/Health
 * 在本包内本地镜像、不跨包 import，与 DEV-035/037/040 先例一致。
 */
export interface Clock {
  setTimeout(fn: (...args: unknown[]) => void, timeout: number): unknown;
  clearTimeout(id: unknown): void;
  /**
   * 可选：当前时间戳，供 notification 的 receivedAt 使用。未提供时实现回退
   * Date.now()。可选成员保持与 XState v5 时钟形状（仅 setTimeout/clearTimeout）
   * 双向结构兼容；DEV-037 的 ClockPort 亦有 now()，测试假时钟可同时提供两者。
   */
  now?(): number;
}

/** Dev Spec 第 45 节八态拓扑（本节点唯一权威状态列表）。 */
export type EventSubClientState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'WELCOME'
  | 'SUBSCRIBING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'DEGRADED'
  | 'ERROR';

/**
 * 收到的 EventSub notification 帧原样快照。不做任何字段转换/去重——那是
 * DEV-042（NormalizedChatMessage）/DEV-043（去重存储）的职责。
 */
export interface TwitchChatNotification {
  /** 原样保留 payload.subscription.type，本节点只处理 'channel.chat.message'。 */
  subscriptionType: string;
  /** 原样保留 payload.event，不做任何字段映射。 */
  event: unknown;
  /** 原样保留 metadata.message_id（供 DEV-043 去重使用，本节点不去重）。 */
  messageId: string;
  /** 本地收到时间（由注入的 clock 驱动，测试可确定性快进）。 */
  receivedAt: number;
}

export interface EventSubClientConfig {
  /** 复用 DEV-040 冻结接口，本节点唯一的凭据来源。 */
  authPort: TwitchAuthPort;
  clientId: string;
  broadcasterUserId: string;
  /** channel.chat.message 的 condition.user_id（bot 自己的 user id）。 */
  userId: string;
  /** 测试注入；默认 wss://eventsub.wss.twitch.tv/ws。 */
  wsUrl?: string;
  /** 测试注入；默认 https://api.twitch.tv。 */
  helixBaseUrl?: string;
  /** 测试注入；默认全局 WebSocket（Node ≥22 原生）。 */
  webSocketImpl?: typeof WebSocket;
  /** 测试注入；默认全局 fetch（Node ≥22 原生）。 */
  fetchImpl?: typeof fetch;
  /** 测试注入；默认真实时钟，驱动 keepalive watchdog。 */
  clock?: Clock;
  onNotification?: (notification: TwitchChatNotification) => void;
}

export interface EventSubClient {
  connect(): void;
  disconnect(): void;
  getState(): EventSubClientState;
  /** CR-019：CONNECTED → OK，其余七态 → DOWN（error 字段说明当前状态）。 */
  getHealth(): Health;
}

/**
 * 事件名（骨架占位，下一步接真实 WebSocket/fetch/clock 逻辑后由实现方发送）：
 *
 * - `CONNECT`：connect() 发起（先取 access token，成功才建 WS）
 * - `WS_OPEN`：WebSocket 连接已建立（CONNECTING 内自循环占位，等 welcome 帧）
 * - `WELCOME_RECEIVED`：收到 `session_welcome` 帧，携带 `session.id`
 * - `SUBSCRIBE_OK` / `SUBSCRIBE_FAIL`：Helix 订阅 POST 返回 202 / 非 202 或异常
 * - `NOTIFICATION`：收到 `notification` 帧（原样转发 onNotification，不做转换/去重）
 * - `KEEPALIVE`：收到 `session_keepalive` 帧（重置 watchdog）
 * - `KEEPALIVE_TIMEOUT`：watchdog 超时（clock 驱动，未收到任何消息）→ DEGRADED
 * - `RECONNECT_SIGNAL`：收到 `session_reconnect` 帧（只转 RECONNECTING，不真正重连——DEV-045）
 * - `WS_ERROR`：WebSocket 层 error/意外 close（非本地 disconnect() 触发）→ ERROR
 * - `DISCONNECT`：disconnect() 主动调用，任意态 → DISCONNECTED 并关闭 socket
 *
 * 转移边严格对应 Task Package 第 2.1 节八态规则。action 全部留空占位。
 */
const eventSubMachine = createMachine({
  id: 'eventSubClient',
  initial: 'DISCONNECTED',
  states: {
    DISCONNECTED: {
      on: {
        CONNECT: { target: 'CONNECTING' },
      },
    },
    CONNECTING: {
      on: {
        // WS 连接已建立但 welcome 帧未到：自循环占位（无状态变化）。
        WS_OPEN: { actions: [] },
        WELCOME_RECEIVED: { target: 'WELCOME' },
        WS_ERROR: { target: 'ERROR' },
        DISCONNECT: { target: 'DISCONNECTED' },
      },
    },
    // 收到 session_welcome → WELCOME（记录 session.id）；随后自动（同一逻辑
    // 步骤内）转 SUBSCRIBING：用 fetchImpl POST Helix 订阅，202 → CONNECTED，
    // 非 202/异常 → ERROR。
    WELCOME: {
      always: { target: 'SUBSCRIBING' },
      on: {
        RECONNECT_SIGNAL: { target: 'RECONNECTING' },
        WS_ERROR: { target: 'ERROR' },
        DISCONNECT: { target: 'DISCONNECTED' },
      },
    },
    SUBSCRIBING: {
      on: {
        SUBSCRIBE_OK: { target: 'CONNECTED' },
        SUBSCRIBE_FAIL: { target: 'ERROR' },
        RECONNECT_SIGNAL: { target: 'RECONNECTING' },
        WS_ERROR: { target: 'ERROR' },
        DISCONNECT: { target: 'DISCONNECTED' },
      },
    },
    CONNECTED: {
      on: {
        // notification / keepalive 均不改变状态；action 占位（转发/重置 watchdog）。
        NOTIFICATION: { actions: [] },
        KEEPALIVE: { actions: [] },
        KEEPALIVE_TIMEOUT: { target: 'DEGRADED' },
        RECONNECT_SIGNAL: { target: 'RECONNECTING' },
        WS_ERROR: { target: 'ERROR' },
        DISCONNECT: { target: 'DISCONNECTED' },
      },
    },
    // 只转状态，不实现真正重连到 payload.session.reconnect_url（DEV-045 职责）。
    RECONNECTING: {
      on: {
        DISCONNECT: { target: 'DISCONNECTED' },
      },
    },
    DEGRADED: {
      on: {
        WS_ERROR: { target: 'ERROR' },
        DISCONNECT: { target: 'DISCONNECTED' },
      },
    },
    ERROR: {
      on: {
        DISCONNECT: { target: 'DISCONNECTED' },
      },
    },
  },
});

export function createEventSubClient(config: EventSubClientConfig): EventSubClient {
  const wsUrl = config.wsUrl ?? 'wss://eventsub.wss.twitch.tv/ws';
  const helixBaseUrl = config.helixBaseUrl ?? 'https://api.twitch.tv';
  const WebSocketImpl = config.webSocketImpl ?? WebSocket;
  const fetchImpl = config.fetchImpl ?? fetch;
  const actor = createActor(eventSubMachine).start();

  // 每个 client 实例独立的连接期状态（后续步骤接入 keepalive/notification 时继续扩展）。
  let socket: WebSocket | null = null;
  // 本地 disconnect() 触发的关闭要抑制 close→WS_ERROR；其余意外关闭一律 ERROR。
  let locallyClosed = false;
  // 暂存 connect() 拿到的 access token，供 welcome 后的 Helix 订阅请求使用。
  let accessToken: string | undefined;
  // 暂存 welcome 帧的 payload.session.id，作为 Helix 订阅 transport.session_id。
  let sessionId: string | undefined;
  // keepalive watchdog：config.clock 驱动（无注入时钟时回退真实 setTimeout）。
  // keepalive_timeout_seconds 来自 welcome 帧；超时（×1.5 缓冲）未收到任何
  // keepalive/notification → KEEPALIVE_TIMEOUT → DEGRADED。
  let keepaliveTimeoutSeconds: number | undefined;
  let watchdogId: unknown = undefined;

  function schedule(fn: () => void, timeoutMs: number): unknown {
    const clock = config.clock;
    return clock !== undefined ? clock.setTimeout(fn, timeoutMs) : setTimeout(fn, timeoutMs);
  }

  function cancel(id: unknown): void {
    const clock = config.clock;
    if (clock !== undefined) clock.clearTimeout(id);
    else clearTimeout(id as NodeJS.Timeout);
  }

  function currentTime(): number {
    const clock = config.clock;
    return clock !== undefined && clock.now !== undefined ? clock.now() : Date.now();
  }

  function clearWatchdog(): void {
    if (watchdogId !== undefined) {
      cancel(watchdogId);
      watchdogId = undefined;
    }
  }

  function armWatchdog(): void {
    clearWatchdog();
    if (keepaliveTimeoutSeconds === undefined) return;
    watchdogId = schedule(
      () => {
        watchdogId = undefined;
        actor.send({ type: 'KEEPALIVE_TIMEOUT' });
      },
      keepaliveTimeoutSeconds * 1000 * 1.5,
    );
  }

  function createSubscription(): void {
    // Helix 订阅创建：POST /helix/eventsub/subscriptions，202 → SUBSCRIBE_OK（→ CONNECTED），
    // 其他状态码/异常 → SUBSCRIBE_FAIL（→ ERROR）。不重试（DEV-045 职责）。
    if (accessToken === undefined || sessionId === undefined) {
      actor.send({ type: 'SUBSCRIBE_FAIL' });
      return;
    }
    void fetchImpl(`${helixBaseUrl}/helix/eventsub/subscriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Client-Id': config.clientId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'channel.chat.message',
        version: '1',
        condition: {
          broadcaster_user_id: config.broadcasterUserId,
          user_id: config.userId,
        },
        transport: {
          method: 'websocket',
          session_id: sessionId,
        },
      }),
    })
      .then((response) => {
        // 请求期间若已被 disconnect() 打断则丢弃结果（晚到的 OK/FAIL 不再驱动状态机）。
        if (actor.getSnapshot().value !== 'SUBSCRIBING') return;
        if (response.status !== 202) {
          actor.send({ type: 'SUBSCRIBE_FAIL' });
          return;
        }
        actor.send({ type: 'SUBSCRIBE_OK' }); // → CONNECTED
        // CONNECTED 起持续监控：进入即 arm watchdog（keepalive/notification 到达时重置）。
        // keepalive_timeout_seconds 来自 welcome 帧；超时（×1.5 缓冲）未收到任何
        // 消息 → KEEPALIVE_TIMEOUT → DEGRADED。
        armWatchdog();
      })
      .catch(() => {
        if (actor.getSnapshot().value !== 'SUBSCRIBING') return;
        actor.send({ type: 'SUBSCRIBE_FAIL' });
      });
  }

  function handleFrame(raw: unknown): void {
    // undici message event 的 data 可能是 string | Blob | ArrayBuffer；EventSub 走文本帧。
    if (typeof raw !== 'string') return;
    let frame: unknown;
    try {
      frame = JSON.parse(raw);
    } catch {
      return;
    }
    const record = frame as {
      metadata?: { message_type?: unknown; message_id?: unknown };
      payload?: {
        session?: { id?: unknown; keepalive_timeout_seconds?: unknown };
        subscription?: { type?: unknown };
        event?: unknown;
      };
    };
    const messageType = record.metadata?.message_type;
    if (messageType === 'session_welcome') {
      const session = record.payload?.session;
      const id = session?.id;
      if (typeof id === 'string') sessionId = id;
      const keepalive = session?.keepalive_timeout_seconds;
      if (typeof keepalive === 'number') keepaliveTimeoutSeconds = keepalive;
      actor.send({ type: 'WELCOME_RECEIVED' }); // → WELCOME →（always）SUBSCRIBING
      // welcome 后（同一逻辑步骤内）紧接着发起 Helix 订阅创建。
      createSubscription();
    } else if (messageType === 'notification') {
      // 收到消息即算“连接活着”：notification 同样重置 watchdog。
      armWatchdog();
      const subscriptionType = record.payload?.subscription?.type;
      const messageId = record.metadata?.message_id;
      if (
        config.onNotification !== undefined &&
        typeof subscriptionType === 'string' &&
        typeof messageId === 'string'
      ) {
        // 原样快照转发，不做字段转换/去重（DEV-042/043 职责）。
        config.onNotification({
          subscriptionType,
          event: record.payload?.event,
          messageId,
          receivedAt: currentTime(),
        });
      }
      // 不 send 任何 actor 事件：状态保持 CONNECTED。
    } else if (messageType === 'session_keepalive') {
      armWatchdog();
    } else if (messageType === 'session_reconnect') {
      // 只转 RECONNECTING 状态，不实现真正重连（DEV-045 职责）。
      actor.send({ type: 'RECONNECT_SIGNAL' });
    }
  }

  function openSocket(): void {
    socket = new WebSocketImpl(wsUrl);
    locallyClosed = false;
    socket.addEventListener('message', (event) => handleFrame(event.data));
    socket.addEventListener('error', () => {
      actor.send({ type: 'WS_ERROR' });
    });
    socket.addEventListener('close', () => {
      if (!locallyClosed) actor.send({ type: 'WS_ERROR' });
    });
  }

  return {
    connect(): void {
      // 重复 connect（已连接/连接中/错误态）忽略；ERROR 后需先 disconnect()（真重连是 DEV-045）。
      if (actor.getSnapshot().value !== 'DISCONNECTED') return;
      actor.send({ type: 'CONNECT' }); // → CONNECTING
      void config.authPort.getAccessToken().then((result) => {
        // 等待凭据期间若被 disconnect() 打断，不再继续建连接。
        if (actor.getSnapshot().value !== 'CONNECTING') return;
        if (!result.ok) {
          // 诚实失败：凭据不可用直接 ERROR，不构造 WebSocket（Constraint 2）。
          actor.send({ type: 'WS_ERROR' });
          return;
        }
        accessToken = result.token.accessToken;
        openSocket();
      });
    },
    disconnect(): void {
      if (socket !== null) {
        locallyClosed = true;
        socket.close();
        socket = null;
      }
      // 连接期凭据/session/watchdog 随断开一并失效，下次 connect() 重新获取。
      clearWatchdog();
      accessToken = undefined;
      sessionId = undefined;
      actor.send({ type: 'DISCONNECT' });
    },
    getState(): EventSubClientState {
      return actor.getSnapshot().value as EventSubClientState;
    },
    // 占位实现：CONNECTED → OK，其余 → DOWN（error 字段说明当前状态）。
    getHealth(): Health {
      const state = actor.getSnapshot().value as EventSubClientState;
      return state === 'CONNECTED'
        ? { status: 'OK' }
        : { status: 'DOWN', error: `state: ${state}` };
    },
  };
}
