import type { ResultNarrative } from '@interactive-story/chapter-schema';

/**
 * Result of categorising the simultaneously-resolved narratives of one round
 * into the four focus tiers of spec §12 (PRIMARY/SUPPORT/CONTEXT/DEFERRED).
 */
export interface FocusCategorization {
  primary: ResultNarrative;
  support: ResultNarrative[];
  context: ResultNarrative[];
  deferred: ResultNarrative[];
}

/**
 * Classify the narratives of one resolution round by `focus.priority` /
 * `focus.category` / `focus.urgency` (task T004, spec §12). Rules, in order:
 *  1. PRIMARY: the highest `focus.priority`; ties keep the earlier array entry;
 *  2. SUPPORT: others whose `focus.category` equals PRIMARY's;
 *  3. CONTEXT: remaining (not PRIMARY/SUPPORT) whose `focus.urgency !== "NONE"`;
 *  4. DEFERRED: all remaining (different category and not urgent) — surfaced now,
 *     the "whether to catch up later" decision is the caller's, not this node's.
 *
 * THROWS on an empty input: this is the one deliberate exception in this node
 * (declared in DECISIONS D6). Every other function treats missing/unmet data
 * defensively; here an empty narratives array violates the caller contract
 * (a round always has at least one narrative), not a data-content defect.
 */
export function categorizeFocus(narratives: ResultNarrative[]): FocusCategorization {
  if (narratives.length === 0) {
    throw new Error('categorizeFocus requires at least one ResultNarrative');
  }

  // reduce with strict `>` keeps the earliest entry on equal priority.
  const primary = narratives.reduce((a, b) => (b.focus.priority > a.focus.priority ? b : a));

  const support = narratives.filter(
    (n) => n !== primary && n.focus.category === primary.focus.category,
  );
  const context = narratives.filter(
    (n) => n !== primary && !support.includes(n) && n.focus.urgency !== 'NONE',
  );
  const deferred = narratives.filter(
    (n) => n !== primary && !support.includes(n) && !context.includes(n),
  );

  return { primary, support, context, deferred };
}
