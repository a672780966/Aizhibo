# DEV-010 ACCEPTANCE

权威 Acceptance 副本：`specs/tasks/TASK-PACKAGE-DEV-010.md` 第 12 节。以下逐字抄录。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `packages/persistence/package.json` 的 `dependencies` 只含 `@interactive-story/runtime-kernel`、`@interactive-story/shared`，无新增 npm 包 | 文件检查 |
| A08 | `machine.ts`/`index.ts` 的 `git diff` 只包含新增行，无删除/修改任何既有行 | git diff 比对 |
| A09 | `getPersistedSnapshot`/`restoreRuntimeMachine` 往返一致（恢复后 phase/eventLog 与恢复前相同） | 测试检查 |
| A10 | 四张表（且仅四张表）被创建，`initSchema` 幂等 | 测试检查 |
| A11 | `appendEvents`/`loadEvents` 往返 `RuntimeEvent[]` 逐字段相等，顺序按 `sequence` | 测试检查 |
| A12 | 端到端崩溃恢复场景（第 2.6 节）通过：真实 actor + 真实 `node:sqlite`，恢复后状态与崩溃前逐字段一致 | 测试检查 |
| A13 | `viewerState` upsert 语义正确（同键更新不重复插入，`created_at`/`last_seen_at` 行为符合第 7 节 T007 要求） | 测试检查 |
| A14 | `getHealth` 对正常/异常数据库句柄分别返回 `OK`/`DOWN` | 测试检查 |
| A15 | 除四张授权表外，未创建 Non-goals 列出的任何一张表 | 测试/代码检查 |
| A16 | `packages/runtime-kernel` 除 `machine.ts`/`index.ts` 外的既有冻结文件 git diff 为空 | git diff 比对 |
| A17 | `packages/chapter-schema`/`chapter-compiler`/`rule-engine`/`dice-engine`/`narrative-composer` 全部未被修改 | git diff 比对 |
| A18 | 未新增任何 npm 依赖（`node:sqlite` 是 Node 内置模块，不需要）；`pnpm-lock.yaml` 变化仅反映 workspace 内部包链接，无新第三方包 | 文件检查 |
| A19 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A20 | `specs/dev/DEV-010/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T009 全部勾选 | 文件 + 文本检查 |
| A21 | `git log` 新增恰 1 条提交，首行 `DEV-010: persistence`；提交时 `git status --porcelain` 为空 | 命令 |
| A22 | LEDGER 含 `NODE_REPORT-DEV-010` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A23 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
