# DEV-022 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-022.md` 抄录并整理，权威版本为 Task
Package 原文。**第 2.1 节务必先读**：核对 `chapter-schema/npc.ts` 与真实 fixture 后发现
`CharacterPlacement.characterId` 是**三跳引用**（`characterId → NPCDefinition
.characterAssetId → CharacterAsset → ImageAsset`），不是直接指向 `CharacterAsset`。这是
本任务包最易踩坑处，严格按 2.3 节解析顺序实现，不要假设两跳。

## 架构

- 角色 = 固定五档 slot（ADDENDUM-001 §A9 / D06 已冻结产品决策）：`CharacterPlacement {
  characterId, slot: LEFT|CENTER_LEFT|CENTER|CENTER_RIGHT|RIGHT, expression?, visible }`，
  `CharacterAsset { id, expressions, microAnimations?, defaultExpression }`。同屏上限 5 角色，
  严格按此模型渲染，不做自由坐标、不做超 5 角色特殊处理（`SceneNode.characters` 来自已
  编译数据，PASS1/2 已保证合法性）。
- **关键发现**：`characterId` 是三跳引用——
  ```
  SceneNode.characters[].characterId  →  NPCDefinition.id（npc/ 目录）
  NPCDefinition.characterAssetId      →  CharacterAsset.id（visuals/ 目录）
  CharacterAsset.expressions[key]     →  ImageAsset.id（visuals/ 目录）
  ImageAsset.file                     →  实际文件路径
  ```
  真实 fixture（`valid-minimal`，已核对）：`scene-start.characters[0].characterId =
  'npc-guide'` → `npc/npc-guide.json.characterAssetId = 'char-guide'` →
  `visuals/char-guide.json`（`expressions: {smile:'img-guide-smile',
  neutral:'img-guide-neutral'}`, `defaultExpression:'neutral'`）→
  `visuals/img-guide-smile.json.file`。**`characterId` 在 `visuals.passed` 里找不到匹配项
  是正常的**，第一跳必须先查 `compiled.schemaResult.npc.passed`。
- CR（第 2.2 节）：`onSceneEnter` 的 `SCENE_ENTER` 命令载荷追加 `characters` 字段——只新增
  两处（`characters` 局部变量计算 + `send` 参数追加 `characters,`），`scene`/`layers`
  （DEV-021 遗留）与 `audio.send`/`storyMove` 返回及全部其它 action 逐字节不变。
- `resolveCharacterPlacements`（新增纯函数，`characterResolution.ts`，第 2.3 节）：对每个
  `placement` 走三跳解析；防御性处理（与 `resolveVisualLayers` 同一原则，PASS2 理论上已
  保证但仍防御）：任何一跳找不到（`NPCDefinition`/`CharacterAsset`/表情不在 `expressions`/
  `ImageAsset`）**跳过该角色**，不抛异常不中断其余解析。`visible` 原样保留（是否绘制交
  Renderer 侧决定）。
- `composeCharacters`（`apps/renderer/src/render/composeCharacters.ts`，第 2.4 节）：过滤
  `visible === false`；`slot → leftPercent` 固定映射 `LEFT:10, CENTER_LEFT:30, CENTER:50,
  CENTER_RIGHT:70, RIGHT:90`；`animated = (microAnimations?.length ?? 0) > 0`。
- `App.tsx` 追加：`pickSceneCharacters(commands)`（沿用 `pickSceneLayers` 风格）取最近一条
  `SCENE_ENTER` 的 `characters` 跑 `composeCharacters`，渲染一组 `left:{leftPercent}%` 定位、
  `z-index` 固定高于所有背景层（如 `1000`）的 `<img>`，`animated` 为真时加 CSS class 触发
  呼吸动画（内联 `<style>` 或 CSS Module 均可，不引入新构建工具）。

## Requirements

- `ResolvedCharacterPlacement { characterId; slot: CharacterPlacement['slot']; visible;
  file; microAnimations? }`；`resolveCharacterPlacements(compiled: CompileResult,
  placements: CharacterPlacement[]): ResolvedCharacterPlacement[]`。
- `RenderableCharacter { characterId; file; leftPercent; animated }`；
  `composeCharacters(characters: ResolvedCharacterPlacement[]): RenderableCharacter[]`。
- 端到端：`createRuntimeMachine` 驱动 `valid-minimal` 到 `SCENE_ENTER`，捕获命令含
  `characters` 数组，与 T002 返回值一致。
- `index.ts` 仅追加导出 `resolveCharacterPlacements` 与类型 `ResolvedCharacterPlacement`；
  符号可从包外导入。
- `App.tsx` 仅追加，不删除 DEV-020/021 既有逻辑；抽纯函数 `pickSceneCharacters(commands)`
  配测试（不要求 DOM 渲染测试，与 DEV-020/021 先例一致）。

## Non-goals

不实现真实静态资源服务（沿用 DEV-021 已记录缺口）；不实现字幕/对话框（DEV-023）、选择
UI（DEV-024）、骰子 UI（DEV-025）、镜头/视差动画（DEV-026）；**不按具体动画名
（`microAnimations` 数组每个元素）区分渲染效果**——无真实动画资产支撑，`animated === true`
统一套用通用 CSS 呼吸/缩放脉动（真正按名字驱动留到有真实动画资产定义时）；不做 DOM 渲染
测试（沿用 DEV-020/021 先例）；不修改 `machine.test.ts`/`visualResolution.ts` 及其测试
（已核实无需修改）；不处理超过 5 个角色同屏的情况（D06 已定稿上限 5，来自已编译数据，无需
额外防御）；不新增任何 npm 依赖。

## Task Order

T001 节点文档；T002 `resolveCharacterPlacements`（含测试）；T003 `machine.ts` CR #2（含端到端
验证，测试落在 `characterResolution.test.ts`）；T004 `index.ts` 追加导出；T005 `composeCharacters`
（含测试）；T006 `App.tsx` 角色渲染（含 `pickSceneCharacters` 纯函数测试）；T007 全量验证、
REPORT、DECISIONS、commit 与 NODE_REPORT。
