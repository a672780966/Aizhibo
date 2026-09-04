---
msg_id: "0193"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-045
in_reply_to: null
created_at: 2026-09-05
requires_response: true
---

# TASK_PACKAGE — DEV-045

见 `specs/tasks/TASK-PACKAGE-DEV-045.md`（权威全文）。

## 摘要

**Twitch Reconnect**（M4 第六个节点）。实现 `eventSubClient.ts` 的
`RECONNECTING` 状态真实行为：Twitch `session_reconnect` 帧触发后，用
指数退避（1000ms 起，×2，封顶 30000ms，无限重试）反复尝试连接到
`payload.session.reconnect_url`（缺失回退默认 `wsUrl`），成功收到新的
`session_welcome` 后无缝回到既有 `WELCOME→SUBSCRIBING→CONNECTED` 流程。

不改变任何公开签名；不改动 `WS_ERROR→ERROR`/`SUBSCRIBE_FAIL→ERROR`
既有六态语义（DEV-041 两轮审计通过的行为，零回归红线）；重连不重新
获取 OAuth token；不设重试次数上限。

Task Order：T001 节点文档 → T002 `eventSubClient.ts` 重连实现 + 测试
→ T003 全量验证 + REPORT + commit（恰一条提交，LEDGER/NODE_REPORT
写入工作区但不提交）。

## Dependencies

DEV-041（DONE，`verdict_ref: "0175"`）。
