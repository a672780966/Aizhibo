import { describe, expect, it } from 'vitest';
import type { Condition, WorldState } from '@interactive-story/chapter-schema';
import { evaluateCondition } from './condition.js';

function baseState(): WorldState {
  return {
    chapterId: 'c',
    sceneId: 's1',
    flags: { torchLit: true, gold: 3, name: '林', flag: false },
    npc: {
      guide: { present: true, alive: true, disposition: 'FRIENDLY', flags: {} },
    },
    danger: { level: 0, tensionKey: 'calm' },
    discovered: ['node-a'],
    activeThreats: [],
    chapterVariables: {},
  };
}

describe('evaluateCondition (T004)', () => {
  it('EQ / NEQ exact value comparison', () => {
    const s = baseState();
    expect(
      evaluateCondition(
        { path: { container: 'flags', key: 'torchLit' }, op: 'EQ', value: true },
        s,
      ),
    ).toBe(true);
    expect(
      evaluateCondition({ path: { container: 'flags', key: 'gold' }, op: 'EQ', value: 3 }, s),
    ).toBe(true);
    expect(
      evaluateCondition({ path: { container: 'flags', key: 'gold' }, op: 'EQ', value: 4 }, s),
    ).toBe(false);
    expect(
      evaluateCondition({ path: { container: 'flags', key: 'gold' }, op: 'NEQ', value: 4 }, s),
    ).toBe(true);
  });

  it('type-mismatched values: EQ/NEQ compare as unequal, ordered ops return false', () => {
    const s = baseState();
    // gold is a number, compare to string '3' → EQ false, NEQ true.
    expect(
      evaluateCondition({ path: { container: 'flags', key: 'gold' }, op: 'EQ', value: '3' }, s),
    ).toBe(false);
    expect(
      evaluateCondition({ path: { container: 'flags', key: 'gold' }, op: 'NEQ', value: '3' }, s),
    ).toBe(true);
    // ordered comparison across type mismatch → false, no throw.
    expect(
      evaluateCondition({ path: { container: 'flags', key: 'gold' }, op: 'GT', value: '2' }, s),
    ).toBe(false);
    expect(
      evaluateCondition({ path: { container: 'flags', key: 'torchLit' }, op: 'LT', value: 5 }, s),
    ).toBe(false);
  });

  it('GT/GTE/LT/LTE numeric comparison', () => {
    const s = baseState();
    expect(
      evaluateCondition({ path: { container: 'flags', key: 'gold' }, op: 'GT', value: 2 }, s),
    ).toBe(true);
    expect(
      evaluateCondition({ path: { container: 'flags', key: 'gold' }, op: 'GTE', value: 3 }, s),
    ).toBe(true);
    expect(
      evaluateCondition({ path: { container: 'flags', key: 'gold' }, op: 'LT', value: 3 }, s),
    ).toBe(false);
    expect(
      evaluateCondition({ path: { container: 'flags', key: 'gold' }, op: 'LTE', value: 3 }, s),
    ).toBe(true);
  });

  it('IN membership and EXISTS', () => {
    const s = baseState();
    expect(
      evaluateCondition(
        { path: { container: 'flags', key: 'flag' }, op: 'IN', value: [true, 'x'] },
        s,
      ),
    ).toBe(false);
    expect(
      evaluateCondition({ path: { container: 'flags', key: 'flag' }, op: 'IN', value: [false] }, s),
    ).toBe(true);
    expect(evaluateCondition({ path: { container: 'flags', key: 'name' }, op: 'EXISTS' }, s)).toBe(
      true,
    );
    expect(
      evaluateCondition({ path: { container: 'flags', key: 'missing' }, op: 'EXISTS' }, s),
    ).toBe(false);
    // discovered/activeThreats EXISTS = membership check itself.
    expect(
      evaluateCondition({ path: { container: 'discovered', key: 'node-a' }, op: 'EXISTS' }, s),
    ).toBe(true);
    expect(
      evaluateCondition({ path: { container: 'discovered', key: 'node-b' }, op: 'EXISTS' }, s),
    ).toBe(false);
  });

  it('all / any / not compose recursively (depth >= 2)', () => {
    const s = baseState();
    const deep: Condition = {
      any: [
        { all: [{ path: { container: 'flags', key: 'gold' }, op: 'GT', value: 10 }] },
        { not: { path: { container: 'flags', key: 'torchLit' }, op: 'EQ', value: false } },
      ],
    };
    // first any-branch false, second (not EQ false → true because torchLit is true) true.
    expect(evaluateCondition(deep, s)).toBe(true);
    const allFalse: Condition = {
      all: [{ path: { container: 'danger', key: 'x', field: 'level' }, op: 'EQ', value: 5 }],
    };
    expect(evaluateCondition(allFalse, s)).toBe(false);
  });

  it('defensively returns false for ordered/comparison ops on discovered/activeThreats containers', () => {
    const s = baseState();
    expect(
      evaluateCondition(
        { path: { container: 'discovered', key: 'node-a' }, op: 'GT', value: 0 },
        s,
      ),
    ).toBe(false);
    expect(
      evaluateCondition(
        { path: { container: 'activeThreats', key: 't' }, op: 'EQ', value: true },
        s,
      ),
    ).toBe(false);
  });
});
