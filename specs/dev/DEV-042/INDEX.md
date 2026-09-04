# DEV-042 INDEX

Status: IN_PROGRESS

## Current Node

DEV-042 — Chat Message Adapter

## Objective

新建 `packages/platform-core`（`NormalizedChatMessage`/`ChatHandler`，
Dev Spec 第 43 节 + DAG.md CR-017 的平台无关入站契约）+
`packages/platform-twitch/src/chatMessageAdapter.ts`
（`normalizeTwitchChatMessage`/`createTwitchChatOnNotification`，把
DEV-041 的 `TwitchChatNotification` 转换成 `NormalizedChatMessage`）。
不碰 `runtime-kernel`/`PlatformPort`/`Vote`（DEV-044 Interaction
Aggregator 的边界）；不做去重（DEV-043）；不组装完整
`LivePlatformAdapter`（DEV-046 之后）。

## Allowed Scope

```
packages/platform-core/                                    （新增包）
packages/platform-core/package.json
packages/platform-core/tsconfig.json
packages/platform-core/src/index.ts
packages/platform-core/src/index.test.ts
packages/platform-twitch/src/chatMessageAdapter.ts          （新增）
packages/platform-twitch/src/chatMessageAdapter.test.ts     （新增）
packages/platform-twitch/src/index.ts                       （追加导出）
packages/platform-twitch/package.json                       （追加 platform-core 依赖）
pnpm-lock.yaml
tsconfig.json                                                （追加 1 条 references）
specs/dev/DEV-042/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
packages/platform-twitch/src/eventSubClient.ts（DEV-041 冻结）
packages/platform-twitch/src/twitchAuth.ts（DEV-040 冻结）
packages/runtime-kernel/src/ports.ts（Read-only，理解边界用，不得修改）
其余同既有节点惯例
```

## Forbidden Scope

```
修改 packages/runtime-kernel/**
修改 eventSubClient.ts / twitchAuth.ts
实现去重存储（DEV-043）
实现投票解析/聚合（DEV-044）
实现发送消息 API（DEV-046）
在 platform-core 里定义 LivePlatformAdapter
新增第三方 npm 依赖
创建 packages/ai-host
```

## Task Order

- [ ] T001 节点文档 + platform-core 包骨架
- [ ] T002 platform-core 类型定义 + chatMessageAdapter.ts + 测试
- [ ] T003 index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已入库；
REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与 NODE_REPORT
消息文件已写入工作区但**未提交**。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
