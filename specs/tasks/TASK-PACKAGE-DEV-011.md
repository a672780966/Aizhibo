# TASK PACKAGE — DEV-011

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-011 |
| Node Name | Deterministic Replay |
| Milestone | M1 — Story Machine Complete |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-010（DONE，`verdict_ref: "0088"`）——实际只需要 DEV-009/DEV-007 已冻结的 `runtime-kernel` 导出，不依赖 `packages/persistence` 的任何代码，见第 2.1 节 |
| Commander | Claude |
| Executor | Codex（协议角色名 `OPENCODE`） |

### 追加式扩展已冻结的 `packages/runtime-kernel`，不碰 `packages/persistence`

第三次在同一个包上做追加式扩展（继第 DEV-007、DEV-010 之后）。本节点的驱动器结构与
DEV-007 的 `runSimulation` 高度相似（同一套"观察相位→发送 RootEvent"循环），区别只是
投票来源从"随机生成"换成"从历史 Event Log 里提取"。

### 本节点是 G03（"Replay 100% deterministic"）的实现，不是崩溃恢复

DEV-010 的 LKG 是"写穿透快照"，解决的是崩溃后**从最近状态**恢复（第 18 节）。本节点解决
的是完全不同的问题：**只给一个历史 Event Log（不给任何快照）+ 章节 + seed，能否从零重建
出逐事件一致的 Runtime**（第 65 节 DEV-011 原文："输入 Event Log → 重建 Runtime"；Replay
Test 原文："固定 Chapter Bundle + Event Log + PRNG Seed → World State/Player State/Story
State 必须完全一致"）。两者互不替代，`persistence` 包里也不需要为此新增任何代码。

---

## 2. 架构设计（Commander 已核对真实代码后做出的决策，Codex 按此实现）

### 2.1 关键认识：`RuntimeEvent` 是输出型日志，不能直接"重放"进机器——真正可重放的是投票

已核对 `machine.ts`（Read-only）确认：机器只接受 `RootEvent`
（`BOOT`/`STORY.DONE`/`INTERACTION.OPEN`/`VOTE`/`LOCK`/`NARRATIVE.DONE`/...），`RuntimeEvent`
（`STORY.*`/`INTERACTION.*`/`DICE.*`）是机器产出的**记录**，不是能重新喂回去的指令。

但项目里唯一的真正外部输入（不由 STORY/INTERACTION 内部 guard 自动决定）只有**投票**
（`viewerId`+`choiceId`）——`STORY.DONE`/`INTERACTION.OPEN`/`NARRATIVE.DONE`/`LOCK` 全部是
驱动方在观察到对应相位时**必然会发**的信号，跟 DEV-007 `simulator.ts` 的驱动循环逻辑完全
一致（同一份已冻结代码路径）。因此"重放"的正确实现是：**复用与 DEV-007 相同的相位驱动
循环，只是把"随机生成投票"换成"从历史 Event Log 里提取原始投票"**，其余驱动节奏
（何时发 `STORY.DONE`/`INTERACTION.OPEN`/`LOCK`/`NARRATIVE.DONE`）与 DEV-007 完全相同，因为
这些节奏本身就是确定性的（不依赖任何外部输入）。

### 2.2 从历史 Event Log 提取投票轮次

历史 `RuntimeEvent[]` 里，`INTERACTION.VOTE`（payload 含 `viewerId`/`choiceId`）与
`INTERACTION.LOCKING` 两类事件的相对顺序天然划出"轮次"边界：一段连续的
`INTERACTION.VOTE` 事件，后面紧跟一个 `INTERACTION.LOCKING` 事件，就是一轮的完整投票
集合。

```typescript
export interface VoteRound { votes: Array<{ viewerId: string; choiceId: string }> }
export function extractVoteRounds(events: readonly RuntimeEvent[]): VoteRound[]
```

按事件出现顺序扫描：遇到 `INTERACTION.VOTE` 缓存进"当前轮"，遇到 `INTERACTION.LOCKING`
结束当前轮（推入结果数组，缓存清空）。这是纯函数，不需要访问机器内部任何状态。

### 2.3 重放驱动器

```typescript
export interface ReplayResult {
  actor: RuntimeActor;
  replayedEvents: RuntimeEvent[];
}
export function replayFromEventLog(input: {
  chapterRootDir: string;
  seed: string;
  recordedEvents: readonly RuntimeEvent[];
  ports?: Partial<Ports>;
  maxSteps?: number;   // 默认 200，同 DEV-007 的死循环防护
}): ReplayResult
```

