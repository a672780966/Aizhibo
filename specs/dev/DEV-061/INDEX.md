# DEV-061 INDEX

Status: IN_PROGRESS

## Current Node

DEV-061 — Health System

## Objective

新建 `packages/health-registry`：通用 `HealthSource`/
`HealthRegistry` 聚合原语，`getAggregateHealth()` 用"最差状态
优先"规则把多个来源的 `Health`（第 57 节，DEV-000 冻结）聚合成
一个整体视图。Dev Spec 第 61 节本身零正文，唯一权威范围来自
`specs/dev/DAG.md` 第 399 行"采集聚合"——本节点不硬编码接入仓库
里已有的 6 个真实 `getHealth` 来源（没有真实生产入口进程可供
装配），不新建任何 HTTP 端点。

## Allowed Scope

```
packages/health-registry/package.json            （新增）
packages/health-registry/tsconfig.json            （新增）
packages/health-registry/src/index.ts             （新增）
packages/health-registry/src/healthRegistry.ts       （新增）
packages/health-registry/src/healthRegistry.test.ts  （新增）
tsconfig.json                                       （根，追加一条 references 条目）
specs/dev/DEV-061/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
packages/shared/src/health.ts（只 import type Health，不修改）
packages/persistence/**、packages/host-memory/**、packages/platform-twitch/**、packages/ai-host/**、packages/operator-api/**（Read-only，不 import）
```

## Forbidden Scope

```
修改 packages/shared/** 的任何文件
修改 packages/persistence/**、packages/host-memory/**、packages/platform-twitch/**、packages/ai-host/**、packages/operator-api/**、packages/platform-core/**、packages/runtime-kernel/**、packages/renderer/**
把任何真实 getHealth 来源硬编码接入本节点
新建任何 HTTP 端点或接入 operator-api
新增第三方 npm 依赖
```

## Task Order

- [ ] T001 节点文档
- [ ] T002 health-registry 包 + 测试 + 根 tsconfig 引用 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与
NODE_REPORT 消息文件已写入工作区但**未提交**。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
