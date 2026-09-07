---
msg_id: "0285"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-060A
in_reply_to: "0284"
created_at: 2026-09-07
requires_response: true
---

# TASK_PACKAGE — DEV-060A

M6（Operations）第一个/优先节点：Operator API（CR-013 已批准，
DEV-060 拆为本节点与后置的 DEV-060B Console UI）。详见
`specs/tasks/TASK-PACKAGE-DEV-060A.md`。

新增 `packages/ai-host/src/hostPermission.ts`（`Mute
Host`/`Unmute Host` 用的可变存储，与 DEV-053 host mood 同构）+
新建 `packages/operator-api` 包（`operatorActions.ts`/
`operatorAuth.ts`/`operatorOverrideLog.ts`/`operatorDispatch.ts`/
`operatorHttpServer.ts`）：实现 Dev Spec 第 53 节 11 个 Operator
Action 的 HTTP 端点 + Bearer token 鉴权占位 + 无条件
`OPERATOR_OVERRIDE` 事件审计落库（第 54 节）。

Commander 起草前独立核查代码库：11 个 action 中只有 `Restore
LKG`/`Mute Host`/`Unmute Host` 三个有真实可调用目标；其余 8 个
（`Pause`/`Resume`/`Close Interaction`/`Force Resolve`/`Replay
Current Audio`/`Restart Scene`/`Switch OBS Failover`/`Emergency
Stop`）因 `runtime-kernel`（M1 起冻结）没有对应 `RootEvent`，或
`SAFETY`/OBS 子系统根本不存在（占位/未建成，等 DEV-063/065/067），
不发 CR 改冻结接口、不发明真实逻辑，诚实占位返回 `ok:false` + 具体
原因——USER 已于 2026-09-07 就此裁决。用 `node:http` 原生模块，零
新增依赖。

DEV-060A 转 `IN_PROGRESS`。
