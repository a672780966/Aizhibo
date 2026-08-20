# DEV-009 ACCEPTANCE

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
| A07 | `runtime-kernel` 的 `dependencies` 含 `xstate` + 五个内部包 + 既有 `zod` | 文件检查 |
| A08 | `index.ts` 不导出任何暴露内部 snapshot 结构的类型（含 `@ts-expect-error` 测试证明） | 代码 + 测试检查 |
| A09 | 四个 Port 接口 + 默认实现存在且可用 | 测试检查 |
| A10 | STORY Region 10 态转移正确，`compile()` 失败/成功两条路径均正确 | 测试检查 |
| A11 | INTERACTION Region 6 态转移正确，改票覆盖、多 ActionGroup、DICE 三事件可见性均正确 | 测试检查 |
| A12 | PRESENTATION/AUDIO Region 状态可达，Port 调用正确 | 测试检查 |
| A13 | HOST/PLATFORM/SAFETY 占位 Region 存在且不影响机器整体结构 | 测试检查 |
| A14 | `createRuntimeMachine` 端到端链路（加载→场景→互动→投票→解算→叙事）可跑通 | 测试检查 |
| A15 | `getEventLog` 序号严格单调递增无跳号，返回值不可篡改内部状态 | 测试检查 |
| A16 | 包内不存在裸 `Date.now()`/`Math.random()`（`ClockPort`/`dice-engine` 内部实现之外） | grep 检查 |
| A17 | `DECISIONS.md` 存在，覆盖 xstate 版本选择、骰子种子派生公式、DICE 事件节奏简化说明、Snapshot 不透明设计理由 | 文件检查 |
| A18 | `specs/dev/DEV-009/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T011 全部勾选 | 文件 + 文本检查 |
| A19 | `git log` 新增恰 1 条提交，首行 `DEV-009: xstate runtime kernel`；提交时 `git status --porcelain` 为空 | 命令 |
| A20 | LEDGER 含 `NODE_REPORT-DEV-009` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A21 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**`、其它全部冻结包均未被修改 | git diff 比对 |