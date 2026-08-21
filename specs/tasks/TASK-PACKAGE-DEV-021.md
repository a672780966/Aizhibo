# TASK PACKAGE — DEV-021

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-021 |
| Node Name | Scene Renderer |
| Milestone | M2 — Presentation Complete（第二个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-020（DONE，`verdict_ref: "0101"`） |
| Commander | Claude |
| Executor | Codex（协议角色名 `OPENCODE`） |

### 本节点包含一次对 DEV-009 已冻结接口的正式 Change Request——不是追加，是有理由的修改

`DAG.md` 全局约束 #4："节点 PASS 后接口冻结；下游只能提 Change Request / FIX Package。"
本节点需要给已冻结的 `machine.ts` 的 `onSceneEnter` action 发一次窄范围 CR（第 2.2 节），
这是继 DEV-007/010/011/012 四次**纯追加**扩展之后，第一次对既有 action **内部逻辑**的
授权修改。已逐一核对现有测试（`machine.test.ts`/`presentationCommand.test.ts`/
`storyRegion.test.ts`/`snapshot.test.ts`）里所有引用 `'SCENE_ENTER'` 字符串的断言，
**全部只检查 `kind`/`storyPhase` 是否等于该字符串，不依赖完整 payload 形状**——因此这次 CR
不需要改动任何既有测试文件，向后兼容。

---

## 2. 架构设计（Commander 已核对真实代码与真实 fixture 数据后做出的决策）

### 2.1 Dev Spec 原文与 Renderer 的"不维护剧情"原则

第 65 节原文只有"背景/前景/Layers"。第 35 节的硬约束（"Renderer 不维护剧情"）意味着：
`apps/renderer` **不能**自己读章节文件、自己查 `visualSceneId → VisualScene → layers →
ImageAsset.file` 这条解析链——那是剧情/内容知识，必须由 Runtime 解析好，通过
`PresentationCommand` 原样交给 Renderer 渲染。已核对：

- `packages/chapter-schema/src/visuals.ts`：`VisualScene { id, layers: VisualLayer[]
  (assetId, z, parallax?) }`；`ImageAsset { id, file }`。
- `packages/chapter-compiler`：两者与 `CharacterAsset` 混在同一个 `visuals` 集合里
  （`schemaResult.visuals.passed`），用 `'layers' in value` / `'file' in value` 结构
  区分。
- 真实 fixture（`valid-minimal/visuals/vs-start.json` + `img-forest.json`）确认：
  `scene-start.visualSceneId = 'vs-start'` → `vs-start.layers = [{assetId:'img-forest',
  z:0}]` → `img-forest.file = 'assets/img/forest.png'`。

因此 Runtime（`machine.ts` 的 `onSceneEnter`，本来就持有 `context.compiled`）是解析这条链
的唯一正确位置。

### 2.2 CR：`onSceneEnter` 的 `SCENE_ENTER` 命令载荷从占位丰富为真实数据

**现状**（`machine.ts`，DEV-009 冻结，本节点唯一授权修改的一处）：

```typescript
onSceneEnter: assign(({ context }) => {
  context.ports.presentation.send({ kind: 'SCENE_ENTER', sceneId: context.currentSceneId });
  context.ports.audio.send({ kind: 'SCENE_ENTER', sceneId: context.currentSceneId });
  return storyMove(context, 'SCENE_ENTER', 'STORY.SCENE_READY', {
    sceneId: context.currentSceneId,
  });
}),
```

**授权改为**（**只改这一个 action 的这一处调用**，`audio.send` 那一行、`storyMove` 返回值、
其余全部 action 一律不动）：

```typescript
onSceneEnter: assign(({ context }) => {
  const scene =
    context.compiled !== null ? currentScene(context.compiled, context.currentSceneId) : undefined;
  const layers =
    context.compiled !== null && scene !== undefined
      ? resolveVisualLayers(context.compiled, scene.visualSceneId)
      : [];
  context.ports.presentation.send({
    kind: 'SCENE_ENTER',
    sceneId: context.currentSceneId,
    visualSceneId: scene?.visualSceneId,
    layers,
  });
  context.ports.audio.send({ kind: 'SCENE_ENTER', sceneId: context.currentSceneId });
  return storyMove(context, 'SCENE_ENTER', 'STORY.SCENE_READY', {
    sceneId: context.currentSceneId,
  });
}),
```

`resolveVisualLayers`（新增纯函数，新文件 `visualResolution.ts`，见第 2.3 节）承担全部解析
逻辑，`onSceneEnter` 本身只多了三行调用代码。**验收时会逐行核对 `machine.ts` 的 git diff
只涉及这一个 action 内部，其余全部内容（其它 action、guards、`RootEvent`、
`RuntimeContext` 等）必须逐字节不变。**

