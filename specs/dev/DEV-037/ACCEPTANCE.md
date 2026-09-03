# DEV-037 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-037.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归；墙钟耗时未显著回归（REPORT.md 记录对比） | 命令输出 |
| A07 | 记录型假时钟证明 `LOCKING` 请求的延迟恰为 `TARGET_DICE_MS` | 测试检查 |
| A08 | vitest 假定时器 + 默认时钟：提前 1ms 仍 `LOCKING`，到点转 `LOCKED` 且 `onResolve` 已执行 | 测试检查 |
| A09 | `interactionRegion.ts` 仅 `LOCKING` 一处改动，其余逐字节未变 | git diff 比对 |
| A10 | `onResolve` 内部计算逻辑本身逐字节未变 | git diff 比对 |
| A11 | Simulator（`runSimulation`）注入 `instantClock` 后吞吐量未退化 | 命令输出 |
| A12 | 既有 LOCK 相关测试断言逻辑零改动，只追加 `clock` 字段 | git diff 比对 |
| A13 | `apps/renderer/**`、`packages/audio-engine/**` 未被修改 | git diff 比对 |
| A14 | 未新增任何 npm 依赖 | 文件检查 |
| A15 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A16 | `specs/dev/DEV-037/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T004 全部勾选，`Status:` 表头改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A17 | `git log` 新增恰 1 条提交，首行 `DEV-037: dice buffer controller`；提交时 `git status --porcelain` 为空 | 命令 |
| A18 | LEDGER 含 `NODE_REPORT-DEV-037` 记录（主表分隔线之前，待处理表已同步），`git_head` 一致 | LEDGER + 命令比对 |
| A19 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
