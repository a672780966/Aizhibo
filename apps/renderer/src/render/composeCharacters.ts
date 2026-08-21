import type { ResolvedCharacterPlacement } from '@interactive-story/runtime-kernel';

/** A character positioned at a fixed five-slot horizontal layout, ready to render. */
export interface RenderableCharacter {
  characterId: string;
  file: string;
  leftPercent: number;
  animated: boolean;
}

/**
 * Fixed five-slot → leftPercent mapping (ADDENDUM §A9 / D06 frozen product
 * decision): five evenly spaced positions. Kept as a single lookup so the
 * mapping is documented in one place (DECISIONS D1).
 */
const SLOT_LEFT_PERCENT: Record<ResolvedCharacterPlacement['slot'], number> = {
  LEFT: 10,
  CENTER_LEFT: 30,
  CENTER: 50,
  CENTER_RIGHT: 70,
  RIGHT: 90,
};

/**
 * Turn resolved character placements into renderables: drop invisible
 * characters, map `slot` → `leftPercent`, and flag `animated` when the
 * character declares any micro-animation. This node does NOT distinguish
 * micro-animations by name (no real animation assets exist yet); any
 * `animated === true` character gets one generic CSS breathing effect on the
 * renderer side (DECISIONS D3). Name-driven micro-animations wait for real
 * animation assets.
 */
export function composeCharacters(characters: ResolvedCharacterPlacement[]): RenderableCharacter[] {
  return characters
    .filter((character) => character.visible)
    .map((character) => ({
      characterId: character.characterId,
      file: character.file,
      leftPercent: SLOT_LEFT_PERCENT[character.slot],
      animated: (character.microAnimations?.length ?? 0) > 0,
    }));
}
