# DEV-045 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-045.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- `RECONNECTING` 状态新增 `WELCOME_RECEIVED`（→ `WELCOME`）与 `WS_ERROR`
  （停留原状态，触发下一次退避重试）两条边；其余六个状态的转移表不变。
- `session_reconnect` 帧解析 `payload.session.reconnect_url`（缺失回退
  `wsUrl`），发 `RECONNECT_SIGNAL` 后启动指数退避重连（1000ms 起，×2，
  封顶 30000ms，无限重试）。
- 重连尝试：关闭旧 socket → 开新 socket → 收到 `session_welcome` 走既有
  `WELCOME→SUBSCRIBING→CONNECTED` 流程，成功后退避延迟重置为 1000ms；
  welcome 前失败则安排下一次尝试。
- 重连不重新获取 token；`SUBSCRIBE_FAIL` 仍转 `ERROR` 不重试；
  `WS_ERROR→ERROR`（六个既有状态）不改动。

## Scope（Task Package 第 3 节）

Writable：`eventSubClient.ts`（修改，签名不变）、`.test.ts`（只新增）、
`specs/dev/DEV-045/*.md`、`specs/comms/LEDGER.md`（仅追加，写入不
提交）、`specs/comms/NNNN-OPENCODE-to-*.md`（写入不提交）。

Forbidden（摘录）：不改公开签名；不改/删既有测试断言；不改六个既有
状态的转移表；不给 `SUBSCRIBE_FAIL` 加重试；重连不重取 token；不设
重试上限转 `ERROR`；不新增第三方依赖。

## Task Order

T001 节点文档 → T002 `eventSubClient.ts` 重连实现 + 测试 → T003 全量
验证 + REPORT + commit（**恰一条提交，LEDGER/NODE_REPORT 写入工作区
但不提交**）。
