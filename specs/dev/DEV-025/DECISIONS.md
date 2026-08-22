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

且这些字段的安全性来自 `onResolve` 内**显式手写、只含五个具名字段**的对象字面量（非
展开 `record`、非信任事件整体可见性标注）。冻结的 `DICE.PUBLISHED` 事件
（`machine.ts:349-352`）实际与 `HIDDEN` 的 `DICE.ROLLED` 共用同一未裁剪的 `record`
对象——同一 `record`（含 `seed`/`rollIndex`/`appliedModifiers`）被 `flatMap` 三次
复用、仅更换 `visibility` 标签：也就是说 `seed` 事实上以 PUBLIC 可见性出现在
`DICE.PUBLISHED` 里，PUBLIC 标注**不代表**该 record 的每个字段都已被审计为对观众
安全；`quality` 也从未在 `DiceRollRecordPayloadSchema`（`diceEvent.ts`，冻结）中被
声明为 `DICE.PUBLISHED` 的正式字段。这正说明本节点为什么不能简单转发/展开该事件
payload、而必须手写五字段白名单——`DICE_RESULT` 的安全性完全来自这一白名单选择。
（FIX-01 更正，依 `AUDIT_VERDICT` 消息 `0120` BLOCKING-01；代码行为不变，本节点
从未泄露 `seed`，但此前的论证文字确实错述了冻结代码的事实。）

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