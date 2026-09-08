import type { NarrativeBlockAudioResult } from '@interactive-story/audio-production-queue';

export interface NarrativeBlockAudioCoverageResult {
  blockId: string;
  covered: boolean;
}

/**
 * PASS 7 audio coverage check over the reachable NarrativeBlock id set.
 *
 * The audioResults array is the ONLY input source: neither AudioAssetSchema
 * nor NarrativeBlockSchema carries a field binding a block to its audio
 * file (that binding mechanism has no assigned DEV number and no defined
 * format — see DEV-074 DECISIONS.md D4 and TASK-PACKAGE-DEV-074.md §10),
 * so no disk scan / naming convention / manifest format is invented here.
 * The caller passes real results, e.g. the return value of a
 * generateAudioProductionQueue run: `ok:true` counts as covered,
 * `ok:false` or absence from the array counts as uncovered.
 */
export function checkNarrativeBlockAudioCoverage(
  reachableBlockIds: Set<string>,
  audioResults: NarrativeBlockAudioResult[],
): NarrativeBlockAudioCoverageResult[] {
  return Array.from(reachableBlockIds)
    .sort()
    .map((blockId) => ({
      blockId,
      covered: audioResults.some((r) => r.blockId === blockId && r.ok === true),
    }));
}
