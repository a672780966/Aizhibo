# TASK PACKAGE — DEV-027

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-027 |
| Node Name | BGM / SFX |
| Milestone | M2 — Presentation Complete（第八个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-026（DONE，`verdict_ref: "0128"`） |
| Commander | Claude |
| Executor | Codex（协议角色名 `OPENCODE`） |

### 本节点是第五次对 `onSceneEnter` 发窄范围 CR——且不碰既有的 `Ports.audio`

延续 DEV-021/022/023/026 建立的模式，第五次给 `onSceneEnter` 的 `SCENE_ENTER`
**Presentation** 命令追加一个字段（`audio`）。**本节点刻意不修改 `onSceneEnter` 里
既有的 `context.ports.audio.send({kind:'SCENE_ENTER', sceneId})` 调用**——理由见
第 2.1 节。

### 关键架构决策：BGM/SFX 走已有的 Presentation 通道，不新建 Audio 传输

`runtime-kernel` 从 DEV-009 起就有独立的 `Ports.audio`（区别于 `Ports.presentation`），
是为了给 DEV-032（Audio State Region，M3，**尚未建**）未来做"声道占用仲裁"
（CR-005：Story Audio 与 Host Audio 的抢占关系）留出真正的架构位置。但**目前**
`Ports.audio` 完全没有真实传输（`apps/renderer` 只给 `Ports.presentation` 接了
WebSocket，`Ports.audio` 至今仍是 no-op）。

给 `Ports.audio` 现在就接一条独立 WebSocket 通道，本质是在 DEV-032 真正设计"声道
仲裁"之前抢先搭一套很可能被推翻重做的传输层——过度设计。**本节点的处置**：BGM/SFX
是纯"进场景就放对应音效"的简单需求，不涉及任何声道抢占/打断逻辑，走**已经在工作、
已经测试过**的 Presentation WebSocket 通道即可（Renderer 本来就是网页，`<audio>`
标签放在同一个页面里）。`Ports.audio` 保持原样不动，留给 DEV-032 未来真正需要声道
仲裁时再决定怎么建。这个决策记入 `DECISIONS.md`，不是遗漏。

---

## 2. 架构设计（Commander 已核对真实代码与真实 fixture 数据后做出的决策）

### 2.1 CR：`onSceneEnter` 的 **Presentation** `send` 追加 `audio` 字段

**现状**（DEV-026 已冻结，`SCENE_ENTER` 载荷含 `sceneId`/`visualSceneId`/`layers`/
`characters`/`narration`/`cameraPreset`）：

**授权改为**（**只新增这一个字段**，既有六个字段的计算与紧随其后的
`context.ports.audio.send({kind:'SCENE_ENTER', sceneId})`（不同的、独立的、本节点
不碰的一行）逐字节不变）：

```typescript
context.ports.presentation.send({
  kind: 'SCENE_ENTER',
  sceneId: context.currentSceneId,
  visualSceneId: scene?.visualSceneId,
  layers,
  characters,
  narration: scene?.narration ?? [],
  cameraPreset: ...,
  audio:
    context.compiled !== null && scene !== undefined
      ? resolveSceneAudio(context.compiled, scene)
      : { ambience: [] },
});
context.ports.audio.send({ kind: 'SCENE_ENTER', sceneId: context.currentSceneId });
```

**验收时逐行核对**：`git diff` 只在 `onSceneEnter` 的 **presentation** `send` 调用里
新增 `audio` 一行，紧随其后的 `audio.send(...)` 那一行、既有六个字段的计算、其余全部
action 逐字节不变。

### 2.2 `resolveSceneAudio`——新增纯函数（新文件，追加式）

