import type { ReferenceIndex } from './referenceIndex.js';
import type { SchemaValidationResult } from './pass1Schema.js';
import type { ReferenceIssue } from './types.js';

export function runNpcVisualsChecks(
  schemaResult: SchemaValidationResult,
  index: ReferenceIndex,
): ReferenceIssue[] {
  const issues: ReferenceIssue[] = [];

  for (const entry of schemaResult.npc.passed) {
    if (!index.characterAssets.has(entry.value.characterAssetId)) {
      issues.push({
        category: 'npcVisuals.characterAssetId',
        severity: 'BLOCKING',
        message: `NPCDefinition "${entry.value.id}" characterAssetId "${entry.value.characterAssetId}" is not declared as a CharacterAsset in visuals/`,
        file: entry.file,
      });
    }
  }

  for (const scene of schemaResult.scenes.passed) {
    for (const placement of scene.value.characters) {
      const npcDefinition = schemaResult.npc.passed.find(
        (n) => n.value.id === placement.characterId,
      );
      if (npcDefinition === undefined) {
        issues.push({
          category: 'npcVisuals.characterId',
          severity: 'BLOCKING',
          message: `CharacterPlacement "${placement.characterId}" of SceneNode "${scene.value.id}" is not declared in npc/`,
          file: scene.file,
        });
        continue;
      }
      if (placement.expression === undefined) {
        continue;
      }
      const expressions = index.characterAssets.get(npcDefinition.value.characterAssetId);
      if (expressions === undefined) {
        continue;
      }
      if (!expressions.has(placement.expression)) {
        issues.push({
          category: 'npcVisuals.expression',
          severity: 'BLOCKING',
          message: `CharacterPlacement "${placement.characterId}" of SceneNode "${scene.value.id}" expression "${placement.expression}" is not a key of CharacterAsset "${npcDefinition.value.characterAssetId}" expressions`,
          file: scene.file,
        });
      }
    }
  }

  return issues;
}
