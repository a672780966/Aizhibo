# DEV-027 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-027 — BGM / SFX

## Objective

第五次对 `onSceneEnter` 发窄范围 CR（仅 Presentation `send`），追加 `audio` 字段
（场景级 BGM + 环境音，解析自 `AudioAsset`）。**不碰既有的 `Ports.audio`**——真正的
声道仲裁传输留给 DEV-032（M3）。`apps/renderer` 用 `<audio>` 标签播放，BGM/环境音
默认循环。不实现事件触发型 SFX（无 schema/信号支撑）。

## Allowed Scope（runtime-kernel：CR + 新增 + 追加）

```
packages/runtime-kernel/src/machine.ts        （仅第 2.1 节描述的 onSceneEnter 内新增
                                                 一行，其余内容——含历次 CR 遗留代码、
                                                 紧随其后的 audio.send 调用——逐字节不变）
packages/runtime-kernel/src/audioResolution.ts       （新增）
packages/runtime-kernel/src/audioResolution.test.ts  （新增）
packages/runtime-kernel/src/index.ts          （仅追加导出）
```

## Allowed Scope（apps/renderer：新增 + 仅追加）

```
apps/renderer/src/render/pickSceneAudio.ts
apps/renderer/src/render/pickSceneAudio.test.ts
apps/renderer/src/App.tsx   （追加 <audio> 元素渲染，不删除既有场景层/角色/对话框/
                               选项/骰子/镜头转场/调试列表/HELLO 逻辑）
```

## Allowed Scope（节点文档与通信）

```
specs/dev/DEV-027/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加；0130 行开工标记 ISSUED→CLOSED 为唯一允许的原地位改）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

## Read-only Scope

```
packages/runtime-kernel/src/ 下除 machine.ts（唯一授权改动）/audioResolution.*（新增）/
  index.ts（仅追加）外的全部既有文件（含 machine.test.ts、visualResolution.*、
  characterResolution.*、choiceResolution.*、cameraResolution.*、interactionRegion.*、
  audioRegion.*、ports.ts——本节点不改 `Ports.audio` 任何接口/实现）
packages/runtime-kernel/package.json、tsconfig.json
packages/chapter-schema/**、packages/chapter-compiler/**（含 test-fixtures/**）、
  packages/rule-engine/**、packages/dice-engine/**、packages/narrative-composer/**、
  packages/persistence/**、packages/shared/**
apps/renderer/src/ws/**、apps/renderer/src/server/**、apps/renderer/src/main.tsx、
  apps/renderer/src/render/composeLayers.*、composeCharacters.*、pickDialogueLines.*、
  lineIndex.*、pickInteractionOpen.*、pickDiceState.*、cameraPreset.*、pickSceneMeta.*、
  apps/renderer/package.json、tsconfig.json、vite.config.ts、index.html——DEV-020～026 冻结
根 tsconfig.json、tsconfig.base.json、vitest.config.ts、eslint.config.js、根 package.json
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
```

## Forbidden Scope

```
packages/* 除 runtime-kernel（限定文件）外的任何目录
apps/* 除 renderer（限定文件）外的任何目录
apps/renderer 内 DEV-020～026 冻结的文件
对 machine.ts 中 onSceneEnter 以外任何 action/guard 的修改；对 onSceneEnter 内既有代码
  （含 context.ports.audio.send(...) 那一行）的任何改动
packages/runtime-kernel/src/ports.ts/audioRegion.ts 的任何修改（不给 Ports.audio 新建
  传输）
给 apps/renderer 新建独立的 Audio WebSocket 通道/服务端半
实现事件触发型 SFX（骰子音效等）
任何根级配置文件的修改
新增任何 npm 依赖
```

## Task Order

- [x] T001 节点文档
- [x] T002 resolveSceneAudio
- [x] T003 machine.ts CR
- [x] T004 index.ts 追加导出
- [x] T005 pickSceneAudio
- [x] T006 App.tsx 音频渲染
- [x] T007 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T007（全部 Task 已完成，NODE_REPORT 已发出）

## Exit Criteria

六条命令全部退出码 0；`machine.ts` 的 git diff 精确限定在一行新增；端到端验证
`SCENE_ENTER` 含正确 `audio`；既有 `machine.test.ts` 零回归；`DECISIONS.md` 已入库；
REPORT.md 完成且 Status = READY_FOR_REVIEW；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定——**PASS 后 M2 只剩 DEV-028
（Presentation Command Bus）**。

OpenCode 禁止自行推进下一 DEV Node。