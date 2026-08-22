import { describe, expect, it } from 'vitest';
import type { PresentationCommand } from '@interactive-story/runtime-kernel';
import { pickSceneAudio } from './pickSceneAudio.js';

const BGM = { id: 'bgm-main', file: 'assets/audio/bgm-main.mp3' };
const AMB = { id: 'amb-forest', file: 'assets/audio/amb-forest.mp3', loop: false, gain: 0.6 };

function sceneEnter(seq: number, audio?: unknown): PresentationCommand {
  return {
    commandSeq: seq,
    command: {
      kind: 'SCENE_ENTER',
      sceneId: 'scene-x',
      visualSceneId: 'vs-x',
      ...(audio !== undefined ? { audio } : {}),
    },
  };
}

describe('pickSceneAudio (T005)', () => {
  it('无命令 → {ambience: []}', () => {
    expect(pickSceneAudio([])).toEqual({ ambience: [] });
    // 无关命令不影响
    expect(
      pickSceneAudio([{ commandSeq: 1, command: { kind: 'RESULT_PLAYING', text: 'x' } }]),
    ).toEqual({ ambience: [] });
  });

  it('有命令且含 bgm + ambience → 正确返回', () => {
    const commands = [sceneEnter(3, { bgm: BGM, ambience: [AMB] })];
    expect(pickSceneAudio(commands)).toEqual({ bgm: BGM, ambience: [AMB] });
  });

  it('多 SCENE_ENTER 取最近一条', () => {
    const commands = [
      sceneEnter(3, { bgm: BGM, ambience: [] }),
      sceneEnter(9, { ambience: [AMB] }),
    ];
    expect(pickSceneAudio(commands)).toEqual({ ambience: [AMB] });
  });

  it('最新 SCENE_ENTER 无 audio 字段时复位为 {ambience: []}（不残留旧场景音频）', () => {
    const commands = [sceneEnter(3, { bgm: BGM, ambience: [AMB] }), sceneEnter(9)];
    expect(pickSceneAudio(commands)).toEqual({ ambience: [] });
  });

  it('audio 非对象 / ambience 非数组 / bgm 缺 file → 防御降级', () => {
    expect(pickSceneAudio([sceneEnter(5, 'junk')])).toEqual({ ambience: [] });
    expect(pickSceneAudio([sceneEnter(5, { bgm: BGM, ambience: 'not-array' })])).toEqual({
      bgm: BGM,
      ambience: [],
    });
    expect(pickSceneAudio([sceneEnter(5, { bgm: { id: 'bgm-x' }, ambience: [] })])).toEqual({
      ambience: [],
    });
    // ambience 数组内无效项被剔除
    expect(pickSceneAudio([sceneEnter(5, { ambience: [AMB, 'junk', { file: 'x.mp3' }] })])).toEqual(
      { ambience: [AMB] },
    );
  });
});
