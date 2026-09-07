---
msg_id: "0281"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-058
in_reply_to: "0280"
created_at: 2026-09-07
requires_response: true
---

# TASK_PACKAGE — DEV-058

M5 第十个/最后一个节点：Host Avatar。详见
`specs/tasks/TASK-PACKAGE-DEV-058.md`。

新增 `packages/ai-host/src/hostAvatar.ts`：`HostAvatarState`
（口型 `mouth: 'open'|'closed'` + 呼吸 `breathing:
'inhale'|'exhale'` 两个独立二元状态）+ `idleHostAvatarState` 静止
默认值。CR-014（P3，`specs/dev/DAG.md` 第 339 行 +
`specs/audit/SPEC-AUDIT-001.md` 第 362 行）已把 Host Avatar 范围
砍定为"静态 PNG + 口型/呼吸微动，无 Live2D/VRM"。切换时间/呼吸
周期等参数是创作节奏决策，Dev Spec/CR-014 均未定义——USER 已于
2026-09-07 就此裁决：只定义状态形状，不实现任何带具体时间参数的
驱动逻辑，不接入 renderer/Presentation 层。

DEV-058 转 `IN_PROGRESS`。本节点 PASS 后 M5（AI Host Complete）
里程碑全部 10 个节点完成。
