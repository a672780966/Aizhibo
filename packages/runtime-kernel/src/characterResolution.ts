import type { CompileResult } from '@interactive-story/chapter-compiler';
import type {
  CharacterAsset,
  CharacterPlacement,
  ImageAsset,
  NPCDefinition,
} from '@interactive-story/chapter-schema';

/**
 * One resolved character placement, with the three-hop reference chased to a
 * concrete image file in the Runtime (Dev Spec §35: the Renderer must not
 * read chapter content itself).
 *
 * `CharacterPlacement.characterId` is a THREE-hop reference, not a direct one:
 *   characterId → NPCDefinition.characterAssetId → CharacterAsset → ImageAsset
 * `characterId` lives in `schemaResult.npc.passed` (NOT `visuals.passed`).
 */
export interface ResolvedCharacterPlacement {
  characterId: string;
  slot: CharacterPlacement['slot'];
  visible: boolean;
  file: string;
  microAnimations?: string[];
}

/**
 * Resolve a scene's character placements to concrete image files. The three-hop
 * chain is:
 *
 *   placement.characterId   → NPCDefinition.id  （schemaResult.npc.passed）
 *   npc.characterAssetId    → CharacterAsset.id （schemaResult.visuals.passed，
 *                                判别 `'expressions' in value`）
 *   characterAsset.expressions[key] → ImageAsset.id（schemaResult.visuals.passed，
 *                                判别 `'file' in value`）
 *
 * Defensive (PASS2 reference integrity should already guarantee every hop): if
 * any hop is missing — the NPCDefinition, the CharacterAsset, the expressionKey
 * absent from `expressions`, or the ImageAsset — that character is skipped (no
 * throw, the rest still resolve). `visible` is kept untouched because whether
 * to draw a character is decided on the Renderer side (2.4), not here.
 */
export function resolveCharacterPlacements(
  compiled: CompileResult,
  placements: CharacterPlacement[],
): ResolvedCharacterPlacement[] {
  const npcs = compiled.schemaResult.npc.passed;
  const visuals = compiled.schemaResult.visuals.passed;
  const resolved: ResolvedCharacterPlacement[] = [];
  for (const placement of placements) {
    // Hop 1: characterId → NPCDefinition (npc collection).
    const npc = npcs.find((e) => e.value.id === placement.characterId)?.value as
      NPCDefinition | undefined;
    if (npc === undefined) continue;
    // Hop 2: characterAssetId → CharacterAsset (visuals collection).
    const characterAsset = visuals.find(
      (e) => e.value.id === npc.characterAssetId && 'expressions' in e.value,
    )?.value as CharacterAsset | undefined;
    if (characterAsset === undefined) continue;
    const expressionKey = placement.expression ?? characterAsset.defaultExpression;
    const imageAssetId = characterAsset.expressions[expressionKey];
    if (imageAssetId === undefined) continue;
    // Hop 3: expressions[expressionKey] → ImageAsset.file (visuals collection).
    const imageEntry = visuals.find((e) => e.value.id === imageAssetId && 'file' in e.value);
    if (imageEntry === undefined) continue;
    const image = imageEntry.value as ImageAsset;
    resolved.push({
      characterId: placement.characterId,
      slot: placement.slot,
      visible: placement.visible,
      file: image.file,
      ...(characterAsset.microAnimations !== undefined
        ? { microAnimations: characterAsset.microAnimations }
        : {}),
    });
  }
  return resolved;
}
