# DEV-028 INDEX

Status: DONE（接口冻结，`verdict_ref: "0136"`，`git_head` `ebf4b1d`）

## Current Node

DEV-028 — Presentation Command Bus

## Objective

补齐 CR-012 明确要求、此前从未被测过的三个属性：真实断线重连走同一条代码路径、
同连接连续 RESYNC 请求的幂等性、多客户端广播分发一致性。序号分配（DEV-012）与
传输分发本身（DEV-020）均已实现，本节点**不新增任何生产代码**，只补测试。

## Allowed Scope（仅测试文件，无生产代码新增）

```
apps/renderer/src/server/wsServer.test.ts         （仅追加新的 it(...) 用例，不改动
                                                     既有两个用例）
packages/runtime-kernel/src/presentationCommand.test.ts  （仅追加新的 it(...) 用例，
                                                     不改动既有四个用例）
```

## Allowed Scope（节点文档与通信）

```
specs/dev/DEV-028/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加；0134 行开工标记 ISSUED→CLOSED 为唯一允许的原地位改）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

## Read-only Scope

```
packages/runtime-kernel/src/**（除 presentationCommand.test.ts 仅追加外，含
  presentationCommand.ts 本体、machine.ts、ports.ts、index.ts 等全部既有文件）
apps/renderer/src/**（除 wsServer.test.ts 仅追加外，含 wsServer.ts 本体、App.tsx、
  client.ts、全部 render/*.ts 等既有文件）
packages/chapter-schema/**、packages/chapter-compiler/**（含 test-fixtures/**）、
  packages/rule-engine/**、packages/dice-engine/**、packages/narrative-composer/**、
  packages/persistence/**、packages/shared/**
根 tsconfig.json、tsconfig.base.json、vitest.config.ts、eslint.config.js、根 package.json
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
```

## Forbidden Scope

```
对任何生产代码文件的修改（wsServer.ts/presentationCommand.ts/machine.ts/App.tsx/
  ports.ts/index.ts 等）——发现 bug 时走 EXECUTOR_QUERY，不擅自修
对既有测试用例（wsServer.test.ts 现有 2 个、presentationCommand.test.ts 现有 4 个
  it 块）的任何修改
packages/* 下任何目录的修改
新增任何 npm 依赖
新建任何生产代码文件
```

## Task Order

- [x] T001 节点文档
- [x] T002 真实断线重连测试
- [x] T003 同连接幂等性测试
- [x] T004 多客户端分发一致性测试
- [x] T005 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T005（全部 Task 已完成）。`AUDITOR` 独立审计 `AUDIT_PASS`（消息 0136，A01–A17 全部
VERIFIED/PASS，0 BLOCKING），`COMMANDER` 裁决 PASS（消息 0137）。节点 `DONE`，接口
冻结。**M2 — Presentation Complete 全部完成。**

## Exit Criteria

六条命令全部退出码 0；三个新场景测试全部通过；既有全部测试零回归；未新增任何生产
代码；`DECISIONS.md` 已入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；已向
AUDITOR 发出 NODE_REPORT。

## Next Node

M2 全部完成。下一步排期（M3 音频优先，或与 M4 交叉安排）留待 `USER` 指示或
`COMMANDER` 下一轮起草时决定。

OpenCode 禁止自行推进下一 DEV Node。
