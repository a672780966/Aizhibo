import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  createRuntimeMachine,
  getCurrentChoiceIds,
  getEventLog,
  getRuntimeSnapshot,
  getStoryPhase,
  instantClock,
} from './index.js';
import { generateVotes } from './simulatorVotes.js';
import { runSimulation } from './simulator.js';

const fixture = fileURLToPath(
  new URL('../../chapter-compiler/test-fixtures/valid-minimal', import.meta.url),
);

function copyFixture(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  cpSync(fixture, dir, { recursive: true });
  return dir;
}

describe('getCurrentChoiceIds', () => {
  it('returns choices, and safely returns [] for missing data', () => {
    const unbooted = createRuntimeMachine({ chapterRootDir: fixture, seed: 'unbooted' });
    expect(getCurrentChoiceIds(unbooted)).toEqual([]);

    const actor = createRuntimeMachine({ chapterRootDir: fixture, seed: 'choices' });
    actor.send({ type: 'BOOT' });
    expect(getCurrentChoiceIds(actor)).toEqual(['A']);

    const dir = copyFixture('dev007-no-interaction-');
    try {
      const scenePath = join(dir, 'scenes', 'scene-start.json');
      const scene = JSON.parse(readFileSync(scenePath, 'utf8')) as Record<string, unknown>;
      delete scene.interactionId;
      writeFileSync(scenePath, JSON.stringify(scene) + '\n');
      const noInteraction = createRuntimeMachine({ chapterRootDir: dir, seed: 'none' });
      noInteraction.send({ type: 'BOOT' });
      expect(getCurrentChoiceIds(noInteraction)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('runSimulation', () => {
  it('runs 50 valid-minimal chapters to completion', () => {
    const report = runSimulation({ chapterRootDir: fixture, runs: 50, seedPrefix: 'batch' });
    expect(report.totalRuns).toBe(50);
    expect(report.passed).toBe(50);
    expect(report.failed).toBe(0);
    expect(report.runs.every((run) => run.outcome === 'CHAPTER_END')).toBe(true);
  });

  it('stops at maxSteps and is deterministic', () => {
    const stuck = runSimulation({ chapterRootDir: fixture, runs: 1, maxSteps: 1 });
    expect(stuck.runs[0]?.outcome).toBe('STUCK');

    const input = { chapterRootDir: fixture, runs: 8, seedPrefix: 'replay', maxSteps: 200 };
    expect(runSimulation(input)).toEqual(runSimulation(input));
  });

  it('drives two action groups from split votes', () => {
    const dir = copyFixture('dev007-split-');
    try {
      const interactionPath = join(dir, 'interactions', 'interaction-01.json');
      const interaction = JSON.parse(readFileSync(interactionPath, 'utf8')) as {
        choices: unknown[];
      };
      interaction.choices = [
        { id: 'A', label: '跟随向导', actionType: 'FOLLOW', ruleId: 'action-follow' },
        { id: 'B', label: '攻击', actionType: 'FIGHT', ruleId: 'action-fight' },
      ];
      writeFileSync(interactionPath, JSON.stringify(interaction) + '\n');

      const actor = createRuntimeMachine({
        chapterRootDir: dir,
        seed: 'split',
        clock: instantClock,
      });
      actor.send({ type: 'BOOT' });
      actor.send({ type: 'STORY.DONE' });
      actor.send({ type: 'INTERACTION.OPEN' });
      const choiceIds = getCurrentChoiceIds(actor);
      for (const vote of generateVotes({
        seed: 'split',
        runIndex: 0,
        step: 0,
        choiceIds,
        minViewers: 10,
        maxViewers: 10,
      })) {
        actor.send({ type: 'VOTE', ...vote });
      }
      actor.send({ type: 'LOCK' });

      const requested = getEventLog(actor).filter((event) => event.type === 'DICE.REQUESTED');
      const groupSeeds = new Set(
        requested.map((event) => (event.payload as { seed: string }).seed),
      );
      expect(requested.length).toBeGreaterThanOrEqual(2);
      expect(groupSeeds.size).toBeGreaterThanOrEqual(2);
      expect(getStoryPhase(getRuntimeSnapshot(actor))).toBe('RESULT_PLAYING');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
