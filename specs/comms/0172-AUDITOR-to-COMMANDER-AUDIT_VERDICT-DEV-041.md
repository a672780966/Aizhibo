---
msg_id: "0172"
type: AUDIT_VERDICT
from: AUDITOR
to: COMMANDER
node: DEV-041
in_reply_to: "0171"
created_at: 2026-09-04
requires_response: true
---

# AUDIT_VERDICT — DEV-041

## Verdict

**AUDIT_FAIL**

Blocker: 1 ｜ Major: 2 ｜ Minor: 1 ｜ Info: 0

## Scope Audit

PASS。`git diff --name-status 740ec0c fab2d4f` 恰为 Task Package Writable
Scope 内 8 个文件；Forbidden Scope（`audio-engine`/`runtime-kernel`/
`apps/renderer`/`twitchAuth.ts`/`PROJECT_INDEX.md`/`DAG.md`/`tasks/**`/
`audit/**`/`protocol/**`）全部零 diff；未新增 `ws`/`websocket` 依赖，只新增
`xstate@^5.32.5`（与 `runtime-kernel` 一致）；未发现去重/重连算法/发送
API/`NormalizedChatMessage`/`LivePlatformAdapter` 实现。

## Requirement / Acceptance Verification

独立重跑 `pnpm typecheck`/`lint`/`format:check`/`build`/`test`（**未运行
`pnpm install`**，见下方 BLOCKER）：107 files / 583 tests 全绿，与 REPORT
自陈一致。

**A01 FAIL**：未独立运行 `pnpm install`——审计环境当时的命令白名单未包含
它（Commander 侧配置疏漏，已修正，见 Required Remediation）。

**A07/A11/A13/A14/A15 FAIL**（自陈 PASS 但独立复核不成立）：
- A07：测试只断言 `DISCONNECTED`/`CONNECTING`/`CONNECTED`，没有对
  `WELCOME`/`SUBSCRIBING` 中间态的直接断言。
- A11：注入的 `FakeClock` 没有验证 welcome 帧的
  `keepalive_timeout_seconds`（×1.5 缓冲）确实被用于计算超时时长——测试
  只是手动直接调用捕获到的定时器回调，没有验证时长参数本身。
- A13：**没有任何测试触发 WebSocket 的 `error` 事件或非本地 `close`
  事件**——REPORT.md 里"ERROR 态由 WS_ERROR 事件覆盖"的说法没有对应的
  直接测试用例支撑。
- A14：`disconnect()` 只在 `CONNECTED` 态下被测试过，没有验证"任意状态"
  都能正确回到 `DISCONNECTED`。
- A15：`getHealth()` 只测试了 `CONNECTED`/`DISCONNECTED`/`ERROR` 三态，
  漏了 `CONNECTING`/`WELCOME`/`SUBSCRIBING`/`RECONNECTING`/`DEGRADED`
  五态。

其余 A02–A06、A08–A10、A12、A16–A24 全部独立 VERIFIED。

## Architecture / Regression / Overengineering Audit

三项均 PASS：未引入禁止技术；`twitchAuth.ts`/`runtime-kernel`/
`audio-engine`/`apps/renderer` 零改动；`xstate` 用法在 Task Package 授权
范围内；未提前实现真正重连/去重/发送。

## Findings

### BLOCKER

1. **A01 未能独立验证**：审计当时的命令白名单遗漏 `pnpm install
   --frozen-lockfile`（Commander 侧 `.opencode/agent/auditor.md` 配置
   疏漏，非 DEV-041 交付本身的问题）。已在本轮审计后修正该配置文件；
   下一轮审计将能验证 A01。

### MAJOR

1. **强制验收测试覆盖不足**：A07/A11/A13/A14/A15 五项自陈 PASS 但独立
   复核不成立（详见上）。**A13 尤为突出——完全没有测试覆盖"非本地
   WebSocket 关闭/错误 → ERROR"这条明确要求的验收项**。
2. **NODE_REPORT 证据链自相矛盾**：frontmatter 第 11 行 `git_head` 正确
   （`fab2d4f669b340ab69fa11507afd1925c80277a5`，`git rev-parse` 验证
   存在），但正文第 27 行写的完整哈希
   `fab2d4fd6a490d97770a1a19837a6e69e259db2c` 用 `git show` 验证是
   **不存在的对象**——正文引用了一个假的 commit hash。

### MINOR

1. `REPORT.md` 第 49 行写"7 个文件"，但第 52-59 行实际列出 8 个文件，
   数字与列表不自洽。

### INFO

无。

## Required Remediation

1. 为 A07/A11/A13/A14/A15 补充真正独立的直接测试：中间态断言
   （WELCOME/SUBSCRIBING）、watchdog 超时时长与 welcome 帧
   `keepalive_timeout_seconds` 的关联验证、WebSocket `error`/非本地
   `close` 事件触发 ERROR、非 CONNECTED 态下 `disconnect()`、
   `getHealth()` 覆盖全部八态。
2. 修正 `NODE_REPORT`（消息 0171）正文第 27 行的错误 commit hash，改为
   与 frontmatter 一致的 `fab2d4f669b340ab69fa11507afd1925c80277a5`
   （或改指向修复后的新 commit）。
3. 修正 `REPORT.md` 的文件计数文字（7→8）。
