import { describe, expect, it } from 'vitest';
import type { StatePath, WorldState } from '@interactive-story/chapter-schema';
import { resolveStatePath, writeStatePath } from './statePath.js';

function baseState(): WorldState {
  return {
    chapterId: 'c',
    sceneId: 's1',
    flags: { torchLit: true, gold: 3 },
    npc: {
      guide: { present: true, alive: true, disposition: 'FRIENDLY', flags: { knowsSecret: false } },
    },
    danger: { level: 0, tensionKey: 'calm' },
    discovered: ['node-a'],
    activeThreats: ['threat-1'],
    chapterVariables: { bossHp: 3 },
  };
}

const p = (
  partial: Omit<StatePath, 'container'> & { container: StatePath['container'] },
): StatePath => partial as StatePath;

describe('resolveStatePath (T003)', () => {
  it('reads flags and chapterVariables', () => {
    expect(resolveStatePath(baseState(), p({ container: 'flags', key: 'torchLit' }))).toBe(true);
    expect(resolveStatePath(baseState(), p({ container: 'flags', key: 'gold' }))).toBe(3);
    expect(resolveStatePath(baseState(), p({ container: 'chapterVariables', key: 'bossHp' }))).toBe(
      3,
    );
  });

  it('reads npc simple fields and composite flags.<subkey>', () => {
    const state = baseState();
    expect(resolveStatePath(state, p({ container: 'npc', key: 'guide', field: 'present' }))).toBe(
      true,
    );
    expect(resolveStatePath(state, p({ container: 'npc', key: 'guide', field: 'alive' }))).toBe(
      true,
    );
    expect(
      resolveStatePath(state, p({ container: 'npc', key: 'guide', field: 'disposition' })),
    ).toBe('FRIENDLY');
    expect(
      resolveStatePath(state, p({ container: 'npc', key: 'guide', field: 'flags.knowsSecret' })),
    ).toBe(false);
  });

  it('reads danger fields (key unused — danger is a singleton)', () => {
    const state = baseState();
    expect(
      resolveStatePath(state, p({ container: 'danger', key: 'ignored', field: 'level' })),
    ).toBe(0);
    expect(
      resolveStatePath(state, p({ container: 'danger', key: 'ignored', field: 'tensionKey' })),
    ).toBe('calm');
  });

  it('reads discovered / activeThreats as membership booleans', () => {
    const state = baseState();
    expect(resolveStatePath(state, p({ container: 'discovered', key: 'node-a' }))).toBe(true);
    expect(resolveStatePath(state, p({ container: 'discovered', key: 'node-b' }))).toBe(false);
    expect(resolveStatePath(state, p({ container: 'activeThreats', key: 'threat-1' }))).toBe(true);
  });

  it('unsupported addressing returns undefined instead of throwing', () => {
    const state = baseState();
    expect(
      resolveStatePath(state, p({ container: 'npc', key: 'guide', field: 'bogus' })),
    ).toBeUndefined();
    expect(resolveStatePath(state, p({ container: 'npc', key: 'guide' }))).toBeUndefined();
    expect(
      resolveStatePath(state, p({ container: 'danger', key: 'x', field: 'bogus' })),
    ).toBeUndefined();
    expect(
      resolveStatePath(state, p({ container: 'npc', key: 'ghost', field: 'present' })),
    ).toBeUndefined();
  });
});

describe('writeStatePath (T003)', () => {
  it('immutably writes flags / chapterVariables / npc / danger', () => {
    const state = baseState();
    const next = writeStatePath(state, p({ container: 'flags', key: 'torchLit' }), false);
    expect(state.flags.torchLit).toBe(true); // original untouched
    expect(next.flags.torchLit).toBe(false);
    expect(next.sceneId).toBe(state.sceneId); // unchanged branches shared
    expect(next).not.toBe(state);

    const withNpc = writeStatePath(
      state,
      p({ container: 'npc', key: 'guide', field: 'flags.knowsSecret' }),
      true,
    );
    expect(state.npc['guide']!.flags.knowsSecret).toBe(false);
    expect(withNpc.npc['guide']!.flags.knowsSecret).toBe(true);

    const withDanger = writeStatePath(
      state,
      p({ container: 'danger', key: 'x', field: 'level' }),
      5,
    );
    expect(state.danger.level).toBe(0);
    expect(withDanger.danger.level).toBe(5);
  });

  it('returns the unchanged state for unsupported writes (discovered / bad field / missing npc)', () => {
    const state = baseState();
    expect(writeStatePath(state, p({ container: 'discovered', key: 'x' }), 'v')).toBe(state);
    expect(writeStatePath(state, p({ container: 'npc', key: 'guide', field: 'bogus' }), 1)).toBe(
      state,
    );
    expect(
      writeStatePath(state, p({ container: 'npc', key: 'ghost', field: 'present' }), true),
    ).toBe(state);
  });
});
