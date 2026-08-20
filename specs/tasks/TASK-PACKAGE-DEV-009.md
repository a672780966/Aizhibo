# TASK PACKAGE — DEV-009

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-009 |
| Node Name | XState Runtime Kernel |
| Milestone | M1 — Story Machine Complete |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-008（DONE）、DEV-006（DONE）、DEV-033（DONE） |
| Commander | Claude |
| Executor | Codex（协议角色名 `OPENCODE`） |

### 这是 M1 目前最重的一个节点，请完整读完第 2 节再动手

不是因为任务数量多，是因为**这里第一次真正引入 XState**，也是**把之前独立建好的五个纯函数包（chapter-schema/chapter-compiler/rule-engine/dice-engine/narrative-composer）第一次拧到一起跑**的地方。前面九个节点各自都是孤立可测的纯函数库，这个节点是第一次要让它们互相调用。

### 追加式扩展已冻结的 `packages/runtime-kernel`

不新建包。DEV-008 已经把 `RuntimeEvent`/`DiceEvent` 的类型定义冻结在这个包里；本节点在同一个包里新增 XState 机器本体。

---

## 2. 架构设计（本节点的核心，Commander 已做出以下决策，Codex 按此实现，不要重新解释）

### 2.1 CR-005 Region 重建模——已在 DAG.md 冻结，直接照办

第 5 节原文的七个并行 Region，实际实现按 `DAG.md` CR-005 的重建模执行：

| Region | 状态集 | 本节点实现深度 |
|---|---|---|
| STORY | 第 6 节原样 10 态 | **完整实现，含真实转移逻辑** |
| INTERACTION | 第 7 节原样 6 态 | **完整实现，含真实转移逻辑** |
| PRESENTATION | `LOADING / READY / FAILOVER` | 状态骨架 + 通过 Port 发送命令，**不接真实 Renderer**（M2 未建） |
| AUDIO | `IDLE / PREPARING / PLAYING_STORY / PLAYING_HOST / DUCKED / ERROR` | 状态骨架 + 通过 Port 发送命令，**不接真实音频**（M3 未建） |
| HOST / PLATFORM / SAFETY | 各自单态占位（如 `IDLE`） | **纯占位，无实现**（M4/M5/M6 未建，见 Non-goals） |

STORY 是相位唯一权威，其余 Region 只读它派生，不各自维护相位副本（`DAG.md` 已有此设计理由，不重复）。

### 2.2 IO 边界必须做成可替换的 Port，不写死实现——这是 CR-004 对 DEV-007 复用性的前置要求

`DAG.md` CR-004 要求 DEV-007（Chapter Simulator，下一个节点）"复用 DEV-009 的同一个 Runtime statechart，只替换 IO 边界"。这意味着本节点**现在**就要把四类 IO 抽成接口，机器构造时注入，不能硬编码：

```typescript
interface ClockPort { now(): number }                          // 替代 Date.now()
interface PlatformPort { onVote(handler: (v: Vote) => void): void; sendChat(msg: string): Promise<void> }
interface PresentationPort { send(command: unknown): void }     // command 类型见 Non-goals，本节点不定义具体命令集
interface AudioPort { send(command: unknown): void }
```

本节点交付**默认空实现**（`ClockPort` 用真实 `Date.now()`，其它三个默认实现只是 no-op 或简单日志，不接任何真实系统——因为真实系统都还没建）。DEV-007 未来注入的是虚拟观众生成器/虚拟时钟/空实现，走的是**同一套接口**，不是另开一套。

### 2.3 Runtime Snapshot 的类型层可见性分区——落实 CR-008

`DAG.md` CR-008 要求"Snapshot 每个字段在类型层面携带可见性分类"。具体落地方式（本节点的设计决策，记入 `DECISIONS.md`）：

**不做逐字段的类型标注系统**（那需要发明一整套类型层基础设施，成本远超收益）。改用**不透明类型 + 访问器函数**：

