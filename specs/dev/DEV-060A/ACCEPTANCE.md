# DEV-060A ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-060A.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含新包 `operator-api` 真正被 `tsc -b` 构建） | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `createHostPermissionStore()` 默认 `ALLOWED`，`setPermission` 读写往返正确 | 测试检查 |
| A08 | `ALL_OPERATOR_ACTIONS` 与 Dev Spec 第 53 节 11 个 action 集合相等；`isOperatorAction` 类型守卫正确 | 测试检查 |
| A09 | `createOptionalOperatorAuthProvider` 四种鉴权场景（未配置/正确/错误/缺失 token）结果正确，未配置时默认**拒绝**而非放行 | 测试检查 |
| A10 | `appendOperatorOverrideEvent` 写入的事件 `type`/`visibility`/`payload`/`sequence` 递增均正确，可被 `loadEvents` 读回 | 测试检查 |
| A11 | `dispatchOperatorAction` 对 `MUTE_HOST`/`UNMUTE_HOST`/`RESTORE_LKG`（有快照与无快照两种场景）行为正确 | 测试检查 |
| A12 | `dispatchOperatorAction` 对其余 8 个 action 均返回 `ok:false` + 各自具体原因，不抛异常，无真实副作用 | 测试检查 |
| A13 | 对全部 11 个 action 逐一调用，每次调用后均产生恰好一条新的 `OPERATOR_OVERRIDE` 持久化事件，`sequence` 跨 11 次调用严格递增无重复 | 测试检查 |
| A14 | `createOperatorHttpServer` 的 200/400/401/404 全路径（含鉴权未配置默认 401）均正确 | 测试检查 |
| A15 | 未新增第三方 npm 依赖（只用 Node 内置模块 + 已冻结 workspace 包） | 文件检查 |
| A16 | `platform-core/**`、`platform-twitch/**`、`runtime-kernel/**`、`renderer/**`、`ai-host` 既有 8 个模块均未被修改 | git diff 比对 |
| A17 | 未实现任何真实 SAFETY/OBS 逻辑；未新增 `RootEvent` 变体；未实现"热替换进程"机制 | 代码检查 |
| A18 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A19 | `specs/dev/DEV-060A/` 节点文档齐全，`INDEX.md` T001–T003 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A20 | `git log` 新增恰 1 条提交，首行 `DEV-060A: operator API (11-action endpoint + auth + OPERATOR_OVERRIDE audit, honest stubs for 8 unbuilt targets)` | 命令 |
| A21 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A22 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
