---
node: DEV-075
title: Chapter Packager
milestone: M7 — Content Factory Complete
status: ISSUED
task_package_ref: "0327"
---

# TASK PACKAGE — DEV-075（Chapter Packager）

## 1. Context

Dev Spec 第 2805-2807 行对 DEV-075 只给出标题「Chapter Packager」，
正文为空——与 DEV-070/072/074 面对的"标题有、正文无"情况同类。真正
的职责定义来自两处 CR：

> `specs/dev/DAG.md` 第 88 行（CR-006）：PASS 7 Asset（**文件存在性**）
> 原无归属，改归 DEV-075，理由"资产由第七组生产，此前校验无意义"。

> `specs/audit/CR-RESOLUTIONS-001.md` §4.4（第 313-319 行，CR-018）：
> 对 DEV-074 的职责用词是"遍历 Chapter Pack **全部** `NarrativeBlock`"；
> 对 DEV-075 的职责用词是"每个**可达** `NarrativeBlock` 必须有对应
> 音频文件"。

这与 DEV-074 恰好相反：DEV-074 的 CR-018 原文用"全部"而非"全部可达"，
故 DEV-074 裁定不做可达性过滤（`specs/dev/DEV-074/DECISIONS.md` D1、
消息 0323）。本节点 CR-018 原文明确写的是"可达"，因此**可达性
过滤在本节点属于明确规定的职责，不是发明**——这一点与 DEV-074/
DEV-073 均不同（DEV-073 msg 0319、DEV-074 msg 0323 均裁定不做可达性
过滤，因为各自的 CR 原文都不要求）。

三个交付物：

1. **资产文件存在性校验**（CR-006 / PASS 7）：对 `ImageAsset`/
   `AudioAsset`（`PREPRODUCED`/`PREGENERATED` 两个带 `file` 字段的
   变体）逐一检查磁盘文件是否存在。
2. **可达 `NarrativeBlock` id 计算**（CR-018 对本节点的原文要求）：
   现有 DEV-003（`pass3Reachability.ts`）只在 `SCENE`/`BOSS`/
   `ENDING` 这一层图上计算可达性，从可达节点走到"可达
   `NarrativeBlock`"需要再拼一条链路。经直接读源码确认，这条链路
   有**两条独立路径**，缺一都会漏算：
   - **Path A**（经互动链）：`SceneNode.interactionId`（可选，
     `packages/chapter-schema/src/scene.ts:22`）或
     `BossPhase.interactionId`（必填，
     `packages/chapter-schema/src/boss.ts:9`）→
     `InteractionNode.choices[].ruleId`（
     `packages/chapter-schema/src/interaction.ts:5-12`）→
     `ActionDefinition.resultSetId`（
     `packages/chapter-schema/src/action.ts:4-12`）→
     `ResultDictionary.entries[]`（
     `packages/chapter-schema/src/result.ts:70-74`，每项是
     `{quality,resultId,...,narrativeId,visibility}` 或
     `{quality,mapsTo}` 或 `{quality,unreachable:true}` 三态联合）
     →（`mapsTo` 时按 `quality` 在**同一个** `entries` 数组里再查
     一次，只跳一跳——`pass2ActionChain.ts` 已经实现并验证过这个
     一跳同字典解析语义，本节点必须原样复用其技术，不得另行发明）
     → `narrativeId` → `ResultNarrative`（
     `packages/chapter-schema/src/narrative.ts:13-26`）→
     `primaryBlockId`/`supportBlockIds?`/`urgencyBlockId?`/
     `transitionBlockId?`/`prefixBlockId?` 五个字段收集 block id。
   - **Path B**（直连字段，绕过整条互动链）：`BossPhase.narrationBlockIds?`
     （`boss.ts:10`，可选）与 `EndingNode.narrationBlockIds`
     （`packages/chapter-schema/src/endings.ts:12`，必填）——两者
     都直接持有 `NarrativeBlock` id 数组，与互动链无关。注意
     `BossPhase` 两条路径都要走（`interactionId` 必填，
     `narrationBlockIds` 可选但存在时也要收集），`EndingNode` 只有
     Path B（无 `interactionId`/`choices`，是终止节点，
     `pass3GraphModel.ts:56` 注释明确写"EndingNode contributes no
     outgoing edges by design"）。
   - 两条路径都只对 `reachability.reachable`（
     `Pass3ReachabilityResult.reachable: Set<string>`，
     `pass3Reachability.ts:4`）里的 id 生效，用
     `StoryGraphModel.nodes.get(id)`（`'SCENE'|'BOSS'|'ENDING'`，
     `pass3GraphModel.ts:3-6`）判断该 id 属于哪一类节点。
