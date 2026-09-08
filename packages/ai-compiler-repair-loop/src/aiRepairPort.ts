// Health 形状与 packages/ai-host/src/hostLLMProvider.ts 的本地 Health 逐字段一致
// （status/lastSuccessAt/latencyMs/error），本地镜像而非引入 workspace 依赖——
// 同 aiChapterGeneratorPort.ts / hostLLMProvider.ts 自身镜像 shared 契约的先例：
// Dev Spec 未给出任何具体 AI Repair 网络协议（与 DEV-071 面对 LLM 协议时的处境
// 完全相同），本节点只建接口 + 诚实占位，不建真实网络客户端、不发明协议。
type Health = {
  status: 'OK' | 'DEGRADED' | 'DOWN';
  lastSuccessAt?: number;
  latencyMs?: number;
  error?: string;
};

export type RepairResult = { ok: true; repairedDraft: string } | { ok: false; reason: string };

export interface AiRepairPort {
  repairDraft(requestText: string): Promise<RepairResult>;
  getHealth(): Promise<Health>;
}

export const noopAiRepairPort: AiRepairPort = {
  repairDraft: async () => ({
    ok: false,
    reason: 'no AI repair provider configured',
  }),
  getHealth: async () => ({
    status: 'DOWN',
    error: 'no AI repair provider configured',
  }),
};
