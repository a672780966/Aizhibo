---
node: DEV-074
title: Audio Production Queue
milestone: M7 — Content Factory Complete
status: ISSUED
task_package_ref: "0323"
---

# TASK PACKAGE — DEV-074（Audio Production Queue）

## 1. Context

Dev Spec 第 2800-2803 行对 DEV-074 只给出标题「Audio Production
Queue」，正文是空的——与 DEV-072 面对的"标题有、正文无"情况同类。
真正的职责定义在 `specs/audit/CR-RESOLUTIONS-001.md` §4（CR-018）：

> 第 65 节 **DEV-074 Audio Production Queue**（第七施工组）…获得
> 明确职责：遍历 Chapter Pack 全部 `NarrativeBlock`，批量生成
> `PREGENERATED` 音频，随 Bundle 发布。

与 DEV-071/072 不同，本节点**不缺具体协议**——DEV-034/035 已经
建成并冻结了真实的 TTS 客户端：`packages/audio-engine` 导出
`TtsProviderPort`（接口）、`noopTtsProviderPort`（诚实占位）、
以及**真实的** `createElevenLabsTtsProvider`/
`createOptionalElevenLabsTtsProvider`（真实调用 ElevenLabs HTTP
API，`packages/audio-engine/src/elevenLabsTtsProvider.ts`）。因此
本节点不建接口+noop，而是像 DEV-072 复用 `compile()` 一样，复用
这个既有真实 Port。

三个诚实的"不发明"边界（务必写入 `DECISIONS.md`）：

1. **不做可达性过滤**。CR-018 原文是"遍历 Chapter Pack **全部**
   `NarrativeBlock`"（不是"全部可达"）；`DAG.md` 对本节点的一句话
   摘要虽然用了"可达"字样，但那只是摘要措辞，不是 CR-018 的原文
   规则。生成"全部"块严格是生成"全部可达块"的超集，天然满足
   DEV-075 未来 PASS 7 的覆盖要求。且现有 DEV-003（`pass3Reachability.ts`）
   只在 `SCENE`/`BOSS`/`ENDING` 这一层图上计算可达性，从可达场景
   到"可达 NarrativeBlock"需要再经过
   interaction→`ResultDictionary`→`narrativeId`→`ResultNarrative`→
   blockId 的链路拼接——这条链路目前没有任何既有 DEV-003/pass4/
   pass5 函数实现过，凭空写它属于发明新图遍历逻辑，超出本节点
   职责（同 DEV-073 msg 0319 裁定：不做可达性过滤）。

2. **不发明 per-block 配音（voiceId）来源**。`NarrativeBlockSchema`
   （`packages/chapter-schema/src/narrative.ts`）只有
   `id/slot/text/tone?/when?`，没有任何字段能推导出该用哪个
   `voiceId`；`TtsSynthesisRequest` 需要调用方提供
   `voiceId`/`voiceSettings`（`packages/audio-engine/src/ttsProvider.ts`）。
   Dev Spec 全篇没有给 Narrative Block 定义配音归属规则（它是旁白/
   叙事文本，不是按角色分配的对白）。处置：`voiceId`/
   `voiceSettings` 作为调用方参数传入（同一批次全部块用同一组
   配置），不在包内部猜测或硬编码任何默认值。

3. **不满足 CR-018 §4.6 的"拼接听感原型"人工验收门槛**。CR-018
   原文："DEV-030/DEV-033 阶段必须做一次拼接听感原型（十来条真实
   块拼装试听），确认可接受后再在 DEV-074 投入全章节生成"。这一步
   在 `specs/dev/DEV-030/DECISIONS.md` D3 中已如实记录为
   **未完成**（当时 DEV-034 尚未建成，无真实语音可供试听，延后到
   "DEV-034/035 真正接上 RUNTIME_TTS 之后"）。核实至今没有任何后续
   节点执行过这次人工试听——这是一项需要真人耳朵判断的验收，本
   自动化流水线不能代为执行或代为确认"可接受"。处置：本节点如实
   建造"可真实运行、真实调用 TTS Provider 的批量生产机制"本身，
   **不代表** CR-018 的听感验收门槛已经满足；该门槛仍待人工执行，
   一旦人工确认可接受，即可直接投入生产使用本节点交付的机制，无需
   返工。

## 2. Deliverable

新建 `packages/audio-production-queue`（恰两个 workspace 依赖：
`@interactive-story/chapter-compiler`、`@interactive-story/audio-engine`）。

