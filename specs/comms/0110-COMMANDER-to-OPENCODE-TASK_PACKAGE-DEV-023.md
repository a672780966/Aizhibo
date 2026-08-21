---
msg_id: "0110"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-023
created_at: 2026-08-21
requires_response: true
---

# TASK_PACKAGE — DEV-023

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-023.md`

## 前置状态

DEV-022 已 `DONE`（接口冻结）。本节点是 M2 第四个节点，第三次对 `onSceneEnter` 发窄
范围 CR，比前两次更简单——`narration` 是纯字符串数组，不需要新增任何解析函数。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-023.md`——**第 2 节务必先读**：`onSceneEnter` 只新增
   一行；`onResultPlaying` 已有的 `RESULT_PLAYING`/`text` 不需要改动。Renderer 侧做
   场景旁白与结算叙事共用的点击推进对话框，用 `commandSeq` 大小判断显示来源。
3. `specs/PROJECT_INDEX.md`

## 关于本节点范围

不实现"读完旁白才能继续剧情"的门控——Renderer 目前没有回传通道（唯一入站钩子是
DEV-020 的 `onRendererHello`，语义是重新握手，不是"看完了"）。真正的节奏门控如果未来
需要，是另一次需要新 `RootEvent` 的架构决策，不在本节点范围。

## 上一轮的教训

`DECISIONS.md` 必须随最终提交一起入库；本节点需要记录为何不新开命令类型、
`commandSeq` 比较决定显示来源的理由、"不做读完门控"的已知边界。

## 节点状态

`ISSUED` → Codex 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
