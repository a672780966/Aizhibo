---
msg_id: "0158"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-036
created_at: 2026-08-27
requires_response: true
---

# TASK_PACKAGE — DEV-036

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-036.md`

## 前置状态

DEV-030/035 均已 `DONE`。本节点实现规范第 51 节要求的完整缓存 key 算法，
修正 DEV-035 自身幂等命名哈希缺少 `voiceModelVersion` 的已知缺口。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-036.md`——**第 1/2 节务必先读**：`voiceModelVersion`
   是 `createAudioCache` 的构造参数，**不得**加进已冻结的
   `AudioResolutionRequest`；不接入任何调用点；不要把本节点的缓存 key 哈希
   与 DEV-035 内部的幂等命名哈希混为一谈，两者用途不同。
3. `specs/PROJECT_INDEX.md`

## 关于本节点范围

只允许改 `packages/audio-engine/src/audioCache.ts(.test.ts)` 与 `index.ts`
（追加导出）。`resolveAudioSource.ts`/`ttsProvider.ts`/
`elevenLabsTtsProvider.ts`（均已冻结）与 `packages/runtime-kernel/**`/
`apps/renderer/**` 一律不得触碰。

## 节点状态

`ISSUED` → 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
