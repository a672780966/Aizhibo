# DEV-005 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-005 — Dice Engine

## Objective

确定性骰子摸点、修正计算、等级判定。纯函数，不用有状态 PRNG，不用 Math.random()，
不构造 RuntimeEvent。

## Allowed Scope

```
packages/dice-engine/package.json
packages/dice-engine/tsconfig.json
packages/dice-engine/src/index.ts
packages/dice-engine/src/hash.ts
packages/dice-engine/src/hash.test.ts
packages/dice-engine/src/diceNotation.ts
packages/dice-engine/src/diceNotation.test.ts
packages/dice-engine/src/roll.ts
packages/dice-engine/src/roll.test.ts
packages/dice-engine/src/modifiers.ts
packages/dice-engine/src/modifiers.test.ts
packages/dice-engine/src/quality.ts
packages/dice-engine/src/quality.test.ts

specs/dev/DEV-005/INDEX.md
specs/dev/DEV-005/REQUIREMENTS.md
specs/dev/DEV-005/ACCEPTANCE.md
specs/dev/DEV-005/REPORT.md
specs/dev/DEV-005/DECISIONS.md（本节点含多条设计决策，几乎必须创建，不要留空）
specs/dev/DEV-005/BLOCKERS.md（仅在需要时创建）

tsconfig.json（追加一行 references 指向 packages/dice-engine）
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

## Read-only Scope

```
packages/chapter-schema/**（含 dice.ts、result.ts、stateRules.ts、worldState.ts）
packages/rule-engine/**（消费其 evaluateCondition，不修改）
packages/chapter-compiler/**、packages/runtime-kernel/**、packages/shared/**
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts
```

## Forbidden Scope

```
packages/* 除 dice-engine 外的任何目录
apps/**、chapters/**、assets/**、scripts/**、tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration、任何网络调用代码、任何文件系统 IO
`Math.random()`、`crypto.randomBytes`、任何非确定性随机源——这是第 8 节的红线，
  违反即 BLOCKING，无论测试是否通过
RuntimeEvent 的构造或发送（DEV-008 已冻结该类型；DEV-009 才在状态变化时发出事件）
Action/Result 相关任何逻辑（DEV-006 的职责，本节点只管骰子本身）
```

## Task Order

- [x] T001 节点文档
- [x] T002 包脚手架
- [x] T003 确定性哈希
- [x] T004 骰子记法解析
- [x] T005 骰子摸点
- [x] T006 Modifier 求值
- [x] T007 Quality 解析 + rollDice 编排
- [x] T008 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

—（T001–T008 全部完成，节点 READY_FOR_REVIEW，已发 NODE_REPORT 给 AUDITOR）

## Exit Criteria

六条命令全部退出码 0；`rollDice` 对同一输入确定性重现；包内无 `Math.random()`；
`DECISIONS.md` 已随最终提交入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；
已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。