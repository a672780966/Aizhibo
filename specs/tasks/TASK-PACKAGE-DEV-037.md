# TASK PACKAGE — DEV-037

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-037 |
| Node Name | Dice Buffer Controller |
| Milestone | M3 — Audio Complete（第七个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-009（DONE）——`interactionRegion.ts` 的 `LOCKING` 状态；DEV-011（DONE）——`replayFromEventLog` 需要追加式扩展 |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`，`--provider commandcode --model deepseek/deepseek-v4-flash`） |

### 现实核对：`LOCKING` 状态从 DEV-009 起就是一个空的占位

`packages/runtime-kernel/src/interactionRegion.ts` 里 `OPEN → LOCKING → LOCKED`
的 `LOCKING` 状态自 DEV-009 冻结以来一直是：

```typescript
LOCKING: {
  always: { target: 'LOCKED', actions: 'onResolve' },
},
```

一个**瞬时、无延迟**的过渡态——`LOCK` 事件送达后，骰子/规则/叙事在同一个
微步批次内全部计算完毕，`DICE_INTRO`（DEV-025）与紧随其后的 `DICE_RESULT`
几乎在同一时刻发出。这个空占位状态的存在本身就是 DEV-009 为未来"真实节奏
控制"预留的插入点——本节点是第一次真正使用它。

### 范围核对：CR-018 把本节点重定位为"节奏控制器"，安全阀部分现在造不出来

`DAG.md`："重定位为节奏控制器 + 延迟安全阀。常态按 `targetDiceMs` 走叙事
节奏。"已核对 Dev Spec 第 31 节：`AUDIO_READY?` 分支（就绪则 `DICE_RESOLVE`，
未就绪继续 `DICE_LOOP`，`maxDiceMs` 到达后降级）需要一个真实的"TTS 是否已
就绪"信号——但 DEV-030/031/034/035/036 全部一致地把"把 TTS 决策/调用接入
`onResolve` 这条同步 action 链"列为**未来重开边界**（DEV-031 `DECISIONS.md`
D2 已明确记录），至今没有任何节点做过这次重开，系统里**根本不存在**
`AUDIO_READY` 信号。因此本节点**只能实现"常态"分支**——固定按
`targetDiceMs` 暂停，不等待任何真实信号；`minDiceMs`/`maxDiceMs` 与
"安全阀"分支留给未来把真实异步 TTS 接入 `onResolve` 的节点一并实现，不在
本节点提前定义未使用的常量（过度设计）。

### 关键工程风险：真实延迟会拖垮 Simulator/Replay，必须同步注入可控时钟

`packages/runtime-kernel/src/simulator.ts`（DEV-007，10 万局仿真）与
`replay.ts`（DEV-011）都通过 `createRuntimeMachine` 驱动真实的
`LOCK` 事件。一旦 `LOCKING` 有真实延迟，若不做任何处理，`createActor` 默认
用 XState 的真实时钟（`setTimeout`），10 万局仿真与既有测试套件里每一次
`LOCK` 都会真的卡 `targetDiceMs`（毫秒级但仍是真实等待）——测试套件的墙钟
耗时会从现在的十几秒暴涨。**本节点必须同时给 `createRuntimeMachine` 增加
可注入的 XState `clock` 选项，并把现有会触发 `LOCK` 的测试与
`simulator.ts` 全部接上一个"立即触发"的假时钟**，否则视为本节点自己引入
的性能回归。

---

## 2. 架构设计

### 2.1 新增 `packages/runtime-kernel/src/diceTiming.ts`

```typescript
/** Dev Spec §31 示例值，作为"常态"骰子节奏的字面默认值。 */
export const TARGET_DICE_MS = 6000;
```

只导出当前真正被消费的常量。`minDiceMs`/`maxDiceMs`（安全阀分支）留给未来
真正实现该分支的节点一并添加，本节点不提前定义未被使用的常量。

### 2.2 `interactionRegion.ts`：`LOCKING` 从 `always` 改为 `after`

```typescript
// 改前
LOCKING: {
  always: { target: 'LOCKED', actions: 'onResolve' },
},
// 改后
LOCKING: {
  after: {
    DICE_PACING: { target: 'LOCKED', actions: 'onResolve' },
  },
},
```

状态拓扑（状态名、事件名、其余全部转移）不变，只把这一条 `always` 换成
`after`。`onResolve` 本身（骰子/规则/叙事计算逻辑）逐字节不动——本节点只
改变"什么时候触发"，不改变"触发时算什么"。

### 2.3 `machine.ts`：`delays` 配置 + 可注入 `clock`

```typescript
// MachineConfig 顶层追加：
delays: {
  DICE_PACING: () => TARGET_DICE_MS,
},
```

```typescript
// createRuntimeMachine / restoreRuntimeMachine 的 input 追加：
clock?: Clock;   // from 'xstate'
// 传给 createActor：
const actor = createActor(makeRuntimeMachine(...), { clock: input.clock, ... });
```

不传 `clock` 时使用 XState 默认（真实）时钟——这正是生产环境要的行为：
`LOCKING` 真的会停留约 `TARGET_DICE_MS`。

### 2.4 `virtualPorts.ts`：新增 `instantClock`

```typescript
import type { Clock } from 'xstate';

