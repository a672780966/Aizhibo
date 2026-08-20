# DEV-007 DECISIONS

## D1 — 每局种子派生

`runSimulation` 为第 `runIndex` 局使用：

```text
seed = `${seedPrefix}-${runIndex}`
```

同一个 seed 同时传给 `createRuntimeMachine` 和 `generateVotes`。投票函数还把 `runIndex`、驱动步数与观众序号纳入哈希输入，避免不同局、不同轮次或不同观众得到隐式共享随机状态。

## D2 — 虚拟时钟

`virtualClockPort.now()` 使用模块内单调递增计数器，每次调用加 1，不读取 wall clock。它只替换 DEV-007 要求的 clock Port；presentation/audio 继续使用 DEV-009 的 no-op Port。

## D3 — PlatformPort.onVote 未接线发现

核对 DEV-009 冻结的 `machine.ts` 后确认 `context.ports.platform.onVote(...)` 从未被调用。VOTE 由外部直接 `actor.send({ type: 'VOTE', ... })` 注入；因此 `virtualPlatformPort.onVote` 保持故意的空实现，不在本节点修改冻结接口或状态机。`sendChat` 也保持已 resolve 的 no-op。

## D4 — 投票哈希实现

`simulatorVotes.ts` 使用本地 FNV-1a 风格的 32 位无符号哈希（`Math.imul` 实现溢出乘法）。它是纯函数，不依赖 `Math.random()`、`Date.now()` 或全局随机状态；哈希结果决定观众数量与每个 viewer 的 choice。选择本地实现是因为 dice-engine 的内部哈希没有公共导出，且本节点不应扩大既有包的 API。

## D5 — 默认值

- `maxSteps = 200`：足够覆盖当前最小 Chapter 的完整状态循环，同时对异常状态提供有限上界，避免测试进程空转。
- `minViewers = 1`、`maxViewers = 10`：提供至少一个有效投票，且保留小规模、可预测的虚拟观众群；调用方可覆盖以验证边界与分裂投票。
- `seedPrefix = 'sim'`：稳定、短且便于报告和复现。

## D6 — 作用范围

不重新实现 guard/transition，不修改 `storyRegion.ts`、`interactionRegion.ts` 或 Chapter fixture。Simulator 只读取相位、读取公开 choice 列表并向同一个 statechart 发送事件；Replay、Fuzz、Soak 与真实平台接入留给后续节点。
