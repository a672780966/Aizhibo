---
msg_id: "0243"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-053
in_reply_to: "0242"
created_at: 2026-09-05
requires_response: true
---

# TASK_PACKAGE — DEV-053

M5 第五个节点：Host Mood。详见
`specs/tasks/TASK-PACKAGE-DEV-053.md`。

新增 `packages/ai-host/src/hostMood.ts`：`HostMood`（`label` 自由
文本）+ 可变的 `HostMoodStore`（`getMood`/`setMood`）+
`createHostMoodStore(initial?)` 工厂，默认值 `{ label: 'neutral' }`。
Dev Spec 第 37 节把 Host Mood 列为 Host Context 八项输入之一，但
全篇未定义情绪分类枚举/推导规则——本节点不发明封闭取值集合、不做
任何"根据 danger/tension/Public State 自动推导 Mood"的算法，只
提供可读可写的存储原语，跟 DEV-052（Host Persona）同一"基础设施
不发明内容"取舍精神，区别在于 Mood 可变、Persona 不可变。

DEV-053 转 `IN_PROGRESS`。