### 2.3 `resolveVisualLayers`——新增纯函数（新文件，追加式）

```typescript
export interface ResolvedVisualLayer {
  assetId: string;
  file: string;
  z: number;
  parallax?: number;
}

export function resolveVisualLayers(
  compiled: CompileResult,
  visualSceneId: string,
): ResolvedVisualLayer[]
```

实现：在 `compiled.schemaResult.visuals.passed` 里找 `id === visualSceneId` 且
`'layers' in value` 的条目（`VisualScene`）；对它的每个 `layer`，再找
`id === layer.assetId` 且 `'file' in value` 的条目（`ImageAsset`），组装成
`ResolvedVisualLayer`。**防御性处理**（PASS2 引用完整性理论上已保证这些引用有效，但仍要
写防御）：找不到 `VisualScene` 本身返回 `[]`；某个 `layer` 找不到对应 `ImageAsset` 时跳过
该层（不抛异常，不中断其余层的渲染）。

### 2.4 Renderer 侧：布局合成 + 渲染

```typescript
// apps/renderer/src/render/composeLayers.ts
export interface RenderableLayer {
  assetId: string;
  file: string;
  zIndex: number;
  parallax?: number;
}
export function composeLayers(layers: ResolvedVisualLayer[]): RenderableLayer[]
```

纯函数：按 `z` 升序排序（底层先渲染），透传 `assetId`/`file`/`parallax`。**不做真实视差
动画计算**（parallax 数值原样传递，真正的镜头/视差运动是 DEV-026 Camera/Transition 的
职责，本节点只保证数据不丢）。

`App.tsx` 延续 DEV-020 已有的调试列表，追加：收到 `kind === 'SCENE_ENTER'` 的命令时，取出
`layers` 字段，跑 `composeLayers`，渲染成一组按 `zIndex` 定位的 `<img>`（`src={file}`）。
**已知诚实缺口**：`file` 是 Chapter Pack 内相对路径（如 `assets/img/forest.png`），
目前没有任何静态资源服务器把它变成可加载的 URL（那是 DEV-075 Chapter Packager / 部署管线
的职责）——图片在当前阶段加载不出来是预期行为，本节点验证的是**布局与命令数据的正确性**，
不是"图片真的显示出来"，如实记入 `DECISIONS.md`，不假装解决了资源服务问题。

---

## 3. Scope

### Writable Scope — `packages/runtime-kernel`，一处窄范围 CR + 追加

```
packages/runtime-kernel/src/machine.ts        （仅第 2.2 节描述的 onSceneEnter 内部改动，
                                                 其余内容逐字节不变）
packages/runtime-kernel/src/visualResolution.ts   （新增）
packages/runtime-kernel/src/visualResolution.test.ts（新增）
packages/runtime-kernel/src/index.ts          （仅追加导出）
```

### Writable Scope — `apps/renderer`，新增文件

```
apps/renderer/src/render/composeLayers.ts
apps/renderer/src/render/composeLayers.test.ts
```

### Writable Scope — `apps/renderer`，仅追加式扩展既有文件

```
apps/renderer/src/App.tsx   （追加场景层渲染，不删除既有调试列表/HELLO 逻辑）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-021/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/runtime-kernel/src/ 下除 machine.ts（唯一授权改动）/visualResolution.*（新增）/
  index.ts（仅追加）外的全部既有文件（含 machine.test.ts——已核实无需修改，仍是 Read-only，
  不得为了"方便"顺手改它）
packages/runtime-kernel/package.json、tsconfig.json
packages/chapter-schema/**、packages/chapter-compiler/**（含 test-fixtures/**）、
  packages/rule-engine/**、packages/dice-engine/**、packages/narrative-composer/**、
  packages/persistence/**、packages/shared/**
apps/renderer/src/ws/**、apps/renderer/src/server/**、apps/renderer/src/main.tsx、
  apps/renderer/package.json、tsconfig.json、vite.config.ts、index.html——DEV-020 冻结
根 tsconfig.json、tsconfig.base.json、vitest.config.ts、eslint.config.js、根 package.json
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
```

### Forbidden Scope

```
packages/* 除 runtime-kernel（限定文件）外的任何目录
apps/* 除 renderer（限定文件）外的任何目录
apps/renderer 内 DEV-020 冻结的 ws/server/main.tsx/配置文件
对 machine.ts 中 onSceneEnter 以外任何 action/guard 的修改
任何根级配置文件的修改
真实的角色渲染（DEV-022）、字幕（DEV-023）、选择 UI（DEV-024）、骰子 UI（DEV-025）、
  镜头/视差动画（DEV-026）
真实静态资源服务器/CDN 接入
新增任何 npm 依赖
```

---

## 4. Required Skills

### Required

- 阅读/窄范围修改一个已冻结 XState action 的内部实现，不触及其余机器结构
- 纯函数式的数据解析（从编译产物里查两跳引用）与布局排序

