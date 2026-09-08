# DEV-073 DECISIONS

本文件记录 DEV-073（Asset Requirement Generator，M7 第四个节点）施工
中的关键决策。权威需求来源为
`specs/tasks/TASK-PACKAGE-DEV-073.md`（第 1 节上下文、第 6 节 Key
Decisions）。

## D1 — 五类别 → schema 字段映射表逐字段成立，且是"内容引用"而非"声明清单"

Dev Spec（`specs/baseline/DEV_SPEC_V1.0.md` 第 2785-2796 行）只给了
五个输出类别：「需要哪些插画 / 需要哪些表情 / 需要哪些序列帧 /
需要哪些BGM / 需要哪些声音」——语义是**需要生产哪些资产**。映射到
`chapter-schema` 真实字段（逐一对照
`packages/chapter-schema/src/visuals.ts`、`audio.ts` 的冻结定义）：

| Dev Spec 类别 | schema 真实来源字段 | 核对 |
|---|---|---|
| 插画 illustrations | 每个 `VisualScene.layers[].assetId` | `VisualLayerSchema = z.object({ assetId: z.string(), z: z.number(), parallax: optional })`，`VisualSceneSchema.layers = z.array(VisualLayerSchema)`——场景图层引用的图片即"需要画的插画" |
| 表情 expressions | 每个 `CharacterAsset.expressions` 记录的**值** | `CharacterAssetSchema.expressions = z.record(z.string(), z.string())`：键是表情名，值是被引用的**图片 asset id**——「需要哪些表情」= 每个表情名下需要生产的那张图 |
| 序列帧 frameSequences | 每个 `CharacterAsset.microAnimations` 数组的全部元素 | `microAnimations: z.array(z.string()).optional()`——元素本身是序列帧/动画资源 id |
| BGM | 每个 `AudioAsset` 中 `kind === 'BGM'` 的 `id` | `AudioAssetSchema`（`audio.ts` 联合）两分支共享 `kind: z.enum(['SPEECH','BGM','SFX','AMBIENCE'])` |
| 声音 voice | 每个 `AudioAsset` 中 `kind !== 'BGM'`（`SPEECH`/`SFX`/`AMBIENCE`）的 `id` | 同上；Task Package 第 1 节明确把非 BGM 三类并入 voice |

`visuals` 集合是 `VisualScene | CharacterAsset | ImageAsset` 混合联合
（`chapter-compiler` 的 `SchemaValidationResult.visuals`，`pass1Schema.ts`
`validateVisualEntries` 依次用三个 schema safeParse 归并），实现按字段
存在性窄化：`'layers' in value` → `VisualScene`；`'expressions' in
value` → `CharacterAsset`。五列输出的是**被内容引用、需要生产**的 id，
不是资产自身的声明清单——与 Dev Spec「需要哪些」的措辞一致。

## D2 — 不做可达性（reachability）过滤：Dev Spec 未提及，不发明

Dev Spec 对 DEV-073 只要求从 Chapter 导出五类资产清单，原文没有出现
任何"只统计可达 Scene/NPC 的资产"表述；Task Package 第 1 节亦明确：
即便某 Scene/NPC 在故事图里不可达，只要它出现在 Chapter Pack 里，
其引用的资产仍计入需求。发明可达性过滤需要消费 storyGraph + PASS3
可达性结果、定义"不可达内容不生产资产"的语义——这是对未来生产预算
的预判，若产品需要"只统计可达内容"，那是另一个明确的 CR/USER 决策。
本节点只报告需求，不报告可达性判断（`chapter-compiler` 的 PASS3
`UNREACHABLE_*` 结果已在 compile 门禁中承担"内容是否可发布"的职责，
与"资产需求统计"正交）。实现中无任何 storyGraph/图遍历依赖。

## D3 — 裸 `ImageAsset` 条目本身不产生任何输出：它只是被引用的目标

`ImageAssetSchema = { id, file }` 声明"某张图片文件已登记"，
`ImageAsset` 出现在 `visuals.passed` 只说明资产清单里有这张图的元
数据——它被哪张图需要，取决于 `VisualLayer.assetId` /
`CharacterAsset.expressions` 值是否引用它。产出 `illustrations`/
`expressions` 的是**引用方的字段值**；若把裸 `ImageAsset` 的 `id`
也计入，输出就变成"声明清单"而非"需求清单"，重复报告未被子层内容
引用的闲置资产（A08 断言：裸 `ImageAsset` 的 `id` 不出现在任何输出
数组，除非恰好也被某 `VisualLayer.assetId` 引用）。

## D4 — 校验失败（`failed`）条目静默忽略：未通过校验的内容不产生任何资产 id

`runSchemaValidation` 返回的 `passed`/`failed` 是把"内容是否符合
schema"与"内容是否可被采信"绑定的权威切分：`failed` 条目的内容根本
没通过 schema 校验（可能缺字段、类型错、结构错），从这样的内容里
提取资产 id 等于把不可信数据当事实用。实现只遍历
`visuals.passed`/`audio.passed`，对 `failed` 不做任何处理、不抛错、
不记录——"校验失败的内容需要哪些资产"没有定义，也不需要定义。
（`loadChapterPack` 的加载 `issues` 同理：加载失败的文件在
`schemaResult` 里连条目都不会出现，`generateAssetRequirements` 只读
`passed` 天然忽略，无需额外分支。）

## D5 — 输出去重 + 字典序排序：确定性输出，与遍历顺序无关

同一 Chapter Pack 里同一资产 id 会被多处引用（同一张背景图出现在
多个 VisualScene 的 layer、同一表情图被多个 CharacterAsset 引用、BGM
在多个场景复用）——需求清单是**集合**不是**多重集**，重复报告没有
信息量且会让下游消费端（如未来的生产队列）重复排队。五个数组各自
`Array.from(new Set(...)).sort()`（字典序）后返回：同一输入永远产生
逐字节一致的输出，便于测试断言（A07/A11）与下游做增量比对。