/** 立即触发的假时钟：setTimeout 同步执行回调，返回值域延迟归零。
 *  仅供 Simulator/Replay/测试注入，避免真实卡顿；生产环境从不使用。 */
export const instantClock: Clock = {
  setTimeout: (fn) => {
    fn();
    return 0;
  },
  clearTimeout: () => {},
};
```

### 2.5 `simulator.ts` 与 `replay.ts` 接入 `instantClock`

- `simulator.ts` 的 `runOne` 里 `createRuntimeMachine({...})` 调用追加
  `clock: instantClock`。
- `replay.ts` 的 `replayFromEventLog` **追加式**新增 `clock?: Clock` 输入
  字段（`Ports` 之外的独立字段，不进 `Ports` 接口——它是 XState actor 级
  概念，不是本项目的 IO 边界 Port），透传给内部的 `createRuntimeMachine`
  调用。调用方（未来消费 `replayFromEventLog` 的代码）若要避免真实延迟，
  自行传入 `instantClock`——本节点不强制默认值，保持向后兼容（不传时行为
  与生产一致，是有意的设计，不是遗漏）。

### 2.6 既有测试的连带更新（防止本节点自己引入性能回归）

以下已冻结的测试文件里，凡是驱动过真实 `LOCK` 事件、通过
`createRuntimeMachine`/`replayFromEventLog` 构造 actor 且未显式传
`clock` 的用例，必须追加 `clock: instantClock`：`machine.test.ts`、
`presentationCommand.test.ts`、`replay.test.ts`、`simulator.test.ts`（如果
后者不是全部通过 `runSimulation` 间接构造 actor，需要单独检查）。**只允许
追加 `clock: instantClock` 这一个字段，不允许改动任何既有断言的判定逻辑**。

---

## 3. Scope

### Writable Scope

```
packages/runtime-kernel/src/diceTiming.ts            （新增）
packages/runtime-kernel/src/diceTiming.test.ts       （新增，如有必要）
packages/runtime-kernel/src/interactionRegion.ts     （仅 LOCKING 一处：always → after）
packages/runtime-kernel/src/machine.ts               （追加 delays 配置 + clock 参数，两处 createActor 调用）
packages/runtime-kernel/src/machine.test.ts          （追加新用例 + 既有 LOCK 用例追加 clock: instantClock）
packages/runtime-kernel/src/virtualPorts.ts          （追加 instantClock 导出）
packages/runtime-kernel/src/simulator.ts             （runOne 追加 clock: instantClock）
packages/runtime-kernel/src/replay.ts                （追加式新增 clock 输入字段）
packages/runtime-kernel/src/replay.test.ts           （既有 LOCK 用例追加 clock: instantClock）
packages/runtime-kernel/src/presentationCommand.test.ts （既有 LOCK 用例追加 clock: instantClock）
packages/runtime-kernel/src/simulator.test.ts        （如需要，追加 clock: instantClock）
packages/runtime-kernel/src/index.ts                 （追加导出 TARGET_DICE_MS/instantClock，如尚未导出）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-037/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，`---` 分隔线之前，待处理表须同步更新）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/runtime-kernel/src/{onResolve 相关的骰子/规则/叙事计算逻辑本身、
  storyRegion.ts、audioRegion.ts、resultAudioResolution.ts、ports.ts、
  presentationCommand.ts}——除第 2 节明确列出的改动点外逐字节不动
