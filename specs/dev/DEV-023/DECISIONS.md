# DEV-023 DECISIONS

## D1 — 为何不新开命令类型，而是把 `narration` 加进 `SCENE_ENTER`

场景旁白的数据来源本来就属于 `SceneNode`（`narration?: string[]`，纯字符串数组），跟着场景
一起下发最自然。核对 `machine.ts` 后确认进入 `STORY_PLAYING` 时（`onStoryPlaying`）**完全不发
任何 Presentation 命令**——场景的旁白/对白目前只能通过 `SCENE_ENTER` 命令带出去（进入场景那
一刻）。若新开一个命令类型，就得凭空在 `onStoryPlaying` 里新增一次 `send`，那是对状态机的更大
改动，且没有新增数据来源。因此本节点只对 DEV-009 已冻结、DEV-021/022 已 CR 过两次的
`onSceneEnter` 再发第三次窄范围 CR：在 `SCENE_ENTER` 载荷里追加一行 `narration: scene?.narration
?? []`（Task Package 2.1 节）。`onResultPlaying` 不需要改动——它已发送 `{kind:'RESULT_PLAYING',
text: context.narrationText}`（DEV-009 起就有），结算叙事直接复用，不重新设计。

## D2 — 用 `commandSeq` 大小比较决定显示来源的理由

场景旁白（来自 `SCENE_ENTER.narration`）与结算叙事（来自 `RESULT_PLAYING.text`）在渲染侧是
同一套对话框的输入，但两者不会同时出现：某一时刻要么在场景里展示旁白，要么在结算后展示叙事。
`commandSeq` 是 DEV-012 冻结的 Presentation 命令信封上单调递增的序号，"最近发生的是哪一个"天然
由较大者给出——新场景覆盖旧结算文本，新结算文本覆盖旧场景旁白。`pickDialogueLines` 分别记录最近
一条 `SCENE_ENTER` 与最近一条 `RESULT_PLAYING` 的 `commandSeq` 与内容，谁的 `commandSeq` 更大
就用谁。这比"按命令到达顺序取最后一条非空"更精确：`commandSeq` 与到达顺序同构，但明确以序号为
锚，避免对命令数组的隐式顺序假设，也与 DEV-012 `commandSeq` 信封的语义对齐。两者都不存在时返回
`{lines: [], key: 0}`，对话框不渲染。

## D3 — `key` 的语义：检测"内容已换"从而重置阅读进度

`DialogueLines.key` 被设为产生这批 lines 的那条命令的 `commandSeq`。`App.tsx` 里
`useEffect(..., [dialogue.key])` 依赖它——当进入新场景或新结算时 `key` 变化，本地 `lineIndex`
状态重置为 `0`，从第一行重新读。若只用 `lines` 数组内容做依赖，则"进入内容相同的另一个场景"
（如两场景共用旁白文本）时不会触发重置；用单调递增的 `commandSeq` 作为 key 则每次都精确代表
一次全新的对话批次，无论文本是否巧合相同。`SCENE_ENTER` 未携带 `narration` 字段时视为空数组
返回 `{lines: [], key: seq}`，此时对话框不渲染（行数为 0）。

## D4 — 不做"读完所有旁白才能继续剧情"的门控（已知边界，如实记录）

本节点**不实现**"读完旁白才能继续"的节奏门控。真实原因是结构性的：Renderer 目前没有任何向
Runtime 回传信号的通道——唯一入站钩子是 DEV-020 的 `onRendererHello`，它的语义是重新握手/请求
RESYNC，不是"我看完了这段对白"。要做门控，Runtime 必须新增一个 `RootEvent`（如
`DIALOGUE.DONE`）并接入 Packets/Region，那是一次新的架构决策与新的入站通道，不在本节点窄范围
CR 的边界内（Task Package 2.2 节 Non-goals 明确）。本节点的正确边界是：Renderer 能展示并点击
推进对白（`nextLineIndex` 前进、末行不再前进），但内容是否推进剧情仍由 Runtime 既有的
`NARRATIVE.DONE`/`STORY.DONE` 等事件驱动，与读没读完对白解耦。真正的节奏门控如果未来需要，由
Commander 在需要新增 `RootEvent` 的节点（或一次 `CHANGE_REQUEST`）中另行设计，不在本节点顺带做
掉。

## D5 — 端到端验证（A08）：不改动 Read-only 的 `machine.test.ts`

本节点 Writable Scope 里 runtime-kernel 只有 `machine.ts` 一个文件（且只增一行），没有任何新
授权测试文件；`machine.test.ts` 明确零改动（A09）。因此 CR #3 的端到端验证（驱动真实 actor 到
`SCENE_ENTER`，确认命令含 `narration` 且与 `scene-start.json` 一致 `["你站在森林入口。"]`）
作为执行期的运行时校验执行并记录原始输出于 REPORT.md，不新增/修改任何 runtime-kernel 测试文件
（新增即越界 DEVIATION）。渲染侧 `pickDialogueLines` 的四种输入组合行为已由 `pickDialogueLines.
test.ts` 单元覆盖（A10）。

## D6 — 分页推进：纯函数 + 本地状态，不做打字机

点击推进对当前行的读取与推进全部收口在两个纯函数 `clampLineIndex`/`nextLineIndex` 里，
`App.tsx` 只用本地 `useState` 存 `lineIndex`、点击时调 `nextLineIndex` 推进。任务包明确不做打字机
逐字显示（分页显示整行即可，§10 Non-goals），避免富文本/动画库——`lines[]` 只是字符串数组，纯
CSS/React 即可。`nextLineIndex` 在最后一行时不再前进（夹取到 `lines.length - 1`），保证点击不会
越界。
