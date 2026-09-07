# DEV-054 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-054 — Viewer Memory

## Objective

`persistence` 追加 `host_viewer_memory`/`host_running_jokes` 两张表
（CR-017 延后至本节点建表，列约束强制：`platform`+
`created_at`/`last_seen_at`）+ 对应 CRUD/机械删除函数；新建独立包
`packages/host-memory`（`createHostMemory(db)`），不自持 DB 连接或
schema，`purge()` 按调用方传入的 per-platform 保留时长清理过期
数据，不硬编码默认值，不做后台定时任务。

## Allowed Scope

```
packages/persistence/src/db.ts                （修改，仅追加两张表定义）
packages/persistence/src/hostViewerMemory.ts(.test.ts)   （新增）
packages/persistence/src/hostRunningJokes.ts(.test.ts)   （新增）
packages/persistence/src/index.ts             （修改，仅追加两行导出）
packages/host-memory/**                       （新包全部文件）
tsconfig.json                                  （根，修改，追加一行引用）
specs/dev/DEV-054/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
packages/persistence/src/viewerState.ts、health.ts、sessionStore.ts、eventStore.ts、snapshotStore.ts、recovery.ts（Read-only，不改）
packages/ai-host/**（Read-only，不 import）
其余同既有节点惯例
```

## Forbidden Scope

```
修改 packages/persistence/src/viewerState.ts、health.ts、sessionStore.ts、eventStore.ts、snapshotStore.ts、recovery.ts
修改 packages/ai-host/**、packages/platform-core/**、packages/platform-twitch/**、packages/runtime-kernel/**
在 host-memory 包内 import 'node:sqlite'、调用 openDatabase/initSchema、编写任何 CREATE TABLE
实现相关性排序/摘要/相似度检索算法
实现后台定时清理任务
硬编码任何全局保留时长默认值
接入 Host Scheduler/Host LLM Provider/prompt 拼装
新增第三方 npm 依赖
```

## Task Order

- [x] T001 节点文档
- [x] T002 两张表 + CRUD + host-memory 新包 + 测试 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）
- [x] T003（CHANGE_REQUEST 0261）：`host_viewer_memory` schema 按 Dev Spec 第 42 节修正为 nickname/interactionCount/knownRunningJokes/hostAffinity/notableEvents 结构化字段，替换原自由文本 `note` 字段

## Current Task

T001–T003 已全部完成（T003 = CR 0261 host_viewer_memory schema 修正）。

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与
NODE_REPORT 消息文件已写入工作区但**未提交**。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
