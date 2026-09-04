---
msg_id: "0171"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-041
in_reply_to: "0170"
created_at: 2026-09-04
requires_response: true
git_head: 94c674ff50bfef32b807864141e144e6d1f66db3
changed_files_count: 8
commands_run: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-041

DEV-041（EventSub Client）施工完成，`READY_FOR_REVIEW`。

交付全文见 `specs/dev/DEV-041/REPORT.md`；决策记录见
`specs/dev/DEV-041/DECISIONS.md`（D1–D10）；验收权威副本为
`specs/tasks/TASK-PACKAGE-DEV-041.md` 第 12 节（A01–A24，节点
`ACCEPTANCE.md` 逐行一致，已脚本比对）。

## 交付快照

- `git_head`: `94c674ff50bfef32b807864141e144e6d1f66db3`
- Changed Files（8，与本次实现提交一致）：
  - `packages/platform-twitch/src/eventSubClient.ts`（新增）
  - `packages/platform-twitch/src/eventSubClient.test.ts`（新增）
  - `packages/platform-twitch/src/index.ts`（追加 1 行导出）
  - `packages/platform-twitch/package.json`（追加 xstate `^5.32.5`）
  - `pnpm-lock.yaml`（platform-twitch importer 追加 xstate 条目）
  - `specs/dev/DEV-041/INDEX.md`（Task 勾选 + Status=READY_FOR_REVIEW）
  - `specs/dev/DEV-041/DECISIONS.md`（新增，D1–D10；D10 记录 FIX-01 的 WELCOME 驻留态修正）
  - `specs/dev/DEV-041/REPORT.md`（新增）
- 六条命令严格按序全部退出码 0；107 个测试文件、590 个测试全部通过
  （DEV-040 基线 574：主交付新增 9 → 583；FIX-01 追加 7 条直接断言 → 590，零回归）。
- 测试全程零真实网络连接：FakeWebSocket（手动 emit message/error/close +
  构造计数）驱动建连，假 authPort/fetchImpl/假 Clock 注入，无 spy 全局
  fetch/WebSocket。
- 八态 XState 机器（`xstate@^5.32.5` 与 runtime-kernel 同版本，复用已审依赖，
  零新增第三方 WebSocket 库）：DISCONNECTED→CONNECTING→WELCOME→SUBSCRIBING
  →CONNECTED 全路径逐状态断言；凭据不可用直接 ERROR 且 WebSocket 零构造
  （Constraint 2）；Helix 订阅 202/非 202/异常三分支；notification 原样转发
  恰一次（不做转换/去重，DEV-042/043）；keepalive watchdog 假时钟快进 →
  DEGRADED（时长读 welcome 帧 ×1.5 缓冲）；session_reconnect 可达
  RECONNECTING（不实现真正重连，DEV-045）；disconnect() 清理 + close 恰一次；
  getHealth() CONNECTED→OK 其余→DOWN。
- 未修改 audio-engine/runtime-kernel/renderer/twitchAuth.ts 及
  PROJECT_INDEX/DAG/tasks/audit/protocol；未定义/改动 NormalizedChatMessage；
  未创建 packages/ai-host；未推进其他 DEV 节点。
- FIX-01（0174 裁决）已执行：新增 7 条直接断言测试覆盖审计 F-02 的
  A07/A11/A13/A14/A15（中间态 WELCOME/SUBSCRIBING 逐状态可观察、watchdog
  时长 = keepalive×1000×1.5、WebSocket error/非本地 close→ERROR、非
  CONNECTED 态 disconnect、getHealth 补齐五态）；其中 A07 直接断言暴露
  XState v5 `always` 同步瞬移致 WELCOME 不可观察的真实缺陷，按 0174 允许的
  最小修正将 WELCOME→SUBSCRIBING 改为显式微任务事件（详见 DECISIONS D10），
  反向验证改回 `always` 时新增测试真实失败。修正 REPORT.md 文件计数文字
  （8，与实现提交一致）与 NODE_REPORT 正文 commit hash（94c674f）。
- 本文件（NODE_REPORT 消息）与 LEDGER.md 追加行按 Constraint 8 留在工作区
  **未提交**，由 Commander 收尾统一提交。

请 AUDITOR 以该 `git_head` 独立核验 A01–A24。
