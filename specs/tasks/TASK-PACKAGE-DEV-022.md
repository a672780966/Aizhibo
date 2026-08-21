# TASK PACKAGE — DEV-022

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-022 |
| Node Name | Character Renderer |
| Milestone | M2 — Presentation Complete（第三个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-021（DONE，`verdict_ref: "0104"`） |
| Commander | Claude |
| Executor | Codex（协议角色名 `OPENCODE`） |

### 本节点是第二次对 `onSceneEnter` 发窄范围 CR——延续 DEV-021 建立的模式

DEV-021 已经给 `SCENE_ENTER` 命令载荷加了 `visualSceneId`/`layers`。本节点用**同一套模式**
再加一个字段 `characters`（角色站位解析结果）。已核对 DEV-021 新增的
`visualResolution.test.ts` 与既有 `machine.test.ts` 均不对 `SCENE_ENTER` 命令做完整
payload 的 `toEqual`/`toMatchObject` 精确比对（只查 `kind`/具体字段存在性），新增字段
不会破坏任何既有测试。

---

## 2. 架构设计（Commander 已核对真实代码、真实 fixture 与 ADDENDUM 决策后做出的决策）

### 2.1 角色 = 固定五档 slot（ADDENDUM-001 §A9 / D06，已冻结产品决策，不重新讨论）

`chapter-schema` 已冻结：`CharacterPlacement { characterId, slot: LEFT|CENTER_LEFT|
CENTER|CENTER_RIGHT|RIGHT, expression?, visible }`；`CharacterAsset { id, expressions:
Record<string,string>（表情名→ImageAsset id）, microAnimations?: string[],
defaultExpression }`。D06 已定稿："固定五档 slot...同屏上限 5 角色"——本节点严格按这个
模型渲染，不做自由坐标、不做超过 5 个角色的特殊处理（`SceneNode.characters` 数组本身来自
已编译数据，PASS1/2 已保证合法性）。

**关键发现：`characterId` 是三跳引用，不是直接指向 `CharacterAsset`**——已核对
`packages/chapter-schema/src/npc.ts`（ADDENDUM §A8）与真实 fixture 数据确认：

```
SceneNode.characters[].characterId  →  NPCDefinition.id（npc/ 目录）
NPCDefinition.characterAssetId      →  CharacterAsset.id（visuals/ 目录）
CharacterAsset.expressions[key]     →  ImageAsset.id（visuals/ 目录）
ImageAsset.file                     →  实际文件路径
```

真实 fixture 印证（`valid-minimal`）：`scene-start.characters[0].characterId = 'npc-guide'`
→ `npc/npc-guide.json.characterAssetId = 'char-guide'` → `visuals/char-guide.json`
（`expressions: {smile:'img-guide-smile', neutral:'img-guide-neutral'}`,
`defaultExpression:'neutral'`）→ `visuals/img-guide-smile.json.file`。**`characterId`
本身在 `visuals.passed` 集合里找不到匹配项是正常的**，第一跳必须先查
`compiled.schemaResult.npc.passed`。

### 2.2 CR：`onSceneEnter` 追加 `characters` 字段——与 DEV-021 同一模式

**现状**（DEV-021 已冻结，`machine.ts`）：

```typescript
onSceneEnter: assign(({ context }) => {
  const scene = ...
  const layers = ...
  context.ports.presentation.send({
    kind: 'SCENE_ENTER',
    sceneId: context.currentSceneId,
    visualSceneId: scene?.visualSceneId,
    layers,
  });
  ...
}),
```

**授权改为**（**只在这一处新增两行——`characters` 的计算 + 加进 send 的对象字面量**，
其余全部——包括 DEV-021 刚加的 `scene`/`layers` 计算——逐字节不变）：

```typescript
onSceneEnter: assign(({ context }) => {
  const scene = ...
  const layers = ...
  const characters =
    context.compiled !== null && scene !== undefined
      ? resolveCharacterPlacements(context.compiled, scene.characters)
      : [];
  context.ports.presentation.send({
    kind: 'SCENE_ENTER',
    sceneId: context.currentSceneId,
    visualSceneId: scene?.visualSceneId,
    layers,
    characters,
  });
  ...
}),
```

