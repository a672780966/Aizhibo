# DEV-006 ACCEPTANCE

本文件由 OpenCode 在 T001 从 Task Package **逐字抄录**（第 12 节）。

**权威版本是 Task Package 中的 Acceptance 章节，不是本副本。**

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `rule-engine` 的 `dependencies` 恰为 `{ chapter-schema, dice-engine }` | 文件检查 |
| A08 | `resolveScale` 边界值正确；全不匹配时的兜底行为正确 | 测试检查 |
| A09 | `resolveAction` 四种分支（完整结果/mapsTo 单跳/unreachable/quality undefined）行为正确；畸形多跳 mapsTo 返回 undefined 不抛异常 | 测试检查 |
| A10 | `checkRuleCoverage` 正确检出覆盖缺口，不误报可达但结果完整的 Action，不重复检查被多处引用的同一 Action | 测试检查 |
| A11 | `compile()` 的 `passed` 正确纳入 `ruleCoverageIssues` | 测试检查 |
| A12 | `packages/rule-engine`/`packages/chapter-compiler` 被列为只读的既有源文件 `git diff` 为空 | git diff |
| A13 | 两包被列为"仅追加"的文件，既有代码行 `git diff` 只含新增 | git diff 逐行 |
| A14 | 包内不存在对 `dice-engine` 内部函数（`rollDice`/`resolveQuality`/`resolveModifiers`）的调用，只有类型 import | grep + 代码审查 |
| A15 | 包内不存在实际应用 `worldEffects`/`playerEffects` 的代码（无调用 `applyEffect`） | grep + 代码审查 |
| A16 | `DECISIONS.md` 存在，记录 `playerStateSummary` 省略理由、`worldState` 保留理由、`mapsTo` 单跳限制理由 | 文件检查 |
| A17 | `specs/dev/DEV-006/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T008 全部勾选 | 文件 + 文本检查 |
| A18 | `git log` 新增恰 1 条提交，首行 `DEV-006: action resolution engine (PASS 4)`；提交时 `git status --porcelain` 为空 | 命令 |
| A19 | LEDGER 含 `NODE_REPORT-DEV-006` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A20 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**`、`packages/chapter-schema/**`、`packages/dice-engine/**`、`packages/runtime-kernel/**`、`packages/shared/**` 均未被修改 | git diff 比对 |