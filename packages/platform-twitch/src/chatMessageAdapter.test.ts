import { describe, expect, it, vi } from 'vitest';
import type { TwitchChatNotification } from './eventSubClient.js';
import {
  createTwitchChatOnNotification,
  normalizeTwitchChatMessage,
} from './chatMessageAdapter.js';

/** 合法的 channel.chat.message notification 工厂：event 含 chatter_user_id 与嵌套 message.text。 */
function validNotification(
  overrides: Partial<TwitchChatNotification> = {},
): TwitchChatNotification {
  return {
    subscriptionType: 'channel.chat.message',
    event: {
      chatter_user_id: '123',
      message: { text: 'hello world' },
    },
    messageId: 'msg-abc',
    receivedAt: 1_700_000_000_000,
    ...overrides,
  };
}

describe('normalizeTwitchChatMessage（A07–A10）', () => {
  it('A07: 合法 channel.chat.message notification 正确映射为 NormalizedChatMessage', () => {
    const notification = validNotification();
    const result = normalizeTwitchChatMessage(notification);

    expect(result).toBeDefined();
    expect(result).toEqual({
      platform: 'twitch',
      viewerId: '123',
      messageId: 'msg-abc',
      text: 'hello world',
      receivedAt: 1_700_000_000_000,
    });
    // 字段逐一断言，platform 恒为 'twitch'。
    expect(result?.platform).toBe('twitch');
    expect(result?.viewerId).toBe('123');
    expect(result?.messageId).toBe(notification.messageId);
    expect(result?.text).toBe('hello world');
    expect(result?.receivedAt).toBe(notification.receivedAt);
  });

  it('A08: subscriptionType 不是 channel.chat.message → undefined', () => {
    const notification = validNotification({
      subscriptionType: 'channel.follow',
    });
    expect(normalizeTwitchChatMessage(notification)).toBeUndefined();
  });

  it('A09a: chatter_user_id 缺失 → undefined', () => {
    const notification = validNotification({
      event: { message: { text: 'hello' } },
    });
    expect(normalizeTwitchChatMessage(notification)).toBeUndefined();
  });

  it('A09b: chatter_user_id 非字符串 → undefined', () => {
    const notification = validNotification({
      event: { chatter_user_id: 123, message: { text: 'hello' } },
    });
    expect(normalizeTwitchChatMessage(notification)).toBeUndefined();
  });

  it('A10a: message.text 缺失 → undefined', () => {
    const notification = validNotification({
      event: { chatter_user_id: '123', message: {} },
    });
    expect(normalizeTwitchChatMessage(notification)).toBeUndefined();
  });

  it('A10b: message.text 非字符串 → undefined', () => {
    const notification = validNotification({
      event: { chatter_user_id: '123', message: { text: 42 } },
    });
    expect(normalizeTwitchChatMessage(notification)).toBeUndefined();
  });
});

describe('createTwitchChatOnNotification（A11）', () => {
  it('转换成功时 handler 恰调用一次，参数即转换结果', () => {
    const handler = vi.fn();
    const onNotification = createTwitchChatOnNotification(handler);
    const notification = validNotification();

    onNotification(notification);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      platform: 'twitch',
      viewerId: '123',
      messageId: 'msg-abc',
      text: 'hello world',
      receivedAt: 1_700_000_000_000,
    });
  });

  it('转换失败（subscriptionType 不匹配）时不调用 handler', () => {
    const handler = vi.fn();
    const onNotification = createTwitchChatOnNotification(handler);

    onNotification(validNotification({ subscriptionType: 'channel.follow' }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('转换失败（字段缺失）时不调用 handler', () => {
    const handler = vi.fn();
    const onNotification = createTwitchChatOnNotification(handler);

    onNotification(validNotification({ event: { message: { text: 'hello' } } }));

    expect(handler).not.toHaveBeenCalled();
  });
});