**验收时会逐行核对**：`git diff` 在 `onSceneEnter` 内只新增 `characters` 相关的两处，
DEV-021 遗留的 `scene`/`layers` 逻辑和其余全部 action 逐字节不变。

### 2.3 `resolveCharacterPlacements`——新增纯函数（新文件，追加式）

```typescript
export interface ResolvedCharacterPlacement {
  characterId: string;
  slot: CharacterPlacement['slot'];
  visible: boolean;
  file: string;                  // 当前表情对应的图片资产文件
  microAnimations?: string[];    // 原样透传 CharacterAsset.microAnimations
}

export function resolveCharacterPlacements(
  compiled: CompileResult,
  placements: CharacterPlacement[],
): ResolvedCharacterPlacement[]
```

对每个 `placement`：先在 `compiled.schemaResult.npc.passed` 里找
`id === placement.characterId`（`NPCDefinition`），取其 `characterAssetId`；再在
`compiled.schemaResult.visuals.passed` 里找 `id === characterAssetId && 'expressions'
in value`（`CharacterAsset`）；`expressionKey = placement.expression ??
characterAsset.defaultExpression`；`assetId = characterAsset.expressions[expressionKey]`；
最后找 `id === assetId && 'file' in value`（`ImageAsset`）取 `file`。**防御性处理**（与
`resolveVisualLayers` 同一原则，PASS2 理论上已保证引用有效但仍要防御）：任何一跳找不到
（`NPCDefinition`、`CharacterAsset`、`expressionKey` 不在 `expressions` 里、或
`ImageAsset`），**跳过该角色**（不抛异常，不中断其余角色解析）。`visible` 字段原样保留
（不在这一层过滤不可见角色——是否绘制交给 Renderer 侧决定，见 2.4 节）。

### 2.4 Renderer 侧：五档 slot 定位 + 呼吸类微动效果

```typescript
// apps/renderer/src/render/composeCharacters.ts
export interface RenderableCharacter {
  characterId: string;
  file: string;
  leftPercent: number;   // 五档 slot 映射到水平位置百分比
  animated: boolean;     // microAnimations 非空时为 true
}
export function composeCharacters(
  characters: ResolvedCharacterPlacement[],
): RenderableCharacter[]
```

- 过滤 `visible === false` 的角色（不渲染）。
- `slot → leftPercent` 固定映射：`LEFT: 10, CENTER_LEFT: 30, CENTER: 50,
  CENTER_RIGHT: 70, RIGHT: 90`（五档等距，记入 `DECISIONS.md`）。
- `animated = (microAnimations?.length ?? 0) > 0`。

**已知简化，如实记录**：`microAnimations` 目前只有名字列表（如 `["breathe"]`），没有任何
真实动画资产/骨骼数据（内容工厂 M7 尚未产出）。本节点**不按具体动画名区分效果**，只要
`animated === true` 就套用**一种通用的 CSS 呼吸/缩放脉动效果**（`@keyframes` + `scale`）
——真正按名字驱动不同微动画留给有真实动画资产定义时再做，不在这里假装已经支持了任意
命名的动画。

`App.tsx` 延续 `pickSceneLayers` 的既有模式，新增 `pickSceneCharacters(commands)`：从最近
一条 `SCENE_ENTER` 命令取 `characters` 字段，跑 `composeCharacters`，渲染成一组用
`left: {leftPercent}%` 定位、`z-index` 固定高于所有背景层（如 `1000`，角色永远画在场景
层之上，记入 `DECISIONS.md`）的 `<img>`，`animated` 为真时加一个 CSS class 触发呼吸动画。

---

## 3. Scope

### Writable Scope — `packages/runtime-kernel`，一处窄范围 CR + 追加

```
packages/runtime-kernel/src/machine.ts        （仅第 2.2 节描述的 onSceneEnter 内新增
                                                 两处，其余（含 DEV-021 遗留代码）逐字节不变）
packages/runtime-kernel/src/characterResolution.ts       （新增）
packages/runtime-kernel/src/characterResolution.test.ts  （新增）
packages/runtime-kernel/src/index.ts          （仅追加导出）
```

### Writable Scope — `apps/renderer`，新增文件

```
apps/renderer/src/render/composeCharacters.ts
apps/renderer/src/render/composeCharacters.test.ts
```

