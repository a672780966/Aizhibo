# DEV-022 INDEX

Status: IN_PROGRESS

## Current Node

DEV-022 — Character Renderer

## Objective

第二次对 `onSceneEnter` 发窄范围 CR，追加 `characters` 字段（角色站位解析：slot/表情
图片/可见性/微动画名）；`apps/renderer` 按固定五档 slot 定位渲染，套用通用呼吸类微动效果。

## Allowed Scope（runtime-kernel：CR + 新增 + 追加）

```
packages/runtime-kernel/src/machine.ts        （仅 2.2 节描述的 onSceneEnter 内新增两处，
                                                 其余含 DEV-021 遗留代码逐字节不变）
packages/runtime-kernel/src/characterResolution.ts   （新增）
packages/runtime-kernel/src/characterResolution.test.ts（新增）
packages/runtime-kernel/src/index.ts          （仅追加导出）
```

## Allowed Scope（apps/renderer：新增 + 仅追加）

```
apps/renderer/src/render/composeCharacters.ts
apps/renderer/src/render/composeCharacters.test.ts
apps/renderer/src/App.tsx   （追加角色渲染，不删除既有场景层/调试列表/HELLO 逻辑）
```

## Allowed Scope（节点文档与通信）

```
specs/dev/DEV-022/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

## Read-only Scope

```
packages/runtime-kernel/src/ 下除 machine.ts（唯一授权改动）/characterResolution.*（新增）/
  index.ts（仅追加）外的全部既有文件（含 visualResolution.ts/.test.ts、machine.test.ts——
  已核实无需修改，仍是 Read-only）
packages/runtime-kernel/package.json、tsconfig.json
packages/chapter-schema/**、packages/chapter-compiler/**（含 test-fixtures/**）、
  packages/rule-engine/**、packages/dice-engine/**、packages/narrative-composer/**、
  packages/persistence/**、packages/shared/**
apps/renderer/src/ws/**、apps/renderer/src/server/**、apps/renderer/src/main.tsx、
  apps/renderer/src/render/composeLayers.*、apps/renderer/package.json、tsconfig.json、
  vite.config.ts、index.html——DEV-020/021 冻结
根 tsconfig.json、tsconfig.base.json、vitest.config.ts、eslint.config.js、根 package.json
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
```

## Forbidden Scope

```
packages/* 除 runtime-kernel（限定文件）外的任何目录
apps/* 除 renderer（限定文件）外的任何目录
apps/renderer 内 DEV-020/021 冻结的文件（ws/server/main.tsx/composeLayers/配置文件）
对 machine.ts 中 onSceneEnter 以外任何 action/guard 的修改；对 onSceneEnter 内 DEV-021
  已有代码（scene/layers 计算、audio.send、storyMove 返回）的任何改动
任何根级配置文件的修改
真实的字幕（DEV-023）、选择 UI（DEV-024）、骰子 UI（DEV-025）、镜头/视差动画（DEV-026）
按具体动画名区分微动效果（无真实动画资产支撑，见 2.4 节已知简化）
新增任何 npm 依赖
```

## Task Order

- [x] T001 节点文档
- [x] T002 resolveCharacterPlacements
- [x] T003 machine.ts CR #2
- [x] T004 index.ts 追加导出
- [x] T005 composeCharacters
- [x] T006 App.tsx 角色渲染
- [x] T007 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T007 已完成。六条命令全部退出码 0（89 files / 465 tests），`git log` 新增恰 1 条提交
`DEV-022: character renderer`，`DECISIONS.md` 已入库，`REPORT.md` 完成且
Status = READY_FOR_REVIEW，已向 AUDITOR 发出 NODE_REPORT（消息 `0107`）。

## Exit Criteria

六条命令全部退出码 0；`machine.ts` 的 git diff 精确限定在 `onSceneEnter` 内新增两处，
DEV-021 遗留代码不变；端到端验证 `SCENE_ENTER` 命令含正确 `characters`；既有
`machine.test.ts` 零回归；`DECISIONS.md` 已入库；REPORT.md 完成且
Status = READY_FOR_REVIEW；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
