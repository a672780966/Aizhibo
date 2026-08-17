import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadChapterPack } from './loader.js';
import { runSchemaValidation, type SchemaValidationResult } from './pass1Schema.js';
import { buildStoryGraphModel } from './pass3GraphModel.js';
import { computeReachability } from './pass3Reachability.js';
import { checkDisclosureSafety } from './pass6Disclosure.js';

const fixtureRoot = fileURLToPath(new URL('../test-fixtures', import.meta.url));

function graphOf(fixture: string) {
  const { raw } = loadChapterPack(`${fixtureRoot}/${fixture}`);
  const schemaResult = runSchemaValidation(raw);
  const graph = buildStoryGraphModel(schemaResult);
  const globalReachable = computeReachability(
    graph,
    schemaResult.manifest.passed?.entryNodeId ?? '',
  ).reachable;
  return { schemaResult, graph, globalReachable };
}

/** Minimal SchemaValidationResult with all collections empty. */
function emptySchemaResult(): SchemaValidationResult {
  return {
    manifest: { passed: null, failed: [] },
    storyGraph: { passed: null, failed: [] },
    initialState: { passed: null, failed: [] },
    worldRules: { passed: null, failed: [] },
    hostPublic: {
      passed: { flagVisibility: {}, sceneDisclosures: {}, tensionLabels: {} },
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

/**
 * A minimal two-scene chain s1 → s2. scene s1's interaction runs action act1
 * whose result dictionary sets flags.known=true (so s2's ancestors model
 * contains flags.known). s2 declares a fact depending on flags.known.
 */
function chainResultWith(
  strings: {
    hostVisibility?: Record<string, 'PUBLIC' | 'HIDDEN'>;
    deps?: Record<string, string[]>;
  } = {},
) {
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
        { id: 's2', kind: 'SCENE', file: 'scenes/s2.json' },
      ],
    },
    failed: [],
  };
  schemaResult.initialState.passed = {
    chapterId: 'c',
    sceneId: 's1',
    flags: {},
    npc: {},
    danger: { level: 0, tensionKey: 'calm' },
    discovered: [],
    activeThreats: [],
    chapterVariables: {},
  };
  schemaResult.scenes.passed.push(
    {
      file: 'scenes/s1.json',
      value: {
        id: 's1',
        visualSceneId: 'v',
        characters: [],
        interactionId: 'i1',
        hostPolicy: 'ALLOWED',
      },
    },
    {
      file: 'scenes/s2.json',
      value: { id: 's2', visualSceneId: 'v', characters: [], hostPolicy: 'ALLOWED' },
    },
  );
  schemaResult.interactions.passed.push({
    file: 'interactions/i1.json',
    value: {
      id: 'i1',
      openDurationMs: 15000,
      choices: [{ id: 'A', label: 'x', actionType: 't', ruleId: 'act1' }],
      diceMode: 'PER_ACTION_GROUP',
      resultPolicy: 'p',
      nextScene: 's2',
      noParticipationPolicy: { kind: 'SKIP' },
    },
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
          worldEffects: [{ path: { container: 'flags', key: 'known' }, op: 'SET', value: true }],
          playerEffects: [],
          narrativeId: 'n1',
          visibility: 'PUBLIC',
        },
      ],
    },
  });
  schemaResult.hostPublic.passed = {
    flagVisibility: { 'flags.known': 'HIDDEN', ...(strings.hostVisibility ?? {}) },
    sceneDisclosures: {
      s1: { locationLabel: 'x', knownFactIds: [], tensionKey: 't' },
      s2: {
        locationLabel: 'x',
        knownFactIds: ['fact-known'],
        tensionKey: 't',
        knownFactDependencies: strings.deps ?? { 'fact-known': ['flags.known'] },
      },
    },
    tensionLabels: { t: '平静' },
  };
  return {
    schemaResult,
    graph: buildStoryGraphModel(schemaResult),
    globalReachable: new Set(['s1', 's2']),
  };
}

describe('checkDisclosureSafety (T006, judgments 2+3)', () => {
  it('A13: undeclared fact dependencies are refused (host-fact-undeclared)', () => {
    const { schemaResult, graph, globalReachable } = graphOf('host-fact-undeclared');
    const issues = checkDisclosureSafety(schemaResult, graph, globalReachable);
    expect(issues.map((i) => i.category)).toEqual(['FACT_DEPENDENCY_NOT_DECLARED']);
    expect(issues[0]!.message).toContain('fact-ghost');
  });

  it('A13: a fact depending on a flag not yet established at the scene is a future leak', () => {
    const { schemaResult, graph, globalReachable } = graphOf('host-fact-future-leak');
    const issues = checkDisclosureSafety(schemaResult, graph, globalReachable);
    expect(issues.map((i) => i.category)).toEqual(['FACT_FUTURE_LEAK']);
    expect(issues[0]!.message).toContain('flags.gateOpen');
  });

  it('A13: a dependency that is established by an ancestor and marked PUBLIC passes', () => {
    const { schemaResult, graph, globalReachable } = chainResultWith({
      hostVisibility: { 'flags.known': 'PUBLIC' },
    });
    expect(checkDisclosureSafety(schemaResult, graph, globalReachable)).toEqual([]);
  });

  it('a dependency not marked PUBLIC is refused even if established', () => {
    // flags.known is established before s2 but marked HIDDEN → judged unsafe.
    const { schemaResult, graph, globalReachable } = chainResultWith({
      hostVisibility: { 'flags.known': 'HIDDEN' },
    });
    const issues = checkDisclosureSafety(schemaResult, graph, globalReachable);
    expect(issues.map((i) => i.category)).toEqual(['FACT_FUTURE_LEAK']);
    expect(issues[0]!.message).toContain('not marked PUBLIC');
  });

  it('skips scenes with no disclosure entry (that is scene coverage\u2019s job)', () => {
    const chain = chainResultWith();
    const schemaResult = chain.schemaResult;
    delete schemaResult.hostPublic.passed!.sceneDisclosures['s2'];
    expect(checkDisclosureSafety(schemaResult, chain.graph, chain.globalReachable)).toEqual([]);
  });

  it('host-clean: no facts, no findings', () => {
    const { schemaResult, graph, globalReachable } = graphOf('host-clean');
    expect(checkDisclosureSafety(schemaResult, graph, globalReachable)).toEqual([]);
  });
});
