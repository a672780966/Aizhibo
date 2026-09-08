# DEV-074 REPORT

## 1. Status

DONE — DEV-074（Audio Production Queue，M7 第五个节点）T001–T002 施工
完成，六条验证命令全部退出码 0，恰 1 条提交，AUDITOR 审计 AUDIT_PASS
（0 BLOCKER/MAJOR，1 MINOR 文档计数已修正，1 INFO，verdict_ref:
"0325"），Commander NODE_RULING: PASS（消息 0326）。

## 2. Implemented

新建 `packages/audio-production-queue`——**与 DEV-071/072 不同，本节点
不缺具体协议**：DEV-034/035 已经建成并冻结了真实 TTS 客户端
（`packages/audio-engine` 的 `TtsProviderPort`/`noopTtsProviderPort`/
真实 `createElevenLabsTtsProvider`），故不建接口+noop，而是像 DEV-072
复用既有 `compile()` 一样真实复用既有 Port（D5）。`package.json`
`dependencies` **恰两项**：`@interactive-story/chapter-compiler` 与
`@interactive-story/audio-engine`（均 `workspace:*`），无第三方依赖；
`tsconfig.json` 与 ai-compiler-repair-loop 逐字一致（extends
../../tsconfig.base.json，outDir dist / rootDir src）。

- `src/extractNarrativeBlocks.ts`：纯函数 `extractNarrativeBlocks
  (schemaResult: SchemaValidationResult)`，返回 `Array<{id, slot,
  text}>`。只读 `narrative.passed`（`CollectionResult<ResultNarrative |
  NarrativeBlock>` 混合联合类型，同 DEV-073 处理 `visuals`/`audio` 的
  手法），按字段存在性窄化：含 `text` 字段的是 `NarrativeBlock`，
  收入结果；含 `primaryBlockId` 字段（无 `text`）的是 `ResultNarrative`
  ——只是块 id 的索引记录，不产生任何音频需求，跳过。
  `narrative.failed` 的校验失败条目**忽略，不抛错**（同 DEV-073 A09
  先例）。返回前按 `id` 字典序排序；不去重——`NarrativeBlock.id` 已由
  既有 DEV-002A 唯一性校验保证全局唯一（D 注，见 REQUIREMENTS §2）。
- `src/runAudioProductionQueue.ts`：`NarrativeBlockAudioResult`（=
  `TtsSynthesisResult` 交集 `{blockId, slot}`；因 TS 禁止 interface
  extends 联合类型，用交集 type alias 表达同一契约）、`VoiceConfig`
  （`voiceId` + `voiceSettings`，调用方传入）、`runAudioProductionQueue
  (blocks, ttsPort, voice)`。对每个块调用 `ttsPort.synthesize({text:
  block.text, voiceId: voice.voiceId, voiceSettings: voice.voiceSettings})`，
  `Promise.all` 并行，互不影响（一个块返回 `{ok:false, reason}` 不阻塞
  其他块收集）；每块结果原样保留 `{ok, file}` 或 `{ok:false, reason}`
  并附加 `blockId`/`slot`；**不重试、无任何额外逻辑**；**不**把生成
  的 `file` 路径写回任何 Chapter Pack 文件、不新建 AudioAsset 清单/
  manifest（D4）。
- `src/generateAudioProductionQueue.ts`：薄封装（同 DEV-073
  `generateAssetRequirements.ts` 手法）——真实调用
  `loadChapterPack(rootDir)` 拿 `{raw}`（`issues` 忽略，同 DEV-073：
  加载失败的文件在 schemaResult 里连条目都不出现，天然被忽略）、
  `runSchemaValidation(raw)` 拿 `schemaResult`、`extractNarrativeBlocks`
  筛块、`runAudioProductionQueue` 批量合成。
- `src/index.ts`：三行 barrel。
- 测试 3 文件 8 用例（下述）。

## 3. Changed Files

提交内共 16 个文件：

- `packages/audio-production-queue/package.json`（新增：name
  `@interactive-story/audio-production-queue`，结构对齐
  ai-compiler-repair-loop；`dependencies` 恰两项
  `@interactive-story/chapter-compiler` +
  `@interactive-story/audio-engine`，均 `workspace:*`，无第三方依赖）
- `packages/audio-production-queue/tsconfig.json`（新增：与
  ai-compiler-repair-loop 逐字一致）
- `packages/audio-production-queue/src/index.ts`（新增：三行 barrel）
- `packages/audio-production-queue/src/extractNarrativeBlocks.ts`（新增）
- `packages/audio-production-queue/src/extractNarrativeBlocks.test.ts`
  （新增，3 测试：A07/A08/A09）
- `packages/audio-production-queue/src/runAudioProductionQueue.ts`（新增）
- `packages/audio-production-queue/src/runAudioProductionQueue.test.ts`
  （新增，3 测试：A10/A11/A12）
- `packages/audio-production-queue/src/generateAudioProductionQueue.ts`
  （新增）
