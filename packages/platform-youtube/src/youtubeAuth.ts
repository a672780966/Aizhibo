export interface YoutubeTokenResult {
  accessToken: string;
  expiresInSeconds: number;
}

export type YoutubeAuthResult =
  { ok: true; token: YoutubeTokenResult } | { ok: false; reason: string };

export interface YoutubeAuthPort {
  getAccessToken(): Promise<YoutubeAuthResult>;
}

export const noopYoutubeAuthPort: YoutubeAuthPort = {
  getAccessToken: async () => ({
    ok: false,
    reason: 'no YouTube OAuth credentials configured',
  }),
};

export interface YoutubeAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

const DEFAULT_BASE_URL = 'https://oauth2.googleapis.com';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createYoutubeAuthProvider(config: YoutubeAuthProviderConfig): YoutubeAuthPort {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const fetchImpl = config.fetchImpl ?? fetch;

  return {
    async getAccessToken(): Promise<YoutubeAuthResult> {
      try {
        // 每次调用都构造全新 form；refresh_token 换取的 grant 请求本身无状态，
        // 不持久化/不缓存任何结果（同 twitchAuth.ts D3 先例：缓存/过期调度是
        // 未来消费方职责）。
        const form = new URLSearchParams();
        form.append('grant_type', 'refresh_token');
        form.append('refresh_token', config.refreshToken);
        form.append('client_id', config.clientId);
        form.append('client_secret', config.clientSecret);
        const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/token`, {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
          },
          body: form,
        });

        if (!response.ok) {
          return {
            ok: false,
            reason: `YouTube token request failed: ${response.status} ${response.statusText}`,
          };
        }

        const body: unknown = await response.json().catch(() => undefined);
        // Google 的 refresh_token 响应不保证返回 scope 字段（与 Twitch 不同），
        // 守卫只校验 access_token/expires_in 两个真实必带字段。
        if (!isTokenResponseBody(body)) {
          return { ok: false, reason: 'YouTube token response has an unexpected shape' };
        }

        return {
          ok: true,
          token: {
            accessToken: body.access_token,
            expiresInSeconds: body.expires_in,
          },
        };
      } catch (error) {
        return { ok: false, reason: errorMessage(error) };
      }
    },
  };
}

function isTokenResponseBody(value: unknown): value is {
  access_token: string;
  expires_in: number;
} {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.access_token === 'string' && typeof record.expires_in === 'number';
}

export function createOptionalYoutubeAuthProvider(env: NodeJS.ProcessEnv): YoutubeAuthPort {
  const clientId = env.YOUTUBE_CLIENT_ID;
  const clientSecret = env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = env.YOUTUBE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return noopYoutubeAuthPort;
  return createYoutubeAuthProvider({ clientId, clientSecret, refreshToken });
}
