import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadChapterPack } from './loader.js';
import { runSchemaValidation } from './pass1Schema.js';
import { buildStoryGraphModel, type StoryGraphModel } from './pass3GraphModel.js';
import { computeReachability } from './pass3Reachability.js';
import { detectTrapCycles } from './pass3Cycles.js';

const fixtureRoot = fileURLToPath(new URL('../test-fixtures', import.meta.url));

describe('detectTrapCycles (T004)', () => {
  it('detects a mutual cycle with no escaping edge (graph-trap-cycle)', () => {
    const { raw } = loadChapterPack(`${fixtureRoot}/graph-trap-cycle`);
    const graph = buildStoryGraphModel(runSchemaValidation(raw));
    const reachable = computeReachability(graph, 'scene-start').reachable;
    const traps = detectTrapCycles(graph, reachable);
    expect(traps).toHaveLength(1);
    expect([...traps[0]!.members].sort()).toEqual(['scene-a', 'scene-b']);
  });

  it('detects a single-node self-loop as a trap', () => {
    const graph: StoryGraphModel = {
      nodes: new Map([
        ['a', 'SCENE'],
        ['e', 'ENDING'],
      ]),
      edges: new Map([['a', new Set(['a'])]]),
    };
    const traps = detectTrapCycles(graph, new Set(['a', 'e']));
    expect(traps).toHaveLength(1);
    expect(traps[0]!.members).toEqual(['a']);
  });

  it('does not flag a self-loop that also has an edge leaving it', () => {
    const graph: StoryGraphModel = {
      nodes: new Map([
        ['a', 'SCENE'],
        ['e', 'ENDING'],
      ]),
      edges: new Map([
        ['a', new Set(['a', 'e'])],
        ['e', new Set()],
      ]),
    };
    const traps = detectTrapCycles(graph, new Set(['a', 'e']));
    expect(traps).toEqual([]);
  });

  it('does not flag a cycle where a member has an escaping edge (over-approximation)', () => {
    const graph: StoryGraphModel = {
      nodes: new Map([
        ['a', 'SCENE'],
        ['b', 'SCENE'],
        ['e', 'ENDING'],
      ]),
      edges: new Map([
        ['a', new Set(['b'])],
        ['b', new Set(['a', 'e'])],
        ['e', new Set()],
      ]),
    };
    const traps = detectTrapCycles(graph, new Set(['a', 'b', 'e']));
    expect(traps).toEqual([]);
  });

  it('never flags an ENDING node itself (no outgoing edges is its design)', () => {
    const graph: StoryGraphModel = {
      nodes: new Map([['e', 'ENDING']]),
      edges: new Map(),
    };
    const traps = detectTrapCycles(graph, new Set(['e']));
    expect(traps).toEqual([]);
  });

  it('does not treat a plain dead-end node (no edges at all) as a cycle', () => {
    const graph: StoryGraphModel = {
      nodes: new Map([['a', 'SCENE']]),
      edges: new Map(),
    };
    const traps = detectTrapCycles(graph, new Set(['a']));
    expect(traps).toEqual([]);
  });

  it('only analyzes the reachable subgraph', () => {
    const graph: StoryGraphModel = {
      nodes: new Map([
        ['entry', 'SCENE'],
        ['loop', 'SCENE'],
      ]),
      edges: new Map([
        ['entry', new Set(['loop'])],
        ['loop', new Set(['loop'])],
      ]),
    };
    // loop is not in the reachable set → its self-loop must not be reported.
    const traps = detectTrapCycles(graph, new Set(['entry']));
    expect(traps).toEqual([]);
  });
});
