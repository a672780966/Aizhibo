import { createHash, createHmac, randomBytes } from 'node:crypto';

/**
 * Bilibili 直播开放平台（open-live.bilibili.com 官方第三方应用接入体系）项目场次
 * 生命周期客户端：`/v2/app/start`（用主播身份码启动场次，拿到
 * `game_info.game_id`/`websocket_info.auth_body`/`websocket_info.wss_link`）、
 * `/v2/app/heartbeat`（每 20 秒一次，超过 60 秒无心跳服务端自动关闭场次）、
 * `/v2/app/end`（结束场次）。零 SDK，手写 `fetch`；HMAC-SHA256 签名用 Node
 * 内置 `node:crypto`（运行时自带 API，不算新增依赖，同 `crypto`/`fetch` 均
 * 为运行时自带 API 的既有先例，见 DECISIONS D6）。
 *
 * 真实签名机制核查（Task Package §1 第 4 点字段集）：三个接口的请求都要带
 * `x-bili-content-md5`（body JSON 字符串的 MD5）/`x-bili-timestamp`（当前 10 位
 * 秒级时间戳）/`x-bili-signature-version: 1.0`/`x-bili-signature-nonce`（随机串）/
 * `x-bili-signature-method: HMAC-SHA256`/`x-bili-accesskeyid` 六个自定义头，
 * `Authorization` 为 HMAC-SHA256 十六进制结果。官方签名实现仓库
 * （bilibili-openplatform/SignatureAlgorithm_DotnetDemo）给出规范布局：抽全部
 * `x-bili-` 前缀头按名字典序，以 `name:value` 行 `\n` 拼接为待签字符串（无末尾
 * 换行），用 `access_key_secret` 作密钥做 HMAC-SHA256，输出小写 hex——Task
 * Package 的"固定顺序"按真实机制落实为字典序（见 DECISIONS D6）。
 */

/** `/v2/app/start` 成功响应里本节点真正消费的场次信息（真实响应字段）。 */
export interface BilibiliGameSession {
  /** game_info.game_id：HTTP 场次心跳与结束场次用。 */
  gameId: string;
  /** websocket_info.auth_body：长连鉴权 JSON 字符串，第三方无需解析其内容，建连时原样使用。 */
  authBody: string;
  /** websocket_info.wss_link：长连地址列表（真实字段）。 */
  wssLinks: string[];
}

export type BilibiliStartResult =
  { ok: true; session: BilibiliGameSession } | { ok: false; reason: string };

export type BilibiliVoidResult = { ok: true } | { ok: false; reason: string };

export interface BilibiliAuthPort {
  startGame(): Promise<BilibiliStartResult>;
  heartbeat(gameId: string): Promise<BilibiliVoidResult>;
  endGame(gameId: string): Promise<BilibiliVoidResult>;
}

export const noopBilibiliAuthPort: BilibiliAuthPort = {
  startGame: async () => ({
    ok: false,
    reason: 'no Bilibili open-platform credentials configured',
  }),
  heartbeat: async () => ({
    ok: false,
    reason: 'no Bilibili open-platform credentials configured',
  }),
  endGame: async () => ({ ok: false, reason: 'no Bilibili open-platform credentials configured' }),
};

export interface BilibiliAuthProviderConfig {
  /** 开放平台项目 ID，`/v2/app/start` 的 `app_id` 参数与 `/v2/app/end` body 内重复携带。 */
  appId: string;
  /** B 站侧给出的 Access Key（`x-bili-accesskeyid` 头）。 */
  accessKeyId: string;
  /** HMAC 密钥（`access_key_secret`），绝不发送给服务端，只作签名密钥。 */
  accessKeySecret: string;
  /** 主播身份码，`/v2/app/start` 的 `code` 参数。 */
  anchorCode: string;
  /** 测试注入；默认 https://live-open.biliapi.com。 */
  baseUrl?: string;
  /** 测试注入；默认全局 fetch（Node ≥22 原生）。 */
  fetchImpl?: typeof fetch;
}

