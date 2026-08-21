# TASK PACKAGE — DEV-024

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-024 |
| Node Name | Choice UI |
| Milestone | M2 — Presentation Complete（第五个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-023（DONE，`verdict_ref: "0112"`） |
| Commander | Claude |
| Executor | Codex（协议角色名 `OPENCODE`） |

### 本节点是第一次对 `onOpen`（INTERACTION region）发窄范围 CR——不是 `onSceneEnter`

前三次 CR（DEV-021/022/023）全部改的是 STORY region 的 `onSceneEnter`。本节点改的是
**INTERACTION region 的 `onOpen`**，两者互不影响，`onSceneEnter` 及其历次 CR 遗留代码
逐字节不变。

### 关键产品事实：Choice UI 是给主播/观众"看"的展示，不是可点击交互控件

已核对 Dev Spec 第 34 节："整个演出层使用 Web Renderer...OBS Browser Source 承载"——
Renderer 画面是被 OBS 采集进直播画面的，**观众看到的是直播画面，不能点击**。真正的投票
输入来自 Twitch 聊天区（`platform-twitch`，M4，尚未建），最终变成直接发给 actor 的
`VOTE` `RootEvent`（`viewerId`/`choiceId`）。本节点只做"把当前有哪些选项、对应打什么
字母显示出来"，**不做可点击按钮**，不产生任何投票。

---

## 2. 架构设计（Commander 已核对真实代码后做出的决策）

### 2.1 关键发现：`Choice.id` 就是观众要在聊天里打的字母

`chapter-schema` 已冻结：`Choice { id: 'A'|'B'|'C'|'D', label: string, actionType,
ruleId, visibleIf?: Condition[] }`；`InteractionNode { ..., openDurationMs: number,
choices: Choice[] }`。已核对真实 fixture（`valid-minimal/interactions/interaction-01
.json`）：`choices: [{id:'A', label:'跟随向导', ...}]`。`id` 直接对应观众投票要打的
字母，`label` 是人类可读的选项说明——这两个字段是 Choice UI 唯一需要的展示内容。
`actionType`/`ruleId` 是内部机制字段，不用于展示，不下发。

### 2.2 关键发现：`visibleIf` 需要 Runtime 侧过滤，Renderer 不能看到 `WorldState`

某些 `Choice` 可能带 `visibleIf?: Condition[]`（按世界状态条件性可见）。判断可见性需要
读 `WorldState`，而 `WorldState` 是不透明的（CR-008），Renderer 不能也不该拿到它——跟
DEV-021/022 的"Renderer 不维护剧情"是同一条纪律。因此可见性过滤必须在 Runtime 侧
（`onOpen`）完成，只把**已过滤好**的选项列表发给 Renderer。

### 2.3 CR：`onOpen` 追加选项与时限

**现状**（`machine.ts`，DEV-009 冻结）：

```typescript
onOpen: assign(({ context }) => {
  context.ports.presentation.send({ kind: 'INTERACTION_OPEN' });
  return interactionMove(context, 'OPEN', 'INTERACTION.OPEN');
}),
```

**授权改为**：

```typescript
onOpen: assign(({ context }) => {
  const scene =
    context.compiled !== null ? currentScene(context.compiled, context.currentSceneId) : undefined;
  const interaction =
    context.compiled !== null && scene?.interactionId !== undefined
      ? context.compiled.schemaResult.interactions.passed.find(
          (i) => i.value.id === scene.interactionId,
        )?.value
      : undefined;
  const choices =
    interaction !== undefined
      ? resolveVisibleChoices(interaction, context.snapshot.world)
      : [];
  context.ports.presentation.send({
    kind: 'INTERACTION_OPEN',
    choices,
    openDurationMs: interaction?.openDurationMs,
  });
  return interactionMove(context, 'OPEN', 'INTERACTION.OPEN');
}),
```

**验收时逐行核对**：`git diff` 只改 `onOpen` 这一个 action（新增 `scene`/`interaction`/
`choices` 计算 + `send` 参数），INTERACTION region 其余全部 action（`onAnnouncing`/
`onVote`/`onLock`/`onResolve`/`onResolved`）与 STORY region 的 `onSceneEnter`（含
DEV-021/022/023 三次 CR 遗留代码）逐字节不变。

### 2.4 `resolveVisibleChoices`——新增纯函数（新文件，追加式）

```typescript
export interface DisplayChoice {
  id: Choice['id'];
  label: string;
}

export function resolveVisibleChoices(
  interaction: InteractionNode,
  world: WorldState,
): DisplayChoice[]
```

