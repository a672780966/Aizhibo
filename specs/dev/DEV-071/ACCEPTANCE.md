# DEV-071 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-071.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含新包真正被 `tsc -b` 构建） | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `noopAiChapterGeneratorPort.generateDraft(...)` 恒定返回 `{ok:false, reason:'no chapter generator provider configured'}`，与输入无关 | 测试 |
| A08 | `noopAiChapterGeneratorPort.getHealth()` 恒定返回 `{status:'DOWN', error:'no chapter generator provider configured'}` | 测试 |
| A09 | 手写满足 `AiChapterGeneratorPort` 接口的 mock 可正常赋值调用（类型契约测试） | 测试 |
| A10 | `buildChapterAuthoringRequest('')` 与仅空白字符的 brief 均抛出 `Error` | 测试 |
| A11 | `buildChapterAuthoringRequest(brief)` 返回值完整 `includes` 未改动的 `CHAPTER_AUTHORING_SCHEMA_PROMPT` | 测试 |
| A12 | 返回值完整 `includes` 传入的 `brief` 原文 | 测试 |
| A13 | `CHAPTER_AUTHORING_SCHEMA_PROMPT` 在返回值中的出现位置早于 `brief` 的出现位置 | 测试 |
| A14 | 唯一 workspace 依赖是 `@interactive-story/chapter-authoring-prompts`；未新增第三方 npm 依赖 | 文件检查 |
| A15 | 未真实发出任何网络请求（无 `fetch`/`http`/`https`/`WebSocket` 等网络 API 调用） | 代码检查 |
| A16 | 未实现任何 Schema Normalizer/Compiler/AI Repair Loop 逻辑 | 代码检查 |
| A17 | 除本节点 Writable Scope 外任何既有文件均未被修改（`pnpm-lock.yaml` 的自动新增 importer 条目除外，见 Task Package 第 3 节说明） | git diff 比对 |
| A18 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A19 | `specs/dev/DEV-071/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A20 | `git log` 新增恰 1 条提交，首行 `DEV-071: ai chapter generator (port + noop, no real LLM protocol defined; deterministic prompt+brief request builder)` | 命令 |
| A21 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交**；工作区无任何额外残留文件 | 命令 + `git status` 检查 |
| A22 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
