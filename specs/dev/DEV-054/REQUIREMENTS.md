# DEV-054 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-054.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- `persistence` 追加 `host_viewer_memory`/`host_running_jokes` 两张表
  （CR-017 延后建表，列约束强制：`platform`+`created_at`/`last_seen_at`）
  + `hostViewerMemory.ts`/`hostRunningJokes.ts` CRUD/机械删除函数。
- 新建独立包 `packages/host-memory`：`createHostMemory(db)`，四个
  转发方法 + `purge(retentionMsByPlatform)` + `getHealth()`。
- `host-memory` 不自持 DB 连接或 schema，不 import `node:sqlite`，
  不调用 `openDatabase`/`initSchema`。
- `purge` 的保留时长必须整个由调用方传入，不硬编码默认值，不做
  后台定时任务。

## Scope（Task Package 第 3 节）

Writable：`persistence/src/db.ts`（仅追加两张表）、
`hostViewerMemory.ts(.test.ts)`、`hostRunningJokes.ts(.test.ts)`、
`persistence/src/index.ts`（追加两行）、`packages/host-memory/**`
（新包全部文件）、根 `tsconfig.json`（追加一行引用）、
`specs/dev/DEV-054/*.md`、`specs/comms/LEDGER.md`（仅追加，写入不
提交）、`specs/comms/NNNN-OPENCODE-to-*.md`。

Forbidden（摘录）：不改 `viewerState.ts`/`health.ts`/
`sessionStore.ts`/`eventStore.ts`/`snapshotStore.ts`/`recovery.ts`/
`ai-host/**`/`platform-core/**`/`platform-twitch/**`/
`runtime-kernel/**`；`host-memory` 不能有 DB 连接/schema；不硬编码
保留时长；不做后台定时任务；不新增第三方依赖。

## Task Order

T001 节点文档 → T002 两张表 + CRUD + host-memory 新包 + 测试 +
全量验证 + REPORT + commit（**恰一条提交，LEDGER/NODE_REPORT 写入
工作区但不提交**）。
