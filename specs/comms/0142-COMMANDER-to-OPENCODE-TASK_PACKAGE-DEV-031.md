---
msg_id: "0142"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-031
created_at: 2026-08-23
requires_response: true
---

# TASK_PACKAGE — DEV-031

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-031.md`

## 前置状态

DEV-030 已 `DONE`（`verdict_ref: "0140"`）。本节点是 M3 第二个节点，首次把
`resolveAudioSource` 接入 Runtime。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-031.md`——**第 1/2 节务必先读**：Dev Spec 第 28 节
   "Master Audio" 四类内容（Chapter Intro/Boss/Ending 等）目前在冻结的 `machine.ts`
   里没有任何叙事发射代码，本节点**不实现**它们（发明新逻辑属于超出范围）。真正
   要接入的是唯一已存在的叙事路径：Result 叙事（`onResolve`/`onResultPlaying`）。
3. `specs/PROJECT_INDEX.md`

## 关于本节点范围

`machine.ts` 只允许改 `onResolve` 与 `onResultPlaying` 两处（precedent:
DEV-025 的两处 CR）。`packages/audio-engine/**`（DEV-030 冻结）与
`Ports.audio`/`audioRegion.ts`（DEV-027/DEV-032 的领域）一律不得触碰。

## 节点状态

`ISSUED` → 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
