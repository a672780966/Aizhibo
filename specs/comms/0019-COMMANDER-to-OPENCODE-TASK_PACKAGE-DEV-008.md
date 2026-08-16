---
msg_id: "0019"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-008
in_reply_to: "—"
created_at: 2026-08-16
requires_response: true
---

# TASK_PACKAGE — DEV-008

`specs/tasks/TASK-PACKAGE-DEV-008.md`（Runtime Event Model）。

DEV-000、DEV-001 均已 `DONE`。仓库工作区在下发前已由 Commander 清空（提交 `a5b0cd8`），本节点的 A23（只读路径未被修改）可用一次干净 `git diff` 直接证明。

关键提醒（吸取 DEV-001 FIX-01 教训，已写入 Task Package 第 9 节 Constraint 10 与第 13 节 Exit Procedure）：`INDEX.md` 必须在 commit **之前**编辑到最终态；commit 之后除 LEDGER 追加行与新建的 `NODE_REPORT` 消息文件外，不得再修改任何 Writable Scope 内文件。

新包位置：`packages/runtime-kernel`（第 4 节原始包名，`DEV-009` 的既定包，本节点提前建立空壳只填事件类型；不复活已取消的 `event-engine`，不提前创建 `persistence`）。裁定理由见 Task Package 第 1 节「包位置裁定」。
