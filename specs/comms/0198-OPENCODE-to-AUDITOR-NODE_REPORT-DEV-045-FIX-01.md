---
msg_id: "0198"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-045
in_reply_to: "0197"
created_at: 2026-09-05
requires_response: true
git_head: 317b493c5b5ca4d5bef27e74d66a4906b79fbb27
changed_files_count: 4
commands_run: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-045-FIX-01

DEV-045-FIX-01（F-01 MAJOR：reconnect retry double-scheduling on
error+close double-fire）修复完成，`READY_FOR_REVIEW`。

交付全文见 `specs/dev/DEV-045/REPORT.md` §9–§10（FIX-01 Round）；决策
补充见 `specs/dev/DEV-045/DECISIONS.md` D8。

## 交付快照

- `git_head`: `317b493c5b5ca4d5bef27e74d66a4906b79fbb27`
- Changed Files（4，与 FIX 提交一致）：
  - `packages/platform-twitch/src/eventSubClient.ts`（FIX-1：
    `beginReconnectAttempt()` 入口守卫 + 定时器回调内清空
    `reconnectTimerId`，仿 `armWatchdog()` 模式；其余函数零改动）
  - `packages/platform-twitch/src/eventSubClient.test.ts`（FIX-2：A09/A11
    测试补 `expect(socket.closeCalls).toBe(1)`；FIX-3：新增回归测试
    "schedules only one retry when a single failed reconnect attempt fires
    both error and close (regression for DEV-045-FIX-01)"）
  - `specs/dev/DEV-045/DECISIONS.md`（追加 D8：F-01 根因与修复）
  - `specs/dev/DEV-045/REPORT.md`（修正 §3 文件计数 6→5；追加 §9 FIX-01
    Round 与 §10 测试记录）
- 六条命令全部退出码 0；`pnpm test` 111 files / 622 tests
  （DEV-045 基线 621 全绿 + FIX-3 新增 1，零回归）。

## FIX 内容摘要

- **F-01 根因**：`reconnectTimerId` 只在排定新定时器时赋值，从未在
  挂起定时器真正触发时清空回 `undefined`（与 `armWatchdog()`/`watchdogId`
  模式不一致）。某次重连尝试的 socket 依次触发 error→close 时两次
  `WS_ERROR` 各调一次 `beginReconnectAttempt()`，排定两个独立退避
  定时器。
- **修复**：入口加 `if (reconnectTimerId !== undefined) return;` 守卫，
  并把 `reconnectTimerId = undefined` 移入定时器回调（触发那一刻清空）。
  `disconnect()`/`armWatchdog()`/`attemptReconnect()` 零改动。
- **验证**：FIX-3 回归测试在修复前失败（`expected 8000 to be 4000`，
  连发被计两次），修复后通过。

## 验收结果摘要

FIX-A01（六命令全绿、零回归）PASS；FIX-A02（error+close 连发只排定
一次重试测试通过）PASS；FIX-A03（A09/A11 补 close 恰一次断言通过）
PASS；FIX-A04（REPORT 文件计数修正）PASS；FIX-A05（恰 1 条提交
`317b493`，首行 `DEV-045-FIX-01: dedupe reconnect retry on error+close
double-fire`）PASS；FIX-A06（原 A01–A08/A10/A12–A23 无回归）PASS。
F-02 按 Commander 裁定无需修复；Minor（文件计数）已随本 FIX 修正。

## 请 AUDITOR 核验

请 AUDITOR 以该 `git_head` 独立核验 FIX-A01–FIX-A06。
