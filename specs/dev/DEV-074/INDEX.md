# DEV-074 INDEX

Status: DONE

## Current Node

DEV-074 — Audio Production Queue（M7 第五个节点）

## Objective

新建 `packages/audio-production-queue`：与 DEV-071/072 不同，本节点
**不缺具体协议**——DEV-034/035 已经建成并冻结了真实的 TTS 客户端
（`packages/audio-engine` 导出 `TtsProviderPort` 接口、
`noopTtsProviderPort` 诚实占位、以及真实调用 ElevenLabs HTTP API 的
`createElevenLabsTtsProvider`/`createOptionalElevenLabsTtsProvider`），
故不建接口+noop，而是真实复用这个既有 Port（同 DEV-072 复用既有
`compile()` 的先例）。职责由 CR-018（`specs/audit/CR-RESOLUTIONS-001.md`
§4）明确定义：遍历 Chapter Pack 全部 `NarrativeBlock`，批量生成
`PREGENERATED` 音频。`extractNarrativeBlocks` 从真实
`SchemaValidationResult.narrative` 混合联合类型中筛出 `NarrativeBlock`
（跳过 `ResultNarrative` 索引记录、忽略 `failed`），
`runAudioProductionQueue` 对每个块调用 `TtsProviderPort.synthesize`
（`voiceId`/`voiceSettings` 由调用方传入，包内不推导/不硬编码），
`generateAudioProductionQueue` 串联真实 `loadChapterPack` +
`runSchemaValidation`。

## Allowed Scope

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
pnpm-lock.yaml（自动生成的新增 importer 条目，含对 chapter-compiler
与 audio-engine 的 workspace 依赖）
specs/dev/DEV-074/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交；追加行放在历史消息表格
`---` 分隔符之前，不放文件末尾"当前待处理"表格之后）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
packages/chapter-compiler/src/loader.ts、pass1Schema.ts、types.ts（Read-only）
packages/audio-engine/src/ttsProvider.ts、elevenLabsTtsProvider.ts、
resolveAudioSource.ts（Read-only，不 import resolveAudioSource——仅供
理解既有 voiceId/contentId 约定，不复用其代码）
packages/chapter-schema/src/narrative.ts（Read-only）
packages/chapter-compiler/test-fixtures/valid-minimal/**（Read-only）
```

## Forbidden Scope

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

## Task Order

- [x] T001 节点文档（INDEX / REQUIREMENTS / ACCEPTANCE / DECISIONS / REPORT）
- [x] T002 extractNarrativeBlocks.ts + runAudioProductionQueue.ts + generateAudioProductionQueue.ts + 三个测试文件 + 包骨架 + 根 tsconfig 引用 + 全量验证（六条命令）+ REPORT 填写 + commit + 写入（不提交）LEDGER 追加行与 NODE_REPORT 消息文件

## Current Task

无（节点已 DONE，审计 AUDIT_PASS，0 BLOCKER/MAJOR，NODE_RULING PASS）

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行（历史
消息表格 `---` 分隔符之前）与 NODE_REPORT 消息文件已写入工作区但
**未提交**；工作区不得残留任何施工用临时文件。

## Next Node

DEV-075 Chapter Packager（由 Claude Commander 裁定后已进入下一节点）。

OpenCode 禁止自行推进下一 DEV Node。
