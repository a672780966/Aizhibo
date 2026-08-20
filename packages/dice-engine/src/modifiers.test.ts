import { describe, expect, it } from 'vitest';
import type { DiceProfile, WorldState } from '@interactive-story/chapter-schema';
import { resolveModifiers } from './modifiers.js';

function baseState(): WorldState {
  return {
    chapterId: 'c',
    sceneId: 's1',
    flags: { torchLit: true, gold: 3 },
    npc: {
      guide: { present: true, alive: true, disposition: 'FRIENDLY', flags: {} },
    },
    danger: { level: 2, tensionKey: 'tense' },
    discovered: ['node-a'],
    activeThreats: ['threat-1'],
    chapterVariables: {},
  };
}

const profileBase: Omit<DiceProfile, 'modifiers'> = {
  id: 'prof',
  diceType: 'd20',
  qualityThresholds: [{ quality: 'SUCCESS', min: 10, max: 19 }],
};

function withModifiers(modifiers: DiceProfile['modifiers']): DiceProfile {
  return { ...profileBase, modifiers };
}

describe('resolveModifiers (T006)', () => {
  it('empty / missing modifiers yields zero total and no applied detail', () => {
    expect(resolveModifiers(profileBase as DiceProfile, baseState())).toEqual({
      total: 0,
      applied: [],
    });
    expect(resolveModifiers(withModifiers([]), baseState())).toEqual({ total: 0, applied: [] });
  });

  it('only applies modifiers whose condition holds; keeps applied detail with reason', () => {
    const profile = withModifiers([
      {
        when: { path: { container: 'flags', key: 'torchLit' }, op: 'EQ', value: true },
        amount: 2,
        reason: 'torch light',
      },
      {
        when: { path: { container: 'danger', key: 'x', field: 'level' }, op: 'GT', value: 5 },
        amount: 10,
        reason: 'high danger',
      },
      {
        when: { path: { container: 'flags', key: 'gold' }, op: 'GTE', value: 3 },
        amount: 1,
        reason: 'rich',
      },
    ]);
    const result = resolveModifiers(profile, baseState());
    expect(result.total).toBe(3);
    expect(result.applied).toEqual([
      { amount: 2, reason: 'torch light' },
      { amount: 1, reason: 'rich' },
    ]);
    // total equals the sum of the applied amounts
    expect(result.total).toBe(result.applied.reduce((s, m) => s + m.amount, 0));
  });

  it('supports compound conditions via rule-engine evaluateCondition (all/not)', () => {
    const profile = withModifiers([
      {
        when: {
          all: [
            { path: { container: 'flags', key: 'torchLit' }, op: 'EQ', value: true },
            { path: { container: 'discovered', key: 'node-a' }, op: 'EXISTS' },
          ],
        },
        amount: 5,
        reason: 'lit and seen',
      },
      {
        when: {
          not: { path: { container: 'danger', key: 'x', field: 'level' }, op: 'GTE', value: 1 },
        },
        amount: -3,
        reason: 'calm',
      },
    ]);
    const result = resolveModifiers(profile, baseState());
    expect(result.total).toBe(5); // danger.level=2 → 'calm' (not GTE 1) does not apply
    expect(result.applied.map((m) => m.reason)).toEqual(['lit and seen']);
  });

  it('does not mutate the state or the profile', () => {
    const state = baseState();
    const profile = withModifiers([
      {
        when: { path: { container: 'flags', key: 'torchLit' }, op: 'EQ', value: true },
        amount: 2,
        reason: 'r',
      },
    ]);
    const beforeState = JSON.stringify(state);
    const beforeProfile = JSON.stringify(profile);
    resolveModifiers(profile, state);
    expect(JSON.stringify(state)).toBe(beforeState);
    expect(JSON.stringify(profile)).toBe(beforeProfile);
  });
});
