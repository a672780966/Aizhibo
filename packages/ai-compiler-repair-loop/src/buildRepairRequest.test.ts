import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compile } from '@interactive-story/chapter-compiler';
import { buildRepairRequest } from './buildRepairRequest.js';

const fixtureRoot = fileURLToPath(new URL('../../chapter-compiler/test-fixtures', import.meta.url));

describe('buildRepairRequest — passed:true 输入', () => {
  it('throws an Error when the compile result has already passed (nothing to repair)', () => {
    const result = compile(`${fixtureRoot}/valid-minimal`);
    expect(result.passed).toBe(true);
    expect(() => buildRepairRequest(result)).toThrow(Error);
  });
});

describe('buildRepairRequest — broken-composite 真实 compile 结果', () => {
  it('returns a non-empty text containing a readable restatement of every issue actually present', () => {
    const result = compile(`${fixtureRoot}/broken-composite`);
    expect(result.passed).toBe(false);
    expect(result.referenceIssues.length).toBeGreaterThan(0);

    const text = buildRepairRequest(result);
    expect(text.length).toBeGreaterThan(0);

    // 带 message 字段的 issue：message 原文必须逐字出现在输出中
    for (const issue of result.loadIssues) {
      expect(text).toContain(issue.message);
    }
    for (const issue of result.referenceIssues) {
      expect(text).toContain(issue.message);
    }
    for (const issue of result.graphIssues) {
      expect(text).toContain(issue.message);
    }
    for (const issue of result.stateIssues) {
      expect(text).toContain(issue.message);
    }
    for (const issue of result.hiddenInfoIssues) {
      expect(text).toContain(issue.message);
    }
    for (const issue of result.ruleCoverageIssues) {
      expect(text).toContain(issue.message);
    }

    // uniquenessIssues 无 message 字段：category/id/conflictingFiles 拼成的
    // 可读描述必须完整出现在输出中
    for (const issue of result.uniquenessIssues) {
      expect(text).toContain(`category=${issue.category} id=${issue.id}`);
      for (const file of issue.conflictingFiles) {
        expect(text).toContain(file);
      }
    }

    // schemaResult 内所有 failed 分节：文件路径与每条 zod issue 的 message
    // 原文必须逐字出现在输出中
    for (const section of Object.values(result.schemaResult)) {
      for (const failure of section.failed) {
        expect(text).toContain(failure.file);
        for (const issue of failure.issues) {
          expect(text).toContain(issue.message);
        }
      }
    }
  });
});