已核对 `chapter-schema/audio.ts`（`AudioAsset` 判别联合：`{id, kind, loop?, gain?,
source:'PREPRODUCED'|'PREGENERATED', file}` 或 `{..., source:'RUNTIME_TTS',
ttsSpec}`）与真实 fixture（`scene-start.bgm='bgm-main'` → `audio/bgm-main.json`
`{kind:'BGM', source:'PREPRODUCED', file:'assets/audio/bgm-main.mp3'}`；
`scene-start.ambience=['amb-forest']` → `audio/amb-forest.json`）。

```typescript
export interface ResolvedAudio {
  id: string;
  file: string;
  loop?: boolean;
  gain?: number;
}

export function resolveSceneAudio(
  compiled: CompileResult,
  scene: SceneNode,
): { bgm?: ResolvedAudio; ambience: ResolvedAudio[] }
```

对 `scene.bgm`（若存在）与 `scene.ambience` 数组的每个 id，在
`compiled.schemaResult.audio.passed` 里找 `id === <目标id>` 的 `AudioAsset`。
**防御性处理**：找不到条目、或条目是 `source==='RUNTIME_TTS'`（没有 `file`，是
DEV-034+ TTS 管线的资产，本节点不处理语音）——一律跳过（`bgm` 场景下整个字段省略，
`ambience` 场景下从数组剔除），不抛异常。`loop`/`gain` 原样透传（可能是
`undefined`）。

### 2.3 Renderer 侧：`<audio>` 标签播放，BGM/环境音默认循环

```typescript
// apps/renderer/src/render/pickSceneAudio.ts
export function pickSceneAudio(
  commands: PresentationCommand[],
): { bgm?: ResolvedAudio; ambience: ResolvedAudio[] }
```

取最近一条 `SCENE_ENTER` 命令的 `audio` 字段，没有则返回 `{ambience: []}`。

`App.tsx`：为 `bgm`（若存在）与每条 `ambience` 渲染一个 `<audio autoPlay>` 元素，
`key={resolved.id}`（同一 `id` 跨场景不重复播放/重启，不同 `id` 触发浏览器挂载新
`<audio>` 元素从头播放）；`loop` 属性用 `resolved.loop ?? true`（**BGM/环境音默认
循环播放**——这是 Renderer 侧合理的产品默认值，不是编造数据：`loop` 字段本身
optional，绝大多数 BGM/环境音场景下作者期望循环，作者显式设 `loop: false` 时仍会被
尊重）；`volume` 用 `resolved.gain ?? 1`（夹到 `[0,1]`，`gain` 若提供了超范围数值需
clamp，防御性处理）。

**已知边界，如实记录**：不处理 SFX 一次性音效（Dev Spec 原文"BGM / SFX"里的 SFX 是
互动/事件触发的短音效，如骰子音效、UI 反馈音——这些目前没有任何 `RuntimeEvent`/
`PresentationCommand` 携带"现在该放哪个 SFX"的信号，本节点只做场景级的 BGM/环境音
（`SceneNode.bgm`/`ambience`，有真实 schema 字段支撑），真正的事件触发型 SFX 留给
未来需要时再设计（大概率是另一次 CR，例如给 `DICE_INTRO`/`DICE_RESULT` 或
`INTERACTION_OPEN` 等既有命令附加音效 id）。

---

## 3. Scope

### Writable Scope — `packages/runtime-kernel`，一处窄范围 CR + 追加

```
packages/runtime-kernel/src/machine.ts        （仅第 2.1 节描述的 onSceneEnter 内新增
                                                 一行，其余内容——含历次 CR 遗留代码、
                                                 紧随其后的 audio.send 调用——逐字节不变）
packages/runtime-kernel/src/audioResolution.ts       （新增）
packages/runtime-kernel/src/audioResolution.test.ts  （新增）
packages/runtime-kernel/src/index.ts          （仅追加导出）
```

### Writable Scope — `apps/renderer`，新增文件

```
apps/renderer/src/render/pickSceneAudio.ts
apps/renderer/src/render/pickSceneAudio.test.ts
```

### Writable Scope — `apps/renderer`，仅追加式扩展既有文件

