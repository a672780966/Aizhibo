# DEV-034 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-034.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- 新文件 `packages/audio-engine/src/ttsProvider.ts`：`TtsSynthesisRequest`
  （`text`/`voiceId`/`voiceSettings`）、`TtsSynthesisResult`（`{ok:true,file}` |
  `{ok:false,reason}` 可辨识联合）、`TtsProviderPort`（`synthesize` 方法）、
  `noopTtsProviderPort`（恒定诚实失败）。
- 接口**不暴露任何流式/HTTP 细节**——HTTP Streaming 是 DEV-035 未来实现本接口的
  内部手段，不是接口签名的一部分。
- `TtsSynthesisRequest` 故意不复用 DEV-030 的 `AudioResolutionRequest`（后者多一个
  服务于缓存 key 的 `contentId`，概念不同）。
- 本节点**不接入任何调用点**：`resolveAudioSource`/`resultAudioResolution`/
  `machine.ts`/`Ports` 一律不改；`AudioResolutionPorts.hasTtsProvider` 不改动、
  不与本接口关联。
- `CR-019`（`getHealth`）不适用（零真实 IO）。

## Scope（Task Package 第 3 节）

Writable：`packages/audio-engine/src/ttsProvider.ts(.test.ts)`、`index.ts`（追加）、
`specs/dev/DEV-034/*.md`、`specs/comms/LEDGER.md`（仅追加）、
`specs/comms/NNNN-OPENCODE-to-*.md`。

Forbidden（摘录）：不改 `resolveAudioSource.ts`/`hasTtsProvider`；不接入任何调用点；
不实现真实网络调用；不在接口暴露流式原语；不新增依赖；不新建 `getHealth()`。

## Task Order

T001 节点文档 → T002 `ttsProvider.ts` + 测试 → T003 `index.ts` 导出 + 全量验证 +
REPORT + commit + NODE_REPORT。
