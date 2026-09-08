# DEV-075 REPORT

## 1. Status

DONE — DEV-075（Chapter Packager，M7 第六个节点）T001–T002 施工完成，
六条验证命令全部退出码 0，恰 1 条提交，AUDITOR 审计 `AUDIT_PASS`
（0 BLOCKER/MAJOR/MINOR/INFO，verdict_ref: "0329"），Commander
NODE_RULING: PASS（消息 0330）。M7 里程碑（第七施工组：内容生产
工具，DEV-070~075 共 6 节点）全部完成。

## 2. Implemented

新建 `packages/chapter-packager`。职责来自 CR-006（PASS 7 资产文件
存在性）与 CR-018 §4.4（**每个可达 NarrativeBlock 必须有对应音频文件**
——注意本节点的 CR 原文用「可达」，与 DEV-074 原文的「全部」是同一节
并排出现的差异，故本节点真正做可达性过滤，见 D1）。Dev Spec 只给
本节点标题、无正文，未定义任何 Bundle/manifest 输出物——故不产出任何
落盘文件（D7）。`package.json` `dependencies` **恰两项**：
`@interactive-story/chapter-compiler` +
`@interactive-story/audio-production-queue`（均 `workspace:*`），无
第三方依赖；`tsconfig.json` 与 ai-compiler-repair-loop 逐字一致。

- `src/checkAssetFileExistence.ts`：PASS 7 文件存在性检查。对 PASS 1
  通过的 `visuals.passed`（VisualScene | CharacterAsset | ImageAsset
  混合联合，同 DEV-073 手法）与 `audio.passed`（PREPRODUCED |
  PREGENERATED | RUNTIME_TTS 三态联合）做 `'file' in value` 窄化——
  只挑带 `file` 字段的 ImageAsset 与 PREPRODUCED|PREGENERATED 两类，
  跳过 VisualScene / CharacterAsset / RUNTIME_TTS（ttsSpec，无
  file）。路径解析 `existsSync(resolve(rootDir, value.file))`——沿用
  `loader.ts` 的「相对 rootDir」唯一先例约定，记录为假设（D5）。
  `.failed` 忽略、不抛错。按 assetId 排序。
- `src/computeReachableNarrativeBlockIds.ts`：CR-018 可达
  NarrativeBlock id 计算。只对 `reachability.reachable` 内的
  SCENE/BOSS/ENDING 节点收集（A12）：**Path A** 互动链（`SceneNode.
  interactionId?` / `BossPhase.interactionId` → `InteractionNode.
  choices[].ruleId` → `ActionDefinition.resultSetId` →
  ResultDictionary → ResultNarrative 五档 block 字段）与 **Path B**
  直连字段（`BossPhase.narrationBlockIds?` / `EndingNode.
  narrationBlockIds`）两条独立链路都要走（D2：BossPhase 两路兼有、
  EndingNode 只有 Path B）。`mapsTo` 原样复用 `pass2ActionChain.ts`
  语义：一跳、同字典按 `quality` 匹配、链式/死跳/`unreachable:true`
  贡献零（D3）。无 Bundle/manifest 任何序列化。
- `src/checkNarrativeBlockAudioCoverage.ts`：覆盖检查，接受调用方传入
  的 `NarrativeBlockAudioResult[]`（DEV-074 冻结类型）为**唯一**输入
  ——`ok:true` 视为覆盖、`ok:false`/缺失视为未覆盖。block↔音频绑定
  机制无 schema 字段、无已分配 DEV、格式未定义，故不发明磁盘扫描/
  命名约定/manifest（D6，A16：函数体无任何 fs/glob/文件名拼接）。
- `src/generateChapterPackagerReport.ts`：薄封装（同 DEV-073/074
  手法）——真实调用 `loadChapterPack(rootDir)` 取 `{raw}`、
  `runSchemaValidation(raw.raw)`、`runPass3(schemaResult)`（entryNodeId
  由 runPass3 内部从必填 schema 字段 `ChapterManifestSchema.
  entryNodeId` 读取，**非**本包任何函数的调用方参数，D4/A18），
  组装内存中的 `ChapterPackagerReport`（`assetFileExistence` +
  `narrativeBlockAudioCoverage`）。
- `src/index.ts`：四行 barrel。
- 测试 4 文件 12 用例（下述）。实现层只用
  `SchemaValidationResult` 结构索引类型（`['results']['passed'][number]
  ['value']`、`'file' in value`/`'primaryBlockId' in value` 窄化），
  因 chapter-compiler barrel 不重导出 chapter-schema 类型且
  chapter-schema import 被禁止。

