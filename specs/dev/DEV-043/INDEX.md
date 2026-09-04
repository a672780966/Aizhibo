# DEV-043 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-043 — Message Deduplication

## Objective

新增 `packages/platform-twitch/src/messageDedup.ts`：有界内存去重
（`createMessageDeduplicator`，`Set`+FIFO 淘汰，默认 `maxSize=1000`）+
`createDedupingOnNotification`（包装 DEV-041 的 `TwitchChatNotification`
层 `onNotification` 回调，重复 `messageId` 直接丢弃）。Dev Spec 第 44
节明确要求（EventSub 至少一次投递）。不持久化、不绑死在
`ChatHandler`/`NormalizedChatMessage` 层。

## Allowed Scope

```
packages/platform-twitch/src/messageDedup.ts        （新增）
packages/platform-twitch/src/messageDedup.test.ts   （新增）
packages/platform-twitch/src/index.ts               （追加导出）
specs/dev/DEV-043/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
packages/platform-twitch/src/eventSubClient.ts（DEV-041 冻结）
packages/platform-twitch/src/chatMessageAdapter.ts（DEV-042 冻结）
其余同既有节点惯例
```

## Forbidden Scope

```
修改 eventSubClient.ts / twitchAuth.ts / chatMessageAdapter.ts
引入数据库/持久化去重存储
把去重能力绑死在 ChatHandler/NormalizedChatMessage 层
新增第三方 npm 依赖
修改 packages/runtime-kernel/**、apps/renderer/**、packages/audio-engine/**
创建 packages/ai-host
```

## Task Order

- [x] T001 节点文档
- [x] T002 messageDedup.ts + 测试 + index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

（全部完成，等待 AUDITOR 审计）

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已入库；
REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与 NODE_REPORT
消息文件已写入工作区但**未提交**。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
