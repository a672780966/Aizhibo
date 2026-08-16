import { describe, expect, it } from 'vitest';
import { RecoveryRuleSchema, RecoveryTriggerSchema } from './recovery.js';
import type { RecoveryTrigger } from './recovery.js';

const stateTrigger: RecoveryTrigger = {
  kind: 'STATE',
  condition: { path: { container: 'flags', key: 'downedEver' }, op: 'EXISTS' },
};
const sceneTrigger: RecoveryTrigger = { kind: 'SCENE_ENTER', nodeId: 'scene-sanctuary' };
const qualityTrigger: RecoveryTrigger = {
  kind: 'RESULT_QUALITY',
  actionId: 'act-inspire',
  minQuality: 'GREAT_SUCCESS',
};

const rule = (trigger: RecoveryTrigger) => ({
  id: 'recovery-1',
  when: trigger,
  scope: 'ALL_DOWNED',
  effects: [{ scope: 'ALL_DOWNED', op: 'REVIVE' }],
  oncePerChapter: true,
});

describe('RecoveryTrigger', () => {
  it('parses all three kinds', () => {
    expect(RecoveryTriggerSchema.safeParse(stateTrigger).success).toBe(true);
    expect(RecoveryTriggerSchema.safeParse(sceneTrigger).success).toBe(true);
    expect(RecoveryTriggerSchema.safeParse(qualityTrigger).success).toBe(true);
  });

  it('rejects a kind outside the three', () => {
    expect(RecoveryTriggerSchema.safeParse({ kind: 'TIMER', seconds: 30 }).success).toBe(false);
  });
});

describe('RecoveryRule', () => {
  it('parses a RESULT_QUALITY rule with minQuality', () => {
    const parsed = RecoveryRuleSchema.parse(rule(qualityTrigger));
    if (parsed.when.kind !== 'RESULT_QUALITY') {
      throw new Error('expected RESULT_QUALITY trigger');
    }
    expect(parsed.when.minQuality).toBe('GREAT_SUCCESS');
  });

  it('parses a STATE rule with a condition', () => {
    const parsed = RecoveryRuleSchema.parse(rule(stateTrigger));
    if (parsed.when.kind !== 'STATE') {
      throw new Error('expected STATE trigger');
    }
    expect(parsed.when.kind).toBe('STATE');
  });

  it('parses a SCENE_ENTER rule with nodeId', () => {
    const parsed = RecoveryRuleSchema.parse(rule(sceneTrigger));
    if (parsed.when.kind !== 'SCENE_ENTER') {
      throw new Error('expected SCENE_ENTER trigger');
    }
    expect(parsed.when.nodeId).toBe('scene-sanctuary');
  });
});
