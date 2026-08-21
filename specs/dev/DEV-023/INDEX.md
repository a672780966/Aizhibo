# DEV-023 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-023 — Subtitle / Dialogue

## Objective

第三次对 `onSceneEnter` 发窄范围 CR，追加 `narration` 字段（场景旁白，纯字符串数组，无需
跨文件解析）；`apps/renderer` 实现场景旁白与结算叙事共用的点击推进对话框，用 `commandSeq`
决定显示来源。不做"读完才能继续"的门控。

## Allowed Scope（runtime-kernel：CR）

```
packages/runtime-kernel/src/machine.ts   （仅 Task Package 2.1 节描述的 onSceneEnter 内新增一行，
                                            其余内容——含前两次 CR 遗留代码——逐字节不变）
```

## Allowed Scope（apps/renderer：新增 + 仅追加）

```
apps/renderer/src/render/pickDialogueLines.ts
apps/renderer/src/render/pickDialogueLines.test.ts
apps/renderer/src/render/lineIndex.ts
apps/renderer/src/render/lineIndex.test.ts
apps/renderer/src/App.tsx   （追加对话框渲染，不删除既有场景层/角色/调试列表/HELLO 逻辑）
```

## Allowed Scope（节点文档与通信）

```
specs/dev/DEV-023/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

## Read-only Scope

```
packages/runtime-kernel/src/ 下除 machine.ts（唯一授权改动）外的全部既有文件（含
  machine.test.ts、visualResolution.*、characterResolution.*、index.ts——本节点不需要
  新增导出，index.ts 也不动）
packages/runtime-kernel/package.json、tsconfig.json
packages/chapter-schema/**、packages/chapter-compiler/**（含 test-fixtures/**）、
  packages/rule-engine/**、packages/dice-engine/**、packages/narrative-composer/**、
  packages/persistence/**、packages/shared/**
apps/renderer/src/ws/**、apps/renderer/src/server/**、apps/renderer/src/main.tsx、
  apps/renderer/src/render/composeLayers.*、composeCharacters.*、
  apps/renderer/package.json、tsconfig.json、vite.config.ts、index.html——DEV-020/021/022 冻结
根 tsconfig.json、tsconfig.base.json、vitest.config.ts、eslint.config.js、根 package.json
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
```

## Forbidden Scope

```
packages/* 除 runtime-kernel（限定一处）外的任何目录
apps/* 除 renderer（限定文件）外的任何目录
apps/renderer 内 DEV-020/021/022 冻结的文件
对 machine.ts 中 onSceneEnter 以外任何 action/guard 的修改；对 onSceneEnter 内既有代码
  （scene/layers/characters 计算、audio.send、storyMove 返回）的任何改动
packages/runtime-kernel/src/index.ts 的任何修改（本节点无新增导出）
任何根级配置文件的修改
新增任何"读完才能继续"的门控机制或新 RootEvent（见 Task Package 2.2 节已知边界）
真实的选择 UI（DEV-024）、骰子 UI（DEV-025）、镜头/视差动画（DEV-026）
新增任何 npm 依赖
```

## Task Order

- [x] T001 节点文档
- [x] T002 machine.ts CR #3
- [x] T003 pickDialogueLines
- [x] T004 clampLineIndex/nextLineIndex
- [x] T005 App.tsx 对话框渲染
- [x] T006 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001–T006 全部完成（每完成一个 Task 立即勾选并更新本字段）。

## Exit Criteria

六条命令全部退出码 0；`machine.ts` 的 git diff 精确限定在一行新增；端到端验证 `SCENE_ENTER`
含正确 `narration`；既有 `machine.test.ts` 零回归；`DECISIONS.md` 已入库；REPORT.md 完成且
Status = READY_FOR_REVIEW；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
