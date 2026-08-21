import type {
  Choice,
  Condition,
  InteractionNode,
  WorldState,
} from '@interactive-story/chapter-schema';
import { describe, expect, it } from 'vitest';
import { resolveVisibleChoices } from './choiceResolution.js';

function choice(id: Choice['id'], label: string, visibleIf?: Condition[]): Choice {
  return {
    id,
    label,
    actionType: `INTERNAL_${id}`,
    ruleId: `rule-${id}`,
    ...(visibleIf !== undefined ? { visibleIf } : {}),
  };
}

function interactionWith(choices: Choice[]): InteractionNode {
  return {
    id: 'interaction-01',
    openDurationMs: 15000,
    choices,
    diceMode: 'PER_ACTION_GROUP',
    resultPolicy: 'result-policy-follow',
    nextScene: 'ending-end',
    noParticipationPolicy: { kind: 'DEFAULT_CHOICE', choiceId: 'A' },
  };
}

function world(flags: Record<string, string | number | boolean> = {}, dangerLevel = 0): WorldState {
  return {
    chapterId: 'c1',
    sceneId: 's1',
    flags,
    npc: {},
    danger: { level: dangerLevel, tensionKey: 'calm' },
    discovered: [],
    activeThreats: [],
    chapterVariables: {},
  };
}

const flagEq = (key: string, value: boolean | number | string): Condition => ({
  op: 'EQ',
  path: { container: 'flags', key },
  value,
});

describe('resolveVisibleChoices（T002 / A07）', () => {
  it('无 visibleIf 的选项始终可见，保持选项顺序', () => {
    expect(
      resolveVisibleChoices(
        interactionWith([choice('A', '跟随向导'), choice('B', '战斗')]),
        world(),
      ),
    ).toEqual([
      { id: 'A', label: '跟随向导' },
      { id: 'B', label: '战斗' },
    ]);
  });

  it('混合：无条件的始终可见，有条件的按满足与否过滤', () => {
    const i = interactionWith([
      choice('A', '跟随向导', [flagEq('metGuide', true)]),
      choice('B', '战斗'),
    ]);
    expect(resolveVisibleChoices(i, world({ metGuide: true }))).toEqual([
      { id: 'A', label: '跟随向导' },
      { id: 'B', label: '战斗' },
    ]);
    expect(resolveVisibleChoices(i, world({ metGuide: false }))).toEqual([
      { id: 'B', label: '战斗' },
    ]);
  });

  it('单条件：满足可见，不满足隐藏', () => {
    const i = interactionWith([choice('A', '跟随向导', [flagEq('metGuide', true)])]);
    expect(resolveVisibleChoices(i, world({ metGuide: true }))).toEqual([
      { id: 'A', label: '跟随向导' },
    ]);
    expect(resolveVisibleChoices(i, world({ metGuide: false }))).toEqual([]);
    // 键不存在（EXISTS 语义的 false 面）同样隐藏
    expect(resolveVisibleChoices(i, world())).toEqual([]);
  });

  it('多条件 AND：全部满足才可见，任一不满足即隐藏', () => {
    const i = interactionWith([
      choice('A', '跟随向导', [
        flagEq('metGuide', true),
        {
          op: 'GTE',
          path: { container: 'danger', key: 'x', field: 'level' },
          value: 2,
        },
      ]),
    ]);
    expect(resolveVisibleChoices(i, world({ metGuide: true }, 2))).toEqual([
      { id: 'A', label: '跟随向导' },
    ]);
    // flags 满足但 danger.level 不满足 → AND 失败
    expect(resolveVisibleChoices(i, world({ metGuide: true }, 1))).toEqual([]);
    // danger.level 满足但 flags 不满足 → AND 失败
    expect(resolveVisibleChoices(i, world({ metGuide: false }, 2))).toEqual([]);
  });

  it('返回值只含 id/label，不泄漏 actionType/ruleId/visibleIf', () => {
    const result = resolveVisibleChoices(
      interactionWith([choice('A', '跟随向导', [flagEq('metGuide', true)])]),
      world({ metGuide: true }),
    );
    expect(result).toEqual([{ id: 'A', label: '跟随向导' }]);
    expect(Object.keys(result[0]!)).toEqual(['id', 'label']);
  });

  it('空 choices 返回空数组', () => {
    expect(resolveVisibleChoices(interactionWith([]), world())).toEqual([]);
  });
});
