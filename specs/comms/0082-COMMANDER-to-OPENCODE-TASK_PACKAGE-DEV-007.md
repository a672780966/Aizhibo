---
msg_id: "0082"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-007
created_at: 2026-08-21
requires_response: true
---

# TASK_PACKAGE — DEV-007

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-007.md`

## 前置状态

DEV-009 已 `DONE`（`verdict_ref: "0080"`，接口冻结）。本节点在既有冻结包
`packages/runtime-kernel` 上追加一个 headless 驱动器（Chapter Simulator，PASS 8），
复用 DEV-009 的同一个 Runtime statechart，不新增任何状态推进逻辑，只替换
platform/clock 两个 IO 边界（`DAG.md` CR-004）。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-007.md`——**第 2 节务必先读**：Commander 已实际核对
   `packages/runtime-kernel` 现有源码（`storyRegion.ts`/`interactionRegion.ts`/
   `machine.ts`），把驱动循环的确切时序（何时该发哪个 `RootEvent`）写清楚了，照办
   即可，不要重新猜测状态机行为。
3. `specs/PROJECT_INDEX.md`

## 关于本节点的范围收紧

本节点**不修改任何既有状态机定义**（`storyRegion.ts`/`interactionRegion.ts` 等一律
Read-only），只新增文件 + 对 `machine.ts`/`index.ts` 做唯二的追加式编辑（新增一个
访问器 `getCurrentChoiceIds`）。第 2.3 节记录了一处发现但**不修复**的既有缺口
（`PlatformPort.onVote` 未接线），如实记录，不在本节点范围内处理。

## 上一轮的教训

`DECISIONS.md` 必须随最终提交一起入库；本节点需要记录种子派生公式、投票哈希实现
选择、未接线缺口发现、`maxSteps` 等默认值理由。

## 节点状态

`ISSUED` → Codex 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
