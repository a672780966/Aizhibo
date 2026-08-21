import type { ResolvedVisualLayer } from '@interactive-story/runtime-kernel';
import { describe, expect, it } from 'vitest';
// App 侧纯逻辑 pickSceneLayers（T006）一并在此验证——DEV-021 Writable Scope 不含
// App.test.ts，本文件是唯一被授权的测试文件（Task Package 第 3 节）。
import { pickSceneLayers } from '../App.js';
import { composeLayers } from './composeLayers.js';

describe('composeLayers（T005 / A11）', () => {
  it('按 z 升序排序（底层先渲染），zIndex 映射自 z', () => {
    const input: ResolvedVisualLayer[] = [
      { assetId: 'sky', file: 'assets/sky.png', z: 10 },
      { assetId: 'ground', file: 'assets/ground.png', z: 0 },
      { assetId: 'tree', file: 'assets/tree.png', z: 5 },
    ];
    expect(composeLayers(input).map((l) => l.assetId)).toEqual(['ground', 'tree', 'sky']);
    expect(composeLayers(input)[0]).toEqual({
      assetId: 'ground',
      file: 'assets/ground.png',
      zIndex: 0,
    });
  });

  it('z 相同保持输入顺序（Array.prototype.sort 稳定），负数 z 正常参与排序', () => {
    const input: ResolvedVisualLayer[] = [
      { assetId: 'b', file: 'b.png', z: 1 },
      { assetId: 'back', file: 'back.png', z: -5 },
      { assetId: 'a', file: 'a.png', z: 1 },
      { assetId: 'front', file: 'front.png', z: 3 },
    ];
    expect(composeLayers(input).map((l) => l.assetId)).toEqual(['back', 'b', 'a', 'front']);
  });

  it('parallax 原样透传；未提供时结果对象里不出现该键（exactOptionalPropertyTypes）', () => {
    const input: ResolvedVisualLayer[] = [
      { assetId: 'far', file: 'far.png', z: 0, parallax: 0.25 },
      { assetId: 'near', file: 'near.png', z: 1 },
    ];
    const [far, near] = composeLayers(input);
    expect(far).toEqual({ assetId: 'far', file: 'far.png', zIndex: 0, parallax: 0.25 });
    expect(near).toEqual({ assetId: 'near', file: 'near.png', zIndex: 1 });
    expect('parallax' in (near ?? {})).toBe(false);
  });

  it('不修改输入数组', () => {
    const input: ResolvedVisualLayer[] = [
      { assetId: 'a', file: 'a.png', z: 2 },
      { assetId: 'b', file: 'b.png', z: 0 },
    ];
    const snapshot = [...input];
    composeLayers(input);
    expect(input).toEqual(snapshot);
  });

  it('空数组返回空数组', () => {
    expect(composeLayers([])).toEqual([]);
  });
});

describe('pickSceneLayers — App 侧场景层选择的纯逻辑（T006）', () => {
  it('从 SCENE_ENTER 命令取出 layers 并合成渲染层', () => {
    expect(
      pickSceneLayers([
        {
          commandSeq: 5,
          command: {
            kind: 'SCENE_ENTER',
            sceneId: 'scene-start',
            visualSceneId: 'vs-start',
            layers: [{ assetId: 'img-forest', file: 'assets/img/forest.png', z: 0 }],
          },
        },
      ]),
    ).toEqual([{ assetId: 'img-forest', file: 'assets/img/forest.png', zIndex: 0 }]);
  });

  it('忽略非 SCENE_ENTER 命令，无 SCENE_ENTER 时返回空数组', () => {
    expect(pickSceneLayers([{ commandSeq: 1, command: { kind: 'PRES_READY' } }])).toEqual([]);
    expect(pickSceneLayers([])).toEqual([]);
  });

  it('多层按 z 升序合成（zIndex 定位）', () => {
    expect(
      pickSceneLayers([
        {
          commandSeq: 6,
          command: {
            kind: 'SCENE_ENTER',
            sceneId: 'scene-boss',
            visualSceneId: 'vs-boss',
            layers: [
              { assetId: 'sky', file: 'assets/sky.png', z: 10 },
              { assetId: 'ground', file: 'assets/ground.png', z: 0 },
            ],
          },
        },
      ]).map((l) => l.assetId),
    ).toEqual(['ground', 'sky']);
  });

  it('命令累积时取最近一条 SCENE_ENTER（场景切换替换图层栈）', () => {
    const commands = [
      {
        commandSeq: 4,
        command: {
          kind: 'SCENE_ENTER',
          sceneId: 'scene-a',
          layers: [{ assetId: 'a', file: 'a.png', z: 0 }],
        },
      },
      { commandSeq: 7, command: { kind: 'RESULT_PLAYING', text: 'ok' } },
      {
        commandSeq: 8,
        command: {
          kind: 'SCENE_ENTER',
          sceneId: 'scene-start',
          visualSceneId: 'vs-start',
          layers: [{ assetId: 'img-forest', file: 'assets/img/forest.png', z: 0 }],
        },
      },
    ];
    expect(pickSceneLayers(commands)).toEqual([
      { assetId: 'img-forest', file: 'assets/img/forest.png', zIndex: 0 },
    ]);
  });

  it('layers 字段不是数组时视为无效并返回空数组（防御）', () => {
    expect(
      pickSceneLayers([
        {
          commandSeq: 9,
          command: {
            kind: 'SCENE_ENTER',
            sceneId: 'scene-x',
            visualSceneId: 'vs-x',
            layers: 'oops',
          },
        },
      ]),
    ).toEqual([]);
  });
});
