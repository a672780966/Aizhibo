import { describe, expect, it } from 'vitest';
import type { ChatHandler, NormalizedChatMessage } from './index.js';

describe('platform-core 类型契约', () => {
  it('NormalizedChatMessage 五个字段齐全且类型正确', () => {
    const message: NormalizedChatMessage = {
      platform: 'twitch',
      viewerId: '123',
      messageId: 'msg-1',
      text: 'hello',
      receivedAt: 1_700_000_000_000,
    };
    expect(typeof message.platform).toBe('string');
    expect(typeof message.viewerId).toBe('string');
    expect(typeof message.messageId).toBe('string');
    expect(typeof message.text).toBe('string');
    expect(typeof message.receivedAt).toBe('number');
  });

  it('ChatHandler 可接收 NormalizedChatMessage', () => {
    const handler: ChatHandler = (message) => {
      expect(message.text).toBe('hello');
    };
    const message: NormalizedChatMessage = {
      platform: 'twitch',
      viewerId: '123',
      messageId: 'msg-1',
      text: 'hello',
      receivedAt: 1_700_000_000_000,
    };
    handler(message);
  });
});
