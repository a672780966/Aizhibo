# DEV-074 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-074.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

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