## 3. Changed Files

提交内共 18 个文件：

- `packages/chapter-packager/package.json`（新增：name
  `@interactive-story/chapter-packager`；`dependencies` 恰两项
  `@interactive-story/chapter-compiler` +
  `@interactive-story/audio-production-queue`，均 `workspace:*`，无
  第三方依赖）
- `packages/chapter-packager/tsconfig.json`（新增：与
  ai-compiler-repair-loop 逐字一致）
- `packages/chapter-packager/src/index.ts`（新增：四行 barrel）
- `packages/chapter-packager/src/checkAssetFileExistence.ts`（新增）
- `packages/chapter-packager/src/checkAssetFileExistence.test.ts`
  （新增，3 测试：A07/A08/A09）
- `packages/chapter-packager/src/computeReachableNarrativeBlockIds.ts`
  （新增）
- `packages/chapter-packager/src/computeReachableNarrativeBlockIds.test.ts`
  （新增，4 测试：A10/A11/A12/A13）
- `packages/chapter-packager/src/checkNarrativeBlockAudioCoverage.ts`
  （新增）
- `packages/chapter-packager/src/checkNarrativeBlockAudioCoverage.test.ts`
  （新增，3 测试：A14/A14b/A14c）
- `packages/chapter-packager/src/generateChapterPackagerReport.ts`
  （新增）
- `packages/chapter-packager/src/generateChapterPackagerReport.test.ts`
  （新增，2 测试：A15/A15b）
- `tsconfig.json`（根，references 末尾 audio-production-queue 之后追加
  一条）
- `pnpm-lock.yaml`（新增 chapter-packager importer 条目，含对
  chapter-compiler 与 audio-production-queue 两个 workspace 依赖的解析
  ——新增包被授权后 pnpm 工具链的强制副作用，Task Package §3 已明确
  授权）
- `specs/dev/DEV-075/DECISIONS.md`（新增，D1–D7）、`REPORT.md`
  （本文件）、`INDEX.md`（T001–T002 勾选 + Status →
  READY_FOR_REVIEW）、`REQUIREMENTS.md`、`ACCEPTANCE.md`

（`specs/comms/LEDGER.md` 追加行与 NODE_REPORT 消息文件已写入工作区，
**未提交**——留待 Commander 收尾，同 DEV-073/074 交接方式。）

## 4. Tests Executed

按序执行六条命令，全部退出码 0：

| 命令 | 退出码 |
|---|---|
| `pnpm install --frozen-lockfile` | 0（先以普通 `pnpm install` 落盘 importer 条目后复跑仍 0） |
| `pnpm typecheck` | 0（`tsc -b` 含新包真正构建 + `tsc -b --noEmit` + renderer 子包） |
| `pnpm lint` | 0 |
| `pnpm format:check` | 0（新包 src 先 `prettier --write` 格式化后复跑 0） |
| `pnpm build` | 0（tsc -b 全量，新包 dist 产出） |
| `pnpm test` | 0（150 files / 836 tests 全部通过；既有 824 + 新增 12，零回归） |

## 5. Acceptance Results

A01–A26 逐项：

| # | 判定 | 结果 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | VERIFIED（0，`--frozen-lockfile` 复跑 0） |
| A02 | `pnpm typecheck` 退出码 0 | VERIFIED（0，`tsc -b` 含新包，dist 产出核实） |
| A03 | `pnpm lint` 退出码 0 | VERIFIED（0） |
| A04 | `pnpm format:check` 退出码 0 | VERIFIED（0） |
| A05 | `pnpm build` 退出码 0 | VERIFIED（0） |
| A06 | `pnpm test` 退出码 0，零回归 | VERIFIED（150 files / 836 tests，824 → 836 = +12 新增） |
| A07 | 手写混合联合 `visuals`/`audio` 只挑带 `file` 的
  ImageAsset/PREPRODUCED\|PREGENERATED，跳过
  VisualScene/CharacterAsset/RUNTIME_TTS | VERIFIED
  （`checkAssetFileExistence.test.ts` 测试 1：passed 含 1 VisualScene +
  1 CharacterAsset + 2 ImageAsset + 2 文件类 AudioAsset + 1
  RUNTIME_TTS，断言 `toEqual` 恰
  bgm-exists/img-exists/img-missing/sfx-missing 四项） |
