# DEV-007 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-007 — Chapter Simulator（PASS 8 — Simulation）

## Objective

在已冻结的 `runtime-kernel` 上追加 headless 驱动器：复用 DEV-009 的同一个 Runtime
statechart，只替换 platform/clock 两个 IO 边界为虚拟实现，跑通“加载→随机选择→解算→转场→重复”的完整循环，产出确定性可复现的 `SimulationReport`。

## Allowed Scope（新增文件）

```
packages/runtime-kernel/src/virtualPorts.ts
packages/runtime-kernel/src/virtualPorts.test.ts
packages/runtime-kernel/src/simulatorVotes.ts
packages/runtime-kernel/src/simulatorVotes.test.ts
packages/runtime-kernel/src/simulator.ts
packages/runtime-kernel/src/simulator.test.ts
```

## Allowed Scope（既有文件，仅追加）

```
packages/runtime-kernel/src/machine.ts
packages/runtime-kernel/src/index.ts
```

## Read-only Scope

```
packages/runtime-kernel/src/storyRegion.ts
packages/runtime-kernel/src/interactionRegion.ts
packages/runtime-kernel/src/presentationRegion.ts
packages/runtime-kernel/src/audioRegion.ts
packages/runtime-kernel/src/placeholderRegions.ts
packages/runtime-kernel/src/ports.ts
packages/runtime-kernel/src/snapshot.ts
packages/runtime-kernel/src/event.ts
packages/runtime-kernel/src/diceEvent.ts
packages/chapter-compiler/test-fixtures/valid-minimal
specs/PROJECT_INDEX.md
specs/dev/DAG.md
specs/tasks/**
specs/audit/**
specs/protocol/**
```

## Forbidden Scope

```
chapters/**
apps/**
真实 Renderer/Audio/Twitch/AI Host 接入
Math.random()、裸 Date.now()
CLI、独立包、Replay/Fuzz/Soak 实现
修复 PlatformPort.onVote 未接线缺口
```

## Task Order

- [x] T001 节点文档
- [x] T002 getCurrentChoiceIds 访问器
- [x] T003 虚拟 Port
- [x] T004 确定性投票生成器
- [x] T005 驱动主循环 runSimulation
- [x] T006 Public exports
- [x] T007 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

—（T001–T007 全部完成，节点 READY_FOR_REVIEW，已发 NODE_REPORT 给 AUDITOR）

## Exit Criteria

六条命令全部退出码 0；50 局 `valid-minimal` 仿真全部 `CHAPTER_END`；`maxSteps` 步数上限验证生效；两次相同输入调用 `runSimulation` 结果深度相等；`machine.ts`/`index.ts` 的 git diff 只有新增行；`DECISIONS.md` 已入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
