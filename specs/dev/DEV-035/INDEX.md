# DEV-035 INDEX

Status: IN_PROGRESS

## Current Node

DEV-035 — Result TTS

## Objective

首次实现 DEV-034 定义的 `TtsProviderPort` 契约的真实版本：`createElevenLabsTtsProvider`
（原生 fetch 流式 HTTP 调用 ElevenLabs Streaming API，零新增依赖）+
`createOptionalElevenLabsTtsProvider`（未配置 `ELEVENLABS_API_KEY` 时退化为
DEV-034 的 `noopTtsProviderPort` 本体）+ `getElevenLabsHealth`（CR-019 首次真正
适用）。不接入 runtime-kernel 任何调用点——真正的调用时机与 dice 计时编排是
DEV-037 的职责。USER 已裁决密钥可选，不强迫现在配置真实账号。

## Allowed Scope

```
packages/audio-engine/src/elevenLabsTtsProvider.ts        （新增）
packages/audio-engine/src/elevenLabsTtsProvider.test.ts   （新增）
packages/audio-engine/src/index.ts                        （追加导出）
specs/dev/DEV-035/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

## Read-only Scope

```
packages/audio-engine/src/ttsProvider.ts（DEV-034 冻结）
packages/audio-engine/src/resolveAudioSource.ts（DEV-030 冻结）
packages/runtime-kernel/**、apps/renderer/**
其余同既有节点惯例
```

## Forbidden Scope

```
把 Provider 接入 runtime-kernel 任何 action
实现真实缓存/去重存储（DEV-036 职责）
实现 dice 计时/AUDIO_READY 编排逻辑（DEV-037 职责）
新增任何 npm 依赖
修改 ttsProvider.ts / resolveAudioSource.ts
硬编码/预设产物输出目录
```

## Task Order

- [ ] T001 节点文档
- [ ] T002 elevenLabsTtsProvider.ts + 测试
- [ ] T003 index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；测试全程零真实网络请求；`noopTtsProviderPort` 身份等价
测试通过；`DECISIONS.md` 已入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；
已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
