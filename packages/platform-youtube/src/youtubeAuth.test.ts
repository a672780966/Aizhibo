import { describe, expect, it, vi } from 'vitest';
import {
  createOptionalYoutubeAuthProvider,
  createYoutubeAuthProvider,
  noopYoutubeAuthPort,
} from './youtubeAuth.js';

const CREDENTIALS = {
  clientId: 'client-id',
  clientSecret: 'client-secret',
  refreshToken: 'refresh-token',
};

function tokenResponse(): Response {
  return new Response(
    JSON.stringify({
      // Google refresh_token grant 的真实字段；scope 不保证返回，本节点守卫
      // 不要求它（与 Twitch 不同）。
      access_token: 'access-token',
      expires_in: 3600,
      token_type: 'Bearer',
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

function httpErrorResponse(): Response {
  return new Response(JSON.stringify({ error: 'invalid_grant' }), {
    status: 400,
    statusText: 'Bad Request',
  });
}

describe('createOptionalYoutubeAuthProvider', () => {
  it('returns the frozen noop port itself when any credential is missing (A09)', () => {
    expect(createOptionalYoutubeAuthProvider({})).toBe(noopYoutubeAuthPort);
    expect(
      createOptionalYoutubeAuthProvider({
        YOUTUBE_CLIENT_ID: 'id',
        YOUTUBE_CLIENT_SECRET: 'secret',
      }),
    ).toBe(noopYoutubeAuthPort);
    expect(
      createOptionalYoutubeAuthProvider({
        YOUTUBE_CLIENT_ID: 'id',
        YOUTUBE_REFRESH_TOKEN: 'refresh',
      }),
    ).toBe(noopYoutubeAuthPort);
    expect(
      createOptionalYoutubeAuthProvider({
        YOUTUBE_CLIENT_SECRET: 'secret',
        YOUTUBE_REFRESH_TOKEN: 'refresh',
      }),
    ).toBe(noopYoutubeAuthPort);
    expect(
      createOptionalYoutubeAuthProvider({
        YOUTUBE_CLIENT_ID: '',
        YOUTUBE_CLIENT_SECRET: 'secret',
        YOUTUBE_REFRESH_TOKEN: 'refresh',
      }),
    ).toBe(noopYoutubeAuthPort);
  });

  it('creates a real provider (not the noop) when all three credentials are present', async () => {
    let fetchCalls = 0;
    const fetchImpl: typeof fetch = async () => {
      fetchCalls += 1;
      return tokenResponse();
    };
    const provider = createOptionalYoutubeAuthProvider({
      YOUTUBE_CLIENT_ID: 'id',
      YOUTUBE_CLIENT_SECRET: 'secret',
      YOUTUBE_REFRESH_TOKEN: 'refresh',
    });
    expect(provider).not.toBe(noopYoutubeAuthPort);
    // 真实 provider 走 createYoutubeAuthProvider 路径（用注入 fetch 验证）。
    const realProvider = createYoutubeAuthProvider({ ...CREDENTIALS, fetchImpl });
    const result = await realProvider.getAccessToken();
    expect(result.ok).toBe(true);
    expect(fetchCalls).toBe(1);
  });

  it('noop port always returns ok:false without any network request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(tokenResponse());
    try {
      const result = await noopYoutubeAuthPort.getAccessToken();
      expect(result).toEqual({
        ok: false,
        reason: 'no YouTube OAuth credentials configured',
      });
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

describe('createYoutubeAuthProvider', () => {
  it('builds the refresh_token grant request and maps a successful response', async () => {
    let receivedUrl = '';
    let receivedInit: RequestInit | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      receivedUrl = String(input);
      receivedInit = init;
      return tokenResponse();
    };
    const provider = createYoutubeAuthProvider({
      ...CREDENTIALS,
      baseUrl: 'https://oauth2.example.test/',
      fetchImpl,
    });

    const result = await provider.getAccessToken();

    expect(result).toEqual({
      ok: true,
      token: { accessToken: 'access-token', expiresInSeconds: 3600 },
    });
    expect(receivedUrl).toBe('https://oauth2.example.test/token');
    expect(receivedInit?.method).toBe('POST');
    expect(receivedInit?.headers).toMatchObject({
      'content-type': 'application/x-www-form-urlencoded',
    });
    const form = new URLSearchParams(String(receivedInit?.body));
    expect(form.get('grant_type')).toBe('refresh_token');
    expect(form.get('refresh_token')).toBe('refresh-token');
    expect(form.get('client_id')).toBe('client-id');
    expect(form.get('client_secret')).toBe('client-secret');
  });

  it('returns ok:false without throwing on an HTTP error response (A08)', async () => {
    const fetchImpl: typeof fetch = async () => httpErrorResponse();
    const provider = createYoutubeAuthProvider({ ...CREDENTIALS, fetchImpl });

    const result = await provider.getAccessToken();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('400');
      expect(result.reason).toContain('Bad Request');
    }
  });

  it('returns ok:false without throwing when fetch rejects', async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new Error('network unreachable');
    };
    const provider = createYoutubeAuthProvider({ ...CREDENTIALS, fetchImpl });

    const result = await provider.getAccessToken();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('network unreachable');
    }
  });

  it('returns ok:false when the response body is not the expected shape', async () => {
    const fetchImpl: typeof fetch = async () => new Response('not json at all', { status: 200 });
    const provider = createYoutubeAuthProvider({ ...CREDENTIALS, fetchImpl });

    const result = await provider.getAccessToken();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('unexpected shape');
    }
  });

  it('returns ok:false when the response body misses token fields', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ access_token: 'only-token' }), { status: 200 });
    const provider = createYoutubeAuthProvider({ ...CREDENTIALS, fetchImpl });

    const result = await provider.getAccessToken();

    expect(result.ok).toBe(false);
  });

  it('accepts a response without a scope field (Google refresh_token grant)', async () => {
    // tokenResponse() 已经不带 scope：成功解析即证明守卫不要求 scope。
    const fetchImpl: typeof fetch = async () => tokenResponse();
    const provider = createYoutubeAuthProvider({ ...CREDENTIALS, fetchImpl });

    const result = await provider.getAccessToken();

    expect(result).toEqual({
      ok: true,
      token: { accessToken: 'access-token', expiresInSeconds: 3600 },
    });
  });

  it('does not persist or cache tokens across calls', async () => {
    let fetchCalls = 0;
    const fetchImpl: typeof fetch = async () => {
      fetchCalls += 1;
      return tokenResponse();
    };
    const provider = createYoutubeAuthProvider({ ...CREDENTIALS, fetchImpl });

    const first = await provider.getAccessToken();
    const second = await provider.getAccessToken();

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(fetchCalls).toBe(2);
  });
});
