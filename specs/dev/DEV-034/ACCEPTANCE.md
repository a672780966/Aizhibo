# DEV-034 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-034.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `noopTtsProviderPort.synthesize(...)` 恒定 resolve 为 `{ok:false, reason:string}`，不抛异常 | 测试检查 |
| A08 | `TtsSynthesisResult` 可辨识联合的两个分支类型收窄正确 | 测试 + typecheck |
| A09 | `resolveAudioSource.ts`/`AudioResolutionPorts.hasTtsProvider` 逐字节未变 | git diff 比对 |
| A10 | `packages/runtime-kernel/**`、`apps/renderer/**` 未被修改（本节点零接线） | git diff 比对 |
| A11 | 未新增任何 npm 依赖 | 文件检查 |
| A12 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A13 | `specs/dev/DEV-034/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T003 全部勾选，`Status:` 表头改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A14 | `git log` 新增恰 1 条提交，首行 `DEV-034: tts provider interface`；提交时 `git status --porcelain` 为空 | 命令 |
| A15 | LEDGER 含 `NODE_REPORT-DEV-034` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A16 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