- `packages/runtime-kernel` 的公开 `index.ts` **不导出** Snapshot 的结构化类型（不导出任何能让外部代码写出 `snapshot.world.flags.xxx` 这种直接字段访问的类型）。
- 导出一个不透明的品牌类型：`type RuntimeSnapshot = { readonly __brand: 'RuntimeSnapshot' }`（或等价写法）。
- 内部真实的 snapshot 形状（含完整 `WorldState`、Event 序号计数器、`rule-engine` 的 `firedRuleIds`、各 Region 的 XState 子快照）是包内私有类型，**不 export**。
- 对外只导出**具名访问器**，例如 `getStoryPhase(snapshot: RuntimeSnapshot): string`、`getSequenceNumber(snapshot: RuntimeSnapshot): number`——每加一个"外部允许知道的东西"就要显式写一个访问器，不能整块转手。
- **这不是最终的 Public/Hidden 投影**——真正的 `getPublicState()`（读投影）是 DEV-050（M5）的职责，消费 `host.public.json`。本节点提供的是"防止意外全量暴露"的结构性防线：G06 的第二道防线（编译期是 DEV-002A，运行时读投影是 DEV-050），本节点在两者中间提供类型层护栏。

### 2.4 确定性与依赖注入

- 机器内部**不得**直接调用 `Date.now()`/`Math.random()`——凡是"现在几点"都走 `ClockPort.now()`。
- 骰子随机性已经在 `dice-engine` 里解决（seed + rollIndex 纯函数），本节点只需要提供 `seed`/`rollIndex` 参数，不重新实现随机。

---

## 3. Scope

### Writable Scope — 新增文件

```
packages/runtime-kernel/src/ports.ts
packages/runtime-kernel/src/ports.test.ts
packages/runtime-kernel/src/snapshot.ts
packages/runtime-kernel/src/snapshot.test.ts
packages/runtime-kernel/src/storyRegion.ts
packages/runtime-kernel/src/storyRegion.test.ts
packages/runtime-kernel/src/interactionRegion.ts
packages/runtime-kernel/src/interactionRegion.test.ts
packages/runtime-kernel/src/presentationRegion.ts
packages/runtime-kernel/src/presentationRegion.test.ts
packages/runtime-kernel/src/audioRegion.ts
packages/runtime-kernel/src/audioRegion.test.ts
packages/runtime-kernel/src/placeholderRegions.ts
packages/runtime-kernel/src/placeholderRegions.test.ts
packages/runtime-kernel/src/machine.ts
packages/runtime-kernel/src/machine.test.ts
```

### Writable Scope — 既有文件，仅追加

```
packages/runtime-kernel/package.json（追加 xstate 与 chapter-schema/chapter-compiler/
  rule-engine/dice-engine/narrative-composer 五个 dependencies）
packages/runtime-kernel/tsconfig.json（追加 references）
packages/runtime-kernel/src/index.ts（追加 export——严格遵守第 2.3 节的不透明类型原则，
  不导出内部 snapshot 结构）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-009/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md
specs/dev/DEV-009/DECISIONS.md（本节点设计决策数量很大，必须创建且写详细）
specs/dev/DEV-009/BLOCKERS.md（仅在需要时创建）
根 tsconfig.json（若发现 references 缺失才追加，通常已存在）
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/runtime-kernel/src/event.ts、diceEvent.ts（及其 .test.ts）——DEV-008 冻结，不改
packages/chapter-schema/**、packages/chapter-compiler/**、packages/rule-engine/**、
  packages/dice-engine/**、packages/narrative-composer/**、packages/shared/**
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts
```

### Forbidden Scope

```
packages/* 除 runtime-kernel 外的任何目录
apps/**、chapters/**、assets/**、scripts/**、tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration、任何真实网络调用
Math.random()、裸 Date.now()（必须经 ClockPort）
真实的 Renderer/Audio/Twitch/AI Host 接入代码（M2/M3/M4/M5 均未建）
SQLite 或任何持久化实现（DEV-010）
Replay 校验逻辑（DEV-011）
对外 HTTP/IPC API（DEV-012）
`index.ts` 导出内部 snapshot 结构类型（违反第 2.3 节不透明类型原则）
```

