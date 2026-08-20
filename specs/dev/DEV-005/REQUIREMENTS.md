# DEV-005 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-005.md` 抄录（Task Package 第 3/6/9/10
节），权威版本为 Task Package 原文。

## 3. Scope

### Writable Scope

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
specs/dev/DEV-005/DECISIONS.md（**本节点含多条设计决策，几乎必须创建，不要留空**）
specs/dev/DEV-005/BLOCKERS.md（仅在需要时创建）

tsconfig.json（追加一行 references 指向 packages/dice-engine）
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/chapter-schema/**（含 dice.ts、result.ts、stateRules.ts、worldState.ts）
packages/rule-engine/**（消费其 evaluateCondition，不修改）
packages/chapter-compiler/**、packages/runtime-kernel/**、packages/shared/**
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts
```

### Forbidden Scope

```
packages/* 除 dice-engine 外的任何目录
apps/**、chapters/**、assets/**、scripts/**、tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration、任何网络调用代码、任何文件系统 IO
`Math.random()`、`crypto.randomBytes`、任何非确定性随机源——**这是第 8 节的红线，
  违反即 BLOCKING，无论测试是否通过**
RuntimeEvent 的构造或发送（DEV-008 已冻结该类型；DEV-009 才在状态变化时发出事件）
Action/Result 相关任何逻辑（DEV-006 的职责，本节点只管骰子本身）
```

## 6. Outputs

1. `rollDice(profile: DiceProfile, seed: string, rollIndex: number, state: WorldState): DiceRollResult`
2. `resolveQuality(profile: DiceProfile, finalValue: number): Quality | undefined`
3. `specs/dev/DEV-005/` 节点文档，含至少一份 `DECISIONS.md`（记录本节点的确定性哈希方案、骰子记法解析规则、阈值覆盖缺口的处置）

## 9. Constraints

1. **零随机源**：不得出现 `Math.random()`、`crypto.randomBytes`、`Date.now()` 参与取值计算等任何非确定性输入。**这是唯一一条"即使测试全过也判 BLOCKING"的红线**。
2. **纯函数，零副作用**：不读写文件、不发网络请求、不构造 `RuntimeEvent`。
3. **无隐藏状态**：不得用类实例、模块级可变变量等方式让"调用第 N 次"和"调用第 1 次"产生不同结果——所有影响输出的因素必须是显式参数。
4. **防御性求值**：解析失败、阈值缺口等情形返回安全默认值，不抛异常。
5. **不引入第三方哈希/随机数库**。
6. `CR-019` 不适用——纯函数库。
7. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

## 10. Non-goals / Out-of-scope

- 不实现 Action/Result 相关任何逻辑（DEV-006）。
- 不构造、不发送 `RuntimeEvent`，不决定 `DICE.ROLLED`/`DICE.PUBLISHED` 的触发时机（DEV-009）。
- 不修改 `packages/chapter-schema`、`packages/rule-engine`、`packages/runtime-kernel` 的任何既有内容。
- 不新增"骰子数值分区完整性"的编译期校验（已知缺口，如实记录，不在本节点解决）。
- 不追求密码学级别的随机性或统计学模偏修正。
- 不创建真实产品内容。