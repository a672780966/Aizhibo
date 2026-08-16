import type { SchemaValidationResult, ValidatedEntry } from './pass1Schema.js';

export type UniquenessCategory =
  | 'scenes'
  | 'interactions'
  | 'actions'
  | 'diceProfiles'
  | 'resultDictionaries'
  | 'narrativeBlocks'
  | 'resultNarratives'
  | 'npcDefinitions'
  | 'visualScenes'
  | 'characterAssets'
  | 'imageAssets'
  | 'audioAssets'
  | 'bossNodes'
  | 'endings'
  | 'recoveryRules'
  | 'storyGraph.nodes'
  | 'storyGraph.crossKind';

export interface UniquenessIssue {
  category: UniquenessCategory;
  id: string;
  conflictingFiles: string[];
}

export function checkIdUniqueness(schemaResult: SchemaValidationResult): UniquenessIssue[] {
  const issues: UniquenessIssue[] = [];

  collectWithin('scenes', schemaResult.scenes.passed);
  collectWithin('interactions', schemaResult.interactions.passed);
  collectWithin('actions', schemaResult.actions.passed);
  collectWithin('diceProfiles', schemaResult.dice.passed);
  collectWithin('resultDictionaries', schemaResult.results.passed);
  collectWithin('npcDefinitions', schemaResult.npc.passed);
  collectWithin('recoveryRules', schemaResult.recovery.passed);
  collectWithin('bossNodes', schemaResult.boss.passed);
  collectWithin('endings', schemaResult.endings.passed);
  collectWithin('audioAssets', schemaResult.audio.passed);

  collectNarrativeUniqueness(schemaResult);

  const visuals = schemaResult.visuals.passed;
  collectWithin(
    'visualScenes',
    visuals.filter((e) => 'layers' in e.value) as ValidatedEntry<{ id: string }>[],
  );
  collectWithin(
    'characterAssets',
    visuals.filter((e) => 'expressions' in e.value) as ValidatedEntry<{ id: string }>[],
  );
  collectWithin(
    'imageAssets',
    visuals.filter((e) => 'file' in e.value) as ValidatedEntry<{ id: string }>[],
  );

  collectStoryGraphNodeUniqueness(schemaResult);
  collectCrossKindFileUniqueness(schemaResult);

  return issues;

  function collectWithin(
    category: UniquenessCategory,
    entries: ValidatedEntry<{ id: string }>[],
  ): void {
    const byId = new Map<string, string[]>();
    for (const entry of entries) {
      const files = byId.get(entry.value.id) ?? [];
      files.push(entry.file);
      byId.set(entry.value.id, files);
    }
    for (const [id, files] of byId) {
      if (files.length > 1) {
        issues.push({ category, id, conflictingFiles: files });
      }
    }
  }

  function collectNarrativeUniqueness(schemaResult: SchemaValidationResult): void {
    const blocks: ValidatedEntry<{ id: string }>[] = [];
    const results: ValidatedEntry<{ id: string }>[] = [];
    for (const entry of schemaResult.narrative.passed) {
      if ('focus' in entry.value) {
        results.push(entry as ValidatedEntry<{ id: string }>);
      } else {
        blocks.push(entry as ValidatedEntry<{ id: string }>);
      }
    }
    collectWithin('narrativeBlocks', blocks);
    collectWithin('resultNarratives', results);
  }

  function collectStoryGraphNodeUniqueness(schemaResult: SchemaValidationResult): void {
    const nodes = schemaResult.storyGraph.passed?.nodes ?? [];
    const byId = new Map<string, string[]>();
    for (const node of nodes) {
      const files = byId.get(node.id) ?? [];
      files.push('story.graph.json');
      byId.set(node.id, files);
    }
    for (const [id, files] of byId) {
      if (files.length > 1) {
        issues.push({ category: 'storyGraph.nodes', id, conflictingFiles: files });
      }
    }
  }

  function collectCrossKindFileUniqueness(schemaResult: SchemaValidationResult): void {
    const kindBuckets: { kind: string; entries: ValidatedEntry<{ id: string }>[] }[] = [
      { kind: 'scenes', entries: schemaResult.scenes.passed },
      { kind: 'boss', entries: schemaResult.boss.passed },
      { kind: 'endings', entries: schemaResult.endings.passed },
    ];
    const kindsById = new Map<string, Map<string, string[]>>();
    for (const bucket of kindBuckets) {
      for (const entry of bucket.entries) {
        const byKind = kindsById.get(entry.value.id) ?? new Map<string, string[]>();
        const files = byKind.get(bucket.kind) ?? [];
        files.push(entry.file);
        byKind.set(bucket.kind, files);
        kindsById.set(entry.value.id, byKind);
      }
    }
    for (const [id, byKind] of kindsById) {
      if (byKind.size > 1) {
        const conflictingFiles: string[] = [];
        for (const files of byKind.values()) {
          conflictingFiles.push(...files);
        }
        issues.push({ category: 'storyGraph.crossKind', id, conflictingFiles });
      }
    }
  }
}
