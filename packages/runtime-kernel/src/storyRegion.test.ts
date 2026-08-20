import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compile } from '@interactive-story/chapter-compiler';
import { currentScene, firstSceneId, resolveNextScene, storyRegion } from './storyRegion.js';

const fixture = fileURLToPath(
  new URL('../../chapter-compiler/test-fixtures/valid-minimal', import.meta.url),
);

describe('storyRegion (T005)', () => {
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
    expect(resolveNextScene(compiled, 'scene-start')).toBeUndefined();
  });

  it('currentScene is defensive when compiled is unavailable', () => {
    expect(currentScene(null, 'x')).toBeUndefined();
    expect(resolveNextScene(null, 'x')).toBeUndefined();
  });
});
