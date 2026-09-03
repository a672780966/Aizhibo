import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import type { RuntimeEvent } from './event.js';
import { createRuntimeMachine, getEventLog, getRuntimeSnapshot, type Clock } from './machine.js';
import { instantClock } from './virtualPorts.js';
import { TARGET_DICE_MS } from './diceTiming.js';
import { getStoryPhase, getInteractionPhase } from './snapshot.js';

const fixture = fileURLToPath(
  new URL('../../chapter-compiler/test-fixtures/valid-minimal', import.meta.url),
);

/**
 * Build a throwaway no-interaction chapter (temp dir; `valid-minimal` never
 * modified) used by the FIX-02 story-advance / chapter-end tests: scene-start
 * (no interaction, next -> scene-b) -> scene-b (no interaction, next ->
 * ending-end, an ENDING therefore no next SCENE).
 */
function makeNoInteractionChapter(): string {
  const dir = mkdtempSync(join(tmpdir(), 'dev009-fix02-'));
  cpSync(fixture, dir, { recursive: true });
  writeFileSync(
    join(dir, 'scenes', 'scene-start.json'),
    JSON.stringify(
      {
        id: 'scene-start',
        visualSceneId: 'vs-start',
        narration: ['你站在森林入口。'],
        characters: [
          { characterId: 'npc-guide', slot: 'CENTER', expression: 'smile', visible: true },
        ],
        next: 'scene-b',
        hostPolicy: 'ALLOWED',
      },
      null,
      2,
    ) + '\n',
  );
  writeFileSync(
    join(dir, 'scenes', 'scene-b.json'),
    JSON.stringify(
      {
        id: 'scene-b',
        visualSceneId: 'vs-start',
        narration: ['你深入森林。'],
        characters: [{ characterId: 'npc-guide', slot: 'CENTER', visible: true }],
        next: 'ending-end',
        hostPolicy: 'ALLOWED',
      },
      null,
      2,
    ) + '\n',
  );
  writeFileSync(
    join(dir, 'story.graph.json'),
    JSON.stringify(
      {
        nodes: [
          { id: 'scene-start', kind: 'SCENE', file: 'scenes/scene-start.json' },
          { id: 'scene-b', kind: 'SCENE', file: 'scenes/scene-b.json' },
          { id: 'ending-end', kind: 'ENDING', file: 'endings/ending-end.json' },
        ],
      },
      null,
      2,
    ) + '\n',
  );
  writeFileSync(
    join(dir, 'interactions', 'interaction-a.json'),
    JSON.stringify({
      id: 'interaction-a',
      openDurationMs: 15000,
      choices: [],
      diceMode: 'PER_ACTION_GROUP',
      resultPolicy: 'none',
      nextScene: 'scene-b',
      noParticipationPolicy: { kind: 'SKIP' },
    }) + '\n',
  );
  // drop the interaction-based/interaction-boss files (scenes are now interaction-free)
  rmSync(join(dir, 'interactions', 'interaction-01.json'), { force: true });
  rmSync(join(dir, 'interactions', 'interaction-boss.json'), { force: true });
  rmSync(join(dir, 'boss', 'boss-tyrant.json'), { force: true });
  // disclose scene-b so PASS6 stays green
  const hostPath = join(dir, 'host.public.json');
  const host = JSON.parse(readFileSync(hostPath, 'utf8')) as {
    sceneDisclosures: Record<string, unknown>;
  };
  host.sceneDisclosures['scene-b'] = {
    locationLabel: '森林深处',
    knownFactIds: [],
    tensionKey: 'calm',
  };
  writeFileSync(hostPath, JSON.stringify(host, null, 2) + '\n');
  return dir;
}

function storyOf(actor: ReturnType<typeof createRuntimeMachine>): string {
  return (actor.getSnapshot().value as Record<string, unknown>).story as string;
}

