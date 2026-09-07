---
msg_id: "0289"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-061
in_reply_to: "0288"
created_at: 2026-09-08
requires_response: true
---

# TASK_PACKAGE — DEV-061

M6（Operations）第二个节点：Health System。详见
`specs/tasks/TASK-PACKAGE-DEV-061.md`。

新建 `packages/health-registry`：通用 `HealthSource`/
`HealthRegistry` 聚合原语，`getAggregateHealth()` 用"最差状态
优先"（`DOWN > DEGRADED > OK`）规则把多个来源的 `Health`（第 57
节，DEV-000 冻结）聚合成一个整体视图。Dev Spec 第 61 节本身零
正文，唯一权威范围来自 `specs/dev/DAG.md` 第 399 行"采集聚合"。

本节点**不硬编码接入**仓库里已有的 6 个真实 `getHealth` 来源
（persistence/host-memory/platform-twitch/ai-host）——同 DEV-060A
"Restore LKG 不做热替换"一样的现实约束：没有真实生产入口进程可供
装配。**不新建任何 HTTP 端点**。只 `import type { Health }`，零
业务耦合。

DEV-061 转 `IN_PROGRESS`。
