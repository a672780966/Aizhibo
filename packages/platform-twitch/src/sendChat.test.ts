import { describe, expect, it, vi } from 'vitest';
import { createTwitchSendChat, noopTwitchSendChat, type TwitchSendChatConfig } from './sendChat.js';
import type { TwitchAuthPort } from './twitchAuth.js';

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

const defaultConfig: TwitchSendChatConfig = {
  authPort: fakeAuthPort(true),
  clientId: 'client-1',
  broadcasterUserId: 'broadcaster-1',
  userId: 'bot-1',
};

describe('createTwitchSendChat', () => {
  it('returns ok:false and never calls fetch when credentials are unavailable (A07)', async () => {
    const fetchImpl = vi.fn();
    const sendChat = createTwitchSendChat({
      ...defaultConfig,
      authPort: fakeAuthPort(false, 'no credentials'),
      fetchImpl,
    });

    const result = await sendChat.sendChat('hello');

    expect(result).toEqual({ ok: false, reason: 'no credentials' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('sends the correctly constructed request and returns ok:true with the message id on success (A08)', async () => {
    let lastUrl = '';
    let lastInit: RequestInit | undefined;
    const fetchImpl: typeof fetch = vi.fn(async (input, init) => {
      lastUrl = String(input);
      lastInit = init;
      return new Response(JSON.stringify({ data: [{ message_id: 'msg-1', is_sent: true }] }), {
        status: 200,
      });
    });
    const sendChat = createTwitchSendChat({
      ...defaultConfig,
      helixBaseUrl: 'https://helix.example',
      fetchImpl,
    });

    const result = await sendChat.sendChat('hello chat');

    expect(result).toEqual({ ok: true, messageId: 'msg-1' });
    expect(lastUrl).toBe('https://helix.example/helix/chat/messages');
    expect(lastInit?.method).toBe('POST');
    expect(lastInit?.headers).toMatchObject({
      Authorization: 'Bearer tok',
      'Client-Id': 'client-1',
    });
    expect(JSON.parse(String(lastInit?.body))).toEqual({
      broadcaster_id: 'broadcaster-1',
      sender_id: 'bot-1',
      message: 'hello chat',
    });
  });

  it('treats is_sent:false as a failure using the drop_reason message (A09)', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          data: [
            {
              message_id: 'msg-1',
              is_sent: false,
              drop_reason: { code: 'automod_denied', message: 'blocked by AutoMod' },
            },
          ],
        }),
        { status: 200 },
      );
    const sendChat = createTwitchSendChat({ ...defaultConfig, fetchImpl });

    const result = await sendChat.sendChat('hello');

    expect(result).toEqual({ ok: false, reason: 'blocked by AutoMod' });
  });

  it('returns ok:false with status info on a non-200 response (A10)', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response('bad request', { status: 400, statusText: 'Bad Request' });
    const sendChat = createTwitchSendChat({ ...defaultConfig, fetchImpl });

    const result = await sendChat.sendChat('hello');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('400');
    }
  });

  it('returns ok:false when the response body has an unexpected shape (A11)', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ unexpected: true }), { status: 200 });
    const sendChat = createTwitchSendChat({ ...defaultConfig, fetchImpl });

    const result = await sendChat.sendChat('hello');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('Twitch send chat response has an unexpected shape');
    }
  });

  it('returns ok:false when fetch throws, without throwing itself (A12)', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down');
    });
    const sendChat = createTwitchSendChat({ ...defaultConfig, fetchImpl });

    await expect(sendChat.sendChat('hi')).resolves.toEqual({ ok: false, reason: 'network down' });
  });

  it('noopTwitchSendChat always fails without ever calling fetch (A13)', async () => {
    const result = await noopTwitchSendChat.sendChat('hi');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('no Twitch send-chat configured');
    }
  });

  it('calls fetch exactly once on failure paths, no retry (A14)', async () => {
    const fetchImpl = vi.fn(async () => new Response('err', { status: 500 }));
    const sendChat = createTwitchSendChat({ ...defaultConfig, fetchImpl });

    await sendChat.sendChat('hi');

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