describe('createRuntimeMachine end-to-end (T009)', () => {
  it('constructs with default ports (no real systems needed)', () => {
    const actor = createRuntimeMachine({ chapterRootDir: '/tmp/none', seed: 's1' });
    expect((actor.getSnapshot().value as Record<string, unknown>).story).toBe('BOOT');
    expect(getStoryPhase(getRuntimeSnapshot(actor))).toBe('BOOT');
  });

  it('public actor surface does not leak internal snapshot structure (FIX-T01 / A08)', () => {
    const actor = createRuntimeMachine({ chapterRootDir: '/tmp/none', seed: 's2' });
    const ctx = actor.getSnapshot().context; // typed as unknown — opaque
    // @ts-expect-error — the public context is opaque; internal fields are unreachable
    const leak = ctx.snapshot.world.flags;
    void leak;
    // @ts-expect-error — and not even the snapshot itself is reachable
    const leak2 = ctx.snapshot;
    void leak2;
  });

  it('runs the full chain: load -> scene -> interaction -> votes -> resolve -> narrative -> end', () => {
    const presentation: unknown[] = [];
    const audio: unknown[] = [];
    const actor = createRuntimeMachine({
      chapterRootDir: fixture,
      seed: 's1',
      clock: instantClock,
      ports: {
        presentation: { send: (c) => presentation.push(c) },
        audio: { send: (c) => audio.push(c) },
      },
    });

    // BOOT -> ... -> STORY_PLAYING (auto transient chain after compile)
    actor.send({ type: 'BOOT' });
    expect((actor.getSnapshot().value as Record<string, unknown>).story).toBe('STORY_PLAYING');
    expect(getStoryPhase(getRuntimeSnapshot(actor))).toBe('STORY_PLAYING');

    // scene has interaction-01 -> INTERACTION_PENDING
    actor.send({ type: 'STORY.DONE' });
    expect((actor.getSnapshot().value as Record<string, unknown>).story).toBe(
      'INTERACTION_PENDING',
    );

    // open interaction -> OPEN (auto ANNOUNCING)
    actor.send({ type: 'INTERACTION.OPEN' });
    expect((actor.getSnapshot().value as Record<string, unknown>).interaction).toBe('OPEN');

    // votes: u1 and u2 pick A; u1 changes to B then back to A (last wins)
    actor.send({ type: 'VOTE', viewerId: 'u1', choiceId: 'A' });
    actor.send({ type: 'VOTE', viewerId: 'u2', choiceId: 'B' });
    actor.send({ type: 'VOTE', viewerId: 'u1', choiceId: 'B' });
    actor.send({ type: 'VOTE', viewerId: 'u1', choiceId: 'A' });

    // lock -> resolve -> interaction RESOLVED, story auto -> RESULT_PLAYING
    actor.send({ type: 'LOCK' });
    expect((actor.getSnapshot().value as Record<string, unknown>).interaction).toBe('RESOLVED');
    expect(getInteractionPhase(getRuntimeSnapshot(actor))).toBe('RESOLVED');
    expect((actor.getSnapshot().value as Record<string, unknown>).story).toBe('RESULT_PLAYING');

    // narrative done -> no next SCENE -> CHAPTER_END
    actor.send({ type: 'NARRATIVE.DONE' });
    expect((actor.getSnapshot().value as Record<string, unknown>).story).toBe('CHAPTER_END');
    expect(getStoryPhase(getRuntimeSnapshot(actor))).toBe('CHAPTER_END');

    // presentation/audio got scene commands during the run
    expect(presentation.some((c) => (c as { kind: string }).kind === 'SCENE_ENTER')).toBe(true);
    expect(audio.some((c) => (c as { kind: string }).kind === 'SCENE_ENTER')).toBe(true);
  });

  it('DEV-031: default ports → RESULT_PLAYING carries honest SUBTITLE_ONLY audio', () => {
    const presentation: unknown[] = [];
    const actor = createRuntimeMachine({
      chapterRootDir: fixture,
      seed: 's-ra-default',
      clock: instantClock,
      ports: { presentation: { send: (c) => presentation.push(c) } },
    });
    runToResolution(actor);
    const resultPlaying = presentation.find(
      (c) => (c as { kind: string }).kind === 'RESULT_PLAYING',
    ) as {
      kind: string;
      text: string;
      audio?: { source: string };
    };
    // The fixture's interaction resolves to at least one narrative with non-empty
    // text, so the audio field must be present and honestly SUBTITLE_ONLY.
    expect(resultPlaying.text).not.toBe('');
    expect(resultPlaying.audio).toEqual({ source: 'SUBTITLE_ONLY' });
  });

  it('DEV-031: injected audioResolution ports flow through to RESULT_PLAYING.audio', () => {
    const presentation: unknown[] = [];
    const actor = createRuntimeMachine({
      chapterRootDir: fixture,
      seed: 's-ra-inject',
      clock: instantClock,
      ports: {
        presentation: { send: (c) => presentation.push(c) },
        audioResolution: {
          findPregenerated: (request) =>
            request.voiceId === 'narrator-default' ? 'assets/pregen/narration.mp3' : undefined,
          findCached: () => undefined,
          hasTtsProvider: () => false,
        },
      },
    });
    runToResolution(actor);
    const resultPlaying = presentation.find(
      (c) => (c as { kind: string }).kind === 'RESULT_PLAYING',
    ) as { kind: string; audio?: { source: string; file?: string } };
    // Proves the wiring is live: the injected port's answer reaches the command.
    expect(resultPlaying.audio).toEqual({
      source: 'PREGENERATED',
      file: 'assets/pregen/narration.mp3',
    });
  });

  it('DICE.* events carry the required visibility (PUBLIC/HIDDEN/PUBLIC)', () => {
    const actor = createRuntimeMachine({
      chapterRootDir: fixture,
      seed: 's-v',
      clock: instantClock,
    });
    runToResolution(actor);
    const log = getEventLog(actor);
    const dice = log.filter((e) => e.type.startsWith('DICE.'));
    expect(dice.length).toBeGreaterThanOrEqual(3);
    const requested = dice.find((e) => e.type === 'DICE.REQUESTED');
    const rolled = dice.find((e) => e.type === 'DICE.ROLLED');
    const published = dice.find((e) => e.type === 'DICE.PUBLISHED');
    expect(requested?.visibility).toBe('PUBLIC');
    expect(rolled?.visibility).toBe('HIDDEN');
    expect(published?.visibility).toBe('PUBLIC');
  });

  it('getEventLog sequence is strictly monotonic with no gaps, and is copy-safe', () => {
    const actor = createRuntimeMachine({
      chapterRootDir: fixture,
      seed: 's-seq',
      clock: instantClock,
    });
    runToResolution(actor);
    const log = getEventLog(actor);
    for (let i = 1; i < log.length; i++) {
      expect(log[i]!.sequence).toBe(log[i - 1]!.sequence + 1);
    }
    // first sequence equals the snapshot counter seed view (1-based start)
    expect(log[0]!.sequence).toBe(1);

    // mutating the returned array must not affect the machine's internal log
    const before = getEventLog(actor).length;
    const returned = getEventLog(actor) as RuntimeEvent[];
    returned.push({} as RuntimeEvent);
    returned[0]!.type = 'TAMPERED';
    expect(getEventLog(actor).length).toBe(before);
    expect(getEventLog(actor)[0]!.type).not.toBe('TAMPERED');
  });

  it('no-interaction STORY advances to the next scene then reaches CHAPTER_END (FIX-02/A10)', () => {
    const dir = makeNoInteractionChapter();
    const actor = createRuntimeMachine({ chapterRootDir: dir, seed: 's-noint' });
    actor.send({ type: 'BOOT' });
    // scene-start: no interaction, next -> scene-b
    expect(storyOf(actor)).toBe('STORY_PLAYING');

    // first STORY.DONE -> (no interaction, hasNextScene) TRANSITION -> scene-b -> STORY_PLAYING
    actor.send({ type: 'STORY.DONE' });
    expect(storyOf(actor)).toBe('STORY_PLAYING');

    // second STORY.DONE -> scene-b has no next SCENE (next is ENDING) -> CHAPTER_END
    // (without the FIX-02 scene advance, this would loop on scene-start forever)
    actor.send({ type: 'STORY.DONE' });
    expect(storyOf(actor)).toBe('CHAPTER_END');
    expect(getStoryPhase(getRuntimeSnapshot(actor))).toBe('CHAPTER_END');
  });
});

