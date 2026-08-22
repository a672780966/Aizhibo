# DEV-032 DECISIONS

对应 Task Package 第 6 节 Outputs 要求的全部要点。

## D1 — 门槛条件为何是 `source !== 'SUBTITLE_ONLY'`

`resultAudio.source === 'SUBTITLE_ONLY'` 意味着本次 Result 叙事根本没有可播的音频
（只有字幕），"人声播报通道"没有被占用。此时向 AUDIO region raise `AUDIO.PREPARE`
会让 region 进入一个没有任何真实音频在播的 `PLAYING_STORY`——那是谎言状态。门槛
条件让 AUDIO region 在这种情况诚实保持 `IDLE`。当前默认 Port
（`noopAudioResolutionPorts`）恒定返回 `SUBTITLE_ONLY`，因此在真实 TTS/预生成接入
之前，生产环境观察不到 AUDIO region 离开过 `IDLE`——这与 DEV-030/031 一路建立的
"诚实反映现状"先例一致，是有意行为而非接线失败。

## D2 — PREPARE→READY 为何同步折叠及未来重开边界

当前系统没有任何真实异步 TTS/流式调用（DEV-034/035 尚未建立），"准备"这一步没有
真实耗时。两个事件在同一批微步里同步耗尽，`PREPARING` 是一个真实但零耗时的过渡
态。这是有意的、诚实的当前行为。

**未来重开边界**：DEV-034/035 接入真实异步 TTS 后，需要把 `AUDIO.READY` 的
raise 挪到异步操作 resolve 之后（`AUDIO.FAIL` 挪到 reject 之后）。这需要对本节点
重新发 CR（Task Package 第 10 节 Non-goals 已明确排除实现真实异步等待），属预期
中的、诚实记录的未来重开，不是本节点的设计缺陷。

## D3 — 为何不实现 PLAYING_HOST/DUCKED 的真实触发

这两个状态的唯一触发源是 AI Host 人声（M5：DEV-057 Host TTS / DEV-038 Audio
Ducking）。Host 完全不存在（`ai-host` 包尚未创建），提前接线等于给不存在的消费方
造死代码。两态继续由既有 `audioRegion.test.ts` 手动驱动用例覆盖。

## D4 — 为何不碰 BGM/环境音路径

DEV-027 已裁定 BGM/环境音走 Presentation 通道、不经过 `Ports.audio`：背景音乐是
常驻环境音，不存在"叙事人声 vs Host 人声"式的互斥，不需要声道仲裁。
`Ports.audio`/AUDIO region 建模的"声道"专指人声播报通道。触碰该路径即越入 DEV-027
已冻结领域（Forbidden Scope 明文禁止）。

## D5 — CR-019 不适用的理由

CR-019（getHealth 自落地起）约束的是新增真实 IO 的运维健康检查节点。本节点是纯
逻辑扩展：只从 STORY region 一侧追加两个跨 region action 触发既有事件名，无任何
新增 IO 面、无新部署单元，Task Package Constraints #4 也明确"不新建 getHealth()"。
故 CR-019 对本节点不适用。

## D6 — `AUDIO.STOP` 无条件发出（不加门槛）

AUDIO region 的 `IDLE` 状态没有 `AUDIO.STOP` 处理器，未匹配事件在 XState 里是安全
空操作——region 还在 `IDLE` 时收到 `AUDIO.STOP` 无副作用。因此无需判断"之前是否真
的进了 PLAYING_STORY"，无条件 raise 更简单也同样正确。