3. **音频覆盖检查**：把 Path A+B 算出的可达 block id 集合，与调用方
   传入的音频生产结果（`NarrativeBlockAudioResult[]`，DEV-074 已
   冻结的真实类型）逐一比对。**这一跳到"实际磁盘上有没有对应音频
   文件"存在真正的 schema 缺口**：`AudioAssetSchema`
   （`packages/chapter-schema/src/audio.ts`）没有任何字段引用
   `NarrativeBlock` id，`NarrativeBlockSchema`
   （`packages/chapter-schema/src/narrative.ts:4-11`）也没有任何
   字段引用音频文件——这个绑定机制在 `DEV-074/DECISIONS.md` D4 与
   `specs/tasks/TASK-PACKAGE-DEV-074.md` §10 中均已如实记录为
   "未分配 DEV 编号，格式未定义"。处置：本节点不发明磁盘扫描/
   命名约定/manifest 格式去猜这个绑定，而是让覆盖检查函数直接接受
   调用方传入的 `NarrativeBlockAudioResult[]`（例如直接使用某次
   DEV-074 `generateAudioProductionQueue` 调用的真实返回值）——
   `ok:true` 视为覆盖，`ok:false` 或该 block 完全不在数组中视为
   未覆盖。

另有一个已被直接读源码确认、不需要发明的细节：`entryNodeId`
（`computeReachability` 的第二个参数）**已经是真实 schema 字段**——
`ChapterManifestSchema.entryNodeId: z.string()`（必填，
`packages/chapter-schema/src/manifest.ts:39-52`），既有编排函数
`runPass3`（`packages/chapter-compiler/src/compile.ts:147-155`）
内部就是这样读的：`schemaResult.manifest.passed?.entryNodeId ?? ''`。
本节点直接调用既有导出的 `runPass3(schemaResult)`（经
`export * from './compile.js'` 由 barrel 导出）取得
`{graphModel, reachability, trapCycles}`，**不**把 `entryNodeId`
做成任何函数的调用方参数——这与 DEV-074 的 `voiceId`（真的没有
schema 字段，必须外部传入）不是同一种情况，不要混淆处置。

## 2. Deliverable

新建 `packages/chapter-packager`（恰两个 workspace 依赖：
`@interactive-story/chapter-compiler`、
`@interactive-story/audio-production-queue`）。

### 2.1 `src/checkAssetFileExistence.ts`

```ts
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SchemaValidationResult } from '@interactive-story/chapter-compiler';

export interface AssetFileExistenceResult {
  assetId: string;
  file: string;
  exists: boolean;
}

export function checkAssetFileExistence(
  schemaResult: SchemaValidationResult,
  rootDir: string,
): AssetFileExistenceResult[]
```

- 遍历 `schemaResult.visuals.passed`：`visuals` 是 `VisualScene`/
  `ImageAsset`/`CharacterAsset` 的混合联合类型集合（同 DEV-073
  `extractAssetRequirements.ts` 处理手法），用 `'file' in value`
  只挑出裸 `ImageAsset`，跳过 `VisualScene`（`layers`）/
  `CharacterAsset`（`expressions`/`microAnimations`，无 `file`）。
- 遍历 `schemaResult.audio.passed`：`audio` 是 `PREPRODUCED`/
  `PREGENERATED`/`RUNTIME_TTS` 三变体联合类型集合，同样用
  `'file' in value` 只挑出带 `file` 的两个变体，跳过
  `RUNTIME_TTS`（`ttsSpec`，无 `file`）。
- 对每个挑中的资产：`existsSync(resolve(rootDir, value.file))`，
  产出 `{assetId: value.id, file: value.file, exists}`。
- `.failed` 中的条目忽略，不抛错（同 DEV-073 A09 先例）。
- 结果按 `assetId` 字典序排序。
- **路径解析约定是本节点自行做出的假设，不是 spec 明文规则**：
  Dev Spec/CR 全篇未定义资产 `file` 字段相对哪个根目录解析。本
  节点采用与 `loader.ts` 加载 Chapter Pack 源文件相同的
  "相对 `rootDir`" 约定（仓库内唯一有先例、内部自洽的约定），此
  假设必须写入 `DECISIONS.md`，措辞为"假设"而非"spec 事实"。