/**
 * Build a throwaway chapter where interaction-01's nextScene points at a real
 * SCENE node (scene-b), so RESULT_PLAYING's NARRATIVE.DONE takes the
 * hasNextScene branch (valid-minimal itself goes straight to CHAPTER_END).
 */
function makeInteractionNextSceneChapter(): string {
  const dir = mkdtempSync(join(tmpdir(), 'dev032-nextscene-'));
  cpSync(fixture, dir, { recursive: true });
  const interactionPath = join(dir, 'interactions', 'interaction-01.json');
  const interaction = JSON.parse(readFileSync(interactionPath, 'utf8')) as { nextScene: string };
  interaction.nextScene = 'scene-b';
  writeFileSync(interactionPath, JSON.stringify(interaction, null, 2) + '\n');
  writeFileSync(
    join(dir, 'scenes', 'scene-b.json'),
    JSON.stringify(
      {
        id: 'scene-b',
        visualSceneId: 'vs-start',
        narration: ['你深入森林。'],
        characters: [{ characterId: 'npc-guide', slot: 'CENTER', visible: true }],
        next: 'ending-end',
        hostPolicy: 'ALLOWED',
      },
      null,
      2,
    ) + '\n',
  );
  const graphPath = join(dir, 'story.graph.json');
  const graph = JSON.parse(readFileSync(graphPath, 'utf8')) as { nodes: unknown[] };
  graph.nodes.push({ id: 'scene-b', kind: 'SCENE', file: 'scenes/scene-b.json' });
  writeFileSync(graphPath, JSON.stringify(graph, null, 2) + '\n');
  // disclose scene-b so PASS6 stays green
  const hostPath = join(dir, 'host.public.json');
  const host = JSON.parse(readFileSync(hostPath, 'utf8')) as {
    sceneDisclosures: Record<string, unknown>;
  };
  host.sceneDisclosures['scene-b'] = {
    locationLabel: '森林深处',
    knownFactIds: [],
    tensionKey: 'calm',
  };
  writeFileSync(hostPath, JSON.stringify(host, null, 2) + '\n');
  return dir;
}

