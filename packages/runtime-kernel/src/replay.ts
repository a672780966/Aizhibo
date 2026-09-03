import type { RuntimeEvent } from './event.js';
import {
  createRuntimeMachine,
  getEventLog,
  getRuntimeSnapshot,
  type Clock,
  type RuntimeActor,
} from './machine.js';
import type { Ports } from './ports.js';
import { getInteractionPhase, getStoryPhase } from './snapshot.js';
import { extractVoteRounds } from './voteExtraction.js';

export interface ReplayResult {
  actor: RuntimeActor;
  replayedEvents: RuntimeEvent[];
}

export function replayFromEventLog(input: {
  chapterRootDir: string;
  seed: string;
  recordedEvents: readonly RuntimeEvent[];
  ports?: Partial<Ports>;
  clock?: Clock;
  maxSteps?: number;
}): ReplayResult {
  const rounds = extractVoteRounds(input.recordedEvents);
  const actorInput: {
    chapterRootDir: string;
    seed: string;
    ports?: Partial<Ports>;
    clock?: Clock;
  } = {
    chapterRootDir: input.chapterRootDir,
    seed: input.seed,
  };
  if (input.ports !== undefined) actorInput.ports = input.ports;
  if (input.clock !== undefined) actorInput.clock = input.clock;

  const actor = createRuntimeMachine(actorInput);
  const maxSteps = input.maxSteps ?? 200;
  let roundIndex = 0;
  let steps = 0;

  actor.send({ type: 'BOOT' });
  while (steps < maxSteps) {
    const storyPhase = getStoryPhase(getRuntimeSnapshot(actor));
    if (storyPhase === 'CHAPTER_END' || storyPhase === 'ERROR') break;

    if (storyPhase === 'STORY_PLAYING') {
      actor.send({ type: 'STORY.DONE' });
    } else if (storyPhase === 'INTERACTION_PENDING') {
      const interactionPhase = getInteractionPhase(getRuntimeSnapshot(actor));
      if (interactionPhase === 'CLOSED') {
        actor.send({ type: 'INTERACTION.OPEN' });
      } else if (interactionPhase === 'OPEN') {
        const round = rounds[roundIndex];
        if (round === undefined) {
          throw new Error(`Replay requires vote round ${roundIndex}, but the event log has none`);
        }
        for (const vote of round.votes) actor.send({ type: 'VOTE', ...vote });
        actor.send({ type: 'LOCK' });
        roundIndex += 1;
      } else {
        throw new Error(`Replay stalled in interaction phase: ${interactionPhase}`);
      }
    } else if (storyPhase === 'RESULT_PLAYING') {
      actor.send({ type: 'NARRATIVE.DONE' });
    } else {
      throw new Error(`Replay stalled in story phase: ${storyPhase}`);
    }

    steps += 1;
  }

  const finalStoryPhase = getStoryPhase(getRuntimeSnapshot(actor));
  if (finalStoryPhase !== 'CHAPTER_END' && finalStoryPhase !== 'ERROR') {
    throw new Error(`Replay exceeded maxSteps (${maxSteps})`);
  }
  if (roundIndex !== rounds.length) {
    throw new Error(
      `Replay consumed ${roundIndex} vote rounds, but the event log contains ${rounds.length}`,
    );
  }

  return { actor, replayedEvents: [...getEventLog(actor)] };
}
