# DEV-011 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-011.md` 抄录并整理，权威版本为 Task
Package 原文。

## Scope

在 `packages/runtime-kernel` 新增 `voteExtraction.ts`、`replay.ts`、`replayCompare.ts` 及
各自测试；仅追加 `src/index.ts` 的公开导出。不得修改既有状态机、persistence 或其它包，
不得新增 npm 依赖。

## Requirements

- `extractVoteRounds(events)` 扫描 `INTERACTION.VOTE`，在 `INTERACTION.LOCKING` 处分轮，
  忽略其它事件类型。
- `replayFromEventLog` 复用 DEV-007 的相位驱动循环，从历史日志提取投票并从零重建 Actor；
  缺少所需投票轮次或步数耗尽时明确报错。
- `compareEventLogs` 按序比较 `type`、深比较 `payload`、`chapterId`、`visibility`、
  `sessionId`；默认排除 `id` 与 `timestamp`，长度差异也报告 divergence。
- 使用确定性时钟时，原始日志与重放日志另做包含 `id`/`timestamp` 的全字段比较。
- `DECISIONS.md` 必须记录投票重放而非 RuntimeEvent 重放、字段排除理由，以及与 DEV-010 LKG 的边界。

## Task Order

T001 文档；T002 投票轮次提取；T003 重放驱动器；T004 日志比较；T005 公开导出；T006 全量
验证、报告、提交与 NODE_REPORT。
