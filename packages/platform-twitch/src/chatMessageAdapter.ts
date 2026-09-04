import type { TwitchChatNotification } from './eventSubClient.js';
import type { ChatHandler, NormalizedChatMessage } from '@interactive-story/platform-core';

/**
 * 把 DEV-041 冻结的 `TwitchChatNotification` 转成平台无关的
 * `NormalizedChatMessage`（Dev Spec 第 43 节 + DAG.md CR-017 的唯一入站契约）。
 *
 * 诚实失败：本节点只认 `channel.chat.message` 一种订阅类型，其余类型或
 * `event` 中 `chatter_user_id`/`message.text` 任一缺失/类型不对均返回
 * `undefined`（不抛异常、不猜测、不填充默认值）。去重是 DEV-043 职责，
 * 本函数不做。
 */
export function normalizeTwitchChatMessage(
  notification: TwitchChatNotification,
): NormalizedChatMessage | undefined {
  if (notification.subscriptionType !== 'channel.chat.message') {
    return undefined;
  }

  const event = notification.event;
  if (typeof event !== 'object' || event === null) {
    return undefined;
  }

  const record = event as Record<string, unknown>;
  const { chatter_user_id: chatterUserId, message: rawMessage } = record;

  if (typeof chatterUserId !== 'string') {
    return undefined;
  }

  if (typeof rawMessage !== 'object' || rawMessage === null) {
    return undefined;
  }

  const { text } = rawMessage as Record<string, unknown>;
  if (typeof text !== 'string') {
    return undefined;
  }

  return {
    platform: 'twitch',
    viewerId: chatterUserId,
    messageId: notification.messageId,
    text,
    receivedAt: notification.receivedAt,
  };
}

/**
 * 把 `ChatHandler` 包装成与 `EventSubClientConfig.onNotification` 形状兼容的
 * 回调（可直接传给 `createEventSubClient`）。内部调用
 * `normalizeTwitchChatMessage`，转换成功才调用 `handler`；转换失败
 * （返回 `undefined`）时静默忽略。不修改 `eventSubClient.ts`——纯外部包装。
 */
export function createTwitchChatOnNotification(
  handler: ChatHandler,
): (notification: TwitchChatNotification) => void {
  return (notification) => {
    const message = normalizeTwitchChatMessage(notification);
    if (message !== undefined) {
      handler(message);
    }
  };
}
