# DEV-030 DECISIONS

## D1 — 不依赖 `chapter-schema`（Task Package 第 2.4 节）

`AudioResolutionRequest` 故意用通用字段（`contentId`/`text`/`voiceId`/
`voiceSettings`），不 import `chapter-schema` 的 `NarrativeBlock`/`AudioAsset`
类型——本节点的决策链是"任何需要发声的文本"这一层通用逻辑，不应反向依赖章节数据
的具体形状。未来接入点（DEV-035 等）自己负责把 `NarrativeBlock` 映射成
`AudioResolutionRequest`。因此 `package.json` 的 `dependencies` 为空。

## D2 — `CR-019`（`getHealth`）在本节点不适用（Task Package 第 2.3 节）

本节点交付纯决策函数 + 全部返回"不可用"的默认 Port，没有任何真实 IO（不连数据库、
不发网络请求、不扫文件系统）——与 `chapter-schema`（DEV-001）、`dice-engine`
（DEV-005）同类"纯函数库无运行时服务"。等 DEV-034/036 真正接入 TTS/缓存 IO 时
`getHealth()` 才有意义，届时由那些节点建立，本节点不新建。

## D3 — 拼接听感验证不在本节点做（Task Package 第 2.5 节）

`DAG.md`："DEV-030/033 阶段必须做一次块拼接听感原型（十余条真实块试听）。"这需要
真实 TTS 输出音频，而 DEV-034（TTS Provider Interface）尚未建，此刻没有任何真实
语音可供试听。该验证的实际执行时机是"DEV-034/035 把 RUNTIME_TTS 真正接上之后"。
如实记为 Non-goal，不假装完成了一项目前不可能完成的验证。

## D4 — 未来节点接入方式：组合新 Port，不需要对本函数发 CR（Task Package 第 2.2 节）

`resolveAudioSource` 的决策逻辑与"当前系统有什么"通过 `AudioResolutionPorts` 注入
解耦。DEV-034 落地后，未来节点只需构造新的 `AudioResolutionPorts`
（`hasTtsProvider` 返回 `true`）传给 `resolveAudioSource`，不需要修改本函数，也不
需要 CR。默认实现 `noopAudioResolutionPorts` 全部返回"不可用"是如实反映现状
（无预生成目录、无缓存表、无 TTS Provider），单独运行时任何请求 fallthrough 到
`SUBTITLE_ONLY` 是正确的当前行为。

## D5 — 只服务于 SPEECH，不接管 BGM/SFX/AMBIENCE

已核对 `chapter-schema/audio.ts` 的 `AudioAsset` 判别联合：`kind` 为
`BGM`/`SFX`/`AMBIENCE` 时 `source` 只能是 `PREPRODUCED`/`PREGENERATED`（作者声明
唯一固定文件），DEV-027 的 `resolveSceneAudio` 已完整处理，不需要运行时四级
fallback。只有 `kind==='SPEECH'` 在编译期不知道是否有预生成文件（要等 M7
`DEV-074`），才需要本节点的运行时决策链。本节点不改动 DEV-027 的既有路径。

## D6 — `RUNTIME_TTS` 命中不带 `file`，本节点只决策不调用

`hasTtsProvider` 为真时返回 `{source:'RUNTIME_TTS'}` 且无 `file`——实际调用 TTS
（HTTP streaming 等）是 DEV-034/035 的职责。顺着链条第一个命中就停，不做"最优
选择"（CR-018 权威语义，测试 A09 覆盖）。

## Non-goals

不实现 TTS Provider 调用（DEV-034）；不实现 Result TTS 兜底真实 HTTP Streaming
（DEV-035）；不实现 Audio Cache 真实存储（DEV-036）；不实现 PREGENERATED 目录扫描
（DEV-074，M7）；不做拼接听感原型（D3）；不接入 `runtime-kernel` 任何 action；
不处理 BGM/SFX/AMBIENCE（D5）；不新增任何 npm 依赖。
