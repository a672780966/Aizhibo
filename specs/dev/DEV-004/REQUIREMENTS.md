# DEV-004 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-004.md` 抄录（Task Package 第 3/6/9/10
节），权威版本为 Task Package 原文。

## 3. Scope

### Writable Scope

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

### Read-only Scope

```
packages/chapter-schema/**（全部，含 stateRules.ts、worldState.ts——本节点消费其类型，不修改）
packages/chapter-compiler/**、packages/runtime-kernel/**、packages/shared/**
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts
```

### Forbidden Scope

```
packages/* 除 rule-engine 外的任何目录
apps/**、chapters/**、assets/**、scripts/**、tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration、任何网络调用代码、任何文件系统 IO
Dice / Action / Result 相关任何逻辑（DEV-005 / DEV-006 的职责）
RuntimeEvent 的构造或发送（DEV-008 已冻结该类型，DEV-009 才负责在状态变化时发出事件）
```

## 6. Outputs

1. `resolveStatePath(state: WorldState, path: StatePath): unknown`——底层地址解析，供 T004/T005 共用
2. `evaluateCondition(condition: Condition, state: WorldState): boolean`
3. `applyEffect(effect: StateEffect, state: WorldState): WorldState`（不可变，返回新对象）
4. `applyStateRuleSet(ruleSet: StateRuleSet, state: WorldState, firedRuleIds: ReadonlySet<string>): { nextState: WorldState; newlyFiredRuleIds: string[] }`
5. `resolveGuard(guards: SceneGuard[], state: WorldState): string | undefined`
6. `specs/dev/DEV-004/` 节点文档

## 9. Constraints

1. **纯函数，零副作用**：不读写文件、不发网络请求、不打印到 stdout（测试断言之外）、不构造或发送 `RuntimeEvent`。
2. **不可变更新**：`applyEffect`/`writeStatePath` 绝不修改传入的 `state` 参数。
3. **防御性求值，不抛异常**：未定义的寻址组合、类型不匹配的比较，一律返回安全默认值（`undefined`/`false`/原样不变），不 `throw`——引擎面对已编译内容必须保持健壮。
4. **`once` 的记忆责任在调用方**：本包不持有任何跨调用的状态。
5. **不引入 `zod` 依赖**——本包不做数据校验，只做已类型化对象的求值，`chapter-schema` 已经保证了类型正确性。
6. `CR-019` 不适用——纯函数库，无运行时服务/健康状态概念（未来被 DEV-009 Kernel 调用，Kernel 本身才是有健康状态的模块）。
7. Windows 环境：脚本 Git Bash / PowerShell 均可运行。
8. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

## 10. Non-goals / Out-of-scope

- 不实现 Dice/Action/Result 相关任何逻辑（DEV-005/DEV-006）。
- 不构造、不发送 `RuntimeEvent`（DEV-008 类型已冻结，使用方是 DEV-009）。
- 不修改 `packages/chapter-schema` 的任何类型定义。
- 不实现"把 `newlyFiredRuleIds` 持久化进 `WorldState`"这个决定——那是调用方（DEV-009）的职责，本节点只把信息返回给调用方。
- 不创建真实产品内容，不做任何图/编译期分析（那些是 DEV-002/002A/003 已完成的）。
- 不引入任何异步逻辑。
