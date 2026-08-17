# DEV-002A ACCEPTANCE

本文件由 OpenCode 在 T001 从 Task Package **逐字抄录**（第 12 节）。

**权威版本是 Task Package 中的 Acceptance 章节，不是本副本。**

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；DEV-000/001/002/003 遗留测试零回归 | 命令输出 |
| A07 | `hostPublic.ts` 仅新增 `knownFactDependencies` 一个字段，`git diff` 不含对既有字段的改动 | git diff |
| A08 | DEV-000/001/002/003 只读源文件 `git diff` 为空 | git diff |
| A09 | `types.ts`/`compile.ts`/`compile.test.ts`/`index.ts`（两包）既有代码行只含新增，不含删除/修改 | git diff 逐行 |
| A10 | 穷举性检查：`stateModel.keys` 中任一未声明于 `flagVisibility` 的 key 被检出 | 测试检查 |
| A11 | 场景覆盖检查：任一可达 SCENE 未出现在 `sceneDisclosures` 被检出 | 测试检查 |
| A12 | 隔离性检查：Ending/Boss 专属键被误标 `PUBLIC` 被检出；正确标记 `HIDDEN` 不误报 | 测试检查 |
| A13 | 白名单+时序性检查：未声明依赖的 fact 被检出；依赖的 flag 尚未在场景祖先可达状态中出现的被检出；合法情形不误报 | 测试检查 |
| A14 | `computeAncestors` 对链式图与分支图给出正确结果 | 测试检查 |
| A15 | `ForbiddenLexicon.bySceneId` 对 `valid-minimal` 产出结构合理（起始场景包含尚未发生的 Boss/Ending 名称） | 测试检查 |
| A16 | `compile()` 的 `passed` 正确纳入 `hiddenInfoIssues`；`ForbiddenLexicon` 不影响 `passed` | 测试检查 |
| A17 | 包内不存在任何 NLP/文本相似度/正文解析相关代码 | grep + 代码审查 |
| A18 | `index.ts`（chapter-compiler）导出全部新增类型与函数 | 代码检查 |
| A19 | `test-fixtures/host-*` 均先通过 PASS1–PASS5 | 测试检查 |
| A20 | `specs/dev/DEV-002A/` 节点文档齐全，`INDEX.md` T001–T010 全部勾选 | 文件 + 文本检查 |
| A21 | `git log` 新增恰 1 条提交，首行 `DEV-002A: hidden information validator (PASS 6)`；提交时 `git status --porcelain` 为空 | 命令 |
| A22 | LEDGER 含 `NODE_REPORT-DEV-002A` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A23 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**`、`packages/runtime-kernel/**`、`packages/shared/**` 均未被修改 | git diff 比对 |