# DEV-063 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-063 — Watchdog

## Objective

新建 `packages/watchdog`：`WatchdogTrigger`（第 56 节 L3 封闭三值
集合：`RENDERER_CRASH`/`TWITCH_DISCONNECT`/
`RUNTIME_PROCESS_RESTART`）+ `decideWatchdogAction` 判断函数。
第 63 节本身零正文，DAG.md 备注为空，唯一权威范围来自第 56 节
L3"自动恢复"。`TWITCH_DISCONNECT` 已由 DEV-045 处理，返回
`ALREADY_HANDLED`；其余两个诚实返回 `NOT_YET_WIRED`（USER
2026-09-08 已裁决：L3 当作封闭集合写真实分支，不像 error-registry
的 category 那样开放）。零依赖，不接入 error-registry/
health-registry/platform-twitch。

## Allowed Scope

```
packages/watchdog/package.json            （新增）
packages/watchdog/tsconfig.json            （新增）
packages/watchdog/src/index.ts             （新增）
packages/watchdog/src/watchdog.ts            （新增）
packages/watchdog/src/watchdog.test.ts       （新增）
tsconfig.json                                （根，追加一条 references 条目）
specs/dev/DEV-063/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
（本节点不需要读取任何既有包源码作为实现依据）
```

## Forbidden Scope

```
修改除本节点 Writable Scope 之外的任何既有文件
import 或依赖 packages/error-registry、packages/health-registry、packages/platform-twitch、packages/runtime-kernel、packages/operator-api、packages/renderer 任何一个
新建任何 HTTP 端点或接入 packages/operator-api
实现任何真实的 Renderer 崩溃检测逻辑、进程重启/管理逻辑、或重新实现 Twitch 重连逻辑
新增第三方 npm 依赖
```

## Task Order

- [x] T001 节点文档
- [x] T002 watchdog 包 + 测试 + 根 tsconfig 引用 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T002（已完成，待 AUDITOR 验收）

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与
NODE_REPORT 消息文件已写入工作区但**未提交**；工作区不得残留任何
施工用临时文件。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
