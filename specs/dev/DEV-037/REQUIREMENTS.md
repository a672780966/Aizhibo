# DEV-037 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-037.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- `interactionRegion.ts` 的 `LOCKING` 状态从 `always`（瞬时）改为
  `after: { DICE_PACING: {...} }`（真实延迟），是 DEV-009 起就空置的占位
  第一次被真正使用。
- `machine.ts` 新增 `delays: { DICE_PACING: () => TARGET_DICE_MS }`
  （`TARGET_DICE_MS=6000`，第 31 节示例值）+ `createRuntimeMachine`/
  `restoreRuntimeMachine` 新增可选 `clock?: Clock`（来自 `xstate`）参数，
  透传给 `createActor`。不传时用 XState 真实时钟（生产行为）。
- `virtualPorts.ts` 新增 `instantClock`：`setTimeout` 立即同步执行回调，
  专供 Simulator/Replay/测试注入，避免真实卡顿。
- `simulator.ts`（`runOne`）与 `replay.ts`（`replayFromEventLog`，追加式
  新增 `clock` 字段）接入 `instantClock`。
- **既有会驱动 `LOCK` 的测试文件必须追加 `clock: instantClock`**，防止
  `pnpm test` 墙钟耗时因本节点引入真实延迟而回归——这是本节点的核心工程
  风险点。
- 不实现 `minDiceMs`/`maxDiceMs`/`AUDIO_READY` 安全阀分支——系统里目前
  没有任何真实的"TTS 是否就绪"信号，实现分支等于凭空发明判断依据。

## Scope（Task Package 第 3 节）

Writable：`diceTiming.ts(.test.ts)`（新增）、`interactionRegion.ts`（仅
`LOCKING`）、`machine.ts`（追加）、`machine.test.ts`、`virtualPorts.ts`（追加）、
`simulator.ts`、`replay.ts`（追加）、`replay.test.ts`、
`presentationCommand.test.ts`、`simulator.test.ts`、`index.ts`（追加）、
`specs/dev/DEV-037/*.md`、`specs/comms/LEDGER.md`（仅追加）、
`specs/comms/NNNN-OPENCODE-to-*.md`。

Forbidden（摘录）：不实现安全阀分支；不改 `onResolve` 内部计算逻辑；不改
`apps/renderer`；不改既有测试判定逻辑（只能追加 `clock` 字段）；不新增依赖。

## Task Order

T001 节点文档 → T002 `diceTiming.ts`/`interactionRegion.ts`/`machine.ts` →
T003 `virtualPorts.ts`/`simulator.ts`/`replay.ts` 接入 + 既有测试更新（含
墙钟耗时不回归验证）→ T004 `index.ts` 导出 + 全量验证 + REPORT + commit +
NODE_REPORT。
