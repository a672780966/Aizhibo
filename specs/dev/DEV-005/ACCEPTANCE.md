# DEV-005 ACCEPTANCE

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
| A07 | `packages/dice-engine` 的 `dependencies` 恰为 `{ @interactive-story/chapter-schema, @interactive-story/rule-engine }` | 文件检查 |
| A08 | 包内不存在 `Math.random`、`crypto.randomBytes` 或其它非确定性随机源 | grep（全文件） |
| A09 | `fnv1a32` 对同一输入多次调用结果一致；已知测试向量核对正确 | 测试检查 |
| A10 | `parseDiceNotation` 对 `"d20"`/`"2d6"` 等正确解析；无效输入返回退化默认值不抛异常 | 测试检查 |
| A11 | `rollRaw`/`drawDie` 对同一 `(seed, rollIndex[, drawIndex])` 确定性重现；多次骰（如 2d6）各粒子通常不同值 | 测试检查 |
| A12 | `resolveModifiers` 只累加条件成立的修正，`applied` 明细正确 | 测试检查 |
| A13 | `resolveQuality` 正确映射；阈值缺口返回 `undefined` 不抛异常 | 测试检查 |
| A14 | `rollDice` 端到端对同一输入确定性重现；返回字段名与 `DiceRollRecordPayload` 逐字对齐 | 测试检查 |
| A15 | 包内不存在任何形式的有状态 PRNG 类/模块级可变计数器 | 代码审查 |
| A16 | 包内不存在 `RuntimeEvent` 构造代码，不 import `runtime-kernel` | grep 检查 |
| A17 | `DECISIONS.md` 存在且记录：哈希测试向量、骰子记法退化默认值选择、模偏不修正的理由、阈值覆盖缺口的已知记录 | 文件检查 |
| A18 | `specs/dev/DEV-005/` 节点文档齐全（含 `DECISIONS.md`，且随最终提交一起入库），`INDEX.md` T001–T008 全部勾选 | 文件 + 文本检查 |
| A19 | `git log` 新增恰 1 条提交，首行 `DEV-005: dice engine`；提交时 `git status --porcelain` 为空；`REPORT.md` 引用的全部文档均已入库 | 命令 |
| A20 | LEDGER 含 `NODE_REPORT-DEV-005` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A21 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**`、`packages/chapter-schema/**`、`packages/rule-engine/**`、`packages/chapter-compiler/**`、`packages/runtime-kernel/**`、`packages/shared/**` 均未被修改 | git diff 比对 |