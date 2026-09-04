# DEV-045 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-045.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归（含 DEV-041/FIX-01 断言逐条保留） | 命令输出 + diff 比对 |
| A07 | `session_reconnect` 帧携带 `reconnect_url` → 重连尝试的新 socket 使用该 URL | 测试检查 |
| A08 | `session_reconnect` 帧缺失 `reconnect_url` → 回退使用默认 `wsUrl` | 测试检查 |
| A09 | 重连成功全链路：`RECONNECTING→WELCOME→SUBSCRIBING→CONNECTED`，旧 socket `close()` 恰一次 | 测试检查 |
| A10 | 重连尝试失败（welcome 前 error/close）→ 停留 `RECONNECTING`，不跳 `ERROR` | 测试检查 |
| A11 | 退避延迟指数增长（1000→2000...），用注入 `Clock` 验证具体数值 | 测试检查 |
| A12 | 退避延迟封顶 `30000ms`，不无限增长 | 测试检查 |
| A13 | `disconnect()` 取消挂起的重连定时器，之后不再发起新尝试 | 测试检查 |
| A14 | 一次成功重连后，下次 `session_reconnect` 的首次延迟重新从 `1000ms` 起算 | 测试检查 |
| A15 | `SUBSCRIBE_FAIL`（重连后）仍转 `ERROR`，不重试 | 测试检查 |
| A16 | 重连尝试不调用 `authPort.getAccessToken()`（断言调用次数不因重连增加） | 测试检查 |
| A17 | `EventSubClientConfig`/`EventSubClient`/`EventSubClientState`/`TwitchChatNotification` 公开签名未变 | 源码/类型检查 |
| A18 | 未新增第三方 npm 依赖 | 文件检查 |
| A19 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A20 | `specs/dev/DEV-045/` 节点文档齐全，`INDEX.md` T001–T003 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A21 | `git log` 新增恰 1 条提交，首行 `DEV-045: twitch reconnect (exponential backoff)` | 命令 |
| A22 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A23 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
