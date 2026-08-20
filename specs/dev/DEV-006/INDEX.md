# DEV-006 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-006 — Action Resolution Engine（PASS 4）

## Objective

rule-engine 追加参与规模判定与 Action Resolution 编排；chapter-compiler 追加 PASS4
Rule Coverage 检查。两包均为追加式扩展，不新建包。

## Allowed Scope（rule-engine 新增文件）

```
packages/rule-engine/src/actionScale.ts
packages/rule-engine/src/actionScale.test.ts
packages/rule-engine/src/actionResolve.ts
packages/rule-engine/src/actionResolve.test.ts
```

## Allowed Scope（rule-engine 既有文件，仅追加）

```
packages/rule-engine/package.json（仅追加 dependencies: @interactive-story/dice-engine）
packages/rule-engine/tsconfig.json（仅追加 references 指向 ../dice-engine）
packages/rule-engine/src/index.ts（仅追加 export）
```

## Allowed Scope（chapter-compiler 新增文件）

```
packages/chapter-compiler/src/pass4RuleCoverage.ts
packages/chapter-compiler/src/pass4RuleCoverage.test.ts
packages/chapter-compiler/test-fixtures/coverage-gap/**
packages/chapter-compiler/test-fixtures/coverage-clean/**（若确认某既有 fixture 已满足，可省略改为直接复用）
```

## Allowed Scope（chapter-compiler 既有文件，仅追加）

```
packages/chapter-compiler/src/types.ts
packages/chapter-compiler/src/compile.ts
packages/chapter-compiler/src/compile.test.ts
packages/chapter-compiler/src/index.ts
packages/chapter-compiler/test-fixtures/README.md（仅追加条目）
```

## Read-only Scope

```
packages/rule-engine/src/statePath.ts、condition.ts、effect.ts、ruleSet.ts、guard.ts（及其 .test.ts）
packages/chapter-compiler/src/loader.ts、pass1Schema.ts、pass1Uniqueness.ts、referenceIndex.ts、
  pass2*.ts、pass3*.ts、pass5*.ts、pass6*.ts（及其 .test.ts）
packages/chapter-compiler/test-fixtures/valid-minimal/**、broken-*/**、graph-*/**、state-*/**、host-*/**
packages/dice-engine/**（全部，只读消费其 DiceRollResult 类型，不修改）
packages/chapter-schema/**、packages/runtime-kernel/**、packages/shared/**
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts
```

## Forbidden Scope

```
packages/* 除 rule-engine、chapter-compiler 外的任何目录
apps/**、chapters/**、assets/**、scripts/**、tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration、任何网络调用代码、任何文件系统 IO（rule-engine 侧）
调用 dice-engine 的 rollDice/resolveQuality 等函数（只消费其类型，不调用其函数）
RuntimeEvent 的构造或发送
实际应用 worldEffects/playerEffects（只返回，不执行）
Narrative 文本拼装（DEV-033）
```

## Task Order

- [x] T001 节点文档
- [x] T002 rule-engine 依赖追加（`0062` 裁决：豁免，deps 恰为 `{chapter-schema}`，不加 dice-engine）
- [x] T003 参与规模判定
- [x] T004 Action Resolution 编排
- [x] T005 PASS 4：Rule Coverage 判定
- [x] T006 compile() 编排扩展
- [x] T007 PASS4 测试 Fixture（coverage-gap 新建，coverage-clean 复用 graph-clean）
- [x] T008 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

—（T001–T008 全部完成（含 SCOPE_RULING 0062 处置），节点 READY_FOR_REVIEW，已发 NODE_REPORT 给 AUDITOR）

## Exit Criteria

六条命令全部退出码 0；`resolveAction` 四种分支行为正确；PASS4 正确检出覆盖缺口且
不误报；`DECISIONS.md` 已随提交入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；
已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。