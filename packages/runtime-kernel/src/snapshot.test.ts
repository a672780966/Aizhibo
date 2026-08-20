import { describe, expect, it } from 'vitest';
import type { WorldState } from '@interactive-story/chapter-schema';
import {
  type InternalSnapshot,
  type RuntimeSnapshot,
  getInteractionPhase,
  getSequenceNumber,
  getStoryPhase,
  unwrapSnapshot,
  wrapSnapshot,
} from './snapshot.js';

function world(): WorldState {
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

function internal(): InternalSnapshot {
  return {
    world: world(),
    sequenceCounter: 7,
    firedRuleIds: ['r1'],
    storyPhase: 'SCENE_ENTER',
    interactionPhase: 'OPEN',
  };
}

describe('snapshot opaque type + accessors (T004)', () => {
  it('wrap/unwrap round-trips the internal snapshot', () => {
    const inner = internal();
    const wrapped = wrapSnapshot(inner);
    expect(unwrapSnapshot(wrapped)).toEqual(inner);
  });

  it('accessors read primitive values only', () => {
    const s: RuntimeSnapshot = wrapSnapshot(internal());
    expect(getStoryPhase(s)).toBe('SCENE_ENTER');
    expect(getInteractionPhase(s)).toBe('OPEN');
    expect(getSequenceNumber(s)).toBe(7);
  });

  it('RuntimeSnapshot is NOT structurally assignable to the internal world-bearing shape', () => {
    // Brand type is opaque: external code must not be able to write
    // snapshot.world.flags.x directly.
    const s: RuntimeSnapshot = wrapSnapshot(internal());
    // @ts-expect-error — RuntimeSnapshot intentionally has no `world` field
    const leak: { world: WorldState } = s;
    void leak;
    // @ts-expect-error — and no field access path either
    const f = s.world;
    void f;
  });
});