驱动循环与 DEV-007 `simulator.ts` 的 `runSimulation` 单局循环**结构完全相同**（`send(BOOT)`
→ 按 `getStoryPhase`/`getInteractionPhase` 分支发送 `STORY.DONE`/`INTERACTION.OPEN`/
`VOTE`+`LOCK`/`NARRATIVE.DONE`，直到 `CHAPTER_END`/`ERROR`/`maxSteps` 耗尽），唯一区别：
`OPEN` 态需要发送投票时，从 `extractVoteRounds(recordedEvents)` 按顺序取下一轮（而不是调用
`generateVotes`）。取完最后一轮后若仍需要投票，视为记录与实际重放不匹配的异常
（`recordedEvents` 与 `chapterRootDir`/`seed` 不对应），立即中止并抛出明确错误，不静默瞎猜。

### 2.4 确定性比对

```typescript
export interface ReplayDivergence {
  index: number;
  field: 'type' | 'payload' | 'chapterId' | 'visibility' | 'sessionId';
  expected: unknown;
  actual: unknown;
}
export function compareEventLogs(
  expected: readonly RuntimeEvent[],
  actual: readonly RuntimeEvent[],
): ReplayDivergence[]
```

按下标逐一比较 `type`/`payload`（深比较）/`chapterId`/`visibility`/`sessionId` 五个字段，
**默认排除 `id`/`timestamp`**——生产场景下原始运行用真实 `systemClockPort`，重放时新生成
的时间戳必然不同，这不代表状态发散（第 65 节 G03 的"Replay 100% deterministic"指的是
World/Player/Story State 一致，不是要求墙钟时间戳一致）。数组长度不一致本身也是一种
divergence（在 `index = min(length)` 处报告，`field: 'type'`，`expected`/`actual` 分别为
`'<missing>'` 或对方多出的事件）。空数组表示完全确定性匹配。

**额外的最大严谨性验证**（T004 的测试要求）：当原始驱动与重放驱动**注入同一个确定性虚拟
时钟**（复用 DEV-007 已冻结导出的 `virtualClockPort`）时，`id`/`timestamp` 也会逐字节相同
——用这个场景做一次连 `id`/`timestamp` 都不排除的全字段深比较，证明机制的最大严谨性，而
不是依赖被排除字段掩盖潜在问题。

---

## 3. Scope

### Writable Scope — 新增文件（全部在既有包 `packages/runtime-kernel` 下）

```
packages/runtime-kernel/src/voteExtraction.ts
packages/runtime-kernel/src/voteExtraction.test.ts
packages/runtime-kernel/src/replay.ts
packages/runtime-kernel/src/replay.test.ts
packages/runtime-kernel/src/replayCompare.ts
packages/runtime-kernel/src/replayCompare.test.ts
```

### Writable Scope — 既有文件，仅追加

```
packages/runtime-kernel/src/index.ts   （追加导出，不改动任何既有行）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-011/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/runtime-kernel/src/ 下除 index.ts 外的全部既有文件（含 machine.ts、
  storyRegion.ts、interactionRegion.ts、presentationRegion.ts、audioRegion.ts、
  placeholderRegions.ts、ports.ts、snapshot.ts、event.ts、diceEvent.ts、
  virtualPorts.ts、simulatorVotes.ts、simulator.ts，及各自 .test.ts）——
  本节点一律不修改，只调用已导出的公开函数
packages/runtime-kernel/package.json、tsconfig.json——本节点不需要新依赖，不动
packages/persistence/**——本节点不需要，不动
packages/chapter-schema/**、packages/chapter-compiler/**（含 test-fixtures/**）、
  packages/rule-engine/**、packages/dice-engine/**、packages/narrative-composer/**、
  packages/shared/**
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
eslint.config.js、.prettierrc.json、vitest.config.ts
```

### Forbidden Scope

```
packages/* 除 runtime-kernel（唯一 index.ts）外的任何目录
apps/**、chapters/**、assets/**、scripts/**、tools/**
对任何既有状态机定义（storyRegion.ts/interactionRegion.ts 等）的修改
新增任何 npm 依赖
把 replay 接入任何真实驱动循环/服务器（DEV-012 Runtime API 的职责）
对 `packages/persistence` 的任何修改（本节点不需要，仅消费 persistence 产出的
  `RuntimeEvent[]` 这一种已有公开类型，不建立包间新依赖）
```

---

## 4. Required Skills

### Required

- 阅读/复用已冻结的 `runtime-kernel` 公开 actor 接口，不修改机器定义本身
- 纯函数式的日志解析与深比较

### Forbidden / Unnecessary

