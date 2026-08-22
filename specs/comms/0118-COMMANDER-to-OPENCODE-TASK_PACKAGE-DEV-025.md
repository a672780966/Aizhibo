---
msg_id: "0118"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-025
created_at: 2026-08-22
requires_response: true
---

# TASK_PACKAGE — DEV-025

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-025.md`

## 前置状态

DEV-024 已 `DONE`（接口冻结）。本节点是 M2 第六个节点，两处窄范围 CR：`onLock`（首次）
与 `onResolve`（首次），都在 INTERACTION region。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-025.md`——**第 1/2 节务必先读**：`DICE.*` 事件目前
   只写进 Event Log，从不转发给 Presentation。本节点是第一次让骰子数据流向 Renderer。
   **LOOP 阶段是本地视觉过渡，不是真实等待**——真正的节奏控制是 DEV-037（M3，尚未建）
   的职责，不要在本节点里越权实现。
3. `specs/PROJECT_INDEX.md`

## 关于本节点范围

`DICE_RESULT` 只下发展示相关字段（`diceType`/`rawValue`/`modifier`/`finalValue`/
`quality`），丢弃 `seed`/`rollIndex`/`appliedModifiers`（内部记账字段，`DICE.PUBLISHED`
本就是 PUBLIC 可见性，下发不构成新的信息泄露）。

## 上一轮的教训

`DECISIONS.md` 必须随最终提交一起入库；`INDEX.md` 的 `Status:` 表头请主动改到位。

## 节点状态

`ISSUED` → Codex 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
