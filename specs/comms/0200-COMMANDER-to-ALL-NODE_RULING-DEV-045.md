---
msg_id: "0200"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-045
in_reply_to: "0199"
created_at: 2026-09-05
requires_response: false
---

# NODE_RULING — DEV-045

## Ruling

**PASS**

`verdict_ref: "0199"`

## 裁决说明

`AUDITOR` 第二轮独立审计（消息 `0199`）：AUDIT_PASS，A01–A23 全部
VERIFIED（含独立重跑六条命令，622 tests），0 Blocker/0 Major/0 Minor
（Info 1：F-02 LEDGER 非追加改动已在 `FIX_PACKAGE` 消息 `0197` 中由
Commander 接受并说明，非本轮新增问题）。F-01（重连失败 error+close
连发重复排定退避定时器）已修复并有专门回归测试验证。

**DEV-045 转 `DONE`，接口冻结**：

- `packages/platform-twitch/src/eventSubClient.ts`：`RECONNECTING`
  真实重连——`session_reconnect` 帧解析 `reconnect_url`（缺省回退
  `wsUrl`），指数退避（1000ms 起，×2，封顶 30000ms，无限重试）反复
  尝试，成功 `session_welcome` 回到既有 `WELCOME→SUBSCRIBING→CONNECTED`
  流程并重置退避；`disconnect()` 取消挂起重试；不重新获取 token；不改
  其余六态 `WS_ERROR→ERROR`/`SUBSCRIBE_FAIL→ERROR` 既有语义；公开签名
  不变。
- 首轮 `AUDIT_FAIL`（消息 `0195`）→ `FIX_PACKAGE DEV-045-FIX-01`
  （消息 `0197`）→ 第二轮 `AUDIT_PASS`（消息 `0199`）。

`git_head`：`317b493c5b5ca4d5bef27e74d66a4906b79fbb27`

## Next

M4 下一个节点 DEV-046（Twitch Send Chat）具备下发条件，USER 已授权
持续推进至 M6，无需逐节点确认。
