import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generateAssetRequirements } from './generateAssetRequirements.js';

// Same fixture resolution pattern as packages/chapter-compiler/src/compile.test.ts:
// up two levels from this package's src/ lands on packages/, then into chapter-compiler.
const fixtureRoot = fileURLToPath(
  new URL('../../chapter-compiler/test-fixtures/valid-minimal', import.meta.url),
);

describe('generateAssetRequirements — valid-minimal fixture（真实 loadChapterPack + runSchemaValidation）', () => {
  it('A10: extracts the five arrays matching the real fixture content', () => {
    const requirements = generateAssetRequirements(fixtureRoot);
    expect(requirements.illustrations).toEqual(['img-forest']);
    expect(requirements.expressions).toEqual(['img-guide-neutral', 'img-guide-smile']);
    expect(requirements.frameSequences).toEqual([]);
    expect(requirements.bgm).toEqual(['bgm-main']);
    expect(requirements.voice).toEqual(['amb-forest', 'voice-guide']);
  });

  it('A11: every returned array is deduplicated and lexicographically sorted', () => {
    const requirements = generateAssetRequirements(fixtureRoot);
    for (const category of Object.values(requirements)) {
      expect(new Set(category).size).toBe(category.length);
      expect(category).toEqual([...category].sort());
    }
  });
});
