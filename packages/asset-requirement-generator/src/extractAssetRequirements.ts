import type { SchemaValidationResult } from '@interactive-story/chapter-compiler';
import type { AssetRequirements } from './assetRequirements.js';

export function extractAssetRequirements(schemaResult: SchemaValidationResult): AssetRequirements {
  const illustrations: string[] = [];
  const expressions: string[] = [];
  const frameSequences: string[] = [];
  const bgm: string[] = [];
  const voice: string[] = [];

  for (const { value } of schemaResult.visuals.passed) {
    if ('layers' in value) {
      for (const layer of value.layers) {
        illustrations.push(layer.assetId);
      }
    } else if ('expressions' in value) {
      expressions.push(...Object.values(value.expressions));
      frameSequences.push(...(value.microAnimations ?? []));
    }
    // Otherwise it is a bare ImageAsset: it is only a referenced target, not a
    // requirement on its own, so it produces no output here.
  }

  for (const { value } of schemaResult.audio.passed) {
    if (value.kind === 'BGM') {
      bgm.push(value.id);
    } else {
      voice.push(value.id);
    }
  }

  return {
    illustrations: Array.from(new Set(illustrations)).sort(),
    expressions: Array.from(new Set(expressions)).sort(),
    frameSequences: Array.from(new Set(frameSequences)).sort(),
    bgm: Array.from(new Set(bgm)).sort(),
    voice: Array.from(new Set(voice)).sort(),
  };
}
