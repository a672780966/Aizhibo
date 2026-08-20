import type { CompileResult } from '@interactive-story/chapter-compiler';
import type { SceneNode, WorldState } from '@interactive-story/chapter-schema';
import { resolveGuard } from '@interactive-story/rule-engine';

/** The scene currently being performed (by id), retrieved from compiled data. */
export function currentScene(
  compiled: CompileResult | null | undefined,
  sceneId: string,
): SceneNode | undefined {
  return compiled?.schemaResult.scenes.passed.find((e) => e.value.id === sceneId)?.value;
}

/** The scene the session starts at (initial state's sceneId, if present). */
export function firstSceneId(compiled: CompileResult | null | undefined): string {
  return compiled?.schemaResult.initialState.passed?.sceneId ?? '';
}

/** The story graph's entry node id (scenes are keyed by story graph node id). */
export function entrySceneId(compiled: CompileResult | null | undefined): string {
  return compiled?.schemaResult.manifest.passed?.entryNodeId ?? '';
}

/**
 * The next scene id to advance to after the current scene finishes, or
 * undefined when the story has run out of plain SCENE nodes (e.g. the next
 * hop is an ENDING/BOSS, or there is none) — in which case CHAPTER_END fires.
 */
export function resolveNextScene(
  compiled: CompileResult | null | undefined,
  sceneId: string,
  world: WorldState,
): string | undefined {
  const scene = currentScene(compiled, sceneId);
  if (scene === undefined) return undefined;

  // guard-first: a matching SceneGuard's `goto` wins over the raw `next`
  let next: string | undefined;
  if (scene.guards !== undefined && scene.guards.length > 0) {
    next = resolveGuard(scene.guards, world);
  }
  if (next === undefined) {
    if (scene.interactionId !== undefined) {
      const interaction = compiled?.schemaResult.interactions.passed.find(
        (i) => i.value.id === scene.interactionId,
      )?.value;
      next = interaction?.nextScene;
    } else {
      next = scene.next;
    }
  }
  if (next === undefined) return undefined;
  // only advance into another SCENE node; a BOSS/ENDING hop ends the chapter loop
  return compiled?.schemaResult.scenes.passed.some((e) => e.value.id === next) ? next : undefined;
}

/**
 * The STORY region (spec §6, 10 states). This is the phase authority of the
 * whole machine (CR-005): every other region derives its phase here, never
 * keeps its own copy. Transitions reference named actions/guards that
 * `machine.ts` implements — this file keeps the full state topology and the
 * branch conditions explicit.
 *
 *   BOOT -> CHAPTER_LOADING -> SCENE_ENTER -> STORY_PLAYING
 *     - STORY_PLAYING: -> INTERACTION_PENDING (scene has interaction)
 *     - STORY_PLAYING: -> TRANSITION (no interaction)
 *   INTERACTION_PENDING -> RESOLUTION_PENDING -> RESULT_PLAYING
 *     - RESULT_PLAYING: -> TRANSITION (next scene) | CHAPTER_END
 *   TRANSITION -> SCENE_ENTER (next scene loop)
 *   CHAPTER_LOADING failed -> ERROR
 */
export const storyRegion = {
  initial: 'BOOT' as const,
  states: {
    BOOT: {
      on: { BOOT: { target: 'CHAPTER_LOADING', actions: 'onBoot' } },
    },
    CHAPTER_LOADING: {
      entry: 'onCompile',
      always: [
        { guard: 'compilePassed', target: 'SCENE_ENTER', actions: 'onChapterLoaded' },
        { target: 'ERROR', actions: 'onError' },
      ],
    },
    SCENE_ENTER: {
      entry: 'onSceneEnter',
      always: { target: 'STORY_PLAYING', actions: 'onStoryPlaying' },
    },
    STORY_PLAYING: {
      on: {
        'STORY.DONE': [
          {
            guard: 'storyHasInteraction',
            target: 'INTERACTION_PENDING',
            actions: 'onToInteraction',
          },
          { guard: 'hasNextScene', target: 'TRANSITION', actions: 'onToTransition' },
          { target: 'CHAPTER_END', actions: 'onChapterEnd' },
        ],
      },
    },
    INTERACTION_PENDING: {
      always: [
        {
          guard: 'interactionResolved',
          target: 'RESOLUTION_PENDING',
          actions: 'onResolutionPending',
        },
      ],
    },
    RESOLUTION_PENDING: {
      always: { target: 'RESULT_PLAYING', actions: 'onResultPlaying' },
    },
    RESULT_PLAYING: {
      on: {
        'NARRATIVE.DONE': [
          { guard: 'hasNextScene', target: 'TRANSITION', actions: 'onNextScene' },
          { target: 'CHAPTER_END', actions: 'onChapterEnd' },
        ],
      },
    },
    TRANSITION: {
      entry: 'onTransitionAdvance',
      always: { target: 'SCENE_ENTER' },
    },
    CHAPTER_END: { description: 'chapter finished (phase authority is STORY)' },
    ERROR: { description: 'chapter loading/recovery failed (phase authority is STORY)' },
  },
};
