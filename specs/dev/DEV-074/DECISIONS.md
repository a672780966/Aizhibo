# DEV-074 DECISIONS

本文件记录 DEV-074（Audio Production Queue，M7 第五个节点）施工中的
关键决策。权威需求来源为 `specs/tasks/TASK-PACKAGE-DEV-074.md`（第 1
节上下文、第 6 节 Key Decisions）。

## D1 — 不做可达性过滤：CR-018 原文是"全部"而非"全部可达"

CR-018（`specs/audit/CR-RESOLUTIONS-001.md` §4）对 DEV-074 的职责原文
是「遍历 Chapter Pack **全部** `NarrativeBlock`，批量生成
`PREGENERATED` 音频」——不是"全部可达"。"可达"字样只出现在
`DAG.md` 对本节点的一句话摘要里，那是摘要措辞，不是 CR-018 的原文
规则。生成"全部"块严格是生成"全部可达块"的超集，天然满足 DEV-075
未来 PASS 7 的覆盖要求（PASS 7 校验"每个可达 NarrativeBlock 有音频
文件"，全部生成必然通过其可达子集检查）。

且现有 DEV-003（`pass3Reachability.ts`）只在 `SCENE`/`BOSS`/`ENDING`
这一层图上计算可达性；从可达场景到"可达 NarrativeBlock"需要再经过
interaction→`ResultDictionary`→`narrativeId`→`ResultNarrative`→
blockId 的链路拼接——这条链路没有任何既有 DEV-003/pass4/pass5 函数
实现过，凭空写它属于发明新图遍历逻辑，超出本节点职责（同 DEV-073
msg 0319 裁定：不做可达性过滤）。实现中无任何 storyGraph/图遍历/
`computeReachability` 引用（A14）。

## D2 — `voiceId`/`voiceSettings` 是调用方参数，包内不推导不硬编码

`NarrativeBlockSchema`（`packages/chapter-schema/src/narrative.ts`）只有
`id/slot/text/tone?/when?`，没有任何字段能推导出该用哪个 `voiceId`；
`TtsSynthesisRequest` 需要调用方提供 `voiceId`/`voiceSettings`
（`packages/audio-engine/src/ttsProvider.ts`）。Dev Spec 全篇没有给
Narrative Block 定义配音归属规则（它是旁白/叙事文本，不是按角色分配
的对白）。处置：`VoiceConfig`（`voiceId` + `voiceSettings`）作为调用方
参数传入 `runAudioProductionQueue`/`generateAudioProductionQueue`，
同一批次全部块用同一组配置；包内部不猜测、不硬编码任何默认值
（A15）。谁在真实生产环境用什么声音（以及未来若定义 per-block 配音
归属规则）由调用方与未来节点决定。

## D3 — 本节点不代表 CR-018 §4.6 拼接听感原型人工验收已完成

CR-018 原文要求："DEV-030/DEV-033 阶段必须做一次拼接听感原型（十来条
真实块拼装试听），确认可接受后再在 DEV-074 投入全章节生成"。这一步在
`specs/dev/DEV-030/DECISIONS.md` D3 中已如实记录为**未完成**（当时
DEV-034 尚未建成，无真实语音可供试听，延后到"DEV-034/035 真正接上
RUNTIME_TTS 之后"）。核实至今没有任何后续节点执行过这次人工试听——
这是一项需要真人耳朵判断的验收，本自动化流水线不能代为执行或代为
确认"可接受"。处置：本节点如实建造"可真实运行、真实调用 TTS Provider
的批量生产机制"本身，**不代表** CR-018 的听感验收门槛已经满足；该
门槛仍待人工执行，一旦人工确认可接受，即可直接投入生产使用本节点
交付的机制，无需返工。

## D4 — 不把生成结果写回 Chapter Pack、不新建 AudioAsset 清单条目

`runAudioProductionQueue` **不**把生成的 `file` 路径写回任何 Chapter
Pack 文件、也不新建 `AudioAsset` 清单条目或维护 block→file manifest。
把生成结果注册回章节内容结构（例如新增一个 `PREGENERATED` 的
`AudioAsset` JSON 文件、或维护一份 block→file 的 manifest）没有任何
Dev Spec/CR-018 文本定义具体格式——发明清单 schema 超出本节点职责
（A18）。本节点交付物停在"每块一个合成结果
（`TtsSynthesisResult` + `blockId`/`slot`）"这一层；音频文件如何与
Chapter Pack 内容绑定留待未来节点/CR（Task Package §10：未分配 DEV
编号、格式未定义；DEV-075 PASS 7 只做存在性校验，同样不定义清单）。

## D5 — 复用既有真实 `TtsProviderPort`，而非新建接口+noop

本节点与 DEV-071/072 不同：Dev Spec 对 DEV-071/072 未给出具体 LLM
协议，所以那两节点按"无协议只能接口占位"的先例建了接口+noop。DEV-074
面对的具体协议**已经存在且已冻结**——DEV-034 定义了
`TtsProviderPort`/`noopTtsProviderPort`（`packages/audio-engine`），
DEV-035 提供了真实调用 ElevenLabs HTTP API 的
`createElevenLabsTtsProvider`/`createOptionalElevenLabsTtsProvider`。
因此本节点像 DEV-072 复用既有 `compile()` 一样，真实复用这个既有
Port：不重复定义任何接口、不写第二个 noop（测试与诚实占位直接消费
既有 `noopTtsProviderPort`，A13）。`packages/audio-engine`/
`packages/chapter-compiler` 本身零改动（A19）。
