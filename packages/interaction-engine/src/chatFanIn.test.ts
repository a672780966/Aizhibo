import { describe, expect, it } from 'vitest';
import type { Vote } from '@interactive-story/platform-core';
import { createMultiPlatformChatFanIn } from './chatFanIn.js';

/** 各平台 client 原始形状的消息工厂：内容为 Task Package A09/A10 指定的
 * 投票文本（A/B/C/D）或非投票文本。原始形状字段逐一对应三个平台的
 * TwitchChatNotification/YoutubeChatMessage/BilibiliChatMessage 冻结形状，
 * 直接作为回调实参由结构类型检查保证兼容——本节点不 import 三个平台
 * client 内部实现文件（A15）。 */
function twitchRaw(
  text: string,
  viewerId = 'tw-viewer',
): {
  subscriptionType: string;
  event: unknown;
  messageId: string;
  receivedAt: number;
} {
  return {
    subscriptionType: 'channel.chat.message',
    event: { chatter_user_id: viewerId, message: { text } },
    messageId: `tw-${viewerId}-${text}`,
    receivedAt: 1_700_000_000_000,
  };
}

function youtubeRaw(
  text: string,
  viewerId = 'yt-viewer',
): {
  messageId: string;
  authorChannelId: string;
  text: string;
  publishedAt: string;
} {
  return {
    messageId: `yt-${viewerId}-${text}`,
    authorChannelId: viewerId,
    text,
    publishedAt: '2026-09-09T10:00:00.000Z',
  };
}

function bilibiliRaw(
  text: string,
  viewerId = 'bl-viewer',
): {
  msgId: string;
  openId: string;
  text: string;
  timestamp: number;
} {
  return {
    msgId: `bl-${viewerId}-${text}`,
    openId: viewerId,
    text,
    timestamp: 1_700_000_000,
  };
}

describe('createMultiPlatformChatFanIn（A08–A10）', () => {
  it('A09: 三个平台的原始消息汇入同一个聚合器，一次注册的 onVote 收到全部投票', () => {
    const fanIn = createMultiPlatformChatFanIn();
    const votes: Vote[] = [];
    fanIn.aggregator.onVote((vote) => votes.push(vote));

    fanIn.twitchOnNotification(twitchRaw('A', 'tw-1'));
    fanIn.youtubeOnMessage(youtubeRaw('B', 'yt-2'));
    fanIn.bilibiliOnMessage(bilibiliRaw('C', 'bl-3'));
    // 同一平台多条消息同样汇入同一聚合器。
    fanIn.twitchOnNotification(twitchRaw('D', 'tw-1'));

    expect(votes).toEqual([
      { viewerId: 'tw-1', choiceId: 'A' },
      { viewerId: 'yt-2', choiceId: 'B' },
      { viewerId: 'bl-3', choiceId: 'C' },
      { viewerId: 'tw-1', choiceId: 'D' },
    ]);
  });

  it('A10: 非投票文本经任一平台回调喂入不触发 onVote（复用 DEV-044 解析语义）', () => {
    const fanIn = createMultiPlatformChatFanIn();
    const votes: Vote[] = [];
    fanIn.aggregator.onVote((vote) => votes.push(vote));

    fanIn.twitchOnNotification(twitchRaw('hello'));
    fanIn.youtubeOnMessage(youtubeRaw('AB'));
    fanIn.bilibiliOnMessage(bilibiliRaw(''));

    expect(votes).toEqual([]);
  });

  it('A08: 每次调用恰创建独立聚合器；两个实例互不串扰', () => {
    const first = createMultiPlatformChatFanIn();
    const second = createMultiPlatformChatFanIn();
    const votes: Vote[] = [];
    first.aggregator.onVote((vote) => votes.push(vote));

    // 喂给 second 的投票不会到达注册在 first.aggregator 上的 handler。
    second.twitchOnNotification(twitchRaw('A', 'tw-other'));
    first.bilibiliOnMessage(bilibiliRaw('C', 'bl-own'));

    expect(votes).toEqual([{ viewerId: 'bl-own', choiceId: 'C' }]);
  });

  it('A08b: 未注册 onVote handler 时消息静默忽略、不抛异常', () => {
    const fanIn = createMultiPlatformChatFanIn();
    expect(() => fanIn.twitchOnNotification(twitchRaw('A'))).not.toThrow();
    expect(() => fanIn.youtubeOnMessage(youtubeRaw('B'))).not.toThrow();
    expect(() => fanIn.bilibiliOnMessage(bilibiliRaw('C'))).not.toThrow();
  });
});
