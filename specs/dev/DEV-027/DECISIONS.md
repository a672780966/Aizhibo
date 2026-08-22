# DEV-027 DECISIONS

## D1 — BGM/SFX 走 Presentation 通道，不给 `Ports.audio` 建独立传输

`runtime-kernel` 从 DEV-009 起就有独立的 `Ports.audio`，是为了给 DEV-032（Audio State
Region，M3，尚未建）未来做"声道占用仲裁"（CR-005：Story Audio 与 Host Audio 的抢占
关系）留出真正的架构位置。但**目前** `Ports.audio` 完全没有真实传输（`apps/renderer`
只给 `Ports.presentation` 接了 WebSocket，`Ports.audio` 至今仍是 no-op）。

给 `Ports.audio` 现在就接一条独立 WebSocket 通道，本质是在 DEV-032 真正设计"声道
仲裁"之前抢先搭一套很可能被推翻重做的传输层——过度设计。本节点的处置：BGM/SFX 是
纯"进场景就放对应音效"的简单需求，不涉及任何声道抢占/打断逻辑，走**已经在工作、
已经测试过**的 Presentation WebSocket 通道即可（Renderer 本来就是网页，`<audio>` 标签
放在同一个页面里）。`Ports.audio`/`audioRegion.ts`/`ports.ts` 均未触碰，留给 DEV-032
未来真正需要声道仲裁时再决定怎么建。这是主动决策，不是遗漏。

## D2 — `loop` 默认循环：Renderer 侧的产品默认值

`<audio loop>` 属性用 `resolved.loop ?? true`——**BGM/环境音默认循环播放**。`loop`
字段本身在 `AudioAsset` schema 里 optional，绝大多数 BGM/环境音场景下作者期望循环，
这是 Renderer 侧合理的产品默认值，不是编造数据；作者显式设 `loop: false` 时仍被
尊重（`??` 只在 `undefined` 时取默认值）。`volume` 用 `resolved.gain ?? 1` 并夹到
`[0,1]`（`gain` 若提供了超范围数值需 clamp，防御性处理）。

## D3 — `key={id}`：同一音频跨场景不重启，不同音频挂载新元素

`<audio>` 元素用 `key={resolved.id}`：同一 `id` 跨场景不重复播放/重启（React 复用
已有元素），不同 `id` 触发浏览器挂载新 `<audio>` 元素从头播放。这天然实现了"进新场景
切换音频、同场景内不打断"的期望行为，无需任何额外音频状态管理。

## D4 — 事件触发型 SFX 已知边界（不实现）

Dev Spec 原文"BGM / SFX"里的 SFX 是互动/事件触发的短音效，如骰子音效、UI 反馈音——
这些目前没有任何 `RuntimeEvent`/`PresentationCommand` 携带"现在该放哪个 SFX"的信号，
本节点只做场景级的 BGM/环境音（`SceneNode.bgm`/`ambience`，有真实 schema 字段支撑）。
真正的事件触发型 SFX 留给未来需要时再设计（大概率是另一次 CR，例如给
`DICE_INTRO`/`DICE_RESULT` 或 `INTERACTION_OPEN` 等既有命令附加音效 id）。这是诚实
记录的边界，不是遗漏。

## D5 — `RUNTIME_TTS` 资产跳过（DEV-034+ 的职责）

`AudioAsset` 判别联合里 `source==='RUNTIME_TTS'` 的分支没有 `file`（只有 `ttsSpec`），
是 DEV-034+ TTS 管线的资产，本节点不处理语音。`resolveSceneAudio` 对这类条目一律
跳过（`bgm` 场景下整个字段省略、`ambience` 场景下从数组剔除），不抛异常——如果未来
把 TTS 并入场景音频，那是 DEV-034+ 自己的 CR，不反向改本节点。

## D6 — `pickSceneAudio` 的"最新场景"语义：无音频的新场景复位为空

`pickSceneAudio` 对每条 `SCENE_ENTER` 都会重置音频视图：当次载荷 `audio` 缺失/非法
→ `{ambience: []}`。这样"上一场景有 BGM、新场景没有音频"时不会残留旧音频（与
`pickCameraPreset` 的复位语义一致）。无命令时返回 `{ambience: []}`，渲染侧不渲染任何
`<audio>`。