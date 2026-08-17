import { describe, expect, it } from 'vitest';
import type { StateRuleSet, WorldState } from '@interactive-story/chapter-schema';
import { applyStateRuleSet } from './ruleSet.js';

function baseState(): WorldState {
  return {
    chapterId: 'c',
    sceneId: 's1',
    flags: { gold: 0, opened: false },
    npc: {},
    danger: { level: 0, tensionKey: 'calm' },
    discovered: [],
    activeThreats: [],
    chapterVariables: {},
  };
}

describe('applyStateRuleSet (T006)', () => {
  it('skips a once-ended rule already in firedRuleIds', () => {
    const ruleSet: StateRuleSet = {
      id: 'rs',
      rules: [
        {
          id: 'r1',
          once: true,
          when: { path: { container: 'flags', key: 'gold' }, op: 'GTE', value: 0 },
          effects: [{ path: { container: 'flags', key: 'opened' }, op: 'SET', value: true }],
        },
      ],
    };
    const { nextState, newlyFiredRuleIds } = applyStateRuleSet(
      ruleSet,
      baseState(),
      new Set(['r1']),
    );
    expect(newlyFiredRuleIds).toEqual([]);
    expect(nextState.flags['opened']).toBe(false);
  });

  it('fires a once rule not yet fired and reports it', () => {
    const ruleSet: StateRuleSet = {
      id: 'rs',
      rules: [
        {
          id: 'r1',
          once: true,
          when: { path: { container: 'flags', key: 'gold' }, op: 'GTE', value: 0 },
          effects: [{ path: { container: 'flags', key: 'opened' }, op: 'SET', value: true }],
        },
      ],
    };
    const { nextState, newlyFiredRuleIds } = applyStateRuleSet(ruleSet, baseState(), new Set());
    expect(newlyFiredRuleIds).toEqual(['r1']);
    expect(nextState.flags['opened']).toBe(true);
  });

  it('fires multiple matching rules in the same call and accumulates effects in order', () => {
    const ruleSet: StateRuleSet = {
      id: 'rs',
      rules: [
        {
          id: 'a',
          once: true,
          when: { path: { container: 'flags', key: 'gold' }, op: 'EQ', value: 0 },
          effects: [{ path: { container: 'flags', key: 'gold' }, op: 'INC', value: 5 }],
        },
        {
          id: 'b',
          once: true,
          when: { path: { container: 'flags', key: 'gold' }, op: 'GT', value: 0 },
          effects: [{ path: { container: 'flags', key: 'gold' }, op: 'INC', value: 1 }],
        },
      ],
    };
    const { nextState, newlyFiredRuleIds } = applyStateRuleSet(ruleSet, baseState(), new Set());
    // a fires (gold 0→5), then b sees gold=5 (>0) → 5→6. Both fire and are once-records.
    expect(newlyFiredRuleIds).toEqual(['a', 'b']);
    expect(nextState.flags['gold']).toBe(6);
  });

  it('does not mutate the input state or the firedRuleIds set', () => {
    const ruleSet: StateRuleSet = {
      id: 'rs',
      rules: [
        {
          id: 'r',
          when: { path: { container: 'flags', key: 'gold' }, op: 'EQ', value: 0 },
          effects: [{ path: { container: 'flags', key: 'gold' }, op: 'SET', value: 1 }],
        },
      ],
    };
    const s = baseState();
    const snapshot = JSON.parse(JSON.stringify(s));
    const fired = new Set(['other']);
    const firedSnapshot = new Set(fired);
    const { nextState } = applyStateRuleSet(ruleSet, s, fired);
    expect(s).toEqual(snapshot);
    expect(nextState).not.toBe(s);
    expect(fired).toEqual(firedSnapshot);
  });
});
