import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { RuntimeEvent } from './event.js';
import { createRuntimeMachine, getEventLog, getRuntimeSnapshot } from './machine.js';
import { getStoryPhase, getInteractionPhase } from './snapshot.js';

const fixture = fileURLToPath(
  new URL('../../chapter-compiler/test-fixtures/valid-minimal', import.meta.url),
);

describe('createRuntimeMachine end-to-end (T009)', () => {
  it('constructs with default ports (no real systems needed)', () => {
    const actor = createRuntimeMachine({ chapterRootDir: '/tmp/none', seed: 's1' });
    expect((actor.getSnapshot().value as Record<string, unknown>).story).toBe('BOOT');
    expect(getStoryPhase(getRuntimeSnapshot(actor))).toBe('BOOT');
  });

  it('runs the full chain: load -> scene -> interaction -> votes -> resolve -> narrative -> end', () => {
    const presentation: unknown[] = [];
    const audio: unknown[] = [];
    const actor = createRuntimeMachine({
      chapterRootDir: fixture,
      seed: 's1',
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

  it('DICE.* events carry the required visibility (PUBLIC/HIDDEN/PUBLIC)', () => {
    const actor = createRuntimeMachine({ chapterRootDir: fixture, seed: 's-v' });
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
    const actor = createRuntimeMachine({ chapterRootDir: fixture, seed: 's-seq' });
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
