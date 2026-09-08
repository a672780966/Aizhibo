---
msg_id: "0307"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-070
in_reply_to: "0306"
created_at: 2026-09-08
requires_response: true
---

# TASK_PACKAGE — DEV-070

M7（Content Factory Complete）第一个节点：Chapter Authoring
Schema Prompt。M6 已在真实可施工范围内完成（5/9 DONE，
DEV-065/066/067 均裁定 `BLOCKED`，DEV-060B 按 CR-013 后置）。详见
`specs/tasks/TASK-PACKAGE-DEV-070.md`。

新建 `packages/chapter-authoring-prompts`：导出
`CHAPTER_AUTHORING_SCHEMA_PROMPT` 字符串常量——一段指导 AI 模型
（GPT-5.6 Sol / Fable 5）按 `chapter-schema`（DEV-001 冻结）逐
模块写作 Chapter 内容的十一阶段 prompt。本节点交付物类型与
M1–M6 全部节点不同（prompt 文本，非确定性类型/决策代码）。
Commander 已逐一核对 `chapter-schema` 全部 19 个组件的真实字段
撰写 prompt 正文，执行方须逐字照抄，不得改写。USER 已裁决要求
完整、逐模块覆盖（而非只写高层框架）。零依赖，不真实调用任何
AI API（DEV-071 职责），不实现 Compiler/AI Repair Loop 逻辑
（既有 DEV-002/未来 DEV-072 职责）。

DEV-070 转 `IN_PROGRESS`。
