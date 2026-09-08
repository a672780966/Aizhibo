import type { SchemaValidationResult } from '@interactive-story/chapter-compiler';

/**
 * Extract the NarrativeBlock entries from a validated Chapter Pack.
 *
 * `schemaResult.narrative.passed` is a `CollectionResult<ResultNarrative |
 * NarrativeBlock>` union: a `ResultNarrative` is an index record that points
 * at block ids (`primaryBlockId`/`supportBlockIds`/...) and carries no
 * narration text — it produces no audio requirement of its own, so it is
 * skipped. Only entries that actually carry `text` (i.e. `NarrativeBlock`)
 * are returned, in `id` lexicographic order.
 *
 * Validation failures in `schemaResult.narrative.failed` are ignored, not
 * thrown — unvalidated content is not trustworthy enough to synthesize from.
 *
 * Deduplication is not this function's job: `NarrativeBlock.id` is already
 * globally unique by the DEV-002A uniqueness validation.
 */
export function extractNarrativeBlocks(
  schemaResult: SchemaValidationResult,
): Array<{ id: string; slot: string; text: string }> {
  const blocks: Array<{ id: string; slot: string; text: string }> = [];
  for (const { value } of schemaResult.narrative.passed) {
    if ('text' in value) {
      blocks.push({ id: value.id, slot: value.slot, text: value.text });
    }
    // Otherwise it is a ResultNarrative: an index record pointing at block
    // ids, not narrative content — skip.
  }
  return blocks.sort((a, b) => a.id.localeCompare(b.id));
}
