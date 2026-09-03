# DEV-037 DECISIONS

## D1 — `TARGET_DICE_MS=6000` 直接采用 Dev Spec 第 31 节示例值作为字面默认

Dev Spec 第 31 节把 `targetDiceMs` 定义为骰子节奏的"常态"目标值，且示例值
就是 6000ms。本节点是 `LOCKING` 占位状态（DEV-009 冻结）第一次被真正使用，
当时没有积累任何"真实观众节奏"观测数据可以校准这个值；CR-018 重定位为
"节奏控制器"后，规范给出的示例值就是当前唯一权威依据。因此
`diceTiming.ts` 导出 `export const TARGET_DICE_MS = 6000` 字面常量，直接作为
`DICE_PACING` 延迟的返回值——不引入配置文件、不引入运行时可调参数
（值当前没有任何消费方需要变化，可调性属于过度设计）。未来若真实
TTS/节奏观测出现需要校准，改这一个常量即可，所有消费方自动跟随。

## D2 — 不提前定义 `minDiceMs`/`maxDiceMs`

安全阀分支的语义是：`minDiceMs`（最短展示时间）、`maxDiceMs`（最长等待上限，
到达后降级）只有在"等待某个真实异步信号（如 TTS 就绪）"时才是有意义的
边界——没有那个异步等待，`min`/`max` 就退化成装饰性常量，定义了也没人消费。
Task Package 第 1 节已核对：DEV-030/031/034/035/036 一致地把"把 TTS 决策/
调用接入 `onResolve` 这条同步 action 链"列为未来重开边界，系统里至今不存在
`AUDIO_READY` 信号。因此本节点只导出当前真正被消费的 `TARGET_DICE_MS`，
`minDiceMs`/`maxDiceMs` 留给未来真正实现安全阀分支的节点一并添加
（见 D3），避免提前定义未使用的常量。

## D3 — 安全阀/AUDIO_READY 分支不在本节点实现

实现 `AUDIO_READY?` 就绪分支（就绪则 `DICE_RESOLVE`、未就绪继续 `DICE_LOOP`、
`maxDiceMs` 到达后降级）需要一个真实的"TTS 是否已就绪"信号。但把真实异步
TTS 接入 `onResolve` 是一次独立的、更大的架构 CR（Task Package 第 10 节
Non-goals 明确记录），至今没有节点做过这次重开，系统里根本没有那个信号。
本节点只能实现"常态"分支——固定按 `targetDiceMs` 暂停，不等待任何真实
信号。凭空实现安全阀等于为不存在的事件发明判断路径，既不可测（没有信号源
可以驱动 `AUDIO_READY`/`AUDIO_FAIL` 两条测试路径）也无法验证，是过度设计。
本节点的改动被刻意限制为：只改变"什么时候触发 `onResolve`"（`always` →
`after`），不改变"触发时算什么"（`onResolve` 内部计算逻辑逐字节不动）。

## D4 — `clock` 是独立参数，不塞进 `Ports`

`Ports`（`ports.ts`）是本项目的 IO 边界抽象（CR-004）：`clock`（时钟端口，
`now()`）、`platform`/`presentation`/`audio`/`audioResolution`，全是"业务
世界"的 IO。而 XState 的 `Clock`（`{setTimeout, clearTimeout}`）是 actor
调度器（延迟转移的内部定时机制）的注入点，是"状态机执行引擎"层面的概念，
不属于业务 IO。两者语义不同：`Ports.clock` 提供**时间读数**（事件日志的
`timestamp`），XState `Clock` 提供**定时器执行**（`after` 延迟何时触发）。
把 XState `Clock` 塞进 `Ports` 会让 Ports 接口混入执行引擎细节，且要求所有
`Partial<Ports>` 覆盖点（replay 的 ports 透传、simulator 的 ports 构造）都要
无谓地感知调度器。因此 `clock?: Clock` 作为 `createRuntimeMachine`/
`restoreRuntimeMachine`/`replayFromEventLog` 输入里的独立可选字段，透传给
`createActor` 的 options；不传时用 XState 默认（真实）时钟——生产行为，
"不传 = 真实延迟"是有意设计，不是遗漏。

## D5 — `Clock` 类型不来自 `xstate` 顶层导出，改为本地结构镜像

Task Package 第 2.3 节写法是 `clock?: Clock; // from 'xstate'`，但实测 XState
v5（5.32.5）的公共入口不导出 `Clock` 类型：`Clock` 接口只存在于内部声明文件
`dist/declarations/src/system.d.ts`，`index.d.ts` 的 `export * from
"./types.js"` 也不含它；package.json `exports` 映射只暴露
`.`/`./guards`/`./actions`/`./dev`/`./graph`/`./actors`/`./package.json`，
深度导入 `xstate/dist/declarations/src/system.js` 被 exports map 挡住
（实测 TS2307）。公共测试时钟 `SimulatedClock` 虽然 `extends Clock`，但导入它
来表示"可注入时钟参数"语义不对。因此 `machine.ts` 本地定义一个结构镜像
`Clock` 接口（`{setTimeout(fn, timeout); clearTimeout(id)}`，与 XState 内部
定义逐字段一致），公开导出供 `virtualPorts.ts`/`replay.ts`/测试复用；
`ActorOptions.clock?: Clock` 是结构类型，任意满足该形状的对象（含
`instantClock`、`SimulatedClock`）都能赋值通过。实现返回类型用 `unknown`/
入参用 `unknown[]` 而非 XState 源码里的 `any`，规避仓库
`@typescript-eslint/no-explicit-any` 规则，结构兼容性不变（实测可赋值给
`ActorOptions<...>['clock']`）。该偏差（Task Package 预期"直接从中导入"
不可行）记录于此。