const hitPorts = {
  audioResolution: {
    findPregenerated: () => 'assets/pregen/narration.mp3',
    findCached: () => undefined,
    hasTtsProvider: () => false,
  },
};

function regionOf(actor: ReturnType<typeof createRuntimeMachine>, region: string): unknown {
  return (actor.getSnapshot().value as Record<string, unknown>)[region];
}

describe('DEV-032: AUDIO region channel arbitration from STORY', () => {
  it('A07: injected hit ports -> full LOCK chain reaches PLAYING_STORY with zero manual AUDIO.* sends', () => {
    const actor = createRuntimeMachine({
      chapterRootDir: fixture,
      seed: 's-a32-hit',
      clock: instantClock,
      ports: hitPorts,
    });
    expect(regionOf(actor, 'audio')).toBe('IDLE');
    runToResolution(actor);
    expect(storyOf(actor)).toBe('RESULT_PLAYING');
    expect(regionOf(actor, 'audio')).toBe('PLAYING_STORY');
  });

  it('A08: default ports (SUBTITLE_ONLY) -> full LOCK chain keeps AUDIO in IDLE', () => {
    const actor = createRuntimeMachine({
      chapterRootDir: fixture,
      seed: 's-a32-idle',
      clock: instantClock,
    });
    runToResolution(actor);
    expect(storyOf(actor)).toBe('RESULT_PLAYING');
    expect(regionOf(actor, 'audio')).toBe('IDLE');
  });

  it('A09: PLAYING_STORY then NARRATIVE.DONE with next scene -> AUDIO back to IDLE', () => {
    const dir = makeInteractionNextSceneChapter();
    const actor = createRuntimeMachine({
      chapterRootDir: dir,
      seed: 's-a32-next',
      clock: instantClock,
      ports: hitPorts,
    });
    runToResolution(actor);
    expect(regionOf(actor, 'audio')).toBe('PLAYING_STORY');
    actor.send({ type: 'NARRATIVE.DONE' });
    expect(storyOf(actor)).toBe('STORY_PLAYING'); // hasNextScene -> TRANSITION -> scene-b
    expect(regionOf(actor, 'audio')).toBe('IDLE');
  });

  it('A10: PLAYING_STORY then NARRATIVE.DONE straight to CHAPTER_END -> AUDIO back to IDLE', () => {
    const actor = createRuntimeMachine({
      chapterRootDir: fixture,
      seed: 's-a32-end',
      clock: instantClock,
      ports: hitPorts,
    });
    runToResolution(actor);
    expect(regionOf(actor, 'audio')).toBe('PLAYING_STORY');
    actor.send({ type: 'NARRATIVE.DONE' });
    expect(storyOf(actor)).toBe('CHAPTER_END');
    expect(regionOf(actor, 'audio')).toBe('IDLE');
  });

  it('A11: no-interaction STORY.DONE -> CHAPTER_END path never touches AUDIO (stays IDLE)', () => {
    const dir = makeNoInteractionChapter();
    const audio: unknown[] = [];
    const actor = createRuntimeMachine({
      chapterRootDir: dir,
      seed: 's-a32-noint',
      ports: { ...hitPorts, audio: { send: (c) => audio.push(c) } },
    });
    actor.send({ type: 'BOOT' });
    actor.send({ type: 'STORY.DONE' });
    expect(storyOf(actor)).toBe('STORY_PLAYING');
    expect(regionOf(actor, 'audio')).toBe('IDLE');
    actor.send({ type: 'STORY.DONE' });
    expect(storyOf(actor)).toBe('CHAPTER_END');
    expect(regionOf(actor, 'audio')).toBe('IDLE');
    // no AUDIO_PREPARING/PLAY/STOP command was ever sent on this path
    expect(audio.filter((c) => String((c as { kind: string }).kind).startsWith('AUDIO_'))).toEqual(
      [],
    );
  });
});

