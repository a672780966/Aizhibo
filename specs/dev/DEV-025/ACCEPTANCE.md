# DEV-025 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-025.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `machine.ts` 的 git diff 精确限定在 `onLock`/`onResolve` 两处 | git diff 逐行比对 |
| A08 | 端到端：`DICE_INTRO`/`DICE_RESULT` 正确产出，`DICE_RESULT.results` 字段裁剪正确 | 测试检查 |
| A09 | `machine.test.ts`/`interactionRegion.*` 未被修改且全部测试通过 | git diff + 命令输出 |
| A10 | `pickDiceState` 对四种命令组合均正确返回 | 测试检查 |
| A11 | `App.tsx` 的 git diff 只有新增，DEV-020～024 既有逻辑保留 | git diff 比对 |
| A12 | `apps/renderer` 的 DEV-020～024 冻结文件未被修改 | git diff 比对 |
| A13 | `packages/**`（除 `machine.ts` 一处外）全部未被修改，含 `index.ts` | git diff 比对 |
| A14 | 未新增任何 npm 依赖 | 文件检查 |
| A15 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A16 | `specs/dev/DEV-025/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T005 全部勾选，`Status:` 表头改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A17 | `git log` 新增恰 1 条提交，首行 `DEV-025: dice ui`；提交时 `git status --porcelain` 为空 | 命令 |
| A18 | LEDGER 含 `NODE_REPORT-DEV-025` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A19 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |