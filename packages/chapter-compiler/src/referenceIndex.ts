import type { SchemaValidationResult } from './pass1Schema.js';

export interface ReferenceIndex {
  scenes: Set<string>;
  interactions: Set<string>;
  actions: Set<string>;
  diceProfiles: Set<string>;
  resultDictionaries: Set<string>;
  narrativeBlocks: Set<string>;
  resultNarratives: Set<string>;
  npcDefinitions: Set<string>;
  visualScenes: Set<string>;
  characterAssets: Map<string, Set<string>>;
  imageAssets: Set<string>;
  audioAssets: Set<string>;
  bossNodes: Set<string>;
  endings: Set<string>;
  recoveryRules: Set<string>;
  storyGraphNodes: Set<string>;
  storyGraphNodeKinds: Map<string, 'SCENE' | 'BOSS' | 'ENDING'>;
  nodeFileToId: Map<string, string>;
}

export function buildReferenceIndex(schemaResult: SchemaValidationResult): ReferenceIndex {
  const index: ReferenceIndex = {
    scenes: collectIds(schemaResult.scenes.passed),
    interactions: collectIds(schemaResult.interactions.passed),
    actions: collectIds(schemaResult.actions.passed),
    diceProfiles: collectIds(schemaResult.dice.passed),
    resultDictionaries: collectIds(schemaResult.results.passed),
    narrativeBlocks: new Set(),
    resultNarratives: new Set(),
    npcDefinitions: collectIds(schemaResult.npc.passed),
    visualScenes: collectIds(schemaResult.visuals.passed.filter((e) => 'layers' in e.value)),
    characterAssets: new Map(),
    imageAssets: collectIds(schemaResult.visuals.passed.filter((e) => 'file' in e.value)),
    audioAssets: collectIds(schemaResult.audio.passed),
    bossNodes: collectIds(schemaResult.boss.passed),
    endings: collectIds(schemaResult.endings.passed),
    recoveryRules: collectIds(schemaResult.recovery.passed),
    storyGraphNodes: new Set(),
    storyGraphNodeKinds: new Map(),
    nodeFileToId: new Map(),
  };

  for (const entry of schemaResult.narrative.passed) {
    if ('focus' in entry.value) {
      index.resultNarratives.add(entry.value.id);
    } else {
      index.narrativeBlocks.add(entry.value.id);
    }
  }

  for (const entry of schemaResult.visuals.passed) {
    if ('expressions' in entry.value) {
      index.characterAssets.set(entry.value.id, new Set(Object.keys(entry.value.expressions)));
    }
  }

  const nodes = schemaResult.storyGraph.passed?.nodes ?? [];
  for (const node of nodes) {
    index.storyGraphNodes.add(node.id);
    index.storyGraphNodeKinds.set(node.id, node.kind);
  }

  for (const entry of [
    ...schemaResult.scenes.passed,
    ...schemaResult.boss.passed,
    ...schemaResult.endings.passed,
  ]) {
    index.nodeFileToId.set(entry.file, entry.value.id);
  }

  return index;
}

function collectIds<T extends { id: string }>(entries: { value: T }[]): Set<string> {
  const ids = new Set<string>();
  for (const entry of entries) {
    ids.add(entry.value.id);
  }
  return ids;
}