### 2.2 `src/computeReachableNarrativeBlockIds.ts`

```ts
import type {
  SchemaValidationResult,
  StoryGraphModel,
  Pass3ReachabilityResult,
} from '@interactive-story/chapter-compiler';

export function computeReachableNarrativeBlockIds(
  schemaResult: SchemaValidationResult,
  graphModel: StoryGraphModel,
  reachability: Pass3ReachabilityResult,
): Set<string>
```

实现须精确对应第 1 节描述的 Path A + Path B，不得遗漏 `BossPhase`
同时具备两条路径这一点。建议的内部结构（示例，不要求逐字照抄）：

```ts
function collectFromResultDict(
  dict: ResultDictionary,
  narrativeIndex: Map<string, ResultNarrative>,
  blockIds: Set<string>,
): void {
  for (const entry of dict.entries) {
    if ('unreachable' in entry) continue;
    const resolved = 'mapsTo' in entry
      ? dict.entries.find((e) => e.quality === entry.mapsTo)
      : entry;
    if (resolved === undefined || !('narrativeId' in resolved)) continue;
    const narrative = narrativeIndex.get(resolved.narrativeId);
    if (narrative === undefined) continue;
    blockIds.add(narrative.primaryBlockId);
    for (const id of narrative.supportBlockIds ?? []) blockIds.add(id);
    if (narrative.urgencyBlockId) blockIds.add(narrative.urgencyBlockId);
    if (narrative.transitionBlockId) blockIds.add(narrative.transitionBlockId);
    if (narrative.prefixBlockId) blockIds.add(narrative.prefixBlockId);
  }
}
```

`mapsTo` 只跳一跳、按 `quality` 在同一个 `entries` 数组内查找——这是
`pass2ActionChain.ts` 已经实现并校验过的真实语义（该文件已确保
`mapsTo` 链最多一跳），本函数复用同一语义，不发明第二种解释。

Path A 入口：对 `reachability.reachable` 中每个
`graphModel.nodes.get(id) === 'SCENE'` 的 id，取对应
`SceneNode.interactionId`（可选）；每个 `=== 'BOSS'` 的 id，取对应
`BossNode.phases[]` 里每个 `BossPhase.interactionId`（必填）——都
经 `InteractionNode.choices[].ruleId → ActionDefinition.resultSetId
→ ResultDictionary` 到 `collectFromResultDict`。

Path B 入口：对每个可达 `BOSS` id 的 `boss.phases[].narrationBlockIds
?? []`，以及每个可达 `ENDING` id 的 `EndingNode.narrationBlockIds`，
直接 `blockIds.add(...)`，不经过任何互动链。

### 2.3 `src/checkNarrativeBlockAudioCoverage.ts`

```ts
import type { NarrativeBlockAudioResult } from '@interactive-story/audio-production-queue';

export interface NarrativeBlockAudioCoverageResult {
  blockId: string;
  covered: boolean;
}

export function checkNarrativeBlockAudioCoverage(
  reachableBlockIds: Set<string>,
  audioResults: NarrativeBlockAudioResult[],
): NarrativeBlockAudioCoverageResult[]
```

- 对 `reachableBlockIds`（按 id 字典序遍历）逐一判断：
  `covered = audioResults.some((r) => r.blockId === id && r.ok === true)`。
- **不**扫描磁盘、**不**按命名约定猜测文件路径——`audioResults`
  由调用方提供（例如某次真实 `generateAudioProductionQueue` 调用
  的返回值），这是唯一输入源，理由见第 1 节第 3 点。

### 2.4 `src/generateChapterPackagerReport.ts`

薄封装，串联真实 `loadChapterPack`/`runSchemaValidation`/`runPass3`
（同 DEV-073/074 手法）：

```ts
import { loadChapterPack, runSchemaValidation, runPass3 } from '@interactive-story/chapter-compiler';
import type { NarrativeBlockAudioResult } from '@interactive-story/audio-production-queue';
import { checkAssetFileExistence, type AssetFileExistenceResult } from './checkAssetFileExistence.js';
import { computeReachableNarrativeBlockIds } from './computeReachableNarrativeBlockIds.js';
import { checkNarrativeBlockAudioCoverage, type NarrativeBlockAudioCoverageResult } from './checkNarrativeBlockAudioCoverage.js';

export interface ChapterPackagerReport {
  assetFileExistence: AssetFileExistenceResult[];
  narrativeBlockAudioCoverage: NarrativeBlockAudioCoverageResult[];
}

export function generateChapterPackagerReport(
  rootDir: string,
  audioResults: NarrativeBlockAudioResult[],
): ChapterPackagerReport {
  const raw = loadChapterPack(rootDir);
  const schemaResult = runSchemaValidation(raw);
  const pass3 = runPass3(schemaResult);
  const assetFileExistence = checkAssetFileExistence(schemaResult, rootDir);
  const reachableBlockIds = computeReachableNarrativeBlockIds(
    schemaResult,
    pass3.graphModel,
    pass3.reachability,
  );
  const narrativeBlockAudioCoverage = checkNarrativeBlockAudioCoverage(
    reachableBlockIds,
    audioResults,
  );
  return { assetFileExistence, narrativeBlockAudioCoverage };
}
```

