# DEV-041 INDEX

Status: IN_PROGRESS

## Current Node

DEV-041 — EventSub Client

## Objective

在 `packages/platform-twitch` 新增 `createEventSubClient`：Dev Spec 第 45
节八态（DISCONNECTED/CONNECTING/WELCOME/SUBSCRIBING/CONNECTED/
RECONNECTING/DEGRADED/ERROR）的 XState 连接生命周期机器，真实调用 Twitch
EventSub WebSocket + Helix 订阅创建 API（原生 fetch/WebSocket，零新增第三方
依赖，`xstate` 复用仓库既有版本）。首次真实消费 DEV-040 的 `TwitchAuthPort`。
不做 NormalizedChatMessage 转换（DEV-042）、去重（DEV-043）、真正重连算法
（DEV-045）、发送消息（DEV-046）。

## Allowed Scope

```
packages/platform-twitch/src/eventSubClient.ts        （新增）
packages/platform-twitch/src/eventSubClient.test.ts   （新增）
packages/platform-twitch/src/index.ts                 （追加导出）
packages/platform-twitch/package.json                 （追加 xstate 依赖）
pnpm-lock.yaml
specs/dev/DEV-041/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
packages/platform-twitch/src/twitchAuth.ts（DEV-040 冻结）
packages/runtime-kernel/src/virtualPorts.ts（Clock 接口形状参照，本地镜像不跨包 import）
packages/shared/src/health.ts
packages/runtime-kernel/package.json（xstate 版本参照）
其余同既有节点惯例
```

## Forbidden Scope

```
定义或改动 NormalizedChatMessage（DEV-042 职责）
实现去重存储（DEV-043 职责）
实现真正的指数退避重连算法（DEV-045 职责）
实现发送消息 API（DEV-046 职责）
组装完整 LivePlatformAdapter
新增 ws/websocket 等第三方库
修改 packages/audio-engine/**、packages/runtime-kernel/**、apps/renderer/**
修改 packages/platform-twitch/src/twitchAuth.ts
创建 packages/ai-host
```

## Task Order

- [ ] T001 节点文档
- [ ] T002 eventSubClient.ts + 测试
- [ ] T003 index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；测试全程零真实网络连接；`git log` 新增恰 1 条提交；
`DECISIONS.md` 已入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；
LEDGER 追加行与 NODE_REPORT 消息文件已写入工作区但**未提交**。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
