import {
  loadChapterPack,
  runPass3,
  runSchemaValidation,
} from '@interactive-story/chapter-compiler';
import type { NarrativeBlockAudioResult } from '@interactive-story/audio-production-queue';
import {
  checkAssetFileExistence,
  type AssetFileExistenceResult,
} from './checkAssetFileExistence.js';
import {
  checkNarrativeBlockAudioCoverage,
  type NarrativeBlockAudioCoverageResult,
} from './checkNarrativeBlockAudioCoverage.js';
import { computeReachableNarrativeBlockIds } from './computeReachableNarrativeBlockIds.js';

export interface ChapterPackagerReport {
  assetFileExistence: AssetFileExistenceResult[];
  narrativeBlockAudioCoverage: NarrativeBlockAudioCoverageResult[];
}

/**
 * Thin orchestration over the real loadChapterPack / runSchemaValidation /
 * runPass3 pipeline (same technique as DEV-073/074). entryNodeId is read
 * inside runPass3 from the real required ChapterManifestSchema.entryNodeId
 * field — it is never a caller parameter here.
 *
 * Produces an in-memory check report structure only: no Bundle/manifest
 * serialization, nothing written to disk (the Dev Spec only ever gives this
 * node its title, never a body defining what "packaging" outputs).
 */
export function generateChapterPackagerReport(
  rootDir: string,
  audioResults: NarrativeBlockAudioResult[],
): ChapterPackagerReport {
  const raw = loadChapterPack(rootDir);
  const schemaResult = runSchemaValidation(raw.raw);
  const pass3 = runPass3(schemaResult);
  const assetFileExistence = checkAssetFileExistence(schemaResult, rootDir);
  const reachableBlockIds = computeReachableNarrativeBlockIds(
    schemaResult,
    pass3.graphModel,
    pass3.reachability,
  );
  const narrativeBlockAudioCoverage = checkNarrativeBlockAudioCoverage(
    reachableBlockIds,
    audioResults,
  );
  return { assetFileExistence, narrativeBlockAudioCoverage };
}
