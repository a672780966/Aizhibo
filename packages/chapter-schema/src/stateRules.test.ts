import { describe, expect, it } from 'vitest';
import {
  ConditionSchema,
  SceneGuardSchema,
  StateEffectSchema,
  StatePathSchema,
  StateRuleSetSchema,
} from './stateRules.js';

const path = (container: string, key = 'k', field?: string) => {
  const p: Record<string, string | undefined> = { container, key };
  if (field !== undefined) p.field = field;
  return p;
};

describe('Condition', () => {
  it('parses all five comparison operators plus IN and EXISTS', () => {
    const cases = [
      { path: path('flags', 'torchLit'), op: 'EQ', value: true },
      { path: path('flags', 'torchLit'), op: 'NEQ', value: true },
      { path: path('danger', 'level', 'level'), op: 'GT', value: 2 },
      { path: path('danger', 'level', 'level'), op: 'GTE', value: 2 },
      { path: path('flags', 'count'), op: 'LT', value: 5 },
      { path: path('flags', 'count'), op: 'LTE', value: 5 },
      { path: path('npc', 'guard', 'disposition'), op: 'IN', value: ['HOSTILE', 'NEUTRAL'] },
      { path: path('discovered', 'room-1'), op: 'EXISTS' },
    ];
    for (const c of cases) {
      expect(ConditionSchema.safeParse(c).success).toBe(true);
    }
  });

  it('parses compound all / any / not with nesting depth >= 2', () => {
    const compound = {
      all: [
        {
          any: [
            { path: path('flags', 'a'), op: 'EQ', value: 1 },
            { path: path('flags', 'b'), op: 'EXISTS' },
          ],
        },
        { not: { path: path('flags', 'c'), op: 'NEQ', value: false } },
      ],
    };
    expect(ConditionSchema.safeParse(compound).success).toBe(true);
  });

  it('rejects a container outside the six WorldState fields', () => {
    expect(ConditionSchema.safeParse({ path: path('memory'), op: 'EQ', value: 1 }).success).toBe(
      false,
    );
  });

  it('rejects a comparison without value', () => {
    expect(ConditionSchema.safeParse({ path: path('flags', 'a'), op: 'EQ' }).success).toBe(false);
  });
});

describe('StatePath', () => {
  it('parses with optional field only for npc / danger', () => {
    expect(StatePathSchema.parse({ container: 'npc', key: 'guard', field: 'alive' }).field).toBe(
      'alive',
    );
  });
});

describe('StateEffect', () => {
  it('parses SET / INC / DEC / PUSH / REMOVE', () => {
    const cases = [
      { path: path('flags', 'foundKey'), op: 'SET', value: true },
      { path: path('danger', 'level', 'level'), op: 'INC' },
      { path: path('danger', 'level', 'level'), op: 'DEC' },
      { path: path('discovered', 'room-2'), op: 'PUSH', value: 'room-2' },
      { path: path('activeThreats', 't1'), op: 'REMOVE', value: 't1' },
    ];
    for (const c of cases) {
      expect(StateEffectSchema.safeParse(c).success).toBe(true);
    }
  });

  it('rejects an unknown op', () => {
    expect(StateEffectSchema.safeParse({ path: path('flags', 'a'), op: 'RESET' }).success).toBe(
      false,
    );
  });
});

describe('StateRuleSet / SceneGuard', () => {
  it('parses a rule set with once flag', () => {
    const set = {
      id: 'rules-phase1',
      rules: [
        {
          id: 'r1',
          when: { path: path('flags', 'a'), op: 'EXISTS' },
          effects: [{ path: path('flags', 'b'), op: 'SET', value: 1 }],
          once: true,
        },
      ],
    };
    expect(StateRuleSetSchema.parse(set).rules[0]?.once).toBe(true);
  });

  it('parses a scene guard', () => {
    expect(
      SceneGuardSchema.parse({
        when: { path: path('flags', 'a'), op: 'EQ', value: true },
        goto: 'scene-next',
        priority: 1,
      }).goto,
    ).toBe('scene-next');
  });
});
