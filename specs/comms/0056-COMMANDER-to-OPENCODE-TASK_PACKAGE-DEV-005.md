---
msg_id: "0056"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-005
created_at: 2026-08-20
requires_response: true
---

# TASK_PACKAGE — DEV-005

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-005.md`

## 前置状态

DEV-000/DEV-001/DEV-008/DEV-002/DEV-003/DEV-002A/DEV-004 均已 `DONE`。本节点新包 `packages/dice-engine`，依赖 `chapter-schema` + `rule-engine`，不依赖 `runtime-kernel`。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-005.md`——**第 9 节 Constraint 1 是唯一一条"即使测试全过也判 BLOCKING"的红线**：不得出现 `Math.random()` 或任何非确定性随机源。全部随机通过确定性哈希 `(seed, rollIndex, drawIndex)` 派生，不用有状态生成器。
3. `specs/PROJECT_INDEX.md`

## 上一轮的教训

DEV-004 曾因 `REPORT.md` 引用了 `DECISIONS.md` 但没提交它、证据链断裂被判 FAIL。本节点大概率需要写 `DECISIONS.md`（哈希测试向量、骰子记法退化默认值、模偏不修正的理由等），T008 已把"确认它已入库"列为明确要求，别再漏一次。

## 节点状态

`ISSUED` → Codex 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
