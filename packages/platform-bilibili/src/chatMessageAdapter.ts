import type { ChatHandler, NormalizedChatMessage } from '@interactive-story/platform-core';
import type { BilibiliChatMessage } from './liveConnectClient.js';

/**
 * 把 `BilibiliChatMessage`（liveConnectClient 从 op=5 帧里取出的字段快照）转成平台
 * 无关的 `NormalizedChatMessage`（Dev Spec 第 43 节 + DAG.md CR-017 的唯一入站契约）。
 *
 * `receivedAt` **刻意对齐 `normalizeYoutubeChatMessage` 而不是
 * `normalizeTwitchChatMessage`**（见 DECISIONS D3）：Bilibili 弹幕事件真实携带
 * 服务端权威秒级时间 `data.timestamp`，直接 `× 1000` 转毫秒；Twitch 的通知载荷
 * 没有对应服务端时间字段，只能用本地时钟收到时间。两平台字段可用性不同，不套
 * 用同一处置——字段可用性决定处置。
 *
 * 诚实失败：`openId`/`msgId` 为空字符串，或 `text`/`timestamp` 类型不对（客户端
 * 组装时已按类型过滤，这里兜底）即返回 `undefined`（不抛异常、不猜测、不填充
 * 默认值），同既有两个先例的诚实失败处置。
 */
export function normalizeBilibiliChatMessage(
  message: BilibiliChatMessage,
): NormalizedChatMessage | undefined {
  if (message.openId === '') return undefined;
  if (message.msgId === '') return undefined;
  if (typeof message.text !== 'string') return undefined;
  if (typeof message.timestamp !== 'number') return undefined;

  return {
    platform: 'bilibili',
    viewerId: message.openId,
    messageId: message.msgId,
    text: message.text,
    receivedAt: message.timestamp * 1000,
  };
}

/**
 * 把 `ChatHandler` 包装成与 `LiveConnectClientConfig.onMessage` 形状兼容的回调
 * （可直接传给 `createLiveConnectClient`）。内部调用
 * `normalizeBilibiliChatMessage`，转换成功才调用 `handler`；转换失败（返回
 * `undefined`）时静默忽略。不修改 `liveConnectClient.ts`——纯外部包装。
 */
export function createBilibiliChatOnMessage(
  handler: ChatHandler,
): (message: BilibiliChatMessage) => void {
  return (message) => {
    const normalized = normalizeBilibiliChatMessage(message);
    if (normalized !== undefined) {
      handler(normalized);
    }
  };
}
