# DEV-033 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-033 — Narrative Composer

## Objective

单条 ResultNarrative 的五槽位拼接 + 多条同时产生时的 PRIMARY/SUPPORT/CONTEXT/DEFERRED
分级。不使用语言模型，纯数据驱动拼接。

## Allowed Scope

```
packages/narrative-composer/package.json
packages/narrative-composer/tsconfig.json
packages/narrative-composer/src/index.ts
packages/narrative-composer/src/composeSingle.ts
packages/narrative-composer/src/composeSingle.test.ts
packages/narrative-composer/src/focus.ts
packages/narrative-composer/src/focus.test.ts
packages/narrative-composer/src/composeResultSet.ts
packages/narrative-composer/src/composeResultSet.test.ts

specs/dev/DEV-033/INDEX.md
specs/dev/DEV-033/REQUIREMENTS.md
specs/dev/DEV-033/ACCEPTANCE.md
specs/dev/DEV-033/REPORT.md
specs/dev/DEV-033/DECISIONS.md（本节点解释性设计决策最多的一次，几乎肯定要写，且要写得比以往详细）
specs/dev/DEV-033/BLOCKERS.md（仅在需要时创建）

根 tsconfig.json（追加一行 references 指向 packages/narrative-composer）
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

## Read-only Scope

```
packages/chapter-schema/**（含 narrative.ts、scene.ts、stateRules.ts、worldState.ts）
packages/rule-engine/**（消费其 evaluateCondition，不修改）
packages/chapter-compiler/**、packages/dice-engine/**、packages/runtime-kernel/**、packages/shared/**
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts
```

## Forbidden Scope

```
packages/* 除 narrative-composer 外的任何目录
apps/**、chapters/**、assets/**、scripts/**、tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration、任何网络调用代码、任何文件系统 IO
任何 LLM SDK、任何 NLP 库、任何"生成式"文本处理——本节点是纯拼接，不是生成
基于 NarrativeBlock.tone 做筛选/匹配的逻辑（无 SceneNode.tone 可比对，已核实）
```

## Task Order

- [x] T001 节点文档
- [x] T002 包脚手架
- [x] T003 单条叙事组装
- [x] T004 焦点分级
- [x] T005 顶层编排
- [x] T006 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

—（T001–T006 全部完成，节点 READY_FOR_REVIEW，已发 NODE_REPORT 给 AUDITOR）

## Exit Criteria

六条命令全部退出码 0；五槽位拼接与焦点分级的全部分支都有测试；`DECISIONS.md`
已入库且记录全部解释性决策；REPORT.md 完成且 Status = READY_FOR_REVIEW；已向
AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。