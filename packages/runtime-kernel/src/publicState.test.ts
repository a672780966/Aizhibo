import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { isFactSafeToDisclose, getPublicState } from './publicState.js';
import type { HostPublicSpec, WorldState } from '@interactive-story/chapter-schema';
import { createRuntimeMachine, getRuntimeSnapshot } from './machine.js';
import { getStoryPhase, getInteractionPhase } from './snapshot.js';
import { instantClock } from './virtualPorts.js';

function baseWorld(overrides: Partial<WorldState> = {}): WorldState {
  return {
    chapterId: 'ch-test',
    sceneId: 'scene-1',
    flags: { torchLit: true },
    npc: {
      guide: { present: true, alive: true, disposition: 'FRIENDLY', flags: { suspicious: false } },
    },
    danger: { level: 2, tensionKey: 'tense' },
    discovered: [],
    activeThreats: [],
    chapterVariables: { bossHp: 10 },
    ...overrides,
  };
}

describe('isFactSafeToDisclose', () => {
  it('returns false when dependencies are undeclared (undefined)', () => {
    expect(isFactSafeToDisclose(undefined, {}, baseWorld())).toBe(false);
  });

  it('returns false when a dependency is not marked PUBLIC in flagVisibility', () => {
    expect(
      isFactSafeToDisclose(['flags.torchLit'], { 'flags.torchLit': 'HIDDEN' }, baseWorld()),
    ).toBe(false);
  });

  it('returns false when a dependency has no entry in flagVisibility at all', () => {
    expect(isFactSafeToDisclose(['flags.unknown'], {}, baseWorld())).toBe(false);
  });

  it('returns false when a PUBLIC-marked dependency is not established in the current world (undefined value)', () => {
    expect(
      isFactSafeToDisclose(['flags.neverSet'], { 'flags.neverSet': 'PUBLIC' }, baseWorld()),
    ).toBe(false);
  });

  it('returns true when all dependencies are PUBLIC and established', () => {
    expect(
      isFactSafeToDisclose(['flags.torchLit'], { 'flags.torchLit': 'PUBLIC' }, baseWorld()),
    ).toBe(true);
  });

  it('resolves the flags.<name> key format', () => {
    expect(
      isFactSafeToDisclose(['flags.torchLit'], { 'flags.torchLit': 'PUBLIC' }, baseWorld()),
    ).toBe(true);
  });

  it('resolves the chapterVariables.<name> key format', () => {
    expect(
      isFactSafeToDisclose(
        ['chapterVariables.bossHp'],
        { 'chapterVariables.bossHp': 'PUBLIC' },
        baseWorld(),
      ),
    ).toBe(true);
  });

  it('resolves the npc.<id>.present key format', () => {
    expect(
      isFactSafeToDisclose(['npc.guide.present'], { 'npc.guide.present': 'PUBLIC' }, baseWorld()),
    ).toBe(true);
  });

  it('resolves the npc.<id>.alive key format', () => {
    expect(
      isFactSafeToDisclose(['npc.guide.alive'], { 'npc.guide.alive': 'PUBLIC' }, baseWorld()),
    ).toBe(true);
  });

  it('resolves the npc.<id>.disposition key format', () => {
    expect(
      isFactSafeToDisclose(
        ['npc.guide.disposition'],
        { 'npc.guide.disposition': 'PUBLIC' },
        baseWorld(),
      ),
    ).toBe(true);
  });

  it('resolves the npc.<id>.flags.<name> key format', () => {
    // `suspicious` is `false` — a defined value, so the fact is established even
    // though the value itself is falsy (implementation checks `=== undefined`,
    // not truthiness).
    expect(
      isFactSafeToDisclose(
        ['npc.guide.flags.suspicious'],
        { 'npc.guide.flags.suspicious': 'PUBLIC' },
        baseWorld(),
      ),
    ).toBe(true);
  });

  it('resolves the danger.level key format', () => {
    expect(isFactSafeToDisclose(['danger.level'], { 'danger.level': 'PUBLIC' }, baseWorld())).toBe(
      true,
    );
  });

  it('resolves the danger.tensionKey key format', () => {
    expect(
      isFactSafeToDisclose(['danger.tensionKey'], { 'danger.tensionKey': 'PUBLIC' }, baseWorld()),
    ).toBe(true);
  });

  it('returns false when only SOME dependencies are safe (all must pass)', () => {
    expect(
      isFactSafeToDisclose(
        ['flags.torchLit', 'flags.neverSet'],
        { 'flags.torchLit': 'PUBLIC', 'flags.neverSet': 'PUBLIC' },
        baseWorld(),
      ),
    ).toBe(false);
  });

  it('returns true for an empty dependencies array (vacuously safe)', () => {
    expect(isFactSafeToDisclose([], {}, baseWorld())).toBe(true);
  });
});

