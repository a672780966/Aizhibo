import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { NarrativeBlockAudioResult } from '@interactive-story/audio-production-queue';
import { generateChapterPackagerReport } from './generateChapterPackagerReport.js';

// Same fixture resolution pattern as packages/chapter-compiler/src/compile.test.ts
// and DEV-073/074 siblings: up two levels from this package's src/ lands on
// packages/, then into chapter-compiler.
const fixtureRoot = fileURLToPath(
  new URL('../../chapter-compiler/test-fixtures/valid-minimal', import.meta.url),
);

/**
 * Real production-run-shaped results for the two blocks that are reachable
 * in valid-minimal (block-follow-failure via interaction-01 → result-follow,
 * block-follow-success via the same chain and via ending-end.narrationBlockIds).
 */
const AUDIO_RESULTS: NarrativeBlockAudioResult[] = [
  {
    ok: true,
    file: 'audio/block-follow-failure.mp3',
    blockId: 'block-follow-failure',
    slot: 'PRIMARY',
  },
  {
    ok: true,
    file: 'audio/block-follow-success.mp3',
    blockId: 'block-follow-success',
    slot: 'PRIMARY',
  },
];

describe('generateChapterPackagerReport — valid-minimal fixture（真实 loadChapterPack + runSchemaValidation + runPass3）', () => {
  it('A15: returns a structurally complete report whose arrays are real computations over the real fixture', () => {
    const report = generateChapterPackagerReport(fixtureRoot, AUDIO_RESULTS);

    // assetFileExistence: real existsSync over every file-bearing ImageAsset
    // and PREPRODUCED|PREGENERATED AudioAsset of the fixture (5 of them;
    // voice-guide is RUNTIME_TTS and is skipped). The fixture ships no
    // assets/ dir, so every referenced file genuinely does not exist.
    expect(report.assetFileExistence.map((r) => r.assetId)).toEqual([
      'amb-forest',
      'bgm-main',
      'img-forest',
      'img-guide-neutral',
      'img-guide-smile',
    ]);
    expect(report.assetFileExistence.every((r) => r.exists === false)).toBe(true);
    expect(report.assetFileExistence).toMatchObject([
      { assetId: 'amb-forest', file: 'assets/audio/amb-forest.mp3', exists: false },
      { assetId: 'bgm-main', file: 'assets/audio/bgm-main.mp3', exists: false },
      { assetId: 'img-forest', file: 'assets/img/forest.png', exists: false },
      { assetId: 'img-guide-neutral', file: 'assets/img/guide-neutral.png', exists: false },
      { assetId: 'img-guide-smile', file: 'assets/img/guide-smile.png', exists: false },
    ]);

    // narrativeBlockAudioCoverage: reachability is computed for real via
    // runPass3 (entry node scene-start), so exactly the two reachable blocks
    // appear, both covered by the caller-supplied ok:true results.
    expect(report.narrativeBlockAudioCoverage).toEqual([
      { blockId: 'block-follow-failure', covered: true },
      { blockId: 'block-follow-success', covered: true },
    ]);
  });

  it('A15b: coverage honestly reports ok:false / absent results as uncovered over the real pipeline', () => {
    const partial: NarrativeBlockAudioResult[] = [
      {
        ok: false,
        reason: 'voice unavailable',
        blockId: 'block-follow-failure',
        slot: 'PRIMARY',
      },
      // block-follow-success intentionally missing from the results.
    ];
    const report = generateChapterPackagerReport(fixtureRoot, partial);
    expect(report.narrativeBlockAudioCoverage).toEqual([
      { blockId: 'block-follow-failure', covered: false },
      { blockId: 'block-follow-success', covered: false },
    ]);
  });
});
