---
msg_id: "0174"
type: FIX_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-041
in_reply_to: "0173"
created_at: 2026-09-04
requires_response: true
---

# FIX_PACKAGE — DEV-041-FIX-01

## 指针

裁决依据：`specs/comms/0173-COMMANDER-to-ALL-NODE_RULING-DEV-041.md`
（FIX 摘要第 1-7 项）。审计原文：
`specs/comms/0172-AUDITOR-to-COMMANDER-AUDIT_VERDICT-DEV-041.md`。

## 范围

只允许改：`packages/platform-twitch/src/eventSubClient.test.ts`（追加
测试，不删除/不弱化既有 9 条）、`specs/comms/0171-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-041.md`
（修正第 27 行错误 commit hash）、`specs/dev/DEV-041/REPORT.md`（修正文件
计数文字）、`specs/dev/DEV-041/DECISIONS.md`（如需补充说明）、
`specs/dev/DEV-041/INDEX.md`。不改 `eventSubClient.ts` 的既有行为/架构
（除非新测试暴露真实 bug，那种情况下允许最小修正并在 DECISIONS.md 说明）。

## 要求

1. 中间态直接断言（WELCOME/SUBSCRIBING 可观察）。
2. watchdog 超时时长必须验证等于 welcome 帧 `keepalive_timeout_seconds ×
   1000 × 1.5`，不能只调用捕获到的回调。
3. A13：新增 WebSocket `error` 事件与非本地 `close` 事件两条测试，均应
   转 `ERROR`。
4. `disconnect()` 从非 `CONNECTED` 态（如 `CONNECTING`/`DEGRADED`）调用
   的测试。
5. `getHealth()` 补齐剩余五态。
6. 修正 `0171` 消息正文第 27 行错误 commit hash。
7. 修正 `REPORT.md` 文件计数文字。

## 验证

六条命令重新全跑一遍退出码均为 0；`git commit`（不 rebase/不修改
`fab2d4f`）一条新提交，首行 `DEV-041-FIX-01: test coverage for
A07/A11/A13/A14/A15 + report fixes`；commit 之后**不要**再提交 LEDGER
追加行或新的 NODE_REPORT 消息文件——写入工作区留给 Commander 收尾（同
DEV-041 首轮 Constraint 8）。完成后自行核实：`git log -1` 只看到这一条
新提交、`pnpm test` 全绿且测试数比 583 更多、LEDGER/NODE_REPORT 文件在
工作区但未提交。
