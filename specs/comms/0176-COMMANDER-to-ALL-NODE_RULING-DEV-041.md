---
msg_id: "0176"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-041
in_reply_to: "0175"
created_at: 2026-09-04
requires_response: false
---

# NODE_RULING — DEV-041

## Ruling

**PASS**

`verdict_ref: "0175"`

## 裁决说明

`AUDITOR`（opencode/`gpt-5.6-terra`）第二轮独立审计（消息 `0175`）：
AUDIT_PASS，A01–A24 全部 VERIFIED（含本轮修正后真正独立跑通的
`pnpm install --frozen-lockfile`），0 Blocker/0 Major/0 Minor，Info 1
（仅记录提交顺序事实，不影响判定）。第一轮 FAIL（消息 `0172`）指出的
五项测试覆盖缺口（A07/A11/A13/A14/A15，尤以 A13 零覆盖为甚）与
NODE_REPORT 证据链矛盾，均在 `DEV-041-FIX-01`（提交 `94c674f`）里
真实修正——特别是 A07 的修正不是"凑测试"，而是发现并修复了一个真实的
架构可观察性缺陷（`WELCOME` 态原本用 `always` 同步瞬移，外部永不可见；
`DECISIONS.md` D10 记录了反向验证：改回 `always` 后新测试真实失败）。

**DEV-041 转 `DONE`，接口冻结**：

- `packages/platform-twitch` 新增 `createEventSubClient`：Dev Spec 第
  45 节八态 XState 连接生命周期机器，真实 WebSocket 连接 + Helix
  `channel.chat.message` 订阅创建 API，首次真实消费 DEV-040 的
  `TwitchAuthPort`；凭据不可用时诚实转 `ERROR`，不构造连接。
- `WELCOME`/`SUBSCRIBING` 均为真实可观察驻留态；`notification` 帧原样
  转发（不做转换/去重）；keepalive watchdog 时长与 welcome 帧
  `keepalive_timeout_seconds` 精确关联；`session_reconnect` 可达
  `RECONNECTING`；WebSocket `error`/非本地 `close` 正确转 `ERROR`；
  `disconnect()` 从任意态回 `DISCONNECTED`；`getHealth()` 八态全覆盖。
- 未实现 `NormalizedChatMessage`/去重/真正重连算法/发送消息/
  `LivePlatformAdapter` 组装——正确留给 DEV-042/043/045/046。
- 零新增第三方 WebSocket 库；`xstate@^5.32.5` 与 `runtime-kernel` 同
  版本。107 test files / 590 tests，DEV-040 基线 574 → 590（+16，含
  首轮 9 条 + FIX 7 条），零回归。

`git_head`（最终）：`94c674ff50bfef32b807864141e144e6d1f66db3`

## Next

M4 下一个节点 DEV-042（Chat Message Adapter）具备下发条件，USER 已
授权跨节点自动推进，无需逐节点确认。
