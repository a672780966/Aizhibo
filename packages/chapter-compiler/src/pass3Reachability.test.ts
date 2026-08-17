import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadChapterPack } from './loader.js';
import { runSchemaValidation } from './pass1Schema.js';
import { buildStoryGraphModel, type StoryGraphModel } from './pass3GraphModel.js';
import { computeReachability } from './pass3Reachability.js';

const fixtureRoot = fileURLToPath(new URL('../test-fixtures', import.meta.url));

function graphOf(fixture: string): StoryGraphModel {
  const { raw } = loadChapterPack(`${fixtureRoot}/${fixture}`);
  return buildStoryGraphModel(runSchemaValidation(raw));
}

describe('computeReachability (T003)', () => {
  it('reaches all nodes of a clean graph, dead ends and unreachable lists empty', () => {
    const graph = graphOf('graph-clean');
    const result = computeReachability(graph, 'scene-start');
    expect([...result.reachable].sort()).toEqual([
      'boss-tyrant',
      'ending-end',
      'ending-nice',
      'scene-forest',
      'scene-start',
      'scene-tavern',
    ]);
    expect(result.deadEnds).toEqual([]);
    expect(result.unreachableNodes).toEqual([]);
    expect(result.unreachableEndings).toEqual([]);
    expect(result.unreachableBosses).toEqual([]);
  });

  it('treats a reachable scene without outgoing edges as the only dead end', () => {
    const graph = graphOf('graph-dead-end');
    const result = computeReachability(graph, 'scene-start');
    expect(result.deadEnds).toEqual(['scene-dead']);
    expect(result.unreachableNodes).toEqual([]);
    expect(result.unreachableEndings).toEqual([]);
    expect(result.unreachableBosses).toEqual([]);
  });

  it('reports only the unreachable scene', () => {
    const graph = graphOf('graph-unreachable-scene');
    const result = computeReachability(graph, 'scene-start');
    expect(result.deadEnds).toEqual([]);
    expect(result.unreachableNodes).toEqual(['scene-lost']);
    expect(result.unreachableEndings).toEqual([]);
    expect(result.unreachableBosses).toEqual([]);
  });

  it('reports any unreachable ending (A12: all endings must be reachable)', () => {
    const graph = graphOf('graph-unreachable-ending');
    const result = computeReachability(graph, 'scene-start');
    expect(result.deadEnds).toEqual([]);
    expect(result.unreachableNodes).toEqual(['ending-lost']);
    expect(result.unreachableEndings).toEqual(['ending-lost']);
    expect(result.unreachableBosses).toEqual([]);
  });

  it('reports only the unreachable boss', () => {
    const graph = graphOf('graph-unreachable-boss');
    const result = computeReachability(graph, 'scene-start');
    expect(result.deadEnds).toEqual([]);
    expect(result.unreachableNodes).toEqual(['boss-lost']);
    expect(result.unreachableEndings).toEqual([]);
    expect(result.unreachableBosses).toEqual(['boss-lost']);
  });

  it('returns an empty reachable set when the entry node is not in the graph', () => {
    const graph: StoryGraphModel = {
      nodes: new Map([['s1', 'SCENE']]),
      edges: new Map(),
    };
    const result = computeReachability(graph, 'ghost-entry');
    expect(result.reachable.size).toBe(0);
    expect(result.unreachableNodes).toEqual(['s1']);
  });

  it('A10: each of the four defect fixture kinds triggers only its own field', () => {
    const deadEnd = computeReachability(graphOf('graph-dead-end'), 'scene-start');
    expect(deadEnd.deadEnds.length).toBeGreaterThan(0);
    expect(deadEnd.unreachableNodes).toEqual([]);

    const unreachableScene = computeReachability(graphOf('graph-unreachable-scene'), 'scene-start');
    expect(unreachableScene.deadEnds).toEqual([]);
    expect(unreachableScene.unreachableNodes.length).toBeGreaterThan(0);
    expect(unreachableScene.unreachableEndings).toEqual([]);
    expect(unreachableScene.unreachableBosses).toEqual([]);

    const unreachableEnding = computeReachability(
      graphOf('graph-unreachable-ending'),
      'scene-start',
    );
    expect(unreachableEnding.deadEnds).toEqual([]);
    expect(unreachableEnding.unreachableEndings.length).toBeGreaterThan(0);
    expect(unreachableEnding.unreachableBosses).toEqual([]);

    const unreachableBoss = computeReachability(graphOf('graph-unreachable-boss'), 'scene-start');
    expect(unreachableBoss.deadEnds).toEqual([]);
    expect(unreachableBoss.unreachableBosses.length).toBeGreaterThan(0);
  });
});
