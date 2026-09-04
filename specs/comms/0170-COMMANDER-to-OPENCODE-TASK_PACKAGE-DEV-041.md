---
msg_id: "0170"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-041
created_at: 2026-09-04
requires_response: true
---

# TASK_PACKAGE — DEV-041

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-041.md`

## 前置状态

DEV-040（Twitch OAuth）已 `DONE`。本节点是 M4 第二个节点，也是
`TwitchAuthPort` 的第一个真实消费方。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-041.md`——**第 1/2/9 节务必先读**：凭据
   不可用时必须直接转 `ERROR`，不构造 WebSocket；**测试全程不得发出任何
   真实网络连接**，全部用注入的 `webSocketImpl`/`fetchImpl`/`clock`
   假实现；不实现 `NormalizedChatMessage`/去重/真正重连算法/发送消息；
   **第 9 节 Constraint 8 是本次新增的强约束——T003 commit 之后不要再
   单独提交 LEDGER 追加行或自己的 NODE_REPORT 消息文件，写入工作区即可，
   留给 Commander 收尾统一提交**（DEV-040 因违反这条被审计记录为 Major，
   本节点必须避免重演）。
3. `specs/PROJECT_INDEX.md`

## 关于本节点范围

只允许改 `packages/platform-twitch/src/eventSubClient.ts(.test.ts)`、
`index.ts`（追加导出）、`package.json`（追加 `xstate` 依赖）、
`pnpm-lock.yaml`。`twitchAuth.ts`（已冻结）与
`packages/runtime-kernel/**`/`apps/renderer/**`/`packages/audio-engine/**`
一律不得触碰；不得创建 `packages/ai-host`；不得新增 `ws`/`websocket` 等
第三方库。

## 节点状态

`ISSUED` → 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