- 修改 XState 机器定义
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `createRuntimeMachine`/`getStoryPhase`/`getInteractionPhase`/`getEventLog`/`getCurrentChoiceIds`（DEV-009/DEV-007 冻结） | 重放驱动循环 |
| `virtualClockPort`/`defaultPorts`（DEV-007 冻结） | 测试用确定性时钟，验证最大严谨性场景 |
| `RuntimeEvent`（DEV-008 冻结类型） | 重放的输入与比对对象 |
| `packages/chapter-compiler/test-fixtures/valid-minimal`（Read-only 引用） | 端到端重放测试的章节素材 |

---

## 6. Outputs

1. `extractVoteRounds`（`voteExtraction.ts`）
2. `replayFromEventLog`/`ReplayResult`（`replay.ts`）
3. `compareEventLogs`/`ReplayDivergence`（`replayCompare.ts`）
4. `specs/dev/DEV-011/DECISIONS.md`，记录：为何"重放"是重放投票而不是重放 RuntimeEvent、
   比对字段排除 `id`/`timestamp` 的理由、与 DEV-010 LKG 机制的边界划分

---

## 7. Task Breakdown

> **通用约定**：全部测试复用 `packages/chapter-compiler/test-fixtures/valid-minimal`
> （只读引用，按 `machine.test.ts`/DEV-007 `simulator.test.ts` 现有手法复制到临时目录）。

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-011/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Acceptance**：四文件存在；`INDEX.md` 含 Task Order T001–T006。

---

### T002 — `extractVoteRounds`

- **Allowed Files**：`src/voteExtraction.ts`、`src/voteExtraction.test.ts`
- **Requirements**：按第 2.2 节实现，纯函数，不访问机器/数据库。
- **Acceptance**：对含 0/1/多轮投票的手写 `RuntimeEvent[]` 用例均正确切分；`INTERACTION.VOTE`/`INTERACTION.LOCKING` 之外的事件类型穿插在中间时不影响切分结果。

---

### T003 — `replayFromEventLog`

- **Allowed Files**：`src/replay.ts`、`src/replay.test.ts`
- **Requirements**：按第 2.3 节实现驱动循环，复用 T002 的 `extractVoteRounds`。
- **Acceptance**：
  - 对 `valid-minimal`：先用一次正常驱动（可复用 DEV-007 `generateVotes` 手法或手写固定
    投票）跑到 `CHAPTER_END`，取得 `recordedEvents`；再用 `replayFromEventLog` 传入同一
    `chapterRootDir`/`seed`/`recordedEvents`，重放同样到达 `CHAPTER_END`。
  - 投票轮次多于一轮时（若 fixture 存在多个 interaction，如 `interaction-01`+
    `interaction-boss`）重放正确逐轮消费。
  - 故意传入不匹配的 `recordedEvents`（如清空投票轮次但原局需要投票）时，抛出明确错误而
    不是静默产生错误结果或死循环。

---

### T004 — `compareEventLogs`

- **Allowed Files**：`src/replayCompare.ts`、`src/replayCompare.test.ts`
- **Requirements**：按第 2.4 节实现。
- **Acceptance**：
  - 原始驱动使用 `virtualClockPort`（两次运行均注入同一个新建的 `virtualClockPort` 实例，
    因为它是确定性单调计数器，从初始状态开始两次调用序列相同）驱动一局，产出
    `recordedEvents`；`replayFromEventLog` 同样注入 `virtualClockPort` 重放；
    `compareEventLogs(recordedEvents, replayedEvents)` 返回**空数组**，且额外用一次不排除
    `id`/`timestamp` 的全字段深比较（`toEqual`）证明逐字节相同（最大严谨性场景）。
  - 人为改动一条 `replayedEvents` 中事件的 `payload`（模拟假设中的不确定性 bug）后，
    `compareEventLogs` 能正确报告出对应下标的 divergence（证明比对函数本身有效，不是
    因为从不检查才总是返回空）。
  - 两个真实（非人为篡改）分别用 `systemClockPort` 独立跑两次的 `recordedEvents`/
    `replayedEvents`，`compareEventLogs`（默认排除 `timestamp`）仍返回空数组（证明默认排除
    字段的设计在真实使用场景下确实必要且有效）。

---

### T005 — Public exports

- **Allowed Files**：`packages/runtime-kernel/src/index.ts`（**仅追加**）
- **Requirements**：追加导出 `extractVoteRounds`、`replayFromEventLog`、`compareEventLogs`，及类型 `VoteRound`/`ReplayResult`/`ReplayDivergence`。
- **Acceptance**：全部新符号可从包外 `import { replayFromEventLog } from '@interactive-story/runtime-kernel'` 拿到；`git diff` 对 `index.ts` 只有新增行。

---

### T006 — 全量验证、REPORT 与 commit

