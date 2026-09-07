# DEV-064 INDEX

Status: IN_PROGRESS

## Current Node

DEV-064 — OBS Control

## Objective

新建 `packages/platform-obs`：真实 OBS WebSocket v5 客户端
（Hello/Identify/Identified 握手 + 可选 SHA256 挑战鉴权 +
Request/RequestResponse 切场景请求），支持第 49 节六个封闭场景
（`BOOT`/`LIVE`/`RECONNECTING`/`MAINTENANCE`/`ERROR`/`ENDING`）。
第 64 节本身零正文，唯一权威范围来自第 48-49 节。只做"控制"
（怎么跟 OBS 说话），不做"决策"（何时切场景是未来 DEV-065 SAFETY
region 的职责，CR-020）。不实现任何重连逻辑（USER 2026-09-08 已
裁决建真实客户端而非接口+noop，但明确不含重连/决策）。生产代码
零 workspace/第三方依赖，只用 `node:crypto` + 原生 `WebSocket`；
`ws`/`@types/ws` 仅作测试依赖起假 OBS server。

## Allowed Scope

```
packages/platform-obs/package.json            （新增）
packages/platform-obs/tsconfig.json            （新增）
packages/platform-obs/src/index.ts             （新增）
packages/platform-obs/src/obsControlPort.ts       （新增）
packages/platform-obs/src/obsControlPort.test.ts  （新增）
packages/platform-obs/src/obsWebSocketClient.ts       （新增）
packages/platform-obs/src/obsWebSocketClient.test.ts  （新增）
tsconfig.json                                       （根，追加一条 references 条目）
specs/dev/DEV-064/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
packages/platform-twitch/src/eventSubClient.ts、twitchAuth.ts（风格参照，不 import）
packages/audio-engine/src/elevenLabsTtsProvider.ts（风格参照，不 import）
apps/renderer/package.json（只参照 ws/@types/ws 版本号）
```

## Forbidden Scope

```
修改除本节点 Writable Scope 之外的任何既有文件
import 或依赖 packages/error-registry、packages/health-registry、packages/watchdog、packages/platform-twitch、packages/runtime-kernel、packages/operator-api、packages/renderer 任何一个
新增任何生产代码第三方依赖；ws/@types/ws 只能在 devDependencies
实现任何自动重连逻辑
实现任何"何时该切场景"的判断/决策逻辑
实现真实的 SAFETY region 状态机
新建任何 HTTP 端点或接入 packages/operator-api
```

## Task Order

- [ ] T001 节点文档
- [ ] T002 obsControlPort.ts（类型+noop）+ 包骨架
- [ ] T003 obsWebSocketClient.ts（真实客户端）+ 假 OBS server 测试 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与
NODE_REPORT 消息文件已写入工作区但**未提交**；工作区不得残留任何
施工用临时文件。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
