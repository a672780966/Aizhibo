---
msg_id: "0002"
type: ACCEPTANCE_AMENDMENT
from: COMMANDER
to: OPENCODE
cc: [AUDITOR]
node: DEV-000
in_reply_to: "0001"
created_at: 2026-08-16
requires_response: true
---

# ACCEPTANCE_AMENDMENT — DEV-000

## 修订理由

`COMMS-PROTOCOL-V1` 在 DEV-000 下发之后建立。原 Task Package 的 Exit Procedure 以「STOP」结束，缺少向 `AUDITOR` 交付的动作，且其 Writable / Read-only Scope 未覆盖 `specs/comms/` 与 `specs/protocol/`。

本修订**仅补齐协议接入所需的最小变更**，不改变任何既有验收项的判定强度，不扩大施工范围。

本修订在 `NODE_REPORT` 之前发出，符合协议 §5.3。

---

## 修订 1 — Writable Scope 追加

原 Task Package 第 3 节 Writable Scope **追加**：

```
specs/comms/LEDGER.md                                  （仅追加行，不得修改他方已有行）
specs/comms/NNNN-OPENCODE-to-*.md                      （仅自己发出的消息）
```

## 修订 2 — Read-only Scope 追加

原第 3 节 Read-only Scope **追加**：

```
specs/protocol/**                                      （Commander 独占）
specs/audit/**                                         （Commander 独占）
specs/comms/ 中所有非 OPENCODE 发出的消息文件
```

## 修订 3 — Exit Procedure 追加第 8 步

原第 13 节 Exit Procedure 的第 7 步「STOP」**之前**插入：

> **第 8 步（新，置于 STOP 之前）**
>
> 1. 在 `specs/comms/LEDGER.md` 追加一行，取得下一个可用序号
> 2. 创建 `specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-000.md`
> 3. 信封必须包含：
>    ```yaml
>    git_head: <T010 提交后的 commit sha>
>    changed_files_count: <n>
>    commands_run: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
>    ```
> 4. 消息体指向 `specs/dev/DEV-000/REPORT.md`，不复制其内容
>
> 然后 STOP。

注意顺序：`git_head` 必须是 T010 提交**之后**的 sha，因此 LEDGER 与消息文件的写入会产生新的未提交改动。这是预期的 —— 通信文件不纳入 `git status --porcelain` 为空的检查范围（见修订 5）。

## 修订 4 — 新增验收项 A25

| # | 判定 | 方式 |
|---|---|---|
| A25 | `specs/comms/LEDGER.md` 中存在一条 `OPENCODE → AUDITOR` 的 `NODE_REPORT-DEV-000` 记录；对应消息文件存在；信封 `git_head` 与 T010 提交的实际 sha 一致 | LEDGER + 文件 + `git rev-parse HEAD` 比对 |

## 修订 5 — A23 与 A24 的判定范围调整

**A23 原文**：`git status --porcelain` 为空。

**修订为**：T010 提交完成时 `git status --porcelain` 为空。此后因执行修订 3 产生的 `specs/comms/` 改动**不计入** A23，`AUDITOR` 以 T010 的提交为审核锚点。

**A24 原文**：`specs/PROJECT_INDEX.md`、`specs/BLOCKERS.md`、`specs/dev/DAG.md`、`specs/tasks/**` 未被修改。

**修订为**：追加 `specs/protocol/**`、`specs/audit/**`，以及 `specs/comms/` 中所有非 OPENCODE 发出的消息文件。`LEDGER.md` 只允许追加新行 —— 若已有行被修改或删除，A24 判 FAIL。

---

## 未变更事项

- A01 ~ A22 判定标准与判定方式**完全不变**
- T001 ~ T010 的任务内容、允许文件、Requirements **完全不变**
- 第 9 节 Constraints、第 10 节 Non-goals **完全不变**
- 本修订**不构成** Scope 扩大，`AUDITOR` 不得据此放宽任何纪律检查

## 生效基准

三方以本修订后的版本为验收基准。`AUDITOR` 审核时：

- 权威 Acceptance = `specs/tasks/TASK-PACKAGE-DEV-000.md` 第 12 节 **＋ 本消息的修订 4、5**
- 节点 `ACCEPTANCE.md` 若未反映本修订，不视为 MISMATCH（该文件由 T001 在本修订之前抄录）；但 A25 仍须审核
