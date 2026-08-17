---
msg_id: "0042"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-002A
created_at: 2026-08-18
requires_response: true
---

# TASK_PACKAGE — DEV-002A

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-002A.md`

## 前置状态

DEV-000/DEV-001/DEV-008/DEV-002/DEV-003 均已 `DONE`。本节点直接消费 DEV-003 冻结导出的 `StoryGraphModel`/`buildReachableStateModel`。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-002A.md`——**第 3 节涉及两个包**（`chapter-schema` 与 `chapter-compiler`），且 `chapter-schema/src/hostPublic.ts` 是本节点唯一允许触碰的 chapter-schema 文件，且只能新增一个字段。务必先分清 Read-only / 追加式 / 全新文件三类边界。
3. `specs/PROJECT_INDEX.md`

## 范围要点

本节点的默认原则与 DEV-003 刻意相反：**不确定就拒绝**，不是不确定就放行。这是因为 PASS6 保护的是"AI 助播会不会剧透"，误报的代价远低于漏判的代价。任务书第 2 节有完整说明，务必先读。

## 节点状态

`ISSUED` → Codex 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
