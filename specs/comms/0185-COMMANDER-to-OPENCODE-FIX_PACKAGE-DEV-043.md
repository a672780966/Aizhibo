---
msg_id: "0185"
type: FIX_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-043
in_reply_to: "0184"
created_at: 2026-09-04
requires_response: true
---

# FIX_PACKAGE — DEV-043-FIX-01

## 指针

裁决依据：`specs/comms/0184-COMMANDER-to-ALL-NODE_RULING-DEV-043.md`。
审计原文：`specs/comms/0183-AUDITOR-to-COMMANDER-AUDIT_VERDICT-DEV-043.md`。

## 范围

只允许改：`packages/platform-twitch/src/messageDedup.test.ts`（重写
A09 场景，不删除其他既有测试）、`specs/dev/DEV-043/REPORT.md`（修正
文件计数）。不改 `messageDedup.ts` 的实现（审计确认实现本身没有问题，
只是测试场景选得不对）。

## 要求

用能真正区分"续命 vs 不续命"的序列重写 A09：`maxSize=3`，依次
`seen('A')`/`seen('B')`/`seen('C')`（填满，A 最旧）→ 重复
`seen('A')`（此时 A 不是队尾）→ `seen('D')`（触发淘汰）→ 断言
`seen('A')` 现在返回 `false`（视为未见过，证明 A 被淘汰而非续命续到
了队尾逃过淘汰）。

## 验证

`pnpm test` 全绿，测试数不少于 608；六条命令重新全跑一遍退出码均为
0；`git commit`（不 rebase/不修改既有 `66741f3`）追加一条新提交，
首行 `DEV-043-FIX-01: strengthen A09 anti-refresh test + report fix`；
commit 之后不要再提交 LEDGER/NODE_REPORT——写入工作区留给 Commander
收尾。
