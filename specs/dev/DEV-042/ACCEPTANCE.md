# DEV-042 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-042.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | 合法 channel.chat.message notification 正确映射为 NormalizedChatMessage | 测试检查 |
| A08 | subscriptionType 不匹配 → undefined | 测试检查 |
| A09 | chatter_user_id 缺失/非字符串 → undefined | 测试检查 |
| A10 | message.text 缺失/非字符串 → undefined | 测试检查 |
| A11 | createTwitchChatOnNotification 成功时调用 handler 恰一次，失败时不调用 | 测试检查 |
| A12 | 未新增第三方 npm 依赖 | 文件检查 |
| A13 | `runtime-kernel/**`、`eventSubClient.ts`、`twitchAuth.ts`、`audio-engine/**`、`apps/renderer/**` 未被修改 | git diff 比对 |
| A14 | `platform-core` 未定义 LivePlatformAdapter；未创建 ai-host | 文件检查 |
| A15 | 根 tsconfig 恰新增 1 条 platform-core 的 references | git diff 比对 |
| A16 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A17 | `specs/dev/DEV-042/` 节点文档齐全，`INDEX.md` T001–T003 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A18 | `git log` 新增恰 1 条提交，首行 `DEV-042: chat message adapter (platform-core + twitch normalizer)` | 命令 |
| A19 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A20 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
