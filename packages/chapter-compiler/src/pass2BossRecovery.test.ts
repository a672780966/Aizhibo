import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadChapterPack } from './loader.js';
import { runSchemaValidation } from './pass1Schema.js';
import { runBossChecks } from './pass2BossRecovery.js';

const fixtureRoot = fileURLToPath(new URL('../test-fixtures', import.meta.url));

function bossIssuesOf(fixture: string) {
  const { raw } = loadChapterPack(`${fixtureRoot}/${fixture}`);
  const schemaResult = runSchemaValidation(raw);
  return runBossChecks(schemaResult);
}

describe('runBossChecks', () => {
  it('produces no issues for the valid pack (positive examples)', () => {
    expect(bossIssuesOf('valid-minimal')).toEqual([]);
  });

  it('flags BossPhase.interactionId that is not declared in interactions/ (negative)', () => {
    const issues = bossIssuesOf('broken-dangling-refs');
    const interaction = issues.filter((i) => i.category === 'boss.interactionId');
    expect(interaction).toHaveLength(1);
    expect(interaction[0]!.message).toContain('ghost-interaction');
    expect(interaction[0]!.severity).toBe('BLOCKING');
  });

  it('flags a boss interaction whose nextScene does not return to the boss or its exit targets (negative)', () => {
    const issues = bossIssuesOf('broken-dangling-refs');
    const nextScene = issues.filter((i) => i.category === 'boss.interactionNextScene');
    expect(nextScene).toHaveLength(1);
    expect(nextScene[0]!.message).toContain('somewhere-else');
    expect(nextScene[0]!.severity).toBe('ADVISORY');
  });

  it('skips the nextScene convention check when the interaction itself is missing (no cascade)', () => {
    const issues = bossIssuesOf('broken-dangling-refs');
    const nextScene = issues.filter((i) => i.category === 'boss.interactionNextScene');
    expect(nextScene).toHaveLength(1);
    expect(nextScene[0]!.file).toBe('interactions/interaction-boss.json');
    expect(issues.filter((i) => i.category === 'boss.interactionId')).toHaveLength(1);
  });
});
