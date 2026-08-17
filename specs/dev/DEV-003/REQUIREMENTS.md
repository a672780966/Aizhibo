# DEV-003 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-003.md` 抄录（Task Package 第 3/6/9/10
节），权威版本为 Task Package 原文。

## 3. Scope

### Writable Scope — 新增文件

```
packages/chapter-compiler/src/pass3GraphModel.ts
packages/chapter-compiler/src/pass3GraphModel.test.ts
packages/chapter-compiler/src/pass3Reachability.ts
packages/chapter-compiler/src/pass3Reachability.test.ts
packages/chapter-compiler/src/pass3Cycles.ts
packages/chapter-compiler/src/pass3Cycles.test.ts
packages/chapter-compiler/src/pass5ReachableState.ts
packages/chapter-compiler/src/pass5ReachableState.test.ts
packages/chapter-compiler/src/pass5Satisfiability.ts
packages/chapter-compiler/src/pass5Satisfiability.test.ts
packages/chapter-compiler/test-fixtures/graph-clean/**
packages/chapter-compiler/test-fixtures/graph-dead-end/**
packages/chapter-compiler/test-fixtures/graph-unreachable-scene/**
packages/chapter-compiler/test-fixtures/graph-unreachable-ending/**
packages/chapter-compiler/test-fixtures/graph-unreachable-boss/**
packages/chapter-compiler/test-fixtures/graph-trap-cycle/**
packages/chapter-compiler/test-fixtures/state-unsatisfiable-ending/**
packages/chapter-compiler/test-fixtures/state-unsatisfiable-recovery/**

specs/dev/DEV-003/INDEX.md
specs/dev/DEV-003/REQUIREMENTS.md
specs/dev/DEV-003/ACCEPTANCE.md
specs/dev/DEV-003/REPORT.md
specs/dev/DEV-003/DECISIONS.md      （仅在需要记录决策时创建）
specs/dev/DEV-003/BLOCKERS.md       （仅在出现 blocker 时创建）

specs/comms/LEDGER.md               （仅追加行）
specs/comms/NNNN-OPENCODE-to-*.md   （仅自己发出的消息）
```

### Writable Scope — 既有文件，仅允许追加式修改

```
packages/chapter-compiler/src/types.ts     （只许新增类型/接口，不得修改或删除现有导出）
packages/chapter-compiler/src/compile.ts   （只许新增 runPass3/runPass5 与扩展 CompileResult 新增字段，
                                             不得修改 runPass1/runPass2/loadChapterPack 的现有行为）
packages/chapter-compiler/src/compile.test.ts（只许新增测试用例，不得删除或修改 DEV-002 已有断言）
packages/chapter-compiler/src/index.ts     （只许新增 export，不得删除或重排现有 export）
packages/chapter-compiler/test-fixtures/README.md（仅追加新增 fixture 目录的说明，不改写已有条目）
```

### Read-only Scope — 本节点内被冻结、禁止触碰

```
packages/chapter-compiler/package.json
packages/chapter-compiler/tsconfig.json
packages/chapter-compiler/src/loader.ts、loader.test.ts
packages/chapter-compiler/src/pass1Schema.ts、pass1Schema.test.ts
packages/chapter-compiler/src/pass1Uniqueness.ts、pass1Uniqueness.test.ts
packages/chapter-compiler/src/referenceIndex.ts、referenceIndex.test.ts
packages/chapter-compiler/src/pass2StoryGraph.ts、pass2StoryGraph.test.ts
packages/chapter-compiler/src/pass2ActionChain.ts、pass2ActionChain.test.ts
packages/chapter-compiler/src/pass2NpcVisuals.ts、pass2NpcVisuals.test.ts
packages/chapter-compiler/src/pass2BossRecovery.ts、pass2BossRecovery.test.ts
packages/chapter-compiler/test-fixtures/valid-minimal/**
packages/chapter-compiler/test-fixtures/broken-*/**
packages/chapter-compiler/dist/**（构建产物，不手工修改）

packages/chapter-schema/**、packages/runtime-kernel/**、packages/shared/**（其它冻结包）
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts、根 tsconfig.json
```

### Forbidden Scope

```
packages/* 除 chapter-compiler 外的任何目录
apps/**、chapters/**、assets/**、scripts/**、tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration、任何网络调用代码
第三方图算法库（如 graphlib）——图规模小，手写 SCC/BFS 即可，见第 9 节
```

## 6. Outputs

1. `runPass3(schemaResult): Pass3Result`——可达节点集合、死路列表、不可达节点列表、不可达 Ending 列表、不可达 Boss 列表、陷阱环列表
2. `runPass5(schemaResult, pass3): Pass5Result`——可达 key/value 集合、不可满足 Ending 列表、不可满足 Recovery 规则列表
3. `compile()` 编排扩展：`CompileResult` 新增 `graphIssues`、`stateIssues` 字段，`passed` 判定同步纳入这两类
4. `index.ts` 导出全部新增类型与函数，供 DEV-002A 消费
5. 8 组新增测试 fixture（图缺陷类 6 组 + 状态不可满足类 2 组）
6. `specs/dev/DEV-003/` 四份（或五份）节点文档

## 9. Constraints

1. **零运行时求值逻辑**。PASS5 只做静态存在性/近似可满足性判断，不实现"给定一个具体 WorldState，Condition 现在是否成立"这类函数——那是 DEV-004 的职责。
2. **过近似原则贯穿全部判定**：不确定时一律倾向"判定为可能可达/可能可满足"，不得因为实现简单就收紧标准导致误杀合法内容。
3. **不引入第三方图算法库**。图规模是一个章节的场景数量级（几十到低百级），手写 BFS/Tarjan 完全够用，引入依赖是无谓成本。
4. **DEV-002 冻结文件逐字不变**——本任务包第 3 节列出的 Read-only 源文件与既有测试，`git diff` 必须为空。
5. **既有文件仅追加**——`types.ts`/`compile.ts`/`compile.test.ts`/`index.ts` 的既有代码行不得被编辑或删除，只能新增。
6. **Allowed Files 逐一真实改动**（协议附录 A 强约束）：T002–T008 列出的每个新文件都必须有实质内容，不得留空壳。
7. `CR-019`（getHealth 自落地起）不适用——`chapter-compiler` 全篇是纯批处理函数库。
8. Windows 环境：脚本 Git Bash / PowerShell 均可运行，路径用 `path.join`。
9. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`（`blocking: true`），继续其它不受影响 Task，等 `SCOPE_RULING`。

## 10. Non-goals / Out-of-scope

- 不实现 PASS 4（Rule Coverage）——DEV-006。
- 不实现 PASS 6（Hidden Information，`host.public.json` 白名单/时序/隔离性）——DEV-002A，但 DEV-002A **依赖本节点的输出**，接口需保持清晰可消费。
- 不实现 PASS 7（资产文件存在性）、PASS 8（仿真）。
- 不实现 Condition 的运行时求值函数、StateEffect 的运行时应用函数——DEV-004。
- 不做路径敏感的精确状态追踪（第 2 节已定过近似原则）。
- 不修改 DEV-002 的任何 PASS1/PASS2 源文件或既有测试断言。
- 不创建新包，不修改 `packages/chapter-schema`、`packages/runtime-kernel`、`packages/shared`。
- 不引入第三方图算法依赖。
- 不创建真实产品内容（`chapters/` 目录）。