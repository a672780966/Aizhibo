import { assign, createActor, createMachine, type MachineConfig } from 'xstate';
import { compile, type CompileResult } from '@interactive-story/chapter-compiler';
import type { ResultNarrative, WorldState } from '@interactive-story/chapter-schema';
import { composeResultSetNarration } from '@interactive-story/narrative-composer';
import type { ResolveResult } from '@interactive-story/rule-engine';
import type { RuntimeEvent, Visibility } from './event.js';
import type { InternalSnapshot, RuntimeSnapshot } from './snapshot.js';
import { wrapSnapshot } from './snapshot.js';
import type { Ports } from './ports.js';
import { defaultPorts } from './ports.js';
import type { AudioResolutionResult } from '@interactive-story/audio-engine';
import { resolveResultAudio } from './resultAudioResolution.js';
import { currentScene, firstSceneId, resolveNextScene, storyRegion } from './storyRegion.js';
import { resolveVisualLayers } from './visualResolution.js';
import { resolveCameraPreset } from './cameraResolution.js';
import { resolveSceneAudio } from './audioResolution.js';
import { resolveCharacterPlacements } from './characterResolution.js';
import { resolveVisibleChoices } from './choiceResolution.js';
import {
  applyVote,
  buildNarrativeInputs,
  interactionRegion,
  resolveGroups,
} from './interactionRegion.js';
import { presentationRegion } from './presentationRegion.js';
import { audioRegion } from './audioRegion.js';
import { hostRegion, platformRegion, safetyRegion } from './placeholderRegions.js';
import type { Snapshot } from 'xstate';

export interface RuntimeContext {
  ports: Ports;
  chapterRootDir: string;
  seed: string;
  sessionId: string;
  snapshot: InternalSnapshot;
  eventLog: RuntimeEvent[];
  compiled: CompileResult | null;
  currentSceneId: string;
  votes: Record<string, string>;
  resolved: ResolveResult[];
  narrationText: string;
  resultAudio: AudioResolutionResult | undefined;
}

export type RootEvent =
  | { type: 'BOOT' }
  | { type: 'STORY.DONE' }
  | { type: 'INTERACTION.OPEN' }
  | { type: 'VOTE'; viewerId: string; choiceId: string }
  | { type: 'LOCK' }
  | { type: 'NARRATIVE.DONE' }
  | { type: 'ASSETS.READY' }
  | { type: 'ASSETS.FAIL' }
  | { type: 'AUDIO.PREPARE' }
  | { type: 'AUDIO.READY' }
  | { type: 'AUDIO.FAIL' }
  | { type: 'AUDIO.DUCK' }
  | { type: 'AUDIO.UNDUCK' }
  | { type: 'AUDIO.STOP' }
  | { type: 'AUDIO.PLAY_HOST' };

type EmitEntry = { type: string; payload: unknown; visibility?: Visibility };

function emptyWorld(): WorldState {
  return {
    chapterId: '',
    sceneId: '',
    flags: {},
    npc: {},
    danger: { level: 0, tensionKey: 'calm' },
    discovered: [],
    activeThreats: [],
    chapterVariables: {},
  };
}

function initialSnapshot(): InternalSnapshot {
  return {
    world: emptyWorld(),
    sequenceCounter: 0,
    firedRuleIds: [],
    storyPhase: 'BOOT',
    interactionPhase: 'CLOSED',
  };
}

/** Append events (each bumping the global sequence counter) — the only way the log grows. */
function emitLog(
  ctx: RuntimeContext,
  entries: EmitEntry[],
): Pick<RuntimeContext, 'eventLog' | 'snapshot'> {
  let seq = ctx.snapshot.sequenceCounter;
  const appended: RuntimeEvent[] = [];
  for (const entry of entries) {
    seq += 1;
    appended.push({
      id: `ev-${seq}`,
      sequence: seq,
      timestamp: new Date(ctx.ports.clock.now()).toISOString(),
      type: entry.type,
      payload: entry.payload,
      chapterId: ctx.snapshot.world.chapterId,
      sessionId: ctx.sessionId,
      visibility: entry.visibility ?? 'PUBLIC',
    });
  }
  return {
    eventLog: [...ctx.eventLog, ...appended],
    snapshot: { ...ctx.snapshot, sequenceCounter: seq },
  };
}

function storyMove(
  ctx: RuntimeContext,
  to: string,
  type: string,
  payload?: unknown,
): Pick<RuntimeContext, 'eventLog' | 'snapshot'> {
  const emitted = emitLog(ctx, [{ type, payload }]);
  return { eventLog: emitted.eventLog, snapshot: { ...emitted.snapshot, storyPhase: to } };
}

