# DEV-053 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-053.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | 不传 `initial` 时默认值为 `{ label: 'neutral' }` | 测试检查 |
| A08 | 传入 `initial` 时以其为初始值 | 测试检查 |
| A09 | `setMood` 后 `getMood` 反映新值 | 测试检查 |
| A10 | 连续两次 `setMood` 后只反映最后一次（覆盖式非队列） | 测试检查 |
| A11 | 两个独立 store 实例互不影响 | 测试检查 |
| A12 | 未新增第三方 npm 依赖 | 文件检查 |
| A13 | `platform-core/**`、`platform-twitch/**`、`runtime-kernel/**`、`egressGate.ts`、`commentPipeline.ts`、`hostPersona.ts` 均未被修改 | git diff 比对 |
| A14 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A15 | `specs/dev/DEV-053/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A16 | `git log` 新增恰 1 条提交，首行 `DEV-053: host mood (mutable mood store for Host Context)` | 命令 |
| A17 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A18 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