const DEFAULT_BASE_URL = 'https://live-open.biliapi.com';

/** MD5 十六进制（小写），`x-bili-content-md5` 的计算方式：body JSON 字符串 UTF-8 编码后取 MD5。 */
export function bilibiliContentMd5(body: string): string {
  return createHash('md5').update(body, 'utf8').digest('hex');
}

export interface BilibiliSignatureInput {
  accessKeyId: string;
  accessKeySecret: string;
  contentMd5: string;
  timestamp: string;
  nonce: string;
}

/**
 * HMAC-SHA256 签名（Task Package §1 第 4 点）：六个 `x-bili-` 头按名字典序拼成
 * `name:value` 行、行间 `\n`（无末尾换行）为待签字符串，以 `access_key_secret`
 * 作密钥，输出小写十六进制。纯函数导出供 A10 已知输入→确定性十六进制测试。
 */
export function computeBilibiliAuthorization(input: BilibiliSignatureInput): string {
  const canonical = [
    `x-bili-accesskeyid:${input.accessKeyId}`,
    `x-bili-content-md5:${input.contentMd5}`,
    'x-bili-signature-method:HMAC-SHA256',
    `x-bili-signature-nonce:${input.nonce}`,
    'x-bili-signature-version:1.0',
    `x-bili-timestamp:${input.timestamp}`,
  ].join('\n');
  return createHmac('sha256', input.accessKeySecret).update(canonical, 'utf8').digest('hex');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function endpoint(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

/** 一次请求的六个签名头 + Authorization + content-type。body 字符串须与最终发送
 * 的字节完全一致（MD5 与签名都基于它），故调用方先序列化、再传同一字符串。 */
function signedHeaders(config: BilibiliAuthProviderConfig, body: string): Record<string, string> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = randomBytes(16).toString('hex');
  const contentMd5 = bilibiliContentMd5(body);
  return {
    'content-type': 'application/json',
    'x-bili-accesskeyid': config.accessKeyId,
    'x-bili-content-md5': contentMd5,
    'x-bili-timestamp': timestamp,
    'x-bili-signature-version': '1.0',
    'x-bili-signature-nonce': nonce,
    'x-bili-signature-method': 'HMAC-SHA256',
    Authorization: computeBilibiliAuthorization({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      contentMd5,
      timestamp,
      nonce,
    }),
  };
}

/**
 * 开放平台统一响应信封：HTTP 200 不保证业务成功，`body.code === 0` 才是成功
 * （非 0 是业务错误码，如凭据/身份码无效）。解包失败返回 `{ok:false,reason}`。
 */
function unwrapEnvelope(
  json: unknown,
): { ok: true; data: unknown } | { ok: false; reason: string } {
  if (typeof json !== 'object' || json === null) {
    return { ok: false, reason: 'response body is not a JSON object' };
  }
  const record = json as Record<string, unknown>;
  if (record.code !== 0) {
    const message = typeof record.message === 'string' ? record.message : '';
    return {
      ok: false,
      reason: `response code=${String(record.code)}${message !== '' ? ` message=${message}` : ''}`,
    };
  }
  return { ok: true, data: record.data };
}

/** 从 `/v2/app/start` 的 `data` 里取真实字段；形状不符（字段缺失/类型不对/
 * wss_link 空）返回 undefined（信任边界守卫，不猜测）。 */
function parseGameSession(value: unknown): BilibiliGameSession | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const data = value as Record<string, unknown>;
  const gameInfo = data.game_info;
  const websocketInfo = data.websocket_info;
  if (typeof gameInfo !== 'object' || gameInfo === null) return undefined;
  if (typeof websocketInfo !== 'object' || websocketInfo === null) return undefined;
  const { game_id: gameId } = gameInfo as Record<string, unknown>;
  const { auth_body: authBody, wss_link: wssLink } = websocketInfo as Record<string, unknown>;
  if (typeof gameId !== 'string' || gameId === '') return undefined;
  if (typeof authBody !== 'string' || authBody === '') return undefined;
  if (!Array.isArray(wssLink)) return undefined;
  const wssLinks = wssLink.filter((url): url is string => typeof url === 'string');
  if (wssLinks.length === 0) return undefined;
  return { gameId, authBody, wssLinks };
}

