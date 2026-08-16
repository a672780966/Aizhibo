import { describe, expect, it } from 'vitest';
import { BossNodeSchema, BossPhaseSchema } from './boss.js';

const validBoss = {
  id: 'boss-final',
  displayName: 'The Leviathan',
  visualSceneId: 'vs-boss',
  phases: [
    {
      id: 'phase-1',
      order: 1,
      enterWhen: { path: { container: 'flags', key: 'bossStarted' }, op: 'EXISTS' },
      interactionId: 'int-boss-round-1',
      narrationBlockIds: ['b-boss-enter'],
      hostPolicy: 'MUTED',
    },
  ],
  variables: { hp: 50, phase: 'p1' },
  stateRuleSetId: 'rules-boss',
  onDefeat: 'scene-victory',
  onFailure: 'ending-defeat',
  maxRounds: 10,
};

describe('BossNode', () => {
  it('parses a valid boss node', () => {
    expect(BossNodeSchema.parse(validBoss).variables.hp).toBe(50);
  });

  it('rejects a non-positive maxRounds', () => {
    expect(BossNodeSchema.safeParse({ ...validBoss, maxRounds: 0 }).success).toBe(false);
  });

  it('rejects variables outside number|boolean|string', () => {
    const bad = { ...validBoss, variables: { hp: [1, 2] } };
    expect(BossNodeSchema.safeParse(bad).success).toBe(false);
  });

  it('has no battle-semantic field names', () => {
    const keys = Object.keys(BossNodeSchema.shape);
    for (const forbidden of ['hp', 'health', 'damage', 'attack']) {
      expect(keys).not.toContain(forbidden);
    }
  });
});

describe('BossPhase', () => {
  it('parses a phase with hostPolicy', () => {
    expect(BossPhaseSchema.parse(validBoss.phases[0]).hostPolicy).toBe('MUTED');
  });
});
