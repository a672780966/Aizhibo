# TASK PACKAGE — DEV-007

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-007 |
| Node Name | Chapter Simulator（PASS 8 — Simulation） |
| Milestone | M1 — Story Machine Complete |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-009（DONE，`verdict_ref: "0080"`） |
| Commander | Claude |
| Executor | Codex（协议角色名 `OPENCODE`） |

### 追加式扩展已冻结的 `packages/runtime-kernel`

不新建包（Rev 2 冻结的 17 包列表里没有独立的 simulator 包）。本节点在已冻结的
`packages/runtime-kernel` 里新增文件，并对两个既有冻结文件做**唯一允许的追加式编辑**
（见第 3 节）。

### 本节点必须遵守 `DAG.md` CR-004（已冻结，不重新讨论）

> 复用 DEV-009 的同一个 Runtime statechart，**不得包含任何状态推进逻辑**；只替换 IO
> 边界：platform adapter → 虚拟观众生成器；audio → 空实现；presentation → 空实现；
> wall clock → 虚拟时钟。第 61 节的 Simulation / Replay / Fuzz 三类测试共用此驱动器，
> 输入策略不同而已。

也就是说：本节点**不写新的故事推进规则**，只写一个"外部驱动者"，通过已冻结的
`createRuntimeMachine`/`getStoryPhase`/`getInteractionPhase`（及本节点新增的一个访问器）
观察机器状态、发送已冻结的 `RootEvent`（`BOOT`/`STORY.DONE`/`INTERACTION.OPEN`/
`VOTE`/`LOCK`/`NARRATIVE.DONE`）把整局游戏跑完。

---

## 2. 架构设计（Commander 已核对真实代码后做出的决策，Codex 按此实现）

### 2.1 驱动循环的真实机制——已核对 `packages/runtime-kernel` 现有源码

`storyRegion.ts`/`interactionRegion.ts`（均 Read-only，只读不改）里的转移已确认如下事实：

- `BOOT → CHAPTER_LOADING → SCENE_ENTER → STORY_PLAYING` 全部是 `always`（无事件自动转移），
  发一次 `BOOT` 之后，`actor.send({type:'BOOT'})` 返回时机器已经稳定在 `STORY_PLAYING`
  （compile 失败则稳定在 `ERROR`）。
- `STORY_PLAYING` **需要外部发 `STORY.DONE`** 才会往下走（`storyHasInteraction`/
  `hasNextScene` 两个内部 guard 决定去 `INTERACTION_PENDING` 还是 `TRANSITION` 还是
  `CHAPTER_END`，驱动方不需要预先知道走哪条分支）。
- `INTERACTION` Region 的 `CLOSED` 态**需要外部发 `INTERACTION.OPEN`** 才会走
  `ANNOUNCING`（自动）`→ OPEN`。`STORY` 进入 `INTERACTION_PENDING` 后**不会自动**把
  `INTERACTION` 从 `CLOSED` 推走——两者只共享 context，不互相发消息（DEV-009
  `DECISIONS.md` D7），驱动方必须显式发 `INTERACTION.OPEN`。
- `OPEN` 态收集 `VOTE` 事件（`viewerId`/`choiceId`，后票覆盖前票），驱动方发 `LOCK` 后
  `LOCKING → LOCKED(onResolve，同步完成掷骰+规则求值+叙事合成+效果落盘) → RESOLVED`
  全部 `always` 级联；同时 `STORY` 侧的 `INTERACTION_PENDING → RESOLUTION_PENDING →
  RESULT_PLAYING` 也会在同一次 `send` 内级联完成（XState 对 parallel 机器的 eventless
  转移是整机解到不动点，不是只解收到事件的那个 Region）。
- `RESULT_PLAYING` **需要外部发 `NARRATIVE.DONE`** 才会走向 `TRANSITION`（循环回
  `SCENE_ENTER`）或 `CHAPTER_END`。

**结论**：整局驱动只需要在恰当时机发送三类事件——`STORY.DONE`、`INTERACTION.OPEN`+
`VOTE`*+`LOCK`、`NARRATIVE.DONE`——配合读 `getStoryPhase`/`getInteractionPhase` 决定
"现在该发什么"。这就是驱动循环的全部状态机知识，不需要（也不允许）重新实现任何
guard/转移判定。

### 2.2 唯一需要新增的访问器——`getCurrentChoiceIds`

