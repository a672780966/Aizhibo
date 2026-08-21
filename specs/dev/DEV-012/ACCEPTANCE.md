# DEV-012 ACCEPTANCE

权威 Acceptance 副本：`specs/tasks/TASK-PACKAGE-DEV-012.md` 第 12 节。以下逐字抄录。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `ports.ts` 只新增 `PresentationPort.onRendererHello?` 一行，`noopPresentationPort` 未被修改仍类型检查通过 | git diff + 测试检查 |
| A08 | `commandSeq` 从 1 严格自增、不重复不跳号（含 RESYNC 命令本身也占用编号） | 测试检查 |
| A09 | `getState()` 对五类已知 `kind` 正确折叠，未知 `kind` 不抛异常也不破坏已有状态 | 测试检查 |
| A10 | `onRendererHello` 触发后正确发出 `PRESENTATION_RESYNC` 命令，内容与 `getState()` 一致 | 测试检查 |
| A11 | `noopPresentationPort`（未提供 `onRendererHello`）包装后 `send`/装饰逻辑仍正常工作，不因缺少可选方法而抛异常 | 测试检查 |
| A12 | 端到端：真实 `createRuntimeMachine` + `valid-minimal` 驱动下 `getState().currentSceneId` 随场景推进正确更新 | 测试检查 |
| A13 | `index.ts` 的 `git diff` 只包含新增行 | git diff 比对 |
| A14 | `packages/runtime-kernel` 除 `ports.ts`/`index.ts` 外的既有文件 git diff 为空 | git diff 比对 |
| A15 | `packages/persistence`、`chapter-schema`、`chapter-compiler`、`rule-engine`、`dice-engine`、`narrative-composer` 全部未被修改 | git diff 比对 |
| A16 | 未新增任何 npm 依赖 | 文件检查 |
| A17 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点，含"互动关闭无信号"已知缺口的如实记录 | 文件检查 |
| A18 | `specs/dev/DEV-012/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T005 全部勾选 | 文件 + 文本检查 |
| A19 | `git log` 新增恰 1 条提交，首行 `DEV-012: runtime api`；提交时 `git status --porcelain` 为空 | 命令 |
| A20 | LEDGER 含 `NODE_REPORT-DEV-012` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A21 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |