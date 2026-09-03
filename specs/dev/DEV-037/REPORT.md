# DEV-037 REPORT

## 1. Status

READY_FOR_REVIEW

## 2. Implemented

- 新增 `diceTiming.ts`：`export const TARGET_DICE_MS = 6000;`（Dev Spec
  第 31 节示例值，字面默认，见 DECISIONS D1）。只导出当前真正被消费的
  常量，不提前定义 `minDiceMs`/`maxDiceMs`（D2）。
- `interactionRegion.ts`：`LOCKING` 状态唯一一处改动——`always`（瞬时）→
  `after: { DICE_PACING: { target: 'LOCKED', actions: 'onResolve' } }`
  （真实延迟）。其余状态/转移逐字节不变；`onResolve` 内部计算逻辑逐字节
  不动（只改"什么时候触发"，不改"触发时算什么"）。
- `machine.ts`：
  - `MachineConfig` 注解第 6 泛型显式收窄为 `'DICE_PACING'`（默认值
    `ProvidedActor`/`ParameterizedObject` 占位），使 config 声明的延迟名与
    `createMachine` 第二参 implementations 的推断一致（D6）。
  - `delays: { DICE_PACING: () => TARGET_DICE_MS }` 追加进 createMachine
    第二参 implementations（`MachineConfig` 顶层是 `types`，`delays` 在
    implementations 对象；Task Package 2.3 的"MachineConfig 顶层追加"按
    XState v5 实际 API 落位）。
  - 本地结构镜像 `Clock` 接口（XState v5 顶层不导出 `Clock`，见 D5），
    `createRuntimeMachine`/`restoreRuntimeMachine` 输入追加可选
    `clock?: Clock`，条件合并进 `createActor` options（`exactOptionalPropertyTypes`
    下用 `if (input.clock !== undefined)` 模式，镜像 `replay.ts` 既有
    `input.ports !== undefined` 写法）。不传 → XState 默认真实时钟。
- `virtualPorts.ts`：新增 `instantClock`——`setTimeout` 同步立即执行回调、
  返回 0；`clearTimeout` 空操作。仅供 Simulator/Replay/测试注入，生产从不
  使用。
- `simulator.ts`：`runOne` 的 `createRuntimeMachine` 调用追加
  `clock: instantClock`（10 万局仿真不真实卡 6s）。
- `replay.ts`：`replayFromEventLog` **追加式**新增可选 `clock?: Clock` 输入
  字段（独立于 `Ports`，不透传进 ports；是 XState actor 级概念），透传给内部
  `createRuntimeMachine`。调用方若要避免真实延迟自行传 `instantClock`，本
  节点不强制默认值（不传 = 生产真实行为，有意设计）。
- `index.ts`：追加导出 `TARGET_DICE_MS` 与 `instantClock`。
- 既有测试更新（断言逻辑零改动，只追加 `clock: instantClock` 字段）：
  `machine.test.ts` 9 处、`presentationCommand.test.ts` 1 处、
  `replay.test.ts`（`driveFixedVote` 内部构造 + 4 处 `replayFromEventLog`
  调用）、`simulator.test.ts` 1 处直接构造。见 DECISIONS D8。
- 新增 2 条 DEV-037 验收测试（`machine.test.ts` 新 describe）：
  - A07 记录型假时钟：`setTimeout` 记录请求的 `timeout` 后不调用回调，
    驱动 `LOCK`，断言请求的延迟包含 `TARGET_DICE_MS`——证明 `delays`
    配置真的生效。
  - A08 vitest 假定时器 + 默认（生产）时钟（不传 `clock`）：`LOCK` 后处于
    `LOCKING`；`advanceTimersByTime(TARGET_DICE_MS - 1)` 仍 `LOCKING` 且
    `onResolve` 未执行（无 `DICE_RESULT`）；再推进 1ms 后折叠至 `RESOLVED`
    且 `DICE_RESULT` 已发出——证明默认行为是真实延迟。断言的稳定状态是
    `RESOLVED` 而非 `LOCKED`（`LOCKED` 的 `always` 瞬时边同微步折叠，见 D7）。

## 3. Changed Files

Writable Scope 内共 11 个文件（10 改 + 1 新增），全部为 Task Package 第 3
节允许清单内：

```text
packages/runtime-kernel/src/diceTiming.ts             （新增）
packages/runtime-kernel/src/interactionRegion.ts      （仅 LOCKING 一处）
packages/runtime-kernel/src/machine.ts
packages/runtime-kernel/src/machine.test.ts
packages/runtime-kernel/src/virtualPorts.ts
packages/runtime-kernel/src/simulator.ts
packages/runtime-kernel/src/replay.ts
packages/runtime-kernel/src/replay.test.ts
packages/runtime-kernel/src/presentationCommand.test.ts
packages/runtime-kernel/src/simulator.test.ts
packages/runtime-kernel/src/index.ts
specs/dev/DEV-037/INDEX.md / DECISIONS.md / REPORT.md
specs/comms/LEDGER.md（仅追加）
specs/comms/0163-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-037.md
```

`apps/renderer/**`、`packages/audio-engine/**`、Task/Spec/Audit/Protocol
文件均未修改。`recovery.test.ts`（persistence，out-of-scope）未修改——其
同步断言实测不受真实延迟影响（见 D9）。

