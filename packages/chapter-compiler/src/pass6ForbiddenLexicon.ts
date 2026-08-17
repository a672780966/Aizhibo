import type { SchemaValidationResult } from './pass1Schema.js';
import type { StoryGraphModel } from './pass3GraphModel.js';
import { computeAncestors } from './pass6Ancestors.js';

/**
 * Runtime no-say lexicon (ADDENDUM §A15.1 / CR-010): per scene, the surface
 * strings a Host must not utter because the corresponding story beat has not
 * happened yet. Sources are STRUCTURED fields only — EndingNode.title and
 * BossNode.displayName — never narrative prose (full-text scanning is out of
 * scope, see Future Considerations). This is data, not runtime matching
 * (normalization / DROP rules are DEV-050A's job in M5).
 */
export interface ForbiddenLexicon {
  bySceneId: Record<string, string[]>;
  always: string[];
}

export function buildForbiddenLexicon(
  schemaResult: SchemaValidationResult,
  graph: StoryGraphModel,
  globalReachable: Set<string>,
): ForbiddenLexicon {
  const endpointNames = new Map<string, string>();
  for (const entry of schemaResult.endings.passed) {
    endpointNames.set(entry.value.id, entry.value.title);
  }
  for (const entry of schemaResult.boss.passed) {
    endpointNames.set(entry.value.id, entry.value.displayName);
  }

  const bySceneId: Record<string, string[]> = {};
  const seenByAnyScene = new Set<string>();
  for (const [nodeId, kind] of graph.nodes) {
    if (kind !== 'SCENE' || !globalReachable.has(nodeId)) continue;
    const ancestors = computeAncestors(graph, nodeId, globalReachable);
    for (const ancestorId of ancestors) {
      seenByAnyScene.add(ancestorId);
    }
    const forbidden = new Set<string>();
    for (const [endpointId, name] of endpointNames) {
      if (name === '') continue;
      if (!ancestors.has(endpointId)) {
        forbidden.add(name);
      }
    }
    bySceneId[nodeId] = [...forbidden].sort();
  }

  const always = new Set<string>();
  for (const [endpointId, name] of endpointNames) {
    if (name === '') continue;
    // Not an ancestor of ANY reachable scene → can never be pre-known → always banned.
    if (!seenByAnyScene.has(endpointId)) {
      always.add(name);
    }
  }

  return { bySceneId, always: [...always].sort() };
}
