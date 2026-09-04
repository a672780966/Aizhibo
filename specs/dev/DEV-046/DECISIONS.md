# DEV-046 DECISIONS

本文件记录 DEV-046（Twitch Send Chat）实现中的工程决策。Task Package
第 6 节要求至少覆盖：为何不提供健康探测函数、为何不做本地消息校验/
截断/重试、为何不接入 `runtime-kernel`/`PlatformPort`（CR-010，留给
DEV-050A）。

## D1 — 不提供健康探测函数（发消息副作用不可接受）

`getTwitchAuthHealth` 式主动健康探测在 `twitchAuth.ts` 里可行，是因为
取 token 是**无副作用的读操作**：探测只是再做一次 refresh-token 换取
access-token，不改变任何外部可见状态。`sendChat` 不具备这个前提——
每一次调用都会向 Twitch 频道的真实聊天室**公开投递一条消息**。若提供
`getTwitchSendChatHealth()` 并在健康检查/轮询路径上被周期性调用，等于
在每次探测时向观众刷屏，污染频道聊天流并可能触发 Twitch 的速率限制，
副作用完全不可接受（Task Package §2.1/§10 明示）。真实接入点（谁在
什么时机发消息）是上层编排（未来 Egress Gate）的职责，本节点只提供
按需调用的 `sendChat`，诚实失败由 `noopTwitchSendChat` 占位。

## D2 — 不做本地消息校验/截断/重试

三条本地逻辑全部不做，理由一致：**Twitch Helix API 本身就是校验
权威**。消息长度、非法字符、慢速模式（slow mode）、非广播者发言等
限制，服务端都会通过响应体（`is_sent:false` + `drop_reason`，或
4xx 状态码）诚实返回，本节点已把失败原因如实映射进
`{ok:false, reason}`。在本地复制这套规则属于**凭空发明未经核实的业务
规则**：Twitch 的限额与规则随频道配置（慢速模式开关、moderation 设置）
动态变化，本地副本必然失准，且重复逻辑两处维护只会引入漂移。不重试
同理：非 200/`is_sent:false` 是服务端已受理并给出明确裁决的结果，
自动重发同一条消息可能造成重复投递或绕过频道 moderation 意图，
宁可让调用方（未来的 Egress Gate）根据语义决定是否重试。

## D3 — 不接入 runtime-kernel / PlatformPort（CR-010，留给 DEV-050A）

`runtime-kernel` 的 `PlatformPort.sendChat`（`ports.ts`，Read-only）与
本节点 `createTwitchSendChat` 形状相近，但本节点**不接线、不 import/
依赖 `runtime-kernel`**。约束 CR-010（`specs/dev/DAG.md` 第 264 行）明确：
本节点不得暴露任何 Host 可直接调用的出站接口——一旦把
`createTwitchSendChat` 挂进 `PlatformPort`/`runtime-kernel` 调用点，
`ai-host` 就拿到了绕过编排直接向 Twitch 发消息的通道，破坏
"Host 的一切对外副作用必须经 Egress Gate 裁决"的架构边界。该接线
（含"何时允许发、发什么"的策略）是未来 M5 DEV-050A Egress Gate 的
职责，本节点只交付可注入、可测试的发送原语本身。依赖方向保持与
DEV-035/037/040 先例一致：`platform-twitch` 是被消费的中立包，零
workspace 依赖。
