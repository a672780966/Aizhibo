# DEV-009 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-009 — XState Runtime Kernel

## Objective

建立根 XState 机器，STORY/INTERACTION 完整实现并串联前九个节点的全部纯函数包，
PRESENTATION/AUDIO 为骨架，HOST/PLATFORM/SAFETY 为占位。IO 边界全部走可替换 Port。

## Allowed Scope（新增文件）

```
packages/runtime-kernel/src/ports.ts
packages/runtime-kernel/src/ports.test.ts
packages/runtime-kernel/src/snapshot.ts
packages/runtime-kernel/src/snapshot.test.ts
packages/runtime-kernel/src/storyRegion.ts
packages/runtime-kernel/src/storyRegion.test.ts
packages/runtime-kernel/src/interactionRegion.ts
packages/runtime-kernel/src/interactionRegion.test.ts
packages/runtime-kernel/src/presentationRegion.ts
packages/runtime-kernel/src/presentationRegion.test.ts
packages/runtime-kernel/src/audioRegion.ts
packages/runtime-kernel/src/audioRegion.test.ts
packages/runtime-kernel/src/placeholderRegions.ts
packages/runtime-kernel/src/placeholderRegions.test.ts
packages/runtime-kernel/src/machine.ts
packages/runtime-kernel/src/machine.test.ts
```

## Allowed Scope（既有文件，仅追加）

```
packages/runtime-kernel/package.json（追加 xstate 与五个内部包 dependencies）
packages/runtime-kernel/tsconfig.json（追加 references）
packages/runtime-kernel/src/index.ts（追加 export，遵守不透明类型原则，不导出内部 snapshot 结构）
```

## Read-only Scope

```
packages/runtime-kernel/src/event.ts、diceEvent.ts（及其 .test.ts）——DEV-008 冻结，不改
packages/chapter-schema/**、packages/chapter-compiler/**、packages/rule-engine/**、
  packages/dice-engine/**、packages/narrative-composer/**、packages/shared/**
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts
```

## Forbidden Scope

```
packages/* 除 runtime-kernel 外的任何目录
apps/**、chapters/**、assets/**、scripts/**、tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration、任何真实网络调用
Math.random()、裸 Date.now()（必须经 ClockPort）
真实的 Renderer/Audio/Twitch/AI Host 接入代码（M2/M3/M4/M5 均未建）
SQLite 或任何持久化实现（DEV-010）
Replay 校验逻辑（DEV-011）
对外 HTTP/IPC API（DEV-012）
`index.ts` 导出内部 snapshot 结构类型（违反不透明类型原则）
```

## Task Order

- [x] T001 节点文档
- [x] T002 依赖追加
- [x] T003 IO Port 接口
- [x] T004 不透明 Snapshot 与访问器
- [x] T005 STORY Region
- [x] T006 INTERACTION Region
- [x] T007 PRESENTATION / AUDIO Region 骨架
- [x] T008 HOST / PLATFORM / SAFETY 占位 Region
- [x] T009 根机器组装
- [x] T010 Event Log 累积（改动并入 T009 同批）
- [x] T011 全量验证 + REPORT + commit + NODE_REPORT
- [x] FIX-T01 收窄 Snapshot 公开类型面（F-01 / A08）
- [x] FIX-T02 STORY guard 分支接入 + ERROR 路径测试（F-02 / A10）
- [x] FIX-T03 多 ActionGroup 并存测试（F-03 / A11）
- [x] FIX-T04 AUDIO 状态可达性测试（F-04 / A12）

## Current Task

—（T001–T011 + FIX-T01–T04 全部完成，节点 READY_FOR_REVIEW，已发第二轮 NODE_REPORT 给 AUDITOR）

## Exit Criteria

六条命令全部退出码 0；一次完整"加载→场景→互动→投票→解算→叙事"链路可跑通并产出
单调递增的 Event Log；`index.ts` 不导出内部 snapshot 结构；`DECISIONS.md` 已入库
且覆盖全部架构决策；REPORT.md 完成且 Status = READY_FOR_REVIEW；已向 AUDITOR
发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。