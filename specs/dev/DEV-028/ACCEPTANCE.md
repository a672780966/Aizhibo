# DEV-028 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-028.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | 真实断线重连测试通过，`commandSeq` 延续、`state` 正确 | 测试检查 |
| A08 | 同连接连续两次 RESYNC 幂等性测试通过（`state` 内容相同，`commandSeq` 各自递增） | 测试检查 |
| A09 | 多客户端分发一致性测试通过 | 测试检查 |
| A10 | 未修改任何生产代码文件 | git diff 比对 |
| A11 | 未修改既有测试用例（仅新增 it 块） | git diff 比对 |
| A12 | 未新增任何 npm 依赖 | 文件检查 |
| A13 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A14 | `specs/dev/DEV-028/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T005 全部勾选，`Status:` 表头改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A15 | `git log` 新增恰 1 条提交，首行 `DEV-028: presentation command bus`；提交时 `git status --porcelain` 为空 | 命令 |
| A16 | LEDGER 含 `NODE_REPORT-DEV-028` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A17 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
