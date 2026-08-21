import type { PresentationCommand } from '@interactive-story/runtime-kernel';
import { describe, expect, it } from 'vitest';
import { pickDialogueLines } from './pickDialogueLines.js';

function scene(seq: number, narration?: string[]): PresentationCommand {
  return { commandSeq: seq, command: { kind: 'SCENE_ENTER', narration } };
}
function result(seq: number, text: string): PresentationCommand {
  return { commandSeq: seq, command: { kind: 'RESULT_PLAYING', text } };
}

describe('pickDialogueLines（T003 / A10）', () => {
  it('只有 SCENE_ENTER 时返回其 narration', () => {
    expect(pickDialogueLines([scene(1, ['你站在森林入口。'])])).toEqual({
      lines: ['你站在森林入口。'],
      key: 1,
    });
  });

  it('只有 RESULT_PLAYING 时返回 [text]', () => {
    expect(pickDialogueLines([result(3, '结算叙事')])).toEqual({ lines: ['结算叙事'], key: 3 });
  });

  it('两者都存在时取 commandSeq 更大的一方', () => {
    // 结算在场景之后 → 显示结算文本
    expect(pickDialogueLines([scene(1, ['旁白']), result(2, '结算')])).toEqual({
      lines: ['结算'],
      key: 2,
    });
    // 新场景在结算之后 → 显示新场景旁白
    expect(pickDialogueLines([result(1, '结算'), scene(2, ['旁白'])])).toEqual({
      lines: ['旁白'],
      key: 2,
    });
  });

  it('SCENE_ENTER 未携带 narration 字段时返回空数组', () => {
    expect(pickDialogueLines([scene(1)])).toEqual({ lines: [], key: 1 });
    // narration 字段存在但非法（非数组）也视为空
    expect(
      pickDialogueLines([{ commandSeq: 1, command: { kind: 'SCENE_ENTER', narration: 'x' } }]),
    ).toEqual({
      lines: [],
      key: 1,
    });
  });

  it('都不存在（或命令非法）时返回 {lines: [], key: 0}', () => {
    expect(pickDialogueLines([])).toEqual({ lines: [], key: 0 });
    expect(pickDialogueLines([{ commandSeq: 9, command: 'not-object' }])).toEqual({
      lines: [],
      key: 0,
    });
    expect(pickDialogueLines([{ commandSeq: 9, command: { kind: 'OTHER', text: 'x' } }])).toEqual({
      lines: [],
      key: 0,
    });
  });
});
