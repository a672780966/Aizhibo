# DEV-002 INDEX

Status: DONE

## Current Node

DEV-002 — Chapter Compiler Core（PASS 1 + PASS 2）

## Objective

把磁盘上的原始 Chapter Pack 读入内存，跑完 PASS 1（Schema）与 PASS 2（Reference），
产出结构化错误/成功报告。不含 Graph/Coverage/Hidden Information/Simulation。

## Allowed Scope

Writable（Task Package 第 3 节）：

```
packages/chapter-compiler/package.json
packages/chapter-compiler/tsconfig.json
packages/chapter-compiler/src/index.ts
packages/chapter-compiler/src/types.ts
packages/chapter-compiler/src/types.test.ts
packages/chapter-compiler/src/loader.ts
packages/chapter-compiler/src/loader.test.ts
packages/chapter-compiler/src/pass1Schema.ts
packages/chapter-compiler/src/pass1Schema.test.ts
packages/chapter-compiler/src/pass1Uniqueness.ts
packages/chapter-compiler/src/pass1Uniqueness.test.ts
packages/chapter-compiler/src/referenceIndex.ts
packages/chapter-compiler/src/referenceIndex.test.ts
packages/chapter-compiler/src/pass2StoryGraph.ts
packages/chapter-compiler/src/pass2StoryGraph.test.ts
packages/chapter-compiler/src/pass2ActionChain.ts
packages/chapter-compiler/src/pass2ActionChain.test.ts
packages/chapter-compiler/src/pass2NpcVisuals.ts
packages/chapter-compiler/src/pass2NpcVisuals.test.ts
packages/chapter-compiler/src/pass2BossRecovery.ts
packages/chapter-compiler/src/pass2BossRecovery.test.ts
packages/chapter-compiler/src/compile.ts
packages/chapter-compiler/src/compile.test.ts
packages/chapter-compiler/test-fixtures/**

specs/dev/DEV-002/INDEX.md
specs/dev/DEV-002/REQUIREMENTS.md
specs/dev/DEV-002/ACCEPTANCE.md
specs/dev/DEV-002/REPORT.md
specs/dev/DEV-002/DECISIONS.md      （仅在需要记录决策时创建）
specs/dev/DEV-002/BLOCKERS.md       （仅在出现 blocker 时创建）

tsconfig.json                       （追加一行 references 指向 packages/chapter-compiler）

specs/comms/LEDGER.md               （仅追加行）
specs/comms/NNNN-OPENCODE-to-*.md   （仅自己发出的消息）
```

## Read-only Scope

（Task Package 第 3 节）

```
specs/baseline/DEV_SPEC_V1.0.md
specs/audit/**
specs/protocol/**
specs/PROJECT_INDEX.md
specs/dev/DAG.md
specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
packages/shared/**           （冻结）
packages/chapter-schema/**   （DEV-001 冻结产物，只读引用，不修改）
packages/runtime-kernel/**   （DEV-008 冻结产物；本节点不依赖它，也不得修改）
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts
```

## Forbidden Scope

（Task Package 第 3 节）

```
packages/* 除 chapter-compiler 外的任何目录
apps/**
chapters/**    （真实内容目录，不得在此创建测试用途的示例章节；测试 fixture 一律放
                 packages/chapter-compiler/test-fixtures/）
assets/**
scripts/**
tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration
任何网络调用代码
```

## Task Order

- [x] T001 节点文档
- [x] T002 包脚手架
- [x] T003 Loader
- [x] T004 PASS 1：Schema 校验
- [x] T005 PASS 1：ID 唯一性
- [x] T006 引用索引
- [x] T007 PASS 2：故事图一致性
- [x] T008 PASS 2：Action / Dice / Result 链路
- [x] T009 PASS 2：NPC / Visuals 链路
- [x] T010 PASS 2：Boss 引用收尾
- [x] T011 compile() 编排
- [x] T012 测试 Fixture
- [x] T013 全量验证 + REPORT + commit + NODE_REPORT
- [x] FIX-T01 移除包级 tsconfig references + 修正验证记录（第二轮，READY_FOR_REVIEW）

## Current Task

FIX-T01（已完成，第二轮待 AUDITOR 审核）

## Exit Criteria

六条命令全部退出码 0；`valid-minimal` fixture 令 `compile()` 返回 `passed: true`；
综合损坏 fixture 令四类 issue 数组均非空；REPORT.md 完成且 Status = READY_FOR_REVIEW；
已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
