import type { BilibiliAuthPort, BilibiliGameSession } from './bilibiliAuth.js';

// Health 形状与 packages/shared/src/health.ts 的契约逐字段一致（status/
// lastSuccessAt/latencyMs/error）。与 DEV-035/040/041/080 先例相同，用本地类型
// 镜像而非引入 workspace 依赖（见 DECISIONS D2）。模块内私有：仅用于
// LiveConnectClient.getHealth() 返回签名。
type Health = {
  status: 'OK' | 'DEGRADED' | 'DOWN';
  lastSuccessAt?: number;
  latencyMs?: number;
  error?: string;
};

/**
 * 本地镜像 XState v5 的 Clock 形状（eventSubClient.ts 同款注释：XState v5 不对外
 * 导出 Clock 接口，其内部声明不公开）。与 DEV-040/041/080 先例一致，在本包内
 * 本地镜像、不跨包 import。now() 本节点不使用（receivedAt 来自服务端
 * timestamp，见 DECISIONS D3），保留可选成员保持与测试假时钟双向结构兼容。
 */
export interface Clock {
  setTimeout(fn: (...args: unknown[]) => void, timeout: number): unknown;
  clearTimeout(id: unknown): void;
  now?(): number;
}

/**
 * WebSocket 长连客户端状态拓扑（Task Package §2 冻结的六态，**不照搬**
 * eventSubClient.ts 的八态机——Dev Spec 第 45 节八态是 Twitch 专属权威定义，本
 * 协议机制不同：有两条独立心跳（HTTP 场次心跳 + WS 心跳），且本包不引入 xstate
 * 依赖，用状态变量 + generation 代数守卫表达（同 liveChatPoller.ts 先例，见
 * DECISIONS D2））：
 *
 * - STOPPED：未连接/已断开（disconnect() 后驻留态）
 * - STARTING：connect() 已发起，等待 `authPort.startGame()` 返回
 * - CONNECTING：startGame 成功，WebSocket 已构造、尚未 onopen
 * - AUTHENTICATING：onopen 后已发送 op=7 认证包，等待 op=8 认证回复
 * - CONNECTED：认证成功，两条心跳定时器运行中（真实驻留态）
 * - ERROR：startGame 失败 / 认证失败 / WS 提前 error/close，不自动重试
 */
export type LiveConnectState =
  'STOPPED' | 'STARTING' | 'CONNECTING' | 'AUTHENTICATING' | 'CONNECTED' | 'ERROR';

/**
 * 一条 Bilibili 弹幕的最小字段快照，来自 op=5 包 body `cmd ===
 * 'LIVE_OPEN_PLATFORM_DM'` 的 `data` 真实字段（本节点只消费其中四个）：
 * `msg_id`/`open_id`（用户唯一标识，`uid` 已废弃恒 0 不使用）/`msg`/
 * `timestamp`（秒级服务端时间）。
 */
export interface BilibiliChatMessage {
  msgId: string;
  openId: string;
  text: string;
  timestamp: number;
}

export interface LiveConnectClientConfig {
  /** 复用本节点冻结的 BilibiliAuthPort，startGame/heartbeat/endGame 的凭据来源。 */
  authPort: BilibiliAuthPort;
  /** 测试注入；默认全局 WebSocket（Node ≥22 原生），同 eventSubClient.ts 先例。 */
  webSocketImpl?: typeof WebSocket;
  /** 测试注入；默认真实时钟，驱动两条心跳定时器。 */
  clock?: Clock;
  onMessage?: (message: BilibiliChatMessage) => void;
}

export interface LiveConnectClient {
  connect(): void;
  disconnect(): void;
  getState(): LiveConnectState;
  /** CONNECTED → OK；最近一次 HTTP 场次心跳失败 → DEGRADED（连接不中断，见
   * DECISIONS D2）；其余态 → DOWN（error 字段说明当前状态）。 */
  getHealth(): Health;
}

