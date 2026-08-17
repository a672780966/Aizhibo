# DEV-002A INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-002A — Hidden Information Validator（PASS 6）

## Objective

补齐 host.public.json 的穷举性/白名单/时序性/隔离性四条判定，交付 ForbiddenLexicon
产物。默认拒绝原则（不确定就不安全，与 DEV-003 的默认放行原则相反）。

## Allowed Scope（新增文件）

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
packages/chapter-compiler/test-fixtures/host-clean/**（若确认 valid-minimal 已满足全部四条判定，可省略）

specs/dev/DEV-002A/INDEX.md
specs/dev/DEV-002A/REQUIREMENTS.md
specs/dev/DEV-002A/ACCEPTANCE.md
specs/dev/DEV-002A/REPORT.md
specs/dev/DEV-002A/DECISIONS.md（仅在需要时创建）
specs/dev/DEV-002A/BLOCKERS.md（仅在需要时创建）
specs/comms/LEDGER.md（仅追加行）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

## Allowed Scope（既有文件，仅追加）

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
```

## Read-only Scope

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

## Forbidden Scope

```
packages/* 除 chapter-schema、chapter-compiler 外的任何目录
apps/**、chapters/**、assets/**、scripts/**、tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration、任何网络调用代码
对 knownFactIds 关联文本做全文扫描/自然语言处理——本节点只处理结构化标题/名称
  （EndingNode.title、BossNode.displayName 之类），不解析 NarrativeBlock 正文
```

## Task Order

- [x] T001 节点文档
- [x] T002 HostPublicSpec 结构扩展
- [x] T003 祖先集合计算
- [x] T004 PASS 6：穷举性 + 场景覆盖
- [x] T005 PASS 6：隔离性
- [x] T006 PASS 6：白名单 + 时序性
- [x] T007 ForbiddenLexicon 构建
- [x] T008 compile() 编排扩展（BLK-004 经 SCOPE_RULING 0044 解除，遗留断言零回归恢复）
- [x] T009 测试 Fixture
- [x] T010 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

—（T001–T010 全部完成，节点 READY_FOR_REVIEW，已发 NODE_REPORT 消息 `0045` 给 AUDITOR）

## Exit Criteria

六条命令全部退出码 0；DEV-000/001/002/003 遗留测试零回归；四条判定各自的失败
fixture 均触发对应 Finding；`ForbiddenLexicon` 对 valid-minimal 产出合理结构；
REPORT.md 完成且 Status = READY_FOR_REVIEW；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。