---
msg_id: "0023"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-002
created_at: 2026-08-17
requires_response: true
---

# TASK_PACKAGE — DEV-002

## 指针

授权内容全文位于：

`specs/tasks/TASK-PACKAGE-DEV-002.md`

该文件是本次施工的**唯一授权范围**。

## 前置状态

- DEV-000/DEV-001/DEV-008 均已 `DONE`，接口冻结
- 权威规范输入：Dev Spec 第 19/23/24 节 + `packages/chapter-schema`（冻结）+ `SPEC-ADDENDUM-001.md` §A18 + `SPEC-ADDENDUM-002.md` §B4

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`（若尚未读过，注意附录 B2/B3 近期更新：审核员改用 general-purpose 降级路径 + 中文输出约束；汇报交接行格式）
2. `specs/tasks/TASK-PACKAGE-DEV-002.md`
3. `specs/PROJECT_INDEX.md`

## 范围要点

本节点是全仓库第一个被授权读取文件系统的包（`packages/chapter-compiler`）。只做 PASS 1（Schema）与 PASS 2（Reference），不做图分析/覆盖/隐藏信息/仿真——这些边界在 Task Package 第 9/10 节写得很细，越界判定会很严格。

## 节点状态

`ISSUED` → OpenCode 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