### 2.1 `src/extractNarrativeBlocks.ts`

纯函数：

```ts
import type { SchemaValidationResult } from '@interactive-story/chapter-compiler';

export function extractNarrativeBlocks(
  schemaResult: SchemaValidationResult,
): Array<{ id: string; slot: string; text: string }>
```

- 遍历 `schemaResult.narrative.passed`（`CollectionResult<ResultNarrative | NarrativeBlock>`，
  同 DEV-073 `extractAssetRequirements.ts` 处理 `visuals`/`audio`
  混合联合类型的手法）：用字段存在性区分——含 `text` 字段的是
  `NarrativeBlock`，收入结果；含 `primaryBlockId` 字段（无 `text`）
  的是 `ResultNarrative`，只是块 id 的索引记录，**不产生任何音频
  需求**，跳过。
- `schemaResult.narrative.failed` 中的校验失败条目**忽略，不
  抛错**（同 DEV-073 A09 先例）。
- 返回结果按 `id` 字典序排序（去重不是本函数职责——`NarrativeBlock.id`
  已由既有 DEV-002A 唯一性校验保证全局唯一，无需再次去重；如需
  verify，可在 `REQUIREMENTS.md`/`DECISIONS.md` 中说明）。

### 2.2 `src/runAudioProductionQueue.ts`

```ts
import type { TtsProviderPort, TtsSynthesisResult } from '@interactive-story/audio-engine';

export interface NarrativeBlockAudioResult extends TtsSynthesisResult {
  blockId: string;
  slot: string;
}

export interface VoiceConfig {
  voiceId: string;
  voiceSettings: Record<string, number | string>;
}

export async function runAudioProductionQueue(
  blocks: Array<{ id: string; slot: string; text: string }>,
  ttsPort: TtsProviderPort,
  voice: VoiceConfig,
): Promise<NarrativeBlockAudioResult[]>
```

- 对每个块调用
  `ttsPort.synthesize({ text: block.text, voiceId: voice.voiceId, voiceSettings: voice.voiceSettings })`，
  用 `Promise.all` 并行处理，互不影响（一个块失败不阻塞其他块）。
- 每个块的结果原样保留 `TtsSynthesisResult` 的 `{ok, file}` 或
  `{ok:false, reason}`，附加 `blockId`/`slot`，**不重试、不做任何
  额外逻辑**（重试策略 Dev Spec 未定义，不发明）。
- **不**把生成的 `file` 路径写回任何 Chapter Pack 文件/新建
  `AudioAsset` 清单条目——把生成结果注册回章节内容结构（例如新增
  一个 `PREGENERATED` 的 `AudioAsset` JSON 文件、或维护一份
  block→file 的 manifest）没有任何 Dev Spec/CR-018 文本定义具体
  格式，属于发明清单 schema，超出本节点职责，留给未来节点/CR。

### 2.3 `src/generateAudioProductionQueue.ts`

薄封装，串联真实 `loadChapterPack`/`runSchemaValidation`
（同 DEV-073 `generateAssetRequirements.ts` 手法）：

```ts
import { loadChapterPack, runSchemaValidation } from '@interactive-story/chapter-compiler';
import type { TtsProviderPort } from '@interactive-story/audio-engine';
import { extractNarrativeBlocks } from './extractNarrativeBlocks.js';
import { runAudioProductionQueue, type VoiceConfig, type NarrativeBlockAudioResult } from './runAudioProductionQueue.js';

export async function generateAudioProductionQueue(
  rootDir: string,
  ttsPort: TtsProviderPort,
  voice: VoiceConfig,
): Promise<NarrativeBlockAudioResult[]> {
  const raw = loadChapterPack(rootDir);
  const schemaResult = runSchemaValidation(raw);
  const blocks = extractNarrativeBlocks(schemaResult);
  return runAudioProductionQueue(blocks, ttsPort, voice);
}
```

（示例代码，不要求逐字照抄——只要类型契约与行为符合 Acceptance。）

### 2.4 `src/index.ts`

```ts
export * from './extractNarrativeBlocks.js';
export * from './runAudioProductionQueue.js';
export * from './generateAudioProductionQueue.js';
```

## 3. Scope

### Writable Scope

