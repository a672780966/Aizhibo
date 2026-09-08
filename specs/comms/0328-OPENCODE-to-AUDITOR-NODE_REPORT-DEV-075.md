---
msg_id: "0328"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-075
in_reply_to: "0327"
created_at: 2026-09-08
requires_response: true
git_head: 6327e64
changed_files_count: 17
commands_run: [pnpm install --frozen-lockfile, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-075

DEV-075（Chapter Packager，M7 第六个节点）T001–T002 施工完成，
`READY_FOR_REVIEW`。

交付全文见 `specs/dev/DEV-075/REPORT.md`；决策记录见
`specs/dev/DEV-075/DECISIONS.md`（D1–D7）；验收权威副本为
`specs/tasks/TASK-PACKAGE-DEV-075.md` 第 12 节（A01–A26，节点
`ACCEPTANCE.md` 逐行一致）。

## 交付快照

- `git_head`: 6327e64
- Changed Files（17，与实现提交一致）：
  - `packages/chapter-packager/package.json`（新增：name
    `@interactive-story/chapter-packager`；`dependencies` **恰两项**
    `@interactive-story/chapter-compiler` +
    `@interactive-story/audio-production-queue`，均 `workspace:*`，无
    第三方依赖）
  - `packages/chapter-packager/tsconfig.json`（新增：与
    ai-compiler-repair-loop 逐字一致）
  - `packages/chapter-packager/src/index.ts`（新增：四行 barrel）
  - `packages/chapter-packager/src/checkAssetFileExistence.ts`（新增：
    PASS 7 文件存在性检查——`'file' in value` 窄化 `visuals.passed`
    （VisualScene | CharacterAsset | ImageAsset 混合联合）与
    `audio.passed`（PREPRODUCED | PREGENERATED | RUNTIME_TTS 三态联合），
    只挑带 file 的 ImageAsset 与 PREPRODUCED|PREGENERATED；路径解析
    `existsSync(resolve(rootDir, value.file))`（"相对 rootDir"唯一先例
    约定，录为假设 D5）；`.failed` 忽略不抛错；按 assetId 排序）
  - `packages/chapter-packager/src/computeReachableNarrativeBlockIds.ts`
    （新增：Path A 互动链（SceneNode.interactionId?/BossPhase.
    interactionId → choices[].ruleId → ActionDefinition.resultSetId →
    ResultDictionary → ResultNarrative 五档 block 字段）+ Path B 直连
    字段（BossPhase.narrationBlockIds?/EndingNode.narrationBlockIds），
    **只对 `reachability.reachable` 内 SCENE/BOSS/ENDING 收集**（A12）；
    `mapsTo` 一跳同字典按 quality 匹配、链式/死跳/unreachable 贡献零
    ——原样复用 pass2ActionChain.ts 语义，无第二套解释（D3））
  - `packages/chapter-packager/src/checkNarrativeBlockAudioCoverage.ts`
    （新增：接受调用方传入 `NarrativeBlockAudioResult[]`（DEV-074 冻结
    类型）为唯一输入，ok:true → covered，ok:false/缺失 → uncovered；
    **无任何 fs/glob/文件名拼接**（A16）——不发明磁盘扫描/命名约定/
    manifest 去猜 block↔音频绑定（无 schema 字段、无已分配 DEV、格式
    未定义，D6））
  - `packages/chapter-packager/src/generateChapterPackagerReport.ts`
    （新增：薄封装，真实 `loadChapterPack`+`runSchemaValidation`+
    `runPass3`；`entryNodeId` 由 runPass3 内部从真实必填 schema 字段
    `manifest.passed.entryNodeId` 读取，**非本包任何函数的调用方参数**
    （A18，D4）；返回内存中 `ChapterPackagerReport`，零写盘、零
    Bundle/manifest 序列化（A20，D7））
  - 四个测试文件（新增，3+4+3+2 = 12 测试：A07/A08/A09 文件存在性、
    A10–A13 可达计算、A14 覆盖检查、A15/A15b 端到端真实 fixture）
  - `tsconfig.json`（根，references 追加 chapter-packager）
  - `pnpm-lock.yaml`（新增 importer 条目——授权新包后 pnpm 工具链强制
    副作用，Task Package §3 已明确授权）
  - `specs/dev/DEV-075/DECISIONS.md`（新增，D1–D7）、`REPORT.md`、
    `INDEX.md`（T001–T002 勾选，Status → READY_FOR_REVIEW）、
    `REQUIREMENTS.md`、`ACCEPTANCE.md`

## 关键点

- **本节点真实做可达性过滤**（A12/D1）：CR-018 §4.4 同一节内对
  DEV-074 用「全部」、对 DEV-075 用「每个**可达** NarrativeBlock」——
  差异是原文明写；DEV-073/074 因此不做过滤，本节点按原文要求只对
  `reachability.reachable` 内节点收集（A12 断言不可达 Scene/Boss/Ending
  关联 block 零贡献，精确全集断言排除"全量扫描"实现）。实现只消费
  chapter-compiler 真实冻结导出（`runPass3` 的 `Pass3Result`：
  `graphModel`/`reachability`），不 import 被禁的 chapter-schema。
- **Path A + Path B 双链路缺一不可**（A10/A11/D2）：`BossPhase` 既有
  必填 interactionId（Path A）又有可选 narrationBlockIds（Path B），
  只走一条漏一半；`EndingNode` 是终止节点只有 Path B。A11 另建
  chain-free fixture（interactionId 指向不存在的 inter-ghost、
  narratives 全空）断言 Path B 结果零互动链数据依赖。
- **`mapsTo` 复用 pass2ActionChain.ts 既有语义，不发明第二套**（A13/D3）：
  一跳、同字典按 quality 匹配；目标无 narrativeId（不存在/是
  mapsTo/unreachable）贡献零——避免 PASS 7 与既有 PASS 2 校验结论
  矛盾。
- **类型策略**：chapter-compiler barrel 不重导出 chapter-schema 类型且
  chapter-schema import 被禁止 → 实现只用 `SchemaValidationResult`
  结构索引类型（`['results']['passed'][number]['value']`）与
  `'file' in value`/`'primaryBlockId' in value` 字段窄化（同 DEV-073/074
  手法）。
- **零磁盘猜测、零写盘**（A16/A20）：音频覆盖检查以调用方传入的
  `NarrativeBlockAudioResult[]` 为唯一输入（函数体只有
  `audioResults.some(...)`）；全包 src 无 node:fs 写盘/glob/readdir/
  路径拼接（测试文件除外）。block↔音频绑定机制无 schema 字段、无
  已分配 DEV、格式未定义——谁在真实生产注册该绑定是调用方/未来节点
  职责。
- **端到端真实路径**（A15）：对 valid-minimal 真实 fixture 走真实
  `loadChapterPack`+`runSchemaValidation`+`runPass3`——报告
  `assetFileExistence` 恰 5 项（voice-guide RUNTIME_TTS 被跳过）且全
  exists:false（fixture 无 assets/ 目录）；`narrativeBlockAudioCoverage`
  恰 2 可达 block（block-follow-failure/success）——可达集经真实
  runPass3 计算，非硬编码。
- 既有 824 测试 + 新增 12 = 836 全部通过，零回归；六条命令全部退出码 0。

## 范围与残留

- Writable Scope 外零改动：`chapter-compiler/`、`chapter-schema/`、
  `audio-production-queue/` 无任何改动；`specs/PROJECT_INDEX.md`、
  `specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、
  `specs/protocol/**` 均未修改。
- 工作区无残留：`git status` 仅剩本 LEDGER 追加行与消息文件两处未提交
  改动。
- 本 LEDGER 追加行（msg_id 0328，置于历史表格内、`---` 分隔符之前、
  `当前待处理` 表格之前）与消息文件**未提交**，留待 Commander/AUDITOR
  收尾。
