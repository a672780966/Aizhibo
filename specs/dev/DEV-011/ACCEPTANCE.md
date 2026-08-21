# DEV-011 ACCEPTANCE

权威 Acceptance 副本：`specs/tasks/TASK-PACKAGE-DEV-011.md` 第 12 节。以下逐字抄录。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `extractVoteRounds` 对 0/1/多轮投票用例均正确切分 | 测试检查 |
| A08 | `replayFromEventLog` 对 `valid-minimal` 端到端重放到 `CHAPTER_END` | 测试检查 |
| A09 | 不匹配的 `recordedEvents` 输入触发明确错误，不静默产生错误结果/死循环 | 测试检查 |
| A10 | `compareEventLogs`（默认排除 `id`/`timestamp`）对真实两次独立驱动（各自 `systemClockPort`）返回空数组 | 测试检查 |
| A11 | 注入同一 `virtualClockPort` 的原始驱动与重放，全字段（含 `id`/`timestamp`）深比较逐字节相同 | 测试检查 |
| A12 | 人为篡改一条事件后 `compareEventLogs` 能正确报告 divergence（证明比对函数有效） | 测试检查 |
| A13 | `index.ts` 的 `git diff` 只包含新增行，无删除/修改任何既有行 | git diff 比对 |
| A14 | `packages/runtime-kernel` 除 `index.ts` 外的既有文件 git diff 为空 | git diff 比对 |
| A15 | `packages/persistence`、`chapter-schema`、`chapter-compiler`、`rule-engine`、`dice-engine`、`narrative-composer` 全部未被修改 | git diff 比对 |
| A16 | 未新增任何 npm 依赖 | 文件检查 |
| A17 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A18 | `specs/dev/DEV-011/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T006 全部勾选 | 文件 + 文本检查 |
| A19 | `git log` 新增恰 1 条提交，首行 `DEV-011: deterministic replay`；提交时 `git status --porcelain` 为空 | 命令 |
| A20 | LEDGER 含 `NODE_REPORT-DEV-011` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A21 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
