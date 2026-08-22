# DEV-032 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-032 — Audio State Region

## Objective

把自 DEV-009 起一直只能手动驱动的 AUDIO region 六态骨架接上第一个真实触发源：
DEV-031 计算好的 Result 叙事音频决策（`context.resultAudio`）。`source !==
'SUBTITLE_ONLY'` 时自动 `IDLE → PREPARING → PLAYING_STORY`，`NARRATIVE.DONE` 时
自动回到 `IDLE`。`audioRegion.ts` 本身零改动；PLAYING_HOST/DUCKED（AI Host 触发，
M5）与 BGM/环境音（DEV-027，Presentation 通道）均不在本节点范围。

## Allowed Scope

```
packages/runtime-kernel/src/machine.ts          （追加 xstate import + 两个新 action）
packages/runtime-kernel/src/machine.test.ts     （追加集成测试）
packages/runtime-kernel/src/storyRegion.ts      （仅 3 处 actions 数组追加）
specs/dev/DEV-032/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

## Read-only Scope

```
packages/runtime-kernel/src/audioRegion.ts / audioRegion.test.ts（六态与全部既有转移不得改）
packages/runtime-kernel/src/resultAudioResolution.ts、ports.ts
packages/audio-engine/**、apps/renderer/**
packages/runtime-kernel/src 内除 machine.ts/machine.test.ts/storyRegion.ts 外的一切
其余同既有节点惯例
```

## Forbidden Scope

```
修改 audioRegion.ts 的状态拓扑或既有转移
实现 PLAYING_HOST/DUCKED 的真实触发
触碰 BGM/环境音路径
修改 Ports.audio 的 send() 载荷形状
实现真实异步 TTS 等待
修改 apps/renderer 任何文件
新增任何 npm 依赖
新建 getHealth()
```

## Task Order

- [x] T001 节点文档
- [x] T002 machine.ts + storyRegion.ts 两处 CR + 集成测试
- [x] T003 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

无（T001–T003 全部完成，Status = READY_FOR_REVIEW）

## Exit Criteria

六条命令全部退出码 0；注入/默认两种场景的机器级集成测试证明门槛条件真实生效；
`DECISIONS.md` 已入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；已向 AUDITOR
发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
