import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadChapterPack } from './loader.js';
import { runSchemaValidation, type SchemaValidationResult } from './pass1Schema.js';
import { buildStoryGraphModel } from './pass3GraphModel.js';
import { computeReachability } from './pass3Reachability.js';
import {
  buildReachableStateModel,
  type ReachableStateModel,
  type ReachableValue,
} from './pass5ReachableState.js';
import { checkFlagExhaustiveness, checkSceneCoverage } from './pass6Exhaustiveness.js';

const fixtureRoot = fileURLToPath(new URL('../test-fixtures', import.meta.url));

function globalStateModel(fixture: string) {
  const { raw } = loadChapterPack(`${fixtureRoot}/${fixture}`);
  const schemaResult = runSchemaValidation(raw);
  const graph = buildStoryGraphModel(schemaResult);
  const reachable = computeReachability(graph, schemaResult.manifest.passed?.entryNodeId ?? '');
  return {
    schemaResult,
    stateModel: buildReachableStateModel(schemaResult, reachable.reachable),
  };
}

/** Minimal SchemaValidationResult with all collections empty. */
function emptySchemaResult(): SchemaValidationResult {
  return {
    manifest: { passed: null, failed: [] },
    storyGraph: { passed: null, failed: [] },
    initialState: { passed: null, failed: [] },
    worldRules: { passed: null, failed: [] },
    hostPublic: {
      passed: {
        flagVisibility: {},
        sceneDisclosures: {},
        tensionLabels: {},
      },
      failed: [],
    },
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

describe('checkFlagExhaustiveness (T004, judgment 1: whitelist)', () => {
  it('A10: detects a reachable state key missing from flagVisibility (host-exhaustive-missing-flag)', () => {
    const { schemaResult, stateModel } = globalStateModel('host-exhaustive-missing-flag');
    const issues = checkFlagExhaustiveness(schemaResult, stateModel);
    const categories = issues.map((i) => i.category);
    expect(categories).toContain('FLAG_NOT_DECLARED');
    expect(issues.some((i) => i.message.includes('danger.level'))).toBe(true);
  });

  it('passes when every global reachable key is declared (host-clean)', () => {
    const { schemaResult, stateModel } = globalStateModel('host-clean');
    expect(checkFlagExhaustiveness(schemaResult, stateModel)).toEqual([]);
  });

  it('reports a single undeclared key without cascade noise', () => {
    const schemaResult = emptySchemaResult();
    schemaResult.hostPublic.passed = {
      flagVisibility: { 'flags.existing': 'HIDDEN' },
      sceneDisclosures: {},
      tensionLabels: {},
    };
    const stateModel: ReachableStateModel = {
      keys: new Map<string, Set<ReachableValue>>([
        ['flags.existing', new Set<ReachableValue>()],
        ['flags.ghost', new Set<ReachableValue>(['x'])],
      ]),
    };
    const issues = checkFlagExhaustiveness(schemaResult, stateModel);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain('flags.ghost');
  });

  it('fails closed when host.public.json itself failed PASS 1', () => {
    const schemaResult = emptySchemaResult();
    schemaResult.hostPublic = { passed: null, failed: [{ file: 'host.public.json', issues: [] }] };
    const issues = checkFlagExhaustiveness(schemaResult, { keys: new Map() });
    expect(issues[0]!.category).toBe('FLAG_NOT_DECLARED');
    expect(issues[0]!.severity).toBe('BLOCKING');
  });
});

describe('checkSceneCoverage (T004, judgment 1b)', () => {
  it('A11: detects a reachable SCENE missing from sceneDisclosures (host-scene-not-covered)', () => {
    const { raw } = loadChapterPack(`${fixtureRoot}/host-scene-not-covered`);
    const schemaResult = runSchemaValidation(raw);
    const issues = checkSceneCoverage(schemaResult);
    expect(issues.map((i) => i.category)).toEqual(['SCENE_NOT_COVERED']);
    expect(issues[0]!.message).toContain('scene-start');
  });

  it('passes for host-clean (scene-start covered)', () => {
    const { raw } = loadChapterPack(`${fixtureRoot}/host-clean`);
    const schemaResult = runSchemaValidation(raw);
    expect(checkSceneCoverage(schemaResult)).toEqual([]);
  });

  it('ignores non-SCENE nodes even when declared, and unreachable scenes', () => {
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
      passed: {
        nodes: [
          { id: 's1', kind: 'SCENE', file: 'scenes/s1.json' },
          { id: 's-lost', kind: 'SCENE', file: 'scenes/s-lost.json' },
          { id: 'b1', kind: 'BOSS', file: 'boss/b1.json' },
        ],
      },
      failed: [],
    };
    schemaResult.scenes.passed.push(
      {
        file: 'scenes/s1.json',
        value: { id: 's1', visualSceneId: 'v', characters: [], hostPolicy: 'ALLOWED' },
      },
      {
        file: 'scenes/s-lost.json',
        value: { id: 's-lost', visualSceneId: 'v', characters: [], hostPolicy: 'ALLOWED' },
      },
    );
    schemaResult.boss.passed.push({
      file: 'boss/b1.json',
      value: {
        id: 'b1',
        displayName: 'b1',
        visualSceneId: 'v',
        phases: [],
        variables: {},
        stateRuleSetId: 'rs',
        onDefeat: 'e',
        onFailure: 'e',
      },
    });
    // Only the reachable SCENE (s1) must be covered; boss and unreachable scene are ignored.
    schemaResult.hostPublic.passed = {
      flagVisibility: {},
      sceneDisclosures: { s1: { locationLabel: 'x', knownFactIds: [], tensionKey: 't' } },
      tensionLabels: {},
    };
    expect(checkSceneCoverage(schemaResult)).toEqual([]);
  });
});
