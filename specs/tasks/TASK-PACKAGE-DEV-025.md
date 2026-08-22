# TASK PACKAGE — DEV-025

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-025 |
| Node Name | Dice UI |
| Milestone | M2 — Presentation Complete（第六个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-024（DONE，`verdict_ref: "0116"`） |
| Commander | Claude |
| Executor | Codex（协议角色名 `OPENCODE`） |

### 本节点包含两处窄范围 CR——`onLock`（首次）与 `onResolve`（首次），都在 INTERACTION region

Dev Spec 第 65 节要求 Dice UI 必须实现 `INTRO / LOOP / RESOLVE` 三阶段。已核对
`machine.ts`：`onLock`（`LOCKING` 转移）与 `onResolve`（`LOCKED` 转移，真正掷骰与结算
的地方）目前都**不发送任何 Presentation 命令**——`DICE.REQUESTED`/`ROLLED`/
`PUBLISHED` 只写进 `RuntimeEvent` 日志，从不转发给 Presentation。本节点是第一次让
Dice 数据流向 Renderer。

### 关键约束：真实的节奏控制不在本节点——LOOP 是纯展示动画

已核对 `DAG.md`："DEV-037 Dice Buffer Controller——重定位为节奏控制器 + 延迟安全阀，
常态按 `targetDiceMs` 走叙事节奏"（M3，尚未建）。当前 `onResolve` 的掷骰计算是**同步
瞬间完成**的，没有真实的"骰子在滚动中"这段时间。本节点的 `LOOP` 阶段是 Renderer 本地
用固定时长播放的纯展示动画（收到结果后倒着演一段"正在摇"的效果再揭晓），**不是**在
等待真实计算——真正把"摇骰子的观感时长"接入叙事节奏是 DEV-037 的职责，本节点不越权
实现。

---

## 2. 架构设计（Commander 已核对真实代码后做出的决策）

### 2.1 CR #1：`onLock` 追加 `DICE_INTRO` 信号

**现状**（`machine.ts`）：

```typescript
onLock: assign(({ context }) => interactionMove(context, 'LOCKING', 'INTERACTION.LOCKING')),
```

**授权改为**：

```typescript
onLock: assign(({ context }) => {
  context.ports.presentation.send({ kind: 'DICE_INTRO' });
  return interactionMove(context, 'LOCKING', 'INTERACTION.LOCKING');
}),
```

`DICE_INTRO` 是纯信号，无需携带数据（投票已锁定，具体摇几颗骰子由后续 `DICE_RESULT`
携带）。

### 2.2 CR #2：`onResolve` 追加 `DICE_RESULT`

**现状**（`machine.ts`，`outcome = resolveGroups(...)` 计算完之后紧接着是
`narratives`/`diceEntries`/`emitted` 的既有代码，逐字节不变）：

**在 `const outcome = resolveGroups(...)` 之后、`buildNarrativeInputs` 之前**，
新增一行：

```typescript
context.ports.presentation.send({
  kind: 'DICE_RESULT',
  results: outcome.diceRecords.map((d) => ({
    diceType: d.diceType,
    rawValue: d.rawValue,
    modifier: d.modifier,
    finalValue: d.finalValue,
    quality: d.quality,
  })),
});
```

只下发展示相关字段（`diceType`/`rawValue`/`modifier`/`finalValue`/`quality`），丢弃
`seed`/`rollIndex`/`appliedModifiers`（重放/内部记账字段，不用于展示，与 DEV-024 丢弃
`Choice.actionType`/`ruleId` 同一原则）。**这些字段本来就是 `DICE.PUBLISHED`
（`visibility: 'PUBLIC'`）已经承认对观众公开的信息，下发不构成新的信息泄露**——本节点
只是把已经判定为公开的数据从 Event Log 也转发一份到 Presentation 通道。

**验收时逐行核对**：`git diff` 只改 `onLock`/`onResolve` 这两个 action（各自新增
`send` 调用/一行），INTERACTION region 其余全部 action（`onAnnouncing`/`onOpen`/
`onVote`/`onResolved`）与 STORY region 的 `onSceneEnter`（含历次 CR 遗留代码）逐字节
不变。`narratives`/`diceEntries`/`emitted`/最终 `return` 等既有代码不受影响。

