# DEV-061 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-061.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- 新建 `packages/health-registry`：`HealthSource`（`name` +
  `getHealth(): Health | Promise<Health>`）、`AggregateStatus`、
  `AggregateHealth`（`overall` + `sources`）、`HealthRegistry`
  （`register`/`getAggregateHealth`）、`createHealthRegistry()`。
- 聚合规则：最差状态优先（`DOWN > DEGRADED > OK`）；空 registry
  默认 `overall: 'OK'`。
- 同名 `register` 覆盖式替换。
- **不硬编码接入**仓库里已有的 6 个真实 `getHealth` 来源
  （persistence/host-memory/platform-twitch/ai-host）——没有真实
  生产入口进程可供装配，同 DEV-060A 的现实约束。
- **不新建任何 HTTP 端点**。
- 零业务耦合：只 `import type { Health } from
  '@interactive-story/shared'`。

## Scope（Task Package 第 3 节）

Writable：见 `INDEX.md` Allowed Scope 逐条。

Forbidden（摘录）：不改 `shared`/`persistence`/`host-memory`/
`platform-twitch`/`ai-host`/`operator-api`/`platform-core`/
`runtime-kernel`/`renderer`；不硬编码接入真实 `getHealth` 来源；
不新建 HTTP 端点；不新增第三方依赖。

## Task Order

T001 节点文档 → T002 `health-registry` 包 + 测试 + 根 `tsconfig.json`
引用 + 全量验证 + REPORT + commit（**恰一条提交，LEDGER/NODE_REPORT
写入工作区但不提交**）。
