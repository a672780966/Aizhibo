# DEV-061 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-061.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含新包 `health-registry` 真正被 `tsc -b` 构建） | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | 空 registry `getAggregateHealth()` 返回 `{overall:'OK', sources:{}}` | 测试检查 |
| A08 | 单来源 `OK`/`DOWN` 两种场景 `overall` 分别正确 | 测试检查 |
| A09 | 混合三来源（`OK`+`DEGRADED`+`DOWN`）`overall` 为 `DOWN`；混合两来源（`OK`+`DEGRADED`）`overall` 为 `DEGRADED` | 测试检查 |
| A10 | 同名二次 `register` 覆盖旧来源 | 测试检查 |
| A11 | 同步与异步 `getHealth()` 可在同一 registry 内混用并都被正确聚合 | 测试检查 |
| A12 | `sources` 字段 key/value 与登记时的 name/`getHealth()`原始返回值一致 | 测试检查 |
| A13 | 未新增第三方 npm 依赖，只 `import type { Health }` from `@interactive-story/shared` | 文件检查 |
| A14 | `packages/shared/**`、`persistence/**`、`host-memory/**`、`platform-twitch/**`、`ai-host/**`、`operator-api/**`、`platform-core/**`、`runtime-kernel/**`、`renderer/**` 均未被修改 | git diff 比对 |
| A15 | 未新建任何 HTTP 端点，未接入 `operator-api` | 代码检查 |
| A16 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A17 | `specs/dev/DEV-061/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A18 | `git log` 新增恰 1 条提交，首行 `DEV-061: health registry (aggregate getHealth sources, worst-status-wins, no real sources wired yet)` | 命令 |
| A19 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A20 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