### Writable Scope — `apps/renderer`，仅追加式扩展既有文件

```
apps/renderer/src/App.tsx   （追加角色渲染，不删除既有场景层/调试列表/HELLO 逻辑）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-022/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/runtime-kernel/src/ 下除 machine.ts（唯一授权改动）/characterResolution.*（新增）/
  index.ts（仅追加）外的全部既有文件（含 visualResolution.ts/.test.ts、machine.test.ts——
  已核实无需修改，仍是 Read-only）
packages/runtime-kernel/package.json、tsconfig.json
packages/chapter-schema/**、packages/chapter-compiler/**（含 test-fixtures/**）、
  packages/rule-engine/**、packages/dice-engine/**、packages/narrative-composer/**、
  packages/persistence/**、packages/shared/**
apps/renderer/src/ws/**、apps/renderer/src/server/**、apps/renderer/src/main.tsx、
  apps/renderer/src/render/composeLayers.*、apps/renderer/package.json、tsconfig.json、
  vite.config.ts、index.html——DEV-020/021 冻结
根 tsconfig.json、tsconfig.base.json、vitest.config.ts、eslint.config.js、根 package.json
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
```

### Forbidden Scope

```
packages/* 除 runtime-kernel（限定文件）外的任何目录
apps/* 除 renderer（限定文件）外的任何目录
apps/renderer 内 DEV-020/021 冻结的文件（ws/server/main.tsx/composeLayers/配置文件）
对 machine.ts 中 onSceneEnter 以外任何 action/guard 的修改；对 onSceneEnter 内 DEV-021
  已有代码（scene/layers 计算、audio.send、storyMove 返回）的任何改动
任何根级配置文件的修改
真实的字幕（DEV-023）、选择 UI（DEV-024）、骰子 UI（DEV-025）、镜头/视差动画（DEV-026）
按具体动画名区分微动效果（无真实动画资产支撑，见 2.4 节已知简化）
新增任何 npm 依赖
```

---

## 4. Required Skills

### Required

- 窄范围修改一个已被连续两次 CR 过的 XState action，精确控制 diff 边界
- CSS `@keyframes`/`transform: scale` 基础动画（不需要动画库）

### Forbidden / Unnecessary

- 任何动画库（GSAP、Framer Motion 等）——纯 CSS 足够
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `currentScene`（已冻结） | 取 `SceneNode.characters` |
| `CompileResult.schemaResult.npc` / `.visuals`（已冻结，含 `NPCDefinition`/`CharacterAsset`/`ImageAsset`） | 角色资产三跳解析（`characterId → NPCDefinition.characterAssetId → CharacterAsset → ImageAsset`） |
| `packages/chapter-compiler/test-fixtures/valid-minimal`（Read-only 引用） | 端到端测试素材（`scene-start.characters` 的 `npc-guide` → `npc/npc-guide.json` → `char-guide` → `visuals/char-guide.json` → `img-guide-smile`/`img-guide-neutral`，全链路已核实存在） |
| `composeLayers`/`pickSceneLayers`（DEV-021 冻结） | 渲染模式先例，`composeCharacters`/`pickSceneCharacters` 照此风格实现 |

---

## 6. Outputs

1. `resolveCharacterPlacements`/`ResolvedCharacterPlacement`（`characterResolution.ts`）
2. `onSceneEnter` 的 `SCENE_ENTER` 命令载荷追加 `characters` 字段
3. `composeCharacters`/`RenderableCharacter`（`apps/renderer`）
4. `App.tsx` 新增角色渲染 + 呼吸类微动 CSS
5. `specs/dev/DEV-022/DECISIONS.md`，记录：五档 slot 百分比映射、角色 z-index 固定高于
   背景层的理由、微动效果"只做通用呼吸,不按名字区分"的简化理由

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-022/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Acceptance**：四文件存在；`INDEX.md` 含 Task Order T001–T007。

---

### T002 — `resolveCharacterPlacements`

- **Allowed Files**：`packages/runtime-kernel/src/characterResolution.ts`、`characterResolution.test.ts`
- **Requirements**：按第 2.3 节实现三跳解析（`NPCDefinition` → `CharacterAsset` →
  `ImageAsset`）。先核实 `valid-minimal` fixture 的真实数据链：
  `scene-start.characters[0].characterId = 'npc-guide'` → `npc/npc-guide.json
  .characterAssetId = 'char-guide'` → `visuals/char-guide.json`（`expressions`/
  `defaultExpression`）→ `visuals/img-guide-smile.json`/`img-guide-neutral.json`
  （均已确认存在）。
