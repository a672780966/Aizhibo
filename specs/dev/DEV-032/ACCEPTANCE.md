# DEV-032 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-032.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | 注入命中 Ports → `LOCK` 链路后 AUDIO region 自动到达 `PLAYING_STORY` | 集成测试 |
| A08 | 默认 Ports（`SUBTITLE_ONLY`）→ `LOCK` 链路后 AUDIO region 保持 `IDLE` | 集成测试 |
| A09 | `PLAYING_STORY` 后 `NARRATIVE.DONE`（有下一场景分支）→ AUDIO 回到 `IDLE` | 集成测试 |
| A10 | `PLAYING_STORY` 后 `NARRATIVE.DONE`（直达 CHAPTER_END 分支）→ AUDIO 回到 `IDLE` | 集成测试 |
| A11 | 场景无互动、直达 `CHAPTER_END` 的路径 → AUDIO 全程保持 `IDLE` | 集成测试 |
| A12 | `audioRegion.ts` 逐字节未变 | git diff 比对 |
| A13 | `Ports.audio` 既有 `send()` 载荷 kind 未变 | 代码检查 |
| A14 | `apps/renderer/**`、`packages/audio-engine/**` 未被修改 | git diff 比对 |
| A15 | 未新增任何 npm 依赖 | 文件检查 |
| A16 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A17 | `specs/dev/DEV-032/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T003 全部勾选，`Status:` 表头改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A18 | `git log` 新增恰 1 条提交，首行 `DEV-032: audio state region`；提交时 `git status --porcelain` 为空 | 命令 |
| A19 | LEDGER 含 `NODE_REPORT-DEV-032` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A20 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
