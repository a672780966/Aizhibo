# DEV-043 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-043.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- `createMessageDeduplicator`：`Set`+FIFO 数组的有界内存去重，默认
  `maxSize=1000`；`seen(id)` 已见过返回 `true`（不重新插入，不续命），
  未见过插入并返回 `false`，超容量淘汰最旧的。
- `createDedupingOnNotification`：包装 `TwitchChatNotification` 层的
  `onNotification` 回调，重复 `messageId` 直接丢弃不调用 `handler`。
- 通用于全部订阅类型，不绑死在 `ChatHandler`/`NormalizedChatMessage`
  层；不持久化。

## Scope（Task Package 第 3 节）

Writable：`messageDedup.ts(.test.ts)`、`index.ts`（追加）、
`specs/dev/DEV-043/*.md`、`specs/comms/LEDGER.md`（仅追加，写入不提交）、
`specs/comms/NNNN-OPENCODE-to-*.md`（写入不提交）。

Forbidden（摘录）：不改 `eventSubClient.ts`/`twitchAuth.ts`/
`chatMessageAdapter.ts`；不引入持久化存储；不新增第三方依赖。

## Task Order

T001 节点文档 → T002 `messageDedup.ts` + 测试 + `index.ts` 导出 + 全量
验证 + REPORT + commit（**恰一条提交，LEDGER/NODE_REPORT 写入工作区但
不提交**）。
