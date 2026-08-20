# DEV-007 REQUIREMENTS

本文件由 OpenCode 在 T001 从 `specs/tasks/TASK-PACKAGE-DEV-007.md` 的架构、范围与任务要求整理而成；权威版本仍为 Task Package。

## 目标

在冻结的 `runtime-kernel` 上追加 Chapter Simulator，复用 DEV-009 statechart，仅替换 platform/clock 两个 Port。驱动循环发送 `STORY.DONE`、`INTERACTION.OPEN`、`VOTE`、`LOCK`、`NARRATIVE.DONE`，不重新实现 guard 或状态转移。

## Public API

- `getCurrentChoiceIds(actor): string[]`
- `virtualClockPort` / `virtualPlatformPort`
- `generateVotes(input)`
- `runSimulation(input): SimulationReport`
- `SimulationRunResult` / `SimulationReport`

## Determinism

投票生成器必须是纯函数，使用种子驱动哈希，不得使用 `Math.random()` 或裸 `Date.now()`。每局 seed 派生为 `${seedPrefix}-${runIndex}`；默认 `seedPrefix = 'sim'`、`maxSteps = 200`、`minViewers = 1`、`maxViewers = 10`。

## Scope

新增 simulator/virtual port 源文件及单元测试；`machine.ts` 只追加 `getCurrentChoiceIds`，`index.ts` 只追加公共导出。Chapter fixture 只读，测试复制到临时目录后才可变更。

## Out of scope

不修改冻结 statechart、Port 接口或 Chapter 内容；不修复 `PlatformPort.onVote` 未接线缺口；不实现 CLI、Replay、Fuzz、Soak、真实平台或真实 Renderer/Audio 接入。
