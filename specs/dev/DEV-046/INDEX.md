# DEV-046 INDEX

Status: IN_PROGRESS

## Current Node

DEV-046 — Twitch Send Chat

## Objective

新增 `packages/platform-twitch/src/sendChat.ts`：`createTwitchSendChat`
调用真实 Twitch Send Chat Message API（`POST /helix/chat/messages`），
复用 DEV-040 `TwitchAuthPort` 与其"诚实结果类型"模式
（`{ok:true,messageId}|{ok:false,reason}`）。不提供健康探测函数（会
产生真实发消息副作用）、不做本地校验/截断/重试、不接入
`runtime-kernel`/`PlatformPort`（CR-010，留给未来的 DEV-050A Egress
Gate）。

## Allowed Scope

```
packages/platform-twitch/src/sendChat.ts        （新增）
packages/platform-twitch/src/sendChat.test.ts   （新增）
packages/platform-twitch/src/index.ts           （追加导出）
specs/dev/DEV-046/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
packages/platform-twitch/src/twitchAuth.ts（DEV-040 冻结）
packages/runtime-kernel/src/ports.ts（Read-only，仅核对形状，不得 import）
其余同既有节点惯例
```

## Forbidden Scope

```
修改 packages/runtime-kernel/**
import 或依赖 @interactive-story/runtime-kernel
把 createTwitchSendChat 接入 PlatformPort/runtime-kernel 的任何调用点
创建任何 Host 可直接调用的出站接口（CR-010）
提供会真实发送聊天消息的健康探测函数
实现消息内容本地校验/截断/重试
新增第三方 npm 依赖
创建 packages/ai-host 或额外新包
```

## Task Order

- [ ] T001 节点文档
- [ ] T002 sendChat.ts + 测试 + index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已入库；
REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与 NODE_REPORT
消息文件已写入工作区但**未提交**。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
