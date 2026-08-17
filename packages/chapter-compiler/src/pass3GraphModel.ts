import type { SchemaValidationResult } from './pass1Schema.js';

export type StoryGraphNodeKind = 'SCENE' | 'BOSS' | 'ENDING';

export interface StoryGraphModel {
  nodes: Map<string, StoryGraphNodeKind>;
  edges: Map<string, Set<string>>;
}

/**
 * Assemble the scattered Scene/Interaction/Boss/Ending data of a
 * SchemaValidationResult into one uniform directed graph.
 *
 * Only PASS 1-passed entries are trusted as graph structure sources. The
 * module performs no validity judgement of its own: whether an edge target
 * exists is PASS 2's already-verified concern; whether a guard would fire at
 * runtime is not a static concern at all. Every declared transition is taken
 * as a possible edge (union, no condition filtering).
 */
export function buildStoryGraphModel(schemaResult: SchemaValidationResult): StoryGraphModel {
  const nodes = new Map<string, StoryGraphNodeKind>();
  for (const node of schemaResult.storyGraph.passed?.nodes ?? []) {
    nodes.set(node.id, node.kind);
  }

  const edges = new Map<string, Set<string>>();
  const addEdge = (from: string, to: string): void => {
    const targets = edges.get(from) ?? new Set<string>();
    targets.add(to);
    edges.set(from, targets);
  };

  for (const entry of schemaResult.scenes.passed) {
    const scene = entry.value;
    if (scene.next !== undefined) {
      addEdge(scene.id, scene.next);
    }
    for (const guard of scene.guards ?? []) {
      addEdge(scene.id, guard.goto);
    }
    if (scene.interactionId !== undefined) {
      const interaction = schemaResult.interactions.passed.find(
        (i) => i.value.id === scene.interactionId,
      );
      if (interaction !== undefined) {
        addEdge(scene.id, interaction.value.nextScene);
      }
    }
  }

  for (const entry of schemaResult.boss.passed) {
    addEdge(entry.value.id, entry.value.onDefeat);
    addEdge(entry.value.id, entry.value.onFailure);
  }

  // EndingNode contributes no outgoing edges by design.

  return { nodes, edges };
}