### 2.3 Renderer 侧：服务端驱动 INTRO/RESOLVE，本地计时驱动 LOOP

```typescript
// apps/renderer/src/render/pickDiceState.ts
export type DicePhase = 'IDLE' | 'INTRO' | 'RESOLVE';
export interface DiceResultView {
  diceType: string;
  rawValue: number;
  modifier: number;
  finalValue: number;
  quality: string;
}
export interface DiceView {
  phase: DicePhase;
  results: DiceResultView[];
  key: number;   // 产生这批数据的命令 commandSeq
}
export function pickDiceState(commands: PresentationCommand[]): DiceView
```

比较最近一条 `DICE_INTRO` 与最近一条 `DICE_RESULT` 的 `commandSeq`：都不存在→
`{phase:'IDLE', results:[], key:0}`；`DICE_RESULT` 更新→`{phase:'RESOLVE', results:
<映射>, key:<其 seq>}`；`DICE_INTRO` 更新（或只有它）→`{phase:'INTRO', results:[],
key:<其 seq>}`。

`App.tsx`：`pickDiceState` 返回 `INTRO` 且 `key` 变化时，本地进入"摇骰子动画"视觉状态
（CSS 循环动画，不需要新库），维持到 `pickDiceState` 返回 `RESOLVE`（真实数据到达）为止
——这就是"LOOP"阶段，**完全是本地视觉过渡，不是等待服务端**。`RESOLVE` 到达后停止动画，
展示 `results`（如"D20：14 + 2 = 16（SUCCESS）"这类格式）。

---

## 3. Scope

### Writable Scope — `packages/runtime-kernel`，两处窄范围 CR

```
packages/runtime-kernel/src/machine.ts   （仅第 2.1/2.2 节描述的 onLock/onResolve 两处
                                            新增，其余全部 action 逐字节不变）
```

### Writable Scope — `apps/renderer`，新增文件

```
apps/renderer/src/render/pickDiceState.ts
apps/renderer/src/render/pickDiceState.test.ts
```

### Writable Scope — `apps/renderer`，仅追加式扩展既有文件

```
apps/renderer/src/App.tsx   （追加 Dice UI 渲染，不删除既有场景层/角色/对话框/选项/
                               调试列表/HELLO 逻辑）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-025/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/runtime-kernel/src/ 下除 machine.ts（唯一授权改动，仅限两处）外的全部既有文件
  （含 machine.test.ts、interactionRegion.*、visualResolution.*、characterResolution.*、
  choiceResolution.*、index.ts——本节点不新增导出，index.ts 不动）
packages/runtime-kernel/package.json、tsconfig.json
packages/chapter-schema/**、packages/chapter-compiler/**（含 test-fixtures/**）、
  packages/rule-engine/**、packages/dice-engine/**、packages/narrative-composer/**、
  packages/persistence/**、packages/shared/**
apps/renderer/src/ws/**、apps/renderer/src/server/**、apps/renderer/src/main.tsx、
  apps/renderer/src/render/composeLayers.*、composeCharacters.*、pickDialogueLines.*、
  lineIndex.*、pickInteractionOpen.*、apps/renderer/package.json、tsconfig.json、
  vite.config.ts、index.html——DEV-020/021/022/023/024 冻结
根 tsconfig.json、tsconfig.base.json、vitest.config.ts、eslint.config.js、根 package.json
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
```

### Forbidden Scope

```
packages/* 除 runtime-kernel（限定一处）外的任何目录
apps/* 除 renderer（限定文件）外的任何目录
apps/renderer 内 DEV-020～024 冻结的文件
对 machine.ts 中 onLock/onResolve 以外任何 action/guard 的修改（含 onSceneEnter/onOpen
  及历次 CR 遗留代码）
`packages/runtime-kernel/src/index.ts` 的任何修改（本节点无新增导出）
实现真实节奏控制/等待逻辑（DEV-037 的职责，见本节点第 1 节说明）
任何根级配置文件的修改
新增任何 npm 依赖
```