| A08 | 真实 `existsSync`：存在 → true，不存在 → false | VERIFIED
  （测试 2：`mkdtemp` 临时根目录真实落盘 2 个文件，4 项结果按真实磁盘
  状态判定） |
| A09 | `.failed` 忽略、不抛错 | VERIFIED（测试 3：fixture 已含
  visuals.failed/audio.failed 条目，断言不抛错、无 broken id、长度恰 4） |
| A10 | Path A 走通整条互动链，ResultNarrative 五档 block 字段全收集 |
  VERIFIED（`computeReachableNarrativeBlockIds.test.ts` 测试 1：scene-a
  → inter-1 → action-x → dict-1 的 FAILURE→narr-alpha（五字段全）与
  COSTLY_SUCCESS→narr-beta、boss-b phase-1 → dict-2 → narr-alpha 去重，
  断言 prim/sup1/sup2/urg/trans/pre/b-prim 全部包含） |
| A11 | Path B 直连收集 BossPhase/EndingNode narrationBlockIds，不依赖
  互动链 | VERIFIED（测试 2：主 fixture 断言 blk-b-direct1/2 与
  blk-e-direct1/2 包含；另建 chain-free fixture——boss-b2 的
  interactionId 指向不存在的 inter-ghost、narratives 全空——断言结果
  恰 `blk-end-direct`/`blk-only-direct`，证明零互动链数据也能收） |
| A12 | 不在 `reachability.reachable` 的 Scene/Boss/Ending 关联 block
  不被收集 | VERIFIED（测试 3：scene-z/boss-z/ending-z 在 graph 中但
  unreachable，断言 blk-g-prim/blk-gboss-direct/blk-ge-direct 均不在，
  且全集 `toEqual` 11 项精确列表——非全量扫描） |
| A13 | `mapsTo` 一跳查同字典目标 quality 的 narrativeId；unreachable
  零贡献 | VERIFIED（测试 4：dict-iso 内 DISASTER→FAILURE 一跳命中
  narr-iso；SPECIAL `unreachable:true` 零贡献；GREAT_SUCCESS mapsTo
  指向本字典不存在的 SUCCESS quality——死跳零贡献（无跨字典发明），
  断言结果恰 blk-iso-prim/blk-iso-sup） |
| A14 | 存在且 `ok:true` → covered:true；`ok:false` 或缺失 → covered:false |
  VERIFIED（`checkNarrativeBlockAudioCoverage.test.ts` 测试 1：输入
  blk-a（ok:true）/blk-b（ok:false）/blk-c（无）/blk-d（无），断言
  四行 `toEqual` 精确覆盖状态 + blockId 字典序） |
| A15 | valid-minimal 真实 fixture 走真实 loadChapterPack /
  runSchemaValidation / runPass3，报告为真实计算非硬编码 | VERIFIED
  （`generateChapterPackagerReport.test.ts` 测试 1：`assetFileExistence`
  恰 5 项（voice-guide RUNTIME_TTS 被跳过）且全 exists:false（fixture
  无 assets/ 目录）；`narrativeBlockAudioCoverage` 恰 2 可达 block 均
  covered——入口 scene-start、可达集经真实 runPass3 计算） |
| A16 | `checkNarrativeBlockAudioCoverage` 无任何 fs/glob/文件名拼接，
  以调用方 audioResults 为唯一输入 | VERIFIED（代码检查：全包 src grep
  writeFile/mkdir/glob/readdir/join 零命中（测试文件除外）；
  `checkNarrativeBlockAudioCoverage.ts` 仅 `audioResults.some(...)`） |
| A17 | 资产路径解析只用 `resolve(rootDir, file)` 一种约定，DECISIONS.md
  记录为假设 | VERIFIED（代码检查 + `DECISIONS.md` D5） |
| A18 | `entryNodeId` 未作为任何导出函数参数 | VERIFIED（代码检查：
  全包 src 仅注释提及，无参数名出现；runPass3 内部从必填 schema 字段
  读取） |
| A19 | 恰两个 workspace 依赖，无第三方 npm 依赖 | VERIFIED
  （package.json `dependencies` 恰两项 `workspace:*`；lockfile importer
  逐项核对） |
| A20 | 未实现 Bundle/manifest 序列化或写盘 | VERIFIED（代码检查：无
  node:fs 写盘调用，`fs.writeFile`/`fs.mkdir`/`appendFile` 零命中）
  |
