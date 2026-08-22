import { describe, expect, it } from 'vitest';
import type { PresentationCommand } from '@interactive-story/runtime-kernel';
import { pickResultAudio } from './pickResultAudio.js';

function resultPlaying(seq: number, audio?: unknown): PresentationCommand {
  return {
    commandSeq: seq,
    command: {
      kind: 'RESULT_PLAYING',
      text: 'narration',
      ...(audio !== undefined ? { audio } : {}),
    },
  };
}

describe('pickResultAudio (DEV-031)', () => {
  it('无 RESULT_PLAYING 命令 → undefined（含无关命令）', () => {
    expect(pickResultAudio([])).toBeUndefined();
    expect(
      pickResultAudio([{ commandSeq: 1, command: { kind: 'SCENE_ENTER', sceneId: 's' } }]),
    ).toBeUndefined();
  });

  it('有 RESULT_PLAYING 但无 audio 字段 → undefined', () => {
    expect(pickResultAudio([resultPlaying(3)])).toBeUndefined();
  });

  it('audio 非法形状 → undefined，不抛异常', () => {
    expect(pickResultAudio([resultPlaying(3, 'junk')])).toBeUndefined();
    expect(pickResultAudio([resultPlaying(3, null)])).toBeUndefined();
    expect(pickResultAudio([resultPlaying(3, { source: 'NOT_A_SOURCE' })])).toBeUndefined();
    expect(pickResultAudio([resultPlaying(3, { source: 42 })])).toBeUndefined();
    // PREGENERATED/CACHE 缺 file 字符串 → undefined
    expect(pickResultAudio([resultPlaying(3, { source: 'PREGENERATED' })])).toBeUndefined();
    expect(pickResultAudio([resultPlaying(3, { source: 'CACHE', file: 7 })])).toBeUndefined();
  });

  it('合法 PREGENERATED/CACHE 带 file → 正确透传', () => {
    expect(pickResultAudio([resultPlaying(3, { source: 'PREGENERATED', file: 'a.mp3' })])).toEqual({
      source: 'PREGENERATED',
      file: 'a.mp3',
    });
    expect(pickResultAudio([resultPlaying(3, { source: 'CACHE', file: 'b.ogg' })])).toEqual({
      source: 'CACHE',
      file: 'b.ogg',
    });
  });

  it('合法 RUNTIME_TTS/SUBTITLE_ONLY 不带 file → 正确透传', () => {
    expect(pickResultAudio([resultPlaying(3, { source: 'RUNTIME_TTS' })])).toEqual({
      source: 'RUNTIME_TTS',
    });
    expect(pickResultAudio([resultPlaying(3, { source: 'SUBTITLE_ONLY' })])).toEqual({
      source: 'SUBTITLE_ONLY',
    });
  });

  it('多条 RESULT_PLAYING 取最近一条；最新非法时复位为 undefined（不残留旧值）', () => {
    const commands = [
      resultPlaying(3, { source: 'PREGENERATED', file: 'old.mp3' }),
      resultPlaying(9, { source: 'SUBTITLE_ONLY' }),
    ];
    expect(pickResultAudio(commands)).toEqual({ source: 'SUBTITLE_ONLY' });
    commands.push(resultPlaying(12, 'junk'));
    expect(pickResultAudio(commands)).toBeUndefined();
  });
});
