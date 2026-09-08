import { describe, expect, it } from 'vitest';
import { noopAiRepairPort } from './aiRepairPort.js';
import type { AiRepairPort } from './aiRepairPort.js';

describe('noopAiRepairPort.repairDraft — 诚实占位，恒定拒绝与输入无关', () => {
  it('returns the honest ok:false result for any request text', async () => {
    await expect(
      noopAiRepairPort.repairDraft(
        'The chapter pack failed to compile. Issues reported by the compiler: ...',
      ),
    ).resolves.toEqual({
      ok: false,
      reason: 'no AI repair provider configured',
    });
  });

  it('returns the same ok:false result for an empty-string request (返回值与输入无关)', async () => {
    await expect(noopAiRepairPort.repairDraft('')).resolves.toEqual({
      ok: false,
      reason: 'no AI repair provider configured',
    });
  });
});

describe('noopAiRepairPort.getHealth', () => {
  it('reports DOWN with the honest no-provider error', async () => {
    await expect(noopAiRepairPort.getHealth()).resolves.toEqual({
      status: 'DOWN',
      error: 'no AI repair provider configured',
    });
  });
});

describe('AiRepairPort 类型契约 — 手写满足接口的实现可正常赋值并调用', () => {
  it('a hand-written mock typed as AiRepairPort satisfies the interface contract', async () => {
    const mockAiRepairPort: AiRepairPort = {
      repairDraft: async () => ({ ok: true, repairedDraft: 'mock repaired draft' }),
      getHealth: async () => ({ status: 'OK' as const }),
    };

    await expect(mockAiRepairPort.repairDraft('anything')).resolves.toEqual({
      ok: true,
      repairedDraft: 'mock repaired draft',
    });
  });
});