---

## 4. Required Skills

### Required

- XState v5（`setup`/`createMachine`、parallel states、actors、`assign`、持久化 snapshot 概念）
- 依赖注入模式（接口 + 默认空实现 + 可覆盖注入）
- 不透明类型/品牌类型模式

### Forbidden / Unnecessary

- SQLite/数据库驱动
- HTTP 服务器框架
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `compile()`（chapter-compiler） | STORY.CHAPTER_LOADING 状态调用，加载并校验 Chapter Pack |
| `resolveGuard`/`applyEffect`/`applyStateRuleSet`（rule-engine） | STORY 转移判定、效果应用 |
| `resolveAction`（rule-engine，DEV-006） | INTERACTION.LOCKED 状态调用，产出 `ResolveResult` |
| `composeResultSetNarration`（narrative-composer） | RESULT_PLAYING 状态调用，产出叙事文本 |
| `RuntimeEvent`/`DiceEvent`（runtime-kernel，DEV-008 冻结） | 每次有意义的转移都要产出对应事件 |

---

## 6. Outputs

1. `ClockPort`/`PlatformPort`/`PresentationPort`/`AudioPort` 接口 + 默认实现
2. 不透明 `RuntimeSnapshot` 类型 + 具名访问器
3. STORY / INTERACTION 两个 Region 的完整状态机（含真实转移逻辑）
4. PRESENTATION / AUDIO 两个 Region 的状态骨架（无真实 IO 接入）
5. HOST / PLATFORM / SAFETY 三个占位 Region
6. `createRuntimeMachine(input: { ports?: Partial<Ports>; chapterRootDir: string; seed: string }): ...` 顶层机器构造函数
7. `specs/dev/DEV-009/DECISIONS.md`，详细记录第 2 节的全部架构决策

---

## 7. Task Breakdown

> **通用约定**：全部单元测试用手写对象与 XState 的测试工具（如 `createActor` + 发送事件后断言状态），不需要真实 Chapter Pack 文件——若某个测试确实需要一个可编译的 Chapter Pack，复用/复制 `chapter-compiler` 的 `valid-minimal` fixture（只读引用，不修改）。

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-009/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Acceptance**：四文件存在；`INDEX.md` 含原句；Task Order 恰 T001–T012。

---

### T002 — 依赖追加

- **Allowed Files**：`packages/runtime-kernel/package.json`、`tsconfig.json`
- **Requirements**：
  1. `dependencies` 追加：`xstate`（选定具体版本，5.x 系列，记入 `DECISIONS.md`）、`@interactive-story/chapter-schema`、`@interactive-story/chapter-compiler`、`@interactive-story/rule-engine`、`@interactive-story/dice-engine`、`@interactive-story/narrative-composer`。既有 `zod` 保留不变。
  2. `tsconfig.json` 的 `references` 追加指向上述五个内部包。
- **Acceptance**：`pnpm install` 成功；六个依赖全部存在（含既有 `zod`）。

---

### T003 — IO Port 接口

- **Allowed Files**：`src/ports.ts`、`src/ports.test.ts`
- **Requirements**：
  1. 按第 2.2 节定义 `ClockPort`/`PlatformPort`/`PresentationPort`/`AudioPort` 四个接口，`Vote` 类型（至少含 `viewerId: string`、`choiceId: string`）。
  2. 各自提供默认实现：`systemClockPort`（真实 `Date.now()`）、`noopPlatformPort`/`noopPresentationPort`/`noopAudioPort`（方法调用即返回/记录，不做任何真实 IO）。
  3. 导出 `interface Ports { clock: ClockPort; platform: PlatformPort; presentation: PresentationPort; audio: AudioPort }`、`defaultPorts: Ports`。
- **Acceptance**：默认实现的每个方法可调用且不抛异常；`ClockPort.now()` 返回的值随时间推进（用真实系统时间验证单调性即可，不需要精确值断言）。

---

### T004 — 不透明 Snapshot 与访问器

