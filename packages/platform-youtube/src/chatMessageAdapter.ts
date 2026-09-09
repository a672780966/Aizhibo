import type { ChatHandler, NormalizedChatMessage } from '@interactive-story/platform-core';
import type { YoutubeChatMessage } from './liveChatPoller.js';

/**
 * 把本节点冻结的 `YoutubeChatMessage`（liveChatPoller 过滤后的字段快照）转成平台
 * 无关的 `NormalizedChatMessage`（Dev Spec 第 43 节 + DAG.md CR-017 的唯一入站契约）。
 *
 * `receivedAt` **刻意不同于 `normalizeTwitchChatMessage`**（见 DECISIONS）：YouTube
 * 的 liveChatMessages 资源真实携带 `snippet.publishedAt` 服务端权威时间，直接使用
 * `Date.parse(message.publishedAt)`；Twitch 的通知载荷没有对应服务端时间字段，只能
 * 用本地时钟收到时间。本地轮询到达时间因 `pollingIntervalMillis` 存在系统性滞后，
 * 不是消息真实发生时间——两平台字段可用性不同，不套用同一处置。
 *
 * 诚实失败：`Date.parse` 失败（`NaN`，publishedAt 非法/缺失）即返回 `undefined`
 * （不抛异常、不猜测、不填充默认值），同 Twitch 字段缺失时的先例。
 */
export function normalizeYoutubeChatMessage(
  message: YoutubeChatMessage,
): NormalizedChatMessage | undefined {
  const receivedAt = Date.parse(message.publishedAt);
  if (Number.isNaN(receivedAt)) return undefined;

  return {
    platform: 'youtube',
    viewerId: message.authorChannelId,
    messageId: message.messageId,
    text: message.text,
    receivedAt,
  };
}

/**
 * 把 `ChatHandler` 包装成与 `LiveChatPollerConfig.onMessage` 形状兼容的回调（可直接
 * 传给 `createLiveChatPoller`）。内部调用 `normalizeYoutubeChatMessage`，转换成功才
 * 调用 `handler`；转换失败（返回 `undefined`）时静默忽略。不修改
 * `liveChatPoller.ts`——纯外部包装。
 */
export function createYoutubeChatOnMessage(
  handler: ChatHandler,
): (message: YoutubeChatMessage) => void {
  return (message) => {
    const normalized = normalizeYoutubeChatMessage(message);
    if (normalized !== undefined) {
      handler(normalized);
    }
  };
}
