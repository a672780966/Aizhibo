import type { StoryGraphModel } from './pass3GraphModel.js';

export interface Pass3ReachabilityResult {
  reachable: Set<string>;
  deadEnds: string[];
  unreachableNodes: string[];
  unreachableEndings: string[];
  unreachableBosses: string[];
}

/**
 * Single BFS/DFS sweep from the entry node covering PASS 3's reachability,
 * dead-end, unreachable-node, unreachable-ending and unreachable-boss
 * detection. ENDING nodes are terminal by design and never dead ends;
 * unreachable nodes' dead-end status is meaningless, so dead ends are only
 * inspected among reachable nodes.
 */
export function computeReachability(
  graph: StoryGraphModel,
  entryNodeId: string,
): Pass3ReachabilityResult {
  const reachable = new Set<string>();
  if (graph.nodes.has(entryNodeId)) {
    const queue = [entryNodeId];
    reachable.add(entryNodeId);
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) break;
      for (const target of graph.edges.get(current) ?? []) {
        if (reachable.has(target)) continue;
        reachable.add(target);
        queue.push(target);
      }
    }
  }

  const unreachableNodes: string[] = [];
  const unreachableEndings: string[] = [];
  const unreachableBosses: string[] = [];
  for (const [id, kind] of graph.nodes) {
    if (reachable.has(id)) continue;
    unreachableNodes.push(id);
    if (kind === 'ENDING') {
      unreachableEndings.push(id);
    } else if (kind === 'BOSS') {
      unreachableBosses.push(id);
    }
  }

  const deadEnds: string[] = [];
  for (const id of reachable) {
    const kind = graph.nodes.get(id);
    if (kind === undefined || kind === 'ENDING') continue;
    if ((graph.edges.get(id)?.size ?? 0) === 0) {
      deadEnds.push(id);
    }
  }

  return { reachable, deadEnds, unreachableNodes, unreachableEndings, unreachableBosses };
}
