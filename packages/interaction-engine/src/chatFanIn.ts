import {
  createInteractionAggregator,
  type ChatHandler,
  type InteractionAggregator,
} from '@interactive-story/platform-core';
import { createTwitchChatOnNotification } from '@interactive-story/platform-twitch';
import { createYoutubeChatOnMessage } from '@interactive-story/platform-youtube';
import { createBilibiliChatOnMessage } from '@interactive-story/platform-bilibili';

/**
 * DEV-082 多平台聊天消息汇入（fan-in）。
 *
 * 三个平台 Adapter（DEV-040/041/046、DEV-080、DEV-081，均已冻结）各自把
 * `ChatHandler` 包装成本平台 client 回调形状（`createTwitchChatOnNotification`/
 * `createYoutubeChatOnMessage`/`createBilibiliChatOnMessage`），但此前没有任何
 * 代码把三者接到**同一个** `ChatHandler`/聚合器实例上——若分别接入三个平台会
 * 得到三个互不知道彼此存在的聚合状态，与"一个直播间同时开三个平台，观众投票
 * 汇入同一场投票"的产品语义不符。本接口是这层缺失的组合：新建**恰一个**
 * `InteractionAggregator`，同一 `ChatHandler`（调用该实例的 `ingest`）分别喂给
 * 三个既有包装函数。
 */
export interface MultiPlatformChatFanIn {
  /** 三个平台共享的同一个聚合器实例；onVote 注册在这上面。 */
  aggregator: InteractionAggregator;
  /** 直接传给 createEventSubClient({ onNotification: ... })。 */
  twitchOnNotification: ReturnType<typeof createTwitchChatOnNotification>;
  /** 直接传给 createLiveChatPoller({ onMessage: ... })。 */
  youtubeOnMessage: ReturnType<typeof createYoutubeChatOnMessage>;
  /** 直接传给 createLiveConnectClient({ onMessage: ... })。 */
  bilibiliOnMessage: ReturnType<typeof createBilibiliChatOnMessage>;
}

export function createMultiPlatformChatFanIn(): MultiPlatformChatFanIn {
  const aggregator = createInteractionAggregator();
  const handler: ChatHandler = (message) => aggregator.ingest(message);
  return {
    aggregator,
    twitchOnNotification: createTwitchChatOnNotification(handler),
    youtubeOnMessage: createYoutubeChatOnMessage(handler),
    bilibiliOnMessage: createBilibiliChatOnMessage(handler),
  };
}
