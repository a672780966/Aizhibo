# DEV-008 INDEX

Status: DONE

## Current Node

DEV-008 — Runtime Event Model

## Objective

为 Runtime 统一事件信封（`RuntimeEvent`）与骰子事件族交付 Zod schema + 推导类型（纯类型，无生成逻辑、无事件总线、无持久化）。

## Allowed Scope

Writable（Task Package 第 3 节）：

```
packages/runtime-kernel/package.json
packages/runtime-kernel/tsconfig.json
packages/runtime-kernel/src/index.ts
packages/runtime-kernel/src/index.test.ts
packages/runtime-kernel/src/event.ts
packages/runtime-kernel/src/event.test.ts
packages/runtime-kernel/src/diceEvent.ts
packages/runtime-kernel/src/diceEvent.test.ts

specs/dev/DEV-008/INDEX.md
specs/dev/DEV-008/REQUIREMENTS.md
specs/dev/DEV-008/ACCEPTANCE.md
specs/dev/DEV-008/REPORT.md
specs/dev/DEV-008/DECISIONS.md      （仅在需要记录决策时创建）
specs/dev/DEV-008/BLOCKERS.md       （仅在出现 blocker 时创建）

tsconfig.json                       （根 tsconfig 的 references 追加一行指向 packages/runtime-kernel）

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
packages/chapter-schema/**          （DEV-001 冻结产物，本节点不引用它，仅明确列为只读防误改）
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts   （DEV-000 冻结基线，不修改）
specs/dev/DEV-000/**、specs/dev/DEV-001/**   （已 DONE 节点的节点文档与 VERDICT，冻结，不得修改）
.claude/**                          （Commander / AUDITOR 工具链目录，不得写入；构建/格式化命令作用范围须排除本目录，DEV-000 F-02 教训）
```

## Forbidden Scope

（Task Package 第 3 节）

```
packages/* 除 runtime-kernel 外的任何目录
apps/**
chapters/**
assets/**
scripts/**
tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration
任何网络调用代码
任何 XState 或其它状态机运行时依赖 / 代码
任何 PRNG / 随机数生成算法实现
```

## Task Order

- [x] T001 节点文档
- [x] T002 包脚手架
- [x] T003 RuntimeEvent 信封
- [x] T004 Dice 事件族
- [x] T005 桶导出
- [x] T006 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

无。DEV-008 已由 COMMANDER 裁决 PASS（消息 `0022`），接口冻结。

## Exit Criteria

`pnpm build` / `pnpm typecheck` / `pnpm lint` / `pnpm format:check` / `pnpm test` 五条命令全部退出码 0；
`RuntimeEvent` 信封与 Dice 事件族均有 schema + 正反例测试；
包内不存在任何生成/分发/持久化函数；
REPORT.md 完成且 Status = READY_FOR_REVIEW；
已向 AUDITOR 发出 NODE_REPORT；
commit 时点 `git status --porcelain` 干净（不计 LEDGER 与新消息文件）。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定（消息 `0022`：`DEV-002` 优先评估，`DEV-009` 另需 `DEV-006`/`DEV-033`）。

OpenCode 禁止自行推进下一 DEV Node。