### Forbidden / Unnecessary

- 任何图片加载/预加载库、CSS-in-JS 框架
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `currentScene`（`storyRegion.ts`，已冻结导出） | 从 `compiled`+`currentSceneId` 取 `SceneNode` |
| `CompileResult.schemaResult.visuals`（`chapter-compiler`，已冻结） | `VisualScene`/`ImageAsset` 数据来源 |
| `packages/chapter-compiler/test-fixtures/valid-minimal`（Read-only 引用） | 端到端测试素材（`vs-start`→`img-forest`已核实存在） |
| `PresentationCommand`（`runtime-kernel`，DEV-012 冻结） | Renderer 侧类型 |

---

## 6. Outputs

1. `resolveVisualLayers`/`ResolvedVisualLayer`（`visualResolution.ts`）
2. `onSceneEnter` 的 `SCENE_ENTER` 命令载荷丰富为 `{kind, sceneId, visualSceneId, layers}`
3. `composeLayers`/`RenderableLayer`（`apps/renderer`）
4. `App.tsx` 新增场景层渲染
5. `specs/dev/DEV-021/DECISIONS.md`，记录：CR 理由与向后兼容性核实结果、
   "图片暂时加载不出来"已知缺口、parallax 数值透传但不做动画的理由

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-021/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Acceptance**：四文件存在；`INDEX.md` 含 Task Order T001–T007。

---

### T002 — `resolveVisualLayers`

- **Allowed Files**：`packages/runtime-kernel/src/visualResolution.ts`、`visualResolution.test.ts`
- **Requirements**：按第 2.3 节实现。
- **Acceptance**：对 `valid-minimal` 编译产物调用 `resolveVisualLayers(compiled, 'vs-start')`
  返回 `[{assetId:'img-forest', file:'assets/img/forest.png', z:0}]`；不存在的
  `visualSceneId` 返回 `[]`；手写一个"引用不存在 assetId"的编译产物用例验证跳过而不抛异常。

---

### T003 — `machine.ts` CR

- **Allowed Files**：`packages/runtime-kernel/src/machine.ts`（**仅第 2.2 节描述的一处**）
- **Requirements**：按第 2.2 节精确实施。
- **Acceptance**：
  - `git diff` 只显示 `onSceneEnter` 这一个 action 内部的改动（新增 `scene`/`layers`
    两个局部变量 + `presentation.send` 调用参数变化），其余全部代码逐字节不变。
  - 端到端：`createRuntimeMachine` 驱动 `valid-minimal` 到 `SCENE_ENTER`，捕获的
    presentation 命令 `kind==='SCENE_ENTER'` 且含 `visualSceneId:'vs-start'`、
    `layers` 与 T002 的返回值一致。
  - 既有 `machine.test.ts`（未改动）全部测试仍然通过（回归验证，非本 Task 的修改对象）。

---

### T004 — `index.ts` 追加导出

- **Allowed Files**：`packages/runtime-kernel/src/index.ts`（**仅追加**）
- **Requirements**：追加导出 `resolveVisualLayers`，类型 `ResolvedVisualLayer`。
- **Acceptance**：`git diff` 只有新增行；符号可从包外导入。

---

### T005 — `composeLayers`

- **Allowed Files**：`apps/renderer/src/render/composeLayers.ts`、`composeLayers.test.ts`
- **Requirements**：按第 2.4 节实现。
- **Acceptance**：多层按 `z` 升序排序正确（含 `z` 相同/负数等边界）；`parallax` 字段原样透传，未提供时不出现在结果对象里（`exactOptionalPropertyTypes` 一致性）。

---

### T006 — `App.tsx` 场景层渲染

- **Allowed Files**：`apps/renderer/src/App.tsx`（**仅追加**，不删除既有调试列表/HELLO 相关代码）
- **Requirements**：按第 2.4 节，收到 `kind==='SCENE_ENTER'` 命令时用 `composeLayers` 渲染
  一组定位的 `<img>`，与既有的 `<pre>` 调试 JSON 并存。
- **Acceptance**：手动核查渲染逻辑正确调用 `composeLayers`（可通过抽出一个纯函数
  `pickSceneLayers(commands): RenderableLayer[]` 之类的辅助函数配测试来验证，不要求
  DOM 渲染测试，与 DEV-020 先例一致）。

---

### T007 — 全量验证、REPORT 与 commit

- **Allowed Files**：`specs/dev/DEV-021/INDEX.md`、`REPORT.md`、`DECISIONS.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-021.md`
- **Requirements**：
  1. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  2. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  3. **`DECISIONS.md` 必须已提交**，覆盖第 6 节列出的全部要点。
  4. 更新 `INDEX.md`：T001–T007 全部勾选。
  5. `git add -A && git commit`，提交信息首行：`DEV-021: scene renderer`。
  6. 追加 LEDGER 行，发 `NODE_REPORT`。
  7. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`REPORT.md` 引用的全部文档已入库；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-021 INDEX

