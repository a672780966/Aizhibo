// Health 形状与 packages/ai-host/src/hostLLMProvider.ts 的本地 Health 逐字段一致
// （status/lastSuccessAt/latencyMs/error）。同 hostLLMProvider.ts 自身镜像
// packages/shared 契约的先例：本地类型镜像而非引入 workspace 依赖——Dev Spec
// 未给出任何具体 LLM 网络协议（同 hostLLMProvider 的处境），本节点只建接口 +
// 诚实占位，不建真实网络客户端、不发明协议。
type Health = {
  status: 'OK' | 'DEGRADED' | 'DOWN';
  lastSuccessAt?: number;
  latencyMs?: number;
  error?: string;
};

export type ChapterDraftResult = { ok: true; draft: string } | { ok: false; reason: string };

export interface AiChapterGeneratorPort {
  generateDraft(requestText: string): Promise<ChapterDraftResult>;
  getHealth(): Promise<Health>;
}

export const noopAiChapterGeneratorPort: AiChapterGeneratorPort = {
  generateDraft: async () => ({
    ok: false,
    reason: 'no chapter generator provider configured',
  }),
  getHealth: async () => ({
    status: 'DOWN',
    error: 'no chapter generator provider configured',
  }),
};
