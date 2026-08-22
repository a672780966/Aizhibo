import { describe, expect, it } from 'vitest';
import type { PresentationCommand } from '@interactive-story/runtime-kernel';
import { pickDiceState } from './pickDiceState.js';

function intro(seq: number): PresentationCommand {
  return { commandSeq: seq, command: { kind: 'DICE_INTRO' } };
}

function result(seq: number, results: unknown): PresentationCommand {
  return { commandSeq: seq, command: { kind: 'DICE_RESULT', results } };
}

const RESULT_ROW = {
  diceType: 'd20',
  rawValue: 14,
  modifier: 2,
  finalValue: 16,
  quality: 'SUCCESS',
};

describe('pickDiceState (T003)', () => {
  it('无任何骰子命令 → IDLE，空 results，key 0', () => {
    expect(pickDiceState([])).toEqual({ phase: 'IDLE', results: [], key: 0 });
    // 无关命令（含非法信封）不影响
    expect(
      pickDiceState([
        { commandSeq: 1, command: { kind: 'SCENE_ENTER' } },
        { commandSeq: 2, command: 'not-an-object' },
      ]),
    ).toEqual({ phase: 'IDLE', results: [], key: 0 });
  });

  it('只有 DICE_INTRO → INTRO，空 results，key 为其 seq', () => {
    expect(pickDiceState([intro(7)])).toEqual({ phase: 'INTRO', results: [], key: 7 });
    // 多条 INTRO 取最近一条
    expect(pickDiceState([intro(3), intro(9)])).toEqual({
      phase: 'INTRO',
      results: [],
      key: 9,
    });
  });

  it('只有 DICE_RESULT → RESOLVE，results 映射为展示字段，key 为其 seq', () => {
    const view = pickDiceState([result(8, [RESULT_ROW])]);
    expect(view).toEqual({ phase: 'RESOLVE', results: [RESULT_ROW], key: 8 });
  });

  it('两者都有且 DICE_RESULT 更新 → RESOLVE，key 为结果 seq', () => {
    const view = pickDiceState([intro(5), result(8, [RESULT_ROW])]);
    expect(view).toEqual({ phase: 'RESOLVE', results: [RESULT_ROW], key: 8 });
  });

  it('两者都有且 DICE_INTRO 更新（新一轮）→ INTRO 重新开始，results 清空', () => {
    const view = pickDiceState([intro(5), result(8, [RESULT_ROW]), intro(10)]);
    expect(view).toEqual({ phase: 'INTRO', results: [], key: 10 });
  });

  it('DICE_RESULT 元素含内部记账字段时只保留五个展示字段', () => {
    const view = pickDiceState([
      result(8, [{ ...RESULT_ROW, seed: 's', rollIndex: 1, appliedModifiers: [] }]),
    ]);
    expect(view).toEqual({ phase: 'RESOLVE', results: [RESULT_ROW], key: 8 });
  });

  it('DICE_RESULT.results 非数组或缺展示字段的元素 → 防御降级为空/丢弃', () => {
    expect(pickDiceState([result(8, 'not-an-array')])).toEqual({
      phase: 'RESOLVE',
      results: [],
      key: 8,
    });
    expect(
      pickDiceState([
        result(8, [
          { diceType: 'd20', rawValue: 1, modifier: 0, finalValue: 1 }, // 缺 quality
          { diceType: 'd6', rawValue: 3, modifier: 1, finalValue: 4, quality: 'SUCCESS' },
          'junk',
        ]),
      ]),
    ).toEqual({
      phase: 'RESOLVE',
      results: [{ diceType: 'd6', rawValue: 3, modifier: 1, finalValue: 4, quality: 'SUCCESS' }],
      key: 8,
    });
  });
});
