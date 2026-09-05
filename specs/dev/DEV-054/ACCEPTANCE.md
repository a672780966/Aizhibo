# DEV-054 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-054.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `host_viewer_memory`/`host_running_jokes` 两张表存在且列约束符合第 2.1 节 | 测试检查 |
| A08 | `upsertHostViewerMemory` 二次写入更新 `note`/`last_seen_at`，`created_at` 不变 | 测试检查 |
| A09 | `listHostRunningJokes` 按 `created_at` 升序返回同 platform 全部记录 | 测试检查 |
| A10 | `deleteExpiredHostViewerMemory`/`deleteExpiredHostRunningJokes` 只删过期且同 platform 的行，其余不受影响 | 测试检查 |
| A11 | `host-memory` 四个转发方法（`rememberViewer`/`recallViewer`/`addRunningJoke`/`listRunningJokes`）端到端正确 | 测试检查 |
| A12 | `purge` 按 per-platform 保留时长差异化清理，未列出的 platform 不受影响 | 测试检查 |
| A13 | `getHealth()` 正常路径返回 `status: 'OK'` | 测试检查 |
| A14 | `host-memory` 源码不 `import 'node:sqlite'`、不调用 `openDatabase`/`initSchema` | 文件/文本检查 |
| A15 | 未新增第三方 npm 依赖 | 文件检查 |
| A16 | `viewerState.ts`/`health.ts`/`sessionStore.ts`/`eventStore.ts`/`snapshotStore.ts`/`recovery.ts`/`ai-host/**`/`platform-core/**`/`platform-twitch/**`/`runtime-kernel/**` 均未被修改 | git diff 比对 |
| A17 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A18 | `specs/dev/DEV-054/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A19 | `git log` 新增恰 1 条提交，首行 `DEV-054: viewer memory (host_viewer_memory/host_running_jokes tables + host-memory package)` | 命令 |
| A20 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A21 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
