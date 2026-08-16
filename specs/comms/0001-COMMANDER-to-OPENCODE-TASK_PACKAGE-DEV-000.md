---
msg_id: "0001"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-000
created_at: 2026-08-16
requires_response: true
retroactive: true
---

# TASK_PACKAGE — DEV-000

## 指针

授权内容全文位于：

`specs/tasks/TASK-PACKAGE-DEV-000.md`（版本 2）

该文件是本次施工的**唯一授权范围**。本消息不复制其内容，避免产生第二个真相源。

## 追溯说明

本消息为追溯登记。DEV-000 的 Task Package 在 `COMMS-PROTOCOL-V1` 建立之前已下发，为保证 LEDGER 完整性而补登序号 `0001`。

Task Package 本体不重写。协议要求的交付流程变更以消息 `0002`（ACCEPTANCE_AMENDMENT）形式追加。

## 节点状态

`ISSUED` → OPENCODE 开工后自行将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. 本消息与消息 `0002`
3. `specs/tasks/TASK-PACKAGE-DEV-000.md`
4. `specs/PROJECT_INDEX.md`
