# DEV-082 DECISIONS

## D1 — 为何新建 `packages/interaction-engine` 而不是继续往 `platform-core` 里加

`platform-core` 是**中立契约层**，被三个平台包（`platform-twitch`/
`platform-youtube`/`platform-bilibili`）共同依赖——它的出口是
`NormalizedChatMessage`/`ChatHandler`/`InteractionAggregator` 这类
平台无关形状。本节点的 fan-in 反过来要 **import 全部三个平台包**
（消费三个 `chatMessageAdapter.ts` 的 `ChatHandler` 包装函数与三个
`sendChat.ts` 的发送对象）；若把组合逻辑放进 `platform-core`，会形成
`platform-core → platform-twitch → platform-core` 的**循环依赖**。
这正是 DAG.md 冻结列表（`specs/dev/DAG.md:676`）把
`interaction-engine` 列为独立包、而不是 `platform-core` 子模块的原因：
依赖方向是 platform-core ← 三平台 ← interaction-engine（组合层在依赖
图最末端），任何落在 platform-core 里的组合都会反转这条边。

## D2 — 为何不重开 DEV-044 把聚合器放进 `platform-core` 而非 `interaction-engine` 的历史决策

`createInteractionAggregator`/`InteractionAggregator`/`Vote` 是 DEV-044
冻结、`verdict_ref: "0191"` 裁决 DONE 的接口，被广泛引用（`Vote` 形状
镜像 runtime-kernel 冻结的 `PlatformPort.onVote` 参数，future
composition root 直接复用）。该历史决策是否偏离 DAG.md 冻结包列表未
在 DEV-044 文档中论证过，但**重新搬迁纯属 churn**——本节点不重开。
本节点只是让 `interaction-engine` 这个一直闲置的保留包名**首次真正
投入使用**，承载它名字对应的真实职责（多平台消息路由/组合），与
"聚合器本体（解析原语）"性质不同，不构成对 DEV-044 决策的推翻：
聚合器本体留在 platform-core（中立契约层，被全平台共享），跨平台
组合（依赖具体平台包）落在 interaction-engine（依赖图末端）。

## D3 — 为何 `chatFanIn`/`chatFanOut` 是两个独立函数而不是一个统一 "Gateway" 对象

fan-in 依赖**聚合器状态**（单一 `InteractionAggregator` 实例 + 共享
`ChatHandler` 闭包，组装时创建一次）；fan-out 依赖**发送配置**（调用
方按平台可用性传入 `PlatformSendChat` 子集，`createTwitchSendChat`
需要 authPort/clientId/broadcasterUserId/userId，YouTube 需要
liveChatId，Bilibili 协议层面无发送能力只有恒失败常量）。二者的
生命周期（fan-in 随直播间开启创建一次；fan-out 每次 `sendChat` 是
无状态并发调用）、失败模式（fan-in 静默忽略非法文本；fan-out 把每
平台结果原样收集、平台间互不影响）、调用时机（入站消息回调 vs 出站
广播）完全独立。捆成一个对象是没有真实消费方需求的**投机分层**——
Task Package §2 明确不组装任何"统一 Gateway 顶层对象"，把
fan-in/fan-out/生命周期捆在一起是 composition root 的职责，本节点只
产出两个独立、可分别使用的组合函数（INDEX Forbidden Scope：不组装
任何跨平台连接生命周期编排）。

## D4 — 为何不适配 `runtime-kernel` 的 `PlatformPort`

把 `sendChat`/`onVote` 适配成 `PlatformPort`（connect/disconnect/
onVote/sendChat/getHealth 五件套）的签名是**组装/适配层**工作，历次
先例一致地把这层留给**未分配的未来 composition root 节点**：DEV-081
§9（"适配层是未分配的未来 composition root 职责"）、DEV-080 同。
本节点遵循相同边界：不 import/依赖 `runtime-kernel`，不新增对它的
workspace 依赖；只保证本节点的形状与冻结的 `PlatformPort.onVote`/
`Vote` 天然一致（`InteractionAggregator.onVote` 与
`PlatformPort.onVote` 同形状，DEV-044 注释已言明供未来编排节点直接
复用）——组合函数可被未来的 composition root 原样消费，不需要
本节点预做适配。重复展开论证无价值，只引用先例。

## D5 — 为何本节点测试不需要任何 `fetchImpl`/`webSocketImpl`/`clock` 注入

本节点是**纯组合层**：`chatFanIn` 只把三个平台已产出的平台无关
`ChatHandler` 包装函数接到同一个聚合器上，`chatFanOut` 只并发调用
调用方传入的 `PlatformSendChat.sendChat` 并收集结果——**本节点自身
不做任何 I/O**。真实网络行为（EventSub WebSocket 帧、YouTube 长轮询、
Bilibili 签名 HTTP + WS 帧）已在三个平台包各自的测试里用注入的假
`fetchImpl`/`webSocketImpl`/`clock` 验证过（DEV-040/041/046/080/081），
不重复验证。因此测试只需桩 `ChatHandler`（通过真实三平台包装函数喂
平台原始形状消息，断言投票汇入同一聚合器）与桩 `PlatformSendChat`
对象（断言按 config 平台键并发收集、结果原样、互不影响）即可覆盖
全部组合语义；引入 `fetchImpl`/`clock` 注入反而是为不存在于本层的
I/O 预埋测试基础设施。