- **Allowed Files**：`src/snapshot.ts`、`src/snapshot.test.ts`
- **Requirements**：
  1. 定义包内私有（**不 export**）的完整快照形状 `InternalSnapshot`，至少含：`world: WorldState`、`sequenceCounter: number`、`firedRuleIds: string[]`、`storyPhase: string`、`interactionPhase: string`。
  2. 导出品牌类型 `RuntimeSnapshot`（第 2.3 节定义的不透明形式）与内部专用的双向转换函数（`wrapSnapshot`/`unwrapSnapshot`，**不导出** `unwrapSnapshot`——只在包内其它模块之间使用）。
  3. 导出访问器：`getStoryPhase`、`getInteractionPhase`、`getSequenceNumber`，均只读、只返回原始值不返回嵌套对象引用。
  4. `DECISIONS.md` 记录：为什么选不透明类型而不是逐字段标注系统。
- **Acceptance**：`index.ts` 之外的代码只能通过访问器读取信息；类型检查层面验证 `RuntimeSnapshot` 不结构兼容 `InternalSnapshot`（即不能把一个 `RuntimeSnapshot` 直接当 `{ world: WorldState }` 使用——写一个 `@ts-expect-error` 测试用例）。

---

### T005 — STORY Region

- **Objective**：交付第 6 节 10 态的真实转移逻辑。
- **Allowed Files**：`src/storyRegion.ts`、`src/storyRegion.test.ts`
- **Requirements**：
  1. 状态：`BOOT → CHAPTER_LOADING → SCENE_ENTER → STORY_PLAYING → (INTERACTION_PENDING | TRANSITION) → ... → CHAPTER_END / ERROR`，严格按第 6 节原文的状态名与转移条件。
  2. `CHAPTER_LOADING`：调用 `chapter-compiler` 的 `compile(chapterRootDir)`；`passed: false` → 转 `ERROR`；`passed: true` → 转 `SCENE_ENTER`。
  3. `SCENE_ENTER`：读取当前场景数据，通过 `PresentationPort`/`AudioPort` 发送场景进入命令（命令内容本节点不定义具体结构，暂用 `unknown` 占位，真实命令集是 DEV-028/030 的职责），随后转 `STORY_PLAYING`。
  4. `STORY_PLAYING`：若当前场景有 `interactionId` → 转 `INTERACTION_PENDING`；否则按 `guards`/`next`（用 `rule-engine` 的 `resolveGuard`）决定下一场景，转 `TRANSITION`。
  5. 每次状态转移**必须**产出一条 `RuntimeEvent`（用 T004 的 `getSequenceNumber` 取号+1，事件 `type` 用 `"STORY.<FROM>_TO_<TO>"` 这类可读命名，`visibility` 默认 `PUBLIC`，除非明确对应 HIDDEN 语义的事件——本任务不需要发 DICE 类事件，那是 T006 的职责）。
- **Acceptance**：`compile()` 失败/成功两条路径正确转移；`STORY_PLAYING` 的 guard 分支与直接 `next` 分支都有测试；每次转移产出的事件序号单调递增。

---

### T006 — INTERACTION Region

