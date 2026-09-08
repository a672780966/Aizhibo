import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { noopAiRepairPort } from './aiRepairPort.js';
import type { AiRepairPort } from './aiRepairPort.js';
import { runCompileRepairLoop } from './runCompileRepairLoop.js';

const fixtureRoot = fileURLToPath(new URL('../../chapter-compiler/test-fixtures', import.meta.url));

describe('runCompileRepairLoop — valid-minimal fixture（compile 已通过）', () => {
  it("returns outcome 'PASSED' and never invokes repairDraft", async () => {
    const portThatFailsIfCalled: AiRepairPort = {
      repairDraft: async () => {
        throw new Error('repairDraft must not be invoked when compile already passed');
      },
      getHealth: async () => ({ status: 'OK' as const }),
    };

    const outcome = await runCompileRepairLoop(
      `${fixtureRoot}/valid-minimal`,
      portThatFailsIfCalled,
    );
    expect(outcome.outcome).toBe('PASSED');
    expect(outcome.result.passed).toBe(true);
    expect(outcome.reason).toBeUndefined();
  });
});

describe('runCompileRepairLoop — broken-composite fixture（compile 失败）', () => {
  it("returns outcome 'REPAIR_UNAVAILABLE' with the noop port's honest rejection reason", async () => {
    const outcome = await runCompileRepairLoop(`${fixtureRoot}/broken-composite`, noopAiRepairPort);
    expect(outcome.outcome).toBe('REPAIR_UNAVAILABLE');
    expect(outcome.result.passed).toBe(false);
    expect(outcome.reason).toBe('no AI repair provider configured');
  });

  it("returns outcome 'REPAIR_NOT_APPLIED' when the repair port returns a repaired draft (no disk write, no second compile)", async () => {
    const mockAiRepairPort: AiRepairPort = {
      repairDraft: async () => ({ ok: true, repairedDraft: 'some repaired text' }),
      getHealth: async () => ({ status: 'OK' as const }),
    };

    const outcome = await runCompileRepairLoop(`${fixtureRoot}/broken-composite`, mockAiRepairPort);
    expect(outcome.outcome).toBe('REPAIR_NOT_APPLIED');
    expect(outcome.result.passed).toBe(false);
    expect(outcome.reason).toBeDefined();
    expect(outcome.reason).toContain('Schema Normalizer');
  });
});
