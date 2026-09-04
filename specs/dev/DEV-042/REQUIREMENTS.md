# DEV-042 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-042.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- 新建 `packages/platform-core`：纯类型包，`NormalizedChatMessage`
  （platform/viewerId/messageId/text/receivedAt）+ `ChatHandler`，零
  依赖、零运行时逻辑。
- `packages/platform-twitch/src/chatMessageAdapter.ts`：
  `normalizeTwitchChatMessage`（`TwitchChatNotification` →
  `NormalizedChatMessage | undefined`，订阅类型不匹配或字段缺失均返回
  `undefined`，不抛异常）+ `createTwitchChatOnNotification`（包装成
  `EventSubClientConfig.onNotification` 兼容的回调）。
- 不碰 `runtime-kernel`/`PlatformPort`/`Vote`——那是 DEV-044 Interaction
  Aggregator 的边界（`Vote` 是已解读的投票意图，`NormalizedChatMessage`
  是原始聊天消息，中间还差一层聚合逻辑）。
- 不定义 `LivePlatformAdapter`（无消费方）。

## Scope（Task Package 第 3 节）

Writable：新包 `packages/platform-core/*`、
`packages/platform-twitch/src/chatMessageAdapter.ts(.test.ts)`、
`index.ts`（追加）、`package.json`（追加依赖）、根 `tsconfig.json`
（追加 1 条 references）、`pnpm-lock.yaml`、`specs/dev/DEV-042/*.md`。

Forbidden（摘录）：不改 `runtime-kernel`；不改 `eventSubClient.ts`/
`twitchAuth.ts`；不实现去重/投票解析/发送消息；不新增第三方依赖。

## Task Order

T001 节点文档 + platform-core 包骨架 → T002 类型定义 + chatMessageAdapter
+ 测试 → T003 index.ts 导出 + 全量验证 + REPORT + commit（**恰一条提交，
LEDGER/NODE_REPORT 写入工作区但不提交**）。
