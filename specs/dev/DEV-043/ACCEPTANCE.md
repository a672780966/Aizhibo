# DEV-043 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-043.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | 同一 messageId 第二次 seen() 返回 true，第一次返回 false | 测试检查 |
| A08 | 超过 maxSize 后最旧 id 被淘汰，淘汰后再传入视为未见过 | 测试检查 |
| A09 | 重复 id 不重新插入淘汰顺序末尾（不续命） | 测试检查 |
| A10 | createDedupingOnNotification：重复 messageId 丢弃，不同 messageId 都触发 handler | 测试检查 |
| A11 | 未新增第三方 npm 依赖 | 文件检查 |
| A12 | `eventSubClient.ts`/`twitchAuth.ts`/`chatMessageAdapter.ts`/`runtime-kernel/**`/`apps/renderer/**` 未被修改 | git diff 比对 |
| A13 | 未引入任何数据库/持久化依赖；未创建 packages/ai-host | 文件检查 |
| A14 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A15 | `specs/dev/DEV-043/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A16 | `git log` 新增恰 1 条提交，首行 `DEV-043: message deduplication (bounded fifo)` | 命令 |
| A17 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A18 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