- `packages/audio-production-queue/src/generateAudioProductionQueue.test.ts`
  （新增，2 测试：A13/A13b）
- `tsconfig.json`（根，references 末尾 asset-requirement-generator 之后
  追加一条）
- `pnpm-lock.yaml`（新增 audio-production-queue importer 条目，含对
  chapter-compiler 与 audio-engine 两个 workspace 依赖的解析——新增包
  被授权后 pnpm 工具链的强制副作用，Task Package §3 已明确授权）
- `specs/dev/DEV-074/DECISIONS.md`（新增，D1–D5）、`REPORT.md`（本文件）、
  `INDEX.md`（T001–T002 勾选 + Status → READY_FOR_REVIEW）、
  `REQUIREMENTS.md`、`ACCEPTANCE.md`

（`specs/comms/LEDGER.md` 追加行与 NODE_REPORT 消息文件已写入工作区，
**未提交**——留待 Commander 收尾，同 DEV-073 交接方式。）

## 4. Tests Executed

按序执行六条命令，全部退出码 0：

| 命令 | 退出码 |
|---|---|
| `pnpm install --frozen-lockfile` | 0（先以普通 `pnpm install` 落盘 importer 条目后复跑仍 0） |
| `pnpm typecheck` | 0（`tsc -b` 含新包真正构建 + `tsc -b --noEmit` + renderer 子包） |
| `pnpm lint` | 0 |
| `pnpm format:check` | 0（首跑报新包两个测试文件格式告警，`prettier --write` 就地格式化后复跑 0） |
| `pnpm build` | 0（tsc -b 全量，新包 dist 产出） |
| `pnpm test` | 0（146 files / 824 tests 全部通过；既有 816 + 新增 8，零回归） |

## 5. Acceptance Results

A01–A24 逐项：

| # | 判定 | 结果 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | VERIFIED（0，`--frozen-lockfile` 复跑 0） |
| A02 | `pnpm typecheck` 退出码 0 | VERIFIED（0，`tsc -b` 含新包，dist 产出核实） |
| A03 | `pnpm lint` 退出码 0 | VERIFIED（0） |
| A04 | `pnpm format:check` 退出码 0 | VERIFIED（0） |
| A05 | `pnpm build` 退出码 0 | VERIFIED（0） |
| A06 | `pnpm test` 退出码 0，零回归 | VERIFIED（146 files / 824 tests，816 → 824 = +8 新增） |
| A07 | 手写 `SchemaValidationResult`（`narrative.passed` 混有
  NarrativeBlock 与 ResultNarrative）只输出 NarrativeBlock | VERIFIED
  （`extractNarrativeBlocks.test.ts` 测试 1：passed 顺序为
  narr-zulu（ResultNarrative）→ block-zulu → block-mike →
  narr-alpha（ResultNarrative）→ block-alpha，断言 `toEqual` 恰
  block-alpha/block-mike/block-zulu 三项） |
| A08 | `narrative.failed` 有条目不抛错、不纳入输出 | VERIFIED（测试 2：
  同 fixture 已含 failed 条目，断言不抛错且输出无 broken 相关 id） |
| A09 | 输出按 `id` 字典序排序 | VERIFIED（测试 3：输入按 zulu→mike→
  alpha 反序插入，断言 ids === sorted 且等于
  block-alpha/block-mike/block-zulu） |
| A10 | 逐块调用替身时 `synthesize` 参数精确为 `{text, voiceId,
  voiceSettings}` | VERIFIED（`runAudioProductionQueue.test.ts` 测试 1：
  记录型替身逐条捕获请求，断言 calls `toEqual` 三块期望参数数组） |
| A11 | 一块返回 `{ok:false, reason}` 不影响其余结果收集，数组长度与
  输入块数一致 | VERIFIED（测试 2：中间块 'text b' 返回
  `{ok:false, 'voice unavailable'}`，断言不抛错、长度 3、index 0/2
  ok:true、index 1 失败对象原样保留） |
| A12 | `{ok:true, file}` 结果包含该 file 与正确 blockId/slot | VERIFIED
  （测试 3：替身返回自定义 file 路径，断言结果逐字段 `toEqual`） |
| A13 | 对 `valid-minimal` 真实 fixture 走真实
  `loadChapterPack`+`runSchemaValidation` + 真实 `noopTtsProviderPort`，
  每块 `{ok:false, reason:'no TTS provider configured'}` | VERIFIED
  （`generateAudioProductionQueue.test.ts` 测试 1：fixture narrative/ 有
  2 个 NarrativeBlock + 2 个 ResultNarrative，断言恰 2 条结果、每条
  ok:false reason 精确匹配——端到端证明 ResultNarrative 被跳过、零网络） |
| A14 | 三函数未引用任何可达性/图遍历既有导出、无等价新逻辑 | VERIFIED
  （代码检查：包内无 reachab/storyGraph 消费/computeReachability/
  图遍历；测试 builder 中 `storyGraph`/`manifest` 仅为满足类型的空
  占位字段，同 DEV-073 先例） |