```
apps/renderer/src/App.tsx   （追加 <audio> 元素渲染，不删除既有场景层/角色/对话框/
                               选项/骰子/镜头转场/调试列表/HELLO 逻辑）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-027/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/runtime-kernel/src/ 下除 machine.ts（唯一授权改动）/audioResolution.*（新增）/
  index.ts（仅追加）外的全部既有文件（含 machine.test.ts、visualResolution.*、
  characterResolution.*、choiceResolution.*、cameraResolution.*、interactionRegion.*、
  audioRegion.*、ports.ts——本节点不改 `Ports.audio` 任何接口/实现）
packages/runtime-kernel/package.json、tsconfig.json
packages/chapter-schema/**、packages/chapter-compiler/**（含 test-fixtures/**）、
  packages/rule-engine/**、packages/dice-engine/**、packages/narrative-composer/**、
  packages/persistence/**、packages/shared/**
apps/renderer/src/ws/**、apps/renderer/src/server/**、apps/renderer/src/main.tsx、
  apps/renderer/src/render/composeLayers.*、composeCharacters.*、pickDialogueLines.*、
  lineIndex.*、pickInteractionOpen.*、pickDiceState.*、cameraPreset.*、pickSceneMeta.*、
  apps/renderer/package.json、tsconfig.json、vite.config.ts、index.html——DEV-020～026 冻结
根 tsconfig.json、tsconfig.base.json、vitest.config.ts、eslint.config.js、根 package.json
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
```

### Forbidden Scope

```
packages/* 除 runtime-kernel（限定文件）外的任何目录
apps/* 除 renderer（限定文件）外的任何目录
apps/renderer 内 DEV-020～026 冻结的文件
对 machine.ts 中 onSceneEnter 以外任何 action/guard 的修改；对 onSceneEnter 内既有代码
  （含 `context.ports.audio.send(...)` 那一行）的任何改动
`packages/runtime-kernel/src/ports.ts`/`audioRegion.ts` 的任何修改（不给 Ports.audio
  新建传输，见第 1 节理由）
给 `apps/renderer` 新建独立的 Audio WebSocket 通道/服务端半
实现事件触发型 SFX（骰子音效等，见 2.3 节已知边界）
任何根级配置文件的修改
新增任何 npm 依赖
```

---

## 4. Required Skills

### Required

- 窄范围修改一个已被连续五次 CR 过的 XState action，精确控制 diff 边界
- HTML5 `<audio>` 元素（`autoPlay`/`loop`/`volume`），无需音频处理库

### Forbidden / Unnecessary

- Web Audio API、任何音频混音/特效库——纯 `<audio>` 标签足够
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `SceneNode.bgm`/`ambience`（已冻结） | 音频引用来源 |
| `AudioAsset`（`chapter-schema`，已冻结） | 音频文件解析 |
| `packages/chapter-compiler/test-fixtures/valid-minimal`（Read-only 引用） | 端到端测试素材（`scene-start`→`bgm-main`+`amb-forest`，均已核实存在） |

---

## 6. Outputs

1. `resolveSceneAudio`/`ResolvedAudio`（`audioResolution.ts`）
2. `onSceneEnter` 的 `SCENE_ENTER`（Presentation）命令载荷追加 `audio` 字段
3. `pickSceneAudio`（`apps/renderer`）
4. `App.tsx` 新增 `<audio>` 播放渲染
5. `specs/dev/DEV-027/DECISIONS.md`，记录：为何走 Presentation 通道而不给
   `Ports.audio` 建独立传输、`loop` 默认循环的产品默认值理由、SFX 已知边界

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-027/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Acceptance**：四文件存在；`INDEX.md` 含 Task Order T001–T007。

---

### T002 — `resolveSceneAudio`

