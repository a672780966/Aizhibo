import type {
  NarrativeBlock,
  ResultNarrative,
  WorldState,
} from '@interactive-story/chapter-schema';
import { evaluateCondition } from '@interactive-story/rule-engine';

/**
 * Compose a single ResultNarrative into its final text by concatenating the
 * five narrative slots in the spec §13 order: PREFIX → SUPPORT → PRIMARY →
 * URGENCY → TRANSITION. Each referenced block is looked up in `blocksById`;
 * a missing block, or a block whose `when` condition is unmet (`undefined`
 * `when` = always true), is skipped — never thrown (constraint 5/8). The
 * successful blocks' texts are joined with a single space (constraint 5).
 *
 * Per T003 #5, even if the required `primaryBlockId` block is missing/unmet,
 * the other assembled slots are still returned (defensive over "strict fail").
 */
export function composeSingleNarrative(
  narrative: ResultNarrative,
  blocksById: Map<string, NarrativeBlock>,
  worldState: WorldState,
): string {
  const parts: string[] = [];
  const push = (blockId: string | undefined): void => {
    if (blockId === undefined) return;
    const block = blocksById.get(blockId);
    if (block === undefined) return; // missing reference -> skip (defensive)
    if (block.when !== undefined && !evaluateCondition(block.when, worldState)) return;
    parts.push(block.text);
  };

  push(narrative.prefixBlockId);
  for (const id of narrative.supportBlockIds ?? []) {
    push(id);
  }
  push(narrative.primaryBlockId);
  push(narrative.urgencyBlockId);
  push(narrative.transitionBlockId);

  return parts.join(' ');
}
