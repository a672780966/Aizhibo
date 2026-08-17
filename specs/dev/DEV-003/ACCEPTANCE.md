# DEV-003 ACCEPTANCE

本文件由 OpenCode 在 T001 从 Task Package **逐字抄录**（第 12 节）。

**权威版本是 Task Package 中的 Acceptance 章节，不是本副本。**

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0，0 error / 0 warning | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；DEV-002 遗留全部断言无回归；DEV-003 新增全部测试通过 | 命令输出 |
| A07 | DEV-002 只读源文件（第 3 节 Read-only Scope 列出的 8 组 `.ts`/`.test.ts`）`git diff` 为空 | git diff |
| A08 | `types.ts`/`compile.ts`/`compile.test.ts`/`index.ts` 的既有代码行 `git diff` 只含新增行（`+`），不含删除或修改（`-` 只能是空行调整） | git diff 逐行检查 |
| A09 | `buildStoryGraphModel` 对 `graph-clean` 产出的节点数与 `story.graph.json` 声明数一致 | 测试检查 |
| A10 | 死路 / 不可达节点 / 不可达 Ending / 不可达 Boss 四类各自的 fixture 只触发对应字段，互不串扰 | 测试检查 |
| A11 | 陷阱环被正确检出；含逃逸边的循环不被误判 | 测试检查 |
| A12 | 单节点自环（无其它出边）被判定为陷阱；`ENDING` 节点自身不被误判为陷阱 | 测试检查 |
| A13 | PASS5 可达键集合正确排除不可达效果贡献的键 | 测试检查 |
| A14 | 不可满足 Ending / Recovery 各自被正确检出；正例不产生误报 | 测试检查 |
| A15 | `compile()` 的 `passed` 判定正确纳入 `graphIssues`/`stateIssues` | 测试检查 |
| A16 | `index.ts` 导出 PASS3/PASS5 全部公开类型与函数，供下游可 import | 代码检查 |
| A17 | 包内不存在第三方图算法库依赖 | 文件检查 |
| A18 | 包内不存在 Condition 运行时求值函数（如 `evaluateCondition(condition, worldState): boolean` 这类接受具体状态实例的函数）——只允许接受"可达状态集合"这种近似模型的函数 | 代码审查 |
| A19 | `test-fixtures/graph-*`、`test-fixtures/state-*` 均通过自身的 PASS1+PASS2 前置校验（无 schema/引用错误混入） | 测试检查 |
| A20 | `test-fixtures/README.md` 列出全部新增目录 | 文件检查 |
| A21 | `specs/dev/DEV-003/` 四份节点文档齐全，`INDEX.md` 含原句且 T001–T009 全部勾选 | 文件 + 文本检查 |
| A22 | `git log` 新增恰 1 条提交，首行 `DEV-003: story graph analyzer (PASS 3+5)`；提交时 `git status --porcelain` 为空 | 命令 |
| A23 | LEDGER 含 `OPENCODE → AUDITOR` 的 `NODE_REPORT-DEV-003` 记录，信封 `git_head` 与提交 sha 一致 | LEDGER + 命令比对 |
| A24 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**`、`packages/chapter-schema/**`、`packages/runtime-kernel/**`、`packages/shared/**` 均未被修改 | git diff 比对 |