import { fileURLToPath } from 'node:url';
import type { Condition } from '@interactive-story/chapter-schema';
import { describe, expect, it } from 'vitest';
import { loadChapterPack } from './loader.js';
import { runSchemaValidation, type SchemaValidationResult } from './pass1Schema.js';
import { buildStoryGraphModel } from './pass3GraphModel.js';
import { computeReachability } from './pass3Reachability.js';
import {
  ANY_VALUE,
  buildReachableStateModel,
  type ReachableStateModel,
} from './pass5ReachableState.js';
import {
  checkEndingSatisfiability,
  checkRecoverySatisfiability,
  isConditionSatisfiable,
} from './pass5Satisfiability.js';

const fixtureRoot = fileURLToPath(new URL('../test-fixtures', import.meta.url));

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

function reachableStateModel(entries: [string, unknown[]][]): ReachableStateModel {
  return {
    keys: new Map(
      entries.map(([key, values]) => [key, new Set(values as (string | number | boolean)[])]),
    ),
  };
}

describe('isConditionSatisfiable (T006 condition-tree rules)', () => {
  const model = reachableStateModel([
    ['flags.hasKey', ['x', 1]],
    ['danger.level', [0, 1]],
    ['flags.present', []],
    ['flags.justExists', []],
  ]);

  it('EQ: satisfiable when the value is in the key set, not otherwise', () => {
    expect(
      isConditionSatisfiable(
        { path: { container: 'flags', key: 'hasKey' }, op: 'EQ', value: 'x' },
        model,
      ),
    ).toBe(true);
    expect(
      isConditionSatisfiable(
        { path: { container: 'flags', key: 'hasKey' }, op: 'EQ', value: 'missing' },
        model,
      ),
    ).toBe(false);
  });

  it('EQ: a key touched only by an unknown effect (ANY_VALUE) satisfies any target', () => {
    expect(
      isConditionSatisfiable(
        { path: { container: 'flags', key: 'present' }, op: 'EQ', value: 'anything' },
        reachableStateModel([['flags.present', [ANY_VALUE]]]),
      ),
    ).toBe(true);
  });

  it('IN: satisfiable when at least one listed value is possible', () => {
    expect(
      isConditionSatisfiable(
        { path: { container: 'danger', key: 'level' }, op: 'IN', value: [9, 0] },
        model,
      ),
    ).toBe(true);
    expect(
      isConditionSatisfiable(
        { path: { container: 'danger', key: 'level' }, op: 'IN', value: [9, 8] },
        model,
      ),
    ).toBe(false);
  });

  it('NEQ/GT/GTE/LT/LTE/EXISTS: key existence suffices (no value inference)', () => {
    for (const op of ['NEQ', 'GT', 'GTE', 'LT', 'LTE'] as const) {
      expect(
        isConditionSatisfiable(
          { path: { container: 'flags', key: 'justExists' }, op, value: 5 },
          model,
        ),
      ).toBe(true);
    }
    expect(
      isConditionSatisfiable(
        { path: { container: 'flags', key: 'justExists' }, op: 'EXISTS' },
        model,
      ),
    ).toBe(true);
    expect(
      isConditionSatisfiable({ path: { container: 'flags', key: 'never' }, op: 'EXISTS' }, model),
    ).toBe(false);
  });

  it('all/any compose as conjunction/disjunction', () => {
    const all: Condition = {
      all: [
        { path: { container: 'flags', key: 'hasKey' }, op: 'EQ', value: 'x' },
        { path: { container: 'flags', key: 'never' }, op: 'EXISTS' },
      ],
    };
    expect(isConditionSatisfiable(all, model)).toBe(false);
    const any: Condition = {
      any: [
        { path: { container: 'flags', key: 'hasKey' }, op: 'EQ', value: 'nope' },
        { path: { container: 'flags', key: 'justExists' }, op: 'EXISTS' },
      ],
    };
    expect(isConditionSatisfiable(any, model)).toBe(true);
  });

  it('not: unsatisfiable only when every inner path is absent from the model', () => {
    expect(
      isConditionSatisfiable(
        { not: { path: { container: 'flags', key: 'never' }, op: 'EXISTS' } },
        model,
      ),
    ).toBe(false);
    expect(
      isConditionSatisfiable(
        { not: { path: { container: 'flags', key: 'hasKey' }, op: 'EQ', value: 'x' } },
        model,
      ),
    ).toBe(true);
  });
});

