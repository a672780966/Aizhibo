import { compile } from '@interactive-story/chapter-compiler';
import type { CompileResult } from '@interactive-story/chapter-compiler';
import type { AiRepairPort } from './aiRepairPort.js';
import { buildRepairRequest } from './buildRepairRequest.js';

export type CompileRepairLoopOutcome = 'PASSED' | 'REPAIR_UNAVAILABLE' | 'REPAIR_NOT_APPLIED';

export interface CompileRepairLoopResult {
  outcome: CompileRepairLoopOutcome;
  result: CompileResult;
  reason?: string;
}

/**
 * 对 rootDir 执行一次真实的 compile →（若失败）一次 AI repair 尝试，返回
 * 闭集三态决策（对应 Dev Spec 第 25-26 节 ASCII 流程图 Compile → Errors →
 * AI Repair → Compile 的前半段）：
 *
 * - result.passed === true → { outcome: 'PASSED', result }，绝不调用
 *   repairPort.repairDraft（流程图走到底部 Compile 成功，无需 Repair）。
 * - repairPort.repairDraft 返回 { ok: false, reason } →
 *   { outcome: 'REPAIR_UNAVAILABLE', result, reason }（诚实占位/未配置
 *   provider 时的处境，同 DEV-063 NOT_YET_WIRED 先例）。
 * - repairPort.repairDraft 返回 { ok: true, repairedDraft } →
 *   { outcome: 'REPAIR_NOT_APPLIED', result, reason }——本节点没有 Schema
 *   Normalizer、也没有把草稿写回磁盘的机制（Dev Spec 未给这两个能力分配
 *   DEV 节点编号），收到的 repairedDraft 无法写回 rootDir、也无法据此重新
 *   compile，"继续循环"没有可编译的对象，REPAIR_NOT_APPLIED 是诚实的终止态
 *   （见 DECISIONS.md D2/D3）。
 *
 * 只做一次 compile 尝试 + 一次 repair 尝试：不把 repairedDraft 写入任何
 * 文件、不递归再次调用 compile()、不实现任何重试循环（Dev Spec 未定义
 * 重试上限，不发明具体次数，见 DECISIONS.md D4）。
 */
export async function runCompileRepairLoop(
  rootDir: string,
  repairPort: AiRepairPort,
): Promise<CompileRepairLoopResult> {
  const result = compile(rootDir);
  if (result.passed === true) {
    return { outcome: 'PASSED', result };
  }
  const requestText = buildRepairRequest(result);
  const repairResult = await repairPort.repairDraft(requestText);
  if (repairResult.ok === false) {
    return { outcome: 'REPAIR_UNAVAILABLE', result, reason: repairResult.reason };
  }
  return {
    outcome: 'REPAIR_NOT_APPLIED',
    result,
    reason:
      'the AI repair provider returned a repaired draft, but no Schema Normalizer or draft-to-file writer exists in this project yet, so the repaired draft cannot be written back onto disk, nor can compile() be re-run against it',
  };
}
