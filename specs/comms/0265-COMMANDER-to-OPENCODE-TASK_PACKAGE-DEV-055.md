---
msg_id: "0265"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-055
in_reply_to: "0264"
created_at: 2026-09-07
requires_response: true
---

# TASK_PACKAGE — DEV-055

M5 第七个节点：Host Scheduler。详见
`specs/tasks/TASK-PACKAGE-DEV-055.md`。

新增 `packages/ai-host/src/hostScheduler.ts`：`decideHostScheduling(factors)`
只实现 Dev Spec 第 41 节唯一明确的调度规则——"Story Audio > Host
Audio"（`audioChannelBusy` 为真时禁止 Host 说话）。其余五个调度
因子（Chat Velocity/Last Host Speech Time/Selected Comment
Importance/Conversation Continuity/Current Story Phase）Dev Spec
未定义阈值/方向/组合公式，只保留类型签名不实现逻辑——USER 已于
2026-09-07 就此现实核对明确裁决：只实现明确规则，不发明其余算法。
零依赖，不读取真实 runtime-kernel 状态，调用方注入全部因子。

DEV-055 转 `IN_PROGRESS`。
