# DEV-080 DECISIONS

本文件记录 DEV-080（YouTube Adapter，M8 第一个节点）施工中的关键
决策。权威需求来源为 `specs/tasks/TASK-PACKAGE-DEV-080.md`（第 1 节
上下文、第 6 节 Key Decisions）。Dev Spec 第 46 节（
`specs/baseline/DEV_SPEC_V1.0.md:1767-1772`）对本节点只有两句「最终
产品预留」正文；真实职责定义来自 Task Package 第 1 节对
`liveChatMessages.list` 真实机制（长轮询 + `nextPageToken` 续传）的
澄清与 CR-017（`specs/audit/CR-RESOLUTIONS-001.md` 第 198-253 行）。

## D1 — CR-017「计划性修订」的对象是 Dev Spec 第 43 节从未落地的接口文字描述，不是任何已存在的代码类型

CR-017 措施三原文：

> `LivePlatformAdapter` v1 — 由 Twitch 单一实现推导，**未经第二实现
> 验证**。DEV-080 首个异构平台落地时进行一次计划性修订，该修订是预期
> 事件，不是设计失败。

经直接读源码确认：**`LivePlatformAdapter` 从未在代码里组装过**——它
只是 Dev Spec 第 43 节的一段接口声明。DEV-042（`platform-core` 建造
节点）已明确裁定不组装它，`specs/dev/DEV-042/DECISIONS.md` D2（第
17-24 行）：

> 完整 Adapter 还缺 DEV-046 的 `sendChat`，需要多节点合作才能拼出。
> 在无消费方时提前定义接口是投机性抽象（YAGNI）。

`specs/dev/DEV-042/ACCEPTANCE.md` A14 同样确认 "platform-core 未定义
LivePlatformAdapter"；DEV-046 之后也未补上（其 `DECISIONS.md`/
`REPORT.md` 均无 `LivePlatformAdapter` 字样）。因此本节点不需要
（也不可能）「修订」一个不存在的代码类型；真正落地、需要遵守的是
CR-017 措施一已冻结的窄契约——`packages/platform-core/src/index.ts:4-12`
的 `NormalizedChatMessage`/`ChatHandler`。`platform-twitch` 自己也是
五个独立、由调用方自行组合的模块，从未组装成一个顶层 Adapter 对象；
本节点沿用同一分解模式（D4 排除不适用的去重层后）。

## D2 — 不照搬 `eventSubClient.ts` 的 WebSocket 八态机作为 YouTube 的状态拓扑

`eventSubClient.ts` 的八个状态（`DISCONNECTED/CONNECTING/WELCOME/
SUBSCRIBING/CONNECTED/RECONNECTING/DEGRADED/ERROR`）是 Dev Spec 第
45 节给出的 **Twitch 专属**权威状态列表——第 46 节没有任何对应列表。
机制也从根本上不同：YouTube `liveChatMessages.list` 是**长轮询**（响应
携带 `nextPageToken` + `pollingIntervalMillis`，客户端按间隔发起下一
次请求），不是 WebSocket 会话；没有 welcome 帧、没有 keepalive
watchdog、没有 reconnect_url。照搬八态机到长轮询上等于为不存在的
会话机制发明状态拓扑。本节点只用真实机制如实反映的最小三态：
`STOPPED`（未连接/已断开）、`POLLING`（轮询进行中或已按
`nextPageToken` 排定下一次请求）、`ERROR`（凭据失败/请求失败，不
自动重试——同 `eventSubClient.ts` 订阅创建 "不重试" 先例，重连策略是
未来节点职责）。

顺带如实记录一个机制推论（实现注释同款）：响应不再携带
`nextPageToken` = YouTube API 告知直播聊天已结束，此时停止轮询回
`STOPPED`——这是真实 API 行为（聊天关闭后响应不再带游标）的直接
映射，不是错误，不进 `ERROR`。

## D3 — `receivedAt` 使用消息自带的 `snippet.publishedAt` 服务端时间，而非像 Twitch 一样用本地时钟收到时间

