import { compile } from '@interactive-story/chapter-compiler';
import type { CompileResult, ValidatedEntry } from '@interactive-story/chapter-compiler';
import type {
  CharacterAsset,
  CharacterPlacement,
  ImageAsset,
  NPCDefinition,
  VisualScene,
} from '@interactive-story/chapter-schema';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createRuntimeMachine } from './machine.js';
import { resolveCharacterPlacements } from './characterResolution.js';

const fixture = fileURLToPath(
  new URL('../../chapter-compiler/test-fixtures/valid-minimal', import.meta.url),
);

/** Minimal CompileResult carrying only the npc + visuals collections (T002 unit fixtures). */
function makeCompileResult(
  npcPassed: ValidatedEntry<NPCDefinition>[],
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
      npc: { passed: npcPassed, failed: [] },
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

/** Minimal NPCDefinition ValidatedEntry for hand-built fixtures. */
function npc(id: string, characterAssetId: string): ValidatedEntry<NPCDefinition> {
  return {
    file: `npc/${id}.json`,
    value: {
      id,
      characterAssetId,
      displayName: 'x',
      // initialState 字段不被解析路径使用，此处以最小占位满足类型（DECISIONS D4）
      initialState: {
        present: true,
        alive: true,
        disposition: 'FRIENDLY',
        flags: {},
      } as NPCDefinition['initialState'],
    },
  };
}

const charGuide: CharacterAsset = {
  id: 'char-guide',
  expressions: { smile: 'img-guide-smile', neutral: 'img-guide-neutral' },
  defaultExpression: 'neutral',
};
const imgSmile: ImageAsset = { id: 'img-guide-smile', file: 'assets/img/guide-smile.png' };
const imgNeutral: ImageAsset = { id: 'img-guide-neutral', file: 'assets/img/guide-neutral.png' };

describe('resolveCharacterPlacements — 真实 valid-minimal 数据（T002 / A07）', () => {
  it('scene-start.characters 的 npc-guide + expression:smile 三跳解析到 smile 图片', () => {
    const compiled = compile(fixture);
    const scene = compiled.schemaResult.scenes.passed.find(
      (e) => e.value.id === 'scene-start',
    )!.value;
    expect(resolveCharacterPlacements(compiled, scene.characters)).toEqual([
      {
        characterId: 'npc-guide',
        slot: 'CENTER',
        visible: true,
        file: 'assets/img/guide-smile.png',
        microAnimations: [],
      },
    ]);
  });

  it('省略 expression 时回退 defaultExpression（neutral）', () => {
    const compiled = compile(fixture);
    const placement: CharacterPlacement = {
      characterId: 'npc-guide',
      slot: 'LEFT',
      visible: true,
    };
    expect(resolveCharacterPlacements(compiled, [placement])).toEqual([
      {
        characterId: 'npc-guide',
        slot: 'LEFT',
        visible: true,
        file: 'assets/img/guide-neutral.png',
        microAnimations: [],
      },
    ]);
  });
});

describe('resolveCharacterPlacements — 四类缺失引用防御性跳过（T002 / A07）', () => {
  it('characterId 在 npc.passed 找不到 NPCDefinition 时跳过该角色', () => {
    const compiled = makeCompileResult(
      [npc('npc-other', 'char-other')],
      [{ file: 'visuals/char-other.json', value: charGuide }],
    );
    const placements: CharacterPlacement[] = [
      { characterId: 'npc-ghost', slot: 'CENTER', visible: true },
    ];
    expect(resolveCharacterPlacements(compiled, placements)).toEqual([]);
  });

  it('characterAssetId 在 visuals 找不到 CharacterAsset 时跳过该角色', () => {
    const compiled = makeCompileResult(
      [npc('npc-guide', 'char-missing')],
      [{ file: 'visuals/img-guide-smile.json', value: imgSmile }],
    );
    const placements: CharacterPlacement[] = [
      { characterId: 'npc-guide', slot: 'LEFT', visible: true },
    ];
    expect(resolveCharacterPlacements(compiled, placements)).toEqual([]);
  });

  it('表情名不在 expressions 里时跳过该角色（expressionKey 缺失 → expressions[key] 为 undefined）', () => {
    const compiled = makeCompileResult(
      [npc('npc-guide', 'char-guide')],
      [{ file: 'visuals/char-guide.json', value: charGuide }],
    );
    const placements: CharacterPlacement[] = [
      { characterId: 'npc-guide', slot: 'CENTER', visible: true, expression: 'angry' },
    ];
    expect(resolveCharacterPlacements(compiled, placements)).toEqual([]);
  });

  it('expressions 指向的 ImageAsset（含 file 字段、带 file 判别）缺失时跳过该角色', () => {
    const compiled = makeCompileResult(
      [npc('npc-guide', 'char-guide')],
      [{ file: 'visuals/char-guide.json', value: charGuide }], // 无 img-guide-smile/neutral
    );
    const placements: CharacterPlacement[] = [
      { characterId: 'npc-guide', slot: 'CENTER', visible: true },
    ];
    expect(resolveCharacterPlacements(compiled, placements)).toEqual([]);
  });

  it('多个角色时某角色被跳过不中断其余角色解析', () => {
    const compiled = makeCompileResult(
      [npc('npc-guide', 'char-guide'), npc('npc-ghost', 'char-ghost'), npc('npc-ok', 'char-guide')],
      [
        { file: 'visuals/char-guide.json', value: charGuide },
        { file: 'visuals/img-guide-smile.json', value: imgSmile },
        { file: 'visuals/img-guide-neutral.json', value: imgNeutral },
      ],
    );
    const placements: CharacterPlacement[] = [
      { characterId: 'npc-ghost', slot: 'RIGHT', visible: false }, // hop2 缺 CharacterAsset → 跳过
      { characterId: 'npc-ok', slot: 'CENTER_LEFT', visible: true },
    ];
    expect(resolveCharacterPlacements(compiled, placements)).toEqual([
      {
        characterId: 'npc-ok',
        slot: 'CENTER_LEFT',
        visible: true,
        file: 'assets/img/guide-neutral.png',
        // charGuide 无 microAnimations 字段 → 结果对象不含该键
      },
    ]);
  });

  it('microAnimations 未定义时结果对象不含该键（exactOptionalPropertyTypes）', () => {
    const compiled = makeCompileResult(
      [npc('npc-guide', 'char-noanim')],
      [
        {
          file: 'visuals/char-noanim.json',
          value: {
            id: 'char-noanim',
            expressions: { neutral: 'img-guide-neutral' },
            defaultExpression: 'neutral',
          },
        },
        { file: 'visuals/img-guide-neutral.json', value: imgNeutral },
      ],
    );
    const placements: CharacterPlacement[] = [
      { characterId: 'npc-guide', slot: 'CENTER', visible: true },
    ];
    const [result] = resolveCharacterPlacements(compiled, placements);
    expect(result?.file).toBe('assets/img/guide-neutral.png');
    expect('microAnimations' in (result ?? {})).toBe(false);
  });
});

describe('onSceneEnter CR #2 端到端（T003 / A09）', () => {
  it('valid-minimal 驱动到 SCENE_ENTER：命令含 characters 且与 resolveCharacterPlacements 一致', () => {
    const presentation: unknown[] = [];
    const actor = createRuntimeMachine({
      chapterRootDir: fixture,
      seed: 'dev022-e2e',
      ports: { presentation: { send: (c) => presentation.push(c) } },
    });
    actor.send({ type: 'BOOT' });

    const sceneEnter = presentation.find((c) => (c as { kind?: unknown }).kind === 'SCENE_ENTER');
    expect(sceneEnter).toBeDefined();
    const command = sceneEnter as { kind: string; sceneId: string; characters?: unknown };
    expect(command.sceneId).toBe('scene-start');
    const compiled = compile(fixture);
    const scene = compiled.schemaResult.scenes.passed.find(
      (e) => e.value.id === 'scene-start',
    )!.value;
    expect(command.characters).toEqual(resolveCharacterPlacements(compiled, scene.characters));
    expect(command.characters).toEqual([
      {
        characterId: 'npc-guide',
        slot: 'CENTER',
        visible: true,
        file: 'assets/img/guide-smile.png',
        microAnimations: [],
      },
    ]);

    // DEV-021 遗留的 visualSceneId/layers 仍在命令中（CR 只追加，不改既有字段）
    const full = sceneEnter as { visualSceneId?: string; layers?: unknown };
    expect(full.visualSceneId).toBe('vs-start');
    expect(Array.isArray(full.layers)).toBe(true);
  });
});