驱动方在 `INTERACTION` 的 `OPEN` 态需要知道"这一轮有哪些 `choiceId` 可以投"，才能生成
虚拟投票。但 `RuntimeActor.getSnapshot()` 按 DEV-009 的设计（CR-008 类型层可见性分区）
是**故意不透明**的，不能直接读 `compiled`/`currentSceneId`/`world`。

处置：新增**一个**窄接口访问器（对齐 DEV-009 `DECISIONS.md` D3 的原则——"每加一个外部
允许知道的东西就显式写一个访问器"，不开口子），实现逻辑直接复用已冻结的
`currentScene()`（`storyRegion.ts` 已导出）在 `machine.ts` 内部读取 `context.compiled`/
`context.currentSceneId`：

```typescript
export function getCurrentChoiceIds(actor: RuntimeActor): string[]
```

- 若当前场景没有 `interactionId`，或找不到对应 `InteractionNode`，返回 `[]`。
- 否则返回 `interaction.choices.map(c => c.id)`。
- **这不是泄漏**：choice 列表在真实产品里本来就是全体观众可见的公开信息（第 24 节
  Choice UI 的输入），与 G06（Hidden Information）无关，不违反 CR-008 的分区原则。

这是本节点对 `machine.ts`/`index.ts` 两个冻结文件的**唯一**追加式编辑内容，不改动任何
既有行。

### 2.3 虚拟 IO 边界——只换 CR-004 点名的两个

`DAG.md` CR-004 原文只要求换 platform 与 wall clock；presentation/audio 继续用
DEV-009 已提供的 `noopPresentationPort`/`noopAudioPort`（无需重新实现）：

```typescript
export const virtualClockPort: ClockPort  // 单调递增的假时钟，不摸 Date.now()
export const virtualPlatformPort: PlatformPort  // 结构占位，满足类型；onVote 当前不接线
```

**如实记录一处发现但不修复的既有缺口**：核对 `machine.ts` 后确认 `context.ports.platform
.onVote(...)` 在当前冻结代码里**从未被调用**——所有 `VOTE` `RootEvent` 都是外部直接
`actor.send({type:'VOTE',...})` 送进去的，`PlatformPort.onVote` 回调注册机制是 DEV-009
遗留的未接线脚手架（`machine.test.ts` 现有测试也是直接 `send(VOTE)`，印证这一事实）。
`runtime-kernel` 的这部分接口已冻结，**本节点不修复它**，`virtualPlatformPort.onVote`
同样留空——虚拟观众的投票通过驱动循环直接 `actor.send({type:'VOTE',...})` 注入，与既有
测试用法一致。这一发现记入 `DECISIONS.md`，不算本节点的 BLOCKING 问题。

### 2.4 虚拟观众生成器——确定性、无 `Math.random()`

沿用项目已建立的确定性红线（`dice-engine` DECISIONS 先例）：虚拟投票的"多少个观众/
投给哪个选项"由一个**纯函数、种子驱动的哈希**决定，不用 `Math.random()`/`Date.now()`。

```typescript
export function generateVotes(input: {
  seed: string; runIndex: number; step: number; choiceIds: string[];
  minViewers?: number; maxViewers?: number;  // 默认 [1, 10]
}): Array<{ viewerId: string; choiceId: string }>
```

同一输入永远产出同一批投票——这是 `runSimulation` 整体确定性可复现（A14）的基础，也是
Replay（DEV-011）未来复用同一批种子驱动测试的前提。哈希实现方式不强制复用
`dice-engine` 内部实现（该函数未导出），允许 Codex 自行手写一个同风格的 FNV-1a 或等价
纯哈希，记入 `DECISIONS.md`。

### 2.5 驱动主循环——`runSimulation`

```typescript
export interface SimulationRunResult {
  runIndex: number;
  seed: string;
  outcome: 'CHAPTER_END' | 'ERROR' | 'STUCK';
  steps: number;
}
export interface SimulationReport {
  totalRuns: number;
  passed: number;   // outcome === 'CHAPTER_END' 的数量
  failed: number;    // ERROR 或 STUCK 的数量
  runs: SimulationRunResult[];
}

export function runSimulation(input: {
  chapterRootDir: string;
  runs: number;
  seedPrefix?: string;   // 默认 'sim'
  maxSteps?: number;     // 默认 200，单局故事推进步数上限（防跑不完的死循环）
  minViewers?: number;
  maxViewers?: number;
}): SimulationReport
```

单局循环（每局一个独立 `createRuntimeMachine`，`ports: { ...defaultPorts, clock:
virtualClockPort, platform: virtualPlatformPort }`）：

