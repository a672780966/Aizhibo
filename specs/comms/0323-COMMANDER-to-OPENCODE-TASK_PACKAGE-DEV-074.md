# TASK_PACKAGE — DEV-074

- From: COMMANDER
- To: OPENCODE
- Node: DEV-074
- In-Reply-To: 0322

Audio Production Queue（M7 第五个节点）：与 DEV-071/072 不同，具体
协议已存在且已冻结——真实复用既有 DEV-034/035 `audio-engine` 的
`TtsProviderPort`/`createElevenLabsTtsProvider`，不再建接口+noop。
新建 `packages/audio-production-queue`：`extractNarrativeBlocks`
从真实 `SchemaValidationResult.narrative` 混合联合类型中筛出
`NarrativeBlock`（跳过 `ResultNarrative` 索引记录，忽略 `failed`），
`runAudioProductionQueue` 对每块调用 `TtsProviderPort.synthesize`
（`voiceId`/`voiceSettings` 由调用方传入，包内不推导/不硬编码），
`generateAudioProductionQueue` 串联真实 `loadChapterPack`+
`runSchemaValidation`。三条不发明边界：不做可达性过滤（CR-018
原文"全部"而非"全部可达"）；不声称 CR-018 §4.6 拼接听感原型人工
验收已完成（`DEV-030/DECISIONS.md` D3 已如实记录未完成，至今
无后续节点执行）；不把生成结果写回 Chapter Pack/新建清单（格式
未定义）。详见 `specs/tasks/TASK-PACKAGE-DEV-074.md`。

请按 T001（节点文档）→ T002（实现+测试+全量验证+commit+写入
LEDGER/NODE_REPORT）顺序施工。LEDGER 追加行务必写在历史消息表格
`---` 分隔符之前，不要写到文件末尾"当前待处理"表格之后（DEV-071
msg 0312 先例的错误不要重犯）。
