import type { ResolvedCharacterPlacement } from '@interactive-story/runtime-kernel';
import { describe, expect, it } from 'vitest';
// App 侧纯逻辑 pickSceneCharacters（T006）一并在此验证——DEV-022 Writable Scope 不含
// App.test.ts，本文件是唯一被授权的测试文件（Task Package 第 3 节）。
import { pickSceneCharacters } from '../App.js';
import { composeCharacters } from './composeCharacters.js';

describe('composeCharacters（T005 / A11）', () => {
  it('过滤 visible === false 的角色，保留可见角色', () => {
    const input: ResolvedCharacterPlacement[] = [
      {
        characterId: 'npc-a',
        slot: 'LEFT',
        visible: false,
        file: 'assets/a.png',
      },
      { characterId: 'npc-b', slot: 'RIGHT', visible: true, file: 'assets/b.png' },
    ];
    expect(composeCharacters(input)).toEqual([
      { characterId: 'npc-b', file: 'assets/b.png', leftPercent: 90, animated: false },
    ]);
  });

  it('五档 slot → leftPercent 映射正确', () => {
    const slots: ResolvedCharacterPlacement['slot'][] = [
      'LEFT',
      'CENTER_LEFT',
      'CENTER',
      'CENTER_RIGHT',
      'RIGHT',
    ];
    const expected = [10, 30, 50, 70, 90];
    const input: ResolvedCharacterPlacement[] = slots.map((slot, i) => ({
      characterId: `npc-${i}`,
      slot,
      visible: true,
      file: `assets/${i}.png`,
    }));
    expect(composeCharacters(input).map((c) => c.leftPercent)).toEqual(expected);
  });

  it('microAnimations 非空 → animated true；空/未定义 → false', () => {
    const withAnim: ResolvedCharacterPlacement = {
      characterId: 'npc-x',
      slot: 'CENTER',
      visible: true,
      file: 'assets/x.png',
      microAnimations: ['breathe'],
    };
    const emptyAnim: ResolvedCharacterPlacement = {
      characterId: 'npc-y',
      slot: 'CENTER',
      visible: true,
      file: 'assets/y.png',
      microAnimations: [],
    };
    const noAnim: ResolvedCharacterPlacement = {
      characterId: 'npc-z',
      slot: 'CENTER',
      visible: true,
      file: 'assets/z.png',
    };
    expect(composeCharacters([withAnim])[0]?.animated).toBe(true);
    expect(composeCharacters([emptyAnim])[0]?.animated).toBe(false);
    expect(composeCharacters([noAnim])[0]?.animated).toBe(false);
  });

  it('空数组返回空数组，不修改输入', () => {
    expect(composeCharacters([])).toEqual([]);
    const input: ResolvedCharacterPlacement[] = [
      { characterId: 'npc-a', slot: 'CENTER', visible: true, file: 'a.png' },
    ];
    const snapshot = [...input];
    composeCharacters(input);
    expect(input).toEqual(snapshot);
  });
});

describe('pickSceneCharacters — App 侧角色选择的纯逻辑（T006）', () => {
  it('从 SCENE_ENTER 命令取出 characters 并合成渲染层', () => {
    expect(
      pickSceneCharacters([
        {
          commandSeq: 5,
          command: {
            kind: 'SCENE_ENTER',
            sceneId: 'scene-start',
            visualSceneId: 'vs-start',
            layers: [],
            characters: [
              {
                characterId: 'npc-guide',
                slot: 'CENTER',
                visible: true,
                file: 'assets/img/guide-smile.png',
                microAnimations: [],
              },
            ],
          },
        },
      ]),
    ).toEqual([
      {
        characterId: 'npc-guide',
        file: 'assets/img/guide-smile.png',
        leftPercent: 50,
        animated: false,
      },
    ]);
  });

  it('忽略非 SCENE_ENTER 命令，无 SCENE_ENTER 时返回空数组', () => {
    expect(pickSceneCharacters([{ commandSeq: 1, command: { kind: 'PRES_READY' } }])).toEqual([]);
    expect(pickSceneCharacters([])).toEqual([]);
  });

  it('命令累积时取最近一条 SCENE_ENTER（场景切换替换角色栈）', () => {
    const commands = [
      {
        commandSeq: 4,
        command: {
          kind: 'SCENE_ENTER',
          sceneId: 'scene-a',
          layers: [],
          characters: [
            {
              characterId: 'npc-a',
              slot: 'LEFT',
              visible: true,
              file: 'a.png',
              microAnimations: ['breathe'],
            },
          ],
        },
      },
      { commandSeq: 7, command: { kind: 'RESULT_PLAYING', text: 'ok' } },
      {
        commandSeq: 8,
        command: {
          kind: 'SCENE_ENTER',
          sceneId: 'scene-start',
          layers: [],
          characters: [
            {
              characterId: 'npc-guide',
              slot: 'CENTER',
              visible: true,
              file: 'assets/img/guide-smile.png',
            },
          ],
        },
      },
    ];
    expect(pickSceneCharacters(commands)).toEqual([
      {
        characterId: 'npc-guide',
        file: 'assets/img/guide-smile.png',
        leftPercent: 50,
        animated: false,
      },
    ]);
  });

  it('characters 字段不是数组时视为无效并返回空数组（防御）', () => {
    expect(
      pickSceneCharacters([
        {
          commandSeq: 9,
          command: {
            kind: 'SCENE_ENTER',
            sceneId: 'scene-x',
            layers: [],
            characters: 'oops',
          },
        },
      ]),
    ).toEqual([]);
  });
});