1. `actor.send({type:'BOOT'})`
2. 循环直到达到 `maxSteps` 或终态：
   - `getStoryPhase(actor) === 'CHAPTER_END'` → 记 `CHAPTER_END`，跳出
   - `=== 'ERROR'` → 记 `ERROR`，跳出
   - `=== 'STORY_PLAYING'` → `send({type:'STORY.DONE'})`
   - `=== 'INTERACTION_PENDING'`：
     - `getInteractionPhase(actor) === 'CLOSED'` → `send({type:'INTERACTION.OPEN'})`
     - `=== 'OPEN'` → 用 `getCurrentChoiceIds` + `generateVotes` 生成投票，逐条
       `send({type:'VOTE',...})`，再 `send({type:'LOCK'})`（`choiceIds` 为空时直接
       `send({type:'LOCK'})`，不生成投票）
     - 其余（`LOCKING`/`LOCKED`/`RESOLVED` 理论上不会在此处被外部观察到，因为
       `always` 已级联完成）→ 视为内部不变量被打破，立即记 `STUCK`，跳出（不要用空转
       掩盖潜在 bug）
   - `=== 'RESULT_PLAYING'` → `send({type:'NARRATIVE.DONE'})`
   - 其余 `STORY` 相位（`BOOT`/`CHAPTER_LOADING`/`SCENE_ENTER`/`RESOLUTION_PENDING`/
     `TRANSITION`）理论上同样不会被外部观察到（全是 `always` 级联的瞬时态）→ 同样立即
     记 `STUCK`，跳出
   - 每次循环 `steps` 计数 +1；超过 `maxSteps` 仍未到终态 → 记 `STUCK`
3. 汇总 `passed`/`failed`/`runs`，返回 `SimulationReport`。

`seed`（传给 `createRuntimeMachine`）与 `generateVotes` 的种子均从 `${seedPrefix}-
${runIndex}` 派生，公式记入 `DECISIONS.md`。

---

## 3. Scope

### Writable Scope — 新增文件

```
packages/runtime-kernel/src/virtualPorts.ts
packages/runtime-kernel/src/virtualPorts.test.ts
packages/runtime-kernel/src/simulatorVotes.ts
packages/runtime-kernel/src/simulatorVotes.test.ts
packages/runtime-kernel/src/simulator.ts
packages/runtime-kernel/src/simulator.test.ts
```

### Writable Scope — 既有文件，仅追加（唯二两个文件，逐行核对不得删改既有内容）

```
packages/runtime-kernel/src/machine.ts   （追加 getCurrentChoiceIds，不改动任何既有行）
packages/runtime-kernel/src/index.ts     （追加导出，不改动任何既有行）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-007/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/runtime-kernel/src/event.ts、diceEvent.ts、ports.ts、snapshot.ts、
  storyRegion.ts、interactionRegion.ts、presentationRegion.ts、audioRegion.ts、
  placeholderRegions.ts（及各自 .test.ts）——DEV-009 冻结，一行不许改
packages/runtime-kernel/package.json、tsconfig.json——本节点不需要新依赖，不动
packages/chapter-schema/**、packages/chapter-compiler/**（含 test-fixtures/**）、
  packages/rule-engine/**、packages/dice-engine/**、packages/narrative-composer/**、
  packages/shared/**
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
Math.random()、裸 Date.now()（虚拟时钟必须是确定性假实现）
真实的 Twitch/Renderer/Audio 接入代码
对 `PlatformPort.onVote` 接线机制的"修复"（DEV-009 已冻结接口，见 2.3，不在本节点范围）
新建独立的 `chapter-simulator` 包（Rev 2 冻结 17 包列表无此包，禁止提前建包）
在 CI/测试中真的跑 10,000+/100,000+ 局（见 Non-goals）
```

---

## 4. Required Skills

### Required

- 阅读/调用 XState v5 机器的公开 actor 接口（`send`/`getSnapshot`），不需要修改机器定义
- 确定性哈希/伪随机生成（无状态、纯函数、可复现）

### Forbidden / Unnecessary

- 修改 XState 机器定义本身（`storyRegion.ts`/`interactionRegion.ts` 等）
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `createRuntimeMachine`/`getStoryPhase`/`getInteractionPhase`（runtime-kernel，DEV-009 冻结） | 驱动循环的全部状态观测与事件发送接口 |
| `defaultPorts`/`noopPresentationPort`/`noopAudioPort`（runtime-kernel，DEV-009 冻结） | Presentation/Audio 边界保持不变（CR-004 只要求换 platform/clock） |
| `packages/chapter-compiler/test-fixtures/valid-minimal`（Read-only 引用） | 端到端仿真测试的章节素材，复制到临时目录使用（照抄 `machine.test.ts` 现有手法，不直接改动 fixture 本体） |

