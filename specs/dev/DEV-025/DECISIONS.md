# DEV-025 DECISIONS

## D1 — LOOP 是本地视觉过渡，不是真实等待

`onResolve` 的掷骰计算（`resolveGroups`）是同步瞬间完成的——当前根本没有"骰子在滚动中"
这段时间。本节点的 `LOOP` 阶段（`App.tsx` 的 `rolling` 状态 + CSS 循环动画）是 Renderer
本地用固定时长播放的纯展示动画：收到 `DICE_INTRO` 进入"摇骰中"视觉状态，维持到
`DICE_RESULT`（真实数据）到达为止。**不是**在等待真实计算，也不引入任何人为延迟/最短
时长——那是节奏控制，属于 DEV-037（Dice Buffer Controller，M3）的职责边界：
"常态按 `targetDiceMs` 走叙事节奏"。本节点严格不越权实现。

## D2 — `DICE_RESULT` 字段裁剪：只下发展示字段

只下发展示所需的五个字段：`diceType`/`rawValue`/`modifier`/`finalValue`/`quality`；
丢弃 `seed`/`rollIndex`/`appliedModifiers`（重放/内部记账字段，不用于展示，与 DEV-024
丢弃 `Choice.actionType`/`ruleId` 同一原则）。

且这些字段本来就是 `DICE.PUBLISHED`（`visibility: 'PUBLIC'`）已经承认对观众公开的信息
——本节点只是把已经判定为公开的数据从 Event Log 也转发一份到 Presentation 通道，**不
构成新的信息泄露**。`seed` 虽在 `DICE.ROLLED`（HIDDEN）里出现，但它从未以 PUBLIC 可见
性存在过，因此不下发。

## D3 — `quality` 可能是 `undefined`：picker 边界过滤

`resolveQuality`（dice-engine，冻结）对 `finalValue` 不在任何阈值区间时返回 `undefined`
——合法章节若骰面区间未被阈值覆盖，wire 上可能出现 `quality: undefined`。`DiceResultView`
接口按任务包定为 `quality: string`（渲染格式要求 quality 标签），因此 `pickDiceState` 的
`toResultViews` 对缺任一展示字段的元素整体丢弃。这是展示层防御（输入来自网络信道），
不改变 Runtime 侧已经发布的数据本身。合法章节的阈值应覆盖骰面全区间（`valid-minimal`
的 d20 阈值覆盖 1–20），此边界属异常数据降级而非正常路径。

## D4 — 当前 INTRO 与 RESULT 在实际命令流中相继到达

由于掷骰同步瞬间完成，`DICE_INTRO`（`LOCK`）与 `DICE_RESULT`（`LOCKED`）在实际正向
命令流中几乎紧接着到达，LOOP 摇骰动画可能只闪现极短时间。这是**预期的诚实边界**而非
缺陷：任务包第 1 节明确"本节点的 `LOOP` 阶段是……本地……纯展示动画……**不是**在等待
真实计算"。真正把"摇骰子的观感时长"接入叙事节奏是 DEV-037 的职责；届时 LOOP 只需把
本地 CSS 动画的推进参数接到缓冲控制器即可，`pickDiceState` 的 INTRO/RESOLVE 两态接口
无需变更。

## D5 — 与 DEV-037 的边界

- 本节点（DEV-025）：`onLock`/`onResolve` 两处窄范围 CR 让骰子数据首次流向
  Presentation；渲染器做 INTRO → LOOP → RESOLVE 三阶段展示。不实现任何节奏控制、
  延迟安全阀、`targetDiceMs`、缓冲队列。
- DEV-037（M3，任务包引 DAG.md）：Dice Buffer Controller——重定位为节奏控制器 + 延迟
  安全阀。届时才把"摇骰子观感时长"接到叙事节奏。
- 本节点不预言 DEV-037 的接口；`DICE_INTRO` 是纯信号（无载荷），`DICE_RESULT` 只带
  展示字段，两者均为稳定、可扩展的载荷形状，缓冲控制器若需追加内部字段属 DEV-037
  自己的 CR，不反向改本节点已下发的字段。

## D6 — 渲染器不读章节文件（CR-008 纪律延续）

`pickDiceState` 只从已接收的 `PresentationCommand[]` 挑选数据，不接触任何章节文件、
`WorldState` 或 Runtime 内部结构（与 `pickDialogueLines`/`pickInteractionOpen` 同款
模式）。展示所需的全部信息（包括 quality 标签）由 Runtime 侧在 `onResolve` 中解析
完毕后随命令下发。