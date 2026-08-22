# DEV-025 INDEX

Status: DONE（接口冻结，`verdict_ref: "0124"`，`git_head` `4c2ed0a`）

## Current Node

DEV-025 — Dice UI（第二轮：DEV-025-FIX-01 已提交——依 `AUDIT_VERDICT` 消息 `0120`
BLOCKING-01 更正 `REQUIREMENTS.md` §2.2 与 `DECISIONS.md` D2 的安全论证措辞，不改源码）

## Objective

两处窄范围 CR：`onLock` 追加 `DICE_INTRO` 信号，`onResolve` 追加 `DICE_RESULT`（裁剪
后的展示字段）。`apps/renderer` 实现 INTRO（服务端信号）→ LOOP（本地循环动画，纯展示
过渡）→ RESOLVE（服务端真实结果）三阶段骰子 UI。真实节奏控制不在本节点（DEV-037）。

## Allowed Scope（runtime-kernel：两处 CR）

```
packages/runtime-kernel/src/machine.ts   （仅第 2.1/2.2 节描述的 onLock/onResolve 两处
                                            新增，其余全部 action 逐字节不变）
```

## Allowed Scope（apps/renderer：新增 + 仅追加）

```
apps/renderer/src/render/pickDiceState.ts
apps/renderer/src/render/pickDiceState.test.ts
apps/renderer/src/App.tsx   （追加 Dice UI 渲染，不删除既有场景层/角色/对话框/选项/
                               调试列表/HELLO 逻辑）
```

## Allowed Scope（节点文档与通信）

```
specs/dev/DEV-025/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加；0118 行开工标记 ISSUED→CLOSED 为唯一允许的原地位改）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

## Read-only Scope

```
packages/runtime-kernel/src/ 下除 machine.ts（唯一授权改动，仅限两处）外的全部既有文件
  （含 machine.test.ts、interactionRegion.*、visualResolution.*、characterResolution.*、
  choiceResolution.*、index.ts——本节点不新增导出，index.ts 不动）
packages/runtime-kernel/package.json、tsconfig.json
packages/chapter-schema/**、packages/chapter-compiler/**（含 test-fixtures/**）、
  packages/rule-engine/**、packages/dice-engine/**、packages/narrative-composer/**、
  packages/persistence/**、packages/shared/**
apps/renderer/src/ws/**、apps/renderer/src/server/**、apps/renderer/src/main.tsx、
  apps/renderer/src/render/composeLayers.*、composeCharacters.*、pickDialogueLines.*、
  lineIndex.*、pickInteractionOpen.*、apps/renderer/package.json、tsconfig.json、
  vite.config.ts、index.html——DEV-020/021/022/023/024 冻结
根 tsconfig.json、tsconfig.base.json、vitest.config.ts、eslint.config.js、根 package.json
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
```

## Forbidden Scope

```
packages/* 除 runtime-kernel（限定一处）外的任何目录
apps/* 除 renderer（限定文件）外的任何目录
apps/renderer 内 DEV-020～024 冻结的文件
对 machine.ts 中 onLock/onResolve 以外任何 action/guard 的修改（含 onSceneEnter/onOpen
  及历次 CR 遗留代码）
packages/runtime-kernel/src/index.ts 的任何修改（本节点无新增导出）
实现真实节奏控制/等待逻辑（DEV-037 的职责，见 Task Package 第 1 节说明）
任何根级配置文件的修改
新增任何 npm 依赖
```

## Task Order

- [x] T001 节点文档
- [x] T002 machine.ts CR（onLock + onResolve）
- [x] T003 pickDiceState
- [x] T004 App.tsx Dice UI 渲染
- [x] T005 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T005（全部 Task 已完成）。第一轮 `AUDITOR` 审计 `AUDIT_FAIL`（消息 0120，BLOCKING-01：
`REQUIREMENTS.md` §2.2/`DECISIONS.md` D2 安全论证事实有误，代码本身安全），`COMMANDER`
裁决 FAIL 并发 `FIX_PACKAGE DEV-025-FIX-01`（消息 0122）。FIX-01 完成后第二轮 `AUDITOR`
审计 `AUDIT_PASS`（消息 0124，FIX-A01/A02 全部 VERIFIED，0 BLOCKING），`COMMANDER` 裁决
PASS（消息 0125）。节点 `DONE`，接口冻结。

## Exit Criteria

六条命令全部退出码 0；`machine.ts` 的 git diff 精确限定在 `onLock`/`onResolve` 两处；
端到端验证 `DICE_INTRO`/`DICE_RESULT` 正确；既有 `machine.test.ts` 零回归；
`DECISIONS.md` 已入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；已向 AUDITOR 发出
NODE_REPORT。

## Next Node

DEV-026（Camera / Transition，仅 preset 键映射，不做镜头 DSL）。

OpenCode 禁止自行推进下一 DEV Node。