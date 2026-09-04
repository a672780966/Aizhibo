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

  /** 可控假时钟：setTimeout 只登记不触发，测试代码手动 run 定时器。 */
  class FakeClock {
    setTimeout = vi.fn((fn: () => void) => {
      this.timers.push(fn);
      return this.timers.length - 1;
    });
    clearTimeout = vi.fn((id: number) => {
      delete this.timers[id];
    });
    now = vi.fn(() => this.current);
    current = 1000;
    timers: (() => void)[] = [];

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

  it('reaches RECONNECTING on a session_reconnect frame', async () => {
    const { client, socket } = await connectToConnected();
    socket.emit('message', {
      data: JSON.stringify({
        metadata: { message_type: 'session_reconnect' },
        payload: { session: { reconnect_url: 'wss://reconnect.example/ws' } },
      }),
    });
    expect(client.getState()).toBe('RECONNECTING');
  });

  it('disconnect() from CONNECTED returns to DISCONNECTED and closes the socket once', async () => {
    const { client, socket } = await connectToConnected();
    expect(client.getState()).toBe('CONNECTED');
    client.disconnect();
    expect(client.getState()).toBe('DISCONNECTED');
    expect(socket.closeCalls).toBe(1);
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
});