- **Acceptance**：对 `valid-minimal` 编译产物 + `scene-start.characters`（`npc-guide`，
  `expression:'smile'`）调用，返回正确解析出 `smile` 对应的 `file`
  （`img-guide-smile.json` 的 `file`）；省略 `expression` 时回退 `defaultExpression`
  （`neutral`）；手写"`characterId` 找不到 `NPCDefinition`"/"`characterAssetId` 找不到
  `CharacterAsset`"/"表情名不在 `expressions` 里"/"资产文件缺失"四种用例分别验证防御性
  跳过。

---

### T003 — `machine.ts` CR #2

- **Allowed Files**：`packages/runtime-kernel/src/machine.ts`（**仅第 2.2 节描述的新增两处**）
- **Requirements**：按第 2.2 节精确实施。
- **Acceptance**：
  - `git diff` 只显示 `onSceneEnter` 内新增 `characters` 局部变量 + `send` 参数追加
    一个字段，DEV-021 遗留的 `scene`/`layers` 计算、`audio.send`、`storyMove` 返回
    逐字节不变，其余全部 action 不变。
  - 端到端：`createRuntimeMachine` 驱动 `valid-minimal` 到 `SCENE_ENTER`，捕获的命令
    含 `characters` 数组，与 T002 的返回值一致。
  - 既有 `machine.test.ts`（未改动）全部测试仍然通过。

---

### T004 — `index.ts` 追加导出

- **Allowed Files**：`packages/runtime-kernel/src/index.ts`（**仅追加**）
- **Requirements**：追加导出 `resolveCharacterPlacements`，类型 `ResolvedCharacterPlacement`。
- **Acceptance**：`git diff` 只有新增行；符号可从包外导入。

---

### T005 — `composeCharacters`

- **Allowed Files**：`apps/renderer/src/render/composeCharacters.ts`、`composeCharacters.test.ts`
- **Requirements**：按第 2.4 节实现。
- **Acceptance**：`visible:false` 的角色被过滤；五档 slot 百分比映射正确；`microAnimations` 非空/为空/未定义三种情形 `animated` 判定正确。

---

### T006 — `App.tsx` 角色渲染

- **Allowed Files**：`apps/renderer/src/App.tsx`（**仅追加**，不删除既有场景层/调试列表/HELLO 逻辑）
- **Requirements**：按第 2.4 节，新增 `pickSceneCharacters(commands)`（沿用
  `pickSceneLayers` 风格）+ 渲染定位角色 `<img>` + 呼吸动画 CSS（内联 `<style>` 或
  CSS Module 均可，不引入额外构建工具）。
- **Acceptance**：`pickSceneCharacters` 作为纯函数可单测（沿用 DEV-021"不做 DOM 渲染
  测试"的先例）。

---

### T007 — 全量验证、REPORT 与 commit

- **Allowed Files**：`specs/dev/DEV-022/INDEX.md`、`REPORT.md`、`DECISIONS.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-022.md`
- **Requirements**：
  1. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  2. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  3. **`DECISIONS.md` 必须已提交**，覆盖第 6 节列出的全部要点。
  4. 更新 `INDEX.md`：T001–T007 全部勾选。
  5. `git add -A && git commit`，提交信息首行：`DEV-022: character renderer`。
  6. 追加 LEDGER 行，发 `NODE_REPORT`。
  7. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`REPORT.md` 引用的全部文档已入库；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-022 INDEX

Status: IN_PROGRESS

## Current Node

DEV-022 — Character Renderer

## Objective

第二次对 `onSceneEnter` 发窄范围 CR，追加 `characters` 字段（角色站位解析：slot/表情
图片/可见性/微动画名）；`apps/renderer` 按固定五档 slot 定位渲染，套用通用呼吸类微动效果。

## Allowed Scope（runtime-kernel：CR + 新增 + 追加）
（抄录 Task Package 第 3 节实际条目——machine.ts 只在 onSceneEnter 内新增两处）

