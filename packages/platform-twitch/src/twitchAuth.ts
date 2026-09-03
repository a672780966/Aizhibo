// Health 形状与 packages/shared/src/health.ts 的契约逐字段一致（status/lastSuccessAt/
// latencyMs/error）。与 DEV-035 audio-engine 先例相同，用本地类型镜像而非引入
// workspace 依赖，保持 platform-twitch 与 audio-engine 一样零依赖（见 DECISIONS）。
type Health = {
  status: 'OK' | 'DEGRADED' | 'DOWN';
  lastSuccessAt?: number;
  latencyMs?: number;
  error?: string;
};

export interface TwitchTokenResult {
  accessToken: string;
  expiresInSeconds: number;
  scopes: string[];
}

export type TwitchAuthResult =
  { ok: true; token: TwitchTokenResult } | { ok: false; reason: string };

export interface TwitchAuthPort {
  getAccessToken(): Promise<TwitchAuthResult>;
}

export const noopTwitchAuthPort: TwitchAuthPort = {
  getAccessToken: async () => ({ ok: false, reason: 'no Twitch OAuth credentials configured' }),
};

export interface TwitchAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

const DEFAULT_BASE_URL = 'https://id.twitch.tv';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function endpoint(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

function tokenUrlEncodedForm(): URLSearchParams {
  // 每次调用都构造全新 form；服务端把 refresh_token 视为一次性凭证，重复使用同一
  // 实例毫无意义。
  return new URLSearchParams();
}

export function createTwitchAuthProvider(config: TwitchAuthProviderConfig): TwitchAuthPort {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const fetchImpl = config.fetchImpl ?? fetch;

  return {
    async getAccessToken(): Promise<TwitchAuthResult> {
      try {
        const form = tokenUrlEncodedForm();
        form.append('grant_type', 'refresh_token');
        form.append('refresh_token', config.refreshToken);
        form.append('client_id', config.clientId);
        form.append('client_secret', config.clientSecret);
        const response = await fetchImpl(endpoint(baseUrl, '/oauth2/token'), {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
          },
          body: form,
        });

        if (!response.ok) {
          return {
            ok: false,
            reason: `Twitch token request failed: ${response.status} ${response.statusText}`,
          };
        }

        const body: unknown = await response.json().catch(() => undefined);
        if (!isTokenResponseBody(body)) {
          return { ok: false, reason: 'Twitch token response has an unexpected shape' };
        }

        return {
          ok: true,
          token: {
            accessToken: body.access_token,
            expiresInSeconds: body.expires_in,
            scopes: body.scope,
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
  scope: string[];
} {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.access_token === 'string' &&
    typeof record.expires_in === 'number' &&
    Array.isArray(record.scope) &&
    record.scope.every((entry) => typeof entry === 'string')
  );
}

export function createOptionalTwitchAuthProvider(env: NodeJS.ProcessEnv): TwitchAuthPort {
  const clientId = env.TWITCH_CLIENT_ID;
  const clientSecret = env.TWITCH_CLIENT_SECRET;
  const refreshToken = env.TWITCH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return noopTwitchAuthPort;
  return createTwitchAuthProvider({ clientId, clientSecret, refreshToken });
}

export async function getTwitchAuthHealth(config: TwitchAuthProviderConfig): Promise<Health> {
  const started = Date.now();
  const result = await createTwitchAuthProvider(config).getAccessToken();
  const latencyMs = Date.now() - started;
  if (result.ok) {
    return { status: 'OK', lastSuccessAt: Date.now(), latencyMs };
  }
  return { status: 'DOWN', latencyMs, error: result.reason };
}

export async function getOptionalTwitchAuthHealth(env: NodeJS.ProcessEnv): Promise<Health> {
  const clientId = env.TWITCH_CLIENT_ID;
  const clientSecret = env.TWITCH_CLIENT_SECRET;
  const refreshToken = env.TWITCH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    return { status: 'DOWN', error: 'no Twitch OAuth credentials configured' };
  }
  return getTwitchAuthHealth({ clientId, clientSecret, refreshToken });
}
