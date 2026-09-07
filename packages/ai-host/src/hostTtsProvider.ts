// Health 形状与 packages/shared/src/health.ts 的契约逐字段一致（status/lastSuccessAt/
// latencyMs/error）。同 platform-twitch/twitchAuth.ts（DEV-040）与
// hostLLMProvider.ts（DEV-056）先例：本地类型镜像而非引入 workspace 依赖，
// 保持 ai-host 现有模块零 @interactive-story/shared 依赖的既有边界不变。
type Health = {
  status: 'OK' | 'DEGRADED' | 'DOWN';
  lastSuccessAt?: number;
  latencyMs?: number;
  error?: string;
};

// ok:true 分支用 AsyncIterable<Uint8Array> 表达"流式产出音频数据"这一架构特征
// （Dev Spec 第 30 节：AI Host 场景是 LLM Streaming 产生文本，需要 WebSocket
// 类流式协议），不是 DEV-034 TtsProviderPort 的"等一个完整文件路径"形状。
// AsyncIterable 是传输无关的流式抽象，不绑定具体 WebSocket 实现，满足可替换要求。
export type HostTtsResult =
  { ok: true; audioChunks: AsyncIterable<Uint8Array> } | { ok: false; reason: string };

export interface HostTtsProvider {
  synthesizeSpeech(text: string): Promise<HostTtsResult>;
  getHealth(): Promise<Health>;
}

// 唯一落地实现：诚实占位。不实现任何真实 WebSocket 连接/HTTP 客户端/第三方 TTS
// SDK（Dev Spec 第 30 节只给出协议类别层面的判断，未指定厂商/帧格式/鉴权），
// 永远诚实返回"未配置"，不伪造成功结果。
export const noopHostTtsProvider: HostTtsProvider = {
  synthesizeSpeech: async () => ({ ok: false, reason: 'no Host TTS provider configured' }),
  getHealth: async () => ({ status: 'DOWN', error: 'no Host TTS provider configured' }),
};
