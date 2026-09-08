import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { noopTtsProviderPort } from '@interactive-story/audio-engine';
import { generateAudioProductionQueue } from './generateAudioProductionQueue.js';
import type { VoiceConfig } from './runAudioProductionQueue.js';

// Same fixture resolution pattern as packages/chapter-compiler/src/compile.test.ts
// and packages/asset-requirement-generator: up two levels from this package's
// src/ lands on packages/, then into chapter-compiler.
const fixtureRoot = fileURLToPath(
  new URL('../../chapter-compiler/test-fixtures/valid-minimal', import.meta.url),
);

const VOICE: VoiceConfig = { voiceId: 'voice-test', voiceSettings: {} };

describe('generateAudioProductionQueue — valid-minimal fixture（真实 loadChapterPack + runSchemaValidation）', () => {
  it('A13: runs the real pipeline against the real fixture with noopTtsProviderPort — every block honestly fails with "no TTS provider configured", no network', async () => {
    const results = await generateAudioProductionQueue(fixtureRoot, noopTtsProviderPort, VOICE);

    // The fixture narrative/ dir holds 2 NarrativeBlock files and 2
    // ResultNarrative index records — only the 2 real blocks may produce
    // results (ResultNarrative entries are skipped end to end).
    expect(results).toHaveLength(2);
    for (const result of results) {
      expect(result).toEqual({
        ok: false,
        reason: 'no TTS provider configured',
        blockId: expect.any(String),
        slot: 'PRIMARY',
      });
    }
  });

  it('A13b: the produced results correspond to the real fixture blocks, id-sorted (block-follow-failure before block-follow-success)', async () => {
    const results = await generateAudioProductionQueue(fixtureRoot, noopTtsProviderPort, VOICE);

    expect(results.map((r) => r.blockId)).toEqual(['block-follow-failure', 'block-follow-success']);
    expect(results.every((r) => r.slot === 'PRIMARY')).toBe(true);
    // Deterministic: the same input yields the same output order every run.
    const again = await generateAudioProductionQueue(fixtureRoot, noopTtsProviderPort, VOICE);
    expect(again.map((r) => r.blockId)).toEqual(results.map((r) => r.blockId));
  });
});
