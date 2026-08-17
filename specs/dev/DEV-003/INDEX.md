# DEV-003 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-003 — Story Graph Analyzer（PASS 3 + PASS 5）

## Objective

在 chapter-compiler 内新增图可达性/死路/环检测（PASS3）与状态可达性/可满足性
分析（PASS5），保守过近似，不引入运行时求值逻辑。

## Allowed Scope（新增文件）

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

## Allowed Scope（既有文件，仅追加）

```
packages/chapter-compiler/src/types.ts     （只许新增类型/接口，不得修改或删除现有导出）
packages/chapter-compiler/src/compile.ts   （只许新增 runPass3/runPass5 与扩展 CompileResult 新增字段，
                                             不得修改 runPass1/runPass2/loadChapterPack 的现有行为）
packages/chapter-compiler/src/compile.test.ts（只许新增测试用例，不得删除或修改 DEV-002 已有断言）
packages/chapter-compiler/src/index.ts     （只许新增 export，不得删除或重排现有 export）
packages/chapter-compiler/test-fixtures/README.md（仅追加新增 fixture 目录的说明，不改写已有条目）
```

## Read-only Scope

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

## Forbidden Scope

```
packages/* 除 chapter-compiler 外的任何目录
apps/**、chapters/**、assets/**、scripts/**、tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration、任何网络调用代码
第三方图算法库（如 graphlib）——图规模小，手写 SCC/BFS 即可，见第 9 节
```

## Task Order

- [x] T001 节点文档
- [x] T002 故事图模型构建
- [x] T003 PASS 3：可达性 / 死路 / Ending 与 Boss 可达性
- [x] T004 PASS 3：陷阱环检测
- [x] T005 PASS 5：可达状态集合构建
- [x] T006 PASS 5：Ending / Recovery 可满足性
- [x] T007 compile() 编排扩展（BLK-003 经 SCOPE_RULING 0038 解除，A06 零回归恢复）
- [x] T008 测试 Fixture
- [x] T009 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

—（T001–T009 全部完成，节点 READY_FOR_REVIEW，已发 NODE_REPORT 消息 `0039` 给 AUDITOR）

## Exit Criteria

六条命令按序全部退出码 0；DEV-002 原有测试断言零回归；`graph-clean`/满足正例
fixture 令 compile() 返回 passed: true；六种图缺陷 + 两种状态不可满足 fixture
各自触发对应 issue 非空；REPORT.md 完成且 Status = READY_FOR_REVIEW；已向
AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。