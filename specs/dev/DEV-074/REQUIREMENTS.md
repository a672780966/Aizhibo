# DEV-074 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-074.md` 逐字抄录关键要求。
权威版本是 Task Package，不是本副本（协议 §1.4）。

1. 新建 `packages/audio-production-queue`，恰两个 workspace 依赖：
   `@interactive-story/chapter-compiler`、`@interactive-story/audio-engine`，
   无第三方依赖。
2. `src/extractNarrativeBlocks.ts`：纯函数
   `extractNarrativeBlocks(schemaResult: SchemaValidationResult):
   Array<{ id: string; slot: string; text: string }>`——遍历
   `schemaResult.narrative.passed`（`CollectionResult<ResultNarrative |
   NarrativeBlock>` 混合联合类型）：含 `text` 字段的是 `NarrativeBlock`，
   收入结果；含 `primaryBlockId` 字段（无 `text`）的是 `ResultNarrative`
   （块 id 的索引记录），**不产生任何音频需求**，跳过。
   `narrative.failed` 中的校验失败条目**忽略，不抛错**。返回结果按
   `id` 字典序排序（去重不是本函数职责——`NarrativeBlock.id` 已由
   既有 DEV-002A 唯一性校验保证全局唯一）。
3. `src/runAudioProductionQueue.ts`：对每个块调用
   `ttsPort.synthesize({ text: block.text, voiceId: voice.voiceId,
   voiceSettings: voice.voiceSettings })`，用 `Promise.all` 并行处理，
   互不影响（一个块失败不阻塞其他块）。每个块的结果原样保留
   `TtsSynthesisResult` 的 `{ok, file}` 或 `{ok:false, reason}`，附加
   `blockId`/`slot`，**不重试、不做任何额外逻辑**。
4. `src/generateAudioProductionQueue.ts`：薄封装，串联真实
   `loadChapterPack`/`runSchemaValidation`（同 DEV-073
   `generateAssetRequirements.ts` 手法）。
5. `src/index.ts` barrel（三个源文件三行 export）。
6. `VoiceConfig = { voiceId: string; voiceSettings: Record<string,
   number | string> }` 作为调用方参数传入，包内不推导/不硬编码任何
   默认 voiceId/voiceSettings。
7. 三条不发明边界：不做可达性过滤（CR-018 原文"全部"而非"全部可达"）；
   不声称 CR-018 §4.6 拼接听感原型人工验收已完成（该验收需要真人
   试听判断，`DEV-030/DECISIONS.md` D3 已如实记录为未完成）；不把
   生成结果写回 Chapter Pack/不新建 AudioAsset 清单条目（没有任何
   Dev Spec/CR 文本定义具体清单格式）。
8. 测试中一律使用 `noopTtsProviderPort` 或手写测试替身，**不得真实
   发起网络请求**。
9. 六条验证命令全部退出码 0，零回归。
10. 详见 Task Package 第 1、2、6、12 节。
