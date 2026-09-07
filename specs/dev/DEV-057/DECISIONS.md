# DEV-057 DECISIONS

本文件记录 DEV-057（Host TTS）实现中的关键决策与理由。Task
Package 第 6 节要求的要点逐一覆盖（D1–D4）。

## D1 — 为何新建独立的流式接口，而不复用/修改 DEV-034 的 TtsProviderPort

**决策**：本节点在 `ai-host` 包内新建独立的
`HostTtsProvider` 流式接口（`synthesizeSpeech` 返回
`HostTtsResult`，`ok:true` 分支携带
`audioChunks: AsyncIterable<Uint8Array>`），不复用、不修改
`packages/audio-engine/src/ttsProvider.ts`（DEV-034 冻结）的
`TtsProviderPort`。

**理由**：
- Dev Spec 第 30 节（DEV_SPEC_V1.0.md 第 1313–1333 行）明确区分
  两种协议形状：**Story Result → HTTP Streaming TTS**（"文本已经
  完整存在"，ElevenLabs 官方建议这种情况使用 HTTP Streaming）；
  **AI Host：LLM Streaming → WebSocket TTS**（"文本本身正在逐步
  产生的 LLM → Voice 场景"更适合 WebSocket）。
- DEV-034 的 `TtsProviderPort.synthesize(request): Promise<{ok:
  true, file: string} | {ok: false, reason: string}>` 是"给完整
  文本，等一段时间，拿到一个音频文件"的请求-响应式设计，明确针对
  Story Result"文本已完整存在"的场景（第 30 节原文依据）。它是
  **文件返回式**形状。
- Host 场景的"文本正在逐步产生"决定了它需要一个**流式**接口形状，
  不是"等文件"的形状——两者是 Dev Spec 明确区分的**两种不同协议**，
  不是同一个接口的两种实现。若强行复用文件返回式的
  `TtsProviderPort`，接口形状本身就会与第 30 节对流式协议的要求
  冲突。
- 因此本节点不修改、不复用 `TtsProviderPort`（保持 DEV-034 冻结
  状态不动），在 `ai-host` 包内新建独立流式接口，两种协议形状各归
  各位。

## D2 — 为何用 AsyncIterable<Uint8Array> 表达流式，而不绑定具体 WebSocket 实现

**决策**：`HostTtsResult` 的 `ok:true` 分支用
`audioChunks: AsyncIterable<Uint8Array>` 表达"流式产出音频数据"
这一架构特征。

**理由**：
- Dev Spec 第 30 节只给出"AI Host 应该用 WebSocket 而不是 HTTP
  Streaming"这一层**协议类别**层面的架构判断，没有指定任何具体
  厂商（ElevenLabs 只是作为"官方建议"的引用来源，不代表本节点
  必须对接 ElevenLabs）、消息帧格式、鉴权方式。
- 在协议细节未指定的此刻，直接在接口签名里绑定具体 WebSocket
  消息形状（帧类型/序列化格式/连接生命周期对象）等于自己发明一套
  猜测性接线约定；`AsyncIterable<Uint8Array>` 是一种**传输无关**
  的流式抽象——它只承诺"音频数据会分批到达、可用 for await 顺序
  消费"，不承诺底层是 WebSocket、HTTP chunk 还是别的传输层。未来
  真实 WebSocket 接入方只需把收到的音频帧包装成一个 async
  iterable 即可满足契约。
- 这正好满足"**可替换** Provider"这一抽象层的价值：接口只表达
  流式这一架构特征（第 30 节要求），具体传输层技术留待真实实现
  决策，接口契约届时保持不变。

## D3 — 为何不实现任何真实网络调用（只定义接口 + noop 占位）

**决策**：本节点只交付两样东西——`HostTtsProvider` 流式可替换
接口 + 一个诚实的 `noopHostTtsProvider` 占位实现。占位永远返回
`{ ok: false, reason: 'no Host TTS provider configured' }` /
`{ status: 'DOWN', error: ... }`，不发起任何网络请求、不伪造成功
结果。不写任何 HTTP/WebSocket 客户端、不 import `fetch`、不引入
任何第三方 TTS SDK；`hostTtsProvider.ts` 源码零 import。

**理由**：
- 第 30 节只给出协议类别层面的架构判断，没有指定任何具体厂商、
  消息帧格式、鉴权方式。在厂商/协议均未指定的此刻编写真实
  WebSocket/HTTP 客户端，等于自己发明一套猜测性接线协议约定，
  一旦未来真实选定的厂商不兼容这套假设，就是白白浪费的代码。
- 与 DEV-056（Host LLM Provider）的现实核对结论及 USER 2026-09-07
  已确立的裁决方向完全一致：Dev Spec 只定义抽象层本身，不指定
  协议细节时，只交付"反映架构特征的接口形状 + 诚实的 noop 占位
  实现"，等真实账号/厂商选定后再通过 FIX/CR 补齐真实实现。
- 占位的诚实性是有意为之：`ok:false` + 明确 reason 让任何早期
  调用方（未来的 Runtime 组合层）在未配置真实 provider 时得到
  明确可诊断的失败，而不是静默的假成功。
- 不接入 Egress Gate/Host Scheduler/真实 Runtime 组合层（均为
  未来节点或未来 Runtime 组合层职责），也直接体现 CR-010"不得暴露
  绕过 Egress Gate 的出站接口"约束——本节点只提供"把一段已经通过
  Gate 的文本合成语音"这个动作的可替换接口本身，不做任何编排逻辑。

## D4 — 为何不重新打开 DEV-038（Audio Ducking，BLOCKED）

**决策**：本节点不接入 `runtime-kernel`/`audioRegion` 状态机，
不改变 DEV-038 的 `BLOCKED` 状态。

**理由**：
- DEV-038 自 M3 起 `BLOCKED`（暂缓非施工失败），原因是
  `PLAYING_HOST` 音频状态自 DEV-009 起从未被任何真实代码路径进入
  ——没有真实 Host 音频信号，Audio Ducking 就无可压制对象。
- 本节点只交付"流式合成接口 + noop 占位"，接口本身不产生任何
  真实音频输出，不会让 `PLAYING_HOST` 真正可达；DEV-038 的重开
  条件（真实 Host 音频信号存在）在真实 TTS 实现 + Runtime 组合层
  落地之前仍不满足。
- 因此本节点不改变 DEV-038 状态，其重开与否留给未来真实实现
  落地后的节点决策。
