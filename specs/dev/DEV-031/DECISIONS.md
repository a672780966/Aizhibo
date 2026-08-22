# DEV-031 DECISIONS

## D1 — `contentId` 保序不排序（Task Package 第 2.1 节）

`contentId = resolved.map(r => r.narrativeId).join('+')` 保持 `resolved` 数组原有
顺序。理由：`composeResultSetNarration` 按同一数组顺序拼接出最终文本，顺序不同则
文本不同（A+B 与 B+A 是两段不同的合成叙事），因此 `contentId` 必须反映"这个顺序的
这个组合"；排序会把两个不同的合成文本错误地映射到同一个缓存 key。测试用能感知
`contentId` 具体值的自定义 Port 证明 `'a+b'` 命中、`'b+a'` 不命中。

## D2 — `voiceId='narrator-default'`/`voiceSettings={}` 是有意占位符（Task Package 第 2.2 节）

`composeResultSetNarration`（DEV-033 冻结）把一次交互所有命中的 `ResultNarrative`
拼成**一段**文本，本身已不区分说话者；在逐句拆分机制出现前，给整段指定单一 voice
是当前架构下唯一自洽做法。`narrator-default` 当前没有任何真实语音配置消费它，供
DEV-034（TTS Provider Interface）或语音选角节点替换。

**Future Consideration / 未来重开边界**：若将来要"每个角色一个声音"，需要重新设计
`composeResultSetNarration` 的输出形状（多段而非单一字符串），并对本节点的
`onResolve`/`resultAudioResolution.ts` **重新发 CR**——这是预期中的、诚实记录的
未来重开，不是本节点的设计缺陷。

## D3 — `Ports.audioResolution` 与既有 `Ports.audio` 是两条独立通道（Task Package 第 2.3 节）

`Ports.audio`/`noopAudioPort` 是 DEV-027 刻意留空、留给 DEV-032（声道仲裁）接管的
命令下发通道；本节点新增的 `audioResolution` 是 Result 叙事的音频来源**决策**端口
（DEV-030 的四级解析链注入点）。二者互不影响，本节点对前者逐字节未动。
追加字段向后兼容：`{ ...defaultPorts, ...input.ports }` 合并逻辑无需改动，
`virtualPorts.ts` 只提供 clock/platform 覆盖项，同样不受影响。

## D4 — 两处 CR 的必要性（Task Package 第 2.4 节）

音频决策必须与叙事文本同源：`onResolve` 是唯一计算 `narrationText` 的地方，在那里
调用 `resolveResultAudio(outcome.resolved, narrationText, ports.audioResolution)` 才
能保证 `contentId`/`text` 与实际下发的文本一致；而 presentation 命令只在
`onResultPlaying` 发出。因此恰好两处改动（precedent: DEV-025 的两处 CR），其余
action 逐字节不动。`presentationCommand.ts` 的 `foldState` 不改——历次 SCENE_ENTER
CR 的新增字段同样不进 RESYNC 快照，断线重连由新命令重新下发，本次遵循同一先例。

## D5 — 不实现 Chapter Intro/Boss/Ending 类 Master Audio 内容（Task Package 第 1 节）

Dev Spec 第 28 节列出的 Master Audio 四类内容在当前冻结的 `machine.ts` 里**没有任何
叙事发射代码**——`onChapterEnd` 不发送任何 presentation 命令，Boss/Ending 的
`narrationBlockIds` 从未被运行时读取。现在实现它们必须先发明一套 Dev Spec 未定义
细节的"结局/Boss 叙事选择与发射"逻辑，属于为假设需求设计。真正端到端产出真实文本
并已下发 presentation 命令的路径只有 Result 叙事一条——本节点接入的就是它。其余
发射点出现时各自重复本模式（读 `ports.audioResolution` → 调 `resolveAudioSource`
→ 放进对应命令），不需要对 `resolveAudioSource` 本身发 CR。

## D6 — `CR-019`（`getHealth()`）不适用（同 DEV-030 先例）

本节点是纯函数扩展 + Port 接线，没有新增真实 IO（不调 TTS、不查缓存、不扫目录）
——无运行时服务可探活，不新建 `getHealth()`。等 DEV-034/035/036 真正接入 IO 时
才由那些节点建立。

## Non-goals

不实现真实 TTS 调用（DEV-034/035）、真实缓存查找（DEV-036）、预生成目录扫描
（DEV-074）；不实现逐句/多角色配音（D2）；不接 AUDIO region/声道仲裁（DEV-032）；
不做拼接听感原型验证（仍无真实 TTS 输出）；不新增除 audio-engine 外依赖；
Renderer 不新增 workspace 依赖（类型经 runtime-kernel 透传）。
