import { describe, expect, it } from 'vitest';
import type { StateEffect, WorldState } from '@interactive-story/chapter-schema';
import { applyEffect } from './effect.js';

function baseState(): WorldState {
  return {
    chapterId: 'c',
    sceneId: 's1',
    flags: { gold: 3 },
    npc: {
      guide: { present: true, alive: true, disposition: 'FRIENDLY', flags: { knows: false } },
    },
    danger: { level: 0, tensionKey: 'calm' },
    discovered: ['node-a'],
    activeThreats: ['threat-1'],
    chapterVariables: {},
  };
}

describe('applyEffect (T005)', () => {
  it('SET writes flags / chapterVariables / npc.field / danger.field immutably', () => {
    const s = baseState();
    const next = applyEffect(
      { path: { container: 'flags', key: 'gold' }, op: 'SET', value: 99 },
      s,
    );
    expect(s.flags.gold).toBe(3);
    expect(next.flags.gold).toBe(99);
    expect(next).not.toBe(s);

    const npc = applyEffect(
      { path: { container: 'npc', key: 'guide', field: 'flags.knows' }, op: 'SET', value: true },
      s,
    );
    expect(npc.npc['guide']!.flags.knows).toBe(true);
    expect(s.npc['guide']!.flags.knows).toBe(false);

    const danger = applyEffect(
      { path: { container: 'danger', key: 'x', field: 'level' }, op: 'SET', value: 5 },
      s,
    );
    expect(danger.danger.level).toBe(5);
    expect(s.danger.level).toBe(0);
  });

  it('INC/DEC numeric increments, defaulting to 1, and from non-number start at 0', () => {
    const s = baseState();
    expect(
      applyEffect({ path: { container: 'flags', key: 'gold' }, op: 'INC' }, s).flags.gold,
    ).toBe(4);
    expect(
      applyEffect({ path: { container: 'flags', key: 'gold' }, op: 'INC', value: 5 }, s).flags.gold,
    ).toBe(8);
    expect(
      applyEffect({ path: { container: 'flags', key: 'gold' }, op: 'DEC' }, s).flags.gold,
    ).toBe(2);
    // chapterVariables.bossHp not declared → starts at 0, INC +2 → 2.
    const fresh = applyEffect(
      { path: { container: 'chapterVariables', key: 'bossHp' }, op: 'INC', value: 2 },
      baseState(),
    );
    expect(fresh.chapterVariables['bossHp']).toBe(2);
  });

  it('PUSH is idempotent on discovered/activeThreats', () => {
    const s = baseState();
    const once = applyEffect(
      { path: { container: 'discovered', key: 'node-b' }, op: 'PUSH', value: 'node-b' },
      s,
    );
    expect(once.discovered).toEqual(['node-a', 'node-b']);
    const twice = applyEffect(
      { path: { container: 'discovered', key: 'node-b' }, op: 'PUSH', value: 'node-b' },
      once,
    );
    expect(twice.discovered).toEqual(['node-a', 'node-b']); // idempotent, no second append
  });

  it('REMOVE removes a member and no-ops when absent', () => {
    const s = baseState();
    expect(
      applyEffect(
        { path: { container: 'discovered', key: 'node-a' }, op: 'REMOVE', value: 'node-a' },
        s,
      ).discovered,
    ).toEqual([]);
    const absent = applyEffect(
      { path: { container: 'activeThreats', key: 'none' }, op: 'REMOVE', value: 'none' },
      s,
    );
    expect(absent.activeThreats).toEqual(['threat-1']);
  });

  it('PUSH/REMOVE on non-member containers return the unchanged state', () => {
    const s = baseState();
    const stateEffects: StateEffect[] = [
      { path: { container: 'flags', key: 'gold' }, op: 'PUSH', value: 'x' },
      { path: { container: 'danger', key: 'x', field: 'level' }, op: 'REMOVE', value: 'x' },
    ];
    for (const effect of stateEffects) {
      expect(applyEffect(effect, s)).toBe(s);
    }
  });

  it('never mutates the input state for any op (deep equality)', () => {
    const s = baseState();
    const snapshot = JSON.parse(JSON.stringify(s));
    const effects: StateEffect[] = [
      { path: { container: 'flags', key: 'gold' }, op: 'SET', value: 0 },
      { path: { container: 'flags', key: 'gold' }, op: 'INC' },
      { path: { container: 'flags', key: 'gold' }, op: 'DEC' },
      { path: { container: 'discovered', key: 'node-z' }, op: 'PUSH', value: 'node-z' },
      { path: { container: 'discovered', key: 'node-a' }, op: 'REMOVE', value: 'node-a' },
    ];
    for (const effect of effects) {
      applyEffect(effect, s);
      expect(s).toEqual(snapshot);
    }
  });
});