## Allowed Scope（apps/renderer：新增 + 仅追加）
（抄录 Task Package 第 3 节实际条目）

## Read-only Scope
（抄录 Task Package 第 3 节实际条目）

## Forbidden Scope
（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 resolveCharacterPlacements
- [ ] T003 machine.ts CR #2
- [ ] T004 index.ts 追加导出
- [ ] T005 composeCharacters
- [ ] T006 App.tsx 角色渲染
- [ ] T007 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001（每完成一个 Task 立即勾选并更新本字段）

## Exit Criteria

六条命令全部退出码 0；`machine.ts` 的 git diff 精确限定在 `onSceneEnter` 内新增两处，
DEV-021 遗留代码不变；端到端验证 `SCENE_ENTER` 命令含正确 `characters`；既有
`machine.test.ts` 零回归；`DECISIONS.md` 已入库；REPORT.md 完成且
Status = READY_FOR_REVIEW；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **`machine.ts` 只能在 `onSceneEnter` 内新增两处**（`characters` 计算 + send 参数追加
   字段），DEV-021 遗留的既有代码与其余全部 action 逐字节不变。
2. **`index.ts` 仅追加**；`App.tsx` 仅追加，不删除既有逻辑。
3. **不修改 `apps/renderer` 的 DEV-020/021 冻结文件**（含 `composeLayers.*`）。
4. **不新增任何 npm 依赖**。
5. **不按具体动画名区分微动效果**（第 2.4 节已知简化）。
6. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
7. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现真实静态资源服务（沿用 DEV-021 已记录的缺口）。
- 不实现字幕/对话框（DEV-023）、选择 UI（DEV-024）、骰子 UI（DEV-025）、镜头/视差动画
  （DEV-026）。
- 不按具体动画名（`microAnimations` 数组的每个元素）区分渲染效果——无真实动画资产支撑。
- 不做 DOM 渲染测试（沿用 DEV-020/021 先例）。
- 不修改 `machine.test.ts`/`visualResolution.ts`（已核实无需修改）。
- 不处理超过 5 个角色同屏的情况（D06 已定稿上限 5，`SceneNode.characters` 本身来自
  已编译数据，不需要额外防御）。

---

## 11. Tests

### Unit tests

T002、T005：覆盖第 7 节描述的具体行为。

### Integration tests

T003：端到端驱动真实 actor 验证 CR 后的命令载荷。

### Regression tests

`pnpm test` 覆盖全 workspace；既有全部包测试零回归（含未改动的 `machine.test.ts`/`visualResolution.test.ts`）。

---

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `resolveCharacterPlacements` 对真实 `valid-minimal` 数据完成三跳解析并返回正确结果，四类缺失引用均防御性跳过 | 测试检查 |
| A08 | `machine.ts` 的 git diff 精确限定在 `onSceneEnter` 内新增两处，DEV-021 遗留代码逐字节不变 | git diff 逐行比对 |
| A09 | 端到端：`SCENE_ENTER` 命令含正确 `characters` | 测试检查 |
| A10 | `machine.test.ts`/`visualResolution.ts`/`.test.ts` 未被修改且全部测试通过 | git diff + 命令输出 |
| A11 | `composeCharacters` 过滤不可见角色、五档 slot 映射正确、`animated` 判定正确 | 测试检查 |
| A12 | `App.tsx` 的 git diff 只有新增，DEV-021 既有场景层/调试列表/HELLO 逻辑保留 | git diff 比对 |
| A13 | `apps/renderer` 的 DEV-020/021 冻结文件（含 `composeLayers.*`）未被修改 | git diff 比对 |
| A14 | `packages/**`（除 runtime-kernel 限定文件外）全部未被修改 | git diff 比对 |
| A15 | 未新增任何 npm 依赖 | 文件检查 |
| A16 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A17 | `specs/dev/DEV-022/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T007 全部勾选 | 文件 + 文本检查 |
| A18 | `git log` 新增恰 1 条提交，首行 `DEV-022: character renderer`；提交时 `git status --porcelain` 为空 | 命令 |
| A19 | LEDGER 含 `NODE_REPORT-DEV-022` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A20 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT（含确认 `DECISIONS.md` 已提交）→ commit → 发 NODE_REPORT → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A20。
