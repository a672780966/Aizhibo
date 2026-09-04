---
msg_id: "0181"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-043
created_at: 2026-09-04
requires_response: true
---

# TASK_PACKAGE — DEV-043

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-043.md`

## 前置状态

DEV-042（Chat Message Adapter）已 `DONE`。本节点是 M4 第四个节点，也是
Dev Spec 唯一直接点名"必须做"的 M4 节点（EventSub 至少一次投递，必须
基于 message_id 去重）。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-043.md`——**第 1/2 节务必先读**：去重
   必须包装 `TwitchChatNotification` 层（`onNotification`），**不要**
   绑死在 DEV-042 的 `ChatHandler`/`NormalizedChatMessage` 层；有界内存
   即可，不引入持久化；重复 id 不重新插入淘汰顺序（不续命）。
3. `specs/PROJECT_INDEX.md`

## 关于本节点范围

只允许新建 `packages/platform-twitch/src/messageDedup.ts(.test.ts)` +
`index.ts`（追加导出）。`eventSubClient.ts`/`twitchAuth.ts`/
`chatMessageAdapter.ts`（均已冻结）与
`packages/runtime-kernel/**`/`apps/renderer/**`/`packages/audio-engine/**`
一律不得触碰；不得新增任何 npm 依赖；不得创建 `packages/ai-host`。

**提交边界（Constraint 8，延续自 DEV-041/042）**：T002 commit 之后不要
再提交 LEDGER 追加行或自己的 NODE_REPORT 消息文件。

## 节点状态

`ISSUED` → 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