对 `interaction.choices` 逐个判断：`visibleIf` 未定义 → 可见；否则用 `rule-engine` 已
冻结的 `evaluateCondition` 对数组内每个 `Condition` 做 AND（全部满足才可见，与
`SceneGuard`/其它多条件字段的既有语义一致，不发明新的组合规则）。可见的映射成
`{id, label}`，丢弃 `actionType`/`ruleId`/`visibleIf`（内部字段，不下发）。

### 2.5 Renderer 侧：展示选项列表 + 本地倒计时（纯 UI 反馈，不驱动剧情）

```typescript
// apps/renderer/src/render/pickInteractionOpen.ts
export interface InteractionOpenView {
  choices: DisplayChoice[];
  openDurationMs?: number;
  key: number;   // 产生这批数据的命令 commandSeq，用于检测"新一轮开始"从而重置倒计时
}
export function pickInteractionOpen(
  commands: PresentationCommand[],
): InteractionOpenView | undefined
```

取最近一条 `kind === 'INTERACTION_OPEN'` 的命令，没有则返回 `undefined`。

`App.tsx`：`key` 变化时（`useEffect`）重新从 `openDurationMs` 开始本地倒计时（用
`setInterval`/`Date.now()`——**这里允许使用裸 `Date.now()`**，倒计时是纯展示反馈，不
写入 Runtime Event Log、不参与游戏状态判定，不适用 `runtime-kernel` 的确定性红线，
沿用 DEV-010 `getHealth()` 已确立的同一区分原则）；渲染选项列表（`"[A] 跟随向导"`
这类"字母 + 文案"格式，方便观众照着打）。**已知简化，如实记录**：本地倒计时只是
UI 反馈，可能与 Runtime 侧真实的互动关闭时刻有毫秒级漂移（Renderer 不知道
`INTERACTION_OPEN` 命令实际发出的服务器时刻），不影响任何判定——真正决定互动何时
关闭的是 Runtime 侧的 `LOCK` 事件，不是这个倒计时。

---

## 3. Scope

### Writable Scope — `packages/runtime-kernel`，一处窄范围 CR + 追加

```
packages/runtime-kernel/src/machine.ts        （仅第 2.3 节描述的 onOpen 内新增，
                                                 其余全部 action 逐字节不变）
packages/runtime-kernel/src/choiceResolution.ts       （新增）
packages/runtime-kernel/src/choiceResolution.test.ts  （新增）
packages/runtime-kernel/src/index.ts          （仅追加导出）
```

### Writable Scope — `apps/renderer`，新增文件

```
apps/renderer/src/render/pickInteractionOpen.ts
apps/renderer/src/render/pickInteractionOpen.test.ts
```

### Writable Scope — `apps/renderer`，仅追加式扩展既有文件

```
apps/renderer/src/App.tsx   （追加选项/倒计时渲染，不删除既有场景层/角色/对话框/
                               调试列表/HELLO 逻辑）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-024/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/runtime-kernel/src/ 下除 machine.ts（唯一授权改动）/choiceResolution.*（新增）/
  index.ts（仅追加）外的全部既有文件（含 machine.test.ts、interactionRegion.ts/.test.ts、
  visualResolution.*、characterResolution.*——本节点不改任何既有文件的既有内容）
packages/runtime-kernel/package.json、tsconfig.json
packages/chapter-schema/**、packages/chapter-compiler/**（含 test-fixtures/**）、
  packages/rule-engine/**、packages/dice-engine/**、packages/narrative-composer/**、
  packages/persistence/**、packages/shared/**
apps/renderer/src/ws/**、apps/renderer/src/server/**、apps/renderer/src/main.tsx、
  apps/renderer/src/render/composeLayers.*、composeCharacters.*、pickDialogueLines.*、
  lineIndex.*、apps/renderer/package.json、tsconfig.json、vite.config.ts、index.html
  ——DEV-020/021/022/023 冻结
根 tsconfig.json、tsconfig.base.json、vitest.config.ts、eslint.config.js、根 package.json
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
```

### Forbidden Scope

```
packages/* 除 runtime-kernel（限定文件）外的任何目录
apps/* 除 renderer（限定文件）外的任何目录
apps/renderer 内 DEV-020/021/022/023 冻结的文件
对 machine.ts 中 onOpen 以外任何 action/guard 的修改（含 onSceneEnter 及其历次 CR
  遗留代码）
任何可点击/可交互的选项按钮（第 2 节已说明：观众看的是直播画面，不能点击）
任何真实投票统计/实时票数展示（无批量/限流机制设计，明确延后，见 Non-goals）
任何根级配置文件的修改
新增任何 npm 依赖
```