- **Objective**：交付第 7 节 6 态，并在 `LOCKED` 状态串联 dice-engine + rule-engine（Action Resolution）+ narrative-composer。
- **Allowed Files**：`src/interactionRegion.ts`、`src/interactionRegion.test.ts`
- **Requirements**：
  1. 状态：`CLOSED → ANNOUNCING → OPEN → LOCKING → LOCKED → RESOLVED`，按第 7 节原文。
  2. `OPEN`：接受 `PlatformPort.onVote` 回调产生的投票，同一 `viewerId` 后一次覆盖前一次（第 7.2 节原文规则）。
  3. `LOCKED`：把投票按 `choiceId` 分组成 `ActionGroup[]`；对每组，用 `dice-engine` 产出的骰子结果（本节点**不自己起草掷骰输入**——`seed`/`rollIndex` 由构造机器时传入的种子与当前 `sequenceCounter` 派生，具体派生公式记入 `DECISIONS.md`）+ `rule-engine` 的 `resolveAction` 得到 `ResolveResult`；用 `narrative-composer` 的 `composeResultSetNarration` 把本轮全部 `ResolveResult` 的 `narrativeId` 对应叙事合成文本。
  4. 每组的 `worldEffects` 用 `rule-engine` 的 `applyEffect` 累加应用到 `WorldState`，产出新快照。
  5. 转 `RESOLVED` 后，把 `DICE.REQUESTED`/`DICE.ROLLED`/`DICE.PUBLISHED` 三个事件按第 8 节要求的可见性（`PUBLIC`/`HIDDEN`/`PUBLIC`）依次产出——**`ROLLED` 与 `PUBLISHED` 的时间分离**在本节点体现为两个独立事件即可，真正的"等骰子动画播完才发 PUBLISHED"的节奏控制是 DEV-037（M3）的职责，本节点不实现等待逻辑，直接在同一次转移里依次产出两个事件，记入 `DECISIONS.md` 说明这是简化版，真实节奏控制留给 DEV-037。
- **Acceptance**：多个 `ActionGroup` 并存的正例；同一 `viewerId` 改票的覆盖行为；`DICE.*` 三个事件的可见性正确；`WorldState` 效果应用后的新快照可通过 T004 访问器验证关键字段变化。

---

### T007 — PRESENTATION / AUDIO Region 骨架

- **Objective**：交付 CR-005 重建模后的状态骨架，不接真实系统。
- **Allowed Files**：`src/presentationRegion.ts`、`src/presentationRegion.test.ts`、`src/audioRegion.ts`、`src/audioRegion.test.ts`
- **Requirements**：
  1. PRESENTATION：`LOADING / READY / FAILOVER` 三态，状态转移只是骨架（例如收到"资产加载完成"信号从 `LOADING` 到 `READY`），通过 `PresentationPort.send()` 发送占位命令。
  2. AUDIO：`IDLE / PREPARING / PLAYING_STORY / PLAYING_HOST / DUCKED / ERROR` 六态骨架，通过 `AudioPort.send()` 发送占位命令。
  3. **不定义具体命令 schema**（那是 DEV-028/030 的职责），`send()` 参数类型用 `unknown` 或本节点内部的极简占位类型。
- **Acceptance**：两个 Region 各自的状态转移图可达（每个态都能进入）；`Port.send` 被正确调用（用测试替身验证调用次数/时机）。

---

### T008 — HOST / PLATFORM / SAFETY 占位 Region

- **Allowed Files**：`src/placeholderRegions.ts`、`src/placeholderRegions.test.ts`
- **Requirements**：
  1. 三个 Region 各自只有一个状态（如 `IDLE`），不接受任何有意义的事件，纯粹是让根机器的 parallel states 结构完整。
  2. 顶部注释明确写明：HOST 待 M5、PLATFORM 待 M4、SAFETY 待 M6，本节点不实现任何行为。
- **Acceptance**：三个占位 Region 能被顶层机器组合进 parallel states 且不报错。

---

### T009 — 根机器组装

- **Allowed Files**：`src/machine.ts`、`src/machine.test.ts`
- **Requirements**：
  1. 导出 `createRuntimeMachine(input: { ports?: Partial<Ports>; chapterRootDir: string; seed: string })`，组合 STORY/INTERACTION/PRESENTATION/AUDIO/HOST/PLATFORM/SAFETY 七个 Region 为一个 parallel 根机器。
  2. `ports` 未提供的部分用 T003 的 `defaultPorts` 补齐——**这正是 DEV-007 未来复用本机器时要覆盖的注入点**。
  3. 机器的公开状态读取只通过 T004 的访问器 + 本任务新增的少量顶层访问器（如 `getRuntimeSnapshot(actor): RuntimeSnapshot`，返回不透明类型）。
- **Acceptance**：用 `ports` 全部替换成测试替身，验证一次完整的"加载章节→进入场景→开放互动→投票→锁定→解算→产出叙事"链路能跑通（用 T005/T006 已验证过的 fixture）；不替换 `ports`（用默认值）时机器同样能构造成功（不因为没有真实系统而崩溃）。

