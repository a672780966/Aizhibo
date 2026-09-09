import { describe, expect, it, vi } from 'vitest';
import { createYoutubeChatOnMessage, normalizeYoutubeChatMessage } from './chatMessageAdapter.js';
import type { YoutubeChatMessage } from './liveChatPoller.js';

function message(overrides: Partial<YoutubeChatMessage> = {}): YoutubeChatMessage {
  return {
    messageId: 'm-1',
    authorChannelId: 'UC-abc',
    text: 'hello world',
    publishedAt: '2026-09-09T10:00:00.000Z',
    ...overrides,
  };
}

describe('normalizeYoutubeChatMessage', () => {
  it('maps every field to the platform-agnostic contract with receivedAt = Date.parse(publishedAt) (A15/A16)', () => {
    const normalized = normalizeYoutubeChatMessage(message());

    expect(normalized).toEqual({
      platform: 'youtube',
      viewerId: 'UC-abc',
      messageId: 'm-1',
      text: 'hello world',
      receivedAt: Date.parse('2026-09-09T10:00:00.000Z'),
    });
  });

  it('uses the server-side publishedAt, not a local receive time, for receivedAt', () => {
    // publishedAt 是 5 秒前的服务端时间：receivedAt 必须精确等于它（Date.parse），
    // 而非测试运行时的本地时钟（本地轮询到达时间会因 pollingIntervalMillis
    // 系统性滞后，见 DECISIONS）。
    const publishedAt = new Date(Date.now() - 5000).toISOString();
    const normalized = normalizeYoutubeChatMessage(message({ publishedAt }));

    expect(normalized?.receivedAt).toBe(Date.parse(publishedAt));
  });

  it('returns undefined when publishedAt does not parse (honest failure)', () => {
    expect(normalizeYoutubeChatMessage(message({ publishedAt: 'not-a-date' }))).toBeUndefined();
  });
});

describe('createYoutubeChatOnMessage', () => {
  it('calls the handler only when normalization succeeds', () => {
    const handler = vi.fn();
    const onMessage = createYoutubeChatOnMessage(handler);

    onMessage(message());
    onMessage(message({ publishedAt: 'garbage' }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      platform: 'youtube',
      viewerId: 'UC-abc',
      messageId: 'm-1',
      text: 'hello world',
      receivedAt: Date.parse('2026-09-09T10:00:00.000Z'),
    });
  });
});
