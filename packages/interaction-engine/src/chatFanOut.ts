/**
 * 单一平台发送通道的结构类型。platform-twitch/platform-youtube/
 * platform-bilibili 三包冻结的 `TwitchSendChat`/`YoutubeSendChat`/
 * `BilibiliSendChat` 的 `sendChat(message): Promise<...>` 形状完全一致
 * （三包 `sendChat.ts` 源码逐一核实），天然满足本结构——调用方直接传入
 * `createTwitchSendChat(...)`/`createYoutubeSendChat(...)` 的返回值或
 * `noopTwitchSendChat`/`noopYoutubeSendChat`/`unsupportedBilibiliSendChat`
 * 等既有实例即可，本节点不重新定义/不重复实现任何平台的发送逻辑。
 */
export interface PlatformSendChat {
  sendChat(message: string): Promise<PlatformSendChatResult>;
}

export type PlatformSendChatResult =
  { ok: true; messageId: string } | { ok: false; reason: string };

/** 按平台键收集的发送结果；键恰为调用方 config 中实际提供的平台键集合。 */
export type MultiPlatformSendChatResult = Record<string, PlatformSendChatResult>;

export interface MultiPlatformSendChatConfig {
  twitch?: PlatformSendChat;
  youtube?: PlatformSendChat;
  bilibili?: PlatformSendChat;
}

export interface MultiPlatformSendChat {
  sendChat(message: string): Promise<MultiPlatformSendChatResult>;
}

type PlatformKey = 'twitch' | 'youtube' | 'bilibili';

const PLATFORM_KEYS: readonly PlatformKey[] = ['twitch', 'youtube', 'bilibili'];

/**
 * DEV-082 多平台发送广播（fan-out）：`sendChat(message)` 只对 config 中实际
 * 传入的平台键（任意子集，缺失键直接不出现在结果里）**并发**调用各自的
 * `sendChat(message)`（`Promise.all`，互不阻塞、互不因某平台失败而影响其他
 * 平台），把每个平台的原始结果（不做任何重新解释/包装）按平台键收集进返回
 * 的 Record。三个平台冻结的 sendChat 实现均以 `{ok:true}|{ok:false}` 结果
 * 对象兑现、从不 reject——本层因此不吞异常也不改写结果。
 */
export function createMultiPlatformSendChat(
  config: MultiPlatformSendChatConfig,
): MultiPlatformSendChat {
  return {
    async sendChat(message: string): Promise<MultiPlatformSendChatResult> {
      const provided: Array<[PlatformKey, PlatformSendChat]> = [];
      for (const key of PLATFORM_KEYS) {
        const platform = config[key];
        if (platform !== undefined) {
          provided.push([key, platform]);
        }
      }
      const settled = await Promise.all(
        provided.map(async ([key, platform]) => [key, await platform.sendChat(message)] as const),
      );
      const collected: MultiPlatformSendChatResult = {};
      for (const [key, result] of settled) {
        collected[key] = result;
      }
      return collected;
    },
  };
}