`normalizeTwitchChatMessage` 的 `receivedAt` 只能来自注入时钟在
WebSocket 收到帧那一刻的记录——Twitch 的 `TwitchChatNotification`
载荷没有任何服务端时间字段。YouTube 的 `liveChatMessages` 资源**真实
携带** `snippet.publishedAt`（服务端权威时间，ISO 8601），两平台字段
可用性不同，不能套用同一处置：直接 `Date.parse(message.publishedAt)`
作为 `receivedAt` 比伪造/复用本地轮询到达时间更准确——本地轮询到达
时间因 `pollingIntervalMillis` 存在系统性滞后，不是消息真实发生时间。
`Date.parse` 失败（NaN）视为转换失败返回 `undefined`（同 Twitch 字段
缺失/类型不对时的诚实失败先例）。注：本节点因此也不使用注入
`clock.now()`（Clock 镜像保留可选 `now?` 成员仅为与测试假时钟双向
结构兼容，同 `eventSubClient.ts` 先例）。

## D4 — 不新建去重逻辑：`nextPageToken` 游标机制与去重目标重叠，重复实现是发明不存在问题的解决方案

Twitch 的 `messageDedup`（DEV-041）是为应对 WebSocket 重连场景下
EventSub 可能重复投递同一通知。YouTube 的 `nextPageToken` 分页游标
机制本身就保证每次轮询只返回「上次游标之后」的新消息——不存在同等的
重复投递问题。为不存在的问题发明解决方案违反本仓库纪律，故本包
**没有** `messageDedup.ts` 或任何等价模块（A19）。多平台差异也佐证
去重无法在 platform-core 窄契约层统一实现：它是平台连接机制的具体
产物，属各 `platform-*` 包内部事务。

## D5 — 不新增 `googleapis`/`google-auth-library` 依赖：延续零 SDK 手写 fetch 先例

Google OAuth2 token 端点（`https://oauth2.googleapis.com/token`，
`grant_type=refresh_token`）与 YouTube Data API v3
`liveChatMessages.list`/`liveChatMessages.insert` 都是标准 HTTPS
JSON 接口，Node ≥22 原生 `fetch`/`URLSearchParams`/`Response` 已足够
构造请求与解析响应。`specs/dev/DEV-040/DECISIONS.md` 第 9-10 行
原文理由直接适用：

> 新增依赖只会扩大攻击面与维护面。

与 `platform-twitch`/`audio-engine` 零依赖先例一致，本包同样保持
**零第三方依赖**（`package.json` `dependencies` 恰为
`@interactive-story/platform-core` workspace 一项，A07）。依赖越少，
DEV-081/082/083 同族节点与未来安全审计的维护面越小。

## D6 — 全部测试注入假 `fetchImpl`/`clock`，零真实网络调用；凭据缺失降级 noop，不阻塞本节点关闭

同 Twitch/ElevenLabs 先例：测试对 `createYoutubeAuthProvider`/
`createLiveChatPoller`/`createYoutubeSendChat` 一律注入假 `fetchImpl`
（vi.fn 返回手写 `Response` 或抛错）与假 `clock`（只登记不触发的
FakeClock，手动 run 断言 `nextPageToken`/`pollingIntervalMillis`
排定），**不触发任何真实 HTTP 请求**（A18）。真实账号/密钥继续占位
处理：`createOptionalYoutubeAuthProvider(env)` 在
`YOUTUBE_CLIENT_ID`/`YOUTUBE_CLIENT_SECRET`/`YOUTUBE_REFRESH_TOKEN`
任一缺失时返回 `noopYoutubeAuthPort`（`getAccessToken()` 恒为
`{ok:false}`），与 `createOptionalTwitchAuthProvider` 精确先例一致。
USER 已就 M8 明确裁决「不要让任何真实数据阻碍完成」，本节点严格照此
落地，凭据供给（真实密钥注入/轮换）列入 Out of Scope 未来节点。

## D7 — 轮询「episode」代数守卫：断开后重新连接期间，上一 episode 晚到的 token/响应不得驱动新 episode

实现用自增 `generation` 代数标记每次 `connect()`：token 获取与轮询
响应的每个异步续点都校验「state 仍为 POLLING 且代数未变」，否则丢弃
结果——同 `eventSubClient.ts` 注释「晚到的 OK/FAIL 不再驱动状态机」的
处置。不需要额外的单飞/去重标志：同一 episode 内下一次轮询只在上一
次完成后才被排定（定时器只在 `pollOnce` 末尾创建），重复 `connect()`
由 POLLING 状态守卫拦截，结构上保证同一时刻至多一个在途请求。A11
测试中 `disconnect()` 取消挂起定时器（A14）与旧响应迟到（晚到被丢弃、
新 episode 链路不受污染）均有断言覆盖。
