---
msg_id: "0299"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-063
in_reply_to: "0298"
created_at: 2026-09-08
requires_response: true
---

# TASK_PACKAGE — DEV-063

M6（Operations）第四个节点：Watchdog。详见
`specs/tasks/TASK-PACKAGE-DEV-063.md`。

新建 `packages/watchdog`：`WatchdogTrigger`（第 56 节 L3"Runtime
可恢复"给出的封闭三值集合：`RENDERER_CRASH`/`TWITCH_DISCONNECT`/
`RUNTIME_PROCESS_RESTART`）+ `decideWatchdogAction` 判断函数。第
63 节本身零正文，`DAG.md` 备注为空，唯一权威范围来自第 56 节 L3。

USER 已就"L3 这三个场景该封闭处理写真实分支，还是像 DEV-062
error-registry 的 category 一样开放"裁决：**封闭三值集合 + 真实
分支**——`TWITCH_DISCONNECT` 已由 DEV-045 自动重连处理，返回
`ALREADY_HANDLED`；`RENDERER_CRASH`/`RUNTIME_PROCESS_RESTART`
机制均不存在，诚实返回 `NOT_YET_WIRED`。零依赖，不接入
error-registry/health-registry/platform-twitch，不新建 HTTP
端点。

DEV-063 转 `IN_PROGRESS`。
