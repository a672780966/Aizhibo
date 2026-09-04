import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEventSubClient, type EventSubClientConfig } from './eventSubClient.js';
import type { TwitchAuthPort } from './twitchAuth.js';

/**
 * 假 WebSocket 测试替身：只实现实现方用到的表面（addEventListener/close），
 * 记录构造 url 与 close 调用，暴露 emit() 供测试手动触发 message/error/close。
 * message 事件的 data 与真实 undici WebSocket 事件一致：测试代码传 string。
 */
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static constructorCalls = 0;

  url: string;
  closeCalls = 0;
  private listeners = new Map<string, Set<(event: unknown) => void>>();

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.constructorCalls += 1;
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

  emit(type: string, event?: unknown): void {
    const set = this.listeners.get(type);
    if (set === undefined) return;
    for (const handler of [...set]) handler(event ?? {});
  }
}

/** 可选的假 authPort：ok=true 时返回固定 token，否则返回 ok:false。 */
function fakeAuthPort(ok: true): TwitchAuthPort;
function fakeAuthPort(ok: false, reason?: string): TwitchAuthPort;
function fakeAuthPort(ok: boolean, reason = 'no credentials'): TwitchAuthPort {
  return {
    getAccessToken: async () =>
      ok
        ? { ok: true, token: { accessToken: 'tok', expiresInSeconds: 3600, scopes: [] } }
        : { ok: false, reason },
  };
}

/** welcome 帧：session.id + keepalive_timeout_seconds（实现方用它 arm watchdog）。 */
function welcomeFrame(): string {
  return JSON.stringify({
    metadata: { message_type: 'session_welcome', message_id: 'welcome-1' },
    payload: { session: { id: 'session-1', keepalive_timeout_seconds: 10, status: 'connected' } },
  });
}

