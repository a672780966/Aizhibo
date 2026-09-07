# DEV-063 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-063.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含新包 `watchdog` 真正被 `tsc -b` 构建） | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `TWITCH_DISCONNECT` 返回 `ALREADY_HANDLED`，`detail` 提及既有自动重连机制 | 测试检查 |
| A08 | `RENDERER_CRASH` 返回 `NOT_YET_WIRED`，`detail` 具体点名 | 测试检查 |
| A09 | `RUNTIME_PROCESS_RESTART` 返回 `NOT_YET_WIRED`，`detail` 具体点名且与 `RENDERER_CRASH` 的 `detail` 不同 | 测试检查 |
| A10 | 三个 trigger 的返回值 `trigger` 字段与传入值逐一对应 | 测试检查 |
| A11 | 同一 trigger 连续两次调用结果深度相等（纯函数） | 测试检查 |
| A12 | 未新增第三方 npm 依赖，`package.json` 无 workspace 依赖 | 文件检查 |
| A13 | 未 import `error-registry`/`health-registry`/`platform-twitch`/`runtime-kernel`/`operator-api`/`renderer` 任何一个 | 代码检查 |
| A14 | 除本节点 Writable Scope 外任何既有文件均未被修改 | git diff 比对 |
| A15 | 未实现任何真实 Renderer 崩溃检测/进程重启/Twitch 重连逻辑 | 代码检查 |
| A16 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A17 | `specs/dev/DEV-063/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A18 | `git log` 新增恰 1 条提交，首行 `DEV-063: watchdog (closed 3-trigger L3 recovery decision, honest already-handled/not-yet-wired outcomes)` | 命令 |
| A19 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交**；工作区无任何额外残留文件 | 命令 + `git status` 检查 |
| A20 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
