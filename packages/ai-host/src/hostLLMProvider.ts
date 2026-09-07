// Health 形状与 packages/shared/src/health.ts 的契约逐字段一致（status/lastSuccessAt/
// latencyMs/error）。同 platform-twitch/twitchAuth.ts（DEV-040）先例：本地类型镜像
// 而非引入 workspace 依赖，保持 ai-host 现有五个模块
// （egressGate/commentPipeline/hostPersona/hostMood/hostScheduler）
// 零 @interactive-story/shared 依赖的既有边界不变。
type Health = {
  status: 'OK' | 'DEGRADED' | 'DOWN';
  lastSuccessAt?: number;
  latencyMs?: number;
  error?: string;
};

export type HostLLMResult = { ok: true; text: string } | { ok: false; reason: string };

export interface HostLLMProvider {
  generateReply(prompt: string): Promise<HostLLMResult>;
  getHealth(): Promise<Health>;
}

export const noopHostLLMProvider: HostLLMProvider = {
  generateReply: async () => ({ ok: false, reason: 'no Host LLM provider configured' }),
  getHealth: async () => ({ status: 'DOWN', error: 'no Host LLM provider configured' }),
};
