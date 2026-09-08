import { describe, expect, it } from 'vitest';
import { noopAiChapterGeneratorPort } from './aiChapterGeneratorPort.js';
import type { AiChapterGeneratorPort } from './aiChapterGeneratorPort.js';

describe('noopAiChapterGeneratorPort.generateDraft — 诚实占位，恒定拒绝与输入无关', () => {
  it('returns the honest ok:false result for any request text', async () => {
    await expect(
      noopAiChapterGeneratorPort.generateDraft('A haunted lighthouse chapter.'),
    ).resolves.toEqual({
      ok: false,
      reason: 'no chapter generator provider configured',
    });
  });

  it('returns the same ok:false result for an empty-string request (返回值与输入无关)', async () => {
    await expect(noopAiChapterGeneratorPort.generateDraft('')).resolves.toEqual({
      ok: false,
      reason: 'no chapter generator provider configured',
    });
  });
});

describe('noopAiChapterGeneratorPort.getHealth', () => {
  it('reports DOWN with the honest no-provider error', async () => {
    await expect(noopAiChapterGeneratorPort.getHealth()).resolves.toEqual({
      status: 'DOWN',
      error: 'no chapter generator provider configured',
    });
  });
});

describe('AiChapterGeneratorPort 类型契约 — 手写满足接口的实现可正常赋值并调用', () => {
  it('a hand-written mock typed as AiChapterGeneratorPort satisfies the interface contract', async () => {
    const mockAiChapterGeneratorPort: AiChapterGeneratorPort = {
      generateDraft: async () => ({ ok: true, draft: 'mock draft' }),
      getHealth: async () => ({ status: 'OK' as const }),
    };

    await expect(mockAiChapterGeneratorPort.generateDraft('anything')).resolves.toEqual({
      ok: true,
      draft: 'mock draft',
    });
  });
});
