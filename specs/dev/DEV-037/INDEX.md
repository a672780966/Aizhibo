# DEV-037 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-037 — Dice Buffer Controller

## Objective

把 `interactionRegion.ts` 里自 DEV-009 起就空置的 `LOCKING` 占位状态接上
真实的骰子节奏延迟（`always`→`after`，按 Dev Spec 第 31 节示例值
`TARGET_DICE_MS=6000`），CR-018 重定位为"节奏控制器"（安全阀/AUDIO_READY
分支因无真实信号可用，留给未来节点）。同步给 `createRuntimeMachine` 增加
可注入 XState `clock`，并把 Simulator/Replay/既有测试全部接上立即触发的
假时钟，避免本节点自己引入真实的墙钟耗时回归。

## Allowed Scope

```
packages/runtime-kernel/src/diceTiming.ts            （新增）
packages/runtime-kernel/src/diceTiming.test.ts       （新增，如有必要）
packages/runtime-kernel/src/interactionRegion.ts     （仅 LOCKING 一处）
packages/runtime-kernel/src/machine.ts               （追加 delays + clock 参数）
packages/runtime-kernel/src/machine.test.ts          （追加用例 + 既有用例追加 clock）
packages/runtime-kernel/src/virtualPorts.ts          （追加 instantClock）
packages/runtime-kernel/src/simulator.ts             （追加 clock: instantClock）
packages/runtime-kernel/src/replay.ts                （追加式新增 clock 字段）
packages/runtime-kernel/src/replay.test.ts           （既有用例追加 clock）
packages/runtime-kernel/src/presentationCommand.test.ts （既有用例追加 clock）
packages/runtime-kernel/src/simulator.test.ts        （如需要，追加 clock）
packages/runtime-kernel/src/index.ts                 （追加导出）
specs/dev/DEV-037/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

## Read-only Scope

```
onResolve 内部骰子/规则/叙事计算逻辑本身、storyRegion.ts、audioRegion.ts、
  resultAudioResolution.ts、ports.ts、presentationCommand.ts
apps/renderer/**、packages/audio-engine/**
其余同既有节点惯例
```

## Forbidden Scope

```
实现 AUDIO_READY 安全阀分支（minDiceMs/maxDiceMs 消费逻辑）
把 resolveResultAudio/TtsProviderPort/AudioCache 接入本节点任何逻辑
修改 onResolve 内部计算逻辑本身
修改 apps/renderer 任何文件
修改既有测试的判定逻辑/断言内容
新增任何 npm 依赖
```

## Task Order

- [x] T001 节点文档
- [x] T002 diceTiming.ts + interactionRegion.ts + machine.ts
- [x] T003 virtualPorts.ts + simulator.ts/replay.ts 接入 + 既有测试更新
- [x] T004 index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T004（已完成）

## Exit Criteria

六条命令全部退出码 0；`pnpm test` 墙钟耗时未显著回归；延迟毫秒数与默认
真实时钟行为均已验证；`DECISIONS.md` 已入库；REPORT.md 完成且 Status =
READY_FOR_REVIEW；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