---

## 4. Required Skills

### Required

- 窄范围修改 XState action，精确控制 diff 边界（这次是 INTERACTION region 而非 STORY region）
- React 本地倒计时（`setInterval`/`useEffect` 清理），无需新库

### Forbidden / Unnecessary

- 任何表单/按钮组件库
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `Choice`/`InteractionNode`（已冻结） | 选项数据来源 |
| `evaluateCondition`（`rule-engine`，已冻结） | `visibleIf` 过滤 |
| `currentScene`（已冻结） | 取当前场景的 `interactionId` |
| `packages/chapter-compiler/test-fixtures/valid-minimal`（Read-only 引用） | 端到端测试素材（`interaction-01` 含 1 个无 `visibleIf` 的选项） |

---

## 6. Outputs

1. `resolveVisibleChoices`/`DisplayChoice`（`choiceResolution.ts`）
2. `onOpen` 的 `INTERACTION_OPEN` 命令载荷追加 `choices`/`openDurationMs`
3. `pickInteractionOpen`/`InteractionOpenView`（`apps/renderer`）
4. `App.tsx` 新增选项展示 + 本地倒计时
5. `specs/dev/DEV-024/DECISIONS.md`，记录：Choice UI 是展示非交互的产品事实、
   `visibleIf` 多条件 AND 语义、倒计时允许用 `Date.now()` 的理由、"不做实时票数"的
   已知边界

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-024/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Acceptance**：四文件存在；`INDEX.md` 含 Task Order T001–T006。

---

### T002 — `resolveVisibleChoices`

- **Allowed Files**：`packages/runtime-kernel/src/choiceResolution.ts`、`choiceResolution.test.ts`
- **Requirements**：按第 2.4 节实现。
- **Acceptance**：无 `visibleIf` 的选项始终可见；手写一个带 `visibleIf`（单条件与多
  条件 AND）的 `InteractionNode`/`WorldState` 用例，分别验证条件满足/不满足两种情形；
  返回值只含 `id`/`label`，不泄漏 `actionType`/`ruleId`。

---

### T003 — `machine.ts` CR（`onOpen`）

- **Allowed Files**：`packages/runtime-kernel/src/machine.ts`（**仅第 2.3 节描述的一处**）
- **Requirements**：按第 2.3 节精确实施。
- **Acceptance**：
  - `git diff` 只显示 `onOpen` action 内新增 `scene`/`interaction`/`choices` 计算 +
    `send` 参数追加两个字段，其余全部 action（含 `onSceneEnter` 及历次 CR 遗留代码）
    逐字节不变。
  - 端到端：`createRuntimeMachine` 驱动 `valid-minimal` 到 `INTERACTION.OPEN`，捕获
    的命令含 `choices: [{id:'A', label:'跟随向导'}]`、`openDurationMs: 15000`。
  - 既有 `machine.test.ts`（未改动）全部测试仍然通过。

---

### T004 — `index.ts` 追加导出

- **Allowed Files**：`packages/runtime-kernel/src/index.ts`（**仅追加**）
- **Requirements**：追加导出 `resolveVisibleChoices`，类型 `DisplayChoice`。
- **Acceptance**：`git diff` 只有新增行；符号可从包外导入。

---

### T005 — `pickInteractionOpen` + `App.tsx` 渲染

- **Allowed Files**：`apps/renderer/src/render/pickInteractionOpen.ts`、`.test.ts`、`apps/renderer/src/App.tsx`（**仅追加**）
- **Requirements**：按第 2.5 节实现，`App.tsx` 追加渲染，不删除既有逻辑。
- **Acceptance**：`pickInteractionOpen` 对无命令/有命令两种情形正确返回；倒计时/
  选项渲染逻辑手动核查正确调用（不要求 DOM 渲染测试，沿用先例）。

---

### T006 — 全量验证、REPORT 与 commit

- **Allowed Files**：`specs/dev/DEV-024/INDEX.md`、`REPORT.md`、`DECISIONS.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-024.md`
- **Requirements**：
  1. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  2. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  3. **`DECISIONS.md` 必须已提交**，覆盖第 6 节列出的全部要点。
  4. 更新 `INDEX.md`：T001–T006 全部勾选，**且把文件顶部的 `Status:` 一行从
     `IN_PROGRESS` 改为 `READY_FOR_REVIEW`**（前三个节点均漏改，请主动做对）。
  5. `git add -A && git commit`，提交信息首行：`DEV-024: choice ui`。
  6. 追加 LEDGER 行，发 `NODE_REPORT`。
  7. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`REPORT.md` 引用的全部文档已入库；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-024 INDEX