（示例代码，不要求逐字照抄——只要类型契约与行为符合 Acceptance。）
**不产出任何 Bundle/manifest 文件、不落盘任何打包产物**——没有任何
Dev Spec/CR 文本定义 Bundle 的具体序列化格式，发明格式超出本节点
职责（"Chapter Packager"这个名字本身只在 Dev Spec 里作为标题出现
过，从未有正文定义"打包"要产出什么文件）。本节点只产出内存中的
校验报告结构体。

### 2.5 `src/index.ts`

```ts
export * from './checkAssetFileExistence.js';
export * from './computeReachableNarrativeBlockIds.js';
export * from './checkNarrativeBlockAudioCoverage.js';
export * from './generateChapterPackagerReport.js';
```

## 3. Scope

### Writable Scope

```
packages/chapter-packager/package.json                                        （新增）
packages/chapter-packager/tsconfig.json                                        （新增）
packages/chapter-packager/src/index.ts                                         （新增）
packages/chapter-packager/src/checkAssetFileExistence.ts                       （新增）
packages/chapter-packager/src/checkAssetFileExistence.test.ts                  （新增）
packages/chapter-packager/src/computeReachableNarrativeBlockIds.ts             （新增）
packages/chapter-packager/src/computeReachableNarrativeBlockIds.test.ts        （新增）
packages/chapter-packager/src/checkNarrativeBlockAudioCoverage.ts              （新增）
packages/chapter-packager/src/checkNarrativeBlockAudioCoverage.test.ts         （新增）
packages/chapter-packager/src/generateChapterPackagerReport.ts                 （新增）
packages/chapter-packager/src/generateChapterPackagerReport.test.ts            （新增）
tsconfig.json                                                                    （根，追加一条 references 条目）
pnpm-lock.yaml（自动生成：新增 packages/chapter-packager 的 importer
条目，含对 @interactive-story/chapter-compiler 与
@interactive-story/audio-production-queue 的 workspace 依赖解析——
新增包被授权后 pnpm 工具链的强制副作用，同 DEV-070 msg 0310 裁定）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-075/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交；追加行放在历史消息表格
`---` 分隔符之前，不要追加到文件末尾"当前待处理"表格之后）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/chapter-compiler/src/pass1Schema.ts、pass2ActionChain.ts、
pass3GraphModel.ts、pass3Reachability.ts、compile.ts、loader.ts（Read-only）
packages/chapter-schema/src/scene.ts、interaction.ts、action.ts、
result.ts、narrative.ts、boss.ts、endings.ts、manifest.ts、audio.ts（Read-only）
packages/audio-production-queue/src/runAudioProductionQueue.ts（Read-only，
仅取 `NarrativeBlockAudioResult` 类型，不复用其内部逻辑）
packages/chapter-compiler/test-fixtures/valid-minimal/**（Read-only）
```

### Forbidden Scope

```
修改除本节点 Writable Scope 之外的任何既有文件
import 或依赖除 @interactive-story/chapter-compiler、
@interactive-story/audio-production-queue 外的任何其他既有包
在包内部扫描磁盘/按文件命名约定猜测音频文件与 NarrativeBlock 的
绑定关系（音频覆盖检查必须以调用方传入的 NarrativeBlockAudioResult[]
为唯一输入，不得自行读目录/glob）
发明任何 Bundle/manifest 序列化格式或把打包结果写入任何新文件
发明 rootDir-relative 之外的任何资产路径解析约定
把 mapsTo 解析实现为不同于 pass2ActionChain.ts 既有一跳同字典
quality 匹配语义的任何其他算法
把 entryNodeId 做成任何函数的调用方参数（必须经 runPass3 内部真实
读取 schemaResult.manifest.passed.entryNodeId）
新增除以上两个既有包外的任何第三方/workspace 依赖
```

