import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { CompileResult } from '@interactive-story/chapter-compiler';
import type { WorldState } from '@interactive-story/chapter-schema';
import { compile } from '@interactive-story/chapter-compiler';
import { currentScene, firstSceneId, resolveNextScene, storyRegion } from './storyRegion.js';
import { createRuntimeMachine } from './machine.js';

const fixture = fileURLToPath(
  new URL('../../chapter-compiler/test-fixtures/valid-minimal', import.meta.url),
);

function worldOf(compiled: CompileResult): WorldState {
  return (
    compiled.schemaResult.initialState.passed ?? {
      chapterId: 'c',
      sceneId: 'x',
      flags: {},
      npc: {},
      danger: { level: 0, tensionKey: 'calm' },
      discovered: [],
      activeThreats: [],
      chapterVariables: {},
    }
  );
}

/** A minimal compiled with a guarded scene: guard matches -> 'guarded-next', else 'fallback'. */
function guardedCompiled(): CompileResult {
  return {
    schemaResult: {
      scenes: {
        passed: [
          {
            file: 'scenes/s1.json',
            value: {
              id: 's1',
              visualSceneId: 'v',
              characters: [],
              hostPolicy: 'ALLOWED',
              next: 'fallback',
              guards: [
                {
                  when: { path: { container: 'flags', key: 'open' }, op: 'EQ', value: true },
                  goto: 'guarded-next',
                  priority: 1,
                },
              ],
            },
          },
          {
            file: 'scenes/guarded-next.json',
            value: {
              id: 'guarded-next',
              visualSceneId: 'v',
              characters: [],
              hostPolicy: 'ALLOWED',
            },
          },
          {
            file: 'scenes/fallback.json',
            value: { id: 'fallback', visualSceneId: 'v', characters: [], hostPolicy: 'ALLOWED' },
          },
        ],
        failed: [],
      },
      interactions: { passed: [], failed: [] },
    },
  } as unknown as CompileResult;
}

describe('storyRegion (T005 + FIX-T02)', () => {
  it('declares the full 10-state topology from spec §6', () => {
    expect(Object.keys(storyRegion.states).sort()).toEqual([
      'BOOT',
      'CHAPTER_END',
      'CHAPTER_LOADING',
      'ERROR',
      'INTERACTION_PENDING',
      'RESOLUTION_PENDING',
      'RESULT_PLAYING',
      'SCENE_ENTER',
      'STORY_PLAYING',
      'TRANSITION',
    ]);
    expect(storyRegion.initial).toBe('BOOT');
  });

  it('currentScene / firstSceneId resolve from compiled valid-minimal', () => {
    const compiled = compile(fixture);
    expect(firstSceneId(compiled)).toBe('scene-start');
    const scene = currentScene(compiled, 'scene-start');
    expect(scene?.id).toBe('scene-start');
    expect(scene?.interactionId).toBe('interaction-01');
    expect(currentScene(compiled, 'ghost')).toBeUndefined();
  });

  it('resolveNextScene returns undefined for a BOSS/ENDING hop (chapter ends)', () => {
    const compiled = compile(fixture);
    // interaction-01.nextScene = ending-end (an ENDING node, not a SCENE)
    expect(resolveNextScene(compiled, 'scene-start', worldOf(compiled))).toBeUndefined();
  });

  it('resolveNextScene honours a matching SceneGuard goto over the raw next (FIX-T02)', () => {
    const compiled = guardedCompiled();
    const flagsOn: WorldState = {
      chapterId: 'c',
      sceneId: 's1',
      flags: { open: true },
      npc: {},
      danger: { level: 0, tensionKey: 'calm' },
      discovered: [],
      activeThreats: [],
      chapterVariables: {},
    };
    const flagsOff: WorldState = { ...flagsOn, flags: {} };
    expect(resolveNextScene(compiled, 's1', flagsOn)).toBe('guarded-next');
    expect(resolveNextScene(compiled, 's1', flagsOff)).toBe('fallback');
  });

  it('STORY enters ERROR when chapter compilation fails (FIX-T02)', () => {
    const actor = createRuntimeMachine({
      chapterRootDir: '/nonexistent/definitely-missing-dir',
      seed: 's-err',
    });
    actor.send({ type: 'BOOT' });
    expect((actor.getSnapshot().value as Record<string, unknown>).story).toBe('ERROR');
  });

  it('currentScene is defensive when compiled is unavailable', () => {
    expect(currentScene(null, 'x')).toBeUndefined();
    const w: WorldState = {
      chapterId: 'c',
      sceneId: 'x',
      flags: {},
      npc: {},
      danger: { level: 0, tensionKey: 'calm' },
      discovered: [],
      activeThreats: [],
      chapterVariables: {},
    };
    expect(resolveNextScene(null, 'x', w)).toBeUndefined();
  });
});