describe('checkEndingSatisfiability (T006)', () => {
  it('reports an unsatisfiable non-fallback ending from the state fixture', () => {
    const { raw } = loadChapterPack(`${fixtureRoot}/state-unsatisfiable-ending`);
    const schemaResult = runSchemaValidation(raw);
    const graph = buildStoryGraphModel(schemaResult);
    const reachable = computeReachability(graph, 'scene-start').reachable;
    const model = buildReachableStateModel(schemaResult, reachable);
    const findings = checkEndingSatisfiability(schemaResult, model, reachable);
    expect(findings.map((f) => f.targetId)).toEqual(['ending-unsat']);
  });

  it('A14 positive: graph-clean produces no ending findings', () => {
    const { raw } = loadChapterPack(`${fixtureRoot}/graph-clean`);
    const schemaResult = runSchemaValidation(raw);
    const graph = buildStoryGraphModel(schemaResult);
    const reachable = computeReachability(graph, 'scene-start').reachable;
    const model = buildReachableStateModel(schemaResult, reachable);
    expect(checkEndingSatisfiability(schemaResult, model, reachable)).toEqual([]);
  });

  it('skips fallback endings and unreachable endings', () => {
    const schemaResult = emptySchemaResult();
    schemaResult.endings.passed.push(
      {
        file: 'endings/fallback.json',
        value: {
          id: 'fallback',
          title: 't',
          when: null,
          priority: 1,
          isFallback: true,
          visualSceneId: 'v',
          narrationBlockIds: [],
        },
      },
      {
        file: 'endings/unsat.json',
        value: {
          id: 'unsat',
          title: 't',
          when: { path: { container: 'flags', key: 'never' }, op: 'EXISTS' },
          priority: 2,
          isFallback: false,
          visualSceneId: 'v',
          narrationBlockIds: [],
        },
      },
    );
    // "unsat" is not in the reachable set → not checked.
    const findings = checkEndingSatisfiability(schemaResult, emptyModel(), new Set(['fallback']));
    expect(findings).toEqual([]);
  });
});

describe('checkRecoverySatisfiability (T006)', () => {
  it('reports REQUIRE_RECOVERY with no possibly-triggerable downed-covering rule', () => {
    const { raw } = loadChapterPack(`${fixtureRoot}/state-unsatisfiable-recovery`);
    const schemaResult = runSchemaValidation(raw);
    const graph = buildStoryGraphModel(schemaResult);
    const reachable = computeReachability(graph, 'scene-start').reachable;
    const model = buildReachableStateModel(schemaResult, reachable);
    const findings = checkRecoverySatisfiability(schemaResult, model);
    expect(findings.map((f) => f.targetId)).toEqual(['recovery']);
  });

  it('is vacuous under AUTO_SPEND_LIFE (graph-clean)', () => {
    const { raw } = loadChapterPack(`${fixtureRoot}/graph-clean`);
    const schemaResult = runSchemaValidation(raw);
    const findings = checkRecoverySatisfiability(schemaResult, emptyModel());
    expect(findings).toEqual([]);
  });

  it('passes when a downed-covering rule is possibly triggerable', () => {
    const schemaResult = emptySchemaResult();
    schemaResult.manifest = {
      passed: {
        schemaVersion: '1.0',
        chapterId: 'c',
        chapterVersion: 'v',
        title: 't',
        entryNodeId: 's1',
        language: 'zh',
        authoring: { createdAt: '2026-08-18' },
      },
      failed: [],
    };
    schemaResult.storyGraph = {
      passed: { nodes: [{ id: 's1', kind: 'SCENE', file: 'scenes/s1.json' }] },
      failed: [],
    };
    schemaResult.worldRules = {
      passed: {
        viewerDefaults: { hp: 3, life: 2 },
        downedPolicy: 'REQUIRE_RECOVERY',
        defaultScaleBands: [],
        defaultDiceProfileId: 'd1',
        interactionDefaults: { openDurationMs: 15000, noParticipationPolicy: { kind: 'SKIP' } },
        diceBuffer: { minDiceMs: 3000, targetDiceMs: 6000, maxDiceMs: 12000 },
      },
      failed: [],
    };
    schemaResult.scenes.passed.push({
      file: 'scenes/s1.json',
      value: {
        id: 's1',
        visualSceneId: 'v',
        characters: [],
        next: 'e1',
        hostPolicy: 'ALLOWED',
      },
    });
    schemaResult.endings.passed.push({
      file: 'endings/e1.json',
      value: {
        id: 'e1',
        title: 't',
        when: null,
        priority: 1,
        isFallback: true,
        visualSceneId: 'v',
        narrationBlockIds: [],
      },
    });
    schemaResult.recovery.passed.push({
      file: 'recovery/r1.json',
      value: {
        id: 'r1',
        when: { kind: 'SCENE_ENTER', nodeId: 's1' },
        scope: 'ALL_DOWNED',
        effects: [{ scope: 'ALL_DOWNED', op: 'REVIVE' }],
      },
    });
    const findings = checkRecoverySatisfiability(schemaResult, emptyModel());
    expect(findings).toEqual([]);
  });

  it('reports REQUIRE_RECOVERY when no rule covers DOWNED viewers', () => {
    const schemaResult = emptySchemaResult();
    schemaResult.worldRules = {
      passed: {
        viewerDefaults: { hp: 3, life: 2 },
        downedPolicy: 'REQUIRE_RECOVERY',
        defaultScaleBands: [],
        defaultDiceProfileId: 'd1',
        interactionDefaults: { openDurationMs: 15000, noParticipationPolicy: { kind: 'SKIP' } },
        diceBuffer: { minDiceMs: 3000, targetDiceMs: 6000, maxDiceMs: 12000 },
      },
      failed: [],
    };
    schemaResult.recovery.passed.push({
      file: 'recovery/r1.json',
      value: {
        id: 'r1',
        when: { kind: 'SCENE_ENTER', nodeId: 's1' },
        scope: 'ALL_ACTIVE',
        effects: [{ scope: 'ALL_ACTIVE', op: 'HEAL', amount: 1 }],
      },
    });
    const findings = checkRecoverySatisfiability(schemaResult, emptyModel());
    expect(findings.map((f) => f.targetId)).toEqual(['recovery']);
  });
});

function emptyModel(): ReachableStateModel {
  return { keys: new Map() };
}
