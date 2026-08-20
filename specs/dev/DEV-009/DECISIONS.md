# DEV-009 DECISIONS

本节点的架构设计决策（Task Package §2 + §9），以及实现细节。随最终提交入库。

## D1 — XState 版本选择（T002）

选用 **XState v5，`^5.32.5`**（当前 `latest` 5.x）。理由：

- 本节点是项目第一次引入 XState，v5 的 `createMachine`/`createActor`/`parallel`/`always`/`assign`/
  `guard` 直接支撑本任务需要的并行 Region + 确定性转移 + 上下文更新。
- v5 的 `always`（transient）转移非常适合"确定性自动推进"：compile 完成 → SCENE_ENTER →
  STORY_PLAYING 等无外部等待的步骤可在同一次事件内自动级联。
- 本机器的 determinism 约束（无裸 `Date.now`/`Math.random`）与 XState 的纯转移模型契合：所有
  时间戳走注入的 `ClockPort`，骰子走 `dice-engine` 纯函数。
- 不用 v4（旧 API）、不用 v6 alpha（未稳定）。

## D2 — CR-004 IO Port 注入（T003）

四类 IO 边界全部抽成可替换接口，机器构造时注入（`createRuntimeMachine({ ports })`），不硬编码真实
系统（Task Package §2.2）：

- `ClockPort.now()` — 替身 `Date.now()`；`systemClockPort` 用真实时间，测试可注入虚拟时钟。
- `PlatformPort.onVote/sendChat` — 观众输入/聊天出口；`noopPlatformPort` 为空实现。
- `PresentationPort.send(command)` — Renderer 命令出口（M2 未建），`noopPresentationPort` no-op。
- `AudioPort.send(command)` — 音频命令出口（M3 未建），`noopAudioPort` no-op。

`defaultPorts` 用四个默认实现；`createRuntimeMachine` 用 `{ ...defaultPorts, ...input.ports }` 合并。
**DEV-007（Chapter Simulator）将来复用同一个 `createRuntimeMachine`，只覆盖 ports（虚拟观众/虚拟
时钟/空实现），是这一设计的前置**（CR-004 对 DEV-007 复用性的要求）。

## D3 — Snapshot 不透明类型 + 访问器（CR-008，§2.3，A08）

CR-008 要求 Snapshot 的每个字段在类型层面携带可见性分类。本节点**不做逐字段类型标注系统**（那需要
发明一整套类型层基础设施，成本远超收益），改用**不透明品牌类型 + 具名访问器**：

- `packages/runtime-kernel` 公开 `index.ts` **不导出**内部结构类型（`InternalSnapshot`、真实形状、
  `unwrapSnapshot` 均不 export）。
- 导出 `type RuntimeSnapshot = { readonly __brand: 'RuntimeSnapshot' }`——与 `InternalSnapshot`
  结构不兼容，外部无法写出 `snapshot.world.flags.x`。
- 只导出具名访问器 `getStoryPhase`/`getInteractionPhase`/`getSequenceNumber`（另加
  `getRuntimeSnapshot(actor)` / `getEventLog(actor)`），每加一个"外部允许知道的东西"就显式写一个
  访问器。
- 测试用 `@ts-expect-error` 证明 `RuntimeSnapshot` 不能当 `{ world: WorldState }` 用（A08）。

这不是最终的 Public/Hidden 投影——`getPublicState()` 读投影是 DEV-050（M5）的职责；本节点只是
"防止意外全量暴露"的结构性防线（G06 的第二道防线：编译期 DEV-002A 已做，运行时读投影 DEV-050，
本节点在两者中间提供类型层护栏）。

## D4 — 确定性：种子派生公式（§2.4，A16）

机器内部不出现裸 `Date.now()`/`Math.random()`。事件时间戳全部经 `ClockPort.now()`。骰子随机性已由
`dice-engine`（seed + rollIndex 纯函数）解决，本节点只提供参数。**派生公式**（T006）：

```
dice-engine 调用 seed   = `${baseSeed}:${groupIndex}`
dice-engine 调用 rollIndex = snapshot.sequenceCounter + groupIndex
```

其中 `baseSeed` 是构造机器时传入的 `input.seed`，`groupIndex` 是 ActionGroup 在该轮内的下标，
`sequenceCounter` 是当前全局事件序号。同一 `(seed, chapterRootDir, 事件序列, 投票)` 永远重放同一
结果——这是 Replay（DEV-011）的硬前提。记入 DECISIONS（A17 明确要求记录此公式）。

