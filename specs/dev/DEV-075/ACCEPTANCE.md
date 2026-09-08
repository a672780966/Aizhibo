# DEV-075 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-075.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

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
