# DEV-063 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-063.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- 新建 `packages/watchdog`：`WatchdogTrigger`（`'RENDERER_CRASH'|
  'TWITCH_DISCONNECT'|'RUNTIME_PROCESS_RESTART'`，第 56 节 L3 封闭
  三值集合）、`WatchdogActionKind`（`'ALREADY_HANDLED'|
  'NOT_YET_WIRED'`）、`WatchdogDecision`、`decideWatchdogAction`。
- `TWITCH_DISCONNECT` → `ALREADY_HANDLED`（DEV-045 已实现自动
  重连，不重新实现）。
- `RENDERER_CRASH`/`RUNTIME_PROCESS_RESTART` → `NOT_YET_WIRED`
  （机制不存在，诚实占位，两者 `detail` 各自点名不同）。
- **L3 三个场景当作封闭集合**，与 error-registry 的 `category`
  开放文本不同——本节点自己的管辖边界，不是全仓库开放分类
  （USER 2026-09-08 裁决）。
- 零依赖：不 import `error-registry`/`health-registry`/
  `platform-twitch`/`runtime-kernel`/`operator-api`/`renderer`。

## Scope（Task Package 第 3 节）

Writable：见 `INDEX.md` Allowed Scope 逐条。

Forbidden（摘录）：不改除本节点外任何既有文件；不 import 上述
六个包任何一个；不新建 HTTP 端点；不实现任何真实崩溃检测/进程
重启/重连逻辑；不新增第三方依赖。

## Task Order

T001 节点文档 → T002 `watchdog` 包 + 测试 + 根 `tsconfig.json`
引用 + 全量验证 + REPORT + commit（**恰一条提交，LEDGER/NODE_REPORT
写入工作区但不提交，工作区不得残留任何施工用临时文件**）。