apps/renderer/**（本节点不改动 Renderer——LOOP 动画已经是"转到 DICE_RESULT
  到达为止"，服务端延迟一旦变真实，视觉效果自动同步变真实，不需要改客户端）
packages/audio-engine/**
其余同既有节点惯例
```

### Forbidden Scope

```
实现 AUDIO_READY 安全阀分支（minDiceMs/maxDiceMs 消费逻辑）——无真实信号可用，未来节点职责
把 resolveResultAudio/TtsProviderPort/AudioCache 接入本节点的任何逻辑
修改 onResolve 内部的骰子/规则/叙事计算逻辑本身
修改 apps/renderer 任何文件
修改既有测试的判定逻辑/断言内容（只能追加 clock: instantClock 字段）
新增任何 npm 依赖（xstate 已是既有依赖，Clock 类型直接从中导入）
```

---

## 4. Required Skills

### Required

- XState v5 延迟转移（`after`/`delays` 配置）与自定义 `clock` 注入
- 识别并系统性更新所有受影响的既有测试，防止无意引入性能回归

### Forbidden / Unnecessary

- 任何真实定时器/调度库（XState 内建机制已足够）
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/baseline/DEV_SPEC_V1.0.md` 第 31 节 | Dice Buffer 时序与 `minDiceMs/targetDiceMs/maxDiceMs` 定义 |
| `packages/runtime-kernel/src/interactionRegion.ts`（Read-only 参照，仅 LOCKING 可写） | 确认 `LOCKING` 是唯一改动点 |
| `packages/runtime-kernel/src/simulator.ts`/`replay.ts`（Read-only 参照，指定行可写） | 确认现有 actor 构造方式，找到需要追加 `clock` 的精确位置 |
| XState `Clock` 类型定义（`node_modules/xstate` 类型声明） | `{setTimeout(fn,timeout):any; clearTimeout(id):void}` |

---

## 6. Outputs

1. `TARGET_DICE_MS`（`diceTiming.ts`）
2. `interactionRegion.ts` 的 `LOCKING` 状态改为真实延迟转移
3. `machine.ts` 的 `delays` 配置 + `createRuntimeMachine`/`restoreRuntimeMachine`
   新增可选 `clock` 参数
4. `virtualPorts.ts` 的 `instantClock`
5. `simulator.ts`/`replay.ts` 接入 `instantClock`（避免真实变慢）
6. `specs/dev/DEV-037/DECISIONS.md`，至少覆盖：为何采用第 31 节示例值作为
   字面默认（1 节）、为何不提前定义 `minDiceMs`/`maxDiceMs`（2.1）、为何
   安全阀分支不在本节点实现（1 节）、`clock` 作为独立参数而非塞进 `Ports`
   的理由（2.5）、如何验证测试套件墙钟耗时未回归

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-037/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Acceptance**：四文件存在；`INDEX.md` 含 Task Order T001–T004。

---

### T002 — `diceTiming.ts` + `interactionRegion.ts` + `machine.ts`

- **Allowed Files**：`packages/runtime-kernel/src/{diceTiming.ts,diceTiming.test.ts,interactionRegion.ts,machine.ts}`
- **Requirements**：按第 2.1/2.2/2.3 节实现。
- **Acceptance**：
  - `interactionRegion.ts` 的 diff 只有 `LOCKING` 一处（`always`→`after`），
    其余状态/转移逐字节不变。
  - 新增测试：用一个"记录型"假 `clock`（`setTimeout` 记录被请求的
    `timeout` 参数值后不真的调用回调）驱动 `LOCK`，断言请求的延迟毫秒数
    恰好等于 `TARGET_DICE_MS`——证明 `delays` 配置真的生效，不是摆设。
  - 新增测试：用 vitest 假定时器（`vi.useFakeTimers()`）+ **默认（生产）
    时钟**（不传 `clock`）驱动 `LOCK`，断言 `vi.advanceTimersByTime(TARGET_DICE_MS - 1)`
    后仍处于 `LOCKING`，再推进 1ms 后转为 `LOCKED` 且 `onResolve` 已执行
    （`DICE_RESULT` 已发出）——证明默认行为是真实延迟，不是意外仍然瞬时。

---

### T003 — `virtualPorts.ts` + `simulator.ts`/`replay.ts` 接入 + 既有测试更新

- **Allowed Files**：`packages/runtime-kernel/src/{virtualPorts.ts,simulator.ts,replay.ts,machine.test.ts,replay.test.ts,presentationCommand.test.ts,simulator.test.ts,index.ts}`
- **Requirements**：按第 2.4/2.5/2.6 节实现。
- **Acceptance**：
  - `pnpm test` 整体墙钟耗时与 DEV-036 收尾时处于同一量级（不得出现秒级
    真实等待导致的显著变慢——`REPORT.md` 必须记录本次与上一次的
    `pnpm test` 实测耗时对比）。
  - 既有测试断言内容（判定逻辑）零改动，只追加 `clock: instantClock` 字段。
  - `runSimulation`（DEV-007 冻结产物）在默认调用方式下（不改调用方签名）
    继续正常工作，仿真吞吐量未退化。

---

### T004 — `index.ts` 导出 + 全量验证、REPORT 与 commit

- **Allowed Files**：`packages/runtime-kernel/src/index.ts`、`specs/dev/DEV-037/INDEX.md`、`REPORT.md`、`DECISIONS.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-037.md`
- **Requirements**：
  1. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`（记录墙钟耗时）。
  2. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项，含测试耗时对比。
  3. **`DECISIONS.md` 必须已提交**，覆盖第 6 节列出的全部要点。
  4. 更新 `INDEX.md`：T001–T004 全部勾选，`Status:` 改为 `READY_FOR_REVIEW`。
  5. `git add -A && git commit`，提交信息首行：`DEV-037: dice buffer controller`。
  6. 追加 LEDGER 行（主表 `---` 分隔线之前，待处理表同步更新），发 `NODE_REPORT`。
  7. **在结束前自行核实**：`git log -1` 能看到你的提交、NODE_REPORT 消息
     文件已存在、LEDGER 主表与待处理表均已正确更新。三者缺一都不算完成。
  8. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`pnpm test` 墙钟耗时未显著回归；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-037 INDEX

Status: IN_PROGRESS

## Current Node

DEV-037 — Dice Buffer Controller

## Objective

把 `interactionRegion.ts` 里自 DEV-009 起就空置的 `LOCKING` 占位状态接上
真实的骰子节奏延迟（`always`→`after`，按 Dev Spec 第 31 节示例值
`TARGET_DICE_MS=6000`），CR-018 重定位为"节奏控制器"（安全阀/AUDIO_READY
分支因无真实信号可用，留给未来节点）。同步给 `createRuntimeMachine` 增加
可注入 XState `clock`，并把 Simulator/Replay/既有测试全部接上立即触发的
假时钟，避免本节点自己引入真实的墙钟耗时回归。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 diceTiming.ts + interactionRegion.ts + machine.ts
- [ ] T003 virtualPorts.ts + simulator.ts/replay.ts 接入 + 既有测试更新
- [ ] T004 index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；`pnpm test` 墙钟耗时未显著回归；延迟毫秒数与默认
真实时钟行为均已验证；`DECISIONS.md` 已入库；REPORT.md 完成且 Status =
READY_FOR_REVIEW；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **`interactionRegion.ts` 只改 `LOCKING` 一处**，其余状态拓扑逐字节不变。
2. **不实现 AUDIO_READY 安全阀分支**（第 1 节已说明理由）。
3. **既有测试断言逻辑不得改动**，只能追加 `clock: instantClock` 字段。
4. **`pnpm test` 墙钟耗时不得显著回归**——这是本节点最容易踩坑的地方，
   必须在 REPORT.md 记录实测对比。
5. **不新增任何 npm 依赖**。
6. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
7. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现 `minDiceMs`/`maxDiceMs`/`AUDIO_READY` 安全阀分支（无真实信号，未来节点职责）。
- 不把真实 TTS 决策/调用接入 `onResolve`（那是一次独立的、更大的架构 CR，仍未发生）。
- 不修改 `apps/renderer`（LOOP 视觉效果因服务端延迟变真实而自动同步，无需改动）。
- 不实现降级到"字幕+BGM+SFX"的逻辑（依赖安全阀分支，本节点不做）。

---

## 11. Tests

### Unit tests

T002：记录型假时钟验证延迟毫秒数；vitest 假定时器验证默认时钟下的真实延迟
行为（提前不转移、到点转移）。

### Regression tests

`pnpm test` 覆盖全 workspace；既有全部包测试零回归**且墙钟耗时未显著变慢**。

---

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归；墙钟耗时未显著回归（REPORT.md 记录对比） | 命令输出 |
| A07 | 记录型假时钟证明 `LOCKING` 请求的延迟恰为 `TARGET_DICE_MS` | 测试检查 |
| A08 | vitest 假定时器 + 默认时钟：提前 1ms 仍 `LOCKING`，到点转 `LOCKED` 且 `onResolve` 已执行 | 测试检查 |
| A09 | `interactionRegion.ts` 仅 `LOCKING` 一处改动，其余逐字节未变 | git diff 比对 |
| A10 | `onResolve` 内部计算逻辑本身逐字节未变 | git diff 比对 |
| A11 | Simulator（`runSimulation`）注入 `instantClock` 后吞吐量未退化 | 命令输出 |
| A12 | 既有 LOCK 相关测试断言逻辑零改动，只追加 `clock` 字段 | git diff 比对 |
| A13 | `apps/renderer/**`、`packages/audio-engine/**` 未被修改 | git diff 比对 |
| A14 | 未新增任何 npm 依赖 | 文件检查 |
| A15 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A16 | `specs/dev/DEV-037/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T004 全部勾选，`Status:` 表头改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A17 | `git log` 新增恰 1 条提交，首行 `DEV-037: dice buffer controller`；提交时 `git status --porcelain` 为空 | 命令 |
| A18 | LEDGER 含 `NODE_REPORT-DEV-037` 记录（主表分隔线之前，待处理表已同步），`git_head` 一致 | LEDGER + 命令比对 |
| A19 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证（含耗时对比）→ 确认零回归 → 填
REPORT（含确认 `DECISIONS.md` 已提交）→ commit → 发 NODE_REPORT（含 LEDGER
主表位置正确、待处理表同步）→ 自行核实完成三要素 → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A19，另需在 Tests Executed
小节记录 `pnpm test` 本次与上一次的墙钟耗时对比。
