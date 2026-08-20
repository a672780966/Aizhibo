---
msg_id: "0070"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-009
created_at: 2026-08-20
requires_response: true
---

# TASK_PACKAGE — DEV-009

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-009.md`

## 前置状态

DEV-000/001/008/002/003/002A/004/005/006/033 均已 `DONE`。本节点在既有冻结包
`packages/runtime-kernel`（DEV-008：`RuntimeEvent`/`DiceEvent`）基础上追加 XState
机器本体，是本项目第一次引入 XState，也是第一次把 chapter-schema/chapter-compiler/
rule-engine/dice-engine/narrative-composer 五个已冻结纯函数包接入一个活的运行时循环。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-009.md`——**第 2 节务必先读**：本任务包在规范原文
   （第 5–8 节）基础上做出四项架构决策（CR-005 Region 重建模、CR-004 IO Port 注入、
   CR-008 Snapshot 不透明类型分区、骰子事件节奏简化），这些是 Commander 的判断，不是
   规范逐字规定，严格照办，不要重新解释或另发明变体。
3. `specs/PROJECT_INDEX.md`

## 关于本节点的复杂度

这是目前为止范围最大、任务数最多（T001–T011）的节点，不是因为随意堆任务，是因为
STORY/INTERACTION 两个 Region 需要真实串联五个已冻结包。请按 Task Package 顺序
逐个完成，每个 Task 独立可测，不要试图一次性把整个机器写完再测。

## 上一轮的教训

`DECISIONS.md` 必须随最终提交一起入库，本节点决策数量为历史最多，尤其注意记录：
xstate 版本选择、骰子种子派生公式、DICE 事件节奏简化说明、Snapshot 不透明设计理由。

## 节点状态

`ISSUED` → Codex 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
