# DEV-010 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-010.md` 抄录并整理，权威版本为 Task
Package 原文。

## Scope

新建 `packages/persistence`，包含 SQLite 连接/建表、session store、event store、snapshot
store、recovery、viewer state、health 与公开入口及其测试。仅追加 `runtime-kernel` 的
`getPersistedSnapshot`/`restoreRuntimeMachine`，并在根 solution 追加 persistence reference。

## Requirements

- 只创建 `runtime_sessions`、`runtime_events`、`runtime_snapshots`、`viewer_states` 四张表。
- 使用 Node 内置 `node:sqlite` 的 `DatabaseSync`，不新增 npm 依赖。
- `RuntimeSnapshot` 通过 XState `getPersistedSnapshot()` / `createActor(machine, { snapshot })`
  opaque 地存取，不解析其内部结构。
- LKG 采用写穿透：每次事件追加后保存完整 persisted snapshot；不实现 DEV-011 的事件回放。
- `chapterId` 是当前缺少 Chapter Version 字段时的替代标识；不修改 chapter-schema。
- `viewer_states` 严格使用 `platform + viewerId` 复合键，`created_at` 只首次插入，
  `last_seen_at` 每次 upsert 更新。
- `getHealth()` 用 `SELECT 1` 返回 `Health`；运维遥测可使用 `Date.now()`。

## Task Order

T001 文档；T002 脚手架；T003 runtime-kernel 恢复耦合点；T004 db/schema；T005 session/event
store；T006 snapshot/recovery；T007 viewer state；T008 health；T009 exports、全量验证、报告、
commit 与 NODE_REPORT。

## Non-goals

不建 `audio_cache`、`platform_events`、`errors`、`chapter_runs`、`host_viewer_memory`、
`host_running_jokes`；不实现 Replay、purge/retention、迁移框架、Operator Console 或真实
runtime driver/server 接入。
