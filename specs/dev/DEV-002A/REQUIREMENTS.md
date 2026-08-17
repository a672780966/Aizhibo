# DEV-002A REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-002A.md` 抄录（Task Package 第 3/6/9/10
节），权威版本为 Task Package 原文。

## 3. Scope

### Writable Scope — 新增文件（`packages/chapter-compiler`）

```
packages/chapter-compiler/src/pass6Ancestors.ts
packages/chapter-compiler/src/pass6Ancestors.test.ts
packages/chapter-compiler/src/pass6Exhaustiveness.ts
packages/chapter-compiler/src/pass6Exhaustiveness.test.ts
packages/chapter-compiler/src/pass6Isolation.ts
packages/chapter-compiler/src/pass6Isolation.test.ts
packages/chapter-compiler/src/pass6Disclosure.ts
packages/chapter-compiler/src/pass6Disclosure.test.ts
packages/chapter-compiler/src/pass6ForbiddenLexicon.ts
packages/chapter-compiler/src/pass6ForbiddenLexicon.test.ts
packages/chapter-compiler/test-fixtures/host-exhaustive-missing-flag/**
packages/chapter-compiler/test-fixtures/host-scene-not-covered/**
packages/chapter-compiler/test-fixtures/host-isolation-leak/**
packages/chapter-compiler/test-fixtures/host-fact-undeclared/**
packages/chapter-compiler/test-fixtures/host-fact-future-leak/**
packages/chapter-compiler/test-fixtures/host-clean/**（若确认 `valid-minimal` 已满足全部四条判定，可省略，改为在测试中直接复用 `valid-minimal`）
```

### Writable Scope — 既有文件，仅允许追加式修改

```
packages/chapter-schema/src/hostPublic.ts       （唯一允许的字段新增：SceneDisclosure 追加
                                                  knownFactDependencies?: Record<string, string[]>）
packages/chapter-schema/src/hostPublic.test.ts  （追加针对新字段的测试，不改既有断言）
packages/chapter-schema/src/index.ts            （若因新增导出需要，只许追加 export）
packages/chapter-compiler/src/types.ts          （追加 HiddenInfoIssue / HiddenInfoIssueCategory /
                                                  ForbiddenLexicon 类型）
packages/chapter-compiler/src/compile.ts        （追加 runPass6，扩展 CompileResult 新增字段）
packages/chapter-compiler/src/compile.test.ts   （追加测试用例）
packages/chapter-compiler/src/index.ts          （追加 export）
packages/chapter-compiler/test-fixtures/README.md（仅追加新增目录说明）

specs/dev/DEV-002A/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md
specs/dev/DEV-002A/DECISIONS.md（仅在需要时创建）
specs/dev/DEV-002A/BLOCKERS.md（仅在需要时创建）
specs/comms/LEDGER.md（仅追加行）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/chapter-schema/src/ 除 hostPublic.ts、hostPublic.test.ts、index.ts 外的全部 17 个模块
packages/chapter-compiler/src/loader.ts、pass1Schema.ts、pass1Uniqueness.ts、referenceIndex.ts、
  pass2StoryGraph.ts、pass2ActionChain.ts、pass2NpcVisuals.ts、pass2BossRecovery.ts、
  pass3GraphModel.ts、pass3Reachability.ts、pass3Cycles.ts、
  pass5ReachableState.ts、pass5Satisfiability.ts（及各自 .test.ts）
packages/chapter-compiler/test-fixtures/valid-minimal/**、broken-*/**、graph-*/**、state-*/**
packages/chapter-compiler/package.json、tsconfig.json
packages/runtime-kernel/**、packages/shared/**
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts、根 tsconfig.json
```

### Forbidden Scope

```
packages/* 除 chapter-schema、chapter-compiler 外的任何目录
apps/**、chapters/**、assets/**、scripts/**、tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration、任何网络调用代码
对 knownFactIds 关联文本做全文扫描/自然语言处理——本节点只处理结构化标题/名称
  （EndingNode.title、BossNode.displayName 之类），不解析 NarrativeBlock 正文
```

## 6. Outputs

1. `packages/chapter-schema` 的 `SceneDisclosure` 新增可选字段 `knownFactDependencies`
2. `runPass6(schemaResult, pass3): Pass6Result`——四条判定的 Finding 列表 + `ForbiddenLexicon`
3. `compile()` 扩展：`CompileResult` 新增 `hiddenInfoIssues` 字段，纳入 `passed` 判定
4. `index.ts` 导出全部新增类型与函数，供 DEV-050（Public State Gateway）与 DEV-050A（Host Egress Gate，M5）未来消费
5. 5 组新增测试 fixture（每条判定失败模式各一组）
6. `specs/dev/DEV-002A/` 节点文档

## 9. Constraints

1. **默认拒绝原则**：任何依赖关系未声明、任何判定条件不满足，一律判定为不安全（BLOCKING），不得因"看起来大概率安全"而放行。这与 DEV-003 的默认放行原则刻意相反，理由见第 2 节。
2. **不做全文本扫描**：`ForbiddenLexicon` 只取材于结构化标题/名称字段，不解析叙事正文。
3. **`hostPublic.ts` 只新增一个字段**，不改动、不删除任何既有字段。
4. **DEV-000/001/002/003 冻结文件逐字不变**（本任务包 Read-only Scope 列出的全部文件，`git diff` 必须为空）。
5. **既有文件仅追加**（`hostPublic.ts`、`compile.ts`、`compile.test.ts`、`index.ts` 等，只加行不改已有行）。
6. **Allowed Files 逐一真实改动**（协议附录 A 强约束）。
7. `CR-019` 不适用——纯批处理函数库。
8. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

## 10. Non-goals / Out-of-scope

- 不实现 DEV-050 Public State Gateway（运行时读投影）或 DEV-050A Host Egress Gate（运行时写词表匹配/DROP 判定）——本节点只产出数据，不实现消费方。
- 不做叙事正文的全文扫描/NLP。
- 不修改 `chapter-schema` 除 `hostPublic.ts` 外任何模块。
- 不实现 PASS 4（DEV-006）、PASS 7（DEV-075）、PASS 8（DEV-007，已完成）。
- 不创建真实产品内容。
- 不引入任何 LLM/NLP 依赖。
