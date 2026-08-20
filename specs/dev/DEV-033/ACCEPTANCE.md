# DEV-033 ACCEPTANCE

本文件由 OpenCode 在 T001 从 Task Package **逐字抄录**（第 12 节）。

**权威版本是 Task Package 中的 Acceptance 章节，不是本副本。**

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有测试零回归 | 命令输出 |
| A07 | `packages/narrative-composer` 的 `dependencies` 恰为 `{ chapter-schema, rule-engine }` | 文件检查 |
| A08 | `composeSingleNarrative` 五槽位顺序正确；缺失/条件不满足的槽位被跳过不报错；primary 缺失时其它槽位仍拼接 | 测试检查 |
| A09 | `categorizeFocus` 四类判定规则均正确；tie-break 取靠前一条；空数组抛出描述性错误 | 测试检查 |
| A10 | `composeResultSetNarration` 单条/多条场景均正确；`deferredNarrativeIds` 正确排除文本 | 测试检查 |
| A11 | 包内不存在任何 LLM SDK/NLP 库依赖、不存在任何基于 `tone` 的筛选逻辑 | grep + 代码审查 |
| A12 | `DECISIONS.md` 存在，记录第 9 节全部 6 条解释性决策 | 文件检查 |
| A13 | `specs/dev/DEV-033/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T006 全部勾选 | 文件 + 文本检查 |
| A14 | `git log` 新增恰 1 条提交，首行 `DEV-033: narrative composer`；提交时 `git status --porcelain` 为空 | 命令 |
| A15 | LEDGER 含 `NODE_REPORT-DEV-033` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A16 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**`、`packages/chapter-schema/**`、`packages/rule-engine/**`、其它冻结包均未被修改 | git diff 比对 |