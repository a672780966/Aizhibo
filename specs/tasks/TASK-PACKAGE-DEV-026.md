# TASK PACKAGE — DEV-026

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-026 |
| Node Name | Camera / Transition |
| Milestone | M2 — Presentation Complete（第七个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-025（DONE，`verdict_ref: "0124"`） |
| Commander | Claude |
| Executor | Codex（协议角色名 `OPENCODE`） |

### 本节点是第四次对 `onSceneEnter` 发窄范围 CR

延续 DEV-021/022/023 建立的模式，第四次给 `onSceneEnter` 的 `SCENE_ENTER` 命令追加
一个字段（`cameraPreset`）。`DAG.md` 已明确本节点的边界："仅 preset 键映射，不做镜头
DSL"——`VisualScene.cameraPreset` 是纯字符串键（`chapter-schema` 已冻结，
`z.string().optional()`），Renderer 只需要把这个字符串映射到预先写死的一小组 CSS
效果，不发明任何镜头脚本语言或动态参数系统。

### 关键发现：`chapter-schema` 没有"转场预设"字段——"Transition"是 Renderer 侧的通用行为，不是逐场景可配置数据

已核对全部 `chapter-schema` 源码，`cameraPreset` 是唯一与"镜头"相关的字段，**不存在**
任何"转场预设"（transition preset）字段。处置：转场不是章节作者可配置的数据，而是
Renderer 每次收到新场景（`SCENE_ENTER`，`sceneId` 变化）时统一套用的**一种**内置过渡
效果（淡入），不新增任何 schema 字段，也不需要任何新的 `onSceneEnter` CR 来传递
"用哪种转场"——这本身就是"不做镜头 DSL"精神的延伸：转场效果本身也不该被过度参数化。

---

## 2. 架构设计（Commander 已核对真实代码后做出的决策）

### 2.1 CR：`onSceneEnter` 追加 `cameraPreset` 字段

**现状**（DEV-023 已冻结，`SCENE_ENTER` 载荷含 `sceneId`/`visualSceneId`/`layers`/
`characters`/`narration`）：

**授权改为**（**只新增这一个字段**，既有四个字段的计算逐字节不变）：

```typescript
context.ports.presentation.send({
  kind: 'SCENE_ENTER',
  sceneId: context.currentSceneId,
  visualSceneId: scene?.visualSceneId,
  layers,
  characters,
  narration: scene?.narration ?? [],
  cameraPreset:
    context.compiled !== null && scene !== undefined
      ? resolveCameraPreset(context.compiled, scene.visualSceneId)
      : undefined,
});
```

**验收时逐行核对**：`git diff` 只在 `onSceneEnter` 的 `send` 调用里新增
`cameraPreset` 一行（含其条件表达式），既有 `scene`/`layers`/`characters`/
`narration` 计算与其余全部 action 逐字节不变。

### 2.2 `resolveCameraPreset`——新增纯函数（新文件，追加式，不修改 `resolveVisualLayers`）

```typescript
export function resolveCameraPreset(
  compiled: CompileResult,
  visualSceneId: string,
): string | undefined
```

在 `compiled.schemaResult.visuals.passed` 里找 `id === visualSceneId && 'layers' in
value`（`VisualScene`），返回其 `cameraPreset`（可能是 `undefined`，字段本身是
optional）。**故意不修改 `resolveVisualLayers`**（DEV-021 已冻结）——虽然两者都要先
找到同一个 `VisualScene` 条目，存在少量重复查找，但保持每个函数单一职责、不打开一个
已冻结函数的返回值形状，比省一次查找更重要（三行重复好过一次不必要的接口变更）。

### 2.3 Renderer 侧：preset→CSS 映射表 + 场景切换时的通用淡入过渡

```typescript
// apps/renderer/src/render/cameraPreset.ts
export interface CameraStyle { transform: string }
export function resolveCameraPresetStyle(preset: string | undefined): CameraStyle
```

内置一张小映射表（如 `closeup: scale(1.15)`、`wide: scale(0.9)`），`undefined` 或
**任何未收录的字符串**一律回退到 `{transform: 'scale(1)'}`（安全默认值，不抛异常——
章节作者未来可能用到映射表暂未收录的新预设名，防御性处理是必需的，不是可选的）。

```typescript
// apps/renderer/src/render/pickSceneMeta.ts
export function pickCameraPreset(commands: PresentationCommand[]): string | undefined
export function pickSceneEnterKey(commands: PresentationCommand[]): number
```

