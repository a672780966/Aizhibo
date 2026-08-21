---
msg_id: "0114"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-024
created_at: 2026-08-22
requires_response: true
---

# TASK_PACKAGE — DEV-024

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-024.md`

## 前置状态

DEV-023 已 `DONE`（接口冻结）。本节点是 M2 第五个节点，第一次对 INTERACTION region
的 `onOpen` 发窄范围 CR（前三次 CR 都是 STORY region 的 `onSceneEnter`，互不影响）。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-024.md`——**第 1/2 节务必先读**：Choice UI 是给
   OBS Browser Source 采集进直播画面的**展示**，不是可点击控件——真实投票来自 Twitch
   聊天（M4 尚未建），不要做成按钮交互。`visibleIf` 条件过滤必须在 Runtime 侧完成
   （Renderer 拿不到 `WorldState`），已提供 `resolveVisibleChoices` 的精确实现要求。
3. `specs/PROJECT_INDEX.md`

## 关于本节点范围

只展示选项字母+文案 + 本地倒计时（纯 UI 反馈，允许用 `Date.now()`，不适用
`runtime-kernel` 确定性红线）。不做实时票数展示（需要额外批量/限流设计，明确延后）。

## 上一轮的教训

`DECISIONS.md` 必须随最终提交一起入库；`INDEX.md` 的 `Status:` 表头请主动改到位
（前三个节点都漏改）。

## 节点状态

`ISSUED` → Codex 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
