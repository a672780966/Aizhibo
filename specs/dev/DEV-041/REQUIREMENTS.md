# DEV-041 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-041.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- `createEventSubClient`：XState v5 机器建模 Dev Spec 第 45 节八态连接
  生命周期；真实调用 Twitch EventSub WebSocket（原生 `WebSocket`）与
  Helix 订阅创建 API（原生 `fetch`）；`webSocketImpl`/`fetchImpl`/`clock`
  全部可注入测试。
- 凭据不可用（`authPort.getAccessToken()` 返回 `ok:false`）→ 直接转
  `ERROR`，不构造 WebSocket。
- `notification` 帧原样转发给 `onNotification`，不做字段转换/去重
  （DEV-042/043 职责）。
- `session_reconnect` 只转 `RECONNECTING` 状态，不实现真正重连算法
  （DEV-045 职责）。
- `getHealth()`：`CONNECTED` → `OK`，其余七态 → `DOWN`。
- 零新增第三方 WebSocket 库；`xstate` 复用 `runtime-kernel` 同版本
  （`^5.32.5`）。

## Scope（Task Package 第 3 节）

Writable：`eventSubClient.ts(.test.ts)`、`index.ts`（追加）、
`package.json`（追加 xstate）、`pnpm-lock.yaml`、`specs/dev/DEV-041/*.md`、
`specs/comms/LEDGER.md`（仅追加，写入不提交）、
`specs/comms/NNNN-OPENCODE-to-*.md`（写入不提交）。

Forbidden（摘录）：不实现 NormalizedChatMessage/去重/真正重连/发送消息；
不新增第三方 WebSocket 库；不改 `twitchAuth.ts`/`audio-engine`/
`runtime-kernel`/`apps/renderer`；不创建 `ai-host`。

## Task Order

T001 节点文档 → T002 `eventSubClient.ts` + 测试（**测试全程零真实网络
连接，全部通过注入 `webSocketImpl`/`fetchImpl`/`clock`**）→ T003
`index.ts` 导出 + 全量验证 + REPORT + commit（**恰一条提交，LEDGER/
NODE_REPORT 写入工作区但不提交**）。