describe('createEventSubClient', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    FakeWebSocket.constructorCalls = 0;
  });

  it('exposes WELCOME and SUBSCRIBING as observable intermediate states before CONNECTED (A07 direct assertions)', async () => {
    // 用可挂起的 fetch：返回的 promise 手动 resolve，让 SUBSCRIBING 真实驻留。
    let resolveFetch!: (r: Response) => void;
    const gate = new Promise<Response>((r) => (resolveFetch = r));
    const fetchImpl = vi.fn(() => gate);

    const client = createEventSubClient({
      ...defaultConfig,
      fetchImpl,
    });
    client.connect();
    await vi.waitFor(() => {
      expect(FakeWebSocket.instances).toHaveLength(1);
    });
    const socket = FakeWebSocket.instances[0]!;

    socket.emit('message', { data: welcomeFrame() });
    // welcome 帧处理是同步的：send(WELCOME_RECEIVED) 后立即停在 WELCOME，
    // BEGIN_SUBSCRIBE 在下一微任务才发。此刻同步断言 WELCOME。
    expect(client.getState()).toBe('WELCOME');

    // 让 microtask 跑完：BEGIN_SUBSCRIBE → SUBSCRIBING（entry 触发 fetch，
    // 但 fetch 挂起未 resolve，状态停在 SUBSCRIBING）。
    await vi.waitFor(() => {
      expect(client.getState()).toBe('SUBSCRIBING');
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    // 放行 fetch → 202 → CONNECTED。
    resolveFetch(new Response(null, { status: 202 }));
    await vi.waitFor(() => {
      expect(client.getState()).toBe('CONNECTED');
    });
    client.disconnect();
  });

  it('drives the full path DISCONNECTED→CONNECTING→WELCOME→SUBSCRIBING→CONNECTED and builds the Helix subscription request correctly', async () => {
    let lastRequest: RequestInit | undefined;
    let lastUrl = '';
    // 与第 2.1 节一致的 header/body 快照记录。
    const fetchImpl: typeof fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      lastUrl = typeof input === 'string' ? input : String(input);
      lastRequest = init;
      return new Response(null, { status: 202 });
    });

    const client = createEventSubClient({
      authPort: fakeAuthPort(true),
      clientId: 'client-1',
      broadcasterUserId: 'broadcaster-1',
      userId: 'user-1',
      wsUrl: 'wss://test.example/ws',
      helixBaseUrl: 'https://helix.example',
      webSocketImpl: FakeWebSocket as unknown as typeof WebSocket,
      fetchImpl,
    });

    expect(client.getState()).toBe('DISCONNECTED');

    client.connect();
    // getAccessToken 是 async；等 promise 微任务落地后 openSocket() 已执行。
    await vi.waitFor(() => {
      expect(FakeWebSocket.instances).toHaveLength(1);
    });
    expect(FakeWebSocket.constructorCalls).toBe(1);
    expect(client.getState()).toBe('CONNECTING');
    // 构造时传入的 url 被原样记录。
    expect(FakeWebSocket.instances[0]?.url).toBe('wss://test.example/ws');

    // 直接触发 welcome 帧（实现不监听 open；无需模拟 open 行为）。
    FakeWebSocket.instances[0]?.emit('message', { data: welcomeFrame() });

    // welcome → WELCOME →（always）SUBSCRIBING；Helix 订阅 POST 返回 202 → CONNECTED。
    await vi.waitFor(() => {
      expect(client.getState()).toBe('CONNECTED');
    });

    expect(lastUrl).toBe('https://helix.example/helix/eventsub/subscriptions');
    expect(lastRequest?.method).toBe('POST');
    const headers = lastRequest?.headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toBe('Bearer tok');
    expect(headers?.['Client-Id']).toBe('client-1');
    expect(JSON.parse(String(lastRequest?.body))).toEqual({
      type: 'channel.chat.message',
      version: '1',
      condition: { broadcaster_user_id: 'broadcaster-1', user_id: 'user-1' },
      transport: { method: 'websocket', session_id: 'session-1' },
    });

    client.disconnect();
    expect(client.getState()).toBe('DISCONNECTED');
    expect(FakeWebSocket.instances[0]?.closeCalls).toBe(1);
  });

  it('goes straight to ERROR when credentials are unavailable, without ever constructing a WebSocket', async () => {
    const client = createEventSubClient({
      authPort: fakeAuthPort(false, 'no credentials'),
      clientId: 'client-1',
      broadcasterUserId: 'broadcaster-1',
      userId: 'user-1',
      webSocketImpl: FakeWebSocket as unknown as typeof WebSocket,
      fetchImpl: (async () => new Response(null, { status: 202 })) as typeof fetch,
    });

    client.connect();
    // 诚实失败：凭据不可用 → 直接 ERROR，不构造 WebSocket（Constraint 2）。
    await vi.waitFor(() => {
      expect(client.getState()).toBe('ERROR');
    });
    expect(FakeWebSocket.instances).toHaveLength(0);
    expect(FakeWebSocket.constructorCalls).toBe(0);
  });

  it('goes to ERROR when the Helix subscription request returns a non-202 status', async () => {
    const fetchImpl: typeof fetch = vi.fn(async () => new Response('bad request', { status: 400 }));
    const client = createEventSubClient({
      authPort: fakeAuthPort(true),
      clientId: 'client-1',
      broadcasterUserId: 'broadcaster-1',
      userId: 'user-1',
      webSocketImpl: FakeWebSocket as unknown as typeof WebSocket,
      fetchImpl,
    });

    client.connect();
    await vi.waitFor(() => {
      expect(FakeWebSocket.instances).toHaveLength(1);
    });
    FakeWebSocket.instances[0]?.emit('message', { data: welcomeFrame() });

    // welcome → SUBSCRIBING；非 202 → SUBSCRIBE_FAIL → ERROR。
    await vi.waitFor(() => {
      expect(client.getState()).toBe('ERROR');
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('goes to ERROR when the Helix subscription request throws', async () => {
    const fetchImpl: typeof fetch = vi.fn(async () => {
      throw new Error('network down');
    });
    const client = createEventSubClient({
      authPort: fakeAuthPort(true),
      clientId: 'client-1',
      broadcasterUserId: 'broadcaster-1',
      userId: 'user-1',
      webSocketImpl: FakeWebSocket as unknown as typeof WebSocket,
      fetchImpl,
    });

    client.connect();
    await vi.waitFor(() => {
      expect(FakeWebSocket.instances).toHaveLength(1);
    });
    FakeWebSocket.instances[0]?.emit('message', { data: welcomeFrame() });

    // welcome → SUBSCRIBING；异常 → SUBSCRIBE_FAIL → ERROR。
    await vi.waitFor(() => {
      expect(client.getState()).toBe('ERROR');
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  /** 可控假时钟：setTimeout 只登记不触发（并记录 timeout 参数），测试代码手动 run 定时器。 */
  class FakeClock {
    setTimeout = vi.fn((fn: () => void, timeout: number) => {
      this.timers.push(fn);
      this.timeouts.push(timeout);
      return this.timers.length - 1;
    });
    clearTimeout = vi.fn((id: number) => {
      delete this.timers[id];
    });
    now = vi.fn(() => this.current);
    current = 1000;
    timers: (() => void)[] = [];
    /** setTimeout 收到的 timeout 参数（毫秒），供 A11 时长关联断言。 */
    timeouts: number[] = [];

    runTimer(index = 0): void {
      const fn = this.timers[index];
      if (fn !== undefined) fn();
    }
  }

  const defaultConfig = {
    authPort: fakeAuthPort(true),
    clientId: 'client-1',
    broadcasterUserId: 'broadcaster-1',
    userId: 'user-1',
    webSocketImpl: FakeWebSocket as unknown as typeof WebSocket,
    fetchImpl: (async () => new Response(null, { status: 202 })) as typeof fetch,
  };

  /** 驱动到 CONNECTED：connect + welcome 帧 + fetch 202，并返回 fake socket。 */
  async function connectToConnected(
    overrides: Partial<EventSubClientConfig> = {},
  ): Promise<{ client: ReturnType<typeof createEventSubClient>; socket: FakeWebSocket }> {
    const client = createEventSubClient({ ...defaultConfig, ...overrides });
    client.connect();
    await vi.waitFor(() => {
      expect(FakeWebSocket.instances).toHaveLength(1);
    });
    const socket = FakeWebSocket.instances[0]!;
    socket.emit('message', { data: welcomeFrame() });
    await vi.waitFor(() => {
      expect(client.getState()).toBe('CONNECTED');
    });
    return { client, socket };
  }

  it('forwards a notification frame to onNotification once, unchanged, staying CONNECTED', async () => {
    const onNotification = vi.fn();
    const clock = new FakeClock();
    const { client, socket } = await connectToConnected({ onNotification, clock });
    const chatEvent = { message: 'hello', user: { id: 'u1' } };

    socket.emit('message', {
      data: JSON.stringify({
        metadata: { message_type: 'notification', message_id: 'abc' },
        payload: {
          subscription: { type: 'channel.chat.message' },
          event: chatEvent,
        },
      }),
    });

    expect(onNotification).toHaveBeenCalledTimes(1);
    expect(onNotification).toHaveBeenCalledWith({
      subscriptionType: 'channel.chat.message',
      event: chatEvent,
      messageId: 'abc',
      receivedAt: clock.current,
    });
    expect(client.getState()).toBe('CONNECTED');
  });

  it('turns DEGRADED when the watchdog fires with no keepalive/notification in between', async () => {
    const clock = new FakeClock();
    const { client } = await connectToConnected({ clock });
    // welcome 帧 keepalive_timeout_seconds=10 → 定时器已登记（进入 CONNECTED 时 arm）。
    expect(clock.timers).toHaveLength(1);
    expect(clock.timers[0]).toBeDefined();

    // 不 emit 任何 keepalive/notification，直接触发 watchdog → DEGRADED。
    clock.runTimer(0);
    expect(client.getState()).toBe('DEGRADED');
  });

  it('arms the watchdog with timeout = keepalive_timeout_seconds × 1000 × 1.5 from the welcome frame (A11 duration)', async () => {
    const clock = new FakeClock();
    await connectToConnected({ clock });

    // welcome 帧 keepalive_timeout_seconds=10 → armWatchdog 时 setTimeout 收到的
    // timeout 参数必须精确等于 10 × 1000 × 1.5 = 15000ms（验证参数本身，而非
    // 仅手动调用捕获到的回调）。
    expect(clock.setTimeout).toHaveBeenCalledTimes(1);
    expect(clock.setTimeout).toHaveBeenCalledWith(expect.any(Function), 15000);
    expect(clock.timeouts).toEqual([15000]);
  });

  it('goes to ERROR when the WebSocket fires an error event while CONNECTED (A13 direct error)', async () => {
    const { client, socket } = await connectToConnected();
    expect(client.getState()).toBe('CONNECTED');

    // 直接触发已注册的 error 监听器（不是 message，不经过 disconnect）。
    socket.emit('error', new Event('error'));
    expect(client.getState()).toBe('ERROR');
  });

  it('goes to ERROR when the WebSocket closes non-locally while CONNECTED (A13 non-local close)', async () => {
    const { client, socket } = await connectToConnected();
    expect(client.getState()).toBe('CONNECTED');

    // 不经过 disconnect()，直接模拟服务端断开：触发已注册的 close 监听器。
    // locallyClosed 仍为 false → close 监听器 send WS_ERROR → ERROR。
    socket.emit('close', new CloseEvent('close'));
    expect(client.getState()).toBe('ERROR');
    // 非本地关闭不应把 closeCalls 算成本地 disconnect 的调用。
    expect(socket.closeCalls).toBe(0);
  });

  it('reaches RECONNECTING on a session_reconnect frame', async () => {
    const { client, socket } = await connectToConnected();
    socket.emit('message', {
      data: JSON.stringify({
        metadata: { message_type: 'session_reconnect' },
        payload: { session: { reconnect_url: 'wss://reconnect.example/ws' } },
      }),
    });
    expect(client.getState()).toBe('RECONNECTING');
    client.disconnect();
  });

  it('uses the reconnect_url from the session_reconnect frame for the reconnect attempt (A07)', async () => {
    const clock = new FakeClock();
    const { client, socket } = await connectToConnected({ clock });
    socket.emit('message', {
      data: JSON.stringify({
        metadata: { message_type: 'session_reconnect' },
        payload: { session: { reconnect_url: 'wss://reconnect.example/ws' } },
      }),
    });
    expect(client.getState()).toBe('RECONNECTING');
    // 首个退避延迟 1000ms 已登记（末尾项；前面的条目来自 connectToConnected 的 watchdog）。
    expect(clock.timeouts[clock.timeouts.length - 1]).toBe(1000);
    // 触发重连定时器 → attemptReconnect() 构造第二个 FakeWebSocket。
    clock.runTimer(clock.timers.length - 1);
    expect(FakeWebSocket.instances).toHaveLength(2);
    // 新 socket 使用帧内 reconnect_url，而非默认 wsUrl。
    expect(FakeWebSocket.instances[1]?.url).toBe('wss://reconnect.example/ws');
    client.disconnect();
  });

  it('falls back to the default wsUrl when session_reconnect omits reconnect_url (A08)', async () => {
    const clock = new FakeClock();
    const { client, socket } = await connectToConnected({
      clock,
      wsUrl: 'wss://default.example/ws',
    });
    // 帧内 session 对象存在但没有任何字段 → 缺 reconnect_url → 应回退默认 wsUrl。
    socket.emit('message', {
      data: JSON.stringify({
        metadata: { message_type: 'session_reconnect' },
        payload: { session: {} },
      }),
    });
    expect(client.getState()).toBe('RECONNECTING');
    // 触发重连定时器 → attemptReconnect() 构造第二个 FakeWebSocket。
    clock.runTimer(clock.timers.length - 1);
    expect(FakeWebSocket.instances).toHaveLength(2);
    // 新 socket 回退到默认 wsUrl，而非某个重连专用 URL。
    expect(FakeWebSocket.instances[1]?.url).toBe('wss://default.example/ws');
    client.disconnect();
  });

  it('retries with exponential backoff when a reconnect attempt fails before welcome, and completes the full reconnect to CONNECTED on the next attempt (A09/A11)', async () => {
    const clock = new FakeClock();
    const { client, socket } = await connectToConnected({ clock });

    // session_reconnect → RECONNECTING，排定第一次退避尝试（1000ms 起）。
    socket.emit('message', {
      data: JSON.stringify({
        metadata: { message_type: 'session_reconnect' },
        payload: { session: { reconnect_url: 'wss://reconnect.example/ws' } },
      }),
    });
    expect(client.getState()).toBe('RECONNECTING');
    // 末尾条目为刚登记的 1000ms（前面的条目来自 connectToConnected 的 watchdog）。
    expect(clock.timeouts[clock.timeouts.length - 1]).toBe(1000);

    // 第一次尝试：触发定时器 → 构造第二个 FakeWebSocket（index 1）。
    clock.runTimer(clock.timers.length - 1);
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(FakeWebSocket.instances[1]?.url).toBe('wss://reconnect.example/ws');

    // 该次尝试在 welcome 前失败（error 事件）→ 仍停留 RECONNECTING，不进 ERROR。
    FakeWebSocket.instances[1]?.emit('error', new Event('error'));
    expect(client.getState()).toBe('RECONNECTING');
    // 失败后排定第二次尝试，退避延迟翻倍为 2000ms。
    expect(clock.timeouts[clock.timeouts.length - 1]).toBe(2000);

    // 第二次尝试：触发定时器 → 构造第三个 FakeWebSocket（index 2）。
    clock.runTimer(clock.timers.length - 1);
    expect(FakeWebSocket.instances).toHaveLength(3);

    // 本次尝试成功：welcome → WELCOME → SUBSCRIBING（fetch 202）→ CONNECTED。
    FakeWebSocket.instances[2]?.emit('message', { data: welcomeFrame() });
    await vi.waitFor(() => {
      expect(client.getState()).toBe('CONNECTED');
    });
    client.disconnect();
  });

  it('caps the exponential backoff delay at 30000ms (A12)', async () => {
    const clock = new FakeClock();
    const { client, socket } = await connectToConnected({ clock });

    // session_reconnect → RECONNECTING，排定第一次退避尝试（1000ms 起）。
    socket.emit('message', {
      data: JSON.stringify({
        metadata: { message_type: 'session_reconnect' },
        payload: { session: { reconnect_url: 'wss://reconnect.example/ws' } },
      }),
    });
    expect(client.getState()).toBe('RECONNECTING');

    // 循环 6 次：每次触发最新定时器 → 新 socket 打开；随即 error 使该次尝试失败
    // （仍停留 RECONNECTING），WS_ERROR → scheduleNextReconnect 排定下一次退避。
    for (let i = 0; i < 6; i += 1) {
      clock.runTimer(clock.timers.length - 1);
      const latest = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
      latest?.emit('error', new Event('error'));
    }
    expect(client.getState()).toBe('RECONNECTING');

    // 1000×2^6=64000 会超过封顶；断言最新登记的延迟已被压到 30000ms（已封顶）。
    expect(clock.timeouts[clock.timeouts.length - 1]).toBe(30000);

    client.disconnect();
  });

  it('disconnect() while RECONNECTING cancels the pending backoff timer and no further reconnect attempts occur (A13)', async () => {
    const clock = new FakeClock();
    const { client, socket } = await connectToConnected({ clock });

    // session_reconnect → RECONNECTING，排定第一次退避尝试（定时器仅挂起，尚未触发）。
    socket.emit('message', {
      data: JSON.stringify({
        metadata: { message_type: 'session_reconnect' },
        payload: { session: { reconnect_url: 'wss://reconnect.example/ws' } },
      }),
    });
    expect(client.getState()).toBe('RECONNECTING');
    // 尚无重连 socket：backoff 定时器只是挂起，未到触发时刻。
    expect(FakeWebSocket.instances).toHaveLength(1);

    // disconnect()：→ DISCONNECTED，并取消挂起的退避定时器。
    client.disconnect();
    expect(client.getState()).toBe('DISCONNECTED');
    expect(clock.clearTimeout).toHaveBeenCalled();

    // clearTimeout 已删除该定时器槽位；对已取消槽位 runTimer 应为 no-op。
    clock.runTimer(clock.timers.length - 1);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('resets the backoff delay to 1000ms after a successful reconnect completes, for the next reconnect episode (A14)', async () => {
    const clock = new FakeClock();
    const { client, socket } = await connectToConnected({ clock });

    // 第一段重连 episode：session_reconnect → RECONNECTING，排定第一次尝试（1000ms 起）。
    socket.emit('message', {
      data: JSON.stringify({
        metadata: { message_type: 'session_reconnect' },
        payload: { session: { reconnect_url: 'wss://reconnect.example/ws' } },
      }),
    });
    expect(client.getState()).toBe('RECONNECTING');
    expect(clock.timeouts[clock.timeouts.length - 1]).toBe(1000);

    // 失败一次：触发定时器 → 新 socket；error → 仍停留 RECONNECTING，延迟翻倍为 2000ms。
    clock.runTimer(clock.timers.length - 1);
    const attempt1 = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
    attempt1?.emit('error', new Event('error'));
    expect(client.getState()).toBe('RECONNECTING');
    expect(clock.timeouts[clock.timeouts.length - 1]).toBe(2000);

    // 第二次尝试成功：触发定时器 → 新 socket；welcome → WELCOME → SUBSCRIBING（fetch 202）→ CONNECTED。
    clock.runTimer(clock.timers.length - 1);
    const attempt2 = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
    attempt2?.emit('message', { data: welcomeFrame() });
    await vi.waitFor(() => {
      expect(client.getState()).toBe('CONNECTED');
    });

    // 第二段 episode 开始：CONNECTED 的 socket 上再来一次 session_reconnect。
    const connectedSocket = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
    connectedSocket?.emit('message', {
      data: JSON.stringify({
        metadata: { message_type: 'session_reconnect' },
        payload: { session: { reconnect_url: 'wss://reconnect2.example/ws' } },
      }),
    });
    expect(client.getState()).toBe('RECONNECTING');
    // welcome 已把退避重置回基础 1000ms：新 episode 第一次尝试延迟恢复为 1000ms，
    // 而非沿用上一 episode 末尾的 2000ms。
    expect(clock.timeouts[clock.timeouts.length - 1]).toBe(1000);

    client.disconnect();
  });

  it('a Helix subscribe failure after a successful reconnect still goes to ERROR without retrying (A15)', async () => {
    // 第一次订阅（初始连接）返回 202，第二次（重连后重新订阅）返回 400：
    // SUBSCRIBE_FAIL → 直接 ERROR，不回到 RECONNECTING 也不重试订阅本身。
    let callCount = 0;
    const fetchImpl = vi.fn(async () => {
      callCount += 1;
      return new Response(null, { status: callCount === 1 ? 202 : 400 });
    }) as typeof fetch;
    const clock = new FakeClock();
    const { client, socket } = await connectToConnected({ clock, fetchImpl });

    // 重连 episode：session_reconnect → RECONNECTING；触发定时器打开新尝试 socket。
    socket.emit('message', {
      data: JSON.stringify({
        metadata: { message_type: 'session_reconnect' },
        payload: { session: { reconnect_url: 'wss://reconnect.example/ws' } },
      }),
    });
    clock.runTimer(clock.timers.length - 1);
    const attemptSocket = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];

    // 重连成功：welcome → WELCOME → SUBSCRIBING；第二次订阅返回 400 → SUBSCRIBE_FAIL。
    attemptSocket?.emit('message', { data: welcomeFrame() });
    await vi.waitFor(() => {
      expect(client.getState()).toBe('ERROR');
    });

    // 订阅请求本身不重试：恰好两次（初始 + 重连后各一次）。
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    client.disconnect();
  });

  it('does not call authPort.getAccessToken() again during a reconnect attempt (A16)', async () => {
    // 假 authPort：初始 connect() 取一次 token；重连应复用缓存 accessToken，不再取。
    // 用 vi.fn 包一层既有 fakeAuthPort(true)：保留 ok:true 判别联合类型，同时可计数调用。
    const getAccessToken = vi.fn(fakeAuthPort(true).getAccessToken);
    const authPort: TwitchAuthPort = { getAccessToken };
    const clock = new FakeClock();
    const { client, socket } = await connectToConnected({ clock, authPort });
    // 到目前为止仅初始 connect() 取过 token。
    expect(getAccessToken).toHaveBeenCalledTimes(1);

    // session_reconnect → RECONNECTING，排定第一次退避尝试（1000ms）。
    socket.emit('message', {
      data: JSON.stringify({
        metadata: { message_type: 'session_reconnect' },
        payload: { session: { reconnect_url: 'wss://reconnect.example/ws' } },
      }),
    });
    expect(client.getState()).toBe('RECONNECTING');
    // 触发重连定时器 → attemptReconnect() 打开新尝试 socket（不开新 token 获取）。
    clock.runTimer(clock.timers.length - 1);
    expect(FakeWebSocket.instances).toHaveLength(2);

    // 重连成功：welcome → WELCOME → SUBSCRIBING（fetch 202）→ CONNECTED。
    const attemptSocket = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
    attemptSocket?.emit('message', { data: welcomeFrame() });
    await vi.waitFor(() => {
      expect(client.getState()).toBe('CONNECTED');
    });
    // 整个重连过程复用缓存 token：getAccessToken 仍只被调用过一次（初始 connect()）。
    expect(getAccessToken).toHaveBeenCalledTimes(1);
    client.disconnect();
  });

  it('disconnect() from CONNECTED returns to DISCONNECTED and closes the socket once', async () => {
    const { client, socket } = await connectToConnected();
    expect(client.getState()).toBe('CONNECTED');
    client.disconnect();
    expect(client.getState()).toBe('DISCONNECTED');
    expect(socket.closeCalls).toBe(1);
  });

  it('disconnect() while still CONNECTING returns to DISCONNECTED and never opens a socket (A14 CONNECTING)', async () => {
    // 永不 resolve 的 authPort promise：connect() 后停在 CONNECTING，凭据未返回。
    const authPort: TwitchAuthPort = {
      getAccessToken: () => new Promise(() => {}),
    };
    const client = createEventSubClient({ ...defaultConfig, authPort });

    client.connect();
    expect(client.getState()).toBe('CONNECTING');

    client.disconnect();
    expect(client.getState()).toBe('DISCONNECTED');

    // 凭据 promise 仍挂着未返回，绝不该构造 WebSocket。
    expect(FakeWebSocket.constructorCalls).toBe(0);
    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it('disconnect() from DEGRADED returns to DISCONNECTED (A14 DEGRADED)', async () => {
    const clock = new FakeClock();
    const { client } = await connectToConnected({ clock });
    expect(client.getState()).toBe('CONNECTED');

    // 不 emit 任何 keepalive/notification，触发 watchdog → DEGRADED。
    clock.runTimer(0);
    expect(client.getState()).toBe('DEGRADED');

    client.disconnect();
    expect(client.getState()).toBe('DISCONNECTED');
  });

  it('reports OK health when CONNECTED, DOWN with an error field otherwise', async () => {
    const { client } = await connectToConnected();
    expect(client.getHealth()).toEqual({ status: 'OK' });

    client.disconnect();
    const down = client.getHealth();
    expect(down.status).toBe('DOWN');
    expect(down.error).toBeDefined();

    // 凭据不可用 → ERROR；此时 getHealth() 也应为 DOWN + error。
    const failing = createEventSubClient({
      ...defaultConfig,
      authPort: fakeAuthPort(false),
    });
    failing.connect();
    await vi.waitFor(() => {
      expect(failing.getState()).toBe('ERROR');
    });
    const errorDown = failing.getHealth();
    expect(errorDown.status).toBe('DOWN');
    expect(errorDown.error).toBeDefined();
  });

  it('reports DOWN with an error field for CONNECTING/WELCOME/SUBSCRIBING/RECONNECTING/DEGRADED (A15 remaining states)', async () => {
    const assertDown = (client: ReturnType<typeof createEventSubClient>, state: string): void => {
      expect(client.getState()).toBe(state);
      const health = client.getHealth();
      expect(health.status).toBe('DOWN');
      expect(health.error).toBeDefined();
      expect(health.error).toContain(state);
    };

    // --- CONNECTING：凭据 promise 永不 resolve，connect() 后停在 CONNECTING。
    const pendingAuth: TwitchAuthPort = {
      getAccessToken: () => new Promise(() => {}),
    };
    const connecting = createEventSubClient({ ...defaultConfig, authPort: pendingAuth });
    connecting.connect();
    assertDown(connecting, 'CONNECTING');

    // --- WELCOME / SUBSCRIBING：可挂起 fetch 把 CONNECTED 前的中间态钉住。
    let resolveFetch!: (r: Response) => void;
    const gate = new Promise<Response>((r) => (resolveFetch = r));
    const fetchImpl = vi.fn(() => gate);
    const client = createEventSubClient({ ...defaultConfig, fetchImpl });
    client.connect();
    await vi.waitFor(() => {
      expect(FakeWebSocket.instances).toHaveLength(1);
    });
    const socket = FakeWebSocket.instances[0]!;

    socket.emit('message', { data: welcomeFrame() });
    // welcome 帧处理同步：此刻刚 send WELCOME_RECEIVED，停在 WELCOME。
    assertDown(client, 'WELCOME');

    // 放行微任务 → SUBSCRIBING（fetch 挂起，状态驻留）。
    await vi.waitFor(() => {
      expect(client.getState()).toBe('SUBSCRIBING');
    });
    assertDown(client, 'SUBSCRIBING');

    // 放行 fetch 202 → CONNECTED，再经 reconnect 帧 → RECONNECTING。
    resolveFetch(new Response(null, { status: 202 }));
    await vi.waitFor(() => {
      expect(client.getState()).toBe('CONNECTED');
    });
    socket.emit('message', {
      data: JSON.stringify({
        metadata: { message_type: 'session_reconnect' },
        payload: { session: { reconnect_url: 'wss://reconnect.example/ws' } },
      }),
    });
    assertDown(client, 'RECONNECTING');
    // 收尾：断开该 client，避免遗留真实时钟的 watchdog 定时器。
    client.disconnect();

    // --- DEGRADED：独立客户端，假 Clock 触发 watchdog。
    // 先清理前面 client 留在全局 instances 里的 socket，避免 connectToConnected
    // 误拿旧 socket（它是按 instances[0] 取的）。
    FakeWebSocket.instances = [];
    const clock = new FakeClock();
    const degradedClient = await connectToConnected({ clock });
    clock.runTimer(0);
    assertDown(degradedClient.client, 'DEGRADED');
  });
});
