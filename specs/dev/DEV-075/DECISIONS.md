# DEV-075 DECISIONS

本文件记录 DEV-075（Chapter Packager，M7 第六个节点）施工中的关键
决策。权威需求来源为 `specs/tasks/TASK-PACKAGE-DEV-075.md`（第 1 节
上下文、第 6 节 Key Decisions）。Dev Spec 第 2805-2807 行对本节点
只有标题「Chapter Packager」、正文为空——真正的职责定义来自两处 CR
（`specs/dev/DAG.md` 第 88 行 CR-006；`specs/audit/CR-RESOLUTIONS-001.md`
§4.4 第 313-319 行 CR-018）。

## D1 — 本节点要做可达性过滤：CR-018 §4.4 原文对 DEV-075 明确用「可达」

CR-018（`specs/audit/CR-RESOLUTIONS-001.md` §4.4，第 313-319 行）原文：

> `DEV-074 Audio Production Queue`……获得明确职责：遍历 Chapter Pack
> 全部 `NarrativeBlock`，批量生成 `PREGENERATED` 音频，随 Bundle 发布。
> `DEV-075 Chapter Packager` 的 PASS 7 资产文件存在性检查随之覆盖：
> **每个可达 NarrativeBlock 必须有对应音频文件**。

对 DEV-074 的职责原文用「**全部** `NarrativeBlock`」，对 DEV-075 的
职责原文用「每个**可达** `NarrativeBlock`」——同一节内两个词并排出现，
差异是原文明写、不是本节点的推断。DEV-073/074 因此裁定**不做**可达性
过滤（DEV-073 msg 0319、DEV-074 msg 0323：各自的 CR 原文不要求"可达"，
实现过滤属于发明）；本节点的 CR 原文明确要求"可达"，故
`computeReachableNarrativeBlockIds` 只对 `reachability.reachable`
（`Pass3ReachabilityResult.reachable: Set<string>`，
`pass3Reachability.ts:4`）中的节点收集 block id（A12 断言不可达
Scene/Boss/Ending 关联的 block 零贡献）——可达性过滤在本节点是**明确
规定的职责，不是发明**。

## D2 — Path A + Path B 两条独立链路缺一不可

从 DEV-003（`pass3Reachability.ts`）的可达节点走到"可达
`NarrativeBlock`"需要再拼一条链路，经直接读源码确认这条链路有两条
独立路径，缺一都会漏算：

- **Path A**（经互动链）：`SceneNode.interactionId`（可选，
  `packages/chapter-schema/src/scene.ts:22`）或 `BossPhase.interactionId`
  （必填，`boss.ts:9`）→ `InteractionNode.choices[].ruleId`（
  `interaction.ts:5-12`）→ `ActionDefinition.resultSetId`（`action.ts:
  4-12`）→ `ResultDictionary.entries[]`（`result.ts:70-74`）→
  `narrativeId` → `ResultNarrative`（`narrative.ts:13-26`）五档 block
  字段（`primaryBlockId`/`supportBlockIds?`/`urgencyBlockId?`/
  `transitionBlockId?`/`prefixBlockId?`）。
- **Path B**（直连字段，绕过整条互动链）：`BossPhase.narrationBlockIds?`
  （`boss.ts:10`，可选）与 `EndingNode.narrationBlockIds`
  （`endings.ts:12`，必填）直接持有 `NarrativeBlock` id 数组。

`BossPhase` 两条路径都要走：`interactionId` 必填（`boss.ts:9`）走 Path A，
`narrationBlockIds` 可选但存在时也要收集（`boss.ts:10`）走 Path B——
只走任一条都会漏掉另一半可达 block。`EndingNode` 只有 Path B（无
`interactionId`/`choices`，是终止节点，`pass3GraphModel.ts:56` 注释
明确写"EndingNode contributes no outgoing edges by design"）。实现里
对可达 `BOSS` 的每个 phase 先 `walkPathA(phase.interactionId)` 再
`add(...(phase.narrationBlockIds ?? []))`（A10 走通 Path A 五档字段、
A11 断言 Path B 结果在互动链数据被破坏时依然被收集）。

## D3 — `mapsTo` 原样复用 `pass2ActionChain.ts` 既有一跳同字典语义

