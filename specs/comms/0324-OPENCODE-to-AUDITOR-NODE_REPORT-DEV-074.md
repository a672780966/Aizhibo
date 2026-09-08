---
msg_id: "0324"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-074
in_reply_to: "0323"
created_at: 2026-09-08
requires_response: true
git_head: e65282f
changed_files_count: 16
commands_run: [pnpm install --frozen-lockfile, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-074

DEV-074（Audio Production Queue，M7 第五个节点）T001–T002 施工完成，
`READY_FOR_REVIEW`。

交付全文见 `specs/dev/DEV-074/REPORT.md`；决策记录见
`specs/dev/DEV-074/DECISIONS.md`（D1–D5）；验收权威副本为
`specs/tasks/TASK-PACKAGE-DEV-074.md` 第 12 节（A01–A24，节点
`ACCEPTANCE.md` 逐行一致）。

## 交付快照

- `git_head`: e65282f
- Changed Files（16，与实现提交一致）：
  - `packages/audio-production-queue/package.json`（新增：name
    `@interactive-story/audio-production-queue`；`dependencies` **恰两项**
    `@interactive-story/chapter-compiler` +
    `@interactive-story/audio-engine`，均 `workspace:*`，无第三方依赖）
  - `packages/audio-production-queue/tsconfig.json`（新增：与
    ai-compiler-repair-loop 逐字一致）
  - `packages/audio-production-queue/src/index.ts`（新增：三行 barrel）
  - `packages/audio-production-queue/src/extractNarrativeBlocks.ts`（新增：
    纯函数，字段存在性窄化 `narrative.passed` 混合联合——`'text' in`→
    NarrativeBlock 收入结果；`primaryBlockId` 无 text 的 ResultNarrative
    索引记录跳过；`failed` 忽略不抛错；按 id 字典序排序，不去重）
  - `packages/audio-production-queue/src/runAudioProductionQueue.ts`（新增：
    `NarrativeBlockAudioResult`（交集 type：TS 禁止 interface extends
    联合类型，交集表达同一契约）+ `VoiceConfig` 调用方参数 +
    `runAudioProductionQueue` Promise.all 逐块 synthesize，结果原样保留
    并附 blockId/slot，不重试、不写回、不建清单）
  - `packages/audio-production-queue/src/generateAudioProductionQueue.ts`
    （新增：薄封装，真实 `loadChapterPack`+`runSchemaValidation`）
  - 三个测试文件（新增，3+3+2 = 8 测试）
  - `tsconfig.json`（根，references 追加 audio-production-queue）
  - `pnpm-lock.yaml`（新增 importer 条目——授权新包后 pnpm 工具链强制
    副作用，Task Package §3 已明确授权）
  - `specs/dev/DEV-074/DECISIONS.md`（新增，D1–D5）、`REPORT.md`、
    `INDEX.md`（T001–T002 勾选，Status → READY_FOR_REVIEW）、
    `REQUIREMENTS.md`、`ACCEPTANCE.md`

## 关键点

- **真实复用既有 TTS Port，不建接口+noop**：与 DEV-071/072 不同，本节点
  协议已存在且已冻结——直接消费 `@interactive-story/audio-engine` 的
  `TtsProviderPort`/`TtsSynthesisResult`/`noopTtsProviderPort`（D5）。
- **不做可达性过滤**（A14）：CR-018 原文是遍历"全部" `NarrativeBlock`
  而非"全部可达"；生成全部是生成可达块的超集，天然满足 DEV-075 PASS 7；
  拼"可达 block"需发明 interaction→ResultDictionary→narrativeId→
  blockId 多跳链路遍历，无既有实现，超出本节点职责。包内零
  reachability/图遍历代码（测试 builder 的 storyGraph/manifest 仅为满足
  类型的空占位字段，同 DEV-073 先例）。
- **voiceId/voiceSettings 纯外部参数化**（A15）：`VoiceConfig` 两字段均
  必填，生产源码无任何硬编码默认值/推导（NarrativeBlockSchema 无配音
  归属字段，Dev Spec 未定义）。
- **端到端真实路径、零网络**（A13/A17）：对 valid-minimal 真实 fixture
  走真实 `loadChapterPack`+`runSchemaValidation` + 真实导出的
  `noopTtsProviderPort`——fixture narrative/ 含 2 个 NarrativeBlock + 2
  个 ResultNarrative，断言恰 2 条结果且每条
  `{ok:false, reason:'no TTS provider configured'}`；全包 grep
  fetch/http/https/WebSocket/ElevenLabs 零命中，测试仅用 noop/手写替身。
- **不写回不建清单**（A18）：生成结果停在"每块一个合成结果"层，无
  node:fs/写文件代码，manifest 字样仅存在于"不新建"的说明注释（D4）。
- **不声称听感验收完成**（D3）：CR-018 §4.6 拼接听感原型人工试听
  （DEV-030/DECISIONS.md D3 记为未完成）仍待人工执行，本节点只交付
  可真实运行的批量生产机制本身。
- 既有 816 测试 + 新增 8 = 824 全部通过，零回归；六条命令全部退出码 0。

## 范围与残留

- Writable Scope 外零改动：`chapter-compiler/`、`audio-engine/`、
  `chapter-schema/` 无任何改动；`specs/PROJECT_INDEX.md`、
  `specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、
  `specs/protocol/**` 均未修改。
- 工作区无残留：`git status` 仅剩本 LEDGER 追加行与消息文件两处未提交
  改动。
- 本 LEDGER 追加行（msg_id 0324，置于历史表格内、`---` 分隔符之前、
  `当前待处理` 表格之前）与消息文件**未提交**，留待 Commander/AUDITOR
  收尾。
