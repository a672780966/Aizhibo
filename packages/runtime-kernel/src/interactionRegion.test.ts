import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compile } from '@interactive-story/chapter-compiler';
import type { InteractionNode } from '@interactive-story/chapter-schema';
import {
  applyVote,
  buildNarrativeInputs,
  interactionRegion,
  resolveGroups,
} from './interactionRegion.js';

const fixture = fileURLToPath(
  new URL('../../chapter-compiler/test-fixtures/valid-minimal', import.meta.url),
);

describe('interactionRegion pure logic (T006)', () => {
  it('declares the full 6-state topology from spec §7', () => {
    expect(Object.keys(interactionRegion.states).sort()).toEqual([
      'ANNOUNCING',
      'CLOSED',
      'LOCKED',
      'LOCKING',
      'OPEN',
      'RESOLVED',
    ]);
    expect(interactionRegion.initial).toBe('CLOSED');
  });

  it('applyVote enforces one effective vote per viewer (last wins)', () => {
    let votes = applyVote({}, 'u1', 'A');
    expect(votes).toEqual({ u1: 'A' });
    votes = applyVote(votes, 'u1', 'C');
    expect(votes).toEqual({ u1: 'C' });
    votes = applyVote(votes, 'u2', 'B');
    expect(votes).toEqual({ u1: 'C', u2: 'B' });
  });

  it('resolveGroups resolves each vote group and accumulates world effects', () => {
    const compiled = compile(fixture);
    const world = compiled.schemaResult.initialState.passed!;
    const interaction = compiled.schemaResult.interactions.passed.find(
      (i) => i.value.id === 'interaction-01',
    )!.value;

    const outcome = resolveGroups(
      compiled,
      { u1: 'A', u2: 'A' },
      world,
      'seed-xyz',
      5,
      interaction,
    );
    // exactly one group (choice A), so exactly one dice record
    expect(outcome.diceRecords).toHaveLength(1);
    expect(outcome.resolved.length).toBeGreaterThanOrEqual(1);
    expect(outcome.resolved[0]).toMatchObject({ actionId: 'action-follow' });
  });

  it('resolveGroups with zero votes resolves no groups and leaves the world unchanged', () => {
    const compiled = compile(fixture);
    const world = compiled.schemaResult.initialState.passed!;
    const interaction = compiled.schemaResult.interactions.passed.find(
      (i) => i.value.id === 'interaction-01',
    )!.value;
    const outcome = resolveGroups(compiled, {}, world, 'seed-xyz', 0, interaction);
    expect(outcome.diceRecords).toHaveLength(0);
    expect(outcome.resolved).toEqual([]);
    expect(outcome.nextWorld).toBe(world);
  });

  it('buildNarrativeInputs separates result narratives from plain blocks', () => {
    const compiled = compile(fixture);
    const { resultNarratives, blocksById } = buildNarrativeInputs(compiled);
    expect(resultNarratives.has('narr-follow-success')).toBe(true);
    expect(typeof blocksById.get('block-follow-success')?.text).toBe('string');
  });

  it('resolves two concurrent ActionGroups with independent dice + resolved results (FIX-T03 / A11)', () => {
    const compiled = compile(fixture);
    const world = compiled.schemaResult.initialState.passed!;
    // hand-built interaction with two choices referencing actions that exist in the
    // already-compiled chapter (action-follow / action-fight); no fixture modified.
    const multi: InteractionNode = {
      id: 'i-multi',
      openDurationMs: 15000,
      choices: [
        { id: 'A', label: 'follow', actionType: 'FOLLOW', ruleId: 'action-follow' },
        { id: 'B', label: 'fight', actionType: 'FIGHT', ruleId: 'action-fight' },
      ],
      diceMode: 'PER_ACTION_GROUP',
      resultPolicy: 'multi',
      nextScene: 'x',
      noParticipationPolicy: { kind: 'SKIP' },
    };
    const outcome = resolveGroups(
      compiled,
      { u1: 'A', u2: 'B', u3: 'B' },
      world,
      'seed-multi',
      9,
      multi,
    );
    // two votes-populated groups -> two independent dice records and resolutions
    expect(outcome.diceRecords).toHaveLength(2);
    expect(outcome.resolved).toHaveLength(2);
    const actionIds = outcome.resolved.map((r) => r.actionId).sort();
    expect(actionIds).toEqual(['action-fight', 'action-follow']);
    // each group's dice record is independent (distinct seed via group index)
    expect(outcome.diceRecords[0]).not.toEqual(outcome.diceRecords[1]);
  });
});