`pickSceneEnterKey` 取最近一条 `SCENE_ENTER` 的 `commandSeq`（没有则 `0`），作为场景
容器 React 元素的 `key`——每次场景切换这个值都会变化，`key` 变化触发 React 重新挂载该
元素，天然重放一次 CSS `@keyframes fadeIn` 过渡，不需要额外的过渡状态机。

`App.tsx`：给已有的场景层容器（`<section aria-label="scene layers">`）追加
`key={pickSceneEnterKey(commands)}`、内联应用 `resolveCameraPresetStyle(
pickCameraPreset(commands))` 的 `transform`、追加一段 `fadeIn` CSS 动画。

---

## 3. Scope

### Writable Scope — `packages/runtime-kernel`，一处窄范围 CR + 追加

```
packages/runtime-kernel/src/machine.ts        （仅第 2.1 节描述的 onSceneEnter 内新增
                                                 一行，其余内容——含历次 CR 遗留代码——
                                                 逐字节不变）
packages/runtime-kernel/src/cameraResolution.ts       （新增）
packages/runtime-kernel/src/cameraResolution.test.ts  （新增）
packages/runtime-kernel/src/index.ts          （仅追加导出）
```

### Writable Scope — `apps/renderer`，新增文件

```
apps/renderer/src/render/cameraPreset.ts
apps/renderer/src/render/cameraPreset.test.ts
apps/renderer/src/render/pickSceneMeta.ts
apps/renderer/src/render/pickSceneMeta.test.ts
```

### Writable Scope — `apps/renderer`，仅追加式扩展既有文件

```
apps/renderer/src/App.tsx   （追加 key/camera transform/fadeIn 动画，不删除既有场景层/
                               角色/对话框/选项/骰子/调试列表/HELLO 逻辑）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-026/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/runtime-kernel/src/ 下除 machine.ts（唯一授权改动）/cameraResolution.*（新增）/
  index.ts（仅追加）外的全部既有文件（含 machine.test.ts、visualResolution.*、
  characterResolution.*、choiceResolution.*、interactionRegion.*——本节点不改任何既有
  文件的既有内容）
packages/runtime-kernel/package.json、tsconfig.json
packages/chapter-schema/**、packages/chapter-compiler/**（含 test-fixtures/**）、
  packages/rule-engine/**、packages/dice-engine/**、packages/narrative-composer/**、
  packages/persistence/**、packages/shared/**
apps/renderer/src/ws/**、apps/renderer/src/server/**、apps/renderer/src/main.tsx、
  apps/renderer/src/render/composeLayers.*、composeCharacters.*、pickDialogueLines.*、
  lineIndex.*、pickInteractionOpen.*、pickDiceState.*、apps/renderer/package.json、
  tsconfig.json、vite.config.ts、index.html——DEV-020～025 冻结
根 tsconfig.json、tsconfig.base.json、vitest.config.ts、eslint.config.js、根 package.json
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
```

### Forbidden Scope

```
packages/* 除 runtime-kernel（限定文件）外的任何目录
apps/* 除 renderer（限定文件）外的任何目录
apps/renderer 内 DEV-020～025 冻结的文件
对 machine.ts 中 onSceneEnter 以外任何 action/guard 的修改；对 onSceneEnter 内既有代码
  （scene/layers/characters/narration 计算、audio.send、storyMove 返回）的任何改动
对 `resolveVisualLayers`（DEV-021 冻结）的任何修改（不得往它身上加 cameraPreset 返回值）
新增任何"镜头 DSL"/动态参数系统（第 2 节已说明理由）
新增任何"转场预设"schema 字段（不存在，本节点不新增）
任何根级配置文件的修改
新增任何 npm 依赖
```

---

## 4. Required Skills

### Required

- 窄范围修改一个已被连续四次 CR 过的 XState action，精确控制 diff 边界
- CSS `transform`/`@keyframes` 基础动画，React `key` 触发重挂载的惯用法

### Forbidden / Unnecessary

- 任何动画库、镜头/相机 DSL 解析器
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `VisualScene.cameraPreset`（已冻结，`chapter-schema`） | 镜头预设来源 |
| `currentScene`（已冻结） | 取当前场景的 `visualSceneId` |
| `pickSceneLayers`/`composeLayers`（DEV-021 冻结） | 渲染模式先例 |
| `packages/chapter-compiler/test-fixtures/valid-minimal`（Read-only 引用） | 端到端测试素材（`vs-start` 无 `cameraPreset`，验证 optional 分支） |

