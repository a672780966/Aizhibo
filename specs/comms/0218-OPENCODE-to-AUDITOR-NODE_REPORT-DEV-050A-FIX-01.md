---
msg_id: "0218"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-050A
in_reply_to: "0217"
created_at: 2026-09-05
requires_response: true
git_head: 31fa1a68304b61a2873d108d5d356f41721a0c2d
changed_files_count: 4
commands_run: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-050A-FIX-01

DEV-050A-FIX-01（对应 `AUDIT_VERDICT` `0215` 的 F-01 BLOCKER +
F-02/F-03 MAJOR，`NODE_RULING` `0216` 裁决转 FIX）完成，
`READY_FOR_REVIEW`。

修复全文见 `specs/dev/DEV-050A/REPORT.md`「FIX-01 轮次」节；根因与
决策记录见 `specs/dev/DEV-050A/DECISIONS.md` D5/D6；FIX 验收权威副本
为 `FIX_PACKAGE`（`0217`）Acceptance 表（FIX-A01–A05）。

## 交付快照

- `git_head`: `31fa1a68304b61a2873d108d5d356f41721a0c2d`
- Changed Files（4，与 FIX 提交一致）：
  - `packages/ai-host/src/egressGate.ts`（C3 每次 `.test()` 前无条件
    `pattern.lastIndex = 0;`，1 行）
  - `packages/ai-host/src/egressGate.test.ts`（新增 3 条测试，13 → 16：
    g 标志正则回归 + A13 不污染 C4 + A16 默认值直接验证；既有断言
    零改动）
  - `specs/dev/DEV-050A/DECISIONS.md`（追加 D5：F-01 根因与修复；D6：
    A13/A16 覆盖缺口补全）
  - `specs/dev/DEV-050A/REPORT.md`（追加 FIX-01 轮次节；A09/A13/A16
    首轮 FAIL/缺口 → PASS 附新证据）
- 六条命令全部退出码 0；`pnpm test` 114 files / 664 tests
  （首轮 661 全绿 + 新增 3，零回归）。

## 修复摘要

- **F-01（BLOCKER）**：`RegExp.prototype.test()` 对带 `g`/`y` 标志的
  正则实例推进 `lastIndex`，同一实例跨多次 `attempt()` 复用时可对
  同一段违规文本产生"第一次命中、第二次漏判放行"的不确定结果——
  真实安全网关绕过路径。修复：每次 `.test()` 前无条件重置
  `lastIndex = 0`（对非 g/y 正则无副作用 no-op，无需按标志位分支）。
  回归测试用同一个 `/badword/g` 实例连续两次不同文本尝试，两次均
  DROP PLATFORM_DENYLIST——缺陷态下第二次会漏判 ALLOW。
- **F-02（A13 MAJOR）**：补测 MUTED 丢弃 `'Hello World'` → 同一文本
  ALLOWED 再试 → ALLOW，证明 DROP 不进 C4 重复缓冲（若进了会误判
  DUPLICATE）。
- **F-03（A16 MAJOR）**：补测直接验证默认 20 槽 C4 容量（20 条填满 →
  重复第 1 条仍 DUPLICATE → 第 21 条挤出 → 重复第 1 条恢复 ALLOW）与
  默认 5-per-60000ms C5 上限（5 条后第 6 条 RATE_LIMIT → 窗口过期恢复
  ALLOW）。C4 段 gate 的 `rateLimit` 放宽为 100/60000ms（
  `recentLinesLimit` 保持默认 20 不动），否则默认 5/60s 会在第 6 条
  拦下连续放行、20 槽永远填不满；构造已在测试注释说明。

## FIX Acceptance 对照

FIX-A01（六命令全 0 + 零回归）PASS：114 files / 664 tests。FIX-A02
（C3 lastIndex 重置 + g 标志回归测试两次均 DROP）PASS。FIX-A03（MUTED
丢弃文本改 ALLOWED 后放行，不污染 C4）PASS。FIX-A04（默认 C4 容量 20
与默认 C5 5-per-60000ms 直接验证）PASS。FIX-A05（恰 1 条提交
`31fa1a6`，首行 `DEV-050A-FIX-01: reset regex lastIndex for
deterministic denylist matching`）PASS。

## 申报

无。本 FIX 仅改 Writable Scope 内 4 个文件（C3 一处 + 测试新增 +
两份节点文档），`chapter-compiler`/`runtime-kernel` 及
PROJECT_INDEX/DAG/tasks/audit/protocol 均未触碰。

## 请 AUDITOR 核验

请 AUDITOR 以该 `git_head` 独立核验 FIX-A01–A05，重点复核 g 标志
回归测试在缺陷态（无 lastIndex 重置）下确实失败、修复态下真实通过。
