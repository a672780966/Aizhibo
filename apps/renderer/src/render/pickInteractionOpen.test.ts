import type { PresentationCommand } from '@interactive-story/runtime-kernel';
import { describe, expect, it } from 'vitest';
import { pickInteractionOpen } from './pickInteractionOpen.js';

function open(seq: number, choices?: unknown, openDurationMs?: unknown): PresentationCommand {
  return {
    commandSeq: seq,
    command: {
      kind: 'INTERACTION_OPEN',
      ...(choices !== undefined ? { choices } : {}),
      ...(openDurationMs !== undefined ? { openDurationMs } : {}),
    },
  };
}

describe('pickInteractionOpen（T005 / A11）', () => {
  it('无命令时返回 undefined', () => {
    expect(pickInteractionOpen([])).toBeUndefined();
    // 命令非法（非对象）或种类不符时同样为 undefined
    expect(pickInteractionOpen([{ commandSeq: 9, command: 'not-object' }])).toBeUndefined();
    expect(pickInteractionOpen([{ commandSeq: 9, command: { kind: 'OTHER' } }])).toBeUndefined();
  });

  it('有命令时取最近一条 INTERACTION_OPEN', () => {
    expect(
      pickInteractionOpen([
        open(1, [{ id: 'A', label: '跟随向导' }], 15000),
        open(2, [{ id: 'B', label: '战斗' }], 10000),
      ]),
    ).toEqual({ choices: [{ id: 'B', label: '战斗' }], openDurationMs: 10000, key: 2 });
  });

  it('choices 非法（非数组）时视为空数组，key 仍取命令序号', () => {
    expect(pickInteractionOpen([open(1, 'x', 15000)])).toEqual({
      choices: [],
      openDurationMs: 15000,
      key: 1,
    });
  });

  it('openDurationMs 缺省或非法时省略该字段', () => {
    expect(pickInteractionOpen([open(1, [{ id: 'A', label: 'a' }], 'x')])).toEqual({
      choices: [{ id: 'A', label: 'a' }],
      key: 1,
    });
    expect(pickInteractionOpen([open(1, [{ id: 'A', label: 'a' }])])).toEqual({
      choices: [{ id: 'A', label: 'a' }],
      key: 1,
    });
    // 两者都缺省
    expect(pickInteractionOpen([open(1)])).toEqual({ choices: [], key: 1 });
  });
});