/** Drive the actor through BOOT..RESOLVED (the common prefix used by several tests). */
function runToResolution(actor: ReturnType<typeof createRuntimeMachine>): void {
  actor.send({ type: 'BOOT' });
  actor.send({ type: 'STORY.DONE' });
  actor.send({ type: 'INTERACTION.OPEN' });
  actor.send({ type: 'VOTE', viewerId: 'u1', choiceId: 'A' });
  actor.send({ type: 'VOTE', viewerId: 'u2', choiceId: 'A' });
  actor.send({ type: 'LOCK' });
}

describe('DEV-037: LOCKING dice pacing delay', () => {
  it('A07: a recording clock observes the DICE_PACING delay request equals TARGET_DICE_MS', () => {
    const requested: number[] = [];
    const recordingClock: Clock = {
      setTimeout: (_fn, timeout) => {
        requested.push(timeout as number);
        return 0;
      },
      clearTimeout: () => {},
    };
    const actor = createRuntimeMachine({
      chapterRootDir: fixture,
      seed: 's037-record',
      clock: recordingClock,
    });
    actor.send({ type: 'BOOT' });
    actor.send({ type: 'STORY.DONE' });
    actor.send({ type: 'INTERACTION.OPEN' });
    actor.send({ type: 'VOTE', viewerId: 'u1', choiceId: 'A' });
    actor.send({ type: 'LOCK' });
    expect(requested).toContain(TARGET_DICE_MS);
  });

  it('A08: with the default (real) clock, LOCKING stays until TARGET_DICE_MS then resolves', () => {
    vi.useFakeTimers();
    try {
      const presentation: unknown[] = [];
      // no `clock` passed -> XState default (real) clock, intercepted by fake timers
      const actor = createRuntimeMachine({
        chapterRootDir: fixture,
        seed: 's037-real',
        ports: { presentation: { send: (c) => presentation.push(c) } },
      });
      actor.send({ type: 'BOOT' });
      actor.send({ type: 'STORY.DONE' });
      actor.send({ type: 'INTERACTION.OPEN' });
      actor.send({ type: 'VOTE', viewerId: 'u1', choiceId: 'A' });
      actor.send({ type: 'LOCK' });
      expect((actor.getSnapshot().value as Record<string, unknown>).interaction).toBe('LOCKING');

      vi.advanceTimersByTime(TARGET_DICE_MS - 1);
      expect((actor.getSnapshot().value as Record<string, unknown>).interaction).toBe('LOCKING');
      // onResolve has not fired yet — the delay is a real gate, not a no-op
      expect(presentation.some((c) => (c as { kind: string }).kind === 'DICE_RESULT')).toBe(false);

      vi.advanceTimersByTime(1);
      // The frozen LOCKED -> RESOLVED always edge folds synchronously with the
      // after-transition, so the stable post-delay state is RESOLVED; what the
      // delay boundary proves is that onResolve ran only now, not on LOCK send.
      expect((actor.getSnapshot().value as Record<string, unknown>).interaction).toBe('RESOLVED');
      // onResolve ran: DICE_RESULT made it to the presentation port
      expect(presentation.some((c) => (c as { kind: string }).kind === 'DICE_RESULT')).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
