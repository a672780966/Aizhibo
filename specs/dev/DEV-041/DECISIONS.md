# DEV-041 DECISIONS

本文件记录 DEV-041（EventSub Client）施工中的关键决策，按 Task Package 第 6
节要求覆盖全部要点。权威依据：Task Package 第 1/2/9 节、Dev Spec 第 44/45 节、
DEV-040 冻结接口、DEV-037 Clock 形状、既有节点先例（DEV-035/036/037/040）。

## D1 — 用 XState v5 建模连接生命周期

**决策**：用 `createMachine`/`createActor`（xstate `^5.32.5`）把八态
（DISCONNECTED/CONNECTING/WELCOME/SUBSCRIBING/CONNECTED/RECONNECTING/
DEGRADED/ERROR）建模为显式状态机，`connect()`/`disconnect()` 通过 send
事件驱动，`getState()` 读 actor snapshot。

**理由**：
- Dev Spec 第 45 节把 EventSub 连接定义为**固定状态拓扑 + 显式转移边**，
  这正是状态机而非自由回调的自然建模对象；八态中 ERROR/DEGRADED/
  RECONNECTING 的进入条件（凭据失败、订阅失败、watchdog 超时、reconnect
  信号）分散在多个异步回调里，用机器集中表达可让"哪些状态下哪些事件可达
  哪些目标态"成为可审查的单一事实源。
- **复用仓库既有工程风格**：`xstate@^5.32.5` 已是 `runtime-kernel` 的已审查
  依赖（`machine.ts` 用 createMachine/createActor/assign 组织 region），
  本节点不是引入新库，而是 monorepo 内第一次把已审库用到 `platform-twitch`；
  region 式声明与 machine.ts 的既有可读性一致。
- 八态的可达性本身是验收项（A07/A12/A13）：机器声明让"每个状态是否真的被
  某条代码路径进入"可以直接测试，避免 DEV-009 VERDICT F-04 类"状态存在但
  从未被真实进入"的缺陷。

**代价/边界**：机器只负责状态拓扑；真实 I/O（WebSocket 事件、Helix HTTP、
watchdog 定时器）全部在 actor 外的注入函数里完成并翻译成事件 send，保持
机器纯声明、可注入测试。

## D2 — Clock/Health 本地镜像，不跨包 import

**决策**：`Clock`（setTimeout/clearTimeout/now?）与 `Health`
（status/lastSuccessAt/latencyMs/error）都在 `eventSubClient.ts` 内本地定义
结构镜像，不从 `@interactive-story/runtime-kernel` / `@interactive-story/shared`
import。

**理由**：Constraint 7 与 Task Package 第 2.1 节明确要求本地镜像（与
DEV-035/037/040 先例一致）。理由有三：
1. `platform-twitch` 保持**零 workspace 依赖**（只依赖 `xstate`），避免为
   两个小类型引入包间耦合；结构类型天然兼容，消费方无需关心来源。
2. XState v5 的 `Clock` 本就不对外导出（runtime-kernel machine.ts 注释已说明
   其 `Clock` 是结构镜像），跨包 import 反而拿到的是"别人的镜像"，直接镜像
   同一形状最诚实。
3. 与 `Health` 的既有处理完全一致：twitchAuth.ts（DEV-040）已在包内私有镜像
   Health 形状，本节点沿用同一模式，杜绝同一包内两套 Health 定义并存。

**可选 `now?()` 的说明**：EventSubClientConfig.clock 主要驱动 watchdog
（setTimeout/clearTimeout），notification 的 `receivedAt` 需要当前时间戳。
把 `now?()` 设为可选成员：提供注入时钟时用它（测试可确定性断言），缺省回退
`Date.now()`（Task 措辞"默认真实 Date.now"）。可选成员保持与 XState 时钟
形状（仅 setTimeout/clearTimeout）双向结构兼容。

## D3 — 不实现去重存储（DEV-043）

**决策**：notification 帧只做原样快照并转发 `onNotification`，不做任何去重。

**理由**：Dev Spec 第 45 节"必须支持"里的 `Event dedupe` 是 DEV-043
（Message Deduplication，"必须做"）的职责；DAG.md 已把 M4 拆成独立节点。
本节点只需在 `TwitchChatNotification` 上保留 `metadata.message_id` 供去重
消费，并保证"同一帧只转发一次、不因重连等重复处理"——去重存储/窗口逻辑留
给 DEV-043。实现真正的去重需要跨重连的持久状态，那不是本节点（单个连接
生命周期）的边界。

## D4 — 不实现真正的指数退避重连算法（DEV-045）

**决策**：`session_reconnect` 帧到达只 send `RECONNECT_SIGNAL` 把状态机转到
`RECONNECTING`；`ERROR` 后也不自动重连。

