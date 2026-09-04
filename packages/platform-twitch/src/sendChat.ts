import type { TwitchAuthPort } from './twitchAuth.js';

export type TwitchSendChatResult = { ok: true; messageId: string } | { ok: false; reason: string };

export interface TwitchSendChatConfig {
  /** 复用 DEV-040 冻结接口，本节点唯一的凭据来源。 */
  authPort: TwitchAuthPort;
  clientId: string;
  /** Helix body 的 broadcaster_id。 */
  broadcasterUserId: string;
  /** Helix body 的 sender_id（bot 自己的 user id）。 */
  userId: string;
  /** 测试注入；默认 https://api.twitch.tv。 */
  helixBaseUrl?: string;
  /** 测试注入；默认全局 fetch（Node ≥22 原生）。 */
  fetchImpl?: typeof fetch;
}

export interface TwitchSendChat {
  sendChat(message: string): Promise<TwitchSendChatResult>;
}

export const noopTwitchSendChat: TwitchSendChat = {
  sendChat: async () => ({ ok: false, reason: 'no Twitch send-chat configured' }),
};

const DEFAULT_HELIX_BASE_URL = 'https://api.twitch.tv';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createTwitchSendChat(config: TwitchSendChatConfig): TwitchSendChat {
  const baseUrl = config.helixBaseUrl ?? DEFAULT_HELIX_BASE_URL;
  const fetchImpl = config.fetchImpl ?? fetch;

  return {
    async sendChat(message: string): Promise<TwitchSendChatResult> {
      try {
        const tokenResult = await config.authPort.getAccessToken();
        if (!tokenResult.ok) {
          return { ok: false, reason: tokenResult.reason };
        }

        const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/helix/chat/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokenResult.token.accessToken}`,
            'Client-Id': config.clientId,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            broadcaster_id: config.broadcasterUserId,
            sender_id: config.userId,
            message,
          }),
        });

        if (!response.ok) {
          return {
            ok: false,
            reason: `Twitch send chat request failed: ${response.status} ${response.statusText}`,
          };
        }

        const body: unknown = await response.json().catch(() => undefined);
        if (!isSendChatResponseBody(body)) {
          return { ok: false, reason: 'Twitch send chat response has an unexpected shape' };
        }
        // 类型守卫已保证 data 非空且首元素形状正确；noUncheckedIndexedAccess 下需一次断言。
        const first = body.data[0]!;

        if (!first.is_sent) {
          return {
            ok: false,
            reason:
              typeof first.drop_reason?.message === 'string'
                ? first.drop_reason.message
                : 'message was dropped by Twitch',
          };
        }

        return { ok: true, messageId: first.message_id };
      } catch (error) {
        return { ok: false, reason: errorMessage(error) };
      }
    },
  };
}

function isSendChatResponseBody(value: unknown): value is {
  data: Array<{
    message_id: string;
    is_sent: boolean;
    drop_reason?: { code?: unknown; message?: unknown };
  }>;
} {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.data) || record.data.length < 1) return false;
  const entry = record.data[0] as Record<string, unknown>;
  return typeof entry.message_id === 'string' && typeof entry.is_sent === 'boolean';
}
