---
msg_id: "0239"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-052
in_reply_to: "0238"
created_at: 2026-09-05
requires_response: true
---

# TASK_PACKAGE — DEV-052

M5 第四个节点：Host Persona。详见
`specs/tasks/TASK-PACKAGE-DEV-052.md`。

新增 `packages/ai-host/src/hostPersona.ts`：`HostPersona`（`name` +
`voiceDescription`）静态数据结构 + `getHostPersona()` 访问器，唯一
默认值。Dev Spec 第 37 节把 Host Persona 列为 Host Context 八项
输入之一，但全篇未定义具体人设文案/字段——本节点不发明性格形容词，
`voiceDescription` 默认文案直接复述第 36 节已写出的 Host 职责列表。
不接入 Host Scheduler/LLM Provider，不做可配置多人设系统。

DEV-052 转 `IN_PROGRESS`。
