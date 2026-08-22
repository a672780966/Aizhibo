import { compile } from '@interactive-story/chapter-compiler';
import type { CompileResult, ValidatedEntry } from '@interactive-story/chapter-compiler';
import type { CharacterAsset, ImageAsset, VisualScene } from '@interactive-story/chapter-schema';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resolveCameraPreset } from './cameraResolution.js';

const fixture = fileURLToPath(
  new URL('../../chapter-compiler/test-fixtures/valid-minimal', import.meta.url),
);

/** Minimal CompileResult carrying only the visuals collection (same shape as visualResolution.test.ts). */
function makeCompileResult(
  visualsPassed: ValidatedEntry<VisualScene | CharacterAsset | ImageAsset>[],
): CompileResult {
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
      visuals: { passed: visualsPassed, failed: [] },
      audio: { passed: [], failed: [] },
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

describe('resolveCameraPreset — 真实 valid-minimal 数据（T002 / A07）', () => {
  it('vs-start 未设置 cameraPreset，返回 undefined', () => {
    const compiled = compile(fixture);
    expect(resolveCameraPreset(compiled, 'vs-start')).toBeUndefined();
  });

  it('不存在的 visualSceneId 返回 undefined（不抛异常）', () => {
    const compiled = compile(fixture);
    expect(resolveCameraPreset(compiled, 'vs-never-exists')).toBeUndefined();
  });
});

describe('resolveCameraPreset — 手写编译产物', () => {
  it('带 cameraPreset 的 VisualScene 返回 preset 键', () => {
    const scene: VisualScene = { id: 'vs-close', layers: [], cameraPreset: 'closeup' };
    const compiled = makeCompileResult([{ file: 'visuals/vs-close.json', value: scene }]);
    expect(resolveCameraPreset(compiled, 'vs-close')).toBe('closeup');
  });

  it('CharacterAsset（无 layers）不会被误判为 VisualScene', () => {
    const compiled = makeCompileResult([
      {
        file: 'visuals/char-x.json',
        value: { id: 'char-x', expressions: {}, defaultExpression: 'neutral' },
      },
    ]);
    expect(resolveCameraPreset(compiled, 'char-x')).toBeUndefined();
  });
});
