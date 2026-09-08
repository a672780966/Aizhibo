import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SchemaValidationResult } from '@interactive-story/chapter-compiler';
import { checkAssetFileExistence } from './checkAssetFileExistence.js';

let rootDir = '';

/**
 * A scratch Chapter-Pack-like root: only the two referenced real files are
 * created (assets/img/exists.png, assets/audio/exists.mp3); the other two
 * referenced files stay absent so a real existsSync distinguishes them.
 */
beforeAll(() => {
  rootDir = mkdtempSync(join(tmpdir(), 'chapter-packager-'));
  mkdirSync(join(rootDir, 'assets/img'), { recursive: true });
  mkdirSync(join(rootDir, 'assets/audio'), { recursive: true });
  writeFileSync(join(rootDir, 'assets/img/exists.png'), 'x');
  writeFileSync(join(rootDir, 'assets/audio/exists.mp3'), 'x');
});

afterAll(() => {
  rmSync(rootDir, { recursive: true, force: true });
});

/**
 * Hand-built SchemaValidationResult: only `visuals` and `audio` are
 * populated realistically. Per A07/A08/A09:
 * - a VisualScene (layers, no file) and a CharacterAsset (expressions /
 *   microAnimations, no file) that must both be skipped,
 * - two bare ImageAssets, one whose file exists on disk, one missing,
 * - a PREPRODUCED BGM whose file exists and a PREGENERATED SFX whose file
 *   is missing, plus a RUNTIME_TTS (ttsSpec, no file) that must be skipped,
 * - one fake failed entry in each of visuals.failed / audio.failed (A09).
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
          value: { id: 'vs-cave', layers: [{ assetId: 'img-exists', z: 0 }] },
        },
        {
          file: 'visuals/char-guide.json',
          value: {
            id: 'char-guide',
            expressions: { smile: 'img-exists' },
            microAnimations: ['anim-wave'],
            defaultExpression: 'neutral',
          },
        },
        {
          file: 'visuals/img-exists.json',
          value: { id: 'img-exists', file: 'assets/img/exists.png' },
        },
        {
          file: 'visuals/img-missing.json',
          value: { id: 'img-missing', file: 'assets/img/missing.png' },
        },
      ],
      failed: [{ file: 'visuals/broken-scene.json', issues: [] }],
    },
    audio: {
      passed: [
        {
          file: 'audio/bgm-exists.json',
          value: {
            id: 'bgm-exists',
            kind: 'BGM',
            source: 'PREPRODUCED',
            file: 'assets/audio/exists.mp3',
          },
        },
        {
          file: 'audio/sfx-missing.json',
          value: {
            id: 'sfx-missing',
            kind: 'SFX',
            source: 'PREGENERATED',
            file: 'assets/audio/missing.wav',
          },
        },
        {
          file: 'audio/voice-tts.json',
          value: {
            id: 'voice-tts',
            kind: 'SPEECH',
            source: 'RUNTIME_TTS',
            ttsSpec: { voiceId: 'voice-zh-female', voiceSettings: {} },
          },
        },
      ],
      failed: [{ file: 'audio/broken-bgm.json', issues: [] }],
    },
  };
}

describe('checkAssetFileExistence', () => {
  it('A07: picks exactly the file-bearing ImageAsset / PREPRODUCED|PREGENERATED entries, skipping VisualScene / CharacterAsset / RUNTIME_TTS', () => {
    const results = checkAssetFileExistence(buildSchemaResult(), rootDir);
    expect(results.map((r) => r.assetId)).toEqual([
      'bgm-exists',
      'img-exists',
      'img-missing',
      'sfx-missing',
    ]);
    expect(results).toEqual([
      { assetId: 'bgm-exists', file: 'assets/audio/exists.mp3', exists: true },
      { assetId: 'img-exists', file: 'assets/img/exists.png', exists: true },
      { assetId: 'img-missing', file: 'assets/img/missing.png', exists: false },
      { assetId: 'sfx-missing', file: 'assets/audio/missing.wav', exists: false },
    ]);
  });

  it('A08: real existsSync over the scratch root — existing files are true, absent files are false', () => {
    const results = checkAssetFileExistence(buildSchemaResult(), rootDir);
    const byId = new Map(results.map((r) => [r.assetId, r.exists]));
    expect(byId.get('img-exists')).toBe(true);
    expect(byId.get('bgm-exists')).toBe(true);
    expect(byId.get('img-missing')).toBe(false);
    expect(byId.get('sfx-missing')).toBe(false);
  });

  it('A09: failed validation entries are silently ignored — no crash, no results from them', () => {
    // buildSchemaResult() already carries visuals.failed / audio.failed entries.
    expect(() => checkAssetFileExistence(buildSchemaResult(), rootDir)).not.toThrow();
    const results = checkAssetFileExistence(buildSchemaResult(), rootDir);
    expect(results.some((r) => r.assetId.includes('broken'))).toBe(false);
    expect(results).toHaveLength(4);
  });
});
