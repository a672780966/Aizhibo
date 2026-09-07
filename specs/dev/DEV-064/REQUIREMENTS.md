# DEV-064 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-064.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- 新建 `packages/platform-obs`：
  - `obsControlPort.ts`：`ObsScene`（第 49 节封闭六值）、
    `ObsSwitchResult`、`ObsControlPort`（`switchScene`/
    `getHealth`）、`noopObsControlPort`（本地 `Health` 镜像，同
    DEV-035/040/041 先例）。
  - `obsWebSocketClient.ts`：真实 OBS WebSocket v5 客户端——
    Hello（op0）/Identify（op1）/Identified（op2）握手，可选
    SHA256 双重哈希鉴权（`node:crypto`），Request（op6）/
    RequestResponse（op7）切场景请求关联；`createObsControlProvider`
    /`createOptionalObsControlProvider`。
- **不实现重连**：握手失败/断开后诚实失败，不重试。
- **不实现"何时该切场景"判断**：`switchScene` 只转发执行请求，
  决策权留给未来 DEV-065 SAFETY region（CR-020）。
- 生产代码零依赖（只用 `node:crypto` + 原生 `WebSocket`）；
  `ws`/`@types/ws` 仅测试依赖。

## Scope（Task Package 第 3 节）

Writable：见 `INDEX.md` Allowed Scope 逐条。

Forbidden（摘录）：不改除本节点外任何既有文件；不 import
error-registry/health-registry/watchdog/platform-twitch/
runtime-kernel/operator-api/renderer；不新增生产依赖；不实现
重连/决策逻辑/真实 SAFETY 状态机；不新建 HTTP 端点。

## Task Order

T001 节点文档 → T002 `obsControlPort.ts`（类型+noop）+ 包骨架 →
T003 `obsWebSocketClient.ts`（真实客户端）+ 假 OBS server 测试 +
全量验证 + REPORT + commit（**恰一条提交，LEDGER/NODE_REPORT
写入工作区但不提交，工作区不得残留任何施工用临时文件**）。
