import { describe, expect, it, vi } from 'vitest';
import { createYoutubeSendChat, noopYoutubeSendChat } from './sendChat.js';
import type { YoutubeAuthPort } from './youtubeAuth.js';

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

function insertResponse(): Response {
  return new Response(
    JSON.stringify({
      kind: 'youtube#liveChatMessage',
      etag: 'etag-1',
      id: 'LCC-message-1',
      snippet: { type: 'textMessageEvent' },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

const CONFIG = {
  authPort: fakeAuthPort(true),
  liveChatId: 'Cg0KC2xpdmVfY2hhdF9pZBAH',
  apiBaseUrl: 'https://youtube.example/v3',
};

describe('noopYoutubeSendChat', () => {
  it('always returns ok:false without any network request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(insertResponse());
    try {
      const result = await noopYoutubeSendChat.sendChat('hello');
      expect(result).toEqual({ ok: false, reason: 'no YouTube send-chat configured' });
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

describe('createYoutubeSendChat', () => {
  it('builds the insert request and returns {ok:true, messageId} on success (A17)', async () => {
    let receivedUrl = '';
    let receivedInit: RequestInit | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      receivedUrl = String(input);
      receivedInit = init;
      return insertResponse();
    };
    const sendChat = createYoutubeSendChat({ ...CONFIG, fetchImpl });

    const result = await sendChat.sendChat('hello from bot');

    expect(result).toEqual({ ok: true, messageId: 'LCC-message-1' });
    expect(receivedUrl).toBe('https://youtube.example/v3/liveChat/messages?part=snippet');
    expect(receivedInit?.method).toBe('POST');
    const headers = receivedInit?.headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toBe('Bearer tok');
    expect(headers?.['Content-Type']).toBe('application/json');
    expect(JSON.parse(String(receivedInit?.body))).toEqual({
      snippet: {
        liveChatId: 'Cg0KC2xpdmVfY2hhdF9pZBAH',
        type: 'textMessageEvent',
        textMessageDetails: { messageText: 'hello from bot' },
      },
    });
  });

  it('returns ok:false without throwing on an HTTP error response (A17)', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ error: { code: 403 } }), {
        status: 403,
        statusText: 'Forbidden',
      });
    const sendChat = createYoutubeSendChat({ ...CONFIG, fetchImpl });

    const result = await sendChat.sendChat('hello');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('403');
    }
  });

  it('returns ok:false without throwing when fetch rejects', async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new Error('network unreachable');
    };
    const sendChat = createYoutubeSendChat({ ...CONFIG, fetchImpl });

    const result = await sendChat.sendChat('hello');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('network unreachable');
    }
  });

  it('returns ok:false with the auth reason when credentials are unavailable, without any HTTP request (A17)', async () => {
    const fetchImpl = vi.fn(async () => insertResponse());
    const sendChat = createYoutubeSendChat({
      authPort: fakeAuthPort(false, 'no YouTube OAuth credentials configured'),
      liveChatId: CONFIG.liveChatId,
      fetchImpl,
    });

    const result = await sendChat.sendChat('hello');

    expect(result).toEqual({
      ok: false,
      reason: 'no YouTube OAuth credentials configured',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns ok:false when the response body misses the id field', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ kind: 'youtube#liveChatMessage' }), { status: 200 });
    const sendChat = createYoutubeSendChat({ ...CONFIG, fetchImpl });

    const result = await sendChat.sendChat('hello');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('unexpected shape');
    }
  });
});
