import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLiveChatPoller, type LiveChatPollerConfig } from './liveChatPoller.js';
import type { YoutubeAuthPort } from './youtubeAuth.js';

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

function fakeAuthPort(ok: true): YoutubeAuthPort;
function fakeAuthPort(ok: false, reason?: string): YoutubeAuthPort;
function fakeAuthPort(ok: boolean, reason = 'no credentials'): YoutubeAuthPort {
  return {
    getAccessToken: async () =>
      ok
        ? { ok: true, token: { accessToken: 'tok', expiresInSeconds: 3600 } }
        : { ok: false, reason },
  };
}

/** liveChatMessages.list 成功响应的最小形状。 */
function pollResponse(overrides: {
  items?: unknown[];
  nextPageToken?: string;
  pollingIntervalMillis?: number;
}): Response {
  return new Response(
    JSON.stringify({
      kind: 'youtube#liveChatMessageListResponse',
      ...(overrides.items !== undefined ? { items: overrides.items } : {}),
      ...(overrides.nextPageToken !== undefined ? { nextPageToken: overrides.nextPageToken } : {}),
      pollingIntervalMillis: overrides.pollingIntervalMillis ?? 2500,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

function textItem(id: string, text: string): unknown {
  return {
    id,
    snippet: {
      type: 'textMessageEvent',
      publishedAt: '2026-09-09T10:00:00.000Z',
      textMessageDetails: { messageText: text },
    },
    authorDetails: { channelId: `UC-${id}` },
  };
}

const defaultConfig: Omit<LiveChatPollerConfig, 'authPort'> = {
  liveChatId: 'Cg0KC2xpdmVfY2hhdF9pZBAH',
  apiBaseUrl: 'https://youtube.example/v3',
  fetchImpl: (async () => new Response(null, { status: 200 })) as typeof fetch,
};

function createWith(overrides: Partial<LiveChatPollerConfig> = {}) {
  const config = { ...defaultConfig, ...overrides };
  return createLiveChatPoller(config as LiveChatPollerConfig);
}

describe('createLiveChatPoller', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('starts STOPPED and reports DOWN health', () => {
    const client = createWith({ authPort: fakeAuthPort(true) });
    expect(client.getState()).toBe('STOPPED');
    expect(client.getHealth()).toEqual({ status: 'DOWN', error: 'state: STOPPED' });
  });

  it('goes straight to ERROR when the access token cannot be obtained, without any HTTP request (A10)', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 200 }));
    const client = createWith({
      authPort: fakeAuthPort(false, 'no credentials'),
      fetchImpl,
    });

    client.connect();
    await vi.waitFor(() => {
      expect(client.getState()).toBe('ERROR');
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(client.getHealth().status).toBe('DOWN');
  });

  it('first poll carries no pageToken; the returned nextPageToken + pollingIntervalMillis schedule the next pageToken request (A11)', async () => {
    const urls: string[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      urls.push(String(input));
      return urls.length === 1
        ? pollResponse({ items: [], nextPageToken: 'TOKEN-1', pollingIntervalMillis: 2000 })
        : pollResponse({ items: [], pollingIntervalMillis: 2000 });
    });
    const clock = new FakeClock();
    const client = createWith({ authPort: fakeAuthPort(true), fetchImpl, clock });

    client.connect();
    await vi.waitFor(() => {
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    });
    // 首次请求：liveChatId + part，不带 pageToken。
    expect(client.getState()).toBe('POLLING');
    expect(client.getHealth()).toEqual({ status: 'OK' });
    const firstUrl = new URL(urls[0]!);
    expect(firstUrl.pathname).toBe('/v3/liveChat/messages');
    expect(firstUrl.searchParams.get('liveChatId')).toBe('Cg0KC2xpdmVfY2hhdF9pZBAH');
    expect(firstUrl.searchParams.get('part')).toBe('snippet,authorDetails');
    expect(firstUrl.searchParams.get('pageToken')).toBeNull();

    // 响应到达后按 pollingIntervalMillis 排定下一次请求。
    await vi.waitFor(() => {
      expect(clock.timeouts).toHaveLength(1);
    });
    expect(clock.timeouts[0]).toBe(2000);

    // 手动触发下一次轮询：请求带 pageToken。
    clock.runTimer(0);
    await vi.waitFor(() => {
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    });
    const secondUrl = new URL(urls[1]!);
    expect(secondUrl.searchParams.get('pageToken')).toBe('TOKEN-1');
    expect(client.getState()).toBe('POLLING');
    client.disconnect();
  });

  it('calls onMessage only for snippet.type === textMessageEvent items, mapping real fields, skipping other types silently (A12)', async () => {
    const onMessage = vi.fn();
    const clock = new FakeClock();
    const items: unknown[] = [
      textItem('m1', 'hello from UC-m1'),
      {
        // superChatEvent 等其余类型：静默跳过。
        id: 'super-1',
        snippet: {
          type: 'superChatEvent',
          publishedAt: '2026-09-09T10:00:05.000Z',
          textMessageDetails: { messageText: 'super chat' },
        },
        authorDetails: { channelId: 'UC-super' },
      },
      {
        // textMessageEvent 但缺 textMessageDetails.messageText：畸形，静默跳过。
        id: 'm2',
        snippet: { type: 'textMessageEvent', publishedAt: '2026-09-09T10:00:06.000Z' },
        authorDetails: { channelId: 'UC-m2' },
      },
      {
        // textMessageEvent 但缺 authorDetails.channelId：畸形，静默跳过。
        id: 'm3',
        snippet: {
          type: 'textMessageEvent',
          publishedAt: '2026-09-09T10:00:07.000Z',
          textMessageDetails: { messageText: 'no author' },
        },
        authorDetails: {},
      },
    ];
    const client = createWith({
      authPort: fakeAuthPort(true),
      clock,
      onMessage,
      fetchImpl: vi.fn(async () =>
        pollResponse({ items, nextPageToken: 'TOKEN-1', pollingIntervalMillis: 2500 }),
      ),
    });

    client.connect();
    await vi.waitFor(() => {
      expect(onMessage).toHaveBeenCalledTimes(1);
    });
    expect(onMessage).toHaveBeenCalledWith({
      messageId: 'm1',
      authorChannelId: 'UC-m1',
      text: 'hello from UC-m1',
      publishedAt: '2026-09-09T10:00:00.000Z',
    });
    expect(client.getState()).toBe('POLLING');
    client.disconnect();
  });

  it('goes to ERROR on a non-2xx response, schedules no retry, and stays ERROR until reconnect() (A13)', async () => {
    const fetchImpl = vi.fn(async () => new Response('forbidden', { status: 403 }));
    const clock = new FakeClock();
    const client = createWith({ authPort: fakeAuthPort(true), fetchImpl, clock });

    client.connect();
    await vi.waitFor(() => {
      expect(client.getState()).toBe('ERROR');
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    // 不自动重试：无任何排定的下一次轮询定时器。
    expect(clock.timers.length).toBe(0);
    expect(client.getHealth()).toEqual({ status: 'DOWN', error: expect.stringContaining('403') });

    // 重新 connect()（ERROR 起）→ 恢复 POLLING，重新发起轮询。
    fetchImpl.mockResolvedValue(
      pollResponse({ items: [], nextPageToken: 'TOKEN-2', pollingIntervalMillis: 1000 }),
    );
    client.connect();
    await vi.waitFor(() => {
      expect(client.getState()).toBe('POLLING');
    });
    await vi.waitFor(() => {
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    });
    client.disconnect();
  });

  it('goes to ERROR when the poll request throws, without retrying', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down');
    });
    const clock = new FakeClock();
    const client = createWith({ authPort: fakeAuthPort(true), fetchImpl, clock });

    client.connect();
    await vi.waitFor(() => {
      expect(client.getState()).toBe('ERROR');
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(clock.timers.length).toBe(0);
    expect(client.getHealth().status).toBe('DOWN');
  });

  it('goes to ERROR when the response body has an unexpected shape', async () => {
    const fetchImpl = vi.fn(async () => new Response('not json', { status: 200 }));
    const client = createWith({ authPort: fakeAuthPort(true), fetchImpl });

    client.connect();
    await vi.waitFor(() => {
      expect(client.getState()).toBe('ERROR');
    });
    expect(client.getHealth().status).toBe('DOWN');
  });

  it('stops polling (STOPPED) when the response carries no nextPageToken (chat ended)', async () => {
    const fetchImpl = vi.fn(async () => pollResponse({ items: [] }));
    const clock = new FakeClock();
    const client = createWith({ authPort: fakeAuthPort(true), fetchImpl, clock });

    client.connect();
    await vi.waitFor(() => {
      expect(client.getState()).toBe('STOPPED');
    });
    // 无游标 → 不排定任何下一次请求。
    expect(clock.timers.length).toBe(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(client.getHealth().status).toBe('DOWN');
  });

  it('disconnect() cancels the pending next-poll timer and returns to STOPPED (A14)', async () => {
    const clock = new FakeClock();
    const client = createWith({
      authPort: fakeAuthPort(true),
      clock,
      fetchImpl: vi.fn(async () =>
        pollResponse({ items: [], nextPageToken: 'TOKEN-1', pollingIntervalMillis: 2500 }),
      ),
    });

    client.connect();
    await vi.waitFor(() => {
      expect(clock.timers.length).toBe(1);
    });
    expect(client.getState()).toBe('POLLING');

    client.disconnect();
    expect(client.getState()).toBe('STOPPED');
    expect(clock.cleared).toContain(0); // 挂起的定时器已被 clearTimeout
    // 定时器虽已被清除，手动触发也不会再发起请求。
    clock.runTimer(0);
    await vi.waitFor(() => {
      expect(client.getHealth().status).toBe('DOWN');
    });
    client.disconnect();
  });

  it('a disconnect() called synchronously from inside onMessage still ends in STOPPED with no next timer and no follow-up request (FIX-T01)', async () => {
    // onMessage 需引用 poller 自身（构造期尚未赋值），用 holder 对象承接。
    const holder: { client?: ReturnType<typeof createLiveChatPoller> } = {};
    const clock = new FakeClock();
    const fetchImpl = vi.fn(async () =>
      pollResponse({
        items: [textItem('m1', 'hello')],
        nextPageToken: 'TOKEN-1',
        pollingIntervalMillis: 2500,
      }),
    );
    // onMessage 在处理有效消息时同步调用 disconnect()（回调重入）。
    const onMessage = vi.fn(() => {
      holder.client!.disconnect();
    });
    holder.client = createWith({
      authPort: fakeAuthPort(true),
      clock,
      fetchImpl,
      onMessage,
    });

    holder.client.connect();
    await vi.waitFor(() => {
      expect(onMessage).toHaveBeenCalledTimes(1);
    });
    // 回调内 disconnect() 已生效：回到 STOPPED。
    expect(holder.client!.getState()).toBe('STOPPED');
    expect(holder.client!.getHealth()).toEqual({ status: 'DOWN', error: 'state: STOPPED' });
    // 本次 pollOnce 排定定时器之前返回：未排定任何下一次轮询定时器。
    expect(clock.timers.length).toBe(0);
    expect(clock.timeouts.length).toBe(0);
    // 也未因此发起新的 HTTP 请求。
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('a stale poll response from a disconnected episode never drives the new episode', async () => {
    let resolvePoll!: (r: Response) => void;
    const gate = new Promise<Response>((r) => (resolvePoll = r));
    let gateServed = false;
    const fetchImpl = vi.fn(async () => {
      // 第一次轮询挂起；后续调用返回正常响应。
      if (!gateServed) {
        gateServed = true;
        return gate;
      }
      return pollResponse({ items: [], nextPageToken: 'TOKEN-2', pollingIntervalMillis: 500 });
    });
    const clock = new FakeClock();
    const client = createWith({ authPort: fakeAuthPort(true), fetchImpl, clock });

    client.connect();
    await vi.waitFor(() => {
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    });
    // 请求在途时 disconnect → 重新 connect（新 episode）。
    client.disconnect();
    expect(client.getState()).toBe('STOPPED');
    client.connect();
    await vi.waitFor(() => {
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    });
    // 新 episode 的响应到达 → 排定了下一次轮询定时器。
    await vi.waitFor(() => {
      expect(clock.timers.length).toBe(1);
    });
    // 旧 episode 的响应此时才到达：必须被丢弃，不得转 ERROR/污染新 episode。
    resolvePoll(new Response('late', { status: 200 }));
    await vi.waitFor(() => {
      expect(clock.timers.length).toBe(1);
    });
    expect(client.getState()).toBe('POLLING');
    // 定时器仍在 → 手动触发下一次轮询（第 3 次请求），旧响应的迟到处理未破坏链路。
    clock.runTimer(0);
    await vi.waitFor(() => {
      expect(fetchImpl).toHaveBeenCalledTimes(3);
    });
    expect(client.getState()).toBe('POLLING');
    client.disconnect();
  });
});