- **Allowed Files**：`packages/runtime-kernel/src/audioResolution.ts`、`audioResolution.test.ts`
- **Requirements**：按第 2.2 节实现。
- **Acceptance**：对 `valid-minimal` 的 `scene-start` 返回
  `bgm: {id:'bgm-main', file:'assets/audio/bgm-main.mp3'}`、
  `ambience: [{id:'amb-forest', file:'...'}]`；手写一个引用 `RUNTIME_TTS` 类型资产
  的用例验证防御性跳过；`scene.bgm` 未定义时结果不含 `bgm` 字段。

---

### T003 — `machine.ts` CR

- **Allowed Files**：`packages/runtime-kernel/src/machine.ts`（**仅第 2.1 节描述的一行新增**）
- **Requirements**：按第 2.1 节精确实施。
- **Acceptance**：
  - `git diff` 只显示 `onSceneEnter` 的 **presentation** `send` 调用新增 `audio`
    一行，紧随其后的 `audio.send(...)` 一行与既有六个字段计算、其余全部 action 逐
    字节不变。
  - 端到端：`createRuntimeMachine` 驱动 `valid-minimal` 到 `SCENE_ENTER`，捕获的
    presentation 命令含正确 `audio.bgm`/`audio.ambience`。
  - 既有 `machine.test.ts`（未改动）全部测试仍然通过。

---

### T004 — `index.ts` 追加导出

- **Allowed Files**：`packages/runtime-kernel/src/index.ts`（**仅追加**）
- **Requirements**：追加导出 `resolveSceneAudio`，类型 `ResolvedAudio`。
- **Acceptance**：`git diff` 只有新增行；符号可从包外导入。

---

### T005 — `pickSceneAudio`

- **Allowed Files**：`apps/renderer/src/render/pickSceneAudio.ts`、`.test.ts`
- **Requirements**：按第 2.3 节实现。
- **Acceptance**：无命令/有命令（含无 `bgm` 只有 `ambience`）情形均正确返回。

---

### T006 — `App.tsx` 音频渲染

- **Allowed Files**：`apps/renderer/src/App.tsx`（**仅追加**，不删除既有逻辑）
- **Requirements**：按第 2.3 节，渲染 `<audio autoPlay loop volume>` 元素。
- **Acceptance**：手动核查渲染逻辑正确调用 `pickSceneAudio`，`loop`/`volume` 默认值/clamp 正确（不要求 DOM 渲染测试，沿用先例）。

---

### T007 — 全量验证、REPORT 与 commit

- **Allowed Files**：`specs/dev/DEV-027/INDEX.md`、`REPORT.md`、`DECISIONS.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-027.md`
- **Requirements**：
  1. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  2. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  3. **`DECISIONS.md` 必须已提交**，覆盖第 6 节列出的全部要点。
  4. 更新 `INDEX.md`：T001–T007 全部勾选，**且把文件顶部的 `Status:` 一行从
     `IN_PROGRESS` 改为 `READY_FOR_REVIEW`**。
  5. `git add -A && git commit`，提交信息首行：`DEV-027: bgm sfx`。
  6. 追加 LEDGER 行，发 `NODE_REPORT`。
  7. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`REPORT.md` 引用的全部文档已入库；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-027 INDEX

Status: IN_PROGRESS

## Current Node

DEV-027 — BGM / SFX

## Objective

第五次对 `onSceneEnter` 发窄范围 CR（仅 Presentation `send`），追加 `audio` 字段
（场景级 BGM + 环境音，解析自 `AudioAsset`）。**不碰既有的 `Ports.audio`**——真正的
声道仲裁传输留给 DEV-032（M3）。`apps/renderer` 用 `<audio>` 标签播放，BGM/环境音
默认循环。不实现事件触发型 SFX（无 schema/信号支撑）。

## Allowed Scope（runtime-kernel：CR + 新增 + 追加）
（抄录 Task Package 第 3 节实际条目——machine.ts 只在 onSceneEnter 的 presentation
send 内新增一行）

## Allowed Scope（apps/renderer：新增 + 仅追加）
（抄录 Task Package 第 3 节实际条目）

