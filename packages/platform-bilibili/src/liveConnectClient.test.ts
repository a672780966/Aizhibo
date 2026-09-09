import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CLIENT_SEQ,
  WS_OP_AUTH,
  WS_OP_BUSINESS,
  WS_OP_HEARTBEAT,
  createLiveConnectClient,
  decodeLiveFrame,
  encodeLiveFrame,
  type LiveConnectClientConfig,
} from './liveConnectClient.js';
import type { BilibiliAuthPort, BilibiliGameSession, BilibiliVoidResult } from './bilibiliAuth.js';

/** 可控假时钟：setTimeout 只登记不触发（并记录 timeout 参数），测试手动 run。 */
class FakeClock {
  timers: (() => void)[] = [];
  timeouts: number[] = [];
  cleared: number[] = [];

  setTimeout = vi.fn((fn: () => void, timeout: number) => {
    this.timers.push(fn);
    this.timeouts.push(timeout);
    return this.timers.length - 1;
  });
  clearTimeout = vi.fn((id: number) => {
    this.cleared.push(id);
    delete this.timers[id];
  });

  runTimer(index = 0): void {
    const fn = this.timers[index];
    if (fn !== undefined) fn();
  }
}

/** 假 WebSocket（同 eventSubClient.test.ts FakeWebSocket 先例）：登记实例、
 * send 记录字节、emit 模拟服务端事件。 */
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  url: string;
  binaryType = '';
  sent: Uint8Array[] = [];
  closeCalls = 0;
  private listeners = new Map<string, Set<(event: unknown) => void>>();

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, handler: (event: unknown) => void): void {
    let set = this.listeners.get(type);
    if (set === undefined) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(handler);
  }

  removeEventListener(type: string, handler: (event: unknown) => void): void {
    this.listeners.get(type)?.delete(handler);
  }

  close(): void {
    this.closeCalls += 1;
  }

  send(data: unknown): void {
    if (data instanceof Uint8Array) this.sent.push(data);
  }

  emit(type: string, event?: unknown): void {
    const set = this.listeners.get(type);
    if (set === undefined) return;
    for (const handler of [...set]) handler(event ?? {});
  }
}

function testSession(): BilibiliGameSession {
  return {
    gameId: 'game-1',
    authBody: '{"uid":0,"roomid":5050,"protover":1,"platform":"web","type":2,"key":"t-1"}',
    wssLinks: ['wss://broadcastlv.example/ws', 'wss://broadcastlv.example/ws2'],
  };
}

function makeAuthPort(overrides: Partial<BilibiliAuthPort> = {}): BilibiliAuthPort {
  return {
    startGame: overrides.startGame ?? (async () => ({ ok: true, session: testSession() })),
    heartbeat: overrides.heartbeat ?? (async () => ({ ok: true })),
    endGame: overrides.endGame ?? (async () => ({ ok: true })),
  };
}

function createWith(
  overrides: Partial<LiveConnectClientConfig> = {},
  authPortOverrides: Partial<BilibiliAuthPort> = {},
): ReturnType<typeof createLiveConnectClient> {
  return createLiveConnectClient({
    webSocketImpl: FakeWebSocket as unknown as typeof WebSocket,
    clock: new FakeClock(),
    ...overrides,
    authPort: makeAuthPort(authPortOverrides),
  });
}

function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function frame(op: number, protoVersion: number, body: Uint8Array): Uint8Array {
  return encodeLiveFrame(op, protoVersion, 1, body);
}

/** op=8 认证回复包：code===0 成功。 */
function authReplyFrame(code: number): Uint8Array {
  return frame(8, 1, utf8(JSON.stringify({ code, message: code === 0 ? 'ok' : 'denied' })));
}

/** op=5 业务包：body 为 JSON {cmd, data}。 */
function businessFrame(cmd: string, data: unknown): Uint8Array {
  return frame(WS_OP_BUSINESS, 0, utf8(JSON.stringify({ cmd, data })));
}

function dmData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    open_id: 'open-1',
    msg_id: 'm-1',
    msg: 'hello',
    timestamp: 1700000000,
    ...overrides,
  };
}

function currentSocket(): FakeWebSocket {
  const socket = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
  expect(socket).toBeDefined();
  return socket!;
}

function textOf(decoded: ReturnType<typeof decodeLiveFrame>): string {
  return new TextDecoder().decode(decoded?.body);
}

