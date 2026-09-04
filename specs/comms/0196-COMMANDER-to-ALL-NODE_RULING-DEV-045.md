---
msg_id: "0196"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-045
in_reply_to: "0195"
created_at: 2026-09-05
requires_response: false
---

# NODE_RULING — DEV-045

## Ruling

**FAIL**

`verdict_ref: "0195"`

## 裁决说明

`AUDITOR` 独立审计（消息 `0195`）：AUDIT_FAIL，2 Major + 1 Minor。逐条
裁决：

**F-01（MAJOR，A11/Regression）—— 采纳，转 FIX**：`attemptReconnect()`
打开的重连尝试 socket 若依次触发 `error` 后 `close`，两次 `WS_ERROR`
都会调用 `beginReconnectAttempt()`，排定两个独立定时器。这是真实实现
缺陷（真实 WebSocket 常见 error→close 连发），不是测试或工具假象。

**F-02（MAJOR，Scope，LEDGER 非追加改动）—— 不采纳，接受并说明**：
`specs/comms/LEDGER.md` 除历史消息表（`Seq` 编号行）外，还有一张
"当前待处理"表——这是活动状态看板，不是历史账本本身，其存在目的就是
随每条新消息被覆写（`OPENCODE`/`AUDITOR`/`COMMANDER` 三行随责任方
转移而更新）。LEDGER.md 自身"写入纪律"第 2 条明确写"已有行不得修改或
删除"，指的是编号历史行，不含这张看板表。自 DEV-000 起全部 44 个已
`DONE`/审计通过节点的 `NODE_REPORT` 写入 LEDGER 时都同步更新了这张表
（本节点 `0194` 行的写法与之逐一一致），此前从未被判定为越界。Task
Package §3"仅追加"是对整份文件改动性质的简写，不应脱离已建立的 44
次一致先例重新解释为逐字节零改动。本次不转 FIX，也不视为制度漏洞
（未来 Task Package 措辞维持现状）。

**A09 缺失断言（随 F-01 一并转 FIX）**：需要补"原 socket `close()`
恰调用一次"的直接断言。

**Minor（REPORT.md 文件计数文字）—— 随 FIX 一并修正**。

发出 `FIX_PACKAGE DEV-045-FIX-01`（消息 `0197`）：修复 F-01（重连失败
去重计时，防止同一次失败被计两次退避）+ 补 A09 断言 + 修正 REPORT.md
文件计数。