## 4. Required Skills

TypeScript strict mode、Vitest、pnpm workspace 包骨架搭建，需要
先读懂并原样复用 `packages/chapter-compiler/src/pass2ActionChain.ts`
里 `mapsTo` 一跳同字典解析的真实实现、`pass3GraphModel.ts`/
`pass3Reachability.ts` 的 `StoryGraphModel`/`Pass3ReachabilityResult`
真实导出形状、以及 `chapter-schema` 里 `scene.ts`/`interaction.ts`/
`action.ts`/`result.ts`/`narrative.ts`/`boss.ts`/`endings.ts` 的
真实字段名（不得凭空猜测）。

## 5. Task Breakdown

- **T001** 节点文档。
- **T002** 实现四个源文件 + 四个测试文件 + 包骨架 + 根 `tsconfig.json`
  引用 + 全量验证（六条命令）+ `REPORT.md`/`DECISIONS.md` 填写 +
  commit + 写入（不提交）LEDGER 追加行与 NODE_REPORT 消息文件。

## 6. Key Decisions（撰写 DECISIONS.md 时必须覆盖）

- 为何本节点要做可达性过滤而 DEV-073/074 不做（CR-018 §4.4 原文对
  DEV-075 明确用"可达"字样，对 DEV-073/074 用"全部"/无字样；直接
  引用 `CR-RESOLUTIONS-001.md` 第 313-319 行原文）。
- Path A + Path B 两条独立链路缺一不可的理由（`BossPhase` 同时具备
  `interactionId`（必填）与 `narrationBlockIds`（可选）两个字段，
  `EndingNode` 只有 `narrationBlockIds` 一条路径，直接引用
  `boss.ts:9-10`、`endings.ts:12` 字段定义）。
- `mapsTo` 解析为何原样复用 `pass2ActionChain.ts` 既有语义而非自行
  设计（该文件已实现并验证过一跳同字典 `quality` 匹配，重新发明
  一套不同语义会产生与既有 PASS 2 校验矛盾的结果）。
- `entryNodeId` 为何不做成调用方参数（`ChapterManifestSchema.entryNodeId`
  是真实必填 schema 字段，既有 `runPass3` 已经这样读取，与
  DEV-074 的 `voiceId`——真的没有对应 schema 字段——是不同的情况，
  不能套用同一处置）。
- 资产文件路径解析为何采用"相对 rootDir"（假设，非 spec 明文规则；
  引用 `loader.ts` 作为仓库内唯一自洽先例）。
- 音频覆盖检查为何接受调用方传入的 `NarrativeBlockAudioResult[]`
  而不扫描磁盘/发明 manifest 格式（`AudioAssetSchema`/
  `NarrativeBlockSchema` 均无绑定字段，`DEV-074/DECISIONS.md` D4
  与 `TASK-PACKAGE-DEV-074.md` §10 已如实记录该绑定机制未分配
  DEV 编号、格式未定义）。
- 为何不产出任何 Bundle/manifest 文件（Dev Spec 全篇从未给出
  "打包"要产出什么文件的正文定义，只有标题）。

## 7. Definition of Done

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 入库；
`REPORT.md` 完成且 `INDEX.md` Status = `READY_FOR_REVIEW`；LEDGER
追加行与 NODE_REPORT 消息文件已写入工作区但未提交；工作区无残留
临时文件。

## 8. Exit Procedure

提交前用 `git status` 自查工作区是否干净，不得留下任何额外的
临时/草稿文件（DEV-061 的 MAJOR-01 先例）。LEDGER 追加行必须写在
历史消息表格 `---` 分隔符之前（DEV-071 msg 0312 曾误写在"当前
待处理"表格之后，本节点须避免重犯）。

## 9. Non-Goals

不发明 Bundle/manifest 序列化格式；不落盘任何打包产物；不扫描磁盘
按命名约定推断音频文件与 NarrativeBlock 的绑定；不实现 PASS 8/
Simulation；不修改 `chapter-compiler`/`chapter-schema`/
`audio-production-queue` 本身任何一行。

## 10. Out of Scope (Future Nodes)

Bundle/manifest 序列化与发布机制（未分配 DEV 编号，格式未定义）；
CR-018 §4.6 拼接听感原型的人工试听验收（仍待人工执行，
`DEV-074/DECISIONS.md` D3 已如实记录）。

## 11. Dependencies