## 4. Tests Executed

六条命令严格按要求顺序执行，全部退出码 0：

| # | 命令 | 结果 |
|---|---|---|
| 1 | `pnpm install` | 0；Already up to date |
| 2 | `pnpm typecheck` | 0 |
| 3 | `pnpm lint` | 0 |
| 4 | `pnpm format:check` | 0；All matched files use Prettier code style |
| 5 | `pnpm build` | 0 |
| 6 | `pnpm test` | 0；105 test files passed，562 tests passed（DEV-036 基线 560，新增 2） |

**墙钟耗时对比**（A06 核心）：

| 节点 | vitest Duration | 命令墙钟 | 测试数 |
|---|---|---|---|
| DEV-036 收尾 | — | ~13 s（记录于 DEV-036 REPORT） | 560 |
| DEV-037 收尾 | 10.73 s | 12.3 s | 562 |

同一量级，无秒级真实等待导致的显著变慢。`simulator.ts` 注入 `instantClock`
后 `runSimulation` 默认调用方式（签名未变）吞吐未退化（simulator.test.ts 50
局批跑通过）。persistence `recovery.test.ts`（out-of-scope，未注入 clock）
实测文件级测试耗时 39ms，pending 真实定时器不影响结果（D9）。

## 5. Acceptance Results

| # | 判定 | 结果 | 依据 |
|---|---|---|---|
| A01 | `pnpm install` 退出码 0 | PASS | Tests Executed #1 |
| A02 | `pnpm typecheck` 退出码 0 | PASS | Tests Executed #2 |
| A03 | `pnpm lint` 退出码 0 | PASS | Tests Executed #3 |
| A04 | `pnpm format:check` 退出码 0 | PASS | Tests Executed #4 |
| A05 | `pnpm build` 退出码 0 | PASS | Tests Executed #5 |
| A06 | `pnpm test` 退出码 0、既有零回归、墙钟未显著回归 | PASS | 105 files / 562 tests（560→562 零回归）；12.3s vs ~13s 基线 |
| A07 | 记录型假时钟证明请求延迟恰为 `TARGET_DICE_MS` | PASS | A07 新测试（`requested` 含 `TARGET_DICE_MS`） |
| A08 | 假定时器 + 默认时钟：提前 1ms 仍 `LOCKING`、到点转出且 `onResolve` 已执行 | PASS | A08 新测试（提前 1ms `LOCKING` 无 `DICE_RESULT`；+1ms `RESOLVED` + `DICE_RESULT`，D7） |
| A09 | `interactionRegion.ts` 仅 `LOCKING` 一处改动 | PASS | git diff：4 行改动均在 `LOCKING` 块 |
| A10 | `onResolve` 内部计算逻辑逐字节未变 | PASS | git diff：`onResolve` action 无改动 |
| A11 | Simulator 注入 `instantClock` 后吞吐量未退化 | PASS | `runSimulation` 签名未变，50 局批跑通过；全量墙钟同量级 |
| A12 | 既有 LOCK 测试断言零改动，只追加 `clock` 字段 | PASS | git diff：断言行零改动，仅 `clock: instantClock`/import/格式化 |
| A13 | `apps/renderer/**`、`packages/audio-engine/**` 未被修改 | PASS | 交付 diff 为空 |
| A14 | 未新增任何 npm 依赖 | PASS | package.json 未修改 |
| A15 | `DECISIONS.md` 覆盖第 6 节全部要点 | PASS | D1–D9 |
| A16 | 节点文档齐全、INDEX T001–T004 勾选、Status=READY_FOR_REVIEW | PASS | `specs/dev/DEV-037/` |
| A17 | 恰 1 条新提交、首行 `DEV-037: dice buffer controller`、提交时 porcelain 为空 | PASS | 本次交付 commit 核验 |
| A18 | LEDGER 含 NODE_REPORT-DEV-037、待处理表同步、git_head 一致 | PASS | commit 后追加消息与 LEDGER 行 |
| A19 | PROJECT_INDEX/DAG/tasks/audit/protocol 未修改 | PASS | 交付 diff 为空 |

## 6. Scope Check

只施工 DEV-037。`interactionRegion.ts` 只有 `LOCKING` 一处 diff（`always`→
`after`）；`onResolve` 内部骰子/规则/叙事计算逐字节未动；没有实现
`AUDIO_READY` 安全阀/`minDiceMs`/`maxDiceMs`（无真实信号，未来节点职责，
D2/D3）；没有把 `resolveResultAudio`/`TtsProviderPort`/`AudioCache` 接入
本节点任何逻辑；没有修改 `apps/renderer/**`、`packages/audio-engine/**`；
没有修改任何既有测试的断言判定逻辑（只追加 `clock: instantClock` 字段 +
格式化的结构性换行）；没有新增 npm 依赖；没有推进其他 DEV 节点。

## 7. Commit

提交信息首行：`DEV-037: dice buffer controller`。

`DECISIONS.md` 已包含在该提交中。

## 8. Handoff

NODE_REPORT 发往 `AUDITOR`，抄送 `COMMANDER`；审核锚点与交付快照见
`specs/comms/0163-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-037.md`。
