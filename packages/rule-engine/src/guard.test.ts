import { describe, expect, it } from 'vitest';
import type { SceneGuard, WorldState } from '@interactive-story/chapter-schema';
import { resolveGuard } from './guard.js';

function baseState(): WorldState {
  return {
    chapterId: 'c',
    sceneId: 's1',
    flags: { doorOpen: false, hasKey: true },
    npc: {},
    danger: { level: 0, tensionKey: 'calm' },
    discovered: [],
    activeThreats: [],
    chapterVariables: {},
  };
}

describe('resolveGuard (T007)', () => {
  it('selects the highest-priority guard whose when holds, regardless of array position', () => {
    // hasKey true, doorOpen false. Guard with key is present but lower priority;
    // the never-true door guard has higher priority. Highest-priority held = key one.
    const guards: SceneGuard[] = [
      {
        when: { path: { container: 'flags', key: 'doorOpen' }, op: 'EQ', value: true },
        goto: 'scene-locked',
        priority: 100,
      },
      {
        when: { path: { container: 'flags', key: 'hasKey' }, op: 'EQ', value: true },
        goto: 'scene-keydoor',
        priority: 20,
      },
      {
        when: { path: { container: 'flags', key: 'ghost' }, op: 'EXISTS' },
        goto: 'scene-missing',
        priority: 50,
      },
    ];
    expect(resolveGuard(guards, baseState())).toBe('scene-keydoor');
  });

  it('returns undefined when no guard holds', () => {
    const guards: SceneGuard[] = [
      {
        when: { path: { container: 'flags', key: 'doorOpen' }, op: 'EQ', value: true },
        goto: 'scene-locked',
        priority: 5,
      },
    ];
    expect(resolveGuard(guards, baseState())).toBeUndefined();
  });

  it('returns undefined for an empty guard list', () => {
    expect(resolveGuard([], baseState())).toBeUndefined();
  });
});
