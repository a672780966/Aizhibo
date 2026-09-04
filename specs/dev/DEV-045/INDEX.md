# DEV-045 INDEX

Status: IN_PROGRESS

## Current Node

DEV-045 — Twitch Reconnect

## Objective

实现 `eventSubClient.ts` 的 `RECONNECTING` 状态真实行为：Twitch
`session_reconnect` 帧触发后，用指数退避（1000ms 起，×2，封顶 30000ms，
无限重试不设上限）反复尝试连接到 `payload.session.reconnect_url`（缺失
时回退默认 `wsUrl`），成功收到新的 `session_welcome` 后无缝回到既有
`WELCOME→SUBSCRIBING→CONNECTED` 流程。不改动 `WS_ERROR→ERROR`/
`SUBSCRIBE_FAIL→ERROR` 既有语义，不重新获取 OAuth token。

## Allowed Scope

```
packages/platform-twitch/src/eventSubClient.ts        （修改，签名不变）
packages/platform-twitch/src/eventSubClient.test.ts   （新增测试，既有测试不得删改）
specs/dev/DEV-045/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
packages/platform-twitch/src/twitchAuth.ts（DEV-040 冻结）
packages/platform-core/**（DEV-042/044 冻结，本节点不消费）
其余同既有节点惯例
```

## Forbidden Scope

```
修改 EventSubClientConfig/EventSubClient/EventSubClientState/TwitchChatNotification 的公开签名
修改/删除 eventSubClient.test.ts 中 DEV-041 既有的任何断言（只能新增）
改动 CONNECTING/WELCOME/SUBSCRIBING/CONNECTED/DEGRADED/ERROR 六个状态各自的 on: 转移表
让 SUBSCRIBE_FAIL 具备重试行为
重连尝试时重新调用 authPort.getAccessToken()
引入固定重试次数上限后转 ERROR
新增第三方 npm 依赖
创建 packages/ai-host
```

## Task Order

- [ ] T001 节点文档
- [ ] T002 eventSubClient.ts 重连实现 + 测试
- [ ] T003 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已入库；
REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与 NODE_REPORT
消息文件已写入工作区但**未提交**。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