## D5 — DICE 事件节奏简化（§2.4 / §9 #4，T006）

spec §8 强调 `ROLLED`（后台）与 `PUBLISHED`（骰子动画结束后）**时间必须分离**。本节点把这一分离简化为
**在同一次转移里依次产出 `DICE.REQUESTED`（PUBLIC）、`DICE.ROLLED`（HIDDEN）、`DICE.PUBLISHED`
（PUBLIC）三个独立事件**（每个 ActionGroup 一组），可见性正确，但没有等待逻辑——真正的"等骰子动画
播完才发 PUBLISHED"的节奏控制是 **DEV-037（M3）** 的职责。这是 Task Package §9 #4 明示的简化，如实
记录，不假装实现了节奏。

## D6 — Region 承担范围（CR-005，§2.1，T005–T009）

STORY 是相位唯一权威，其余 Region 只读它派生，不各自维护相位副本。实现深度按 Task Package §2.1：

| Region | 状态集 | 深度 |
|---|---|---|
| STORY | §6 十态（BOOT…ERROR） | 完整：compile/guard/next、SCENE_ENTER 发端口命令、每转移产事件 |
| INTERACTION | §7 六态 | 完整：投票覆盖、分组、dice+resolve+effect+compose、DICE 三事件 |
| PRESENTATION | LOADING/READY/FAILOVER | 骨架：转态 + Port 占位命令，不接真实 Renderer |
| AUDIO | IDLE/PREPARING/…/ERROR 六态 | 骨架：转态 + Port 占位命令，不接真实音频 |
| HOST / PLATFORM / SAFETY | 各单态 IDLE | 纯占位（M4/M5/M6） |

## D7 — 跨 Region 协调方式（T005–T009）

两 Region 通过**共享根 context 的 snapshot 相位字段 + 显式高层事件**协调，而不是互相发消息：

- STORY 进入 `INTERACTION_PENDING` 后，用 `always` guard `interactionResolved`（读
  `snapshot.interactionPhase === 'RESOLVED'`）自动推进到 `RESOLUTION_PENDING → RESULT_PLAYING`。
- INTERACTION 由测试/驱动方发 `INTERACTION.OPEN` 显式启动（CLOSED→ANNOUNCING→OPEN 自动），
  `LOCK` 触发 LOCKING→LOCKED(onResolve)→RESOLVED（自动）。
- 这样两 Region 都只读共享 context + 响应明确事件，避免 XState 并行 Region 间互发消息的脆弱性，
  同时保持测试完全确定性可控。

## D8 — Compile 失败/成功的分支（T005）

STORY `CHAPTER_LOADING` 的 `entry: onCompile` 同步调用 `chapter-compiler.compile(chapterRootDir)`
（读盘加载校验）；结果存入 context.compiled，随后 `always`：`compilePassed`（passed===true）→
`SCENE_ENTER`，否则 → `ERROR`。compile 抛异常也归为 ERROR（防御）。当前场景 id 取 `initialState.sceneId`
（缺失时回退 `manifest.entryNodeId`）。

## D9 — CR-019 健康查询的最低要求（§9 #8）

本节点是最早的"持续被调用"的运行时服务模块，CR-019（getHealth 自落地起）从本节点适用。按 Task
Package §9 #8 的**最低要求**执行：不新建 `getHealth()` 体系（避免过度设计），机器结构通过现成访问器
已能回答"当前 STORY 相位（`getStoryPhase`）、是否卡在 ERROR"。真正统一的健康检查形态留给 DEV-061
规划，本节点不深入。

## D10 — Event Log 累积（T010）

机器 context 持有一个全局 `eventLog: RuntimeEvent[]`，每个有意义的转移用 `emitLog` 追加事件并推进
**全局单调递增的 `sequenceCounter`**（不是每个 Region 各自计数）。`getEventLog(actor)` 返回
`eventLog.map(e => ({...e}))` 的浅拷贝——调用方改动返回值不影响机器内部状态（防篡改）。事件
`id` 为 `ev-<seq>`，`timestamp` 由 `ClockPort.now()` 转 ISO。这是 DEV-011（Replay）重建的依据，本
节点只保证 Event Log 本身单调且内容完整，不做重放验证（Non-goals）。
