# DEV-034 DECISIONS

## D1 — 接口不暴露任何流式/HTTP 原语（Task Package 第 2.1 节）

`TtsProviderPort.synthesize(request): Promise<TtsSynthesisResult>` 的签名里没有
stream、chunk、HTTP 状态码等任何传输层概念。调用方只关心"给了文本，最终有没有产出一个
可播放的文件"。Dev Spec 第 30 节的 HTTP Streaming 是 DEV-035 未来实现本 Port 时的
**内部**手段（把边到达边写的音频流写成完整文件后再把路径返回），不是接口本身要暴露的
形状——若把流原语塞进签名，`resolveAudioSource`（DEV-030）与其余消费方就要在没有任何
真实实现之前提前理解"流"，属于替未来节点做技术选型的过度设计。将来真需要 WebSocket
TTS（DEV-057）时，由那个节点定义自己的 Port，不改这个契约。

## D2 — `TtsSynthesisRequest` 不复用 `AudioResolutionRequest`

后者多一个 `contentId`（服务于缓存 key/去重，是"决策"层的字段）；本接口只关心真正驱动
一次合成调用所需的字段（`text`/`voiceId`/`voiceSettings`）。两者概念不同：一个是
"决定用哪个来源"（DEV-030 的决策链），一个是"真的去合成"（本节点）。字段凑巧相似不代表
概念相同，刻意保持独立类型，避免耦合出错误的依赖方向。

## D3 — 不接入任何调用点，零接线（Task Package 第 2.3 节）

`resolveAudioSource`/`resultAudioResolution`/`machine.ts`/`Ports` 一律未修改——
`TtsProviderPort` 当前没有任何消费者，这是刻意的。先例与 DEV-030 完全一致：
`AudioPort`/`AudioResolutionPorts` 都是"先定义契约、下一节点才接线"。DEV-035 落地时
提供真实实现替换 `noopTtsProviderPort`（组合注入），不需要对本接口发 CR。
`AudioResolutionPorts.hasTtsProvider`（DEV-030 冻结）不改动也不与本接口关联——它是
"是否存在 Provider"的布尔判断，属决策链自己的字段；与"Provider 具体长什么样"是两个
独立关注点。

## D4 — `noopTtsProviderPort` 如实诚实失败（Task Package 第 2.2 节）

默认实现无条件 resolve `{ok:false, reason:'no TTS provider configured'}`——如实反映
"现在没有任何真实 TTS 后端"，与 DEV-030 的 `noopAudioResolutionPorts` 同一先例。
返回可辨识联合而非抛异常，与项目其余决策类型（`AudioResolutionResult` 等）风格一致：
失败是一等公民，不是异常路径。

## D5 — `CR-019`（`getHealth`）不适用（Task Package 第 2.4 节）

零真实 IO：`noopTtsProviderPort.synthesize` 是一个立即 resolve 的字面量，不连网络、
不碰文件系统。同 DEV-001/005/030 先例——纯类型/纯函数交付不新建 `getHealth()`，
等 DEV-035 真正接入 HTTP IO 时才有健康检查的对象。

## Non-goals

不实现真实 TTS 厂商调用（ElevenLabs 等，DEV-035）；不实现 HTTP Streaming（DEV-035）；
不实现 WebSocket TTS（DEV-057，M5）；不接入 `runtime-kernel` 任何 action 或 Ports；
不修改 `AudioResolutionPorts.hasTtsProvider`；不新增任何 npm 依赖；不新建 `getHealth()`。
