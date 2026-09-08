import { loadChapterPack, runSchemaValidation } from '@interactive-story/chapter-compiler';
import type { AssetRequirements } from './assetRequirements.js';
import { extractAssetRequirements } from './extractAssetRequirements.js';

export function generateAssetRequirements(rootDir: string): AssetRequirements {
  const { raw } = loadChapterPack(rootDir);
  const schemaResult = runSchemaValidation(raw);
  return extractAssetRequirements(schemaResult);
}
