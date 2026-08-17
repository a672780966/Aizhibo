# DEV-004 ACCEPTANCE

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
| A07 | `packages/rule-engine` 的 `dependencies` 恰为 `{ @interactive-story/chapter-schema }`，无 `zod` | 文件检查 |
| A08 | `resolveStatePath` 五种 container 寻址正确，`npc` 复合 `flags.<subkey>` 寻址正确 | 测试检查 |
| A09 | `evaluateCondition` 六种比较符 + IN + EXISTS + all/any/not 全部正确；类型不匹配/无效容器返回安全默认值而非抛异常 | 测试检查 |
| A10 | `applyEffect` 五种 op 全部正确；`PUSH` 幂等；全部 op 验证不可变性（输入对象前后深度相等） | 测试检查 |
| A11 | `applyStateRuleSet` 的 `once` 语义正确（已触发的 once 规则不重复触发）；多规则同批次触发；效果按序累积 | 测试检查 |
| A12 | `resolveGuard` 按 priority 高到低选中正确的 `goto`；全不成立返回 `undefined` | 测试检查 |
| A13 | 包内不存在任何文件系统 IO、网络调用、`RuntimeEvent` 构造代码 | grep + 代码审查 |
| A14 | 包内不存在任何 `throw` 用于本应返回安全默认值的路径（第 9 节 Constraint 3） | 代码审查 |
| A15 | `specs/dev/DEV-004/` 节点文档齐全，`INDEX.md` T001–T008 全部勾选 | 文件 + 文本检查 |
| A16 | `git log` 新增恰 1 条提交，首行 `DEV-004: state rule engine`；提交时 `git status --porcelain` 为空 | 命令 |
| A17 | LEDGER 含 `NODE_REPORT-DEV-004` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A18 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**`、`packages/chapter-schema/**`、`packages/chapter-compiler/**`、`packages/runtime-kernel/**`、`packages/shared/**` 均未被修改 | git diff 比对 |