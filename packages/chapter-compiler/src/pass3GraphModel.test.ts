import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadChapterPack } from './loader.js';
import { runSchemaValidation } from './pass1Schema.js';
import type { SchemaValidationResult } from './pass1Schema.js';
import { buildStoryGraphModel } from './pass3GraphModel.js';

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

describe('buildStoryGraphModel (T002)', () => {
  it('sources nodes from story.graph.json only', () => {
    const schemaResult = emptySchemaResult();
    schemaResult.storyGraph = {
      passed: {
        nodes: [
          { id: 's1', kind: 'SCENE', file: 'scenes/s1.json' },
          { id: 'b1', kind: 'BOSS', file: 'boss/b1.json' },
          { id: 'e1', kind: 'ENDING', file: 'endings/e1.json' },
        ],
      },
      failed: [],
    };
    const model = buildStoryGraphModel(schemaResult);
    expect(model.nodes.get('s1')).toBe('SCENE');
    expect(model.nodes.get('b1')).toBe('BOSS');
    expect(model.nodes.get('e1')).toBe('ENDING');
    expect(model.nodes.size).toBe(3);
  });

  it('takes the union of next, guard targets and interaction nextScene without condition filtering', () => {
    const schemaResult = emptySchemaResult();
    schemaResult.storyGraph = { passed: { nodes: [] }, failed: [] };
    schemaResult.scenes.passed.push({
      file: 'scenes/s1.json',
      value: {
        id: 's1',
        visualSceneId: 'v1',
        characters: [],
        next: 's2',
        guards: [
          {
            when: { path: { container: 'flags', key: 'a' }, op: 'EXISTS' },
            goto: 's3',
            priority: 1,
          },
        ],
        interactionId: 'i1',
        hostPolicy: 'ALLOWED',
      },
    });
    schemaResult.interactions.passed.push({
      file: 'interactions/i1.json',
      value: {
        id: 'i1',
        openDurationMs: 15000,
        choices: [],
        diceMode: 'PER_ACTION_GROUP',
        resultPolicy: 'p',
        nextScene: 's4',
        noParticipationPolicy: { kind: 'SKIP' },
      },
    });
    const model = buildStoryGraphModel(schemaResult);
    // next + guards are unioned, no condition judgement.
    expect([...model.edges.get('s1')!].sort()).toEqual(['s2', 's3', 's4']);
  });

  it('adds boss onDefeat / onFailure edges and no edges for endings', () => {
    const schemaResult = emptySchemaResult();
    schemaResult.storyGraph = { passed: { nodes: [] }, failed: [] };
    schemaResult.boss.passed.push({
      file: 'boss/b1.json',
      value: {
        id: 'b1',
        displayName: 'b',
        visualSceneId: 'v',
        phases: [],
        variables: {},
        stateRuleSetId: 'rs',
        onDefeat: 'ending-win',
        onFailure: 'ending-lose',
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
    const model = buildStoryGraphModel(schemaResult);
    expect([...model.edges.get('b1')!].sort()).toEqual(['ending-lose', 'ending-win']);
    expect(model.edges.has('e1')).toBe(false);
  });

  it('ignores entries that failed PASS 1', () => {
    const schemaResult = emptySchemaResult();
    schemaResult.storyGraph = { passed: { nodes: [] }, failed: [] };
    schemaResult.scenes.failed.push({ file: 'scenes/bad.json', issues: [] });
    const model = buildStoryGraphModel(schemaResult);
    expect(model.edges.size).toBe(0);
  });

  it('A09: graph-clean model node count matches story.graph.json declarations', () => {
    const { raw } = loadChapterPack(`${fixtureRoot}/graph-clean`);
    const schemaResult = runSchemaValidation(raw);
    const declared = raw.storyGraph;
    expect(declared).not.toBeNull();
    const model = buildStoryGraphModel(schemaResult);
    const declaredCount = (declared as { nodes: unknown[] }).nodes.length;
    expect(model.nodes.size).toBe(declaredCount);
    expect(model.nodes.size).toBe(6);
  });
});