---

### T010 — Event Log 累积

- **Allowed Files**：`src/machine.ts`（延续 T009，同一批改动）
- **Requirements**：
  1. 机器需要维护一个内部 Event 序列（`RuntimeEvent[]`），每次 T005/T006 产出的事件追加进去，`sequence` 严格单调递增、全局唯一（不是每个 Region 各自计数）。
  2. 导出 `getEventLog(actor): readonly RuntimeEvent[]`（只读快照，不暴露可变数组引用）。
- **Acceptance**：一次完整链路跑完后，`getEventLog` 返回的序号严格递增无跳号；返回值的修改不影响机器内部状态（防篡改）。

---

### T011 — 全量验证、REPORT 与 commit

- **Allowed Files**：`specs/dev/DEV-009/INDEX.md`、`specs/dev/DEV-009/REPORT.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-009.md`
- **Requirements**：
  1. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  2. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  3. **`DECISIONS.md` 必须已提交**，且内容覆盖第 2 节列出的全部架构决策 + 骰子种子派生公式 + DICE 事件节奏简化说明。
  4. 更新 `INDEX.md`：T001–T011 全部勾选（注：Task Order 含 T010 但其改动并入 T009 同批提交，勾选时如实说明）。
  5. `git add -A && git commit`，提交信息首行：`DEV-009: xstate runtime kernel`。
  6. 追加 LEDGER 行，发 `NODE_REPORT`。
  7. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`REPORT.md` 引用的全部文档已入库；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-009 INDEX

Status: IN_PROGRESS

## Current Node

DEV-009 — XState Runtime Kernel

## Objective

建立根 XState 机器，STORY/INTERACTION 完整实现并串联前九个节点的全部纯函数包，
PRESENTATION/AUDIO 为骨架，HOST/PLATFORM/SAFETY 为占位。IO 边界全部走可替换 Port。

## Allowed Scope（新增文件）
（抄录 Task Package 第 3 节实际条目）

## Allowed Scope（既有文件，仅追加）
（抄录 Task Package 第 3 节实际条目）

## Read-only Scope
（抄录 Task Package 第 3 节实际条目）

## Forbidden Scope
（抄录 Task Package 第 3 节实际条目，含"不导出内部 snapshot 结构"）

## Task Order

- [ ] T001 节点文档
- [ ] T002 依赖追加
- [ ] T003 IO Port 接口
- [ ] T004 不透明 Snapshot 与访问器
- [ ] T005 STORY Region
- [ ] T006 INTERACTION Region
- [ ] T007 PRESENTATION / AUDIO Region 骨架
- [ ] T008 HOST / PLATFORM / SAFETY 占位 Region
- [ ] T009 根机器组装
- [ ] T010 Event Log 累积
- [ ] T011 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001（每完成一个 Task 立即勾选并更新本字段）

## Exit Criteria

