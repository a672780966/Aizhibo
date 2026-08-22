---
msg_id: "0146"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-032
created_at: 2026-08-23
requires_response: true
---

# TASK_PACKAGE — DEV-032

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-032.md`

## 前置状态

DEV-031 已 `DONE`（`verdict_ref: "0144"`）。本节点是 M3 第三个节点，把自 DEV-009
起只能手动驱动的 AUDIO region 骨架接上第一个真实触发源。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-032.md`——**第 1/2 节务必先读**：`audioRegion.ts`
   六态本身**零改动**，只从 `storyRegion.ts` 一侧追加两个 action 触发已有事件名
   （`AUDIO.PREPARE`/`AUDIO.READY`/`AUDIO.STOP`）。PLAYING_HOST/DUCKED 需要 AI
   Host（M5，不存在）触发，本节点**不实现**。
3. `specs/PROJECT_INDEX.md`

## 关于本节点范围

只允许改 `machine.ts`（追加两个新 action）、`storyRegion.ts`（三处 actions 数组
追加）、`machine.test.ts`。`audioRegion.ts`/`apps/renderer/**`/
`packages/audio-engine/**` 一律不得触碰。

## 节点状态

`ISSUED` → 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
