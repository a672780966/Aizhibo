---
msg_id: "0177"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-042
created_at: 2026-09-04
requires_response: true
---

# TASK_PACKAGE — DEV-042

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-042.md`

## 前置状态

DEV-041（EventSub Client）已 `DONE`。本节点是 M4 第三个节点，也是
`TwitchChatNotification` 的第一个真实消费方。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-042.md`——**第 1/2 节务必先读**：新建
   `packages/platform-core` 定义 `NormalizedChatMessage`/`ChatHandler`
   （平台无关契约），`packages/platform-twitch` 里加一个转换函数把
   DEV-041 的 `TwitchChatNotification` 转成它；**完全不碰
   `packages/runtime-kernel`——`Vote`/`PlatformPort` 是 DEV-044
   Interaction Aggregator 的边界，不是本节点的**；不做去重（DEV-043）；
   不组装完整 `LivePlatformAdapter`（DEV-046 之后）。
3. `specs/PROJECT_INDEX.md`

## 关于本节点范围

只允许新建 `packages/platform-core/*` 与
`packages/platform-twitch/src/chatMessageAdapter.ts(.test.ts)` +
`index.ts`（追加）+ `package.json`（追加依赖）+ 根 `tsconfig.json`
（追加 1 条 references）。`eventSubClient.ts`/`twitchAuth.ts`（均已冻结）
与 `packages/runtime-kernel/**`/`apps/renderer/**`/`packages/audio-engine/**`
一律不得触碰；不得创建 `packages/ai-host`；不得新增第三方 npm 依赖。

**提交边界（Constraint 8，延续自 DEV-041）**：T003 commit 之后不要再
提交 LEDGER 追加行或自己的 NODE_REPORT 消息文件——写入工作区留给
Commander 收尾统一提交。

## 节点状态

`ISSUED` → 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
