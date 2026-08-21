# DEV-020 ACCEPTANCE

权威 Acceptance 副本：`specs/tasks/TASK-PACKAGE-DEV-020.md` 第 12 节。以下逐字抄录。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含新追加的 `apps/renderer` 独立检查步骤） | 命令 |
| A03 | `pnpm lint` 退出码 0（`.tsx` 文件被实际 lint 到） | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0（仍只构建库图，未接入 `vite build`） | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归，`apps/renderer` 新测试被实际跑到 | 命令输出 |
| A07 | `vitest.config.ts`/`eslint.config.js`/根 `package.json` 的 git diff 均恰为第 2.5 节描述的最小追加 | git diff 比对 |
| A08 | 根 `tsconfig.json` 未被修改（`apps/renderer` 未加入 `references`） | git diff 比对 |
| A09 | `apps/renderer` 内客户端半代码（`src/ws/client.ts`、`src/App.tsx`）不存在对 `runtime-kernel` 的值导入 | 代码/grep 检查 |
| A10 | `detectSeqGap` 对首条消息/连续/跳号/乱序四种情形判定正确 | 测试检查 |
| A11 | 真实 WS 集成测试：`RENDERER_HELLO` 触发 `PRESENTATION_RESYNC`，`commandSeq` 连续不跳号 | 测试检查 |
| A12 | 客户端跳空检测触发后重发 `RENDERER_HELLO`，且原命令本身不被丢弃 | 测试检查 |
| A13 | `packages/**` 全部未被修改 | git diff 比对 |
| A14 | 新增 npm 依赖仅限 `react`/`react-dom`/`ws` 及其对应 `@types`/`vite`/`@vitejs/plugin-react`，无额外前端生态库 | 文件检查 |
| A15 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A16 | `specs/dev/DEV-020/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T007 全部勾选 | 文件 + 文本检查 |
| A17 | `git log` 新增恰 1 条提交，首行 `DEV-020: renderer shell`；提交时 `git status --porcelain` 为空 | 命令 |
| A18 | LEDGER 含 `NODE_REPORT-DEV-020` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A19 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |