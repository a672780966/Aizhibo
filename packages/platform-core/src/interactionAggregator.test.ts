import { describe, expect, it, vi } from 'vitest';
import type { NormalizedChatMessage } from './index.js';
import { createInteractionAggregator, type Vote } from './interactionAggregator.js';

/** 构造一条最小 NormalizedChatMessage 的工厂，test 可覆盖 text 等字段。 */
function message(text: string, viewerId = 'viewer-1'): NormalizedChatMessage {
  return {
    platform: 'twitch',
    viewerId,
    messageId: 'msg-1',
    text,
    receivedAt: 1_700_000_000_000,
  };
}

describe('createInteractionAggregator', () => {
  it('A07: A/B/C/D 大小写 + 前后空白容错，各至少一例触发 handler 且 choiceId 为大写', () => {
    const aggregator = createInteractionAggregator();
    const votes: Vote[] = [];
    aggregator.onVote((vote) => votes.push(vote));

    // 小写 'a'、带前后空白 ' B '、纯大写 'C'、大小写混合 'd' 之外各形态。
    aggregator.ingest(message('a'));
    aggregator.ingest(message(' B '));
    aggregator.ingest(message('C'));
    aggregator.ingest(message('  d  '));

    expect(votes.map((v) => v.choiceId)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('A08: 非法/无关文本不触发 handler', () => {
    const aggregator = createInteractionAggregator();
    const handler = vi.fn();
    aggregator.onVote(handler);

    aggregator.ingest(message('hello'));
    aggregator.ingest(message('AB'));
    aggregator.ingest(message(''));
    aggregator.ingest(message('   '));
    aggregator.ingest(message('A B'));

    expect(handler).not.toHaveBeenCalled();
  });

  it('A09: 未注册 handler 时 ingest 任意消息不抛异常', () => {
    const aggregator = createInteractionAggregator();

    expect(() => {
      aggregator.ingest(message('A'));
      aggregator.ingest(message('hello'));
      aggregator.ingest(message(''));
    }).not.toThrow();
  });

  it('A10: 二次 onVote 注册覆盖第一个 handler', () => {
    const aggregator = createInteractionAggregator();
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    aggregator.onVote(handler1);
    aggregator.onVote(handler2);

    aggregator.ingest(message('A'));

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledWith({ viewerId: 'viewer-1', choiceId: 'A' });
  });

  it('A11: viewerId 等字段从 NormalizedChatMessage 正确透传到 Vote', () => {
    const aggregator = createInteractionAggregator();
    const votes: Vote[] = [];
    aggregator.onVote((vote) => votes.push(vote));

    aggregator.ingest(message('b', 'viewer-42'));

    expect(votes).toEqual([{ viewerId: 'viewer-42', choiceId: 'B' }]);
  });
});
