# DEV-006 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-006.md` 抄录（Task Package 第 3/6/9/10
节），权威版本为 Task Package 原文。

## 3. Scope

### Writable Scope — `packages/rule-engine`（新增文件）

```
packages/rule-engine/src/actionScale.ts
packages/rule-engine/src/actionScale.test.ts
packages/rule-engine/src/actionResolve.ts
packages/rule-engine/src/actionResolve.test.ts
```

### Writable Scope — `packages/rule-engine`（既有文件，仅追加）

```
packages/rule-engine/package.json（仅追加一行 dependencies: @interactive-story/dice-engine）
packages/rule-engine/tsconfig.json（仅追加 references 指向 ../dice-engine）
packages/rule-engine/src/index.ts（仅追加 export）
```

### Writable Scope — `packages/chapter-compiler`（新增文件）

```
packages/chapter-compiler/src/pass4RuleCoverage.ts
packages/chapter-compiler/src/pass4RuleCoverage.test.ts
packages/chapter-compiler/test-fixtures/coverage-gap/**
packages/chapter-compiler/test-fixtures/coverage-clean/**（若确认某既有 fixture 已满足，可省略改为直接复用）
```

### Writable Scope — `packages/chapter-compiler`（既有文件，仅追加）

```
packages/chapter-compiler/src/types.ts
packages/chapter-compiler/src/compile.ts
packages/chapter-compiler/src/compile.test.ts
packages/chapter-compiler/src/index.ts
packages/chapter-compiler/test-fixtures/README.md（仅追加条目）
```

### Writable Scope — 节点文档与通信（同既有惯例）

```
specs/dev/DEV-006/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md
specs/dev/DEV-006/DECISIONS.md（本节点有多条设计决策，几乎必须创建）
specs/dev/DEV-006/BLOCKERS.md（仅在需要时创建）
根 tsconfig.json（本节点两个目标包均已在 references 中，通常不需要改动；若发现缺失才追加）
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

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

### Forbidden Scope

```
packages/* 除 rule-engine、chapter-compiler 外的任何目录
apps/**、chapters/**、assets/**、scripts/**、tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration、任何网络调用代码、任何文件系统 IO（rule-engine 侧）
调用 dice-engine 的 rollDice/resolveQuality 等函数（本节点只消费其类型，不调用其函数）
RuntimeEvent 的构造或发送
实际应用 worldEffects/playerEffects（只返回，不执行——那是 Kernel 的职责）
Narrative 文本拼装（DEV-033）
```

## 6. Outputs

### `packages/rule-engine`

1. `resolveScale(participantCount: number, bands: ScaleBand[]): ActionScale`
2. `type ResolveInput`、`type ResolveResult`（第 9 节原文形状，`playerStateSummary` 字段的处置见 T004 的 Decision 要求）
3. `resolveAction(input: ResolveInput, action: ActionDefinition, resultDict: ResultDictionary): ResolveResult | undefined`

### `packages/chapter-compiler`

4. `checkRuleCoverage(schemaResult, pass3: Pass3Result): RuleCoverageIssue[]`
5. `compile()` 扩展：`CompileResult` 新增 `ruleCoverageIssues` 字段

### 文档

6. `specs/dev/DEV-006/` 节点文档，含 `DECISIONS.md`（记录 `playerStateSummary` 省略的理由、`worldState` 保留但未被读取的理由、mapsTo 单跳限制的处置）

## 9. Constraints

1. **不调用 `dice-engine` 的任何函数**（`rollDice`/`resolveQuality`/`resolveModifiers` 等）——只 import 其类型（`DiceRollResult`）。骰子已经掷好，本节点只消费结果。
2. **不实际应用效果**——`resolveAction` 只返回 `worldEffects`/`playerEffects`，不调用 `applyEffect`，不修改任何 `WorldState`。
3. **`mapsTo` 只跟一跳**，多跳或指向非法目标一律返回 `undefined`，不递归、不抛异常。
4. **PASS4 只检查可达内容**，不对不可达 Action 报告覆盖缺口（那是死内容，不是 bug）。
5. **既有文件仅追加**——两个目标包被列为"仅追加"的文件，`git diff` 只能是新增行。
6. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
7. `CR-019` 不适用——两侧都是纯函数/静态分析库。
8. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

## 10. Non-goals / Out-of-scope

- 不实现骰子随机数逻辑（DEV-005 已完成）。
- 不实现效果的实际应用（DEV-004 的 `applyEffect` 已提供，调用时机是 Kernel 的职责，DEV-006 不调用）。
- 不实现 Narrative 文本拼装（DEV-033）。
- 不实现 PASS7/PASS8。
- 不检查"摸不到的 quality 被误标为完整结果"这类死内容（非 bug，范围外）。
- 不修改 `packages/chapter-schema`、`packages/dice-engine`、`packages/runtime-kernel`、`packages/shared`。
- 不新建包。