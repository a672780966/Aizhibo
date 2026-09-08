import { describe, expect, it } from 'vitest';
import type { SchemaValidationResult } from '@interactive-story/chapter-compiler';
import { extractAssetRequirements } from './extractAssetRequirements.js';

/**
 * Hand-built minimal SchemaValidationResult: only the `visuals` and `audio`
 * collections are populated realistically; every other section is an empty
 * placeholder that satisfies the type. Includes, per A07/A08/A09:
 * - two VisualScenes whose layers duplicate `img-forest` (dedup proof) and
 *   introduce `img-cave`,
 * - one CharacterAsset with a two-entry `expressions` record and a
 *   `microAnimations` array that duplicates `anim-wave` (dedup proof),
 * - one bare ImageAsset (`img-logo`) that no layer references (A08),
 * - two `kind:'BGM'` entries sharing the id `bgm-main` (dedup proof), plus
 *   one SPEECH and one AMBIENCE entry,
 * - one fake failed entry in each of `visuals.failed` and `audio.failed`
 *   (A09).
 */
function buildSchemaResult(): SchemaValidationResult {
  return {
    manifest: { passed: null, failed: [] },
    storyGraph: { passed: null, failed: [] },
    initialState: { passed: null, failed: [] },
    worldRules: { passed: null, failed: [] },
    hostPublic: { passed: null, failed: [] },
    scenes: { passed: [], failed: [] },
    interactions: { passed: [], failed: [] },
    actions: { passed: [], failed: [] },
    dice: { passed: [], failed: [] },
    results: { passed: [], failed: [] },
    stateRules: { passed: [], failed: [] },
    narrative: { passed: [], failed: [] },
    npc: { passed: [], failed: [] },
    recovery: { passed: [], failed: [] },
    boss: { passed: [], failed: [] },
    endings: { passed: [], failed: [] },
    metadata: { passed: [], failed: [] },
    visuals: {
      passed: [
        {
          file: 'visuals/vs-cave.json',
          value: {
            id: 'vs-cave',
            layers: [
              { assetId: 'img-cave', z: 0 },
              { assetId: 'img-forest', z: 1 },
            ],
          },
        },
        {
          file: 'visuals/vs-forest.json',
          value: { id: 'vs-forest', layers: [{ assetId: 'img-forest', z: 0 }] },
        },
        {
          file: 'visuals/char-guide.json',
          value: {
            id: 'char-guide',
            expressions: { smile: 'img-guide-smile', neutral: 'img-guide-neutral' },
            microAnimations: ['anim-wave', 'anim-idle', 'anim-wave'],
            defaultExpression: 'neutral',
          },
        },
        {
          file: 'visuals/img-logo.json',
          value: { id: 'img-logo', file: 'assets/img/logo.png' },
        },
      ],
      failed: [{ file: 'visuals/broken-scene.json', issues: [] }],
    },
    audio: {
      passed: [
        {
          file: 'audio/bgm-main.json',
          value: {
            id: 'bgm-main',
            kind: 'BGM',
            source: 'PREPRODUCED',
            file: 'assets/audio/bgm-main.mp3',
          },
        },
        {
          file: 'audio/bgm-main-dup.json',
          value: {
            id: 'bgm-main',
            kind: 'BGM',
            source: 'PREGENERATED',
            file: 'assets/audio/bgm-main-alt.mp3',
          },
        },
        {
          file: 'audio/voice-guide.json',
          value: {
            id: 'voice-guide',
            kind: 'SPEECH',
            source: 'RUNTIME_TTS',
            ttsSpec: { voiceId: 'voice-zh-female', voiceSettings: {} },
          },
        },
        {
          file: 'audio/amb-forest.json',
          value: {
            id: 'amb-forest',
            kind: 'AMBIENCE',
            source: 'PREGENERATED',
            file: 'assets/audio/amb-forest.mp3',
          },
        },
      ],
      failed: [{ file: 'audio/broken-bgm.json', issues: [] }],
    },
  };
}

const EXPECTED = {
  illustrations: ['img-cave', 'img-forest'],
  expressions: ['img-guide-neutral', 'img-guide-smile'],
  frameSequences: ['anim-idle', 'anim-wave'],
  bgm: ['bgm-main'],
  voice: ['amb-forest', 'voice-guide'],
} as const;

describe('extractAssetRequirements', () => {
  it('A07: returns exactly the deduplicated, lexicographically sorted five arrays', () => {
    const result = extractAssetRequirements(buildSchemaResult());
    expect(result).toEqual(EXPECTED);
  });

  it('A08: a bare ImageAsset produces no output unless a layer references it', () => {
    const result = extractAssetRequirements(buildSchemaResult());
    for (const category of Object.values(result)) {
      expect(category).not.toContain('img-logo');
    }
  });

  it('A09: failed validation entries are silently ignored — no crash, no output from them', () => {
    // Same input as A07 (already carries visuals.failed/audio.failed entries):
    // extraction must neither throw nor surface anything from the failed files.
    expect(() => extractAssetRequirements(buildSchemaResult())).not.toThrow();
    expect(extractAssetRequirements(buildSchemaResult())).toEqual(EXPECTED);
  });
});
