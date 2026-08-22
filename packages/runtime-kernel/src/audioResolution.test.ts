import { compile } from '@interactive-story/chapter-compiler';
import type { CompileResult, ValidatedEntry } from '@interactive-story/chapter-compiler';
import type { AudioAsset, SceneNode } from '@interactive-story/chapter-schema';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resolveSceneAudio } from './audioResolution.js';
import { currentScene } from './storyRegion.js';

const fixture = fileURLToPath(
  new URL('../../chapter-compiler/test-fixtures/valid-minimal', import.meta.url),
);

/** Minimal CompileResult carrying only the audio collection (same shape as sibling tests). */
function makeCompileResult(audioPassed: ValidatedEntry<AudioAsset>[]): CompileResult {
  return {
    loadIssues: [],
    schemaResult: {
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
      visuals: { passed: [], failed: [] },
      audio: { passed: audioPassed, failed: [] },
      metadata: { passed: [], failed: [] },
    },
    uniquenessIssues: [],
    referenceIssues: [],
    graphIssues: [],
    stateIssues: [],
    hiddenInfoIssues: [],
    ruleCoverageIssues: [],
    passed: true,
  };
}

describe('resolveSceneAudio — 真实 valid-minimal 数据（T002 / A07）', () => {
  it('scene-start 解析出 bgm-main 与 amb-forest', () => {
    const compiled = compile(fixture);
    const scene = currentScene(compiled, 'scene-start');
    expect(scene).toBeDefined();
    expect(resolveSceneAudio(compiled, scene!)).toEqual({
      bgm: { id: 'bgm-main', file: 'assets/audio/bgm-main.mp3' },
      ambience: [{ id: 'amb-forest', file: 'assets/audio/amb-forest.mp3' }],
    });
  });
});

describe('resolveSceneAudio — 手写编译产物（防御性）', () => {
  const bgmMain: AudioAsset = {
    id: 'bgm-main',
    kind: 'BGM',
    source: 'PREPRODUCED',
    file: 'assets/audio/bgm-main.mp3',
  };
  const ttsVoice: AudioAsset = {
    id: 'voice-guide',
    kind: 'SPEECH',
    source: 'RUNTIME_TTS',
    ttsSpec: { voiceId: 'voice-zh-female', voiceSettings: {} },
  };
  const withGain: AudioAsset = {
    id: 'amb-forest',
    kind: 'AMBIENCE',
    source: 'PREGENERATED',
    file: 'assets/audio/amb-forest.mp3',
    loop: false,
    gain: 0.6,
  };

  it('RUNTIME_TTS 资产被防御性跳过（ambience 从数组剔除）', () => {
    const compiled = makeCompileResult([
      { file: 'audio/voice-guide.json', value: ttsVoice },
      { file: 'audio/bgm-main.json', value: bgmMain },
    ]);
    const scene: SceneNode = {
      id: 'scene-x',
      visualSceneId: 'vs-x',
      characters: [],
      hostPolicy: 'ALLOWED',
      ambience: ['voice-guide', 'bgm-main'],
    };
    // bgm-main 是 BGM，被塞进 ambience 数组也能被找到（此处仅验证 TTS 跳过、保留可解析项）
    expect(resolveSceneAudio(compiled, scene)).toEqual({
      ambience: [{ id: 'bgm-main', file: 'assets/audio/bgm-main.mp3' }],
    });
  });

  it('scene.bgm 未定义时结果不含 bgm 字段', () => {
    const compiled = makeCompileResult([{ file: 'audio/bgm-main.json', value: bgmMain }]);
    const scene: SceneNode = {
      id: 'scene-x',
      visualSceneId: 'vs-x',
      characters: [],
      hostPolicy: 'ALLOWED',
      ambience: ['bgm-main'],
    };
    const result = resolveSceneAudio(compiled, scene);
    expect('bgm' in result).toBe(false);
    expect(result.ambience).toEqual([{ id: 'bgm-main', file: 'assets/audio/bgm-main.mp3' }]);
  });

  it('找不到的 id 被跳过（bgm 省略、ambience 剔除），不抛异常', () => {
    const compiled = makeCompileResult([{ file: 'audio/bgm-main.json', value: bgmMain }]);
    const scene: SceneNode = {
      id: 'scene-x',
      visualSceneId: 'vs-x',
      characters: [],
      hostPolicy: 'ALLOWED',
      bgm: 'no-such-bgm',
      ambience: ['no-such-amb', 'bgm-main'],
    };
    expect(resolveSceneAudio(compiled, scene)).toEqual({
      ambience: [{ id: 'bgm-main', file: 'assets/audio/bgm-main.mp3' }],
    });
  });

  it('loop/gain 原样透传；未提供时不出现该键（exactOptionalPropertyTypes）', () => {
    const compiled = makeCompileResult([{ file: 'audio/amb-forest.json', value: withGain }]);
    const scene: SceneNode = {
      id: 'scene-x',
      visualSceneId: 'vs-x',
      characters: [],
      hostPolicy: 'ALLOWED',
      ambience: ['amb-forest'],
    };
    const result = resolveSceneAudio(compiled, scene);
    expect(result.ambience[0]).toEqual({
      id: 'amb-forest',
      file: 'assets/audio/amb-forest.mp3',
      loop: false,
      gain: 0.6,
    });
  });
});