/** 走完 connect→startGame→open→认证成功 的完整路径，返回已 CONNECTED 的 client。 */
async function connectToConnected(
  overrides: Partial<LiveConnectClientConfig> = {},
  authPortOverrides: Partial<BilibiliAuthPort> = {},
): Promise<ReturnType<typeof createLiveConnectClient>> {
  const expectedInstances = FakeWebSocket.instances.length + 1;
  const client = createWith(overrides, authPortOverrides);
  client.connect();
  await vi.waitFor(() => {
    expect(FakeWebSocket.instances.length).toBe(expectedInstances);
  });
  expect(client.getState()).toBe('CONNECTING');
  const ws = currentSocket();
  ws.emit('open');
  expect(client.getState()).toBe('AUTHENTICATING');
  ws.emit('message', { data: authReplyFrame(0) });
  expect(client.getState()).toBe('CONNECTED');
  return client;
}

describe('createLiveConnectClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    FakeWebSocket.instances = [];
  });

  it('starts STOPPED with DOWN health', () => {
    const client = createWith();
    expect(client.getState()).toBe('STOPPED');
    expect(client.getHealth()).toEqual({ status: 'DOWN', error: 'state: STOPPED' });
  });

  it('goes straight to ERROR when startGame fails, without constructing any WebSocket (A12)', async () => {
    const client = createWith(
      {},
      { startGame: async () => ({ ok: false, reason: 'invalid anchor code' }) },
    );

    client.connect();
    await vi.waitFor(() => {
      expect(client.getState()).toBe('ERROR');
    });
    expect(FakeWebSocket.instances.length).toBe(0);
    expect(client.getHealth()).toEqual({ status: 'DOWN', error: 'invalid anchor code' });
  });

  it('connects: opens wssLinks[0], sends an op=7 auth frame with the raw authBody on open, then reaches CONNECTED on op=8 code=0 (A13)', async () => {
    const clock = new FakeClock();
    const client = createWith({ clock });
    client.connect();

    await vi.waitFor(() => {
      expect(FakeWebSocket.instances.length).toBe(1);
    });
    // wss_link 只取第一个（无 failover）；此刻认证包尚未发送。
    expect(currentSocket().url).toBe('wss://broadcastlv.example/ws');
    expect(client.getState()).toBe('CONNECTING');
    expect(currentSocket().sent.length).toBe(0);

    currentSocket().emit('open');
    // onopen 后立即发送 op=7 认证包，body 为 auth_body 原样字节。
    expect(client.getState()).toBe('AUTHENTICATING');
    const authFrame = decodeLiveFrame(currentSocket().sent[0]!);
    expect(authFrame?.op).toBe(WS_OP_AUTH);
    expect(authFrame?.protoVersion).toBe(1);
    expect(authFrame?.seq).toBe(CLIENT_SEQ);
    expect(textOf(authFrame)).toBe(testSession().authBody);

    currentSocket().emit('message', { data: authReplyFrame(0) });
    expect(client.getState()).toBe('CONNECTED');
    expect(client.getHealth()).toEqual({ status: 'OK' });
    client.disconnect();
  });

  it('schedules both independent heartbeats on CONNECTED: HTTP every 20s and WS op=2 every 30s (A14)', async () => {
    const clock = new FakeClock();
    const heartbeat = vi.fn(async (): Promise<BilibiliVoidResult> => ({ ok: true }));
    const client = await connectToConnected({ clock }, { heartbeat });
    const ws = currentSocket();

    // 认证成功后两条独立定时器已排定：20s HTTP 场次心跳 + 30s WS 心跳。
    expect(clock.timeouts).toEqual([20000, 30000]);

    // 手动触发 20s 定时器：HTTP heartbeat(gameId) 被调用；失败不影响连接。
    clock.runTimer(0);
    await vi.waitFor(() => {
      expect(heartbeat).toHaveBeenCalledTimes(1);
    });
    expect(heartbeat).toHaveBeenCalledWith('game-1');
    expect(client.getState()).toBe('CONNECTED');
    // 完成后续排下一次 20s 心跳。
    expect(clock.timeouts).toEqual([20000, 30000, 20000]);

    // 手动触发 30s 定时器：发送 WS op=2 心跳包（空 JSON body '{}'）。
    clock.runTimer(1);
    expect(ws.sent.length).toBe(2); // op=7 认证 + op=2 心跳
    const heartbeatFrame = decodeLiveFrame(ws.sent[1]!);
    expect(heartbeatFrame?.op).toBe(WS_OP_HEARTBEAT);
    expect(textOf(heartbeatFrame)).toBe('{}');
    expect(clock.timeouts).toEqual([20000, 30000, 20000, 30000]);
    client.disconnect();
  });

  it('records a failed HTTP session heartbeat in health without dropping the connection, and recovers on the next success', async () => {
    const clock = new FakeClock();
    const heartbeat = vi
      .fn<(gameId: string) => Promise<BilibiliVoidResult>>()
      .mockResolvedValueOnce({ ok: false, reason: 'session expired' })
      .mockResolvedValue({ ok: true });
    const client = await connectToConnected({ clock }, { heartbeat });

    // 第一次 20s 心跳失败：仍 CONNECTED，health 降为 DEGRADED 并带 error。
    clock.runTimer(0);
    await vi.waitFor(() => {
      expect(heartbeat).toHaveBeenCalledTimes(1);
    });
    expect(client.getState()).toBe('CONNECTED');
    expect(client.getHealth()).toEqual({ status: 'DEGRADED', error: 'session expired' });

    // 下一次成功：恢复 OK。
    clock.runTimer(2); // 续排的 20s 定时器（timeouts[2]）
    await vi.waitFor(() => {
      expect(heartbeat).toHaveBeenCalledTimes(2);
    });
    // 成功一次后 lastSuccessAt 被记录，这里只断言状态恢复 OK。
    expect(client.getHealth()).toMatchObject({ status: 'OK' });
    client.disconnect();
  });

  it('transitions to ERROR on auth failure, premature close, ws error and unexpected close (A13)', async () => {
    // 1) op=8 认证回复 code≠0 → ERROR（AUTHENTICATING 期间）
    let client = createWith();
    client.connect();
    await vi.waitFor(() => {
      expect(FakeWebSocket.instances.length).toBe(1);
    });
    currentSocket().emit('open');
    currentSocket().emit('message', { data: authReplyFrame(4001) });
    expect(client.getState()).toBe('ERROR');
    expect(client.getHealth().status).toBe('DOWN');
    client.disconnect();
    expect(client.getState()).toBe('STOPPED');

    // 2) AUTHENTICATING 期间提前 close（服务端不回包直接断开）→ ERROR
    client = createWith();
    client.connect();
    await vi.waitFor(() => {
      expect(FakeWebSocket.instances.length).toBe(2);
    });
    currentSocket().emit('open');
    currentSocket().emit('close');
    expect(client.getState()).toBe('ERROR');
    client.disconnect();

    // 3) CONNECTED 期间 ws error → ERROR（无自动重连）
    client = await connectToConnected();
    currentSocket().emit('error');
    expect(client.getState()).toBe('ERROR');
    client.disconnect();

    // 4) CONNECTED 期间意外 close → ERROR
    client = await connectToConnected();
    currentSocket().emit('close');
    expect(client.getState()).toBe('ERROR');
    client.disconnect();
  });

  it('calls onMessage only for LIVE_OPEN_PLATFORM_DM op=5 frames and skips everything else silently (A15)', async () => {
    const onMessage = vi.fn();
    const client = await connectToConnected({ onMessage });
    const ws = currentSocket();

    // 弹幕 → onMessage（timestamp 秒级原样透传）。
    ws.emit('message', { data: businessFrame('LIVE_OPEN_PLATFORM_DM', dmData()) });
    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith({
      msgId: 'm-1',
      openId: 'open-1',
      text: 'hello',
      timestamp: 1700000000,
    });

    // 其余 cmd（礼物/舰长/SC）与畸形/字段类型不对的包一律静默跳过。
    ws.emit('message', {
      data: businessFrame('LIVE_OPEN_PLATFORM_SEND_GIFT', { gift_name: '舰长' }),
    });
    ws.emit('message', { data: businessFrame('LIVE_OPEN_PLATFORM_SUPER_CHAT', {}) });
    ws.emit('message', { data: businessFrame('LIVE_OPEN_PLATFORM_DM', {}) });
    ws.emit('message', {
      data: businessFrame('LIVE_OPEN_PLATFORM_DM', dmData({ timestamp: '1700000000' })),
    });
    ws.emit('message', { data: businessFrame('LIVE_OPEN_PLATFORM_DM', dmData({ open_id: 7 })) });
    // 非 JSON body / protoVersion=3（Brotli）不可解析 → 静默跳过。
    ws.emit('message', { data: frame(WS_OP_BUSINESS, 0, utf8('not json')) });
    ws.emit('message', { data: frame(WS_OP_BUSINESS, 3, utf8('{}')) });
    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(client.getState()).toBe('CONNECTED');
    client.disconnect();
  });

  it('disconnect() cancels both heartbeat timers, closes the WebSocket, ends the game, and returns to STOPPED (A16)', async () => {
    const clock = new FakeClock();
    const endGame = vi.fn(async (): Promise<BilibiliVoidResult> => ({ ok: true }));
    const client = await connectToConnected({ clock }, { endGame });
    const ws = currentSocket();
    expect(clock.timeouts).toEqual([20000, 30000]);

    client.disconnect();

    expect(client.getState()).toBe('STOPPED');
    expect(client.getHealth()).toEqual({ status: 'DOWN', error: 'state: STOPPED' });
    expect(ws.closeCalls).toBe(1);
    expect(endGame).toHaveBeenCalledWith('game-1');
    // 两条心跳定时器都被取消；已取消的定时器不再触发新心跳/新包。
    expect(clock.cleared.length).toBe(2);
    expect(clock.timeouts).toEqual([20000, 30000]);
    clock.runTimer(0); // 已被 clearTimeout 删除：无动作
    clock.runTimer(1);
    expect(clock.timeouts).toEqual([20000, 30000]);
    expect(ws.sent.length).toBe(1); // 只有认证包
  });

  it('drops late startGame results after disconnect (generation guard), and allows re-connect after ERROR', async () => {
    // 第一次 startGame 慢（挂起直到测试手动 resolve）：disconnect 后再 resolve，
    // 结果必须被丢弃，不构造 WebSocket。
    let resolveStart: ((result: { ok: true; session: BilibiliGameSession }) => void) | undefined;
    const slowStart: BilibiliAuthPort['startGame'] = () =>
      new Promise((resolve) => {
        resolveStart = resolve;
      });
    const client = createWith({}, { startGame: slowStart });
    client.connect();
    expect(client.getState()).toBe('STARTING');
    client.disconnect();
    expect(client.getState()).toBe('STOPPED');
    resolveStart?.({ ok: true, session: testSession() });
    await vi.waitFor(() => {
      expect(FakeWebSocket.instances.length).toBe(0);
    });
    expect(client.getState()).toBe('STOPPED');

    // ERROR 后可直接再 connect()（同 liveChatPoller A13 处置）：第二次 startGame
    // 成功 → 正常建连。
    const startGame = vi
      .fn<BilibiliAuthPort['startGame']>()
      .mockResolvedValueOnce({ ok: false, reason: 'boom' })
      .mockResolvedValue({ ok: true, session: testSession() });
    const retrying = createWith({}, { startGame });
    retrying.connect();
    await vi.waitFor(() => {
      expect(retrying.getState()).toBe('ERROR');
    });
    retrying.connect();
    await vi.waitFor(() => {
      expect(FakeWebSocket.instances.length).toBe(1);
    });
    expect(retrying.getState()).toBe('CONNECTING');
    const ws = currentSocket();
    ws.emit('open');
    ws.emit('message', { data: authReplyFrame(0) });
    expect(retrying.getState()).toBe('CONNECTED');
    retrying.disconnect();
  });

  it('stays consistent when onMessage synchronously calls disconnect() (reentrancy, MAJOR-01 precedent)', async () => {
    const clock = new FakeClock();
    const onMessage = vi.fn();
    const client = createWith({ clock, onMessage });
    onMessage.mockImplementation(() => {
      client.disconnect();
    });
    client.connect();
    await vi.waitFor(() => {
      expect(FakeWebSocket.instances.length).toBe(1);
    });
    const ws = currentSocket();
    ws.emit('open');
    ws.emit('message', { data: authReplyFrame(0) });
    expect(client.getState()).toBe('CONNECTED');

    ws.emit('message', { data: businessFrame('LIVE_OPEN_PLATFORM_DM', dmData()) });
    expect(onMessage).toHaveBeenCalledTimes(1);
    // 回调内 disconnect()：连接关闭、定时器取消、不再有新动作。
    expect(client.getState()).toBe('STOPPED');
    expect(ws.closeCalls).toBe(1);
    expect(clock.timeouts).toEqual([20000, 30000]);
    expect(clock.cleared.length).toBe(2);
    expect(ws.sent.length).toBe(1);
  });
});

