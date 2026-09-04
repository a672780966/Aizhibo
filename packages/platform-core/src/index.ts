/** Dev Spec 第 43 节 + DAG.md CR-017 裁决的唯一入站契约。所有平台 Adapter
 * （Twitch/YouTube/Bilibili）最终都产出这个形状；Runtime 核心不认识任何
 * 平台特有字段。 */
export interface NormalizedChatMessage {
  platform: string;
  viewerId: string;
  messageId: string;
  text: string;
  receivedAt: number;
}

export type ChatHandler = (message: NormalizedChatMessage) => void;

export * from './interactionAggregator.js';
