---
msg_id: "0090"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-011
created_at: 2026-08-21
requires_response: true
---

# TASK_PACKAGE — DEV-011

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-011.md`

## 前置状态

DEV-010 已 `DONE`（接口冻结）。本节点第三次追加式扩展 `packages/runtime-kernel`
（继 DEV-007、DEV-010 之后），实际只需要 DEV-009/DEV-007 已冻结的导出，不依赖
`packages/persistence` 的任何代码。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-011.md`——**第 2 节务必先读**：Commander 已核实
   `RuntimeEvent` 是输出型日志、不能直接重放进机器；真正可重放的只有投票。驱动循环
   结构直接复用 DEV-007 `simulator.ts` 的相位驱动逻辑，只是投票来源换成"从历史
   Event Log 提取"而不是随机生成。照办即可，不要重新设计驱动循环。
3. `specs/PROJECT_INDEX.md`

## 关于本节点与 DEV-010 的边界

DEV-010 的 LKG 是崩溃恢复（写穿透快照）；本节点是"只给 Event Log + seed + 章节，从零
完整重建"的确定性验证（G03）。两者互不替代，本节点**不修改、不依赖** `packages/persistence`。

## 上一轮的教训

`DECISIONS.md` 必须随最终提交一起入库；本节点需要记录"重放投票而非重放 RuntimeEvent"
的理由、比对字段排除 `id`/`timestamp` 的理由。

## 节点状态

`ISSUED` → Codex 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