依赖 DEV-002（Compiler，`DONE`，冻结，提供 `loadChapterPack`/
`runSchemaValidation`）、DEV-003（Story Graph Analyzer，`DONE`，
冻结，`runPass3`/`buildStoryGraphModel`/`computeReachability` 经
`chapter-compiler` barrel 导出）、DEV-074（Audio Production Queue，
`DONE`，冻结，提供 `NarrativeBlockAudioResult` 类型）。与 DEV-073
（Asset Requirement Generator）平行，无直接代码依赖。

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含新包真正被 `tsc -b` 构建） | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `checkAssetFileExistence` 对手写混合联合类型的 `visuals`/`audio` 集合，只挑出带 `file` 字段的 `ImageAsset`/`PREPRODUCED`\|`PREGENERATED` 两类，跳过 `VisualScene`/`CharacterAsset`/`RUNTIME_TTS` | 测试 |
| A08 | `checkAssetFileExistence` 对实际存在的文件返回 `exists:true`、对不存在的文件返回 `exists:false`（真实 `existsSync` 调用，非硬编码） | 测试 |
| A09 | `checkAssetFileExistence` 忽略 `.failed` 中的条目，不抛错 | 测试 |
| A10 | `computeReachableNarrativeBlockIds` 对手写 fixture 正确走通 Path A：`SceneNode.interactionId → choices[].ruleId → ActionDefinition.resultSetId → ResultDictionary.entries → narrativeId → ResultNarrative` 五档 block 字段全部被收集 | 测试 |
| A11 | `computeReachableNarrativeBlockIds` 对手写 fixture 正确走通 Path B：`BossPhase.narrationBlockIds` 与 `EndingNode.narrationBlockIds` 被直接收集，且不依赖任何互动链数据 | 测试 |
| A12 | `computeReachableNarrativeBlockIds` 对不在 `reachability.reachable` 中的 Scene/Boss/Ending id，其关联的 block id **不**被收集（验证真实按可达性过滤，非全量扫描） | 测试 |
| A13 | `computeReachableNarrativeBlockIds` 的 `mapsTo` 解析：`{quality,mapsTo}` 条目正确跳一跳查到目标 `quality` 的 `narrativeId` 条目；`{quality,unreachable:true}` 条目贡献零 block id | 测试 |
| A14 | `checkNarrativeBlockAudioCoverage` 对存在且 `ok:true` 的匹配 `blockId` 返回 `covered:true`；对 `ok:false` 或完全缺失的 `blockId` 返回 `covered:false` | 测试 |
| A15 | `generateChapterPackagerReport` 对 `chapter-compiler` 的 `valid-minimal` fixture 真实调用 `loadChapterPack`/`runSchemaValidation`/`runPass3`，返回结构完整的 `ChapterPackagerReport`（`assetFileExistence`/`narrativeBlockAudioCoverage` 均为真实计算结果，非硬编码空数组） | 测试 |
| A16 | 代码检查确认 `checkNarrativeBlockAudioCoverage` 未出现任何 `fs`/`glob`/文件名拼接逻辑——完全以调用方 `audioResults` 参数为唯一输入 | 代码检查 |
| A17 | 代码检查确认资产路径解析只使用 `resolve(rootDir, file)` 这一种约定，且 `DECISIONS.md` 中已将其记录为假设 | 代码检查 + 文件检查 |
| A18 | 代码检查确认 `entryNodeId` 未作为任何本包导出函数的参数出现 | 代码检查 |
| A19 | 恰两个 workspace 依赖：`@interactive-story/chapter-compiler`、`@interactive-story/audio-production-queue`；未新增第三方 npm 依赖 | 文件检查 |
| A20 | 未实现任何 Bundle/manifest 序列化或落盘逻辑（无 `fs.writeFile`/`fs.mkdir` 等写盘调用） | 代码检查 |
| A21 | 除本节点 Writable Scope 外任何既有文件均未被修改（`pnpm-lock.yaml` 自动新增 importer 条目除外），`chapter-compiler`/`chapter-schema`/`audio-production-queue` 本身零改动 | git diff 比对 |
| A22 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A23 | `specs/dev/DEV-075/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A24 | `git log` 新增恰 1 条提交，首行以 `DEV-075:` 开头，简述 PASS 7 文件存在性 + Path A/B 可达 NarrativeBlock 计算 + 调用方传入音频覆盖检查 | 命令 |
| A25 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交**，且追加行位于历史消息表格 `---` 分隔符之前；工作区无任何额外残留文件 | 命令 + `git status` 检查 |
| A26 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
