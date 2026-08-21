import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  compareEventLogs,
  createRuntimeMachine,
  getEventLog,
  getInteractionPhase,
  getRuntimeSnapshot,
  getStoryPhase,
  replayFromEventLog,
  systemClockPort,
  virtualClockPort,
  type ClockPort,
  type RuntimeEvent,
} from './index.js';

const fixture = fileURLToPath(
  new URL('../../chapter-compiler/test-fixtures/valid-minimal', import.meta.url),
);

function driveFixedVote(input: {
  chapterRootDir: string;
  seed: string;
  clock?: ClockPort;
}): RuntimeEvent[] {
  const actor = createRuntimeMachine({
    chapterRootDir: input.chapterRootDir,
    seed: input.seed,
    ...(input.clock === undefined ? {} : { ports: { clock: input.clock } }),
  });
  actor.send({ type: 'BOOT' });
  let steps = 0;
  while (getStoryPhase(getRuntimeSnapshot(actor)) !== 'CHAPTER_END' && steps < 200) {
    const phase = getStoryPhase(getRuntimeSnapshot(actor));
    if (phase === 'STORY_PLAYING') {
      actor.send({ type: 'STORY.DONE' });
    } else if (phase === 'INTERACTION_PENDING') {
      if (getInteractionPhase(getRuntimeSnapshot(actor)) === 'CLOSED') {
        actor.send({ type: 'INTERACTION.OPEN' });
      } else {
        actor.send({ type: 'VOTE', viewerId: 'replay-viewer', choiceId: 'A' });
        actor.send({ type: 'LOCK' });
      }
    } else if (phase === 'RESULT_PLAYING') {
      actor.send({ type: 'NARRATIVE.DONE' });
    } else {
      throw new Error(`Unexpected phase in test driver: ${phase}`);
    }
    steps += 1;
  }
  expect(getStoryPhase(getRuntimeSnapshot(actor))).toBe('CHAPTER_END');
  return [...getEventLog(actor)];
}

function relativeVirtualClock(): ClockPort {
  const origin = virtualClockPort.now();
  return { now: () => virtualClockPort.now() - origin };
}

describe('replayFromEventLog', () => {
  it('replays valid-minimal to CHAPTER_END from recorded votes', () => {
    const recordedEvents = driveFixedVote({ chapterRootDir: fixture, seed: 'replay-e2e' });
    const result = replayFromEventLog({
      chapterRootDir: fixture,
      seed: 'replay-e2e',
      recordedEvents,
    });
    expect(getStoryPhase(getRuntimeSnapshot(result.actor))).toBe('CHAPTER_END');
    expect(compareEventLogs(recordedEvents, result.replayedEvents)).toEqual([]);
  });

  it('fails clearly when a required vote round is missing', () => {
    const recordedEvents = driveFixedVote({ chapterRootDir: fixture, seed: 'replay-mismatch' });
    const withoutVotes = recordedEvents.filter(
      (event) => event.type !== 'INTERACTION.VOTE' && event.type !== 'INTERACTION.LOCKING',
    );
    expect(() =>
      replayFromEventLog({
        chapterRootDir: fixture,
        seed: 'replay-mismatch',
        recordedEvents: withoutVotes,
      }),
    ).toThrow(/requires vote round 0/);
  });
});

describe('replay determinism', () => {
  it('matches all fields with relative virtualClockPort runs', () => {
    const recordedEvents = driveFixedVote({
      chapterRootDir: fixture,
      seed: 'virtual-replay',
      clock: relativeVirtualClock(),
    });
    const replayedEvents = replayFromEventLog({
      chapterRootDir: fixture,
      seed: 'virtual-replay',
      recordedEvents,
      ports: { clock: relativeVirtualClock() },
    }).replayedEvents;
    expect(replayedEvents).toEqual(recordedEvents);
  });

  it('ignores independent system clock timestamps in the default comparison', () => {
    const recordedEvents = driveFixedVote({ chapterRootDir: fixture, seed: 'system-replay' });
    const replayedEvents = replayFromEventLog({
      chapterRootDir: fixture,
      seed: 'system-replay',
      recordedEvents,
      ports: { clock: systemClockPort },
    }).replayedEvents;
    expect(compareEventLogs(recordedEvents, replayedEvents)).toEqual([]);
  });
});
