import type { CompileResult } from '@interactive-story/chapter-compiler';

// schemaResult 的 19 个分节（manifest/storyGraph/.../metadata），每节 failed 数组
// 持有 { file, issues: ZodIssue[] }。逐字枚举分节名而非 Object.values，保证与
// chapter-compiler 冻结导出的 SchemaValidationResult 字段一一对应、不靠猜测。
const SCHEMA_SECTION_KEYS = [
  'manifest',
  'storyGraph',
  'initialState',
  'worldRules',
  'hostPublic',
  'scenes',
  'interactions',
  'actions',
  'dice',
  'results',
  'stateRules',
  'narrative',
  'npc',
  'recovery',
  'boss',
  'endings',
  'visuals',
  'audio',
  'metadata',
] as const;

/**
 * 把一次失败的 compile 结果忠实转述为一段可读文本（AI Repair provider 的请求
 * 输入）。只转述 Compiler 已经报告的问题，不生成任何"猜测应如何修复"的建议
 * 文本——提出修复方案是未来真实 AI Repair provider 自己的职责（见
 * DECISIONS.md D5）。
 *
 * 覆盖 CompileResult 的全部问题载体：七个 issue 数组（loadIssues、
 * uniquenessIssues、referenceIssues、graphIssues、stateIssues、
 * hiddenInfoIssues、ruleCoverageIssues）中所有非空者 + schemaResult 内每个
 * 分节的 failed 校验错误。带 message 字段的 issue 输出其 message 原文逐字
 * 出现；uniquenessIssues 没有 message 字段，改用 category/id/conflictingFiles
 * 拼一条完整可读描述。
 *
 * result.passed === true 时抛出 Error——编译已通过、没有可转述的问题时调用
 * 本函数是调用方逻辑错误，明确失败而非静默返回空文本（见 DECISIONS.md D5）。
 */
export function buildRepairRequest(result: CompileResult): string {
  if (result.passed === true) {
    throw new Error(
      'buildRepairRequest: compile already passed (result.passed === true); there is nothing to repair',
    );
  }

  const lines: string[] = ['The chapter pack failed to compile. Issues reported by the compiler:'];

  const restate = (label: string, issues: readonly { message: string }[]): void => {
    if (issues.length === 0) {
      return;
    }
    lines.push(`${label}:`);
    for (const issue of issues) {
      lines.push(`- ${issue.message}`);
    }
  };

  restate('loadIssues', result.loadIssues);
  restate('referenceIssues', result.referenceIssues);
  restate('graphIssues', result.graphIssues);
  restate('stateIssues', result.stateIssues);
  restate('hiddenInfoIssues', result.hiddenInfoIssues);
  restate('ruleCoverageIssues', result.ruleCoverageIssues);

  if (result.uniquenessIssues.length > 0) {
    lines.push('uniquenessIssues:');
    for (const issue of result.uniquenessIssues) {
      lines.push(
        `- category=${issue.category} id=${issue.id} conflictingFiles=[${issue.conflictingFiles.join(', ')}]`,
      );
    }
  }

  for (const key of SCHEMA_SECTION_KEYS) {
    const section = result.schemaResult[key];
    if (section.failed.length === 0) {
      continue;
    }
    lines.push(`schemaResult.${key} schema validation failures:`);
    for (const failure of section.failed) {
      lines.push(`- file: ${failure.file}`);
      for (const issue of failure.issues) {
        const path = issue.path.length > 0 ? ` (zod path: ${issue.path.join('.')})` : '';
        lines.push(`  - ${issue.message}${path}`);
      }
    }
  }

  return lines.join('\n');
}
