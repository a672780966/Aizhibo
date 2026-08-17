import { describe, expect, it } from 'vitest';
import type { StoryGraphModel } from './pass3GraphModel.js';
import { computeAncestors } from './pass6Ancestors.js';

function chainGraph(): StoryGraphModel {
  return {
    nodes: new Map([
      ['a', 'SCENE'],
      ['b', 'SCENE'],
      ['c', 'SCENE'],
    ]),
    edges: new Map([
      ['a', new Set(['b'])],
      ['b', new Set(['c'])],
      ['c', new Set()],
    ]),
  };
}

describe('computeAncestors (T003)', () => {
  it('A14: on a chain A→B→C, ancestors of C are {A,B,C} and a node is its own ancestor', () => {
    const graph = chainGraph();
    const all = new Set(['a', 'b', 'c']);
    expect([...computeAncestors(graph, 'c', all)].sort()).toEqual(['a', 'b', 'c']);
    expect([...computeAncestors(graph, 'b', all)].sort()).toEqual(['a', 'b']);
    expect([...computeAncestors(graph, 'a', all)].sort()).toEqual(['a']);
  });

  it('does not include unrelated branches', () => {
    const graph: StoryGraphModel = {
      nodes: new Map([
        ['entry', 'SCENE'],
        ['branchA', 'SCENE'],
        ['branchB', 'SCENE'],
      ]),
      edges: new Map([
        ['entry', new Set(['branchA', 'branchB'])],
        ['branchA', new Set()],
        ['branchB', new Set()],
      ]),
    };
    const all = new Set(['entry', 'branchA', 'branchB']);
    // branchA's ancestors: only entry + itself; branchB is not on any path to branchA.
    expect([...computeAncestors(graph, 'branchA', all)].sort()).toEqual(['branchA', 'entry']);
    expect(computeAncestors(graph, 'branchA', all).has('branchB')).toBe(false);
  });

  it('intersects with globalReachable (unreachable predecessors excluded)', () => {
    const graph = chainGraph();
    // b is NOT globally reachable → even though a→b→c exists, ancestors of c exclude b.
    expect([...computeAncestors(graph, 'c', new Set(['a', 'c']))].sort()).toEqual(['a', 'c']);
  });

  it('returns an empty set when the target itself is not globally reachable', () => {
    const graph = chainGraph();
    expect([...computeAncestors(graph, 'c', new Set(['a', 'b']))]).toEqual([]);
  });

  it('handles cycles without infinite loops', () => {
    const graph: StoryGraphModel = {
      nodes: new Map([
        ['x', 'SCENE'],
        ['y', 'SCENE'],
      ]),
      edges: new Map([
        ['x', new Set(['y', 'x'])],
        ['y', new Set(['x'])],
      ]),
    };
    const all = new Set(['x', 'y']);
    expect([...computeAncestors(graph, 'y', all)].sort()).toEqual(['x', 'y']);
  });
});
