# DEV-024 DECISIONS

## D1 — Choice UI 是"展示"非"交互"的产品事实：不做可点击按钮

已核对 Dev Spec 第 34 节：整个演出层使用 Web Renderer，OBS Browser Source 承载——Renderer
画面被 OBS 采集进直播画面，**观众看到的是直播画面，不能点击**。真正的投票输入来自 Twitch
聊天区（`platform-twitch`，M4，尚未建），最终变成直接发给 actor 的 `VOTE` `RootEvent`
（`viewerId`/`choiceId`）。因此本节点只做"把当前有哪些选项、对应打什么字母显示出来"
（`"[A] 跟随向导"` 格式，方便观众照着打），**不做可点击按钮，不产生任何投票**。这一产品事实
直接约束了 Writable Scope（`Forbidden Scope` 明文禁止任何可点击/可交互的选项按钮）与
`App.tsx` 的实现形态——渲染的选项是 `<p>` 文本行，不是 `<button>`。

## D2 — `visibleIf` 过滤必须在 Runtime 侧完成；多条件 AND 语义

某些 `Choice` 可能带 `visibleIf?: Condition[]`（按世界状态条件性可见）。判断可见性需要读
`WorldState`，而 `WorldState` 是不透明的（CR-008），Renderer 不能也不该拿到它——跟
DEV-021/022 的"Renderer 不维护剧情"是同一条纪律。因此可见性过滤在 Runtime 侧的 `onOpen`
完成，只把已过滤好的 `DisplayChoice[]` 下发。组合语义：对 `interaction.choices` 逐个判断，
`visibleIf` 未定义 → 可见；否则用 `rule-engine` 已冻结的 `evaluateCondition` 对数组内每个
`Condition` 做 **AND**（`every`，全部满足才可见）——与 `SceneGuard`/其它多条件字段的既有
语义一致（`stateRules.ts` 的多条件字段都是同一套"全部满足"约定），**不发明新的组合规则**。
可见的映射成 `{id, label}`，丢弃 `actionType`/`ruleId`/`visibleIf`（内部字段，不下发）。

## D3 — 倒计时允许用裸 `Date.now()`/`setInterval` 的理由

本地倒计时是纯 UI 反馈：不写入 Runtime Event Log、不参与任何游戏状态判定、不影响
`runtime-kernel` 的确定性（`VOTE`/`LOCK`/骰子等一切游戏状态转移仍由确定性事件驱动）。
这与 DEV-010 `getHealth()` 确立的同一区分原则一致——**确定性红线只约束"影响游戏状态/可
重放"的代码路径**，运维遥测与纯展示反馈不在其列。倒计时在 `App.tsx` 用 `useEffect` +
`setInterval` + `Date.now()` 实现，`key`（产生该批数据的 `commandSeq`）变化时重置。
**已知简化，如实记录**：本地倒计时可能与 Runtime 侧真实的互动关闭时刻有毫秒级漂移
（Renderer 不知道 `INTERACTION_OPEN` 命令实际发出的服务器时刻），不影响任何判定——真正
决定互动何时关闭的是 Runtime 侧的 `LOCK` 事件，不是这个倒计时。

## D4 — "不做实时票数展示"的已知边界

本节点明确**不实现**实时票数/计票展示。真实原因是结构性的：实时票数需要一个额外的批量/
限流机制设计（Twitch 聊天流速 × 票数下发节流 × 计票一致性），那是一次独立的架构决策，
不在第 2.5 节"展示已过滤选项 + 本地倒计时"的窄范围内。若未来要做，很可能是另一次 CR。
`PickInteractionOpen` 只消费 `INTERACTION_OPEN` 命令携带的静态选项数据，不订阅任何票数
类命令（当前 Presentation 命令流里也没有票数命令类型）。

## D5 — 端到端验证（A09）：不改动 Read-only 的 `machine.test.ts`

本节点 Writable Scope 里 runtime-kernel 新授权测试文件只有 `choiceResolution.test.ts`，
`machine.test.ts` 明确零改动（A10），也没有授权新增任何 machine 级端到端测试文件。
因此 T003/A09 的端到端验证（驱动真实 actor 到 `INTERACTION.OPEN`，确认命令含
`choices: [{id:'A', label:'跟随向导'}]`、`openDurationMs: 15000`）作为**执行期的运行时
校验**执行：临时脚本驱动 `createRuntimeMachine` + `valid-minimal` fixture + 捕获型
`presentation` port，打印原始输出记录到 REPORT.md，脚本运行后即删除、不进入仓库
（与 DEV-023 D5 同一先例——新增 runtime-kernel 测试文件即越界 DEVIATION）。

## D6 — `pickInteractionOpen` 的 `key` 语义与"新一轮"检测

`InteractionOpenView.key` 取最近一条 `INTERACTION_OPEN` 信封的 `commandSeq`（DEV-012 冻结
的单调递增序号）。`App.tsx` 的 `useEffect` 依赖它：新一批选项到来（`key` 变化）时把本地
倒计 时从新的 `openDurationMs` 重新开始；未到来时（首个 `INTERACTION_OPEN` 之前）
`pickInteractionOpen` 返回 `undefined`，选项区域不渲染。用 `commandSeq` 做 key 比用
`choices` 内容更精确——即使两次互动的选项文本巧合相同，`commandSeq` 也必然不同，倒计时
仍然正确重置。互动关闭后当前命令流**没有**"INTERACTION.CLOSED"类命令（DEV-012 已如实记录
"互动关闭无信号流向 Presentation"的既有缺口），因此视图会保留到最后一次 `INTERACTION_OPEN`
展示的选项与 0 秒倒计时，直到下一次互动开启——这是预期边界而非缺陷：真正决定互动何时关闭
的是 Runtime 侧 `LOCK` 事件，Renderer 侧倒计时到 0 只是展示反馈。