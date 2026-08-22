import { describe, expect, it } from 'vitest';
import type { PresentationCommand } from '@interactive-story/runtime-kernel';
import { pickCameraPreset, pickSceneEnterKey } from './pickSceneMeta.js';

function sceneEnter(seq: number, cameraPreset?: string): PresentationCommand {
  return {
    commandSeq: seq,
    command: {
      kind: 'SCENE_ENTER',
      sceneId: 'scene-x',
      visualSceneId: 'vs-x',
      layers: [],
      characters: [],
      narration: [],
      ...(cameraPreset !== undefined ? { cameraPreset } : {}),
    },
  };
}

describe('pickSceneMeta (T005)', () => {
  it('无命令 → preset undefined、key 0', () => {
    expect(pickCameraPreset([])).toBeUndefined();
    expect(pickSceneEnterKey([])).toBe(0);
    // 无关命令不影响
    expect(
      pickCameraPreset([{ commandSeq: 1, command: { kind: 'RESULT_PLAYING', text: 'x' } }]),
    ).toBeUndefined();
    expect(
      pickSceneEnterKey([{ commandSeq: 1, command: { kind: 'RESULT_PLAYING', text: 'x' } }]),
    ).toBe(0);
  });

  it('有 SCENE_ENTER → preset 与 key 取最近一条', () => {
    expect(pickCameraPreset([sceneEnter(3, 'closeup')])).toBe('closeup');
    expect(pickSceneEnterKey([sceneEnter(3, 'closeup')])).toBe(3);
    // 多场景取最近一条
    const commands = [sceneEnter(3, 'closeup'), sceneEnter(9, 'wide')];
    expect(pickCameraPreset(commands)).toBe('wide');
    expect(pickSceneEnterKey(commands)).toBe(9);
  });

  it('最新 SCENE_ENTER 未设置 preset 时复位为 undefined（不残留旧场景 preset）', () => {
    const commands = [sceneEnter(3, 'closeup'), sceneEnter(9)];
    expect(pickCameraPreset(commands)).toBeUndefined();
    expect(pickSceneEnterKey(commands)).toBe(9);
  });

  it('cameraPreset 非字符串视为未设置', () => {
    const commands: PresentationCommand[] = [
      {
        commandSeq: 5,
        command: { kind: 'SCENE_ENTER', cameraPreset: 42 },
      },
    ];
    expect(pickCameraPreset(commands)).toBeUndefined();
    expect(pickSceneEnterKey(commands)).toBe(5);
  });
});
