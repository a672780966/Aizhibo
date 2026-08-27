---
msg_id: "0154"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-035
created_at: 2026-08-23
requires_response: true
---

# TASK_PACKAGE — DEV-035

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-035.md`

## 前置状态

DEV-030/031/032/034 均已 `DONE`。本节点首次实现真实的 `TtsProviderPort`
（ElevenLabs HTTP Streaming），USER 已裁决密钥可选。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-035.md`——**第 1/2 节务必先读**：无
   `ELEVENLABS_API_KEY` 时必须原样返回 DEV-034 的 `noopTtsProviderPort`
   （身份相等）；**测试全程不得发出任何真实网络请求**，全部用注入的
   `fetchImpl` 假实现；不接入 `runtime-kernel` 任何调用点。
3. `specs/PROJECT_INDEX.md`

## 关于本节点范围

只允许改 `packages/audio-engine/src/elevenLabsTtsProvider.ts(.test.ts)` 与
`index.ts`（追加导出）。`ttsProvider.ts`/`resolveAudioSource.ts`（均已冻结）与
`packages/runtime-kernel/**`/`apps/renderer/**` 一律不得触碰。

## 节点状态

`ISSUED` → 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
