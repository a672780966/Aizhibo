# DEV-021 INDEX

Status: IN_PROGRESS

## Current Node

DEV-021 — Scene Renderer

## Objective

给已冻结的 `onSceneEnter` action 发一次窄范围 CR，丰富 `SCENE_ENTER` 命令载荷为真实的
`visualSceneId`+`layers`（解析自编译产物，不在 Renderer 侧读章节文件）；`apps/renderer`
按 `z` 排序渲染这些层。不做真实图片加载、角色/字幕/选择/骰子渲染。

## Allowed Scope（runtime-kernel：CR + 新增 + 追加）

```
packages/runtime-kernel/src/machine.ts        （仅 onSceneEnter 一处内部改动，
                                                 其余内容逐字节不变）
packages/runtime-kernel/src/visualResolution.ts   （新增）
packages/runtime-kernel/src/visualResolution.test.ts（新增）
packages/runtime-kernel/src/index.ts          （仅追加导出）
```

## Allowed Scope（apps/renderer：新增 + 仅追加）

```
apps/renderer/src/render/composeLayers.ts
apps/renderer/src/render/composeLayers.test.ts
apps/renderer/src/App.tsx   （追加场景层渲染，不删除既有调试列表/HELLO 逻辑）
```

## Allowed Scope（节点文档与通信）

```
specs/dev/DEV-021/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

## Read-only Scope

```
packages/runtime-kernel/src/ 下除 machine.ts（唯一授权改动）/visualResolution.*（新增）/
  index.ts（仅追加）外的全部既有文件（含 machine.test.ts——已核实无需修改，仍是 Read-only）
packages/runtime-kernel/package.json、tsconfig.json
packages/chapter-schema/**、packages/chapter-compiler/**（含 test-fixtures/**）、
  packages/rule-engine/**、packages/dice-engine/**、packages/narrative-composer/**、
  packages/persistence/**、packages/shared/**
apps/renderer/src/ws/**、apps/renderer/src/server/**、apps/renderer/src/main.tsx、
  apps/renderer/package.json、tsconfig.json、vite.config.ts、index.html——DEV-020 冻结
根 tsconfig.json、tsconfig.base.json、vitest.config.ts、eslint.config.js、根 package.json
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
```

## Forbidden Scope

```
packages/* 除 runtime-kernel（限定文件）外的任何目录
apps/* 除 renderer（限定文件）外的任何目录
apps/renderer 内 DEV-020 冻结的 ws/server/main.tsx/配置文件
对 machine.ts 中 onSceneEnter 以外任何 action/guard 的修改
任何根级配置文件的修改
真实的角色渲染（DEV-022）、字幕（DEV-023）、选择 UI（DEV-024）、骰子 UI（DEV-025）、
  镜头/视差动画（DEV-026）
真实静态资源服务器/CDN 接入
新增任何 npm 依赖
```

## Task Order

- [x] T001 节点文档
- [x] T002 resolveVisualLayers
- [x] T003 machine.ts CR
- [x] T004 index.ts 追加导出
- [x] T005 composeLayers
- [x] T006 App.tsx 场景层渲染
- [x] T007 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T007 已完成。节点转 `READY_FOR_REVIEW`，已向 `AUDITOR` 发出 `NODE_REPORT`（消息 `0103`，
`git_head` 见 REPORT.md）。

## Exit Criteria

六条命令全部退出码 0；`machine.ts` 的 git diff 精确限定在 `onSceneEnter` 一处；端到端
`valid-minimal` 验证 `SCENE_ENTER` 命令含正确 `visualSceneId`/`layers`；既有
`machine.test.ts` 零回归；`DECISIONS.md` 已入库；REPORT.md 完成且
Status = READY_FOR_REVIEW；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。