---

## 6. Outputs

1. `virtualClockPort`/`virtualPlatformPort`（`virtualPorts.ts`）
2. `generateVotes`（`simulatorVotes.ts`）——纯函数、确定性投票生成器
3. `getCurrentChoiceIds`（追加进 `machine.ts`）
4. `runSimulation`/`SimulationReport`/`SimulationRunResult`（`simulator.ts`）
5. `specs/dev/DEV-007/DECISIONS.md`，记录：种子派生公式、`PlatformPort.onVote` 未接线
   的既有发现（不修复）、哈希实现选择、`maxSteps`/`minViewers`/`maxViewers` 默认值理由

---

## 7. Task Breakdown

> **通用约定**：全部测试复用 `packages/chapter-compiler/test-fixtures/valid-minimal`
> （只读引用，按 `machine.test.ts` 现有手法复制到临时目录），不新建独立 fixture 目录。

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-007/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Acceptance**：四文件存在；`INDEX.md` 含 Task Order T001–T007。

---

### T002 — `getCurrentChoiceIds` 访问器

- **Allowed Files**：`packages/runtime-kernel/src/machine.ts`（**仅追加**，不改动任何既有行）、`packages/runtime-kernel/src/index.ts`（**仅追加**一行导出）
- **Requirements**：
  1. 按第 2.2 节签名实现 `getCurrentChoiceIds(actor: RuntimeActor): string[]`，复用已导出的 `currentScene()`。
  2. 场景无 `interactionId`、`interactionId` 指向不存在的 interaction、`compiled === null` 三种情况均返回 `[]`，不抛异常。
  3. `index.ts` 追加 `export { getCurrentChoiceIds } from './machine.js';`。
- **Acceptance**：对 `valid-minimal` 的 `scene-start`（有 `interaction-01`）返回非空 choiceId 列表；对不含 interaction 的场景（可用 `machine.test.ts` 已有的 `makeNoInteractionChapter` 手法或等价临时 fixture）返回 `[]`；`git diff` 显示 `machine.ts`/`index.ts` 只有新增行，无删除/修改行。

---

### T003 — 虚拟 Port

- **Allowed Files**：`src/virtualPorts.ts`、`src/virtualPorts.test.ts`
- **Requirements**：
  1. `virtualClockPort: ClockPort`——内部用单调递增计数器（如从 0 起，每次 `now()` 调用自增固定步长），不调用真实 `Date.now()`。
  2. `virtualPlatformPort: PlatformPort`——`sendChat` 返回已 resolve 的 Promise，不做任何真实 IO；`onVote` 留空实现（第 2.3 节已说明理由，注释写明"当前未接线，故意保留空实现"）。
- **Acceptance**：`virtualClockPort.now()` 连续调用返回严格递增且与真实系统时间无关（测试里 mock/冻结不了真实时钟也能验证——只需验证两次调用差值恒定或严格递增，不依赖 wall clock）；`virtualPlatformPort` 满足 `PlatformPort` 类型且方法调用不抛异常。

---

### T004 — 确定性投票生成器

- **Allowed Files**：`src/simulatorVotes.ts`、`src/simulatorVotes.test.ts`
- **Requirements**：
  1. 按第 2.4 节签名实现 `generateVotes`，纯函数、无 `Math.random()`/`Date.now()`。
  2. `choiceIds` 为空数组时返回 `[]`。
  3. 同一输入（含 `seed`/`runIndex`/`step`/`choiceIds`）多次调用返回逐字节相同结果。
  4. `minViewers`/`maxViewers` 默认 `[1, 10]`，生成的 viewer 数量落在区间内（含边界）。
- **Acceptance**：确定性回归测试（同输入两次调用 `toEqual`）；不同 `choiceIds` 长度 > 1 时，多次不同 `step`/`runIndex` 组合下确认生成过至少两种不同的 `choiceId` 分布（证明不是恒定返回同一个选项）。

---

### T005 — 驱动主循环 `runSimulation`

