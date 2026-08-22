---
msg_id: "0150"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-034
created_at: 2026-08-23
requires_response: true
---

# TASK_PACKAGE — DEV-034

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-034.md`

## 前置状态

DEV-030/031/032 均已 `DONE`。本节点是 M3 第四个节点，只在 `packages/audio-engine`
新增一个接口定义文件，不接入任何调用点。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-034.md`——**第 1/2 节务必先读**：本节点只定义
   `TtsProviderPort` 契约（`synthesize` 方法 + 可辨识联合返回值），**不实现任何
   真实 HTTP/流式调用**（那是 DEV-035 的职责），**不接入**`resolveAudioSource`/
   `runtime-kernel` 任何位置。
3. `specs/PROJECT_INDEX.md`

## 关于本节点范围

只允许改 `packages/audio-engine/src/ttsProvider.ts(.test.ts)` 与 `index.ts`
（追加导出）。`resolveAudioSource.ts`（DEV-030 冻结）与
`packages/runtime-kernel/**`/`apps/renderer/**` 一律不得触碰。

## 节点状态

`ISSUED` → 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
