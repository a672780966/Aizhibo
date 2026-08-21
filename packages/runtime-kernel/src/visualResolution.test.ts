import { compile } from '@interactive-story/chapter-compiler';
import type { CompileResult, ValidatedEntry } from '@interactive-story/chapter-compiler';
import type { CharacterAsset, ImageAsset, VisualScene } from '@interactive-story/chapter-schema';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createRuntimeMachine } from './machine.js';
import { resolveVisualLayers } from './visualResolution.js';

const fixture = fileURLToPath(
  new URL('../../chapter-compiler/test-fixtures/valid-minimal', import.meta.url),
);

/** Minimal CompileResult carrying only the visuals collection (T002 unit fixtures). */
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

describe('resolveVisualLayers — 真实 valid-minimal 数据（T002 / A07）', () => {
  it('vs-start 解析出 img-forest（visualSceneId → layer.assetId → ImageAsset.file 两跳链）', () => {
    const compiled = compile(fixture);
    expect(resolveVisualLayers(compiled, 'vs-start')).toEqual([
      { assetId: 'img-forest', file: 'assets/img/forest.png', z: 0 },
    ]);
  });

  it('不存在的 visualSceneId 返回 []', () => {
    const compiled = compile(fixture);
    expect(resolveVisualLayers(compiled, 'vs-never-exists')).toEqual([]);
  });
});

describe('resolveVisualLayers — 防御性处理（手写编译产物）', () => {
  const scene: VisualScene = {
    id: 'vs-multi',
    layers: [
      { assetId: 'img-a', z: -3 },
      { assetId: 'img-missing', z: 10 },
      { assetId: 'img-b', z: 4, parallax: 0.5 },
    ],
  };

  it('某个 layer 引用不存在的 ImageAsset 时跳过该层，不抛异常，其余层照常解析', () => {
    const compiled = makeCompileResult([
      { file: 'visuals/vs-multi.json', value: scene },
      { file: 'visuals/img-a.json', value: { id: 'img-a', file: 'assets/a.png' } },
      { file: 'visuals/img-b.json', value: { id: 'img-b', file: 'assets/b.png' } },
    ]);
    expect(resolveVisualLayers(compiled, 'vs-multi')).toEqual([
      { assetId: 'img-a', file: 'assets/a.png', z: -3 },
      { assetId: 'img-b', file: 'assets/b.png', z: 4, parallax: 0.5 },
    ]);
  });

  it('parallax 原样透传；未提供时结果对象里不出现该键（exactOptionalPropertyTypes）', () => {
    const compiled = makeCompileResult([
      { file: 'visuals/vs-multi.json', value: scene },
      { file: 'visuals/img-a.json', value: { id: 'img-a', file: 'assets/a.png' } },
      { file: 'visuals/img-b.json', value: { id: 'img-b', file: 'assets/b.png' } },
    ]);
    const [withParallax, withoutParallax] = [
      resolveVisualLayers(compiled, 'vs-multi')[1],
      resolveVisualLayers(compiled, 'vs-multi')[0],
    ];
    expect(withParallax?.parallax).toBe(0.5);
    expect('parallax' in (withoutParallax ?? {})).toBe(false);
  });

  it('CharacterAsset（含 expressions、无 layers/file）不会被误判为 VisualScene/ImageAsset', () => {
    const compiled = makeCompileResult([
      {
        file: 'visuals/char-guide.json',
        value: { id: 'char-x', expressions: {}, defaultExpression: 'neutral' },
      },
    ]);
    expect(resolveVisualLayers(compiled, 'char-x')).toEqual([]);
    // 且 char-x 不应作为任何层的 ImageAsset 命中
    const sceneOnly: VisualScene = { id: 'vs-x', layers: [{ assetId: 'char-x', z: 0 }] };
    const compiled2 = makeCompileResult([
      { file: 'visuals/vs-x.json', value: sceneOnly },
      {
        file: 'visuals/char-guide.json',
        value: { id: 'char-x', expressions: {}, defaultExpression: 'neutral' },
      },
    ]);
    expect(resolveVisualLayers(compiled2, 'vs-x')).toEqual([]);
  });
});

describe('onSceneEnter CR 端到端（T003 / A09）', () => {
  it('valid-minimal 驱动到 SCENE_ENTER：命令含 visualSceneId/layers 且与 resolveVisualLayers 一致', () => {
    const presentation: unknown[] = [];
    const actor = createRuntimeMachine({
      chapterRootDir: fixture,
      seed: 'dev021-e2e',
      ports: { presentation: { send: (c) => presentation.push(c) } },
    });
    actor.send({ type: 'BOOT' });

    const sceneEnter = presentation.find((c) => (c as { kind?: unknown }).kind === 'SCENE_ENTER');
    expect(sceneEnter).toBeDefined();
    const command = sceneEnter as {
      kind: string;
      sceneId: string;
      visualSceneId?: string;
      layers: unknown;
    };
    expect(command.sceneId).toBe('scene-start');
    expect(command.visualSceneId).toBe('vs-start');
    const compiled = compile(fixture);
    expect(command.layers).toEqual(resolveVisualLayers(compiled, 'vs-start'));
    expect(command.layers).toEqual([
      { assetId: 'img-forest', file: 'assets/img/forest.png', z: 0 },
    ]);

    // audio 端口仍只发占位载荷（本 CR 不改 audio 行）
    const audio: unknown[] = [];
    const actor2 = createRuntimeMachine({
      chapterRootDir: fixture,
      seed: 'dev021-e2e-audio',
      ports: { audio: { send: (c) => audio.push(c) } },
    });
    actor2.send({ type: 'BOOT' });
    const audioEnter = audio.find((c) => (c as { kind?: unknown }).kind === 'SCENE_ENTER') as
      { sceneId: string } | undefined;
    expect(audioEnter?.sceneId).toBe('scene-start');
  });
});
