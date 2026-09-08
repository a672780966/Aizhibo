# DEV-071 DECISIONS

本文件记录 DEV-071（AI Chapter Generator，M7 第二个节点）施工中的
关键决策。权威需求来源为 `specs/tasks/TASK-PACKAGE-DEV-071.md`。

## D1 — 不建真实 LLM 网络客户端：Dev Spec 未给出任何可对接协议

Dev Spec 对 DEV-071 只给出标题「AI Chapter Generator」，未给出任何
具体的外部 LLM API 协议、鉴权方式、请求/响应格式；第 25-26 节把
「GPT-5.6 Sol / Fable 5」列为 Offline Authoring 使用的强模型，但同样
没有给出任何可对接的具体接口。因此本节点采用与 `packages/ai-host/src/
hostLLMProvider.ts`（DEV-05X 系列）完全相同的方案：只建
`AiChapterGeneratorPort` 接口 + `noopAiChapterGeneratorPort` 诚实占位
实现（恒定 `ok:false` / `status:'DOWN'`，与输入无关），不建真实网络
客户端、不发明协议。这与 DEV-040（Twitch OAuth）/DEV-041（Twitch
EventSub）/DEV-064（OBS WebSocket v5）的「建真实客户端」先例并不矛盾
——后三者面对的是真实、公开、稳定的外部协议文档，而本节点面对的是
不存在任何可查证协议文档的抽象 LLM 调用；**协议是否存在才是判据**。
`Health` 类型按 hostLLMProvider.ts 自身镜像 shared 契约的同一纪律做
本地镜像（逐字段一致，不 import），保持零跨包耦合。

## D2 — `buildChapterAuthoringRequest` 是本节点唯一的真实确定性逻辑，且不做任何 schema 校验/normalize

Dev Spec 未给出 LLM 协议，因此「真实调用 AI 生成 Chapter 草稿」在本
节点不可施工；本节点唯一真实可施工的内容，是把 DEV-070 冻结的
`CHAPTER_AUTHORING_SCHEMA_PROMPT` 与调用方提供的 brief **真实、确定性
地拼接**成一段完整的请求文本。这个纯函数不依赖任何未定义的外部协议，
三条性质（完整 includes 未改动的 schema prompt、完整 includes brief
原文、schema prompt 严格先于 brief 出现）可被测试完全机械验证。拼接
函数**不做任何 schema 校验/normalize**——那属于既有 Compiler（DEV-002）
与未来 AI Repair Loop（DEV-072）的职责；本节点只负责「把 prompt 和
brief 拼起来」，brief 是自由格式的自然语言意图简述，本节点不解析、
不约束其内容。

## D3 — 空/空白 brief 抛错而非静默通过

若 brief 为空或只含空白字符，拼接出的请求文本就只有 schema prompt、
没有任何创作意图——把这样的请求发给未来真实接入的 provider 只会浪费
一次调用并产出无意义的草稿。因此 `buildChapterAuthoringRequest` 对
`brief.trim()` 为空的情况抛出 `Error`（明确失败、带清晰错误信息），
而不是返回一段看似合法实则空洞的文本；调用方（未来的真实 provider
接入方）必须在调用前保证 brief 非空。

## D4 — 唯一允许的 workspace 依赖是 `chapter-authoring-prompts`

本节点唯一需要复用的既有内容是 DEV-070 冻结导出的
`CHAPTER_AUTHORING_SCHEMA_PROMPT`（本节点把它原样拼入请求文本）——
因此 `package.json` 的 `dependencies` 只有
`@interactive-story/chapter-authoring-prompts`（`workspace:*`，同
chapter-compiler 引用 chapter-schema 的仓库惯例），不新增任何第三方
npm 依赖，也不 import/依赖任何其他既有包（`hostLLMProvider.ts` 只作
为风格先例 Read-only 参考，不 import）。schema prompt 是两节点之间的
唯一冻结契约：DEV-070 负责定义与冻结，DEV-071 只消费、不改写。
