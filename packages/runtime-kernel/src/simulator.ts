import { createRuntimeMachine, getCurrentChoiceIds, getRuntimeSnapshot } from './machine.js';
import { defaultPorts, noopAudioPort, noopPresentationPort } from './ports.js';
import { getInteractionPhase, getStoryPhase } from './snapshot.js';
import { generateVotes } from './simulatorVotes.js';
import { virtualClockPort, virtualPlatformPort } from './virtualPorts.js';

export interface SimulationRunResult {
  runIndex: number;
  seed: string;
  outcome: 'CHAPTER_END' | 'ERROR' | 'STUCK';
  steps: number;
}

export interface SimulationReport {
  totalRuns: number;
  passed: number;
  failed: number;
  runs: SimulationRunResult[];
}

export function runSimulation(input: {
  chapterRootDir: string;
  runs: number;
  seedPrefix?: string;
  maxSteps?: number;
  minViewers?: number;
  maxViewers?: number;
}): SimulationReport {
  const seedPrefix = input.seedPrefix ?? 'sim';
  const maxSteps = input.maxSteps ?? 200;
  const results = Array.from({ length: input.runs }, (_, runIndex) =>
    runOne({
      ...input,
      runIndex,
      seed: `${seedPrefix}-${runIndex}`,
      maxSteps,
    }),
  );

  return {
    totalRuns: results.length,
    passed: results.filter((result) => result.outcome === 'CHAPTER_END').length,
    failed: results.filter((result) => result.outcome !== 'CHAPTER_END').length,
    runs: results,
  };
}

function runOne(input: {
  chapterRootDir: string;
  runIndex: number;
  seed: string;
  maxSteps: number;
  minViewers?: number;
  maxViewers?: number;
}): SimulationRunResult {
  const actor = createRuntimeMachine({
    chapterRootDir: input.chapterRootDir,
    seed: input.seed,
    ports: {
      ...defaultPorts,
      clock: virtualClockPort,
      platform: virtualPlatformPort,
      presentation: noopPresentationPort,
      audio: noopAudioPort,
    },
  });

  actor.send({ type: 'BOOT' });
  let steps = 0;

  while (steps < input.maxSteps) {
    const storyPhase = getStoryPhase(getRuntimeSnapshot(actor));
    if (storyPhase === 'CHAPTER_END' || storyPhase === 'ERROR') {
      return { runIndex: input.runIndex, seed: input.seed, outcome: storyPhase, steps };
    }

    if (storyPhase === 'STORY_PLAYING') {
      actor.send({ type: 'STORY.DONE' });
    } else if (storyPhase === 'INTERACTION_PENDING') {
      const interactionPhase = getInteractionPhase(getRuntimeSnapshot(actor));
      if (interactionPhase === 'CLOSED') {
        actor.send({ type: 'INTERACTION.OPEN' });
      } else if (interactionPhase === 'OPEN') {
        const choiceIds = getCurrentChoiceIds(actor);
        for (const vote of generateVotes({
          seed: input.seed,
          runIndex: input.runIndex,
          step: steps,
          choiceIds,
          ...(input.minViewers === undefined ? {} : { minViewers: input.minViewers }),
          ...(input.maxViewers === undefined ? {} : { maxViewers: input.maxViewers }),
        })) {
          actor.send({ type: 'VOTE', ...vote });
        }
        actor.send({ type: 'LOCK' });
      } else {
        return { runIndex: input.runIndex, seed: input.seed, outcome: 'STUCK', steps };
      }
    } else if (storyPhase === 'RESULT_PLAYING') {
      actor.send({ type: 'NARRATIVE.DONE' });
    } else {
      return { runIndex: input.runIndex, seed: input.seed, outcome: 'STUCK', steps };
    }

    steps += 1;
  }

  return { runIndex: input.runIndex, seed: input.seed, outcome: 'STUCK', steps };
}