- **Allowed Files**：`specs/dev/DEV-011/INDEX.md`、`REPORT.md`、`DECISIONS.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-011.md`
- **Requirements**：
  1. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  2. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  3. **`DECISIONS.md` 必须已提交**，覆盖第 6 节列出的全部要点。
  4. 更新 `INDEX.md`：T001–T006 全部勾选。
  5. `git add -A && git commit`，提交信息首行：`DEV-011: deterministic replay`。
  6. 追加 LEDGER 行，发 `NODE_REPORT`。
  7. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`REPORT.md` 引用的全部文档已入库；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-011 INDEX

Status: IN_PROGRESS

## Current Node

DEV-011 — Deterministic Replay

## Objective

在已冻结的 `runtime-kernel` 上追加确定性重放能力：从历史 `RuntimeEvent[]` 提取投票轮次，
复用与 DEV-007 相同的相位驱动循环重新跑一遍章节，产出的新事件日志与原始记录逐字段一致
（G03）。不涉及崩溃恢复（DEV-010 已用写穿透 LKG 解决），不新建包。

## Allowed Scope（新增文件）
（抄录 Task Package 第 3 节实际条目）

## Allowed Scope（既有文件，仅追加）
（抄录 Task Package 第 3 节实际条目——仅 index.ts，逐行核对不得删改既有内容）

## Read-only Scope
（抄录 Task Package 第 3 节实际条目）

## Forbidden Scope
（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 extractVoteRounds
- [ ] T003 replayFromEventLog
- [ ] T004 compareEventLogs
- [ ] T005 Public exports
- [ ] T006 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001（每完成一个 Task 立即勾选并更新本字段）

## Exit Criteria

六条命令全部退出码 0；`valid-minimal` 端到端重放测试通过（`compareEventLogs` 返回空数组，
含一次连 `id`/`timestamp` 都不排除的全字段深比较）；`index.ts` 的 git diff 只有新增行；
`DECISIONS.md` 已入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；已向 AUDITOR 发出
NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **不得修改任何既有状态机定义或既有导出文件**（除 `index.ts` 仅追加）。
2. **`index.ts` 仅追加**，`git diff` 必须逐行核对只有新增，无删改。
3. **不新增任何 npm 依赖**。
4. **不接触 `packages/persistence`**——本节点与它没有代码耦合，只是概念上都消费/产出
   `RuntimeEvent[]`。
5. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
6. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现崩溃恢复（DEV-010 已完成，写穿透 LKG）。
- 不定义 Presentation/Audio 命令的重放（那些 Region 目前仍是骨架，没有真实产出需要重放）。
- 不把 replay 接入任何真实服务器/驱动循环（DEV-012 的职责）。
- 不实现"部分重放"（从历史某个中间序号开始重放）——本节点只做"从零完整重放整局"，与
  Dev Spec 第 65 节 DEV-011 原文范围一致。
- 不新建 CLI 脚本或 `apps/**` 下的可执行入口。

---

## 11. Tests

### Unit tests

T002–T004 各自 `.test.ts`：覆盖第 7 节各任务描述的具体行为。

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
| A07 | `extractVoteRounds` 对 0/1/多轮投票用例均正确切分 | 测试检查 |
| A08 | `replayFromEventLog` 对 `valid-minimal` 端到端重放到 `CHAPTER_END` | 测试检查 |
| A09 | 不匹配的 `recordedEvents` 输入触发明确错误，不静默产生错误结果/死循环 | 测试检查 |
| A10 | `compareEventLogs`（默认排除 `id`/`timestamp`）对真实两次独立驱动（各自 `systemClockPort`）返回空数组 | 测试检查 |
| A11 | 注入同一 `virtualClockPort` 的原始驱动与重放，全字段（含 `id`/`timestamp`）深比较逐字节相同 | 测试检查 |
| A12 | 人为篡改一条事件后 `compareEventLogs` 能正确报告 divergence（证明比对函数有效） | 测试检查 |
| A13 | `index.ts` 的 `git diff` 只包含新增行，无删除/修改任何既有行 | git diff 比对 |
| A14 | `packages/runtime-kernel` 除 `index.ts` 外的既有文件 git diff 为空 | git diff 比对 |
| A15 | `packages/persistence`、`chapter-schema`、`chapter-compiler`、`rule-engine`、`dice-engine`、`narrative-composer` 全部未被修改 | git diff 比对 |
| A16 | 未新增任何 npm 依赖 | 文件检查 |
| A17 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A18 | `specs/dev/DEV-011/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T006 全部勾选 | 文件 + 文本检查 |
| A19 | `git log` 新增恰 1 条提交，首行 `DEV-011: deterministic replay`；提交时 `git status --porcelain` 为空 | 命令 |
| A20 | LEDGER 含 `NODE_REPORT-DEV-011` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A21 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT（含确认 `DECISIONS.md` 已提交）→ commit → 发 NODE_REPORT → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A21。
