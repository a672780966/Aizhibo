import type {
  NarrativeBlock,
  ResultNarrative,
  WorldState,
} from '@interactive-story/chapter-schema';
import { evaluateCondition } from '@interactive-story/rule-engine';
import { composeSingleNarrative } from './composeSingle.js';
import { categorizeFocus } from './focus.js';

/**
 * Final narration text for a whole resolution round, plus the ids of any
 * narratives that were deferred (their text is intentionally absent).
 */
export interface ComposedResultSet {
  text: string;
  deferredNarrativeIds: string[];
}

/**
 * Top-level entry point: categorize the round's narratives, fully compose the
 * PRIMARY one, briefly mention (single primary-slot sentence) each SUPPORT and
 * CONTEXT entry, defer the DEFERRED ones, and join everything with single
 * spaces (constraint 5, consistent with T003's joining policy).
 */
export function composeResultSetNarration(
  narratives: ResultNarrative[],
  blocksById: Map<string, NarrativeBlock>,
  worldState: WorldState,
): ComposedResultSet {
  const { primary, support, context, deferred } = categorizeFocus(narratives);

  const parts = [
    composeSingleNarrative(primary, blocksById, worldState),
    ...support.map((n) => shortRef(n, blocksById, worldState)),
    ...context.map((n) => shortRef(n, blocksById, worldState)),
  ].filter((part) => part !== '');

  return {
    text: parts.join(' '),
    deferredNarrativeIds: deferred.map((n) => n.id),
  };
}

/**
 * A brief single-sentence mention: only the narrative's primary-block text.
 * A missing or condition-failing primary block yields an empty string (the
 * entry is then omitted from the joined text — never an error). Rationale in
 * DECISIONS D4.
 */
function shortRef(
  narrative: ResultNarrative,
  blocksById: Map<string, NarrativeBlock>,
  worldState: WorldState,
): string {
  const block = blocksById.get(narrative.primaryBlockId);
  if (block === undefined) return '';
  if (block.when !== undefined && !evaluateCondition(block.when, worldState)) return '';
  return block.text;
}