function interactionMove(
  ctx: RuntimeContext,
  to: string,
  type: string,
  payload?: unknown,
): Pick<RuntimeContext, 'eventLog' | 'snapshot'> {
  const emitted = emitLog(ctx, [{ type, payload }]);
  return { eventLog: emitted.eventLog, snapshot: { ...emitted.snapshot, interactionPhase: to } };
}

/**
 * The runtime actor surface the kernel exposes. De-coupled from XState's own
 * `Actor<...>` generic (whose generated declaration carries `any` type args)
 * so the package's public .d.ts stays lint-clean; the XState actor returned by
 * `createActor` structurally satisfies this interface.
 */
export interface RuntimeActor {
  send(event: RootEvent): void;
  /** `context` is intentionally opaque (`unknown`) so the internal snapshot structure never leaks. */
  getSnapshot(): { value: unknown; context: unknown };
}

export function createRuntimeMachine(input: {
  ports?: Partial<Ports>;
  chapterRootDir: string;
  seed: string;
}): RuntimeActor {
  const ports: Ports = { ...defaultPorts, ...(input.ports ?? {}) };
  const actor = createActor(makeRuntimeMachine(ports, input.chapterRootDir, input.seed));
  actor.start();
  return actor as RuntimeActor;
}

function makeRuntimeMachine(ports: Ports, chapterRootDir: string, seed: string) {
  const sessionId = `session-${seed}`;

  const config: MachineConfig<RuntimeContext, RootEvent> = {
    id: 'runtime',
    type: 'parallel',
    context: {
      ports,
      chapterRootDir,
      seed,
      sessionId,
      snapshot: initialSnapshot(),
      eventLog: [],
      compiled: null,
      currentSceneId: '',
      votes: {},
      resolved: [],
      narrationText: '',
      resultAudio: undefined,
    },
    states: {
      story: storyRegion,
      interaction: interactionRegion,
      presentation: presentationRegion,
      audio: audioRegion,
      host: hostRegion,
      platform: platformRegion,
      safety: safetyRegion,
    },
  };

  return createMachine(config, {
    actions: {
      // ---- STORY ----
      onBoot: assign(({ context }) =>
        storyMove(context, 'CHAPTER_LOADING', 'STORY.BOOT_TO_CHAPTER_LOADING'),
      ),
      onCompile: assign(({ context }) => {
        let compiled: RuntimeContext['compiled'];
        try {
          compiled = compile(context.chapterRootDir);
        } catch {
          compiled = null;
        }
        const sceneId = (compiled ? firstSceneId(compiled) : '') || '';
        const emitted = emitLog(context, [
          { type: 'STORY.CHAPTER_LOADING', payload: { passed: compiled?.passed ?? false } },
        ]);
        return {
          ...emitted,
          compiled,
          currentSceneId: sceneId,
          snapshot: {
            ...emitted.snapshot,
            storyPhase: 'CHAPTER_LOADING',
            world: compiled?.schemaResult.initialState.passed ?? context.snapshot.world,
          },
        };
      }),
      onChapterLoaded: assign(({ context }) =>
        storyMove(context, 'SCENE_ENTER', 'STORY.CHAPTER_LOADED'),
      ),
      onSceneEnter: assign(({ context }) => {
        const scene =
          context.compiled !== null
            ? currentScene(context.compiled, context.currentSceneId)
            : undefined;
        const layers =
          context.compiled !== null && scene !== undefined
            ? resolveVisualLayers(context.compiled, scene.visualSceneId)
            : [];
        const characters =
          context.compiled !== null && scene !== undefined
            ? resolveCharacterPlacements(context.compiled, scene.characters)
            : [];
        context.ports.presentation.send({
          kind: 'SCENE_ENTER',
          sceneId: context.currentSceneId,
          visualSceneId: scene?.visualSceneId,
          layers,
          characters,
          narration: scene?.narration ?? [],
          cameraPreset:
            context.compiled !== null && scene !== undefined
              ? resolveCameraPreset(context.compiled, scene.visualSceneId)
              : undefined,
          audio:
            context.compiled !== null && scene !== undefined
              ? resolveSceneAudio(context.compiled, scene)
              : { ambience: [] },
        });
        context.ports.audio.send({ kind: 'SCENE_ENTER', sceneId: context.currentSceneId });
        return storyMove(context, 'SCENE_ENTER', 'STORY.SCENE_READY', {
          sceneId: context.currentSceneId,
        });
      }),
      onStoryPlaying: assign(({ context }) => storyMove(context, 'STORY_PLAYING', 'STORY.PLAYING')),
      onToInteraction: assign(({ context }) =>
        storyMove(context, 'INTERACTION_PENDING', 'STORY.INITIATE_INTERACTION'),
      ),
      onToTransition: assign(({ context }) => {
        const next =
          context.compiled !== null
            ? resolveNextScene(context.compiled, context.currentSceneId, context.snapshot.world)
            : undefined;
        const emitted = storyMove(context, 'TRANSITION', 'STORY.PLAYING_ENDED', {
          nextScene: next,
        });
        return { ...emitted, currentSceneId: next ?? context.currentSceneId };
      }),
      onResolutionPending: assign(({ context }) =>
        storyMove(context, 'RESOLUTION_PENDING', 'STORY.INTERACTION_RESOLVED'),
      ),
      onResultPlaying: assign(({ context }) => {
        context.ports.presentation.send({
          kind: 'RESULT_PLAYING',
          text: context.narrationText,
          audio: context.resultAudio,
        });
        return storyMove(context, 'RESULT_PLAYING', 'STORY.RESULT_PLAYING');
      }),
      onNextScene: assign(({ context }) => {
        const next =
          context.compiled !== null
            ? resolveNextScene(context.compiled, context.currentSceneId, context.snapshot.world)
            : undefined;
        const emitted = storyMove(context, 'TRANSITION', 'STORY.RESULT_DONE', { nextScene: next });
        return { ...emitted, currentSceneId: next ?? context.currentSceneId };
      }),
      onChapterEnd: assign(({ context }) => storyMove(context, 'CHAPTER_END', 'STORY.CHAPTER_END')),
      onTransitionAdvance: assign(({ context }) =>
        storyMove(context, 'TRANSITION', 'STORY.TRANSITION'),
      ),
      onError: assign(({ context }) => storyMove(context, 'ERROR', 'STORY.ERROR')),

      // ---- INTERACTION ----
      onAnnouncing: assign(({ context }) =>
        interactionMove(context, 'ANNOUNCING', 'INTERACTION.ANNOUNCING'),
      ),
      onOpen: assign(({ context }) => {
        const scene =
          context.compiled !== null
            ? currentScene(context.compiled, context.currentSceneId)
            : undefined;
        const interaction =
          context.compiled !== null && scene?.interactionId !== undefined
            ? context.compiled.schemaResult.interactions.passed.find(
                (i) => i.value.id === scene.interactionId,
              )?.value
            : undefined;
        const choices =
          interaction !== undefined
            ? resolveVisibleChoices(interaction, context.snapshot.world)
            : [];
        context.ports.presentation.send({
          kind: 'INTERACTION_OPEN',
          choices,
          openDurationMs: interaction?.openDurationMs,
        });
        return interactionMove(context, 'OPEN', 'INTERACTION.OPEN');
      }),
      onVote: assign(({ context, event }) => {
        const e = event as { type: 'VOTE'; viewerId: string; choiceId: string };
        const votes = applyVote(context.votes, e.viewerId, e.choiceId);
        const emitted = emitLog(context, [
          { type: 'INTERACTION.VOTE', payload: { viewerId: e.viewerId, choiceId: e.choiceId } },
        ]);
        return { ...emitted, votes };
      }),
      onLock: assign(({ context }) => {
        context.ports.presentation.send({ kind: 'DICE_INTRO' });
        return interactionMove(context, 'LOCKING', 'INTERACTION.LOCKING');
      }),
      onResolve: assign(({ context }) => {
        if (context.compiled === null) return {};
        const scene = currentScene(context.compiled, context.currentSceneId);
        const interaction = scene?.interactionId
          ? context.compiled.schemaResult.interactions.passed.find(
              (i) => i.value.id === scene.interactionId,
            )?.value
          : undefined;
        if (interaction === undefined) {
          const emitted = emitLog(context, [{ type: 'INTERACTION.NO_ACTION', payload: {} }]);
          return { ...emitted, snapshot: { ...emitted.snapshot, interactionPhase: 'RESOLVED' } };
        }
        const outcome = resolveGroups(
          context.compiled,
          context.votes,
          context.snapshot.world,
          context.seed,
          context.snapshot.sequenceCounter,
          interaction,
        );
        context.ports.presentation.send({
          kind: 'DICE_RESULT',
          results: outcome.diceRecords.map((d) => ({
            diceType: d.diceType,
            rawValue: d.rawValue,
            modifier: d.modifier,
            finalValue: d.finalValue,
            quality: d.quality,
          })),
        });
        const { resultNarratives, blocksById } = buildNarrativeInputs(context.compiled);
        const narratives: ResultNarrative[] = outcome.resolved
          .map((r) => resultNarratives.get(r.narrativeId))
          .filter((n): n is ResultNarrative => n !== undefined);
        const narrationText =
          narratives.length > 0
            ? composeResultSetNarration(narratives, blocksById, outcome.nextWorld).text
            : '';
        const diceEntries: EmitEntry[] = outcome.diceRecords.flatMap((record) => [
          { type: 'DICE.REQUESTED', payload: record, visibility: 'PUBLIC' },
          { type: 'DICE.ROLLED', payload: record, visibility: 'HIDDEN' },
          { type: 'DICE.PUBLISHED', payload: record, visibility: 'PUBLIC' },
        ]);
        const emitted = emitLog(context, [...diceEntries]);
        const resultAudio = resolveResultAudio(
          outcome.resolved,
          narrationText,
          context.ports.audioResolution,
        );
        return {
          ...emitted,
          resolved: outcome.resolved,
          narrationText,
          resultAudio,
          votes: {},
          snapshot: { ...emitted.snapshot, interactionPhase: 'LOCKED', world: outcome.nextWorld },
        };
      }),
      onResolved: assign(({ context }) =>
        interactionMove(context, 'RESOLVED', 'INTERACTION.RESOLVED'),
      ),

      // ---- PRESENTATION (skeleton) ----
      presLoading: assign(({ context }) => {
        context.ports.presentation.send({ kind: 'PRES_LOADING' });
        return {};
      }),
      presReady: assign(({ context }) => {
        context.ports.presentation.send({ kind: 'PRES_READY' });
        return {};
      }),
      presFailover: assign(({ context }) => {
        context.ports.presentation.send({ kind: 'PRES_FAILOVER' });
        return {};
      }),

      // ---- AUDIO (skeleton) ----
      audioPreparing: assign(({ context }) => {
        context.ports.audio.send({ kind: 'AUDIO_PREPARING' });
        return {};
      }),
      audioPlayStory: assign(({ context }) => {
        context.ports.audio.send({ kind: 'AUDIO_PLAY_STORY' });
        return {};
      }),
      audioError: assign(({ context }) => {
        context.ports.audio.send({ kind: 'AUDIO_ERROR' });
        return {};
      }),
      audioDuck: assign(({ context }) => {
        context.ports.audio.send({ kind: 'AUDIO_DUCK' });
        return {};
      }),
      audioStop: assign(({ context }) => {
        context.ports.audio.send({ kind: 'AUDIO_STOP' });
        return {};
      }),
      audioPlayHost: assign(({ context }) => {
        context.ports.audio.send({ kind: 'AUDIO_PLAY_HOST' });
        return {};
      }),
    },
    guards: {
      compilePassed: ({ context }) => context.compiled?.passed === true,
      storyHasInteraction: ({ context }) => {
        if (context.compiled === null) return false;
        const scene = currentScene(context.compiled, context.currentSceneId);
        return scene?.interactionId !== undefined;
      },
      interactionResolved: ({ context }) => context.snapshot.interactionPhase === 'RESOLVED',
      hasNextScene: ({ context }) =>
        context.compiled !== null &&
        resolveNextScene(context.compiled, context.currentSceneId, context.snapshot.world) !==
          undefined,
    },
  });
}

