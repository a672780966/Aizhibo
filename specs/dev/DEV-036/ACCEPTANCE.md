# DEV-036 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-036.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `computeAudioCacheKey` 相同输入→相同 key，仅 `voiceModelVersion` 不同→不同 key | 测试检查 |
| A08 | `voiceSettings` 键顺序不同但内容相同→相同 key | 测试检查 |
| A09 | `findCached`：`cacheDir` 不存在→`undefined`，不抛异常 | 测试检查 |
| A10 | `store`→`findCached` 往返：路径可读、内容一致、扩展名与源文件一致 | 测试检查 |
| A11 | 两个不同 `voiceModelVersion` 共享 `cacheDir` 互不串扰（端到端真实临时目录） | 测试检查 |
| A12 | `getAudioCacheHealth` 可写目录→`OK`；不可写/非法路径→`DOWN`，不抛异常 | 测试检查 |
| A13 | `AudioResolutionRequest` 未新增 `voiceModelVersion` 字段（未被修改） | git diff 比对 |
| A14 | `resolveAudioSource.ts`/`ttsProvider.ts`/`elevenLabsTtsProvider.ts` 逐字节未变 | git diff 比对 |
| A15 | `packages/runtime-kernel/**`、`apps/renderer/**` 未被修改 | git diff 比对 |
| A16 | 未新增任何 npm 依赖 | 文件检查 |
| A17 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A18 | `specs/dev/DEV-036/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T003 全部勾选，`Status:` 表头改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A19 | `git log` 新增恰 1 条提交，首行 `DEV-036: audio cache`；提交时 `git status --porcelain` 为空 | 命令 |
| A20 | LEDGER 含 `NODE_REPORT-DEV-036` 记录（位于主表分隔线之前，待处理表已同步），`git_head` 一致 | LEDGER + 命令比对 |
| A21 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