/** 二进制包头固定 16 字节（Task Package §1 第 7 点，网络字节序）：
 * packetLen(int32)/headerLen(int16,恒16)/protoVersion(int16)/op(int32)/seq(int32)，
 * 随后是 UTF-8 JSON body。 */
export interface LiveFrame {
  op: number;
  protoVersion: number;
  seq: number;
  body: Uint8Array;
}

export const LIVE_HEADER_BYTES = 16;
/** op 码（真实协议，Task Package §1 第 5/6 点）：2=客户端心跳，3=服务端心跳
 * 回复，5=业务推送（按 cmd 分发），7=客户端认证，8=服务端认证回复。 */
export const WS_OP_HEARTBEAT = 2;
export const WS_OP_HEARTBEAT_REPLY = 3;
export const WS_OP_BUSINESS = 5;
export const WS_OP_AUTH = 7;
export const WS_OP_AUTH_REPLY = 8;
/** 客户端 seq 固定 1（Task Package §1 第 7 点）。 */
export const CLIENT_SEQ = 1;
/** 连接类消息（认证/心跳）protoVersion=1；业务消息不压缩用 0。本节点只发连接
 * 类包，收到业务包期望 protoVersion∈{0,1}，其余（2=zlib/3=Brotli）视为解析失败。 */
const PROTO_VERSION_CONNECTION = 1;
const PROTO_VERSION_UNCOMPRESSED = 0;

/** 编码：body 字节前加 16 字节包头。packetLen = 16 + body.length。 */
export function encodeLiveFrame(
  op: number,
  protoVersion: number,
  seq: number,
  body: Uint8Array,
): Uint8Array {
  const packetLen = LIVE_HEADER_BYTES + body.length;
  const bytes = new Uint8Array(packetLen);
  const view = new DataView(bytes.buffer);
  view.setInt32(0, packetLen, false);
  view.setInt16(4, LIVE_HEADER_BYTES, false);
  view.setInt16(6, protoVersion, false);
  view.setInt32(8, op, false);
  view.setInt32(12, seq, false);
  bytes.set(body, LIVE_HEADER_BYTES);
  return bytes;
}

/**
 * 解码：整包语义——一条 WebSocket 消息承载一个完整帧，packetLen 必须等于整包
 * 长度（多处帧拼接的真实性未经证实，见 DECISIONS D8）；headerLen≠16（无法信任
 * 布局）、protoVersion∉{0,1}（zlib/Brotli 压缩，本节点不实现，同字段不对时诚实
 * 失败先例）、长度不足均返回 undefined。
 */
export function decodeLiveFrame(bytes: Uint8Array): LiveFrame | undefined {
  if (bytes.length < LIVE_HEADER_BYTES) return undefined;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const packetLen = view.getInt32(0, false);
  const headerLen = view.getInt16(4, false);
  const protoVersion = view.getInt16(6, false);
  const op = view.getInt32(8, false);
  const seq = view.getInt32(12, false);
  if (headerLen !== LIVE_HEADER_BYTES) return undefined;
  if (packetLen !== bytes.length) return undefined;
  if (protoVersion !== PROTO_VERSION_CONNECTION && protoVersion !== PROTO_VERSION_UNCOMPRESSED) {
    return undefined;
  }
  return { op, protoVersion, seq, body: bytes.slice(LIVE_HEADER_BYTES) };
}