describe('16 字节包头编码/解码（A11）', () => {
  function tamper(bytes: Uint8Array, setter: (view: DataView) => void): Uint8Array {
    const copy = new Uint8Array(bytes);
    setter(new DataView(copy.buffer));
    return copy;
  }

  function concatBytes(...parts: Uint8Array[]): Uint8Array {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
      out.set(part, offset);
      offset += part.length;
    }
    return out;
  }

  it('encode → decode roundtrip is identical for op/protoVersion/seq/body bytes', () => {
    const bodies = [utf8(''), utf8('{}'), utf8('{"code":0,"message":"ok"}'), utf8('弹幕文本')];
    for (const body of bodies) {
      const decoded = decodeLiveFrame(encodeLiveFrame(WS_OP_BUSINESS, 0, CLIENT_SEQ, body));
      expect(decoded?.op).toBe(WS_OP_BUSINESS);
      expect(decoded?.protoVersion).toBe(0);
      expect(decoded?.seq).toBe(CLIENT_SEQ);
      expect([...decoded!.body]).toEqual([...body]);
    }
  });

  it('decodes a hand-built sample packet with the real field order and byte lengths', () => {
    // 已知样例包：op=8 认证回复 {"code":0,"message":"ok"}。按 Task Package §1 第 7
    // 点字节序手写：packetLen(int32 BE)=16+len(body)，headerLen(int16 BE)=16，
    // protoVersion(int16 BE)=1，op(int32 BE)=8，seq(int32 BE)=1，随后 body。
    const body = utf8('{"code":0,"message":"ok"}');
    const sample = new Uint8Array(16 + body.length);
    const view = new DataView(sample.buffer);
    view.setInt32(0, 16 + body.length, false);
    view.setInt16(4, 16, false);
    view.setInt16(6, 1, false);
    view.setInt32(8, 8, false);
    view.setInt32(12, 1, false);
    sample.set(body, 16);

    const decoded = decodeLiveFrame(sample);
    expect(decoded).toEqual({ op: 8, protoVersion: 1, seq: 1, body });
    expect(textOf(decoded)).toBe('{"code":0,"message":"ok"}');
  });

  it('decodes a real op=5 business frame carrying a DM payload (A15 链路字节样例)', () => {
    const body = utf8(
      '{"cmd":"LIVE_OPEN_PLATFORM_DM","data":{"open_id":"open-1","msg_id":"m-1","msg":"hello","timestamp":1700000000}}',
    );
    const sample = new Uint8Array(16 + body.length);
    const view = new DataView(sample.buffer);
    view.setInt32(0, 16 + body.length, false);
    view.setInt16(4, 16, false);
    view.setInt16(6, 0, false);
    view.setInt32(8, 5, false);
    view.setInt32(12, 1, false);
    sample.set(body, 16);

    const decoded = decodeLiveFrame(sample);
    expect(decoded?.op).toBe(WS_OP_BUSINESS);
    expect(decoded?.protoVersion).toBe(0);
    const parsed = JSON.parse(textOf(decoded)) as { cmd: string };
    expect(parsed.cmd).toBe('LIVE_OPEN_PLATFORM_DM');
  });

  it.each([
    ['shorter than 16 bytes', new Uint8Array(8)],
    [
      'packetLen smaller than the buffer (concatenated frames are not handled)',
      concatBytes(encodeLiveFrame(5, 0, 1, utf8('a')), utf8('trailing')),
    ],
    [
      'packetLen larger than the buffer',
      tamper(encodeLiveFrame(5, 0, 1, utf8('{}')), (view) => view.setInt32(0, 999, false)),
    ],
    [
      'headerLen != 16',
      tamper(encodeLiveFrame(5, 0, 1, utf8('{}')), (view) => view.setInt16(4, 20, false)),
    ],
    [
      'protoVersion = 2 (zlib)',
      tamper(encodeLiveFrame(5, 0, 1, utf8('{}')), (view) => view.setInt16(6, 2, false)),
    ],
    [
      'protoVersion = 3 (Brotli)',
      tamper(encodeLiveFrame(5, 0, 1, utf8('{}')), (view) => view.setInt16(6, 3, false)),
    ],
  ])('returns undefined for %s', (_name, bytes) => {
    expect(decodeLiveFrame(bytes)).toBeUndefined();
  });

  it('ignores op=3 heartbeat replies and other unknown ops while CONNECTED (A15)', async () => {
    const onMessage = vi.fn();
    const client = await connectToConnected({ onMessage });
    const ws = currentSocket();

    // op=3 服务端心跳回复：body 是一个 4 字节 int（在线人数），非 JSON、无 cmd → 忽略。
    const popularity = new Uint8Array(4);
    new DataView(popularity.buffer).setInt32(0, 42, false);
    ws.emit('message', { data: frame(3, 0, popularity) });
    expect(client.getState()).toBe('CONNECTED');
    expect(onMessage).not.toHaveBeenCalled();
    client.disconnect();
  });
});
