import { describe, expect, it } from 'vitest';
import { DiceModifierSchema, DiceProfileSchema, QualityThresholdSchema } from './dice.js';

const validProfile = {
  id: 'dice-standard',
  diceType: 'd20',
  qualityThresholds: [
    { quality: 'DISASTER', min: 1, max: 5 },
    { quality: 'FAILURE', min: 6, max: 9 },
    { quality: 'COSTLY_SUCCESS', min: 10, max: 12 },
    { quality: 'SUCCESS', min: 13, max: 15 },
    { quality: 'GREAT_SUCCESS', min: 16, max: 19 },
    { quality: 'SPECIAL', min: 20, max: 20 },
  ],
  modifiers: [
    {
      when: { path: { container: 'flags', key: 'torchLit' }, op: 'EQ', value: true },
      amount: 2,
      reason: 'torch bonus',
    },
  ],
};

describe('DiceProfile', () => {
  it('parses a valid profile', () => {
    expect(DiceProfileSchema.parse(validProfile).diceType).toBe('d20');
  });

  it('rejects a threshold with min > max', () => {
    expect(
      DiceProfileSchema.safeParse({
        ...validProfile,
        qualityThresholds: [{ quality: 'SUCCESS', min: 15, max: 10 }],
      }).success,
    ).toBe(false);
  });
});

describe('QualityThreshold', () => {
  it('enforces min <= max via refine', () => {
    expect(QualityThresholdSchema.safeParse({ quality: 'SUCCESS', min: 10, max: 5 }).success).toBe(
      false,
    );
  });
});

describe('DiceModifier', () => {
  it('parses a modifier with a condition', () => {
    expect(
      DiceModifierSchema.parse({
        when: { all: [{ path: { container: 'flags', key: 'a' }, op: 'EXISTS' }] },
        amount: -1,
        reason: 'exhaustion',
      }).amount,
    ).toBe(-1);
  });
});
