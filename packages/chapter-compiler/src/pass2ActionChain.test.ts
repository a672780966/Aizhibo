import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadChapterPack } from './loader.js';
import { runSchemaValidation } from './pass1Schema.js';
import { buildReferenceIndex } from './referenceIndex.js';
import { runActionChainChecks } from './pass2ActionChain.js';

const fixtureRoot = fileURLToPath(new URL('../test-fixtures', import.meta.url));

function actionChainIssuesOf(fixture: string) {
  const { raw } = loadChapterPack(`${fixtureRoot}/${fixture}`);
  const schemaResult = runSchemaValidation(raw);
  return runActionChainChecks(schemaResult, buildReferenceIndex(schemaResult));
}

describe('runActionChainChecks', () => {
  it('produces no issues for the valid pack (positive examples)', () => {
    expect(actionChainIssuesOf('valid-minimal')).toEqual([]);
  });

  it('flags Choice.ruleId that is not declared in actions/ (negative)', () => {
    const issues = actionChainIssuesOf('broken-dangling-refs');
    const choice = issues.filter((i) => i.category === 'actionChain.choiceRuleId');
    expect(choice).toHaveLength(1);
    expect(choice[0]!.message).toContain('ghost-action');
  });

  it('flags ActionDefinition.diceProfileId that is not declared in dice/ (negative)', () => {
    const issues = actionChainIssuesOf('broken-dangling-refs');
    const dice = issues.filter((i) => i.category === 'actionChain.diceProfileId');
    expect(dice).toHaveLength(1);
    expect(dice[0]!.message).toContain('ghost-dice');
  });

  it('flags ActionDefinition.resultSetId that is not declared in results/ (negative)', () => {
    const issues = actionChainIssuesOf('broken-dangling-refs');
    const results = issues.filter((i) => i.category === 'actionChain.resultSetId');
    expect(results).toHaveLength(1);
    expect(results[0]!.message).toContain('ghost-results');
  });

  it('flags full ResultEntry narrativeId that is not a declared ResultNarrative (negative)', () => {
    const issues = actionChainIssuesOf('broken-dangling-refs');
    const narrative = issues.filter((i) => i.category === 'actionChain.narrativeId');
    expect(narrative).toHaveLength(1);
    expect(narrative[0]!.message).toContain('ghost-narr');
  });

  it('rejects chained mapsTo pointing at another mapsTo entry (negative)', () => {
    const issues = actionChainIssuesOf('broken-dangling-refs');
    const mapsTo = issues.filter((i) => i.category === 'actionChain.mapsTo');
    expect(mapsTo).toHaveLength(1);
    expect(mapsTo[0]!.message).toContain('chained mapsTo');
  });

  it('accepts a mapsTo pointing at a full entry (positive)', () => {
    const issues = actionChainIssuesOf('valid-minimal');
    expect(issues.filter((i) => i.category === 'actionChain.mapsTo')).toEqual([]);
  });

  it('flags RESULT_QUALITY recovery actionId that is not declared in actions/ (negative)', () => {
    const issues = actionChainIssuesOf('broken-dangling-refs');
    const recovery = issues.filter((i) => i.category === 'actionChain.recoveryActionId');
    expect(recovery).toHaveLength(1);
    expect(recovery[0]!.message).toContain('ghost-action');
  });
});
