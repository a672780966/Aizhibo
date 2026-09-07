# DEV-061 DECISIONS

本文件记录 DEV-061（Health System，M6 第二个节点）施工中做出并落
库的决策。Task Package 第 6 节要求至少覆盖五个"为何"要点，逐条
以真实理由说明如下。

## D1 — 为何不硬编码接入仓库里已有的 6 个真实 getHealth 实现

仓库里目前确实已有 6 处真实的 `getHealth` 实现：
`persistence`（`getHealth(db): Health`，同步）、`host-memory`
（包装 persistence，同步）、`platform-twitch` 的 `EventSubClient`
（`getHealth(): Health`，同步）、`ai-host` 的 `HostLLMProvider` 与
`HostTtsProvider`（`getHealth(): Promise<Health>`，异步）。它们都
是 CR-019（DAG.md 第 466 行"每个模块自落地起就实现 getHealth()，
不等到 DEV-061"）的产物，各自分散在各包内。

但把它们收拢成一个运行中的聚合视图，需要一个把这些**存活实例**
一起装配进同一个进程的地方——一个生产入口点。这个入口点当前在
仓库里**不存在**：没有任何文件同时构造
`persistence`/`host-memory`/`platform-twitch`/`ai-host` 的真实实
例并让它们长期运行（renderer 只消费 PresentationCommand，各包的
实例化发生在未来的生产装配节点）。没有装配现场，就没有真实的地
方可以 `register()` 这 6 个来源，硬编码接入的后果只能是凭空发明
一个假的"注册点"：要么把模块级单例塞进本包（引入隐藏的初始化
顺序与重复实例化问题），要么制造一个永远不会被调用的死配置。

这与 DEV-060A 的 Restore LKG 决策（D7："止于重建+报告，不做热替
换"）是同一个现实约束的两种体现：DEV-060A 没有真实进程可以热替
换，本节点没有真实进程可以注册。因此本节点交付的只是通用、零业
务耦合的聚合原语（`HealthSource`/`HealthRegistry`/
`createHealthRegistry`），不 import `persistence`/`host-memory`/
`platform-twitch`/`ai-host` 中任何一个；谁在未来某个生产装配节点
把真实实例 `register()` 进来，是那个节点的职责。本包的类型系统
保证：届时任何实现了 `getHealth(): Health | Promise<Health>` 的现
有模块实例，无需改动即可被注册。

## D2 — 为何聚合规则是"最差状态优先"（DOWN > DEGRADED > OK）

`Health.status` 是 DEV-000 冻结的固定三值有序字段：
`'OK' | 'DEGRADED' | 'DOWN'`。把多个来源的健康状态合成一个整体
状态，这三个有序取值**唯一**自洽的组合方式是取其中最差的那个：
任何其他规则（取最好、取多数、取平均……）要么把"某个来源已
DOWN"的事实藏起来（整体却报 OK/DEGRADED），要么需要发明一个这
三个值里不存在的中间结果。整体视图的用途是"有没有东西需要
人注意"——只要有一个来源 DOWN，整体就该 DOWN，这正是有序三态
所编码的语义的自然读出，不是在多种同样合理的方案里挑一个的
业务规则。类似 DEV-051"Priority 取现有信号最简单可论证的组合"
的裁定精神，因此不需要就此单独征询 USER 意见。

## D3 — 为何 HealthSource.getHealth() 允许同步返回或异步返回两种形态

仓库里真实的 `getHealth` 实现是**真实混合**的：`persistence` 的
`getHealth(db)` 与 `platform-twitch` 的 `EventSubClient#getHealth()`
是普通同步函数直接返回 `Health`；`ai-host` 的
`HostLLMProvider`/`HostTtsProvider` 是 `async` 函数返回
`Promise<Health>`。这些模块都已冻结（本节点 Forbidden Scope 明确
禁止修改它们），强迫统一成单一约定意味着要么改已冻结模块的签名，
要么在聚合器里对同步来源做无谓的包装。

因此 `getHealth(): Health | Promise<Health>` 让接口如实反映既有
现实，调用侧统一用 `await`（`await` 一个非 Promise 值只是立即
resolve 为该值），同步与异步来源在同一个 registry、同一次
`getAggregateHealth()` 调用里透明混用——本包的测试用例 7 正是为
此而设。不强制单一约定 = 不改任何已冻结模块。

## D4 — 为何不新建任何 HTTP 端点、不接入 operator-api 的 HTTP server

聚合结果的**消费方**目前不存在。Dev Spec 第 52 节 Operator
Console Overview 页面列出的 "Errors"/"Host"/"Platform" 等展示字
段属于 DEV-060B（Console UI）的职责，而 DEV-060B 已被 CR-013 后
置、尚未开工；operator-api（DEV-060A）的 11 个 action 里也没有任
何一个需要读健康聚合。没有消费者，现在建一个 `GET /health` 之类
的端点就是纯投机：接口形状、鉴权方式、刷新语义全部无从定起，建
出来只会被未来的真实消费者推翻重做。

同 D1 的理由结构：本节点交付可被未来端点直接调用的同步原语
（`getAggregateHealth()` 本身已是 `Promise<AggregateHealth>`，任何
HTTP handler 一行即可接入），端点本身等 DEV-060B 或生产装配节点
再建。

## D5 — 为何空 registry 的 overall 默认为 'OK'

当调用 `getAggregateHealth()` 时没有任何来源被注册，循环体一次也
不执行，`worst` 保持初始值。初始值选 'OK' 的理由：空 registry 意
味着**没有任何已知不健康的东西**——'OK' 不是声称"全部健康"
（没有来源可声称），而是"没有已知问题"这一事实的最简编码。
Dev Spec 对空集合的聚合结果未作定义（第 61 节正文为零），因此在
'OK'/'DEGRADED'/'DOWN' 三者中取最简单可论证的默认值，即"最不惊
讶"的 'OK'；若未来出现"空 registry 应显式区别于健康"的需求
（例如 Watchdog DEV-063 需要区分"没数据"与"全健康"），届时再以
CR 引入一个独立的表示，不需要预埋。
