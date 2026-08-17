import { describe, expect, it } from 'vitest';
import type { SchemaValidationResult } from './pass1Schema.js';
import { ANY_VALUE, buildReachableStateModel } from './pass5ReachableState.js';

/** Minimal SchemaValidationResult with all collections empty. */
function emptySchemaResult(): SchemaValidationResult {
  return {
    manifest: { passed: null, failed: [] },
    storyGraph: { passed: null, failed: [] },
    initialState: { passed: null, failed: [] },
    worldRules: { passed: null, failed: [] },
    hostPublic: { passed: null, failed: [] },
    scenes: { passed: [], failed: [] },
    interactions: { passed: [], failed: [] },
    actions: { passed: [], failed: [] },
    dice: { passed: [], failed: [] },
    results: { passed: [], failed: [] },
    stateRules: { passed: [], failed: [] },
    narrative: { passed: [], failed: [] },
    npc: { passed: [], failed: [] },
    recovery: { passed: [], failed: [] },
    boss: { passed: [], failed: [] },
    endings: { passed: [], failed: [] },
    visuals: { passed: [], failed: [] },
    audio: { passed: [], failed: [] },
    metadata: { passed: [], failed: [] },
  };
}

function worldState(): NonNullable<SchemaValidationResult['initialState']['passed']> {
  return {
    chapterId: 'c',
    sceneId: 's1',
    flags: { seeded: 'x' },
    npc: {
      guide: { present: true, alive: true, disposition: 'FRIENDLY', flags: { calm: true } },
    },
    danger: { level: 0, tensionKey: 'calm' },
    discovered: [],
    activeThreats: [],
    chapterVariables: { openVar: 5 },
  };
}

function interactionWithChoice(
  ruleId: string,
): NonNullable<SchemaValidationResult['interactions']['passed']>[number]['value'] {
  return {
    id: `i-${ruleId}`,
    openDurationMs: 15000,
    choices: [{ id: 'A', label: 'x', actionType: 't', ruleId }],
    diceMode: 'PER_ACTION_GROUP',
    resultPolicy: 'p',
    nextScene: 's1',
    noParticipationPolicy: { kind: 'SKIP' },
  };
}

