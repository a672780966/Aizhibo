# DEV-004 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-004 — State Rule Engine

## Objective

实现 Condition/StateEffect/StateRuleSet/SceneGuard 的运行时求值，纯函数，
不可变更新，不做 IO，不发 Event。

## Allowed Scope

```
packages/rule-engine/package.json
packages/rule-engine/tsconfig.json
packages/rule-engine/src/index.ts
packages/rule-engine/src/statePath.ts
packages/rule-engine/src/statePath.test.ts
packages/rule-engine/src/condition.ts
packages/rule-engine/src/condition.test.ts
packages/rule-engine/src/effect.ts
packages/rule-engine/src/effect.test.ts
packages/rule-engine/src/ruleSet.ts
packages/rule-engine/src/ruleSet.test.ts
packages/rule-engine/src/guard.ts
packages/rule-engine/src/guard.test.ts

specs/dev/DEV-004/INDEX.md
specs/dev/DEV-004/REQUIREMENTS.md
specs/dev/DEV-004/ACCEPTANCE.md
specs/dev/DEV-004/REPORT.md
specs/dev/DEV-004/DECISIONS.md（仅在需要时创建）
specs/dev/DEV-004/BLOCKERS.md（仅在需要时创建）

tsconfig.json（追加一行 references 指向 packages/rule-engine）
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

## Read-only Scope

```
packages/chapter-schema/**（全部，含 stateRules.ts、worldState.ts——本节点消费其类型，不修改）
packages/chapter-compiler/**、packages/runtime-kernel/**、packages/shared/**
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts
```

## Forbidden Scope

```
packages/* 除 rule-engine 外的任何目录
apps/**、chapters/**、assets/**、scripts/**、tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration、任何网络调用代码、任何文件系统 IO
Dice / Action / Result 相关任何逻辑（DEV-005 / DEV-006 的职责）
RuntimeEvent 的构造或发送（DEV-008 已冻结该类型，DEV-009 才负责在状态变化时发出事件）
```

## Task Order

- [x] T001 节点文档
- [x] T002 包脚手架
- [x] T003 StatePath 地址解析
- [x] T004 Condition 求值
- [x] T005 StateEffect 应用
- [x] T006 StateRuleSet 求值（含 once 语义）
- [x] T007 SceneGuard 解析
- [x] T008 全量验证 + REPORT + commit + NODE_REPORT
- [x] FIX-T01 提交 `DECISIONS.md`（DEV-004-FIX-01，消除 REPORT 引用断链）

## Current Task

—（T001–T008 全部完成 + FIX-T01 完成，节点 READY_FOR_REVIEW，已发第二轮 NODE_REPORT 给 AUDITOR）

## Exit Criteria

六条命令全部退出码 0；五类函数各自的正反例全部通过；`applyEffect` 的不可变性
在每个 op 上都有验证；REPORT.md 完成且 Status = READY_FOR_REVIEW；已向 AUDITOR
发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。