六条命令全部退出码 0；一次完整"加载→场景→互动→投票→解算→叙事"链路可跑通并产出
单调递增的 Event Log；`index.ts` 不导出内部 snapshot 结构；`DECISIONS.md` 已入库
且覆盖全部架构决策；REPORT.md 完成且 Status = READY_FOR_REVIEW；已向 AUDITOR
发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **不透明 Snapshot 原则**：`index.ts` 绝不导出能让外部直接结构化访问内部字段的类型，只导出品牌类型 + 具名访问器。
2. **确定性**：机器内部不得出现裸 `Date.now()`/`Math.random()`，一切"现在几点"走 `ClockPort`。
3. **IO 全部可替换**：四个 Port 必须能在构造机器时被完全替换，默认值只是"不接真实系统"的占位，不是唯一实现路径。
4. **DICE 事件节奏是简化版**：本节点不实现"等待动画播完才发 PUBLISHED"，两个事件在同一次转移里依次产出，真实节奏控制留给 DEV-037。此简化必须记入 `DECISIONS.md`，不得含糊过去。
5. **不定义 Presentation/Audio 具体命令 schema**——那是 DEV-028/030 的职责，本节点的 Port 参数类型保持宽松占位。
6. **既有文件仅追加**（`package.json`/`tsconfig.json`/`index.ts`，只加不改）。
7. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
8. `CR-019`（getHealth 自落地起）**从本节点起适用**——这是第一个真正的运行时服务模块（会被持续调用），应提供某种健康状态查询，但具体形态（是否现在就实现 `getHealth()`，还是留给 DEV-061 统一规划）记入 `DECISIONS.md` 由 Commander 在审计时确认，不要自行深入设计一套健康检查体系（避免过度设计）——**最低要求**：机器结构本身要能回答"当前处于哪个 STORY 相位、是否卡在 ERROR"，这些已经由访问器满足，本节点不需要额外新建 `getHealth()` 函数。
9. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现真实的 SQLite 持久化（DEV-010）。
- 不实现"从 Event Log 重放重建状态并验证一致"的逻辑（DEV-011）——本节点只保证 Event Log 本身单调递增、内容完整，不做重放验证。
- 不实现对外 HTTP/IPC API（DEV-012）。
- 不定义 Presentation/Audio 的具体命令 schema（DEV-028/030）。
- 不实现 Dice Buffer 的节奏/等待逻辑（DEV-037）——本节点的 DICE 事件产出是简化的"立即依次发出"版本。
- 不实现 HOST/PLATFORM/SAFETY 的任何真实行为（M4/M5/M6）。
- 不接入真实 Twitch/Renderer/音频系统。
- 不创建真实产品内容。
- 不新建 `getHealth()` 健康检查体系（过度设计，留给 DEV-061 统一规划）。

---

## 11. Tests

### Unit tests

T003–T010 各自 `.test.ts`：覆盖第 7 节各任务描述的具体行为。

### Regression tests

`pnpm test` 覆盖全 workspace；既有全部包测试零回归。

### 其余测试类型

不适用（Simulation/Replay/Fuzz/Soak 属 DEV-007/011 及后续节点）。

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
| A07 | `runtime-kernel` 的 `dependencies` 含 `xstate` + 五个内部包 + 既有 `zod` | 文件检查 |
| A08 | `index.ts` 不导出任何暴露内部 snapshot 结构的类型（含 `@ts-expect-error` 测试证明） | 代码 + 测试检查 |
| A09 | 四个 Port 接口 + 默认实现存在且可用 | 测试检查 |
| A10 | STORY Region 10 态转移正确，`compile()` 失败/成功两条路径均正确 | 测试检查 |
| A11 | INTERACTION Region 6 态转移正确，改票覆盖、多 ActionGroup、DICE 三事件可见性均正确 | 测试检查 |
| A12 | PRESENTATION/AUDIO Region 状态可达，Port 调用正确 | 测试检查 |
| A13 | HOST/PLATFORM/SAFETY 占位 Region 存在且不影响机器整体结构 | 测试检查 |
| A14 | `createRuntimeMachine` 端到端链路（加载→场景→互动→投票→解算→叙事）可跑通 | 测试检查 |
| A15 | `getEventLog` 序号严格单调递增无跳号，返回值不可篡改内部状态 | 测试检查 |
| A16 | 包内不存在裸 `Date.now()`/`Math.random()`（`ClockPort`/`dice-engine` 内部实现之外） | grep 检查 |
| A17 | `DECISIONS.md` 存在，覆盖 xstate 版本选择、骰子种子派生公式、DICE 事件节奏简化说明、Snapshot 不透明设计理由 | 文件检查 |
| A18 | `specs/dev/DEV-009/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T011 全部勾选 | 文件 + 文本检查 |
| A19 | `git log` 新增恰 1 条提交，首行 `DEV-009: xstate runtime kernel`；提交时 `git status --porcelain` 为空 | 命令 |
| A20 | LEDGER 含 `NODE_REPORT-DEV-009` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A21 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**`、其它全部冻结包均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT（含确认 `DECISIONS.md` 已提交）→ commit → 发 NODE_REPORT → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A21。
