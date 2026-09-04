import { describe, expect, it, vi } from 'vitest';
import type { TwitchChatNotification } from './eventSubClient.js';
import {
  createDedupingOnNotification,
  createMessageDeduplicator,
  type MessageDeduplicator,
} from './messageDedup.js';

/** 只构造去重相关字段的 notification 工厂（其余字段本模块不读取）。 */
function notification(messageId: string): TwitchChatNotification {
  return {
    subscriptionType: 'channel.chat.message',
    event: { message: { text: 'hello' } },
    messageId,
    receivedAt: 1_700_000_000_000,
  };
}

describe('createMessageDeduplicator（A07–A09）', () => {
  it('A07: 同一 messageId 第一次 seen() 返回 false，第二次返回 true', () => {
    const deduplicator = createMessageDeduplicator({ maxSize: 3 });

    expect(deduplicator.seen('msg-1')).toBe(false);
    expect(deduplicator.seen('msg-1')).toBe(true);
  });

  it('A08: 超过 maxSize 后最旧的 id 被淘汰，淘汰后再传入视为未见过', () => {
    const deduplicator = createMessageDeduplicator({ maxSize: 3 });

    // 填满 3 个：msg-1 最旧。
    expect(deduplicator.seen('msg-1')).toBe(false);
    expect(deduplicator.seen('msg-2')).toBe(false);
    expect(deduplicator.seen('msg-3')).toBe(false);

    // 第 4 个新 id 挤掉最旧的 msg-1。
    expect(deduplicator.seen('msg-4')).toBe(false);

    // msg-2/msg-3 仍在窗口内 → 重复（返回 true，不改变窗口）；
    // msg-1 已被淘汰，最后才重传它（其重新插入的副作用不影响前面断言）。
    expect(deduplicator.seen('msg-2')).toBe(true);
    expect(deduplicator.seen('msg-3')).toBe(true);
    expect(deduplicator.seen('msg-1')).toBe(false);
  });

  it('A09: 重复 id 不重新插入淘汰顺序末尾（不续命）', () => {
    const deduplicator = createMessageDeduplicator({ maxSize: 3 });
    const duplicate = 'msg-A';

    // 先填满 maxSize=3：A 是队头（最旧），C 是队尾（最新）。
    expect(deduplicator.seen('msg-A')).toBe(false);
    expect(deduplicator.seen('msg-B')).toBe(false);
    expect(deduplicator.seen('msg-C')).toBe(false);

    // 此刻重复 A——A 并不在队尾。若实现错误地“续命”（把 A 重新插到
    // 队尾），A 会逃过下一次淘汰；正确实现不应移动 A。
    expect(deduplicator.seen(duplicate)).toBe(true);

    // 插入第 4 个新 id D，触发淘汰队头最旧的。
    expect(deduplicator.seen('msg-D')).toBe(false);

    // 若 A 曾被续命到队尾，D 淘汰的会是队头 B（B 应已不在窗口，seen → false）；
    // 正确实现 D 淘汰的正是队头 A，B 仍在窗口（seen → true）。
    expect(deduplicator.seen('msg-B')).toBe(true);

    // 现在重传 A：正确实现 A 已被淘汰 → 视为未见过（seen → false），证明 A
    // 被真正淘汰而非靠重复“续命”逃过淘汰。
    expect(deduplicator.seen(duplicate)).toBe(false);
  });

  it('边界: maxSize=0 时任何 id 都视为未见过（不存储）', () => {
    const deduplicator = createMessageDeduplicator({ maxSize: 0 });

    expect(deduplicator.seen('msg-1')).toBe(false);
    expect(deduplicator.seen('msg-1')).toBe(false);
  });
});

describe('createDedupingOnNotification（A10）', () => {
  it('A10a: 同一 messageId 的两个 notification 只有第一个触发 handler', () => {
    const handler = vi.fn();
    const onNotification = createDedupingOnNotification(handler);
    const first = notification('msg-dup');
    const second = notification('msg-dup');

    onNotification(first);
    onNotification(second);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(first);
  });

  it('A10b: 不同 messageId 的 notification 都触发 handler', () => {
    const handler = vi.fn();
    const onNotification = createDedupingOnNotification(handler);

    onNotification(notification('msg-1'));
    onNotification(notification('msg-2'));
    onNotification(notification('msg-3'));

    expect(handler).toHaveBeenCalledTimes(3);
    expect(handler).toHaveBeenCalledWith(notification('msg-1'));
    expect(handler).toHaveBeenCalledWith(notification('msg-2'));
    expect(handler).toHaveBeenCalledWith(notification('msg-3'));
  });

  it('注入自定义 deduplicator：共享去重窗口', () => {
    const handler = vi.fn();
    const deduplicator: MessageDeduplicator = createMessageDeduplicator({
      maxSize: 3,
    });
    const onNotification = createDedupingOnNotification(handler, deduplicator);

    onNotification(notification('msg-x')); // 记录进共享窗口
    expect(deduplicator.seen('msg-x')).toBe(true); // 窗口可见 → 窗口确实共享
  });
});