---

## 4. Required Skills

### Required

- 窄范围修改 XState action，精确控制 diff 边界（本次两处，同一 region）
- CSS 循环动画（骰子滚动视觉效果），本地计时状态机

### Forbidden / Unnecessary

- 任何 3D/物理引擎骰子模拟——纯 2D CSS 动画足够
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `DiceRollResult`（`dice-engine`，已冻结） | `onResolve` 里 `outcome.diceRecords` 的元素类型 |
| `pickDialogueLines`/`pickInteractionOpen`（DEV-023/024 冻结） | 渲染模式先例，`pickDiceState` 照此风格实现 |
| `packages/chapter-compiler/test-fixtures/valid-minimal`（Read-only 引用） | 端到端测试素材 |

---

## 6. Outputs

1. `onLock` 追加 `DICE_INTRO` 命令；`onResolve` 追加 `DICE_RESULT` 命令
2. `pickDiceState`/`DiceView`/`DicePhase`（`apps/renderer`）
3. `App.tsx` 新增 Dice UI（INTRO 信号 → 本地 LOOP 动画 → RESOLVE 展示）
4. `specs/dev/DEV-025/DECISIONS.md`，记录：为何 LOOP 是本地视觉过渡而非真实等待、
   `DICE_RESULT` 字段裁剪理由（丢弃 `seed`/`rollIndex`/`appliedModifiers`）、与
   DEV-037 的边界

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-025/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Acceptance**：四文件存在；`INDEX.md` 含 Task Order T001–T005。

---

### T002 — `machine.ts` CR（`onLock` + `onResolve`）

- **Allowed Files**：`packages/runtime-kernel/src/machine.ts`（**仅第 2.1/2.2 节描述的两处**）
- **Requirements**：按第 2.1/2.2 节精确实施。
- **Acceptance**：
  - `git diff` 只显示 `onLock` 新增一行 `send`、`onResolve` 新增一处 `send`（含其
    `results` 映射表达式），其余全部 action（含 `onSceneEnter`/`onOpen` 及历次 CR
    遗留代码）逐字节不变。
  - 端到端：`createRuntimeMachine` 驱动 `valid-minimal` 走完一轮互动，依次捕获到
    `kind:'DICE_INTRO'`（`LOCK` 后）与 `kind:'DICE_RESULT'`（`LOCKED` 后，`results`
    含正确的 `diceType`/`rawValue`/`modifier`/`finalValue`/`quality`，且不含
    `seed`/`rollIndex`/`appliedModifiers`）。
  - 既有 `machine.test.ts`（未改动）全部测试仍然通过。

---

### T003 — `pickDiceState`

- **Allowed Files**：`apps/renderer/src/render/pickDiceState.ts`、`pickDiceState.test.ts`
- **Requirements**：按第 2.3 节实现。
- **Acceptance**：无命令/仅 `DICE_INTRO`/仅 `DICE_RESULT`/两者都有按 `commandSeq`
  取较大四种组合均正确返回。

---

### T004 — `App.tsx` Dice UI 渲染

- **Allowed Files**：`apps/renderer/src/App.tsx`（**仅追加**，不删除既有逻辑）
- **Requirements**：按第 2.3 节，`phase==='INTRO'` 时本地播放循环动画直到
  `phase==='RESOLVE'`；展示 `results`。
- **Acceptance**：手动核查渲染逻辑正确调用 `pickDiceState`（不要求 DOM 渲染测试，
  沿用先例）。

---

### T005 — 全量验证、REPORT 与 commit

- **Allowed Files**：`specs/dev/DEV-025/INDEX.md`、`REPORT.md`、`DECISIONS.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-025.md`
- **Requirements**：
  1. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  2. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  3. **`DECISIONS.md` 必须已提交**，覆盖第 6 节列出的全部要点。
  4. 更新 `INDEX.md`：T001–T005 全部勾选，**且把文件顶部的 `Status:` 一行从
     `IN_PROGRESS` 改为 `READY_FOR_REVIEW`**。
  5. `git add -A && git commit`，提交信息首行：`DEV-025: dice ui`。
  6. 追加 LEDGER 行，发 `NODE_REPORT`。
  7. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`REPORT.md` 引用的全部文档已入库；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-025 INDEX

