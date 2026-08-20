import { describe, expect, it } from 'vitest';
import type { DiceProfile, WorldState } from '@interactive-story/chapter-schema';
import { resolveQuality } from './quality.js';
import { rollDice } from './index.js';

function baseState(): WorldState {
  return {
    chapterId: 'c',
    sceneId: 's1',
    flags: {},
    npc: {},
    danger: { level: 0, tensionKey: 'calm' },
    discovered: [],
    activeThreats: [],
    chapterVariables: {},
  };
}

// Full coverage of 1..20 for a d20 with two modifiers gated on state.
function d20Profile(modifiers: DiceProfile['modifiers'] = []): DiceProfile {
  return {
    id: 'p-d20',
    diceType: 'd20',
    qualityThresholds: [
      { quality: 'DISASTER', min: 1, max: 4 },
      { quality: 'FAILURE', min: 5, max: 9 },
      { quality: 'SUCCESS', min: 10, max: 19 },
      { quality: 'SPECIAL', min: 20, max: 20 },
    ],
    modifiers,
  };
}

describe('resolveQuality (T007)', () => {
  it('maps values to the covering threshold range', () => {
    const profile = d20Profile();
    expect(resolveQuality(profile, 1)).toBe('DISASTER');
    expect(resolveQuality(profile, 4)).toBe('DISASTER');
    expect(resolveQuality(profile, 5)).toBe('FAILURE');
    expect(resolveQuality(profile, 13)).toBe('SUCCESS');
    expect(resolveQuality(profile, 20)).toBe('SPECIAL');
  });

  it('returns undefined for values in a coverage gap, without throwing', () => {
    const gappy: DiceProfile = {
      id: 'p-gappy',
      diceType: 'd20',
      qualityThresholds: [
        { quality: 'FAILURE', min: 1, max: 5 },
        { quality: 'SUCCESS', min: 15, max: 20 },
      ],
    };
    expect(resolveQuality(gappy, 10)).toBeUndefined();
    expect(resolveQuality(gappy, 14)).toBeUndefined();
  });

  it('empty threshold list returns undefined', () => {
    const empty: DiceProfile = { id: 'p-empty', diceType: 'd20', qualityThresholds: [] };
    expect(resolveQuality(empty, 10)).toBeUndefined();
  });

  it('first matching threshold wins on (theoretically impossible) overlap, no error', () => {
    const overlapping: DiceProfile = {
      id: 'p-ovl',
      diceType: 'd20',
      qualityThresholds: [
        { quality: 'FAILURE', min: 1, max: 10 },
        { quality: 'SUCCESS', min: 5, max: 15 },
      ],
    };
    expect(resolveQuality(overlapping, 7)).toBe('FAILURE');
  });
});

describe('rollDice (T007)', () => {
  it('is end-to-end deterministic: same inputs twice give identical results', () => {
    const profile = d20Profile([
      {
        when: { path: { container: 'flags', key: 'torchLit' }, op: 'EQ', value: true },
        amount: 2,
        reason: 'torch',
      },
    ]);
    const state = baseState();
    const first = rollDice(profile, 'seed-e2e', 7, state);
    const second = rollDice(profile, 'seed-e2e', 7, state);
    expect(second).toEqual(first);
  });

  it('returns fields aligned with DiceRollRecordPayload plus quality/appliedModifiers', () => {
    const profile = d20Profile();
    const result = rollDice(profile, 'seed-shape', 3, baseState());
    // the six payload fields exist with the frozen types
    expect(typeof result.seed).toBe('string');
    expect(typeof result.rollIndex).toBe('number');
    expect(typeof result.diceType).toBe('string');
    expect(typeof result.rawValue).toBe('number');
    expect(typeof result.modifier).toBe('number');
    expect(typeof result.finalValue).toBe('number');
    // semantics: finalValue = rawValue + modifier; quality derived from finalValue
    expect(result.finalValue).toBe(result.rawValue + result.modifier);
    expect(result.quality).toBe(resolveQuality(profile, result.finalValue));
    expect(result.appliedModifiers).toEqual([]);
    expect(result.diceType).toBe('d20');
  });

  it('applies modifiers and maps the final value to quality', () => {
    const profile = d20Profile([
      {
        when: { path: { container: 'flags', key: 'torchLit' }, op: 'EQ', value: true },
        amount: 3,
        reason: 'torch',
      },
    ]);
    const state = baseState();
    state.flags.torchLit = true;
    const result = rollDice(profile, 'seed-mod', 0, state);
    expect(result.modifier).toBe(3);
    expect(result.finalValue).toBe(result.rawValue + 3);
    expect(result.appliedModifiers).toEqual([{ amount: 3, reason: 'torch' }]);
    // with +3, a raw 8..16 maps to SUCCESS (10..19); verify raw assertions hold
    expect(result.rawValue).toBeGreaterThanOrEqual(1);
    expect(result.rawValue).toBeLessThanOrEqual(20);
    if (result.finalValue >= 10 && result.finalValue <= 19) {
      expect(result.quality).toBe('SUCCESS');
    }
  });

  it('same seed + different rollIndex gives different results', () => {
    const profile = d20Profile();
    const a = rollDice(profile, 'seed-var', 0, baseState());
    const b = rollDice(profile, 'seed-var', 1, baseState());
    expect(a.rawValue).not.toBe(b.rawValue);
  });

  it('unknown diceType degrades safely instead of throwing', () => {
    const bad: DiceProfile = { ...d20Profile(), diceType: 'abc' };
    const result = rollDice(bad, 'seed-bad', 0, baseState());
    expect(result.rawValue).toBe(1); // degraded {1,1}
    expect(result.diceType).toBe('abc'); // echo input, not mutated
  });
});
