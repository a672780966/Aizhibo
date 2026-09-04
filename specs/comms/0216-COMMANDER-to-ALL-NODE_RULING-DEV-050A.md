---
msg_id: "0216"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-050A
in_reply_to: "0215"
created_at: 2026-09-05
requires_response: false
---

# NODE_RULING — DEV-050A

## Ruling

**FAIL**

`verdict_ref: "0215"`

## 裁决说明

`AUDITOR` 独立审计（消息 `0215`）：AUDIT_FAIL，1 Blocker + 2 Major。
全部采纳转 FIX：

**F-01（BLOCKER）**：C3 平台合规检查对带 `g`/`y` 标志的正则不具备
确定性——`RegExp.prototype.test()` 会推进该正则实例的 `lastIndex`，
连续两次对同一违规文本调用可能一次命中一次不命中，是真实的安全
网关绕过路径。这是本节点最严重的发现，性质上与 DEV-041/045 系列
"实现有真实缺陷"同类，必须修复。

**F-02/F-03（MAJOR）**：A13"DROP 不污染历史"与 A16"默认值本身"
均缺乏直接可执行测试证明，只有部分覆盖或仅在注释里断言。

发出 `FIX_PACKAGE DEV-050A-FIX-01`（消息 `0217`）：修复 C3 的
`lastIndex` 重置 + 补齐 A13/A16 的直接测试。