| A15 | voiceId/voiceSettings 无硬编码默认值/包内推导，完全来自调用方
  VoiceConfig | VERIFIED（代码检查：生产源码仅接口声明与文档注释提及；
  `VoiceConfig` 两字段均必填，缺一即编译失败） |
| A16 | 恰两个 workspace 依赖，无第三方 npm 依赖 | VERIFIED
  （package.json `dependencies` 恰两项 `workspace:*`；lockfile importer
  逐项核对） |
| A17 | 无真实网络请求（测试无 fetch/http/https/WebSocket，未 import
  真实 ElevenLabs provider） | VERIFIED（代码检查：全包 grep
  fetch/http/WebSocket/ElevenLabs 零命中；测试仅消费
  `noopTtsProviderPort` 与手写替身） |
| A18 | 无写回 Chapter Pack/新建 AudioAsset 清单逻辑 | VERIFIED（代码
  检查：无 node:fs/写文件代码；manifest 字样仅存在于"不新建"的说明
  注释） |
| A19 | Writable Scope 外既有文件未被修改（lockfile 除外），
  chapter-compiler/audio-engine/chapter-schema 零改动 | VERIFIED
  （git status：仅新包目录 + 根 tsconfig.json + pnpm-lock.yaml +
  specs/dev/DEV-074/ 五文档） |
| A20 | `DECISIONS.md` 存在，覆盖第 6 节全部要点 | VERIFIED（D1–D5：
  不做可达性过滤之因 / voiceId 调用方参数之因 / 不代表听感原型验收
  之因 / 不写回不建清单之因 / 复用既有真实 Port 之因） |
| A21 | 节点文档齐全，INDEX T001–T002 勾选，Status READY_FOR_REVIEW |
  VERIFIED |
| A22 | `git log` 恰 1 条提交，首行 `DEV-074:` | VERIFIED（提交后核实，
  见第 7 节） |
| A23 | LEDGER 追加行（历史表格 `---` 之前）与 NODE_REPORT 在工作区
  未提交；无残留文件 | VERIFIED（提交后写入 comms 两处未提交改动；
  `git status` 无任何额外残留） |
| A24 | PROJECT_INDEX / DAG / tasks / audit / protocol 未修改 |
  VERIFIED（git diff 比对） |

## 6. Scope Check

- Writable Scope 内文件逐一真实改动：新包 9 个文件、根 tsconfig.json
  一条 references、`specs/dev/DEV-074/` 五文档、pnpm-lock.yaml importer。
- Read-only Scope（`chapter-compiler/src/loader.ts`/`pass1Schema.ts` 的
  冻结导出被真实消费、`audio-engine/src/ttsProvider.ts` 的
  `TtsProviderPort`/`TtsSynthesisResult`/`noopTtsProviderPort` 被真实
  消费、`chapter-schema/src/narrative.ts` 的 NarrativeBlock 字段形状被
  核对、`test-fixtures/valid-minimal/**` 供真实集成测试只读使用）
  零改动。
- Forbidden Scope 全部遵守：未 import/依赖 chapter-compiler 与
  audio-engine 以外的任何包（无第三方依赖）；未实现任何可达性过滤
  逻辑；voiceId/voiceSettings 无任何硬编码默认值或包内推导；测试
  未发起任何真实网络请求、未 import 真实 ElevenLabs provider；未把
  生成结果写回 Chapter Pack/未新建 AudioAsset 清单；未声称 CR-018
  拼接听感原型人工验收已完成（D3 如实记录仍待人工执行）；
  `packages/chapter-compiler/`、`packages/audio-engine/`、
  `packages/chapter-schema/` 下无任何改动；Writable Scope 外无改动。
- 说明：`pnpm-lock.yaml` 因新包加入 workspace 产生 importer 条目，随
  实现一并提交——同 DEV-060A/061/062/063/070/071/072/073 先例（新增包
  被授权后 pnpm 工具链的强制副作用，Task Package §3 已明确授权）。

## 7. Commit

单条提交，消息首行：

```
DEV-074: audio production queue (real TtsProviderPort batch synthesis, all blocks no reachability filter, honest external voiceId)
```

LEDGER 追加行（msg_id 0324）与
`specs/comms/0324-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-074.md` 已写入
工作区，**未纳入本次提交**。

## 8. Handoff

交付给 AUDITOR/COMMANDER 验收，验收权威副本为
`specs/tasks/TASK-PACKAGE-DEV-074.md` 第 12 节（A01–A24，节点
`ACCEPTANCE.md` 逐行一致）。重点核对项：A14/A15/A17/A18（零可达性
逻辑、voiceId 纯外部参数、零网络、零写回/清单）、A16（恰两项授权
依赖）、A19（Writable Scope 外仅 tsconfig/lockfile 联动）、A22（恰
1 条提交）、A23（LEDGER 追加行正确置于历史消息表格 `---` 分隔符之前
+ NODE_REPORT 消息文件未提交，工作区无残留）。OpenCode 禁止自行推进
下一 DEV Node。