- **Allowed Files**：`src/simulator.ts`、`src/simulator.test.ts`
- **Requirements**：按第 2.5 节实现完整循环逻辑，使用 T002–T004 的产物 + 已冻结的
  `createRuntimeMachine`/`getStoryPhase`/`getInteractionPhase`/`defaultPorts`/
  `noopPresentationPort`/`noopAudioPort`。
- **Acceptance**：
  - 对 `valid-minimal`（复制到临时目录，不改动只读源）跑 `runs: 50`、不同
    `seedPrefix`，全部 `outcome === 'CHAPTER_END'`（`passed === 50`，`failed === 0`）。
  - 用极小 `maxSteps`（如 `1`）跑同一 fixture，至少一局 `outcome === 'STUCK'`
    （验证步数上限确实生效，不会挂死测试进程）。
  - 相同输入（`chapterRootDir`/`runs`/`seedPrefix`/`maxSteps`）调用 `runSimulation`
    两次，两次返回的 `SimulationReport` 深度相等（确定性，A14）。
  - 至少一次运行里出现过 `viewerCount > 1` 分裂到不同 `choiceId` 的情形（可通过
    `getEventLog` 观察到同一局内出现 ≥2 组 `DICE.REQUESTED` 事件来验证）。

---

### T006 — Public exports

- **Allowed Files**：`packages/runtime-kernel/src/index.ts`（延续 T002 的追加式编辑，同一批或独立提交均可，仍不得改动既有行）
- **Requirements**：追加导出 `runSimulation`、`generateVotes`、`virtualClockPort`、`virtualPlatformPort`，以及类型 `SimulationReport`/`SimulationRunResult`。
- **Acceptance**：全部新符号可从包外 `import { runSimulation } from '@interactive-story/runtime-kernel'` 拿到；`git diff` 对 `index.ts` 只有新增行。

---

### T007 — 全量验证、REPORT 与 commit

- **Allowed Files**：`specs/dev/DEV-007/INDEX.md`、`specs/dev/DEV-007/REPORT.md`、`specs/dev/DEV-007/DECISIONS.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-007.md`
- **Requirements**：
  1. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  2. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  3. **`DECISIONS.md` 必须已提交**，覆盖：种子派生公式、`PlatformPort.onVote` 未接线发现、投票哈希实现选择、`maxSteps`/`minViewers`/`maxViewers` 默认值理由。
  4. 更新 `INDEX.md`：T001–T007 全部勾选。
  5. `git add -A && git commit`，提交信息首行：`DEV-007: chapter simulator`。
  6. 追加 LEDGER 行，发 `NODE_REPORT`。
  7. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`REPORT.md` 引用的全部文档已入库；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-007 INDEX

Status: IN_PROGRESS

## Current Node

DEV-007 — Chapter Simulator（PASS 8 — Simulation）

## Objective

在已冻结的 `runtime-kernel` 上追加一个 headless 驱动器：复用 DEV-009 的同一个
Runtime statechart（不新增任何状态推进逻辑），只替换 platform/clock 两个 IO 边界为
虚拟实现，跑通"加载→随机选择→解算→转场→重复"的完整循环，产出确定性可复现的
`SimulationReport`。

## Allowed Scope（新增文件）
（抄录 Task Package 第 3 节实际条目）

## Allowed Scope（既有文件，仅追加）
（抄录 Task Package 第 3 节实际条目——machine.ts / index.ts，且逐行核对不得删改既有内容）

## Read-only Scope
（抄录 Task Package 第 3 节实际条目）

## Forbidden Scope
（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 getCurrentChoiceIds 访问器
- [ ] T003 虚拟 Port
- [ ] T004 确定性投票生成器
- [ ] T005 驱动主循环 runSimulation
- [ ] T006 Public exports
- [ ] T007 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001（每完成一个 Task 立即勾选并更新本字段）

## Exit Criteria

六条命令全部退出码 0；50 局 `valid-minimal` 仿真全部 `CHAPTER_END`；`maxSteps` 步数
上限验证生效；两次相同输入调用 `runSimulation` 结果逐字节一致；`machine.ts`/
`index.ts` 的 git diff 只有新增行；`DECISIONS.md` 已入库；REPORT.md 完成且
Status = READY_FOR_REVIEW；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **不得修改任何既有状态机定义**——`storyRegion.ts`/`interactionRegion.ts`/
   `presentationRegion.ts`/`audioRegion.ts`/`placeholderRegions.ts`/`ports.ts`/
   `snapshot.ts`/`event.ts`/`diceEvent.ts` 一律 Read-only。驱动器只能通过已冻结的
   公开函数观察与驱动，不能"顺手"改一处 guard 让测试更好过。