describe('getPublicState', () => {
  const fixture = fileURLToPath(
    new URL('../../chapter-compiler/test-fixtures/valid-minimal', import.meta.url),
  );

  // Synthetic host spec (NOT the real fixture's host.public.json, whose
  // knownFactIds is empty and whose flagVisibility is all HIDDEN): gives us
  // PUBLIC flags and declared fact dependencies to exercise the projection.
  const testHostPublicSpec: HostPublicSpec = {
    flagVisibility: {
      'npc.npc-guide.present': 'PUBLIC',
      'danger.tensionKey': 'PUBLIC',
      'flags.neverSet': 'PUBLIC',
    },
    sceneDisclosures: {
      'scene-start': {
        locationLabel: '森林入口',
        tensionKey: 'calm',
        knownFactIds: [
          'guide-is-here',
          'danger-is-calm',
          'something-unestablished',
          'undeclared-fact',
        ],
        knownFactDependencies: {
          'guide-is-here': ['npc.npc-guide.present'],
          'danger-is-calm': ['danger.tensionKey'],
          'something-unestablished': ['flags.neverSet'],
        },
      },
    },
    tensionLabels: { calm: '平静' },
  };

  it('projects currentLocation from the scene disclosure', () => {
    const actor = createRuntimeMachine({
      chapterRootDir: fixture,
      seed: 's-pub-1',
      clock: instantClock,
    });
    actor.send({ type: 'BOOT' });
    const state = getPublicState(actor, testHostPublicSpec);
    expect(state.currentLocation).toBe('森林入口');
  });

  it('includes only facts whose dependencies are all PUBLIC and currently established, excluding HIDDEN/unestablished/undeclared ones', () => {
    const actor = createRuntimeMachine({
      chapterRootDir: fixture,
      seed: 's-pub-1',
      clock: instantClock,
    });
    actor.send({ type: 'BOOT' });
    const state = getPublicState(actor, testHostPublicSpec);
    // Filter preserves knownFactIds order. Excluded:
    //  - 'something-unestablished': depends on flags.neverSet, which is PUBLIC
    //    in the synthetic spec but never set in the initial world (undefined
    //    value) -> default-rejected.
    //  - 'undeclared-fact': has NO entry in knownFactDependencies ->
    //    dependencies === undefined -> default-rejected.
    expect(state.knownFacts).toEqual(['guide-is-here', 'danger-is-calm']);
  });

  it('currentTension resolves via tensionLabels from world.danger.tensionKey', () => {
    const actor = createRuntimeMachine({
      chapterRootDir: fixture,
      seed: 's-pub-1',
      clock: instantClock,
    });
    actor.send({ type: 'BOOT' });
    const state = getPublicState(actor, testHostPublicSpec);
    // initial world's danger.tensionKey is 'calm' -> maps to '平静'.
    expect(state.currentTension).toBe('平静');
  });

  it('storyPhase and interactionPhase match the direct accessor outputs', () => {
    const actor = createRuntimeMachine({
      chapterRootDir: fixture,
      seed: 's-pub-1',
      clock: instantClock,
    });
    actor.send({ type: 'BOOT' });
    const state = getPublicState(actor, testHostPublicSpec);
    const snapshot = getRuntimeSnapshot(actor);
    expect(state.storyPhase).toBe(getStoryPhase(snapshot));
    expect(state.interactionPhase).toBe(getInteractionPhase(snapshot));
  });

  it('currentChoices is undefined before an interaction opens, and reflects the open choices once INTERACTION.OPEN', () => {
    const actor = createRuntimeMachine({
      chapterRootDir: fixture,
      seed: 's-pub-2',
      clock: instantClock,
    });
    actor.send({ type: 'BOOT' });
    // BOOT -> STORY_PLAYING; interaction not yet opened -> no current choices.
    expect(getPublicState(actor, testHostPublicSpec).currentChoices).toBeUndefined();

    actor.send({ type: 'STORY.DONE' }); // -> INTERACTION_PENDING
    actor.send({ type: 'INTERACTION.OPEN' }); // -> interaction OPEN
    const state = getPublicState(actor, testHostPublicSpec);
    // valid-minimal's interaction-01 has a single choice with id 'A'.
    expect(state.currentChoices).toEqual([{ id: 'A' }]);
  });

  it('publishedDice is undefined before any dice roll, and reflects the roll after vote resolution', () => {
    const actor = createRuntimeMachine({
      chapterRootDir: fixture,
      seed: 's-pub-3',
      clock: instantClock,
    });
    actor.send({ type: 'BOOT' });
    actor.send({ type: 'STORY.DONE' });
    actor.send({ type: 'INTERACTION.OPEN' });
    // No dice have been rolled yet at this point (nothing resolved).
    expect(getPublicState(actor, testHostPublicSpec).publishedDice).toBeUndefined();

    // Vote + lock to trigger dice resolution (action-follow uses
    // diceProfileId dice-standard).
    actor.send({ type: 'VOTE', viewerId: 'u1', choiceId: 'A' });
    actor.send({ type: 'VOTE', viewerId: 'u2', choiceId: 'A' });
    actor.send({ type: 'LOCK' });

    const state = getPublicState(actor, testHostPublicSpec);
    expect(Array.isArray(state.publishedDice)).toBe(true);
    expect(state.publishedDice!.length).toBeGreaterThan(0);
    // Shape only — exact values are seed-dependent.
    for (const entry of state.publishedDice!) {
      expect(typeof entry.diceType).toBe('string');
      expect(typeof entry.finalValue).toBe('number');
      expect(entry.quality === undefined || typeof entry.quality === 'string').toBe(true);
    }
  });
});
