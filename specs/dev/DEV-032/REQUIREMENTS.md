# DEV-032 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-032.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- AUDIO region（`audioRegion.ts`，DEV-009 冻结六态）自建立以来只能被测试手动
  `actor.send(...)` 驱动，本节点接上第一个真实触发源：DEV-031 的
  `context.resultAudio`。
- `storyRegion.ts` 三处转移的 `actions` 数组各追加一个新 action 名（不改状态
  拓扑）：`RESOLUTION_PENDING.always` 追加 `onAudioChannelForResult`；
  `RESULT_PLAYING.on['NARRATIVE.DONE']` 两个分支各追加 `onAudioChannelStop`。
- `machine.ts` 新增两个 `enqueueActions`/`raise` 实现的 action：
  - `onAudioChannelForResult`：`resultAudio !== undefined &&
    resultAudio.source !== 'SUBTITLE_ONLY'` 时依次 `raise AUDIO.PREPARE` →
    `raise AUDIO.READY`（当前无真实异步 TTS，同步折叠是诚实的当前行为，未来
    DEV-034/035 接入真实异步时需要对本节点重新发 CR，属预期中的重开）。
  - `onAudioChannelStop`：无条件 `raise AUDIO.STOP`（AUDIO 已在 `IDLE` 时收到
    是安全空操作，不需要额外判断）。
- `audioRegion.ts` 本身、`Ports.audio` 的 send 载荷形状均零改动。
- PLAYING_HOST/DUCKED（AI Host 触发，M5 未建）、BGM/环境音（DEV-027，走
  Presentation 通道）均不在本节点范围。

## Scope（Task Package 第 3 节）

Writable：`machine.ts`（追加 import + 两个新 action）、`machine.test.ts`（追加）、
`storyRegion.ts`（仅 3 处 actions 数组）、`specs/dev/DEV-032/*.md`、
`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-*.md`。

Forbidden（摘录）：不改 `audioRegion.ts` 拓扑；不实现 PLAYING_HOST/DUCKED 真实
触发；不碰 BGM/环境音；不改 `Ports.audio` 载荷形状；不实现真实异步等待；不改
`apps/renderer`；不新增依赖；不新建 `getHealth()`。

## Task Order

T001 节点文档 → T002 `machine.ts` + `storyRegion.ts` 两处 CR + 集成测试 → T003
全量验证 + REPORT + commit + NODE_REPORT。