```
packages/audio-production-queue/package.json                              （新增）
packages/audio-production-queue/tsconfig.json                              （新增）
packages/audio-production-queue/src/index.ts                               （新增）
packages/audio-production-queue/src/extractNarrativeBlocks.ts              （新增）
packages/audio-production-queue/src/extractNarrativeBlocks.test.ts         （新增）
packages/audio-production-queue/src/runAudioProductionQueue.ts             （新增）
packages/audio-production-queue/src/runAudioProductionQueue.test.ts        （新增）
packages/audio-production-queue/src/generateAudioProductionQueue.ts        （新增）
packages/audio-production-queue/src/generateAudioProductionQueue.test.ts   （新增）
tsconfig.json                                                                （根，追加一条 references 条目）
pnpm-lock.yaml（自动生成：新增 packages/audio-production-queue 的
importer 条目，含对 @interactive-story/chapter-compiler 与
@interactive-story/audio-engine 的 workspace 依赖解析——新增包被
授权后 pnpm 工具链的强制副作用，同 DEV-070 msg 0310 裁定）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-074/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交；追加行放在历史消息表格
`---` 分隔符之前，不要追加到文件末尾"当前待处理"表格之后）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/chapter-compiler/src/loader.ts、pass1Schema.ts、types.ts（Read-only）
packages/audio-engine/src/ttsProvider.ts、elevenLabsTtsProvider.ts、
resolveAudioSource.ts（Read-only，不 import resolveAudioSource——
仅供理解既有 voiceId/contentId 约定，不复用其代码）
packages/chapter-schema/src/narrative.ts（Read-only）
packages/chapter-compiler/test-fixtures/valid-minimal/**（Read-only）
```

### Forbidden Scope

```
修改除本节点 Writable Scope 之外的任何既有文件
import 或依赖除 @interactive-story/chapter-compiler、
@interactive-story/audio-engine 外的任何其他既有包
实现任何可达性（reachability）过滤逻辑
在包内部猜测/硬编码任何默认 voiceId 或 voiceSettings
真实发起任何网络请求（测试中一律使用 noopTtsProviderPort 或手写
测试替身，不得在测试中调用真实 ElevenLabs API）
把生成的音频文件路径写回任何 Chapter Pack 文件/新建 AudioAsset
清单条目
声称/记录 CR-018 拼接听感原型验收已完成或已通过
新增除以上两个既有包外的任何第三方/workspace 依赖
```

## 4. Required Skills

TypeScript strict mode、Vitest、pnpm workspace 包骨架搭建，需要
读懂 `packages/chapter-compiler/src/pass1Schema.ts` 的
`SchemaValidationResult.narrative` 混合联合类型形状、以及
`packages/audio-engine/src/ttsProvider.ts` 的 `TtsProviderPort`
真实导出类型（不得凭空猜测字段名）。

## 5. Task Breakdown

- **T001** 节点文档。
- **T002** 实现三个源文件 + 三个测试文件 + 包骨架 + 根 `tsconfig.json`
  引用 + 全量验证（六条命令）+ `REPORT.md`/`DECISIONS.md` 填写 +
  commit + 写入（不提交）LEDGER 追加行与 NODE_REPORT 消息文件。

## 6. Key Decisions（撰写 DECISIONS.md 时必须覆盖）

- 为何不做可达性过滤（CR-018 原文"全部"而非"全部可达"；现有
  DEV-003 只在 SCENE/BOSS/ENDING 图层计算可达性，拼出"可达 block"
  需要发明新的多跳链路遍历）。
- 为何 `voiceId`/`voiceSettings` 是调用方参数而非包内部推导（
  `NarrativeBlockSchema` 无配音归属字段，Dev Spec 未定义）。
- 为何本节点不代表 CR-018 §4.6 拼接听感原型验收已完成（该验收
  需要真人试听判断，`DEV-030/DECISIONS.md` D3 已如实记录为
  未完成且至今无后续节点执行过）。
- 为何不把生成结果写回 Chapter Pack/不新建 AudioAsset 清单
  （没有任何 Dev Spec/CR 文本定义具体清单格式，发明格式超出授权
  范围）。
- 为何复用既有真实 `TtsProviderPort`/`createElevenLabsTtsProvider`
  而不是像 DEV-071/072 那样新建接口+noop（本节点与 DEV-071/072
  不同：具体协议已经存在且已冻结，同 DEV-072 复用 `compile()`
  的先例，而不是"无协议只能接口占位"的先例）。

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

