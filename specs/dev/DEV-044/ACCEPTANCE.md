# DEV-044 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-044.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | A/B/C/D 大小写+前后空白容错，各至少一例触发 handler | 测试检查 |
| A08 | 非法/无关文本不触发 handler | 测试检查 |
| A09 | 未注册 handler 时 ingest 不抛异常 | 测试检查 |
| A10 | 二次 onVote 注册覆盖第一个 handler | 测试检查 |
| A11 | viewerId 等字段正确透传到 Vote | 测试检查 |
| A12 | 未新增第三方 npm 依赖 | 文件检查 |
| A13 | `runtime-kernel/**` 未被修改，且未被 import/依赖 | git diff + 源码检查 |
| A14 | 未创建 packages/ai-host | 文件检查 |
| A15 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A16 | `specs/dev/DEV-044/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A17 | `git log` 新增恰 1 条提交，首行 `DEV-044: interaction aggregator (a/b/c/d vote parsing)` | 命令 |
| A18 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A19 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
