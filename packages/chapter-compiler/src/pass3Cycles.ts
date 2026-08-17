import type { StoryGraphModel } from './pass3GraphModel.js';

export interface TrapCycle {
  members: string[];
}

/**
 * Detect trap cycles ("infinite loop detection", PASS 3): strongly connected
 * components of the REACHABLE subgraph from which no edge escapes. A single
 * node counts only if it has an explicit self-loop (a lone node with no edges
 * is a dead end, reported by PASS 3 reachability, not an infinite loop).
 * A lone ENDING node is never a trap: having no outgoing edges is its design.
 *
 * If any member has at least one edge leaving the SCC, the cycle is
 * considered escapable and NOT reported — statically we cannot know whether a
 * guard would fire at runtime, so the mere existence of an escape edge is
 * treated as a possible escape (conservative over-approximation per
 * TASK-PACKAGE-DEV-003 §2).
 */
export function detectTrapCycles(graph: StoryGraphModel, reachable: Set<string>): TrapCycle[] {
  // Tarjan's SCC algorithm over the reachable subgraph (hand-written; no
  // third-party graph library per task package §9 constraint 3).
  const index = new Map<string, number>();
  const lowLink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];
  let nextIndex = 0;

  const strongConnect = (v: string): void => {
    index.set(v, nextIndex);
    lowLink.set(v, nextIndex);
    nextIndex += 1;
    stack.push(v);
    onStack.add(v);

    for (const w of graph.edges.get(v) ?? []) {
      if (!reachable.has(w)) continue;
      if (!index.has(w)) {
        strongConnect(w);
        const vLow = lowLink.get(v) ?? 0;
        const wLow = lowLink.get(w) ?? 0;
        lowLink.set(v, Math.min(vLow, wLow));
      } else if (onStack.has(w)) {
        const vLow = lowLink.get(v) ?? 0;
        const wIndex = index.get(w) ?? 0;
        lowLink.set(v, Math.min(vLow, wIndex));
      }
    }

    if (lowLink.get(v) === index.get(v)) {
      const component: string[] = [];
      let w: string | undefined;
      do {
        w = stack.pop();
        if (w === undefined) break;
        onStack.delete(w);
        component.push(w);
      } while (w !== v);
      sccs.push(component);
    }
  };

  for (const id of graph.nodes.keys()) {
    if (reachable.has(id) && !index.has(id)) {
      strongConnect(id);
    }
  }

  const traps: TrapCycle[] = [];
  for (const scc of sccs) {
    if (scc.length === 1 && graph.nodes.get(scc[0] ?? '') === 'ENDING') continue;
    const memberSet = new Set(scc);
    let hasInternalEdge = false;
    let hasEscapeEdge = false;
    for (const v of scc) {
      for (const w of graph.edges.get(v) ?? []) {
        if (!reachable.has(w)) continue;
        if (memberSet.has(w)) {
          hasInternalEdge = true;
        } else {
          hasEscapeEdge = true;
        }
      }
    }
    if (hasEscapeEdge) continue;
    if (!hasInternalEdge) continue;
    traps.push({ members: scc });
  }
  return traps;
}
