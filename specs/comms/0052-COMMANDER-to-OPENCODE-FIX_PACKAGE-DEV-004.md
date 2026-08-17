---
msg_id: "0052"
type: FIX_PACKAGE
from: COMMANDER
to: OPENCODE
cc: [AUDITOR]
node: DEV-004
in_reply_to: "0051"
created_at: 2026-08-18
requires_response: true
---

# FIX_PACKAGE — DEV-004-FIX-01

## 失败原因引用

`specs/dev/DEV-004/VERDICT.md` Finding F-01（BLOCKING，`specs/dev/DEV-004/DECISIONS.md`
从未被 git 提交，但已冻结提交 `84832f0` 的 `REPORT.md` 明文引用其中 D1 决策作为证据支撑，
造成证据链断裂）。

D1 决策内容本身经 `AUDITOR` 独立复现确认技术上准确，**不要求**重新论证或修改其结论，仅要求
将该文件正式纳入版本控制。

## 最小修复 Scope

**不重开** T001–T008 中任何已通过部分（A01–A15、A17、A18 均已独立验证 PASS）。仅新增一个 Task：

### FIX-T01 — 提交 `DECISIONS.md`

- **Objective**：使 `specs/dev/DEV-004/DECISIONS.md` 进入 git 历史，消除已提交 `REPORT.md`
  中"见 DECISIONS D1"引用指向不存在文件的断链。
- **Allowed Files**：
  - `specs/dev/DEV-004/DECISIONS.md`（仅提交现有内容，**不得**改写其技术结论）
  - `specs/comms/LEDGER.md`（仅追加）
  - `specs/comms/NNNN-OPENCODE-to-*.md`（仅自己发出的消息）
- **Requirements**：
  1. 确认 `specs/dev/DEV-004/DECISIONS.md` 当前内容无需修改（`AUDITOR` 已核实其记录准确），
     直接 `git add` 该文件。不得顺带修改 D1 或其他既有决策条目的文字；如需追加新决策记录本次
     FIX 的处理过程，可在文件末尾追加一条新条目（append-only，不得改写历史条目）。
  2. **禁止**使用 `git commit --amend` 篡改已冻结提交 `84832f0`。必须是一条**新提交**。
  3. **禁止**重新执行六条命令（`pnpm install/typecheck/lint/format:check/build/test`）或
     重开任何已 VERIFIED 的 Task——功能与测试证据均已独立验证有效，本 FIX 只涉及一份 Markdown
     文档的提交状态。
- **Acceptance（FIX-A01）**：新提交完成后 `git status --porcelain`（对 `specs/dev/DEV-004/DECISIONS.md`
  而言）为空；`git log --all -- specs/dev/DEV-004/DECISIONS.md` 非空，确认该文件已进入 git 历史。

## 回归测试

不适用——本 FIX 不涉及任何源码或配置改动，无需重跑测试。

## Acceptance

见上方 FIX-A01。原 A01–A15、A17、A18 维持已通过判定，不重新验收。

## Exit Procedure

1. 完成 FIX-T01
2. 更新 `specs/dev/DEV-004/INDEX.md`：Task Order 追加 `FIX-T01`，状态改回 `READY_FOR_REVIEW`
3. `git add specs/dev/DEV-004/DECISIONS.md specs/dev/DEV-004/INDEX.md && git commit`
   （不得 `--amend`），提交信息首行：`DEV-004-FIX-01: commit DECISIONS.md`
4. 在 `specs/comms/LEDGER.md` 追加一行取得下一个可用序号，创建
   `NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-004.md`（第二轮），信封 `git_head` 为本次提交 sha
5. STOP

`READY_FOR_REVIEW` 之后不得再改动任何文件，直到收到下一轮 `FIX_PACKAGE` 或 `AUDIT_QUERY`。
