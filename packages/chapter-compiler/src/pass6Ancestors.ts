import type { StoryGraphModel } from './pass3GraphModel.js';

/**
 * Ancestors of a target node: every node X that is itself in
 * `globalReachable` AND from which a path along `graph.edges` leads to
 * `targetNodeId` (a node is its own ancestor — a scene obviously knows what
 * already happened inside itself). Computed as a reverse-graph BFS from the
 * target, intersected with `globalReachable`.
 *
 * Path existence is a graph-level fact, so the BFS traverses the full reverse
 * graph; the reachability filter applies only to the result (TASK-PACKAGE-DEV-
 * 002A T003 #2: an ancestor is a node that is itself in globalReachable AND
 * has a path to the target).
 *
 * This is the infrastructure behind PASS 6's timing judgment ("what could the
 * host already know at scene S"): feeding the ancestor set into DEV-003's
 * frozen buildReachableStateModel yields the state established no later than S.
 */
export function computeAncestors(
  graph: StoryGraphModel,
  targetNodeId: string,
  globalReachable: Set<string>,
): Set<string> {
  if (!globalReachable.has(targetNodeId)) {
    return new Set();
  }

  const reverse: Map<string, Set<string>> = new Map();
  for (const [from, targets] of graph.edges) {
    for (const to of targets) {
      const predecessors = reverse.get(to) ?? new Set<string>();
      predecessors.add(from);
      reverse.set(to, predecessors);
    }
  }

  const visited = new Set<string>([targetNodeId]);
  const queue = [targetNodeId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    for (const predecessor of reverse.get(current) ?? []) {
      if (visited.has(predecessor)) continue;
      visited.add(predecessor);
      queue.push(predecessor);
    }
  }

  const ancestors = new Set<string>();
  for (const id of visited) {
    if (globalReachable.has(id)) {
      ancestors.add(id);
    }
  }
  return ancestors;
}
