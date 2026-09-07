# DEV-062 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-062.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含新包 `error-registry` 真正被 `tsc -b` 构建） | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `record()` 返回值输入字段透传 + `id` 非空 + `timestamp` 合法 ISO 字符串 | 测试检查 |
| A08 | 连续三次 `record()` 的 `id` 两两不同 | 测试检查 |
| A09 | 未调用 `record()` 前 `list()` 返回空数组 | 测试检查 |
| A10 | 连续两次 `record()` 后 `list()` 长度为 2 且顺序与调用顺序一致 | 测试检查 |
| A11 | `list()` 返回值是副本，外部变更不影响内部状态 | 测试检查 |
| A12 | `L1`/`L2`/`L3`/`L4` 四个等级各记录一次均可用，`level` 字段逐一对应 | 测试检查 |
| A13 | 未新增第三方 npm 依赖，`package.json` 无 workspace 依赖 | 文件检查 |
| A14 | 除本节点 Writable Scope 外任何既有文件均未被修改 | git diff 比对 |
| A15 | 未实现第 56 节任何一级的处理逻辑；`category` 非封闭枚举；未接入 `persistence`/HTTP | 代码检查 |
| A16 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A17 | `specs/dev/DEV-062/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A18 | `git log` 新增恰 1 条提交，首行 `DEV-062: error registry (record-only, L1-L4 closed level type, free-text category, no handling logic)` | 命令 |
| A19 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交**；工作区无任何额外残留文件 | 命令 + `git status` 检查 |
| A20 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
