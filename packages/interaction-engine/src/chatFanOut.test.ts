import { describe, expect, it } from 'vitest';
import { noopTwitchSendChat } from '@interactive-story/platform-twitch';
import { noopYoutubeSendChat } from '@interactive-story/platform-youtube';
import { unsupportedBilibiliSendChat } from '@interactive-story/platform-bilibili';
import { createMultiPlatformSendChat, type PlatformSendChat } from './chatFanOut.js';

describe('createMultiPlatformSendChat（A11–A13）', () => {
  it('A11: 只对 config 实际提供的平台键并发调用并收集，未提供的平台不出现在结果里', async () => {
    const twitchCalls: string[] = [];
    const twitch: PlatformSendChat = {
      sendChat: async (message) => {
        twitchCalls.push(message);
        return { ok: true, messageId: 'tw-1' };
      },
    };
    const bilibiliCalls: string[] = [];
    const bilibili: PlatformSendChat = {
      sendChat: async (message) => {
        bilibiliCalls.push(message);
        return { ok: true, messageId: 'bl-1' };
      },
    };
    // youtube 未提供：不得被调用、不得出现在结果里。
    const multi = createMultiPlatformSendChat({ twitch, bilibili });

    const result = await multi.sendChat('vote A');

    expect(twitchCalls).toEqual(['vote A']);
    expect(bilibiliCalls).toEqual(['vote A']);
    expect(result).toEqual({
      twitch: { ok: true, messageId: 'tw-1' },
      bilibili: { ok: true, messageId: 'bl-1' },
    });
  });

  it('A11b: 空 config（无任何平台）返回空 Record、不抛异常', async () => {
    const multi = createMultiPlatformSendChat({});
    await expect(multi.sendChat('vote A')).resolves.toEqual({});
  });

  it('A11c: 并发——慢平台不阻塞其他平台的调用与结果收集', async () => {
    let releaseTwitch!: (result: { ok: true; messageId: string }) => void;
    const twitch: PlatformSendChat = {
      sendChat: () =>
        new Promise((resolve) => {
          releaseTwitch = resolve;
        }),
    };
    const bilibiliCalls: string[] = [];
    const bilibili: PlatformSendChat = {
      sendChat: async (message) => {
        bilibiliCalls.push(message);
        return { ok: true, messageId: 'bl-1' };
      },
    };
    const multi = createMultiPlatformSendChat({ twitch, bilibili });

    const pending = multi.sendChat('hi');
    // twitch 仍 pending 时 bilibili 已被并发发起（非顺序 await）。
    expect(bilibiliCalls).toEqual(['hi']);
    releaseTwitch({ ok: true, messageId: 'tw-1' });
    await expect(pending).resolves.toEqual({
      twitch: { ok: true, messageId: 'tw-1' },
      bilibili: { ok: true, messageId: 'bl-1' },
    });
  });

  it('A12: 一个平台成功一个平台失败，两者原始结果原样收集、互不影响、不抛异常', async () => {
    const twitch: PlatformSendChat = {
      sendChat: async () => ({ ok: true, messageId: 'tw-ok' }),
    };
    const youtube: PlatformSendChat = {
      sendChat: async () => ({ ok: false, reason: 'youtube rate limited' }),
    };
    const multi = createMultiPlatformSendChat({ twitch, youtube });

    await expect(multi.sendChat('vote A')).resolves.toEqual({
      twitch: { ok: true, messageId: 'tw-ok' },
      youtube: { ok: false, reason: 'youtube rate limited' },
    });
  });

  it('A13: 三个既有平台的真实 sendChat 常量实例可直接传入（结构类型兼容，零适配）', async () => {
    // 编译期：noopTwitchSendChat（TwitchSendChat）/noopYoutubeSendChat
    // （YoutubeSendChat）/unsupportedBilibiliSendChat（BilibiliSendChat）
    // 直接赋给 PlatformSendChat 配置位即证明三者满足结构类型（A13）。
    const multi = createMultiPlatformSendChat({
      twitch: noopTwitchSendChat,
      youtube: noopYoutubeSendChat,
      bilibili: unsupportedBilibiliSendChat,
    });

    const result = await multi.sendChat('hi');
    expect(Object.keys(result).sort()).toEqual(['bilibili', 'twitch', 'youtube']);
    // 原始结果不做任何重新解释/包装，原样出现在 Record 里。
    expect(result.twitch).toEqual({ ok: false, reason: 'no Twitch send-chat configured' });
    expect(result.youtube).toEqual({ ok: false, reason: 'no YouTube send-chat configured' });
    expect(result.bilibili).toEqual({
      ok: false,
      reason: expect.stringContaining('has no application-level send-message API'),
    });
  });
});
