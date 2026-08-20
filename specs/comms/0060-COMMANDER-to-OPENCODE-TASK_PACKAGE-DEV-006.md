---
msg_id: "0060"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-006
created_at: 2026-08-20
requires_response: true
---

# TASK_PACKAGE — DEV-006

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-006.md`

## 前置状态

DEV-000/DEV-001/DEV-008/DEV-002/DEV-003/DEV-002A/DEV-004/DEV-005 均已 `DONE`。本节点**不新建包**，追加式扩展两个已存在的包：`packages/rule-engine`（DEV-004）与 `packages/chapter-compiler`（DEV-002/003/002A）。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-006.md`——**第 3 节的 Scope 分四块**（rule-engine 新增/追加、chapter-compiler 新增/追加），比以往更细，务必先分清楚。第 2 节有一条关键架构澄清：本节点**不掷骰**，只消费 `dice-engine` 已经算好的结果类型，不调用它的任何函数。
3. `specs/PROJECT_INDEX.md`

## 上一轮的教训

DEV-004 因 `DECISIONS.md` 未提交被判 FAIL。本节点大概率需要 `DECISIONS.md`（`playerStateSummary` 省略理由、`worldState` 保留理由、`mapsTo` 单跳限制理由），T008 已把"确认已入库"列为明确要求。

## 节点状态

`ISSUED` → Codex 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