describe('buildReachableStateModel (T005)', () => {
  it('seeds flags, npc.*, danger.* and chapterVariables from initial.state.json', () => {
    const schemaResult = emptySchemaResult();
    schemaResult.initialState = { passed: worldState(), failed: [] };
    const model = buildReachableStateModel(schemaResult, new Set(['s1']));
    expect([...model.keys.get('flags.seeded')!]).toEqual(['x']);
    expect(model.keys.get('npc.guide.present')).toEqual(new Set([true]));
    expect(model.keys.get('npc.guide.alive')).toEqual(new Set([true]));
    expect(model.keys.get('npc.guide.disposition')).toEqual(new Set(['FRIENDLY']));
    expect(model.keys.get('npc.guide.flags.calm')).toEqual(new Set([true]));
    expect(model.keys.get('danger.level')).toEqual(new Set([0]));
    expect(model.keys.get('danger.tensionKey')).toEqual(new Set(['calm']));
    // chapterVariables values are schema-open → key registered, value unknown.
    expect(model.keys.get('chapterVariables.openVar')).toEqual(new Set([ANY_VALUE]));
  });

  it('collects SET effects of result dictionaries reachable via the choice chain', () => {
    const schemaResult = emptySchemaResult();
    schemaResult.initialState = { passed: worldState(), failed: [] };
    schemaResult.scenes.passed.push({
      file: 'scenes/s1.json',
      value: {
        id: 's1',
        visualSceneId: 'v',
        characters: [],
        interactionId: 'i-act1',
        hostPolicy: 'ALLOWED',
      },
    });
    schemaResult.interactions.passed.push({
      file: 'interactions/i-act1.json',
      value: interactionWithChoice('act1'),
    });
    schemaResult.actions.passed.push(
      {
        file: 'actions/act1.json',
        value: { id: 'act1', actionType: 't', diceProfileId: 'd', resultSetId: 'res1' },
      },
      {
        file: 'actions/act2.json',
        value: { id: 'act2', actionType: 't', diceProfileId: 'd', resultSetId: 'res2' },
      },
    );
    schemaResult.results.passed.push(
      {
        file: 'results/res1.json',
        value: {
          id: 'res1',
          entries: [
            {
              quality: 'SUCCESS',
              resultId: 'r1',
              worldEffects: [{ path: { container: 'flags', key: 'real' }, op: 'SET', value: true }],
              playerEffects: [],
              narrativeId: 'n1',
              visibility: 'PUBLIC',
            },
          ],
        },
      },
      {
        file: 'results/res2.json',
        value: {
          id: 'res2',
          entries: [
            {
              quality: 'SUCCESS',
              resultId: 'r2',
              worldEffects: [{ path: { container: 'flags', key: 'ghost' }, op: 'SET', value: 1 }],
              playerEffects: [],
              narrativeId: 'n2',
              visibility: 'PUBLIC',
            },
          ],
        },
      },
    );
    // scene-s2's interaction (→ act2 → res2) is NOT reachable: A13.
    const model = buildReachableStateModel(schemaResult, new Set(['s1']));
    expect(model.keys.get('flags.real')).toEqual(new Set([true]));
    expect(model.keys.has('flags.ghost')).toBe(false);
  });

  it('registers INC/DEC/PUSH/REMOVE effects as key-existence only (ANY_VALUE)', () => {
    const schemaResult = emptySchemaResult();
    schemaResult.initialState = { passed: worldState(), failed: [] };
    schemaResult.scenes.passed.push({
      file: 'scenes/s1.json',
      value: {
        id: 's1',
        visualSceneId: 'v',
        characters: [],
        interactionId: 'i-act1',
        hostPolicy: 'ALLOWED',
      },
    });
    schemaResult.interactions.passed.push({
      file: 'interactions/i-act1.json',
      value: interactionWithChoice('act1'),
    });
    schemaResult.actions.passed.push({
      file: 'actions/act1.json',
      value: { id: 'act1', actionType: 't', diceProfileId: 'd', resultSetId: 'res1' },
    });
    schemaResult.results.passed.push({
      file: 'results/res1.json',
      value: {
        id: 'res1',
        entries: [
          {
            quality: 'SUCCESS',
            resultId: 'r1',
            worldEffects: [
              { path: { container: 'flags', key: 'counter' }, op: 'INC' },
              { path: { container: 'discovered', key: 'node-x' }, op: 'PUSH' },
            ],
            playerEffects: [],
            narrativeId: 'n1',
            visibility: 'PUBLIC',
          },
        ],
      },
    });
    const model = buildReachableStateModel(schemaResult, new Set(['s1']));
    expect(model.keys.get('flags.counter')).toEqual(new Set([ANY_VALUE]));
    expect(model.keys.get('discovered.node-x')).toEqual(new Set([ANY_VALUE]));
  });

  it('registers reachable boss variables (chapterVariables.*) and state-rule-set effects', () => {
    const schemaResult = emptySchemaResult();
    schemaResult.initialState = { passed: worldState(), failed: [] };
    schemaResult.boss.passed.push(
      {
        file: 'boss/b1.json',
        value: {
          id: 'b1',
          displayName: 'b',
          visualSceneId: 'v',
          phases: [],
          variables: { hp: 3 },
          stateRuleSetId: 'rs1',
          onDefeat: 'e',
          onFailure: 'e',
        },
      },
      {
        file: 'boss/b-unreachable.json',
        value: {
          id: 'b-unreachable',
          displayName: 'u',
          visualSceneId: 'v',
          phases: [],
          variables: { evil: 1 },
          stateRuleSetId: 'rs2',
          onDefeat: 'e',
          onFailure: 'e',
        },
      },
    );
    schemaResult.stateRules.passed.push(
      {
        file: 'state-rules/rs1.json',
        value: {
          id: 'rs1',
          rules: [
            {
              id: 'r1',
              when: { path: { container: 'flags', key: 'a' }, op: 'EXISTS' },
              effects: [{ path: { container: 'flags', key: 'fromRule' }, op: 'SET', value: 7 }],
            },
          ],
        },
      },
      {
        file: 'state-rules/rs2.json',
        value: {
          id: 'rs2',
          rules: [
            {
              id: 'r2',
              when: { path: { container: 'flags', key: 'a' }, op: 'EXISTS' },
              effects: [{ path: { container: 'flags', key: 'evilEffect' }, op: 'SET', value: 9 }],
            },
          ],
        },
      },
    );
    const model = buildReachableStateModel(schemaResult, new Set(['b1']));
    expect(model.keys.get('chapterVariables.hp')).toEqual(new Set([3]));
    expect(model.keys.get('flags.fromRule')).toEqual(new Set([7]));
    // Unreachable boss contributes nothing (A13).
    expect(model.keys.has('chapterVariables.evil')).toBe(false);
    expect(model.keys.has('flags.evilEffect')).toBe(false);
  });
});