## D6 — `MachineConfig` 泛型需显式收窄 `TDelay`

`machine.ts` 里 `config` 被显式注解为 `MachineConfig<RuntimeContext,
RootEvent>`，该注解把第 6 个泛型 `TDelay` 冻结为默认 `string`。而
`createMachine` 第二参 implementations 的 `delays: { DICE_PACING: ... }`
会驱动 `createMachine` 把 `TDelay` 推断为字面量 `'DICE_PACING'`——注解的
`string` 与推断的字面量冲突，TS2379 级联报错（`_out_TDelay` 等）。修法：
把 config 注解的第 6 个泛型显式写为 `'DICE_PACING'`（前面 5 个泛型用默认值
`ProvidedActor`/`ParameterizedObject`/`ParameterizedObject` 显式占位），使
config 声明的延迟名与 implementations 推断一致。这是 XState v5
`createMachine` + 显式注解 config + 命名 `after` 延迟三者的正确组合方式
（`setup().types.delays` 是另一条路，但本仓库自 DEV-009 起就用
`createMachine` 风格，不为此引入 `setup` 重构）。

## D7 — A08 验收的断言状态是 `RESOLVED` 而非 `LOCKED`

Task Package 第 11 节测试草案写"到点后转为 `LOCKED`"。实测：冻结的
`LOCKED` 状态有一条 `always: { target: 'RESOLVED', actions: 'onResolved' }`
瞬时边，与 `after` 转移在同一个微步批次内折叠，`LOCKED` 不是可稳定观测的
状态（既有全部 LOCK 测试观测到的就是 `RESOLVED`）。因此新测试断言到点后
`interaction === 'RESOLVED'` 且 `DICE_RESULT` 已发出；真正被证明的是 A08 的
意图——默认（生产）时钟下 `LOCKING` 确实停留到 `TARGET_DICE_MS` 边界
（提前 1ms 仍在 `LOCKING` 且 `onResolve` 未执行），不是意外仍瞬时。
既有 `LOCKED` 折叠语义未做任何改动（A09/A10 只允许 `LOCKING` 一处 diff）。

## D8 — 既有 LOCK 测试只追加 `clock: instantClock`，断言零改动

Task Package 第 2.6/9 节：已冻结测试里驱动真实 `LOCK`、经
`createRuntimeMachine`/`replayFromEventLog` 构造 actor 且未显式传 clock 的
用例，一律追加 `clock: instantClock` 字段；任何既有断言的判定逻辑不动。这与
D4 呼应：这些测试测的是业务逻辑（LOCK → 延迟后 resolve），不是调度器的真实
计时，注入立即时钟让它们恢复同步语义。追加点：`machine.test.ts` 9 处 LOCK
驱动构造、`presentationCommand.test.ts` 1 处（真实 actor 捕获演示）、
`replay.test.ts` 的 `driveFixedVote` 内部构造 + 4 处 `replayFromEventLog`
调用（replay 本身在 `LOCK` 后要推进到 `CHAPTER_END`，不注入会真实卡 6s）、
`simulator.test.ts` 1 处直接构造的 `split` actor（其余经 `runSimulation`
间接构造，已由 `simulator.ts` 内部注入）。`simulator.ts` 的 `runOne` 注入
`instantClock` 是 A11（仿真吞吐量不退化）的前提——10 万局仿真每次 LOCK 都
真实等 6s 会从分钟级恶化到不可用。

## D9 — 墙钟耗时验证方法

DEV-036 收尾时 `pnpm test` 全 workspace 实测 ~13s 墙钟（vitest 报告 105
files/560 tests）。本次施工后实测：105 files / **562** tests（560 + 2 个
DEV-037 新增），vitest Duration 10.73s、命令墙钟 12.3s——与 DEV-036 基线
同一量级，无秒级真实等待导致的显著变慢。persistence 的
`recovery.test.ts`（out-of-scope，未注入 clock）经 `restoreRuntimeMachine`
恢复一个 mid-LOCKING 的 actor：其断言全部是 LOCK 后**同步**的 snapshot
阶段比对，不等待 6s 延迟，实测该文件测试耗时 39ms、全 persistence 套件
128ms——pending 的真实 6s 定时器在测试进程结束后自然失效，不影响结果与
墙钟。该文件按 Constraint 7 不动（不在 Writable Scope），此观察记录于此。
