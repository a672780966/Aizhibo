import { describe, expect, it, vi } from 'vitest';
import {
  createOptionalTwitchAuthProvider,
  createTwitchAuthProvider,
  getOptionalTwitchAuthHealth,
  getTwitchAuthHealth,
  noopTwitchAuthPort,
} from './twitchAuth.js';

const CREDENTIALS = {
  clientId: 'client-id',
  clientSecret: 'client-secret',
  refreshToken: 'refresh-token',
};

function tokenResponse(): Response {
  return new Response(
    JSON.stringify({
      access_token: 'access-token',
      expires_in: 3600,
      scope: ['user:read:email', 'chat:read'],
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

function httpErrorResponse(): Response {
  return new Response(JSON.stringify({ message: 'invalid refresh token' }), {
    status: 400,
    statusText: 'Bad Request',
  });
}

describe('createOptionalTwitchAuthProvider', () => {
  it('returns the frozen noop port itself when any credential is missing', () => {
    expect(createOptionalTwitchAuthProvider({})).toBe(noopTwitchAuthPort);
    expect(
      createOptionalTwitchAuthProvider({
        TWITCH_CLIENT_ID: 'id',
        TWITCH_CLIENT_SECRET: 'secret',
      }),
    ).toBe(noopTwitchAuthPort);
    expect(
      createOptionalTwitchAuthProvider({
        TWITCH_CLIENT_ID: 'id',
        TWITCH_REFRESH_TOKEN: 'refresh',
      }),
    ).toBe(noopTwitchAuthPort);
    expect(
      createOptionalTwitchAuthProvider({
        TWITCH_CLIENT_SECRET: 'secret',
        TWITCH_REFRESH_TOKEN: 'refresh',
      }),
    ).toBe(noopTwitchAuthPort);
    expect(
      createOptionalTwitchAuthProvider({
        TWITCH_CLIENT_ID: '',
        TWITCH_CLIENT_SECRET: 'secret',
        TWITCH_REFRESH_TOKEN: 'refresh',
      }),
    ).toBe(noopTwitchAuthPort);
  });

  it('creates a real provider when all three credentials are present', async () => {
    let fetchCalls = 0;
    const fetchImpl: typeof fetch = async () => {
      fetchCalls += 1;
      return tokenResponse();
    };
    const provider = createOptionalTwitchAuthProvider({
      TWITCH_CLIENT_ID: 'id',
      TWITCH_CLIENT_SECRET: 'secret',
      TWITCH_REFRESH_TOKEN: 'refresh',
    });
    expect(provider).not.toBe(noopTwitchAuthPort);
    const realProvider = createTwitchAuthProvider({ ...CREDENTIALS, fetchImpl });
    const result = await realProvider.getAccessToken();
    expect(result.ok).toBe(true);
    expect(fetchCalls).toBe(1);
  });
});

describe('createTwitchAuthProvider', () => {
  it('builds the token request and maps a successful response', async () => {
    let receivedUrl = '';
    let receivedInit: RequestInit | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      receivedUrl = String(input);
      receivedInit = init;
      return tokenResponse();
    };
    const provider = createTwitchAuthProvider({
      ...CREDENTIALS,
      baseUrl: 'https://id.example.test/',
      fetchImpl,
    });

    const result = await provider.getAccessToken();

    expect(result).toEqual({
      ok: true,
      token: {
        accessToken: 'access-token',
        expiresInSeconds: 3600,
        scopes: ['user:read:email', 'chat:read'],
      },
    });
    expect(receivedUrl).toBe('https://id.example.test/oauth2/token');
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

  it('returns ok:false without throwing on an HTTP error response', async () => {
    const fetchImpl: typeof fetch = async () => httpErrorResponse();
    const provider = createTwitchAuthProvider({ ...CREDENTIALS, fetchImpl });

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
    const provider = createTwitchAuthProvider({ ...CREDENTIALS, fetchImpl });

    const result = await provider.getAccessToken();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('network unreachable');
    }
  });

  it('returns ok:false when the response body is not the expected shape', async () => {
    const fetchImpl: typeof fetch = async () => new Response('not json at all', { status: 200 });
    const provider = createTwitchAuthProvider({ ...CREDENTIALS, fetchImpl });

    const result = await provider.getAccessToken();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('unexpected shape');
    }
  });

  it('returns ok:false when the response body misses token fields', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ access_token: 'only-token' }), { status: 200 });
    const provider = createTwitchAuthProvider({ ...CREDENTIALS, fetchImpl });

    const result = await provider.getAccessToken();

    expect(result.ok).toBe(false);
  });

  it('does not persist or cache tokens across calls', async () => {
    let fetchCalls = 0;
    const fetchImpl: typeof fetch = async () => {
      fetchCalls += 1;
      return tokenResponse();
    };
    const provider = createTwitchAuthProvider({ ...CREDENTIALS, fetchImpl });

    const first = await provider.getAccessToken();
    const second = await provider.getAccessToken();

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(fetchCalls).toBe(2);
  });
});

describe('getOptionalTwitchAuthHealth', () => {
  it('returns DOWN without any network request when credentials are missing', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(tokenResponse());
    try {
      const result = await getOptionalTwitchAuthHealth({});
      expect(result).toEqual({ status: 'DOWN', error: 'no Twitch OAuth credentials configured' });
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

describe('getTwitchAuthHealth', () => {
  it('returns OK on a successful token exchange', async () => {
    const fetchImpl: typeof fetch = async () => tokenResponse();
    const result = await getTwitchAuthHealth({ ...CREDENTIALS, fetchImpl });

    expect(result.status).toBe('OK');
    expect(result.lastSuccessAt).toBeTypeOf('number');
    expect(result.latencyMs).toBeTypeOf('number');
  });

  it('returns DOWN on an HTTP error response', async () => {
    const fetchImpl: typeof fetch = async () => httpErrorResponse();
    const result = await getTwitchAuthHealth({ ...CREDENTIALS, fetchImpl });

    expect(result.status).toBe('DOWN');
    expect(result.error).toContain('400');
  });

  it('returns DOWN when fetch rejects', async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new Error('network unreachable');
    };
    const result = await getTwitchAuthHealth({ ...CREDENTIALS, fetchImpl });

    expect(result.status).toBe('DOWN');
    expect(result.error).toBe('network unreachable');
  });
});