| A21 | Writable Scope 外既有文件未修改（lockfile importer 除外），
  chapter-compiler/chapter-schema/audio-production-queue 零改动 |
  VERIFIED（git status：仅新包目录 + 根 tsconfig.json + pnpm-lock.yaml
  + specs/dev/DEV-075/ 六文档） |
| A22 | `DECISIONS.md` 存在，覆盖第 6 节全部要点 | VERIFIED（D1–D7：
  可达性过滤之因（CR 原文「可达」vs DEV-074「全部」）/ Path A+B 缺一
  不可 / mapsTo 一跳同字典复用 / entryNodeId 非调用方参数 /
  rootDir 相对解析为假设 / 音频覆盖以调用方数组为唯一输入 /
  不产出 Bundle/manifest） |
| A23 | 节点文档齐全，INDEX T001–T002 勾选，Status READY_FOR_REVIEW |
  VERIFIED |
| A24 | `git log` 恰 1 条提交，首行 `DEV-075:`，简述 PASS 7 文件存在性
  + Path A/B 可达 NarrativeBlock 计算 + 调用方传入音频覆盖检查 |
  VERIFIED（提交后核实，见第 7 节） |
| A25 | LEDGER 追加行（历史表格 `---` 之前）与 NODE_REPORT 在工作区
  未提交；无残留文件 | VERIFIED（提交后写入 comms 两处未提交改动；
  `git status` 无任何额外残留） |
| A26 | PROJECT_INDEX / DAG / tasks / audit / protocol 未修改 |
  VERIFIED（git diff 比对） |

## 6. Scope Check

- Writable Scope 内文件逐一真实改动：新包 11 个文件、根 tsconfig.json
  一条 references、`specs/dev/DEV-075/` 六文档、pnpm-lock.yaml
  importer。
- Read-only Scope（`chapter-compiler` 的
  `loadChapterPack`/`runSchemaValidation`/`runPass3`/`SchemaValidationResult`/
  `StoryGraphModel`/`Pass3ReachabilityResult` 被真实消费、
  `audio-production-queue` 的 `NarrativeBlockAudioResult` 被真实消费、
  `test-fixtures/valid-minimal/**` 供真实集成测试只读使用）零改动。
- Forbidden Scope 全部遵守：未 import/依赖 chapter-compiler 与
  audio-production-queue 以外的任何包（无第三方依赖）；未发明任何
  Bundle/manifest 格式、未写盘；无磁盘扫描/命名约定推断
  audio↔NarrativeBlock 绑定（绑定机制无 schema 字段、无已分配 DEV、
  格式未定义，由调用方传入结果）；`mapsTo` 解析复用 pass2ActionChain
  一跳同字典语义、无第二套解释；`entryNodeId` 非调用方参数（真实
  必填 schema 字段，runPass3 内部读取）；`packages/chapter-compiler/`、
  `packages/chapter-schema/`、`packages/audio-production-queue/` 下无
  任何改动；Writable Scope 外无改动。
- 说明：`pnpm-lock.yaml` 因新包加入 workspace 产生 importer 条目，随
  实现一并提交——同 DEV-060A 至 DEV-074 连续先例（新增包被授权后 pnpm
  工具链的强制副作用，Task Package §3 已明确授权）。

## 7. Commit

单条提交，消息首行：

```
DEV-075: chapter packager (PASS7 file existence checks + Path A/B reachable narrative block computation + caller-fed audio coverage check)
```

LEDGER 追加行（msg_id 0328）与
`specs/comms/0328-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-075.md` 已写入
工作区，**未纳入本次提交**。

## 8. Handoff

交付给 AUDITOR/COMMANDER 验收，验收权威副本为
`specs/tasks/TASK-PACKAGE-DEV-075.md` 第 12 节（A01–A26，节点
`ACCEPTANCE.md` 逐行一致）。重点核对项：A12（可达性过滤是本节点 CR
原文「可达」的真实要求，非 DEV-073/074 的「全部」——差异见 D1）、
A16/A20（零磁盘扫描/命名约定/写盘，音频绑定由调用方传入）、A18
（entryNodeId 非调用方参数）、A19（恰两项授权依赖）、A21（Writable
Scope 外仅 tsconfig/lockfile 联动）、A24（恰 1 条提交）、A25（LEDGER
追加行正确置于历史消息表格 `---` 分隔符之前 + NODE_REPORT 消息文件
未提交，工作区无残留）。OpenCode 禁止自行推进下一 DEV Node。