2. **`machine.ts`/`index.ts` 仅追加**，`git diff` 必须逐行核对只有新增，无删改。
3. **确定性红线**：不得出现 `Math.random()`/裸 `Date.now()`；虚拟时钟、投票生成器都必须是纯函数/确定性实现。
4. **不修复 `PlatformPort.onVote` 未接线的既有缺口**（第 2.3 节已说明，DEV-009 冻结接口，超出本节点授权范围；如认为确实需要修，发 `EXECUTOR_QUERY`，不要自行动手）。
5. **不新建独立包**，一切新代码落在 `packages/runtime-kernel/src/` 下。
6. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
7. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- **不在 CI/本节点测试里真的跑 10,000+/100,000+ 局**。Dev Spec 第 69 节 G02（100,000
  次 Simulation PASS）是**正式上线前**的产品级 Gate，需要真实 Chapter 内容（M7/M8 才
  产出），本节点只交付可复用的驱动器本身 + 用现有占位 fixture 做的规模适中（50 局）
  回归验证，证明驱动器机制本身正确。
- 不实现 Replay Test（DEV-011 的职责）——本节点产出确定性 `SimulationReport`/Event
  Log，但不验证"用同一 Event Log 重放能重建相同状态"。
- 不实现 Fuzz Test 里 Disconnect/Reconnect/重复消息/Late event 场景（依赖 M4 平台层，
  DEV-042/043/045 未建）。
- 不新增/修改任何 Chapter Pack 内容（`chapters/**` 禁止触碰）。
- 不新建 CLI 脚本或 `apps/**` 下的可执行入口——本节点只交付包内导出函数 + 测试。
- 不修复 DEV-009 遗留的 `PlatformPort.onVote` 未接线问题。

---

## 11. Tests

### Unit tests

T002–T006 各自 `.test.ts`：覆盖第 7 节各任务描述的具体行为。

### Regression tests

`pnpm test` 覆盖全 workspace；既有全部包测试零回归。

### 其余测试类型

不适用（Replay/Fuzz/Soak 属 DEV-011 及后续节点）。

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
| A07 | `getCurrentChoiceIds` 对有/无 interaction 的场景均正确返回，`compiled === null` 时返回 `[]` 不抛异常 | 测试检查 |
| A08 | `machine.ts`/`index.ts` 的 `git diff` 只包含新增行，无删除/修改任何既有行 | git diff 比对 |
| A09 | `virtualClockPort`/`virtualPlatformPort` 满足对应 Port 类型且不触碰真实系统 | 测试检查 |
| A10 | `generateVotes` 确定性（同输入两次调用结果相同）、`Math.random()`/`Date.now()` 零出现 | 测试 + grep 检查 |
| A11 | `runSimulation` 对 `valid-minimal` 跑 50 局全部 `CHAPTER_END`（`passed===50`，`failed===0`） | 测试检查 |
| A12 | 极小 `maxSteps` 下至少一局 `outcome==='STUCK'`，不挂死测试进程 | 测试检查 |
| A13 | 相同输入两次调用 `runSimulation` 结果深度相等（确定性） | 测试检查 |
| A14 | 至少一局内出现 ≥2 组不同 `choiceId` 的 `DICE.REQUESTED` 事件（多 ActionGroup 分裂被真实驱动到） | 测试检查（读 `getEventLog`） |
| A15 | `packages/chapter-compiler/test-fixtures/valid-minimal` 未被修改（只读引用，测试用临时目录复制） | git diff 比对 |
| A16 | `packages/runtime-kernel` 除 `machine.ts`/`index.ts` 外的既有冻结文件 git diff 为空 | git diff 比对 |
| A17 | `runtime-kernel/package.json`/`tsconfig.json` 未修改（本节点无新依赖） | git diff 比对 |
| A18 | `DECISIONS.md` 存在，覆盖种子派生公式、`PlatformPort.onVote` 未接线发现、哈希实现选择、默认值理由 | 文件检查 |
| A19 | `specs/dev/DEV-007/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T007 全部勾选 | 文件 + 文本检查 |
| A20 | `git log` 新增恰 1 条提交，首行 `DEV-007: chapter simulator`；提交时 `git status --porcelain` 为空 | 命令 |
| A21 | LEDGER 含 `NODE_REPORT-DEV-007` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A22 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT（含确认 `DECISIONS.md` 已提交）→ commit → 发 NODE_REPORT → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A22。
