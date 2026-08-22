# DEV-034 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-034.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- **本节点只定义"TTS 提供方长什么样"，不实现任何真实调用**：新文件
  `packages/audio-engine/src/ttsProvider.ts` 导出
  `TtsSynthesisRequest`/`TtsSynthesisResult`/`TtsProviderPort`/
  `noopTtsProviderPort`。接口不暴露任何流式/HTTP 细节——调用方只关心"给了文本，
  最终有没有产出一个可播放的文件"。第 30 节的 HTTP Streaming 是 DEV-035 未来实现
  `TtsProviderPort` 时的内部手段，不是接口要暴露的形状。
- **返回可辨识联合而非抛异常**：`TtsSynthesisResult = { ok:true; file:string } |
  { ok:false; reason:string }`，与项目里其余决策类型风格一致。
- **`TtsSynthesisRequest` 刻意不复用 `AudioResolutionRequest`**：后者多一个
  `contentId`（决策层缓存 key 字段）；本接口只关心真正驱动一次合成调用所需的字段，
  两者概念不同，避免耦合出错误的依赖关系。
- **默认实现 `noopTtsProviderPort` 如实反映现状**：与 DEV-030
  `noopAudioResolutionPorts` 同一先例，总是诚实报告失败。DEV-035 落地时替换，
  不需要对本接口发 CR。
- **不接入任何调用点**：`resolveAudioSource`/`resultAudioResolution`/`machine.ts`/
  `Ports` 一律不修改。`AudioResolutionPorts.hasTtsProvider(request)`（DEV-030 冻结）
  不改动、不与本接口关联——它是决策链自己的字段，与"Provider 具体长什么样"是两个
  独立关注点。
- **CR-019（`getHealth`）不适用**：零真实 IO（`noopTtsProviderPort.synthesize`
  只是立即 resolve 的字面量），同 DEV-001/005/030 先例。

## Scope（Task Package 第 3 节）

Writable：

```
packages/audio-engine/src/ttsProvider.ts        （新增）
packages/audio-engine/src/ttsProvider.test.ts   （新增）
packages/audio-engine/src/index.ts              （追加导出）
```

Writable — 节点文档与通信：

```
specs/dev/DEV-034/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

Read-only：

```
packages/audio-engine/src/resolveAudioSource.ts（DEV-030 冻结，不得改动）
packages/runtime-kernel/**（不接入任何调用点，全部只读）
apps/renderer/**（本节点与 Renderer 无关）
其余同既有节点惯例（chapter-schema 等其他包、根配置、specs/baseline、audit、
  protocol、specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**）
```

Forbidden：

```
修改 resolveAudioSource.ts / AudioResolutionPorts.hasTtsProvider
把 TtsProviderPort 接入 runtime-kernel 任何 action 或 Ports
实现任何真实 HTTP/网络调用（DEV-035 的职责）
在接口里暴露具体的流式原语
新增任何 npm 依赖（含任何 HTTP 客户端库）
新建 getHealth()
```

## Tests（Task Package 第 11 节）

- Unit：`noopTtsProviderPort` 诚实失败路径 + 可辨识联合类型收窄验证。
- Regression：`pnpm test` 覆盖全 workspace；既有全部包测试零回归。

## Non-goals（Task Package 第 10 节）

- 不实现真实 TTS 厂商调用（ElevenLabs 等，DEV-035 的职责，含厂商选型/密钥管理/
  成本控制）。
- 不实现 HTTP Streaming（第 30 节，DEV-035 的职责）。
- 不实现 WebSocket TTS（AI Host 用，DEV-057 的职责，M5）。
- 不把 `TtsProviderPort` 接入任何调用点。
- 不修改 `AudioResolutionPorts.hasTtsProvider`。