---

## 6. Outputs

1. `resolveCameraPreset`（`cameraResolution.ts`）
2. `onSceneEnter` 的 `SCENE_ENTER` 命令载荷追加 `cameraPreset` 字段
3. `resolveCameraPresetStyle`/`pickCameraPreset`/`pickSceneEnterKey`（`apps/renderer`）
4. `App.tsx` 新增镜头变换 + 场景切换淡入过渡
5. `specs/dev/DEV-026/DECISIONS.md`，记录：为何不修改 `resolveVisualLayers`、
   转场不新增 schema 字段的理由、preset→CSS 映射表的内容与"未收录预设安全回退"的理由

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-026/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Acceptance**：四文件存在；`INDEX.md` 含 Task Order T001–T007。

---

### T002 — `resolveCameraPreset`

- **Allowed Files**：`packages/runtime-kernel/src/cameraResolution.ts`、`cameraResolution.test.ts`
- **Requirements**：按第 2.2 节实现。
- **Acceptance**：手写一个带 `cameraPreset` 的 `VisualScene`/`CompileResult` 用例返回
  正确值；对 `valid-minimal` 的 `vs-start`（无 `cameraPreset`）调用返回 `undefined`；
  不存在的 `visualSceneId` 也返回 `undefined`（不抛异常）。

---

### T003 — `machine.ts` CR

- **Allowed Files**：`packages/runtime-kernel/src/machine.ts`（**仅第 2.1 节描述的一行新增**）
- **Requirements**：按第 2.1 节精确实施。
- **Acceptance**：
  - `git diff` 只显示 `onSceneEnter` 的 `send` 调用新增 `cameraPreset` 一行，既有
    `scene`/`layers`/`characters`/`narration` 计算与其余全部 action 逐字节不变。
  - 端到端：`createRuntimeMachine` 驱动 `valid-minimal` 到 `SCENE_ENTER`，捕获的命令
    含 `cameraPreset: undefined`（`vs-start` 未设置该字段，如实反映）。
  - 既有 `machine.test.ts`（未改动）全部测试仍然通过。

---

### T004 — `index.ts` 追加导出

- **Allowed Files**：`packages/runtime-kernel/src/index.ts`（**仅追加**）
- **Requirements**：追加导出 `resolveCameraPreset`。
- **Acceptance**：`git diff` 只有新增行；符号可从包外导入。

---

### T005 — `cameraPreset.ts` + `pickSceneMeta.ts`

- **Allowed Files**：`apps/renderer/src/render/cameraPreset.ts`、`.test.ts`、`pickSceneMeta.ts`、`.test.ts`
- **Requirements**：按第 2.3 节实现。
- **Acceptance**：已收录/未收录/`undefined` 三种 preset 输入均返回安全的 `CameraStyle`；`pickCameraPreset`/`pickSceneEnterKey` 对无命令/有命令情形正确返回。

---

### T006 — `App.tsx` 镜头/转场渲染

- **Allowed Files**：`apps/renderer/src/App.tsx`（**仅追加**，不删除既有逻辑）
- **Requirements**：按第 2.3 节，场景层容器追加 `key`/`transform`/`fadeIn` 动画。
- **Acceptance**：手动核查渲染逻辑正确调用 `pickCameraPreset`/`pickSceneEnterKey`/`resolveCameraPresetStyle`（不要求 DOM 渲染测试，沿用先例）。

---

### T007 — 全量验证、REPORT 与 commit

- **Allowed Files**：`specs/dev/DEV-026/INDEX.md`、`REPORT.md`、`DECISIONS.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-026.md`
- **Requirements**：
  1. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  2. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  3. **`DECISIONS.md` 必须已提交**，覆盖第 6 节列出的全部要点。
  4. 更新 `INDEX.md`：T001–T007 全部勾选，**且把文件顶部的 `Status:` 一行从
     `IN_PROGRESS` 改为 `READY_FOR_REVIEW`**。
  5. `git add -A && git commit`，提交信息首行：`DEV-026: camera transition`。
  6. 追加 LEDGER 行，发 `NODE_REPORT`。
  7. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`REPORT.md` 引用的全部文档已入库；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-026 INDEX