## Read-only Scope
（抄录 Task Package 第 3 节实际条目）

## Forbidden Scope
（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 resolveSceneAudio
- [ ] T003 machine.ts CR
- [ ] T004 index.ts 追加导出
- [ ] T005 pickSceneAudio
- [ ] T006 App.tsx 音频渲染
- [ ] T007 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001（每完成一个 Task 立即勾选并更新本字段）

## Exit Criteria

六条命令全部退出码 0；`machine.ts` 的 git diff 精确限定在一行新增；端到端验证
`SCENE_ENTER` 含正确 `audio`；既有 `machine.test.ts` 零回归；`DECISIONS.md` 已入库；
REPORT.md 完成且 Status = READY_FOR_REVIEW；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定——**PASS 后 M2 只剩 DEV-028
（Presentation Command Bus）**。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **`machine.ts` 只能在 `onSceneEnter` 的 presentation `send` 调用里新增一行**，
   紧随其后的 `audio.send(...)` 与其余全部内容逐字节不变。
2. **不修改 `ports.ts`/`audioRegion.ts`**（不给 `Ports.audio` 建传输，第 1 节已说明理由）。
3. **不修改 `index.ts` 之外的其它冻结文件**；`App.tsx` 仅追加。
4. **不实现事件触发型 SFX**（第 2.3 节已说明理由）。
5. **不新增任何 npm 依赖**。
6. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
7. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不给 `Ports.audio` 建独立传输/WebSocket 通道（留给 DEV-032 真正需要声道仲裁时再建）。
- 不实现事件触发型 SFX（骰子音效、UI 反馈音等，无 schema/信号支撑）。
- 不实现 TTS/语音朗读（`AudioAsset.source==='RUNTIME_TTS'`，DEV-034+ 的职责）。
- 不实现声道占用仲裁/打断逻辑（CR-005，DEV-032）。
- 不处理浏览器自动播放策略兼容性（OBS Browser Source 环境通常允许音频自动播放）。
- 不做 DOM 渲染测试（沿用先例）。
- 不修改 `machine.test.ts`/`visualResolution.*`/`characterResolution.*`/
  `choiceResolution.*`/`cameraResolution.*`/`interactionRegion.*`/`audioRegion.*`/
  `ports.ts`。

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
| A07 | `resolveSceneAudio` 对真实 `valid-minimal` 数据、`RUNTIME_TTS` 防御性跳过、无 `bgm` 情形均正确 | 测试检查 |
| A08 | `machine.ts` 的 git diff 精确限定在一行新增，`audio.send(...)` 未受影响 | git diff 逐行比对 |
| A09 | 端到端：`SCENE_ENTER`（presentation）命令含正确 `audio` | 测试检查 |
| A10 | `machine.test.ts` 未被修改且全部测试通过 | git diff + 命令输出 |
| A11 | `pickSceneAudio` 对无/有命令情形正确返回 | 测试检查 |
| A12 | `App.tsx` 的 git diff 只有新增，DEV-020～026 既有逻辑保留 | git diff 比对 |
| A13 | `apps/renderer` 的 DEV-020～026 冻结文件未被修改 | git diff 比对 |
| A14 | `ports.ts`/`audioRegion.ts` 未被修改 | git diff 比对 |
| A15 | `packages/**`（除 runtime-kernel 限定文件外）全部未被修改 | git diff 比对 |
| A16 | 未新增任何 npm 依赖 | 文件检查 |
| A17 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A18 | `specs/dev/DEV-027/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T007 全部勾选，`Status:` 表头改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A19 | `git log` 新增恰 1 条提交，首行 `DEV-027: bgm sfx`；提交时 `git status --porcelain` 为空 | 命令 |
| A20 | LEDGER 含 `NODE_REPORT-DEV-027` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A21 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT（含确认 `DECISIONS.md` 已提交）→ commit → 发 NODE_REPORT → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A21。