Status: IN_PROGRESS

## Current Node

DEV-024 — Choice UI

## Objective

第一次对 INTERACTION region 的 `onOpen` 发窄范围 CR，追加已按 `visibleIf` 过滤好的
`choices` 与 `openDurationMs`；`apps/renderer` 展示"字母+文案"选项列表与本地倒计时。
Choice UI 是给观众"看"的展示（OBS Browser Source 采集进直播画面），不是可点击控件——
真实投票来自 Twitch 聊天（M4 未建）。

## Allowed Scope（runtime-kernel：CR + 新增 + 追加）
（抄录 Task Package 第 3 节实际条目——machine.ts 只在 onOpen 内新增）

## Allowed Scope（apps/renderer：新增 + 仅追加）
（抄录 Task Package 第 3 节实际条目）

## Read-only Scope
（抄录 Task Package 第 3 节实际条目）

## Forbidden Scope
（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 resolveVisibleChoices
- [ ] T003 machine.ts CR（onOpen）
- [ ] T004 index.ts 追加导出
- [ ] T005 pickInteractionOpen + App.tsx 渲染
- [ ] T006 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001（每完成一个 Task 立即勾选并更新本字段）

## Exit Criteria

六条命令全部退出码 0；`machine.ts` 的 git diff 精确限定在 `onOpen` 一处；端到端验证
`INTERACTION_OPEN` 含正确 `choices`/`openDurationMs`；既有 `machine.test.ts` 零回归；
`DECISIONS.md` 已入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；已向 AUDITOR 发出
NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **`machine.ts` 只能改 `onOpen` 一处**，其余全部 action（含 `onSceneEnter` 及历次
   CR 遗留代码）逐字节不变。
2. **不做可点击 UI**（第 2 节已说明产品事实）。
3. **不做实时票数展示**（无批量/限流机制，见 Non-goals）。
4. `App.tsx` 的倒计时允许用 `Date.now()`/`setInterval`（第 2.5 节已说明理由，纯展示
   反馈，不适用 `runtime-kernel` 的确定性红线）。
5. **不新增任何 npm 依赖**。
6. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
7. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现可点击投票控件（观众看的是直播画面，不能点击）。
- 不实现实时票数/计票展示（需要额外的批量/限流机制设计，明确延后，未来若做很可能是
  另一次 CR）。
- 不实现骰子 UI（DEV-025）、镜头/视差动画（DEV-026）、BGM/SFX（DEV-027）。
- 不做 DOM 渲染测试（沿用先例）。
- 不修改 `machine.test.ts`/`interactionRegion.*`/`visualResolution.*`/
  `characterResolution.*`。

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
| A07 | `resolveVisibleChoices` 对无/单/多 `visibleIf` 条件均正确过滤，不泄漏内部字段 | 测试检查 |
| A08 | `machine.ts` 的 git diff 精确限定在 `onOpen` 一处 | git diff 逐行比对 |
| A09 | 端到端：`INTERACTION_OPEN` 命令含正确 `choices`/`openDurationMs` | 测试检查 |
| A10 | `machine.test.ts`/`interactionRegion.*` 未被修改且全部测试通过 | git diff + 命令输出 |
| A11 | `pickInteractionOpen` 对无命令/有命令情形正确返回 | 测试检查 |
| A12 | `App.tsx` 的 git diff 只有新增，DEV-020～023 既有逻辑保留 | git diff 比对 |
| A13 | `apps/renderer` 的 DEV-020/021/022/023 冻结文件未被修改 | git diff 比对 |
| A14 | `packages/**`（除 runtime-kernel 限定文件外）全部未被修改 | git diff 比对 |
| A15 | 未新增任何 npm 依赖 | 文件检查 |
| A16 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A17 | `specs/dev/DEV-024/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T006 全部勾选，`Status:` 表头改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A18 | `git log` 新增恰 1 条提交，首行 `DEV-024: choice ui`；提交时 `git status --porcelain` 为空 | 命令 |
| A19 | LEDGER 含 `NODE_REPORT-DEV-024` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A20 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT（含确认 `DECISIONS.md` 已提交）→ commit → 发 NODE_REPORT → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A20。