Status: IN_PROGRESS

## Current Node

DEV-026 — Camera / Transition

## Objective

第四次对 `onSceneEnter` 发窄范围 CR，追加 `cameraPreset` 字段（纯字符串键，不做镜头
DSL）；`apps/renderer` 用内置映射表把 preset 转成 CSS `transform`，场景切换时统一套用
一种淡入过渡（React `key` 触发重挂载，不新增过渡状态机）。转场不是章节可配置数据，不
新增 schema 字段。

## Allowed Scope（runtime-kernel：CR + 新增 + 追加）
（抄录 Task Package 第 3 节实际条目——machine.ts 只在 onSceneEnter 内新增一行）

## Allowed Scope（apps/renderer：新增 + 仅追加）
（抄录 Task Package 第 3 节实际条目）

## Read-only Scope
（抄录 Task Package 第 3 节实际条目）

## Forbidden Scope
（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 resolveCameraPreset
- [ ] T003 machine.ts CR
- [ ] T004 index.ts 追加导出
- [ ] T005 cameraPreset.ts + pickSceneMeta.ts
- [ ] T006 App.tsx 镜头/转场渲染
- [ ] T007 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001（每完成一个 Task 立即勾选并更新本字段）

## Exit Criteria

六条命令全部退出码 0；`machine.ts` 的 git diff 精确限定在一行新增；端到端验证
`SCENE_ENTER` 含正确 `cameraPreset`；既有 `machine.test.ts` 零回归；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **`machine.ts` 只能在 `onSceneEnter` 的 `send` 调用里新增一行**，其余全部内容逐字节
   不变。
2. **不修改 `resolveVisualLayers`**（DEV-021 冻结，第 2.2 节已说明理由）。
3. **不修改 `apps/renderer` 的 DEV-020～025 冻结文件**。
4. **不新增任何"镜头 DSL"/转场预设 schema 字段**。
5. **不新增任何 npm 依赖**。
6. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
7. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现任何镜头运动/推拉摇移的动态参数系统（"不做镜头 DSL"）。
- 不新增章节作者可配置的转场类型（无 schema 支持，本节点不新增）。
- 不实现 BGM/SFX（DEV-027）、Presentation Command Bus 的完整基础设施（DEV-028）。
- 不做 DOM 渲染测试（沿用先例）。
- 不修改 `machine.test.ts`/`visualResolution.*`/`characterResolution.*`/
  `choiceResolution.*`/`interactionRegion.*`。

---

## 11. Tests

### Unit tests

T002、T005：覆盖第 7 节描述的具体行为。

### Integration tests

T003：端到端驱动真实 actor 验证 CR 后的命令载荷。

### Regression tests

`pnpm test` 覆盖全 workspace；既有全部包测试零回归。

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
| A07 | `resolveCameraPreset` 对有/无 `cameraPreset`、不存在的 `visualSceneId` 均正确处理 | 测试检查 |
| A08 | `machine.ts` 的 git diff 精确限定在一行新增 | git diff 逐行比对 |
| A09 | 端到端：`SCENE_ENTER` 命令含正确 `cameraPreset` | 测试检查 |
| A10 | `machine.test.ts` 未被修改且全部测试通过 | git diff + 命令输出 |
| A11 | `resolveCameraPresetStyle` 对已收录/未收录/`undefined` 均返回安全值 | 测试检查 |
| A12 | `pickCameraPreset`/`pickSceneEnterKey` 对无/有命令情形正确返回 | 测试检查 |
| A13 | `App.tsx` 的 git diff 只有新增，DEV-020～025 既有逻辑保留 | git diff 比对 |
| A14 | `apps/renderer` 的 DEV-020～025 冻结文件未被修改 | git diff 比对 |
| A15 | `packages/**`（除 runtime-kernel 限定文件外）全部未被修改 | git diff 比对 |
| A16 | 未新增任何 npm 依赖 | 文件检查 |
| A17 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A18 | `specs/dev/DEV-026/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T007 全部勾选，`Status:` 表头改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A19 | `git log` 新增恰 1 条提交，首行 `DEV-026: camera transition`；提交时 `git status --porcelain` 为空 | 命令 |
| A20 | LEDGER 含 `NODE_REPORT-DEV-026` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A21 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT（含确认 `DECISIONS.md` 已提交）→ commit → 发 NODE_REPORT → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A21。
