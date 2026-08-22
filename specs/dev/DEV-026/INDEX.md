# DEV-026 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-026 — Camera / Transition

## Objective

第四次对 `onSceneEnter` 发窄范围 CR，追加 `cameraPreset` 字段（纯字符串键，不做镜头
DSL）；`apps/renderer` 用内置映射表把 preset 转成 CSS `transform`，场景切换时统一套用
一种淡入过渡（React `key` 触发重挂载，不新增过渡状态机）。转场不是章节可配置数据，不
新增 schema 字段。

## Allowed Scope（runtime-kernel：CR + 新增 + 追加）

```
packages/runtime-kernel/src/machine.ts        （仅第 2.1 节描述的 onSceneEnter 内新增
                                                 一行，其余内容——含历次 CR 遗留代码——
                                                 逐字节不变）
packages/runtime-kernel/src/cameraResolution.ts       （新增）
packages/runtime-kernel/src/cameraResolution.test.ts  （新增）
packages/runtime-kernel/src/index.ts          （仅追加导出）
```

## Allowed Scope（apps/renderer：新增 + 仅追加）

```
apps/renderer/src/render/cameraPreset.ts
apps/renderer/src/render/cameraPreset.test.ts
apps/renderer/src/render/pickSceneMeta.ts
apps/renderer/src/render/pickSceneMeta.test.ts
apps/renderer/src/App.tsx   （追加 key/camera transform/fadeIn 动画，不删除既有场景层/
                               角色/对话框/选项/骰子/调试列表/HELLO 逻辑）
```

## Allowed Scope（节点文档与通信）

```
specs/dev/DEV-026/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加；0126 行开工标记 ISSUED→CLOSED 为唯一允许的原地位改）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

## Read-only Scope

```
packages/runtime-kernel/src/ 下除 machine.ts（唯一授权改动）/cameraResolution.*（新增）/
  index.ts（仅追加）外的全部既有文件（含 machine.test.ts、visualResolution.*、
  characterResolution.*、choiceResolution.*、interactionRegion.*——本节点不改任何既有
  文件的既有内容）
packages/runtime-kernel/package.json、tsconfig.json
packages/chapter-schema/**、packages/chapter-compiler/**（含 test-fixtures/**）、
  packages/rule-engine/**、packages/dice-engine/**、packages/narrative-composer/**、
  packages/persistence/**、packages/shared/**
apps/renderer/src/ws/**、apps/renderer/src/server/**、apps/renderer/src/main.tsx、
  apps/renderer/src/render/composeLayers.*、composeCharacters.*、pickDialogueLines.*、
  lineIndex.*、pickInteractionOpen.*、pickDiceState.*、apps/renderer/package.json、
  tsconfig.json、vite.config.ts、index.html——DEV-020～025 冻结
根 tsconfig.json、tsconfig.base.json、vitest.config.ts、eslint.config.js、根 package.json
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
```

## Forbidden Scope

```
packages/* 除 runtime-kernel（限定文件）外的任何目录
apps/* 除 renderer（限定文件）外的任何目录
apps/renderer 内 DEV-020～025 冻结的文件
对 machine.ts 中 onSceneEnter 以外任何 action/guard 的修改；对 onSceneEnter 内既有代码
  （scene/layers/characters/narration 计算、audio.send、storyMove 返回）的任何改动
对 resolveVisualLayers（DEV-021 冻结）的任何修改（不得往它身上加 cameraPreset 返回值）
新增任何"镜头 DSL"/动态参数系统
新增任何"转场预设"schema 字段
任何根级配置文件的修改
新增任何 npm 依赖
```

## Task Order

- [x] T001 节点文档
- [x] T002 resolveCameraPreset
- [x] T003 machine.ts CR
- [x] T004 index.ts 追加导出
- [x] T005 cameraPreset.ts + pickSceneMeta.ts
- [x] T006 App.tsx 镜头/转场渲染
- [x] T007 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T007（全部 Task 已完成，NODE_REPORT 已发出）

## Exit Criteria

六条命令全部退出码 0；`machine.ts` 的 git diff 精确限定在一行新增；端到端验证
`SCENE_ENTER` 含正确 `cameraPreset`；既有 `machine.test.ts` 零回归；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。