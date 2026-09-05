# DEV-051 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-051.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | 命中黑名单的评论被丢弃，不产生簇 | 测试检查 |
| A08 | 超过 `maxLength` 的评论被丢弃 | 测试检查 |
| A09 | 归一化后相同文本聚为同一簇，`count` 正确累加，`latest` 正确更新 | 测试检查 |
| A10 | 不同文本各自独立成簇 | 测试检查 |
| A11 | `selectCandidate()` 按簇大小降序、并列按最近时间降序选出候选 | 测试检查 |
| A12 | 无任何簇时 `selectCandidate()` 返回 `undefined` | 测试检查 |
| A13 | `selectCandidate()` 连续调用（不 ingest/clear）结果一致，验证只读不清空 | 测试检查 |
| A14 | 簇数超过 `maxPending` 时正确淘汰优先级最低的簇 | 测试检查 |
| A15 | `clear()` 清空全部簇，之后可重新正常 `ingest` | 测试检查 |
| A16 | 缺省 `maxLength`（500）/`maxPending`（100）符合文档 | 测试检查 |
| A17 | 未新增第三方 npm 依赖 | 文件检查 |
| A18 | `platform-core/**`、`platform-twitch/**`、`runtime-kernel/**`、`egressGate.ts` 均未被修改 | git diff 比对 |
| A19 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A20 | `specs/dev/DEV-051/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A21 | `git log` 新增恰 1 条提交，首行 `DEV-051: comment pipeline (safety, priority, topic cluster, select candidate)` | 命令 |
| A22 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A23 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