不做可达性过滤；不在包内部推导/硬编码 voiceId；不真实发起网络
请求（测试内）；不把生成结果写回 Chapter Pack 或新建清单；不声称
CR-018 听感验收已完成；不修改 `chapter-compiler`/`audio-engine`
本身任何一行。

## 10. Out of Scope (Future Nodes)

CR-018 拼接听感原型的人工试听验收（需人工执行，不由本节点/本
流水线代为完成）；生成音频文件与 Chapter Pack 内容的清单/manifest
绑定机制（未分配 DEV 编号，格式未定义）；DEV-075 Chapter Packager
（PASS 7 资产文件存在性校验，覆盖"每个可达 NarrativeBlock 有音频
文件"）。

## 11. Dependencies

依赖 DEV-002（Compiler，`DONE`，冻结，提供 `loadChapterPack`/
`runSchemaValidation`）、DEV-034/035（`audio-engine`，`DONE`，
冻结，提供 `TtsProviderPort`/真实 `createElevenLabsTtsProvider`）。
与 DEV-073（Asset Requirement Generator）平行，无直接代码依赖。

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含新包真正被 `tsc -b` 构建） | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `extractNarrativeBlocks` 对手写 `SchemaValidationResult`（`narrative.passed` 内混有至少一个 `NarrativeBlock` 与一个 `ResultNarrative`）只输出 `NarrativeBlock` 一项，`ResultNarrative` 被跳过 | 测试 |
| A08 | `extractNarrativeBlocks` 对 `narrative.failed` 中存在条目的输入不抛错，且不将其纳入输出 | 测试 |
| A09 | `extractNarrativeBlocks` 输出按 `id` 字典序排序 | 测试 |
| A10 | `runAudioProductionQueue` 对每个块调用手写测试替身 `TtsProviderPort` 时，`synthesize` 收到的参数精确为 `{text: block.text, voiceId, voiceSettings}` | 测试 |
| A11 | `runAudioProductionQueue` 中一个块的 `synthesize` 返回 `{ok:false, reason}` 时，不影响其余块的结果被正常收集（不早退、不抛错），返回数组长度与输入块数一致 | 测试 |
| A12 | `runAudioProductionQueue` 对返回 `{ok:true, file}` 的块，结果对象包含该 `file` 与正确的 `blockId`/`slot` | 测试 |
| A13 | `generateAudioProductionQueue` 对 `chapter-compiler` 的 `valid-minimal` fixture 真实调用 `loadChapterPack`/`runSchemaValidation`，传入 `@interactive-story/audio-engine` 真实导出的 `noopTtsProviderPort`，返回结果中每个块均为 `{ok:false, reason:'no TTS provider configured'}`（诚实占位的真实端到端验证，不触网） | 测试 |
| A14 | 代码检查确认 `extractNarrativeBlocks`/`runAudioProductionQueue`/`generateAudioProductionQueue` 均未引用任何可达性/图遍历相关的既有导出（如 `computeReachability`），也未新写等价逻辑 | 代码检查 |
| A15 | 代码检查确认 `voiceId`/`voiceSettings` 无任何硬编码默认值或包内推导逻辑，完全来自调用方传入的 `VoiceConfig` 参数 | 代码检查 |
| A16 | 恰两个 workspace 依赖：`@interactive-story/chapter-compiler`、`@interactive-story/audio-engine`；未新增第三方 npm 依赖 | 文件检查 |
| A17 | 未真实发出任何网络请求（测试代码中无 `fetch`/`http`/`https`/`WebSocket`，且未在测试中 import `createElevenLabsTtsProvider`/`createOptionalElevenLabsTtsProvider`） | 代码检查 |
| A18 | 未实现任何把结果写回 Chapter Pack 文件/新建 AudioAsset 清单条目的逻辑 | 代码检查 |
| A19 | 除本节点 Writable Scope 外任何既有文件均未被修改（`pnpm-lock.yaml` 自动新增 importer 条目除外），`chapter-compiler`/`audio-engine`/`chapter-schema` 本身零改动 | git diff 比对 |
| A20 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A21 | `specs/dev/DEV-074/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A22 | `git log` 新增恰 1 条提交，首行以 `DEV-074:` 开头，简述真实 TTS Port 集成、全量块（非可达性过滤）、诚实 voiceId 外部参数化 | 命令 |
| A23 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交**，且追加行位于历史消息表格 `---` 分隔符之前；工作区无任何额外残留文件 | 命令 + `git status` 检查 |
| A24 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
