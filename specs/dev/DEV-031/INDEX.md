# DEV-031 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-031 — Master Audio Player

## Objective

把 DEV-030 冻结的 `resolveAudioSource` 四级解析链接入 Runtime 中唯一已经端到端
产出真实叙事文本的路径——Result 叙事（`onResolve` 计算 + `onResultPlaying` 下发）。
新增 `Ports.audioResolution`（追加式）、`resolveResultAudio` 纯函数、Renderer 端
`pickResultAudio` 与一次性播放的 `<audio>` 元素。当前默认 Port 仍全部"不可用"，
如实产出 `SUBTITLE_ONLY`——这是正确的当前行为。

## Allowed Scope

```
packages/runtime-kernel/package.json                         （追加一行 dependency）
packages/runtime-kernel/tsconfig.json                        （追加一行 reference）
packages/runtime-kernel/src/ports.ts                          （追加 audioResolution 字段）
packages/runtime-kernel/src/ports.test.ts                     （更新断言）
packages/runtime-kernel/src/resultAudioResolution.ts          （新增）
packages/runtime-kernel/src/resultAudioResolution.test.ts     （新增）
packages/runtime-kernel/src/machine.ts                        （仅 onResolve + onResultPlaying 两处）
packages/runtime-kernel/src/machine.test.ts                   （追加集成测试）
packages/runtime-kernel/src/index.ts                          （追加导出）
apps/renderer/src/render/pickResultAudio.ts                   （新增）
apps/renderer/src/render/pickResultAudio.test.ts              （新增）
apps/renderer/src/App.tsx                                     （仅追加渲染）
specs/dev/DEV-031/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

## Read-only Scope

```
packages/audio-engine/**（已冻结，不得改动 resolveAudioSource 本身）
packages/chapter-schema/**、packages/chapter-compiler/**、packages/rule-engine/**、
  packages/dice-engine/**、packages/narrative-composer/**、packages/persistence/**、
  packages/shared/**
packages/runtime-kernel/src 内除 Allowed Scope 列出文件外的一切
apps/renderer/src 内除 pickResultAudio.ts(.test.ts)/App.tsx 外的一切
eslint.config.js、.prettierrc.json、vitest.config.ts、根 package.json、tsconfig.base.json、根 tsconfig.json
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
```

## Forbidden Scope

```
修改 packages/audio-engine/** 任何文件
修改 machine.ts 中 onResolve / onResultPlaying 之外的任何 action
接入 AUDIO region（audioRegion.ts）/ Ports.audio（DEV-032 的职责）
实现 Chapter Intro / Boss / Ending 类 Master Audio 的叙事选择与发射逻辑
实现真实 TTS 调用、真实缓存查找、真实预生成目录扫描
实现逐句/多角色配音
新增除 audio-engine 外的任何 npm 依赖
新建 getHealth()
```

## Task Order

- [x] T001 节点文档
- [x] T002 runtime-kernel 依赖声明 + Ports 追加字段
- [x] T003 resolveResultAudio
- [x] T004 machine.ts 两处 CR + 集成测试
- [x] T005 index.ts 导出 + Renderer pickResultAudio + App.tsx
- [x] T006 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001–T006 全部完成

## Exit Criteria

六条命令全部退出码 0；`resolveResultAudio` 全部路径测试通过；机器级集成测试证明
默认与注入两种场景均正确；`DECISIONS.md` 已入库；REPORT.md 完成且 Status =
READY_FOR_REVIEW；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
