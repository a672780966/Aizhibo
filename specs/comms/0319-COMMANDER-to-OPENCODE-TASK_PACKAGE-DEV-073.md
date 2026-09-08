---
msg_id: "0319"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-073
in_reply_to: "0318"
created_at: 2026-09-08
requires_response: true
---

# TASK_PACKAGE — DEV-073

M7（Content Factory Complete）第四个节点：Asset Requirement
Generator。详见 `specs/tasks/TASK-PACKAGE-DEV-073.md`。

新建 `packages/asset-requirement-generator`：不涉及任何 AI/LLM
调用，纯确定性数据提取——真实调用既有 DEV-002 Compiler 的
`loadChapterPack`/`runSchemaValidation`，从已校验的 Chapter Pack
内容提取 Dev Spec 给出的五类资产需求（插画/表情/序列帧/BGM/
声音），映射到 `chapter-schema` 真实字段
（`VisualLayer.assetId`/`CharacterAsset.expressions`/
`CharacterAsset.microAnimations`/`AudioAsset.kind`）。不做可达性
过滤（Dev Spec 未提及），不做"已生产/未生产"比对。

DEV-073 转 `IN_PROGRESS`。