Status: IN_PROGRESS

## Current Node

DEV-025 — Dice UI

## Objective

两处窄范围 CR：`onLock` 追加 `DICE_INTRO` 信号，`onResolve` 追加 `DICE_RESULT`（裁剪
后的展示字段）。`apps/renderer` 实现 INTRO（服务端信号）→ LOOP（本地循环动画，纯展示
过渡）→ RESOLVE（服务端真实结果）三阶段骰子 UI。真实节奏控制不在本节点（DEV-037）。

## Allowed Scope（runtime-kernel：两处 CR）
（抄录 Task Package 第 3 节实际条目——machine.ts 只在 onLock/onResolve 内新增）

## Allowed Scope（apps/renderer：新增 + 仅追加）
（抄录 Task Package 第 3 节实际条目）

## Read-only Scope
（抄录 Task Package 第 3 节实际条目）

## Forbidden Scope
（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 machine.ts CR（onLock + onResolve）
- [ ] T003 pickDiceState
- [ ] T004 App.tsx Dice UI 渲染
- [ ] T005 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001（每完成一个 Task 立即勾选并更新本字段）

## Exit Criteria

六条命令全部退出码 0；`machine.ts` 的 git diff 精确限定在 `onLock`/`onResolve` 两处；
端到端验证 `DICE_INTRO`/`DICE_RESULT` 正确；既有 `machine.test.ts` 零回归；
`DECISIONS.md` 已入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；已向 AUDITOR 发出
NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **`machine.ts` 只能改 `onLock`/`onResolve` 两处**，其余全部 action 逐字节不变。
2. **不修改 `index.ts`**（本节点无新增导出）。
3. **不修改 `apps/renderer` 的 DEV-020～024 冻结文件**。
4. **LOOP 阶段是本地视觉过渡，不实现真实节奏等待**（第 1 节已说明，DEV-037 的职责）。
5. **不新增任何 npm 依赖**。
6. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
7. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现真实的骰子摇动节奏控制/延迟安全阀（DEV-037）。
- 不实现镜头/视差动画（DEV-026）、BGM/SFX（DEV-027）。
- 不做 DOM 渲染测试（沿用先例）。
- 不修改 `machine.test.ts`/`interactionRegion.*`/`index.ts`。
- 不展示 `seed`/`rollIndex`/`appliedModifiers` 等内部记账字段。

---

## 11. Tests

### Unit tests

T003：覆盖第 7 节描述的具体行为。

### Integration tests

T002：端到端驱动真实 actor 验证两处 CR 后的命令载荷。

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
| A07 | `machine.ts` 的 git diff 精确限定在 `onLock`/`onResolve` 两处 | git diff 逐行比对 |
| A08 | 端到端：`DICE_INTRO`/`DICE_RESULT` 正确产出，`DICE_RESULT.results` 字段裁剪正确 | 测试检查 |
| A09 | `machine.test.ts`/`interactionRegion.*` 未被修改且全部测试通过 | git diff + 命令输出 |
| A10 | `pickDiceState` 对四种命令组合均正确返回 | 测试检查 |
| A11 | `App.tsx` 的 git diff 只有新增，DEV-020～024 既有逻辑保留 | git diff 比对 |
| A12 | `apps/renderer` 的 DEV-020～024 冻结文件未被修改 | git diff 比对 |
| A13 | `packages/**`（除 `machine.ts` 一处外）全部未被修改，含 `index.ts` | git diff 比对 |
| A14 | 未新增任何 npm 依赖 | 文件检查 |
| A15 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A16 | `specs/dev/DEV-025/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T005 全部勾选，`Status:` 表头改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A17 | `git log` 新增恰 1 条提交，首行 `DEV-025: dice ui`；提交时 `git status --porcelain` 为空 | 命令 |
| A18 | LEDGER 含 `NODE_REPORT-DEV-025` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A19 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT（含确认 `DECISIONS.md` 已提交）→ commit → 发 NODE_REPORT → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A19。