Status: IN_PROGRESS

## Current Node

DEV-021 — Scene Renderer

## Objective

给已冻结的 `onSceneEnter` action 发一次窄范围 CR，丰富 `SCENE_ENTER` 命令载荷为真实的
`visualSceneId`+`layers`（解析自编译产物，不在 Renderer 侧读章节文件）；`apps/renderer`
按 `z` 排序渲染这些层。不做真实图片加载、角色/字幕/选择/骰子渲染。

## Allowed Scope（runtime-kernel：CR + 新增 + 追加）
（抄录 Task Package 第 3 节实际条目——machine.ts 只改 onSceneEnter 一处）

## Allowed Scope（apps/renderer：新增 + 仅追加）
（抄录 Task Package 第 3 节实际条目）

## Read-only Scope
（抄录 Task Package 第 3 节实际条目）

## Forbidden Scope
（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 resolveVisualLayers
- [ ] T003 machine.ts CR
- [ ] T004 index.ts 追加导出
- [ ] T005 composeLayers
- [ ] T006 App.tsx 场景层渲染
- [ ] T007 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001（每完成一个 Task 立即勾选并更新本字段）

## Exit Criteria

六条命令全部退出码 0；`machine.ts` 的 git diff 精确限定在 `onSceneEnter` 一处；端到端
`valid-minimal` 验证 `SCENE_ENTER` 命令含正确 `visualSceneId`/`layers`；既有
`machine.test.ts` 零回归；`DECISIONS.md` 已入库；REPORT.md 完成且
Status = READY_FOR_REVIEW；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **`machine.ts` 只能改 `onSceneEnter` 一处**，其余全部内容（其它 action、guards、
   `RootEvent`、`RuntimeContext`、`makeRuntimeMachine` 结构）逐字节不变，git diff 会被
   逐行核对。
2. **`index.ts` 仅追加**；`App.tsx` 仅追加，不删除 DEV-020 既有逻辑。
3. **不修改 `apps/renderer` 的 DEV-020 冻结文件**（`ws/`、`server/`、`main.tsx`、配置文件）。
4. **不新增任何 npm 依赖**。
5. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
6. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现真实静态资源服务（图片加载不出来是预期行为，见第 2.4 节已知缺口）。
- 不实现角色渲染（DEV-022）、字幕/对话框（DEV-023）、选择 UI（DEV-024）、骰子 UI
  （DEV-025）、镜头/视差动画（DEV-026）。
- 不做 DOM 渲染测试（沿用 DEV-020 先例，测试聚焦纯函数/协议层）。
- 不修改 `machine.test.ts`（已核实无需修改，保持 Read-only）。
- 不处理场景切换时的过渡动画/淡入淡出。

---

## 11. Tests

### Unit tests

T002、T005：覆盖第 7 节描述的具体行为。

### Integration tests

T003：端到端驱动真实 actor 验证 CR 后的命令载荷。

### Regression tests

`pnpm test` 覆盖全 workspace；既有全部包测试零回归（含未改动的 `machine.test.ts`）。

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
| A07 | `resolveVisualLayers` 对真实 `valid-minimal` 数据返回正确结果，缺失引用防御性跳过 | 测试检查 |
| A08 | `machine.ts` 的 git diff 精确限定在 `onSceneEnter` 一处 | git diff 逐行比对 |
| A09 | 端到端：`SCENE_ENTER` 命令含正确 `visualSceneId`/`layers` | 测试检查 |
| A10 | `machine.test.ts` 未被修改且全部测试通过 | git diff + 命令输出 |
| A11 | `composeLayers` 按 `z` 正确排序，`parallax` 透传语义正确 | 测试检查 |
| A12 | `App.tsx` 的 git diff 只有新增，DEV-020 既有 HELLO/调试列表逻辑保留 | git diff 比对 |
| A13 | `apps/renderer` 的 DEV-020 冻结文件（ws/server/main.tsx/配置）未被修改 | git diff 比对 |
| A14 | `packages/**`（除 runtime-kernel 限定文件外）全部未被修改 | git diff 比对 |
| A15 | 未新增任何 npm 依赖 | 文件检查 |
| A16 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A17 | `specs/dev/DEV-021/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T007 全部勾选 | 文件 + 文本检查 |
| A18 | `git log` 新增恰 1 条提交，首行 `DEV-021: scene renderer`；提交时 `git status --porcelain` 为空 | 命令 |
| A19 | LEDGER 含 `NODE_REPORT-DEV-021` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A20 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT（含确认 `DECISIONS.md` 已提交）→ commit → 发 NODE_REPORT → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A20。
