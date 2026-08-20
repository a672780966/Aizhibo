# DEV-007 ACCEPTANCE

本文件记录 Task Package §12 的验收项；权威版本是 Task Package。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `getCurrentChoiceIds` 对有/无 interaction 正确返回，`compiled === null` 时返回 `[]` | 测试检查 |
| A08 | `machine.ts`/`index.ts` 的 git diff 只包含新增行 | git diff |
| A09 | 虚拟 Port 满足类型且不触碰真实系统 | 测试检查 |
| A10 | `generateVotes` 确定性；`Math.random()`/`Date.now()` 零出现 | 测试 + grep |
| A11 | `runSimulation` 对 `valid-minimal` 50 局全部 `CHAPTER_END` | 测试检查 |
| A12 | 极小 `maxSteps` 下为 `STUCK` 且不挂死 | 测试检查 |
| A13 | 相同输入两次调用结果深度相等 | 测试检查 |
| A14 | 分裂投票真实驱动至少两组不同 choice 的 DICE 事件 | 测试检查 |
| A15 | `valid-minimal` 未被修改 | git diff |
| A16 | runtime-kernel 除 machine/index 外既有冻结文件无 diff | git diff |
| A17 | runtime-kernel package/tsconfig 未修改 | git diff |
| A18 | `DECISIONS.md` 覆盖四项指定决策 | 文件检查 |
| A19 | DEV-007 节点文档齐全，INDEX T001–T007 全部勾选 | 文件检查 |
| A20 | 新增恰 1 条提交，首行 `DEV-007: chapter simulator`，提交时干净 | 命令 |
| A21 | LEDGER 含 `NODE_REPORT-DEV-007` 且 git_head 一致 | LEDGER + 命令 |
| A22 | PROJECT_INDEX、DAG、tasks、audit、protocol 未修改 | git diff |
