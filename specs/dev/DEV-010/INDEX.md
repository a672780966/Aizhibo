# DEV-010 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-010 — Persistence

## Objective

首次创建 `packages/persistence`：SQLite（Node 内置 `node:sqlite`）存储
`runtime_sessions`/`runtime_events`/`runtime_snapshots`/`viewer_states` 四张表；用 XState 原生
`getPersistedSnapshot`/`createActor(machine,{snapshot})` 实现写穿透 LKG，崩溃后可恢复 Runtime
Actor，不需要事件回放（那是 DEV-011 的职责）。

## Allowed Scope（新建包）

`packages/persistence` 的 package/tsconfig、db/session/event/snapshot/recovery/viewer/health
源码与测试，以及 `src/index.ts` 公开导出。

## Allowed Scope（既有文件，仅追加）

`packages/runtime-kernel/src/machine.ts`、`packages/runtime-kernel/src/index.ts` 与根
`tsconfig.json`（仅追加 persistence reference）。

## Read-only / Forbidden Scope

其它 packages、apps、chapters、assets、scripts、tools、规范正本、PROJECT_INDEX、DAG、tasks、
audit、protocol；不得新增 npm 依赖，不建六张延后表，不实现 Replay、purge/retention、迁移
框架或真实驱动接入。

## Task Order

- [x] T001 节点文档
- [x] T002 新包脚手架
- [x] T003 runtime-kernel 追加：LKG 序列化耦合点
- [x] T004 db.ts：连接与建表
- [x] T005 sessionStore.ts + eventStore.ts
- [x] T006 snapshotStore.ts + recovery.ts（写穿透 LKG + 恢复）
- [x] T007 viewerState.ts
- [x] T008 health.ts
- [x] T009 Public exports + 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

—（T001–T009 全部完成，节点 READY_FOR_REVIEW，待向 AUDITOR 发 NODE_REPORT）

## Exit Criteria

六条命令全部退出码 0；端到端崩溃恢复测试通过（恢复后状态与崩溃前逐字段一致）；
`machine.ts`/`index.ts` 的 git diff 只有新增行；`DECISIONS.md` 已入库；REPORT.md 完成且
Status = READY_FOR_REVIEW；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。OpenCode 禁止自行推进下一 DEV Node。
