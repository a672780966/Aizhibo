import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SchemaValidationResult } from '@interactive-story/chapter-compiler';

export interface AssetFileExistenceResult {
  assetId: string;
  file: string;
  exists: boolean;
}

/**
 * PASS 7 (CR-006): asset file existence check over the PASS 1-passed
 * `visuals` and `audio` collections. `visuals.passed` is a
 * VisualScene | CharacterAsset | ImageAsset mixed union (same handling
 * technique as DEV-073 extractAssetRequirements): `'file' in value` picks
 * out the bare ImageAsset entries only. `audio.passed` is a PREPRODUCED /
 * PREGENERATED / RUNTIME_TTS three-variant union: `'file' in value` picks
 * the two file-bearing variants and skips RUNTIME_TTS (ttsSpec, no file).
 *
 * Path resolution is resolve(rootDir, value.file) — the same "relative to
 * rootDir" convention loader.ts uses to load Chapter Pack sources (the only
 * self-consistent precedent in the repo). That is an assumption, not a
 * spec-stated rule; see DECISIONS.md D5.
 *
 * Entries in `.failed` are ignored, never thrown on. Results are sorted by
 * assetId.
 */
export function checkAssetFileExistence(
  schemaResult: SchemaValidationResult,
  rootDir: string,
): AssetFileExistenceResult[] {
  const results: AssetFileExistenceResult[] = [];

  for (const { value } of schemaResult.visuals.passed) {
    if ('file' in value) {
      results.push({
        assetId: value.id,
        file: value.file,
        exists: existsSync(resolve(rootDir, value.file)),
      });
    }
  }

  for (const { value } of schemaResult.audio.passed) {
    if ('file' in value) {
      results.push({
        assetId: value.id,
        file: value.file,
        exists: existsSync(resolve(rootDir, value.file)),
      });
    }
  }

  return results.sort((a, b) => a.assetId.localeCompare(b.assetId));
}
