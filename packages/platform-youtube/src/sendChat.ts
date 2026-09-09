import type { YoutubeAuthPort } from './youtubeAuth.js';

export type YoutubeSendChatResult = { ok: true; messageId: string } | { ok: false; reason: string };

export interface YoutubeSendChatConfig {
  /** 复用本节点 youtubeAuth 冻结接口，唯一的凭据来源。 */
  authPort: YoutubeAuthPort;
  liveChatId: string;
  /** 测试注入；默认 https://www.googleapis.com/youtube/v3。 */
  apiBaseUrl?: string;
  /** 测试注入；默认全局 fetch（Node ≥22 原生）。 */
  fetchImpl?: typeof fetch;
}

export interface YoutubeSendChat {
  sendChat(message: string): Promise<YoutubeSendChatResult>;
}

export const noopYoutubeSendChat: YoutubeSendChat = {
  sendChat: async () => ({ ok: false, reason: 'no YouTube send-chat configured' }),
};

const DEFAULT_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createYoutubeSendChat(config: YoutubeSendChatConfig): YoutubeSendChat {
  const apiBaseUrl = config.apiBaseUrl ?? DEFAULT_API_BASE_URL;
  const fetchImpl = config.fetchImpl ?? fetch;

  return {
    async sendChat(message: string): Promise<YoutubeSendChatResult> {
      try {
        const tokenResult = await config.authPort.getAccessToken();
        if (!tokenResult.ok) {
          return { ok: false, reason: tokenResult.reason };
        }

        // liveChatMessages.insert：POST {apiBaseUrl}/liveChat/messages?part=snippet，
        // body 为真实资源形状（liveChatId/type/textMessageDetails.messageText）。
        const response = await fetchImpl(
          `${apiBaseUrl.replace(/\/$/, '')}/liveChat/messages?part=snippet`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${tokenResult.token.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              snippet: {
                liveChatId: config.liveChatId,
                type: 'textMessageEvent',
                textMessageDetails: { messageText: message },
              },
            }),
          },
        );

        if (!response.ok) {
          return {
            ok: false,
            reason: `YouTube send chat request failed: ${response.status} ${response.statusText}`,
          };
        }

        const body: unknown = await response.json().catch(() => undefined);
        if (!isSendChatResponseBody(body)) {
          return { ok: false, reason: 'YouTube send chat response has an unexpected shape' };
        }

        return { ok: true, messageId: body.id };
      } catch (error) {
        return { ok: false, reason: errorMessage(error) };
      }
    },
  };
}

// liveChatMessages.insert 成功响应体真实字段：顶层 id（新消息资源 id）。
function isSendChatResponseBody(value: unknown): value is { id: string } {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string';
}
