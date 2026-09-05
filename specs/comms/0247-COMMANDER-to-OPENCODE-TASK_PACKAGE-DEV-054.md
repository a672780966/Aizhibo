---
msg_id: "0247"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-054
in_reply_to: "0246"
created_at: 2026-09-05
requires_response: true
---

# TASK_PACKAGE — DEV-054

M5 第六个节点：Viewer Memory。详见
`specs/tasks/TASK-PACKAGE-DEV-054.md`。

`persistence` 追加 `host_viewer_memory`/`host_running_jokes` 两张表
——CR-017 当年（DEV-010 起草时）明确把这两张表的建表本身延后到本
节点，列约束（`platform`+`created_at`/`last_seen_at`）是强制约束。
新建独立包 `packages/host-memory`（仓库最终 17 包列表里的一员），
`createHostMemory(db)` 提供记忆/梗的读写转发 + 按 per-platform 保留
时长清理过期数据；`host-memory` 明确不得自持 DB 连接或 schema
（DAG.md 第 413 行），schema/CRUD 全部留在 `persistence`。

DEV-054 转 `IN_PROGRESS`。
