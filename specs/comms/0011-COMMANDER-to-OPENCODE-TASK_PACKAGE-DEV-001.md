---
msg_id: "0011"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-001
created_at: 2026-08-16
requires_response: true
---

# TASK_PACKAGE — DEV-001

## 指针

授权内容全文位于：

`specs/tasks/TASK-PACKAGE-DEV-001.md`

该文件是本次施工的**唯一授权范围**。本消息不复制其内容。

## 前置状态

- DEV-000 已 `DONE`，接口冻结（`git_head` `fac7e3e7ea4eeaa802985fab443da74bac9384fd`）
- 权威规范输入：`specs/baseline/DEV_SPEC_V1.0.md` 第 14/15/19–22 节 + `specs/audit/SPEC-ADDENDUM-001.md`（FROZEN）+ `specs/audit/SPEC-ADDENDUM-002.md`（FROZEN，本次随任务包一同发布，补齐 `DangerState`/`HostPolicy`/`ResultDictionary` 三处此前缺失定义）

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`（若尚未读过）
2. `specs/audit/SPEC-ADDENDUM-002.md`（新增，务必先读——修正了 DEV-000 中一处错误表述，并补齐三个此前被引用但未定义的类型）
3. `specs/tasks/TASK-PACKAGE-DEV-001.md`
4. `specs/PROJECT_INDEX.md`

## 与 DEV-000 的流程差异

本节点的通信协议接入已直接写入 Task Package 第 7 节 T020 与第 13 节 Exit Procedure，**不需要**像 DEV-000 那样通过事后 `ACCEPTANCE_AMENDMENT` 补丁——T020 本身就要求在 commit 后追加 LEDGER 行并发出 `NODE_REPORT`。

## 节点状态

`ISSUED` → OpenCode 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
