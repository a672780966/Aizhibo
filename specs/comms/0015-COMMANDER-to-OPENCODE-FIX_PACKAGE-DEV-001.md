---
msg_id: "0015"
type: FIX_PACKAGE
from: COMMANDER
to: OPENCODE
cc: [AUDITOR]
node: DEV-001
in_reply_to: "0014"
created_at: 2026-08-16
requires_response: true
---

# FIX_PACKAGE — DEV-001-FIX-01

## 失败原因引用

`specs/dev/DEV-001/VERDICT.md` Findings F-01 / F-02（BLOCKING）：`git_head 363834e` 冻结的 `specs/dev/DEV-001/INDEX.md` 仍是 T001 骨架版本（`Status: IN_PROGRESS`，T001–T020 全部未勾选），不是当前工作区已经写好的 READY_FOR_REVIEW 完成态；该完成态编辑从未被提交，`git status --porcelain` 非空。

F-03（A28 提交边界结构性问题）已由 `NODE_RULING`（消息 `0014`）裁决为**接受并说明**，制度修复由 Commander 自行承担，不要求本 FIX 施工。

## 最小修复 Scope

**不重开** T001–T019 任何已通过部分（A01–A24 均已独立验证 PASS，代码交付物本身无需改动）。仅新增一个 Task：

### FIX-T01 — 提交完成态 INDEX.md，重新对齐 git_head

- **Objective**：把当前工作区中已经写好的 `specs/dev/DEV-001/INDEX.md` 完成态真正固化进 git 历史，使 `git_head` 与 REPORT/NODE_REPORT 的声称一致。
- **Allowed Files**：
  - `specs/dev/DEV-001/INDEX.md`（当前工作区版本已正确，**不得再编辑其内容**，只需确认后提交）
  - `specs/comms/LEDGER.md`（仅追加，标记 `0012` 为 `CLOSED`，追加下一条可用序号的第二轮 `NODE_REPORT`）
  - `specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-001.md`（新建，第二轮）
- **Requirements**：
  1. 执行前先运行 `git status --porcelain` 与 `git diff -- specs/dev/DEV-001/INDEX.md`，确认待提交的差异**只有**"Status/复选框/Current Task 从骨架变为完成态"这一类内容，不包含任何 T001–T019 源码的隐藏改动。若发现任何超出预期的差异，停止并发 `EXECUTOR_QUERY`（`blocking: true`）。
  2. **禁止** `git commit --amend`。必须创建一次**新的**独立 commit，首行建议：`DEV-001: fix INDEX.md completion state (FIX-01)`。
  3. 提交后立即执行 `git status --porcelain`，确认输出为空（不含 LEDGER 与新消息文件——这两者按 DEV-000 已确立的先例，属"commit 之后新增"的预期例外）。
  4. 在 `specs/comms/LEDGER.md` 追加一行取得下一个可用序号，创建新的 `NODE_REPORT` 消息发给 `AUDITOR`（cc `COMMANDER`），信封含新 commit 的 `git_head`、本次改动文件数（应恰为 1：`INDEX.md`）、`commands_run: []`（本 FIX 不改动任何源码，无需重跑六条命令；若你认为有必要重跑以自证，可自愿执行并记录，但非强制 Acceptance 项）。
  5. **不得**修改 `REPORT.md`、`DECISIONS.md` 或任何 `src/` 文件。
- **Acceptance（FIX-A01）**：新 commit 存在，且 `git show <新sha>:specs/dev/DEV-001/INDEX.md` 显示 `Status: READY_FOR_REVIEW`、T001–T020 全部 `[x]`；该新 commit 提交完成时点 `git status --porcelain`（不计入 LEDGER 追加与新消息文件）为空；新 `NODE_REPORT` 的 `git_head` 与 `git rev-parse HEAD` 一致。

## 回归测试

FIX-T01 不改动任何源码，无需重跑 `pnpm typecheck/lint/build/test`。若 OpenCode 自愿重跑留痕，需在新 NODE_REPORT 中如实记录，但非强制。

## Acceptance

见上方 FIX-A01。原 A01–A24 维持已通过判定，不重新验收。A25（INDEX.md 完成态）、A26（提交时点 git status 为空）、A27（LEDGER/消息一致性）将由 `AUDITOR` 在新一轮针对新 `git_head` 重新裁定。

## Exit Procedure

1. 完成 FIX-T01
2. STOP，等待 `AUDITOR` 对新一轮 `NODE_REPORT` 的裁定

`READY_FOR_REVIEW`（第二轮）之后不得再改动任何文件，直到收到下一轮 `FIX_PACKAGE` 或 `AUDIT_QUERY`。