**理由**：Task Package 第 1 节明示指数退避重连是 DEV-045（Twitch Reconnect）
的职责，本节点只需要保证状态**可达** RECONNECTING（参照 DEV-009 VERDICT
F-04 教训：状态存在但从未被真实代码路径进入是 BLOCKING 级缺陷）。连接
`ERROR` 后再次 `connect()` 需要先 `disconnect()` 回 DISCONNECTED——真实
的重连循环（含退避调度、reconnect_url 跟随）留给 DEV-045。

## D5 — 不实现发送消息 API（DEV-046）

**决策**：本节点只有"收"的最底层原始实现（建连 + 订阅 + notification
转发），不含任何 Send Chat Message API 调用。

**理由**：回复/发送是 DEV-046 的职责；Task Package 第 10 节 Non-goals 明示。
完整 `LivePlatformAdapter`（connect/disconnect/onChat/sendChat/getHealth）
是 041/042/046 多节点合作产物，本节点不组装。

## D6 — keepalive_timeout_seconds 从 welcome payload 读取，而非硬编码

**决策**：watchdog 超时时长 = welcome 帧 `payload.session.keepalive_timeout_seconds`
× 1000 × 1.5；不进 CONNECTED 前（welcome 未到）不 arm。

**理由**：
1. **协议事实**：Twitch EventSub WebSocket 的 keepalive_timeout_seconds 由
   **服务端在 welcome 帧里下发**，客户端必须按服务端声明执行（Twitch
   允许服务端调整该值）；硬编码会与服务端实际节奏脱节。
2. **×1.5 缓冲**：Task Package 第 2.1 节明确要求缓冲；网络抖动下
   keepalive 可能略晚，1.5× 区分"连接静默但仍活着"与"真的死了"。
3. welcome 帧到达时记录该值，进 CONNECTED 时 arm；keepalive/notification
   帧重置（clear 旧 timer + 重设）。测试用假时钟注入可确定性快进证明超时
   转移，不依赖真实墙钟。

## D7 — Helix 订阅创建请求的构造依据

**决策**：welcome 处理后同一逻辑步骤内 POST
`${helixBaseUrl}/helix/eventsub/subscriptions`：
- header：`Authorization: Bearer <accessToken>`（connect() 时从
  authPort.getAccessToken() 取得并暂存）+ `Client-Id: <clientId>` +
  `Content-Type: application/json`；
- body：`{type:'channel.chat.message', version:'1',
  condition:{broadcaster_user_id, user_id}, transport:{method:'websocket',
  session_id}}`；
- 202 → `SUBSCRIBE_OK`（CONNECTED）；其他状态码/异常 → `SUBSCRIBE_FAIL`
  （ERROR，不重试）。

**理由**：
1. Dev Spec 第 44 节：Twitch Adapter 首发 = EventSub WebSocket + Twitch
   API；Chat 走 `channel.chat.message` 订阅（version '1' 是该订阅类型的
   websocket transport 版本）。condition 字段按该订阅类型契约：
   `broadcaster_user_id`（要收哪个主播的 chat）+ `user_id`（bot 自己的
   user id，config.userId）。transport.method='websocket' + session_id 指向
   welcome 帧拿到的 EventSub session——三者缺一不可。
2. baseUrl/路径/动词对齐 Helix API（`/helix/eventsub/subscriptions`，
   POST）。header 契约：Helix 要求 `Client-Id` + `Authorization`（本节点
   凭据来自 DEV-040 TwitchAuthPort，不自己管 OAuth）。
3. 202 Accepted 是 Helix 订阅创建成功语义（异步生效），非 202 一律失败态，
   不重试（重试属 DEV-045）。

## D8 — 凭据不可用时的诚实失败路径

**决策**：connect() 先 `authPort.getAccessToken()`；`ok:false` → send
`WS_ERROR` 直转 ERROR，**不构造 WebSocket**。

**理由**：Constraint 2 + Task Package 第 1 节 USER 裁决：不绑定真实账号/密钥，
凭据缺失时 DEV-040 的 `noopTwitchAuthPort` 恒返回 `{ok:false}`；本节点拿到
`ok:false` 必须诚实转 ERROR，不得假装连接成功（测试 A08 断言 WebSocket
构造器零调用）。

## D9 — 完整状态机的旁路设计（WS_OPEN 自循环等）

**决策**：机器里有少量"占位边"：`CONNECTING` 的 `WS_OPEN` 自循环（空
action）、`NOTIFICATION`/`KEEPALIVE` 在 CONNECTED 保持状态（空 action）、
`RECONNECTING` 只有 DISCONNECT 出边。

**理由**：这些边把"未来 DEV-045 会接真实逻辑的位置"显式留在拓扑里，避免
DEV-009 F-04 类"状态不可达"；同时保持当前实现诚实——真实动作（建连后的
open 处理、notification 转发、watchdog 重置）都在 actor 外完成，机器不编造
尚不存在的行为。action 留空是**刻意的边界声明**，不是遗漏。
