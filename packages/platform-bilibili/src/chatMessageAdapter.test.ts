import { describe, expect, it, vi } from 'vitest';
import type { NormalizedChatMessage } from '@interactive-story/platform-core';
import { createBilibiliChatOnMessage, normalizeBilibiliChatMessage } from './chatMessageAdapter.js';
import type { BilibiliChatMessage } from './liveConnectClient.js';

const seconds = 1_700_000_000; // 真实服务端秒级时间戳

function message(overrides: Partial<BilibiliChatMessage> = {}): BilibiliChatMessage {
  return { msgId: 'm-1', openId: 'open-1', text: 'hello', timestamp: seconds, ...overrides };
}

describe('normalizeBilibiliChatMessage（A17）', () => {
  it('maps to a NormalizedChatMessage with receivedAt = server timestamp × 1000', () => {
    // Bilibili 弹幕携带服务端权威时间戳（秒级），×1000 转毫秒——与
    // normalizeYoutubeChatMessage 的 publishedAt 先例一致、刻意不同于 Twitch 的
    // 本地时钟处置（见 DECISIONS D3）。
    const normalized = normalizeBilibiliChatMessage(message());
    expect(normalized).toEqual({
      platform: 'bilibili',
      viewerId: 'open-1',
      messageId: 'm-1',
      text: 'hello',
      receivedAt: seconds * 1000,
    } satisfies NormalizedChatMessage);
    expect(normalized?.receivedAt).toBe(1_700_000_000_000);
  });

  it.each([
    ['empty openId', message({ openId: '' })],
    ['empty msgId', message({ msgId: '' })],
    ['non-string text', { ...message(), text: 42 as unknown as string }],
    ['non-number timestamp', { ...message(), timestamp: '1700000000' as unknown as number }],
  ])('returns undefined for %s (honest failure, no guessing)', (_name, input) => {
    expect(normalizeBilibiliChatMessage(input)).toBeUndefined();
  });
});

describe('createBilibiliChatOnMessage', () => {
  it('forwards only successfully normalized messages to the handler', () => {
    const handler = vi.fn();
    const onMessage = createBilibiliChatOnMessage(handler);

    onMessage(message());
    onMessage(message({ openId: '' })); // 转换失败 → 静默忽略
    onMessage(message({ text: 'second' }));

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenNthCalledWith(1, {
      platform: 'bilibili',
      viewerId: 'open-1',
      messageId: 'm-1',
      text: 'hello',
      receivedAt: seconds * 1000,
    });
    expect(handler).toHaveBeenNthCalledWith(2, expect.objectContaining({ text: 'second' }));
  });
});
