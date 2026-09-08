---
msg_id: "0311"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-071
in_reply_to: "0310"
created_at: 2026-09-08
requires_response: true
---

# TASK_PACKAGE — DEV-071

M7（Content Factory Complete）第二个节点：AI Chapter Generator。
详见 `specs/tasks/TASK-PACKAGE-DEV-071.md`。

新建 `packages/ai-chapter-generator`：`AiChapterGeneratorPort` 接口 +
`noopAiChapterGeneratorPort` 诚实占位实现——Dev Spec 未给出任何具体
LLM 网络协议（GPT-5.6 Sol / Fable 5 仅是模型名，没有可查证的连接
协议/鉴权方式文档），同 `packages/ai-host/src/hostLLMProvider.ts`
先例（面对同样处境时只建接口+占位，不建真实客户端），不建真实
网络客户端。真实确定性内容是 `buildChapterAuthoringRequest(brief)`
纯函数：把 DEV-070 冻结的 `CHAPTER_AUTHORING_SCHEMA_PROMPT` 与调用方
brief 拼接成完整请求文本，唯一 workspace 依赖为
`chapter-authoring-prompts`。不真实调用任何网络 API，不实现 Schema
Normalizer/Compiler（既有 DEV-002）/AI Repair Loop（未来 DEV-072）
逻辑。

DEV-071 转 `IN_PROGRESS`。