/** Read the current opaque runtime snapshot from the actor. */
export function getRuntimeSnapshot(actor: RuntimeActor): RuntimeSnapshot {
  const ctx = (actor as InternalActor).getSnapshot().context;
  return wrapSnapshot(ctx.snapshot);
}

/** Read-only, copy-safe view of the accumulated event log. */
export function getEventLog(actor: RuntimeActor): readonly RuntimeEvent[] {
  const ctx = (actor as InternalActor).getSnapshot().context;
  return ctx.eventLog.map((e) => ({ ...e }));
}

/** Package-internal actor view: the real context shape, not part of the public surface. */
interface InternalActor {
  getSnapshot(): { value: unknown; context: RuntimeContext };
}

/** Return the publicly visible choices for the actor's current scene. */
export function getCurrentChoiceIds(actor: RuntimeActor): string[] {
  const ctx = (actor as InternalActor).getSnapshot().context;
  if (ctx.compiled === null) return [];

  const scene = currentScene(ctx.compiled, ctx.currentSceneId);
  if (scene?.interactionId === undefined) return [];

  const interaction = ctx.compiled.schemaResult.interactions.passed.find(
    (entry) => entry.value.id === scene.interactionId,
  )?.value;
  return interaction?.choices.map((choice) => choice.id) ?? [];
}

/** Return XState's complete persisted actor state without exposing its shape. */
export function getPersistedSnapshot(actor: RuntimeActor): unknown {
  return (actor as RuntimeActor & { getPersistedSnapshot(): unknown }).getPersistedSnapshot();
}

/** Restore a runtime actor from an XState persisted snapshot. */
export function restoreRuntimeMachine(input: {
  ports?: Partial<Ports>;
  chapterRootDir: string;
  seed: string;
  persisted: unknown;
}): RuntimeActor {
  const ports: Ports = { ...defaultPorts, ...(input.ports ?? {}) };
  const actor = createActor(makeRuntimeMachine(ports, input.chapterRootDir, input.seed), {
    snapshot: input.persisted as Snapshot<unknown>,
  });
  actor.start();
  (actor as InternalActor).getSnapshot().context.ports = ports;
  return actor as RuntimeActor;
}
