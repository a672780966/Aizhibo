# DEV-041 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-041.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归；测试全程零真实网络连接 | 命令输出 + 代码检查 |
| A07 | 完整路径 DISCONNECTED→CONNECTING→WELCOME→SUBSCRIBING→CONNECTED 逐状态可达且断言正确 | 测试检查 |
| A08 | 凭据不可用时直接转 ERROR，WebSocket 从未被构造 | 测试检查 |
| A09 | Helix 订阅调用非 202/异常 → 转 ERROR | 测试检查 |
| A10 | notification 帧被原样转发给 onNotification，状态仍 CONNECTED | 测试检查 |
| A11 | keepalive watchdog 用假 Clock 快进证明超时转 DEGRADED | 测试检查 |
| A12 | session_reconnect 帧可达 RECONNECTING | 测试检查 |
| A13 | 非本地关闭/错误事件转 ERROR | 测试检查 |
| A14 | disconnect() 从任意状态回到 DISCONNECTED，且调用了 WebSocket.close() | 测试检查 |
| A15 | getHealth() 对 CONNECTED 返回 OK，其余状态返回 DOWN（每态至少一例） | 测试检查 |
| A16 | Helix 请求 URL/method/header/body 构造正确 | 测试检查 |
| A17 | 未新增 ws/websocket 等第三方依赖；xstate 版本与 runtime-kernel 一致 | 文件检查 |
| A18 | `packages/audio-engine/**`、`packages/runtime-kernel/**`、`apps/renderer/**`、`twitchAuth.ts` 未被修改 | git diff 比对 |
| A19 | 未定义/改动 NormalizedChatMessage；未创建 packages/ai-host | 文件检查 |
| A20 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A21 | `specs/dev/DEV-041/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T003 全部勾选，`Status:` 表头改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A22 | `git log` 新增恰 1 条提交，首行 `DEV-041: eventsub client (websocket state machine)`；提交内容恰为 Writable Scope 声明的文件 | 命令 |
| A23 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但处于**未提交**状态（`git status --porcelain` 能看到它们） | 命令 |
| A24 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
