import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadChapterPack } from './loader.js';
import { runSchemaValidation, type SchemaValidationResult } from './pass1Schema.js';
import { buildStoryGraphModel, type StoryGraphModel } from './pass3GraphModel.js';
import { computeReachability } from './pass3Reachability.js';
import { buildForbiddenLexicon } from './pass6ForbiddenLexicon.js';

const fixtureRoot = fileURLToPath(new URL('../test-fixtures', import.meta.url));

function lexiconOf(fixture: string) {
  const { raw } = loadChapterPack(`${fixtureRoot}/${fixture}`);
  const schemaResult = runSchemaValidation(raw);
  const graph = buildStoryGraphModel(schemaResult);
  const globalReachable = computeReachability(
    graph,
    schemaResult.manifest.passed?.entryNodeId ?? '',
  ).reachable;
  return buildForbiddenLexicon(schemaResult, graph, globalReachable);
}

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

describe('buildForbiddenLexicon (T007)', () => {
  it('A15: valid-minimal start scene bans boss displayName and ending title (not yet happened)', () => {
    const lexicon = lexiconOf('valid-minimal');
    // valid-minimal graph: scene-start → boss-tyrant → ending-end.
    expect((lexicon.bySceneId['scene-start'] ?? []).sort()).toEqual(['暴君', '结局']);
    // Neither the boss nor the ending is an ancestor of ANY scene → always-banned.
    expect(lexicon.always.sort()).toEqual(['暴君', '结局']);
  });

  it('host-clean has the same graph shape, same lexicon', () => {
    const lexicon = lexiconOf('host-clean');
    expect((lexicon.bySceneId['scene-start'] ?? []).sort()).toEqual(['暴君', '结局']);
  });

  it('a boss that precedes a later scene is NOT forbidden at that later scene', () => {
    const schemaResult = emptySchemaResult();
    schemaResult.boss.passed.push({
      file: 'boss/boss-tyrant.json',
      value: {
        id: 'boss-tyrant',
        displayName: '暴君',
        visualSceneId: 'v',
        phases: [],
        variables: {},
        stateRuleSetId: 'rs',
        onDefeat: 'e1',
        onFailure: 'e2',
      },
    });
    schemaResult.endings.passed.push({
      file: 'endings/e1.json',
      value: {
        id: 'e1',
        title: '结局甲',
        when: null,
        priority: 1,
        isFallback: true,
        visualSceneId: 'v',
        narrationBlockIds: [],
      },
    });
    const graph: StoryGraphModel = {
      nodes: new Map([
        ['s1', 'SCENE'],
        ['boss-tyrant', 'BOSS'],
        ['s2', 'SCENE'],
        ['e1', 'ENDING'],
      ]),
      edges: new Map([
        ['s1', new Set(['boss-tyrant'])],
        ['boss-tyrant', new Set(['s2', 'e1'])],
        ['s2', new Set(['e1'])],
        ['e1', new Set()],
      ]),
    };
    const globalReachable = new Set(['s1', 'boss-tyrant', 's2', 'e1']);
    const lexicon = buildForbiddenLexicon(schemaResult, graph, globalReachable);
    // s1: boss not yet happened → banned. s2: boss already happened → allowed.
    expect((lexicon.bySceneId['s1'] ?? []).sort()).toEqual(['暴君', '结局甲']);
    expect(lexicon.bySceneId['s2']).toEqual(['结局甲']);
    // ending is never an ancestor of a scene → always; boss is an ancestor of s2 → not always.
    expect(lexicon.always).toEqual(['结局甲']);
  });

  it('deduplicates same-name endpoints and ignores unreachable scenes', () => {
    const schemaResult = emptySchemaResult();
    schemaResult.endings.passed.push(
      {
        file: 'endings/e1.json',
        value: {
          id: 'e1',
          title: '同一个结局',
          when: null,
          priority: 1,
          isFallback: true,
          visualSceneId: 'v',
          narrationBlockIds: [],
        },
      },
      {
        file: 'endings/e2.json',
        value: {
          id: 'e2',
          title: '同一个结局',
          when: null,
          priority: 2,
          isFallback: false,
          visualSceneId: 'v',
          narrationBlockIds: [],
        },
      },
    );
    // e2 is not registered as a graph node; only s1 is a reachable scene.
    const graph: StoryGraphModel = {
      nodes: new Map([
        ['s1', 'SCENE'],
        ['s-lost', 'SCENE'],
        ['e1', 'ENDING'],
      ]),
      edges: new Map([
        ['s1', new Set(['e1'])],
        ['e1', new Set()],
      ]),
    };
    const lexicon = buildForbiddenLexicon(schemaResult, graph, new Set(['s1', 'e1']));
    expect(lexicon.bySceneId['s1']).toEqual(['同一个结局']);
    expect('s-lost' in lexicon.bySceneId).toBe(false);
    // e1 is an ancestor of s1 → not always. e2 not in any scene's ancestors → always.
    expect(lexicon.always).toEqual(['同一个结局']);
  });
});