`ResultDictionary.entries` 每项是三态联合：`{quality,resultId,...,
narrativeId,visibility}` 或 `{quality,mapsTo}` 或 `{quality,
unreachable:true}`（`result.ts`）。`mapsTo` 的含义是"本 quality 走目标
quality 的结果"，`pass2ActionChain.ts` 已实现并校验过：`mapsTo` 链
最多一跳，目标按 `quality` 在**同一个** `entries` 数组内查找
（`entry.value.entries.find((e) => e.quality === resultEntry.mapsTo)`），
且链式 mapsTo（目标自身是 mapsTo 条目）被判定为 BLOCKING 违规。本函数
原样复用这一语义：`{quality,mapsTo}` 条目只跳一跳、只在同一字典内按
`quality` 匹配、目标无 `narrativeId`（目标不存在/目标是 mapsTo/
目标是 unreachable）即贡献零 block id；`{quality,unreachable:true}`
条目直接跳过（A13）。重新发明一套不同语义会产生与既有 PASS 2 校验
矛盾的结果（例如允许链式 mapsTo 会让"PASS 2 判定违规的内容"在 PASS 7
被当作有效解析），故不发明第二种解释。

## D4 — `entryNodeId` 不做成调用方参数：它是真实必填 schema 字段

`computeReachability` 的第二个参数 `entryNodeId` **已经是真实 schema
字段**——`ChapterManifestSchema.entryNodeId: z.string()`（必填，
`packages/chapter-schema/src/manifest.ts:39-52`），既有编排函数
`runPass3`（`packages/chapter-compiler/src/compile.ts:147-155`）内部
就是这样读的：`schemaResult.manifest.passed?.entryNodeId ?? ''`。本包
直接调用既有导出的 `runPass3(schemaResult)`（经 `export * from
'./compile.js'` 由 barrel 导出）取得 `{graphModel, reachability,
trapCycles}`，**不**把 `entryNodeId` 做成任何函数的调用方参数
（A18）。这与 DEV-074 的 `voiceId`（真的没有 schema 字段，必须外部
传入）不是同一种情况：DEV-074 无字段可读所以外部化是唯一诚实做法，
本节点有真实字段且既有读取路径已冻结，外部化反而制造重复参数。

## D5 — 资产文件路径解析采用"相对 rootDir"：假设，非 spec 明文规则

Dev Spec/CR 全篇未定义资产 `file` 字段相对哪个根目录解析。仓库内唯一
有先例、内部自洽的约定是 `loader.ts` 加载 Chapter Pack 源文件的
"相对 rootDir"（`loadChapterPack(rootDir)` 内 `join(rootDir, relPath)`
读所有章节文件），本节点沿用同一约定：
`existsSync(resolve(rootDir, value.file))`（A17）。此约定是本节点
自行做出的**假设**——措辞是"假设"而非"spec 事实"；若未来 Bundle
规范定义不同的资产根目录语义，只需改动本函数一行的解析基址，返回
结构与调用契约不变。

## D6 — 音频覆盖检查接受调用方传入的 `NarrativeBlockAudioResult[]`，不扫描磁盘/不发明 manifest

"每个可达 NarrativeBlock 必须有对应音频文件"这一跳到"实际磁盘上有
没有对应音频文件"存在真正的 schema 缺口：`AudioAssetSchema`
（`packages/chapter-schema/src/audio.ts`）没有任何字段引用
`NarrativeBlock` id，`NarrativeBlockSchema`（`narrative.ts:4-11`）也
没有任何字段引用音频文件——这个绑定机制在 `DEV-074/DECISIONS.md`
D4 与 `specs/tasks/TASK-PACKAGE-DEV-074.md` §10 中均已如实记录为
"未分配 DEV 编号，格式未定义"。处置：本节点不发明磁盘扫描/命名约定/
manifest 格式去猜这个绑定（Forbidden Scope 明文禁止），而是让
`checkNarrativeBlockAudioCoverage(reachableBlockIds, audioResults)` 直接
接受调用方传入的 `NarrativeBlockAudioResult[]`（DEV-074 冻结的真实
类型，例如某次真实 `generateAudioProductionQueue` 调用的返回值）为
唯一输入——`ok:true` 视为覆盖，`ok:false` 或该 block 完全不在数组中
视为未覆盖（A16：函数体无任何 fs/glob/文件名拼接）。谁在真实生产里
如何把音频结果注册回章节内容结构（未来的 Bundle 节点/CR），是调用方
与未来节点的职责。

## D7 — 不产出任何 Bundle/manifest 文件：Dev Spec 只有标题、无正文

Dev Spec 第 2805-2807 行只给本节点标题「Chapter Packager」，正文为空，
全篇从未定义"打包"要产出什么文件/什么序列化格式；CR-006 只把 PASS 7
「文件存在性」校验改归本节点、同样未定义输出物。发明 Bundle/manifest
序列化格式并把打包结果写入任何新文件超出本节点职责（A20：无
`fs.writeFile`/`fs.mkdir` 等任何写盘调用）。本节点交付物停在"内存中
的校验报告结构体"（`ChapterPackagerReport` = `assetFileExistence` +
`narrativeBlockAudioCoverage`）这一层；Bundle/manifest 序列化与发布
机制留待未来节点（Task Package §10：未分配 DEV 编号，格式未定义）。
