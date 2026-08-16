# DEV-001 INDEX

Status: IN_PROGRESS

## Current Node

DEV-001 — Chapter Schema

## Objective

为 Chapter Pack 全部内容文件类型交付 Zod schema + 推导类型（纯数据形状，无引用校验、无求值逻辑、无图分析）。

## Allowed Scope

Writable（Task Package 第 3 节）：

```
packages/chapter-schema/package.json
packages/chapter-schema/tsconfig.json
packages/chapter-schema/src/index.ts
packages/chapter-schema/src/manifest.ts
packages/chapter-schema/src/manifest.test.ts
packages/chapter-schema/src/worldState.ts
packages/chapter-schema/src/worldState.test.ts
packages/chapter-schema/src/stateRules.ts
packages/chapter-schema/src/stateRules.test.ts
packages/chapter-schema/src/scene.ts
packages/chapter-schema/src/scene.test.ts
packages/chapter-schema/src/interaction.ts
packages/chapter-schema/src/interaction.test.ts
packages/chapter-schema/src/action.ts
packages/chapter-schema/src/dice.ts
packages/chapter-schema/src/action.test.ts
packages/chapter-schema/src/dice.test.ts
packages/chapter-schema/src/result.ts
packages/chapter-schema/src/result.test.ts
packages/chapter-schema/src/narrative.ts
packages/chapter-schema/src/narrative.test.ts
packages/chapter-schema/src/npc.ts
packages/chapter-schema/src/npc.test.ts
packages/chapter-schema/src/visuals.ts
packages/chapter-schema/src/visuals.test.ts
packages/chapter-schema/src/audio.ts
packages/chapter-schema/src/audio.test.ts
packages/chapter-schema/src/boss.ts
packages/chapter-schema/src/boss.test.ts
packages/chapter-schema/src/endings.ts
packages/chapter-schema/src/endings.test.ts
packages/chapter-schema/src/recovery.ts
packages/chapter-schema/src/recovery.test.ts
packages/chapter-schema/src/hostPublic.ts
packages/chapter-schema/src/hostPublic.test.ts
packages/chapter-schema/src/metadata.ts
packages/chapter-schema/src/metadata.test.ts
packages/chapter-schema/src/chapterPack.ts
packages/chapter-schema/src/chapterPack.test.ts

specs/dev/DEV-001/INDEX.md
specs/dev/DEV-001/REQUIREMENTS.md
specs/dev/DEV-001/ACCEPTANCE.md
specs/dev/DEV-001/REPORT.md
specs/dev/DEV-001/DECISIONS.md      （仅在需要记录决策时创建）
specs/dev/DEV-001/BLOCKERS.md       （仅在出现 blocker 时创建）

tsconfig.json                       （根 tsconfig 的 references 追加一行指向 packages/chapter-schema）

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
packages/shared/**                  （DEV-000 冻结产物，只读引用，不修改）
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts   （DEV-000 冻结基线，不修改）
```

## Forbidden Scope

（Task Package 第 3 节）

```
packages/* 除 chapter-schema 外的任何目录
apps/**
chapters/**
assets/**
scripts/**
tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration
任何网络调用代码
```

## Task Order

- [ ] T001 节点文档
- [ ] T002 包脚手架
- [ ] T003 Manifest / StoryGraph / WorldRules
- [ ] T004 WorldState / NPCState / DangerState
- [ ] T005 State Rules（Condition / StateEffect / SceneGuard）
- [ ] T006 Scene
- [ ] T007 Interaction / Choice
- [ ] T008 Action / Dice
- [ ] T009 Result Dictionary
- [ ] T010 Narrative
- [ ] T011 NPC
- [ ] T012 Visuals
- [ ] T013 Audio
- [ ] T014 Boss
- [ ] T015 Endings
- [ ] T016 Recovery
- [ ] T017 Host Public
- [ ] T018 Metadata
- [ ] T019 ChapterPack 聚合 + 桶导出
- [ ] T020 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001

## Exit Criteria

`pnpm build` / `pnpm typecheck` / `pnpm lint` / `pnpm format:check` / `pnpm test` 五条命令全部退出码 0；
19 个内容分类全部有 schema + 正反例测试；
`chapterPack.ts` 聚合导出完整；
包内不存在任何求值/编译/加载函数；
REPORT.md 完成且 Status = READY_FOR_REVIEW；
已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