export function createBilibiliAuthProvider(config: BilibiliAuthProviderConfig): BilibiliAuthPort {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const fetchImpl = config.fetchImpl ?? fetch;

  /**
   * 签名 POST。返回已解包的 `data` 或 `{ok:false,reason}`——任何失败（fetch 抛
   * 错/非 2xx/非 JSON/信封 code≠0）都落到 reason，不抛异常（同 Twitch/YouTube
   * auth 先例）。
   */
  async function postJson(
    path: string,
    body: string,
  ): Promise<{ ok: true; data: unknown } | { ok: false; reason: string }> {
    let response: Response;
    try {
      response = await fetchImpl(endpoint(baseUrl, path), {
        method: 'POST',
        headers: signedHeaders(config, body),
        body,
      });
    } catch (error) {
      return { ok: false, reason: `Bilibili ${path} request failed: ${errorMessage(error)}` };
    }
    if (!response.ok) {
      // 只带 HTTP 状态码：statusText 在 undici/部分运行时可为空串，不稳定，不纳入原因。
      return { ok: false, reason: `Bilibili ${path} request failed: ${response.status}` };
    }
    const json: unknown = await response.json().catch(() => undefined);
    if (json === undefined) {
      return { ok: false, reason: `Bilibili ${path} response is not JSON` };
    }
    const envelope = unwrapEnvelope(json);
    if (!envelope.ok) {
      return { ok: false, reason: `Bilibili ${path} failed: ${envelope.reason}` };
    }
    return { ok: true, data: envelope.data };
  }

  return {
    async startGame(): Promise<BilibiliStartResult> {
      const body = JSON.stringify({ code: config.anchorCode, app_id: config.appId });
      const response = await postJson('/v2/app/start', body);
      if (!response.ok) return response;
      const session = parseGameSession(response.data);
      if (session === undefined) {
        return {
          ok: false,
          reason:
            'Bilibili /v2/app/start succeeded but response lacks game_info.game_id / websocket_info.auth_body / websocket_info.wss_link',
        };
      }
      return { ok: true, session };
    },
    async heartbeat(gameId: string): Promise<BilibiliVoidResult> {
      const body = JSON.stringify({ game_id: gameId });
      const response = await postJson('/v2/app/heartbeat', body);
      return response.ok ? { ok: true } : response;
    },
    async endGame(gameId: string): Promise<BilibiliVoidResult> {
      const body = JSON.stringify({ app_id: config.appId, game_id: gameId });
      const response = await postJson('/v2/app/end', body);
      return response.ok ? { ok: true } : response;
    },
  };
}

/**
 * 从环境变量读凭据；`BILIBILI_APP_ID`/`BILIBILI_ACCESS_KEY_ID`/
 * `BILIBILI_ACCESS_KEY_SECRET`/`BILIBILI_ANCHOR_CODE` 任一缺失（或空串）即返回
 * `noopBilibiliAuthPort`（同 createOptionalYoutubeAuthProvider /
 * createOptionalTwitchAuthProvider 精确先例——USER 已就 M8 明确裁决"不要让任何
 * 真实数据阻碍完成"）。
 */
export function createOptionalBilibiliAuthProvider(env: NodeJS.ProcessEnv): BilibiliAuthPort {
  const appId = env.BILIBILI_APP_ID;
  const accessKeyId = env.BILIBILI_ACCESS_KEY_ID;
  const accessKeySecret = env.BILIBILI_ACCESS_KEY_SECRET;
  const anchorCode = env.BILIBILI_ANCHOR_CODE;
  if (!appId || !accessKeyId || !accessKeySecret || !anchorCode) return noopBilibiliAuthPort;
  return createBilibiliAuthProvider({ appId, accessKeyId, accessKeySecret, anchorCode });
}
