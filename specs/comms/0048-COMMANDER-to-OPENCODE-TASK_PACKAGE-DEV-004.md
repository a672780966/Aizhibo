---
msg_id: "0048"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-004
created_at: 2026-08-18
requires_response: true
---

# TASK_PACKAGE — DEV-004

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-004.md`

## 前置状态

DEV-000/DEV-001/DEV-008/DEV-002/DEV-003/DEV-002A 均已 `DONE`。本节点是新包 `packages/rule-engine`，只依赖 `packages/chapter-schema` 的类型，不依赖 `chapter-compiler`/`runtime-kernel`。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`（若尚未读过）
2. `specs/tasks/TASK-PACKAGE-DEV-004.md`——**本节点全部测试用手写对象，不需要任何 fixture、不走文件系统**，这条已直接写进 Task Package，不用像 DEV-003 那样等澄清消息。
3. `specs/PROJECT_INDEX.md`

## 范围要点

本节点是全项目第一个真正的运行时包，但设计上仍是纯函数库：不做 IO、不发 Event、不维护跨调用状态。`StateRule.once` 的"记忆"责任明确交还给未来的调用方（DEV-009），本节点只返回"这次谁触发了"的信息。第 3 节 Task Breakdown 的"通用约定"段落和第 9 节 Constraints 把这些边界写得很细，务必先读。

## 节点状态

`ISSUED` → Codex 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
