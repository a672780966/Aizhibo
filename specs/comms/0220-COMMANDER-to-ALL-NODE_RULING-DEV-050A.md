---
msg_id: "0220"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-050A
in_reply_to: "0219"
created_at: 2026-09-05
requires_response: false
---

# NODE_RULING — DEV-050A

## Ruling

**FAIL**

`verdict_ref: "0219"`

## 裁决说明

`AUDITOR` 第二轮独立审计（消息 `0219`）：AUDIT_FAIL，1 Major。采纳：
FIX-A02 的 `lastIndex` 回归测试经逐字符核算证明无效——两段测试文本
里 `badword` 的命中位置恰好都落在遗留 `lastIndex` 之后（不早于
21），全局正则从 `lastIndex` 向后搜索本就不要求精确对齐，所以即使
撤销 `pattern.lastIndex = 0` 这行修复，测试也会"巧合通过"。这是
DEV-041/043/045/050 系列里同一类问题的再现："测试断言的具体数值/
位置选取不当，导致测试无法真正区分修复前后"——修复代码本身没有
问题，只是这一条证明它的测试需要重新构造。

发出 `FIX_PACKAGE DEV-050A-FIX-02`（消息 `0221`）：重新构造回归
测试文本，让第二次命中位置严格早于遗留 `lastIndex`。
