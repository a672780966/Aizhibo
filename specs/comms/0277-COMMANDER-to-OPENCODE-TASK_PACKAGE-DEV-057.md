---
msg_id: "0277"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-057
in_reply_to: "0276"
created_at: 2026-09-07
requires_response: true
---

# TASK_PACKAGE — DEV-057

M5 第九个节点：Host TTS。详见
`specs/tasks/TASK-PACKAGE-DEV-057.md`。

新增 `packages/ai-host/src/hostTtsProvider.ts`：`HostTtsProvider`
流式合成接口（`synthesizeSpeech` 返回
`AsyncIterable<Uint8Array>` 音频块）+ `noopHostTtsProvider` 诚实
占位实现。Dev Spec 第 30 节明确"AI Host：LLM Streaming →
WebSocket TTS"，与 DEV-034 冻结的文件返回式 `TtsProviderPort`（
针对"文本已完整存在"的 Story Result 场景）是两种不同协议形状，
本节点新建独立接口，不复用/修改 `TtsProviderPort`。未指定任何
具体厂商/协议细节，不实现任何真实网络调用（同 DEV-056 先例）。
不重新打开 DEV-038（Audio Ducking，BLOCKED——本节点不接入
runtime-kernel/audioRegion）。

DEV-057 转 `IN_PROGRESS`。