const HTTP_SESSION_HEARTBEAT_INTERVAL_MS = 20_000;
const WS_HEARTBEAT_INTERVAL_MS = 30_000;
const WS_HEARTBEAT_BODY = '{}';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createLiveConnectClient(config: LiveConnectClientConfig): LiveConnectClient {
  const WebSocketImpl = config.webSocketImpl ?? WebSocket;

  let state: LiveConnectState = 'STOPPED';
  // episode 代数：disconnect() 后重新 connect() 期间，上一 episode 晚到的
  // startGame/心跳结果与 WS 事件不得驱动新 episode（同 liveChatPoller.ts
  // generation 守卫先例）。
  let generation = 0;
  let errorReason: string | undefined = undefined;
  let session: BilibiliGameSession | null = null;
  let socket: WebSocket | null = null;
  // 本地 disconnect()/enterError 触发的关闭要抑制 close→意外关闭；其余意外关闭
  // 一律 ERROR（同 eventSubClient.ts locallyClosed 先例）。
  let locallyClosed = false;
  let httpHeartbeatTimerId: unknown = undefined;
  let wsHeartbeatTimerId: unknown = undefined;
  // HTTP 场次心跳的最近结果：失败只记录不中断连接（Task Package §2），体现在
  // getHealth() 的 DEGRADED/error 上。
  let sessionHeartbeatError: string | undefined = undefined;
  let lastSessionHeartbeatAt: number | undefined = undefined;

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

  function clearHeartbeatTimers(): void {
    if (httpHeartbeatTimerId !== undefined) {
      cancel(httpHeartbeatTimerId);
      httpHeartbeatTimerId = undefined;
    }
    if (wsHeartbeatTimerId !== undefined) {
      cancel(wsHeartbeatTimerId);
      wsHeartbeatTimerId = undefined;
    }
  }

  function enterError(reason: string): void {
    state = 'ERROR';
    errorReason = reason;
    clearHeartbeatTimers();
    if (socket !== null) {
      locallyClosed = true;
      socket.close();
      socket = null;
    }
  }

  /** 发送一个连接类包（protoVersion=1、seq=1），body 为 UTF-8 字节。 */
  function sendFrame(op: number, body: string): void {
    if (socket === null) return;
    socket.send(
      encodeLiveFrame(op, PROTO_VERSION_CONNECTION, CLIENT_SEQ, new TextEncoder().encode(body)),
    );
  }

  function parseJsonBody(frame: LiveFrame): unknown {
    try {
      return JSON.parse(new TextDecoder().decode(frame.body));
    } catch {
      return undefined;
    }
  }

  function handleBusinessFrame(frame: LiveFrame, gen: number): void {
    if (state !== 'CONNECTED' || generation !== gen) return;
    const payload = parseJsonBody(frame);
    if (typeof payload !== 'object' || payload === null) return;
    const record = payload as Record<string, unknown>;
    // 只处理弹幕；其余 cmd（礼物/舰长/SC/进退房等）静默跳过（同 DEV-080 对非
    // textMessageEvent 类型的处置先例）。
    if (record.cmd !== 'LIVE_OPEN_PLATFORM_DM') return;
    const data = record.data;
    if (typeof data !== 'object' || data === null) return;
    const { open_id: openId, msg_id: msgId, msg, timestamp } = data as Record<string, unknown>;
    // 字段缺失/类型不对视为帧无效，静默跳过（空字符串的合法性判断归
    // normalizeBilibiliChatMessage，见 chatMessageAdapter.ts）。
    if (
      typeof openId !== 'string' ||
      typeof msgId !== 'string' ||
      typeof msg !== 'string' ||
      typeof timestamp !== 'number'
    ) {
      return;
    }
    config.onMessage?.({ msgId, openId, text: msg, timestamp });
  }

  function handleAuthReply(frame: LiveFrame, genNow: number): void {
    const payload = parseJsonBody(frame);
    if (typeof payload !== 'object' || payload === null) {
      enterError('Bilibili WS auth reply is not a JSON object');
      return;
    }
    const record = payload as Record<string, unknown>;
    if (record.code !== 0) {
      const message = typeof record.message === 'string' ? record.message : '';
      enterError(
        `Bilibili WS auth failed: code=${String(record.code)}${message !== '' ? ` message=${message}` : ''}`,
      );
      return;
    }
    // 认证成功 → CONNECTED：启动两条独立心跳定时器（20s HTTP 场次心跳 + 30s
    // WS op=2 心跳）。
    state = 'CONNECTED';
    errorReason = undefined;
    armHttpHeartbeat(genNow);
    armWsHeartbeat(genNow);
  }

  function handleFrameBytes(bytes: Uint8Array, genNow: number): void {
    const frame = decodeLiveFrame(bytes);
    if (frame === undefined) return; // 解析失败（含 protoVersion 3 等）静默跳过
    if (frame.op === WS_OP_AUTH_REPLY) {
      if (state === 'AUTHENTICATING' && generation === genNow) handleAuthReply(frame, genNow);
    } else if (frame.op === WS_OP_BUSINESS) {
      handleBusinessFrame(frame, genNow);
    }
    // op=2/3（心跳往来）与其他 op 一律忽略。
  }

  function handleSocketMessage(event: MessageEvent, thisSocket: WebSocket, genNow: number): void {
    if (socket !== thisSocket || generation !== genNow) return;
    const data = event.data;
    // undici message event 的 data 可能是 string | Blob | ArrayBuffer（binaryType
    // 已设为 'arraybuffer'，正常是 ArrayBuffer；string/Blob 分支作兼容）。
    if (typeof data === 'string') {
      handleFrameBytes(new TextEncoder().encode(data), genNow);
      return;
    }
    if (data instanceof ArrayBuffer) {
      handleFrameBytes(new Uint8Array(data), genNow);
      return;
    }
    if (ArrayBuffer.isView(data)) {
      handleFrameBytes(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), genNow);
      return;
    }
    if (data instanceof Blob) {
      void data
        .arrayBuffer()
        .then((buffer) => {
          if (socket === thisSocket && generation === genNow) {
            handleFrameBytes(new Uint8Array(buffer), genNow);
          }
        })
        .catch(() => undefined);
    }
  }

  /** HTTP 场次心跳：每 20 秒调用一次 authPort.heartbeat(gameId)。失败不中断
   * 连接、只记录在 sessionHeartbeatError（getHealth() 体现为 DEGRADED）；成功清
   * 除错误记录并更新 lastSuccessAt。每次完成后再排下一次（同 liveChatPoller
   * 的排定风格）。 */
  function armHttpHeartbeat(genNow: number): void {
    if (state !== 'CONNECTED' || generation !== genNow) return;
    httpHeartbeatTimerId = schedule(() => {
      httpHeartbeatTimerId = undefined;
      void runHttpHeartbeat(genNow);
    }, HTTP_SESSION_HEARTBEAT_INTERVAL_MS);
  }

  async function runHttpHeartbeat(genNow: number): Promise<void> {
    const gameId = session?.gameId;
    if (gameId === undefined) return;
    let result: Awaited<ReturnType<BilibiliAuthPort['heartbeat']>>;
    try {
      result = await config.authPort.heartbeat(gameId);
    } catch (error) {
      // 端口实现抛错（契约外防御）：同样只记录。
      if (state === 'CONNECTED' && generation === genNow) {
        sessionHeartbeatError = errorMessage(error);
        armHttpHeartbeat(genNow);
      }
      return;
    }
    if (state !== 'CONNECTED' || generation !== genNow) return; // 期间被断开：不再续排
    if (result.ok) {
      sessionHeartbeatError = undefined;
      lastSessionHeartbeatAt = currentTime();
    } else {
      sessionHeartbeatError = result.reason;
    }
    armHttpHeartbeat(genNow);
  }

  /** WS 心跳：每 30 秒发送一次 op=2 包（空 JSON body）。 */
  function armWsHeartbeat(genNow: number): void {
    if (state !== 'CONNECTED' || generation !== genNow) return;
    wsHeartbeatTimerId = schedule(() => {
      wsHeartbeatTimerId = undefined;
      if (state === 'CONNECTED' && generation === genNow) {
        sendFrame(WS_OP_HEARTBEAT, WS_HEARTBEAT_BODY);
      }
      armWsHeartbeat(genNow);
    }, WS_HEARTBEAT_INTERVAL_MS);
  }

  function openSocket(url: string, genNow: number): void {
    socket = new WebSocketImpl(url);
    // 捕获本 socket 引用：被替换/关闭的旧 socket 的迟到事件不得影响新 socket。
    const thisSocket = socket;
    locallyClosed = false;
    // undici WebSocket 支持 'arraybuffer'，让二进制帧以 ArrayBuffer 到达；
    // 假实现无此属性时赋值无害。
    thisSocket.binaryType = 'arraybuffer';
    thisSocket.addEventListener('open', () => {
      if (socket !== thisSocket || generation !== genNow) return;
      if (session === null) {
        enterError('no Bilibili auth body available');
        return;
      }
      // 建连后立即发送认证包（op=7，body 为 auth_body 原样字节，本节点不解析
      // 其内容——真实协议第三方无需关注，原样使用）。
      state = 'AUTHENTICATING';
      sendFrame(WS_OP_AUTH, session.authBody);
    });
    thisSocket.addEventListener('message', (event: MessageEvent) =>
      handleSocketMessage(event, thisSocket, genNow),
    );
    thisSocket.addEventListener('error', () => {
      if (socket === thisSocket && !locallyClosed && generation === genNow) {
        enterError('websocket error');
      }
    });
    thisSocket.addEventListener('close', () => {
      // 真实协议下认证失败服务端可能不回任何包：AUTHENTICATING 期间提前
      // close/error 同样 → ERROR；CONNECTED 期间意外断开也 → ERROR（无自动重连）。
      if (socket === thisSocket && !locallyClosed && generation === genNow) {
        enterError('websocket closed unexpectedly');
      }
    });
  }

  return {
    connect(): void {
      if (state !== 'STOPPED' && state !== 'ERROR') return; // 连接中/已连接重复 connect 忽略
      // STOPPED/ERROR 均可（重新）发起；ERROR 后调用方直接再 connect()（同
      // liveChatPoller A13 处置，不要求先 disconnect()）。
      if (socket !== null) {
        // 上一 episode 遗留 socket（防御性清理；enterError 后本应为 null）。
        locallyClosed = true;
        socket.close();
        socket = null;
      }
      generation += 1;
      const genNow = generation;
      state = 'STARTING';
      errorReason = undefined;
      sessionHeartbeatError = undefined;
      session = null;
      clearHeartbeatTimers();
      void config.authPort.startGame().then((result) => {
        // 等待期间若被 disconnect()/重新 connect() 打断则丢弃结果。
        if (state !== 'STARTING' || generation !== genNow) return;
        if (!result.ok) {
          // 诚实失败：场次启动失败直接 ERROR，不构造 WebSocket、不做任何多主机
          // failover/自动重试（wss_link 只取第一个，见 Forbidden Scope）。
          enterError(result.reason);
          return;
        }
        session = result.session;
        const url = session.wssLinks[0];
        if (url === undefined) {
          enterError('Bilibili startGame returned no wss_link');
          return;
        }
        state = 'CONNECTING';
        openSocket(url, genNow);
      });
    },
    disconnect(): void {
      generation += 1;
      clearHeartbeatTimers();
      if (socket !== null) {
        locallyClosed = true;
        socket.close();
        socket = null;
      }
      const gameId = session?.gameId;
      session = null;
      state = 'STOPPED';
      errorReason = undefined;
      sessionHeartbeatError = undefined;
      if (gameId !== undefined) {
        // best-effort 结束场次：不等待、不因其失败而影响状态转换。
        void config.authPort.endGame(gameId).catch(() => undefined);
      }
    },
    getState(): LiveConnectState {
      return state;
    },
    getHealth(): Health {
      if (state === 'CONNECTED') {
        if (sessionHeartbeatError !== undefined) {
          return {
            status: 'DEGRADED',
            error: sessionHeartbeatError,
            ...(lastSessionHeartbeatAt !== undefined
              ? { lastSuccessAt: lastSessionHeartbeatAt }
              : {}),
          };
        }
        return lastSessionHeartbeatAt === undefined
          ? { status: 'OK' }
          : { status: 'OK', lastSuccessAt: lastSessionHeartbeatAt };
      }
      return { status: 'DOWN', error: errorReason ?? `state: ${state}` };
    },
  };
}
