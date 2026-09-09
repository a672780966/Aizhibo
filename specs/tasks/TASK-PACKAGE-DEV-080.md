---
node: DEV-080
title: YouTube Adapter
milestone: M8 — Platform Expansion
status: ISSUED
task_package_ref: "0331"
---

# TASK PACKAGE — DEV-080（YouTube Adapter）

## 1. Context

Dev Spec 第 46 节（`specs/baseline/DEV_SPEC_V1.0.md:1767-1772`）对
DEV-080 给出的正文只有两句：「最终产品预留」，以及 YouTube Live
Streaming API 提供 `liveChatMessages.streamList`，用 server-streaming
低延迟推送新聊天消息，可用 `nextPageToken` 在断线后从此前位置恢复，
"无需自行高频轮询"。这是产品侧的简化描述——YouTube Data API v3
`liveChatMessages.list` 的真实机制是**长轮询**（每次响应携带
`nextPageToken` 与 `pollingIntervalMillis`，客户端按该间隔发起下一次
请求），并不是 gRPC/WebSocket 意义上的真正 server push。本节点按
真实 API 机制（轮询 + `nextPageToken` 续传）实现，Dev Spec 的
"server-streaming"措辞理解为对"不需要自己发明续传机制、API 自带"
这一点的强调，不理解为要求实现真正的推送连接（无协议文档支持
后者，发明会违反不发明纪律）。

CR-017（`specs/audit/CR-RESOLUTIONS-001.md` 第 198-253 行）是本节点
唯一的架构裁决依据，逐条对应：

> 第 226 行：「这样即使 DEV-080 时接口大改，改动被限制在 `platform-*`
> 包内，`runtime-kernel`/`interaction-engine` 不受影响。**保护的不是
> 接口，是核心。**」

> 第 247-253 行：「`LivePlatformAdapter` v1 由 Twitch 单一实现推导，
> 未经第二实现验证。DEV-080 首个异构平台落地时进行一次计划性修订，
> 该修订是预期事件，不是设计失败。」

经直接读源码确认一个关键事实：**`LivePlatformAdapter` 从未在代码里
组装过**，它只是 Dev Spec 第 43 节的一段接口声明（
`connect/disconnect/onChat/sendChat/getHealth`）。DEV-042（
`packages/platform-core` 的建造节点）已明确裁定不组装它——
`specs/dev/DEV-042/DECISIONS.md` D2（第 17-24 行）：「完整 Adapter
还缺 DEV-046 的 `sendChat`，需要多节点合作才能拼出。在无消费方时
提前定义接口是投机性抽象（YAGNI）」，`ACCEPTANCE.md` A14 同样确认
"platform-core 未定义 LivePlatformAdapter"。DEV-046 之后也未补上
（`specs/dev/DEV-046/DECISIONS.md`/`REPORT.md` 均无 `LivePlatformAdapter`
字样）。

**因此 CR-017 所称的"计划性修订"，其对象是 Dev Spec 第 43 节这段
从未落地的接口描述，不是任何已存在的代码接口**——DEV-080 不需要
（也不可能）"修订"一个不存在的代码类型。真正已经落地、需要遵守的
是 CR-017 措施一（第 206-226 行）落地后的窄契约——
`packages/platform-core/src/index.ts:4-12`：

```typescript
export interface NormalizedChatMessage {
  platform: string;
  viewerId: string;
  messageId: string;
  text: string;
  receivedAt: number;
}
export type ChatHandler = (message: NormalizedChatMessage) => void;
```

`runtime-kernel` 侧消费的是 `packages/runtime-kernel/src/ports.ts`
的 `PlatformPort.sendChat(msg: string): Promise<void>`（本节点不接触
这个组装层——同 Twitch 先例，`platform-twitch` 自己也从未把
`sendChat` 适配成这个 kernel 签名，组装是未来/未分配节点的职责，
不是本节点范围）。

Twitch（DEV-040/041，`packages/platform-twitch/`）是唯一的既有平台
实现先例，经直接读源码确认其真实结构：**不是一个实现
`LivePlatformAdapter` 的单一对象，而是五个独立、由调用方自行组合的
模块**——`twitchAuth.ts`（`TwitchAuthPort`，零 SDK、手写 `fetch` 到
`id.twitch.tv/oauth2/token`，含 `noopTwitchAuthPort` 与
`createOptionalTwitchAuthProvider(env)` 按环境变量降级）、
`eventSubClient.ts`（`EventSubClient`，WebSocket + xstate 八态机，
Dev Spec 第 45 节给出的权威状态列表）、`chatMessageAdapter.ts`（
`normalizeTwitchChatMessage`/`createTwitchChatOnNotification`，把
平台原始通知转成 `NormalizedChatMessage`）、`messageDedup.ts`（
WebSocket 重连场景下的去重）、`sendChat.ts`（`TwitchSendChat`，
返回 `{ok:true;messageId} | {ok:false;reason}` 结果类型，非裸
`Promise<void>`）。`platform-twitch/src/index.ts` 只是原样重导出
这五个模块，从未组装成一个顶层 Adapter 对象——这正是 DEV-042 D2
YAGNI 裁定的直接后果。`platform-twitch/package.json` 依赖只有
`xstate` + `@interactive-story/platform-core`，无任何 Twitch 官方
SDK（`DEV-040/DECISIONS.md` 第 9-10 行："新增依赖只会扩大攻击面与
维护面"，与 `audio-engine` 零依赖先例一致）。

DEV-080 采用同一分解模式，但**不整体照搬 `eventSubClient.ts` 的
WebSocket 八态机**——那八个状态（`DISCONNECTED/CONNECTING/WELCOME/
SUBSCRIBING/CONNECTED/RECONNECTING/DEGRADED/ERROR`）是 Dev Spec 第
45 节给出的 Twitch 专属权威状态列表，YouTube 没有对应的 Dev Spec
状态列表可循，机制也从根本上不同（长轮询而非 WebSocket 会话）。
本节点只用真实需要、機制如实反映的最小状态集（见 §2）。

## 2. Deliverable

新建 `packages/platform-youtube`（`@interactive-story/platform-youtube`，
包名已在 `specs/dev/DAG.md` 第 676 行冻结的 17 包列表中预留），四个
源文件 + 对应测试：

1. **`youtubeAuth.ts`** —— OAuth2 `refresh_token` grant，POST
   `https://oauth2.googleapis.com/token`（零 SDK，手写 `fetch`，
   结构与 `twitchAuth.ts` 逐一对应）：

```typescript
export interface YoutubeTokenResult {
  accessToken: string;
  expiresInSeconds: number;
}
export type YoutubeAuthResult =
  { ok: true; token: YoutubeTokenResult } | { ok: false; reason: string };
export interface YoutubeAuthPort {
  getAccessToken(): Promise<YoutubeAuthResult>;
}
export const noopYoutubeAuthPort: YoutubeAuthPort = {
  getAccessToken: async () => ({ ok: false, reason: 'no YouTube OAuth credentials configured' }),
};
export interface YoutubeAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  baseUrl?: string;       // 默认 https://oauth2.googleapis.com
  fetchImpl?: typeof fetch;
}
export function createYoutubeAuthProvider(config: YoutubeAuthProviderConfig): YoutubeAuthPort;
export function createOptionalYoutubeAuthProvider(env: NodeJS.ProcessEnv): YoutubeAuthPort;
// 读取 YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN，
// 任一缺失即返回 noopYoutubeAuthPort（同 twitchAuth.ts 的
// createOptionalTwitchAuthProvider 精确先例——账号/密钥继续占位处理，
// 不阻塞本节点关闭）。
```

Google OAuth2 token 响应体真实字段名为 `access_token`/`expires_in`
（与 Twitch 相同两个字段名，不同的是 Twitch 额外返回 `scope`
数组，Google 的 refresh_token 响应不保证该字段，故本节点的
`isTokenResponseBody` 守卫只校验 `access_token`/`expires_in`，
不要求 `scope`）。

2. **`liveChatPoller.ts`** —— 长轮询客户端，替代 Twitch 的
   `eventSubClient.ts`（WebSocket 八态机在此不适用）：

```typescript
export type LiveChatPollerState = 'STOPPED' | 'POLLING' | 'ERROR';

export interface YoutubeChatMessage {
  messageId: string;       // items[].id
  authorChannelId: string; // items[].authorDetails.channelId
  text: string;            // items[].snippet.textMessageDetails.messageText
  publishedAt: string;     // items[].snippet.publishedAt（ISO 8601，真实字段）
}

export interface LiveChatPollerConfig {
  authPort: YoutubeAuthPort;
  liveChatId: string;
  apiBaseUrl?: string;   // 默认 https://www.googleapis.com/youtube/v3
  fetchImpl?: typeof fetch;
  clock?: Clock;         // 同 eventSubClient.ts 的本地镜像 Clock 形状
  onMessage?: (message: YoutubeChatMessage) => void;
}

export interface LiveChatPoller {
  connect(): void;
  disconnect(): void;
  getState(): LiveChatPollerState;
  getHealth(): Health; // 本地镜像形状，同 twitchAuth.ts/eventSubClient.ts 先例
}

export function createLiveChatPoller(config: LiveChatPollerConfig): LiveChatPoller;
```

行为：`connect()` → 取 access token 失败直接 `ERROR`（同
`eventSubClient.ts` 第 413-417 行"诚实失败"先例）；成功后
`GET {apiBaseUrl}/liveChat/messages?liveChatId=...&part=snippet,authorDetails`
（首次不带 `pageToken`），状态 `POLLING`。响应体真实字段：
`nextPageToken`、`pollingIntervalMillis`、`items[]`（每项
`{id, snippet:{type, publishedAt, textMessageDetails:{messageText}}, authorDetails:{channelId}}`）。
只处理 `snippet.type === 'textMessageEvent'`，其余类型跳过（同
Twitch `subscriptionType !== 'channel.chat.message'` 时诚实忽略的
先例）。逐条调用 `config.onMessage`，随后用响应携带的
`pollingIntervalMillis` 与 `nextPageToken` 通过 `config.clock`（缺省
真实 `setTimeout`）排定下一次请求（带 `pageToken`）。请求失败/非
2xx → `ERROR`，**不自动重试**（同 `eventSubClient.ts` 的
`SUBSCRIBING`/`createSubscription` 先例："不重试"，重连策略是未来
节点职责，非本节点发明）。`disconnect()` 取消挂起的定时器，回到
`STOPPED`。

3. **`chatMessageAdapter.ts`** —— 转换成平台无关契约：

```typescript
export function normalizeYoutubeChatMessage(
  message: YoutubeChatMessage,
): NormalizedChatMessage | undefined;
export function createYoutubeChatOnMessage(
  handler: ChatHandler,
): (message: YoutubeChatMessage) => void;
```

`normalizeYoutubeChatMessage` 逐字段映射：`platform:'youtube'`、
`viewerId: message.authorChannelId`、`messageId: message.messageId`、
`text: message.text`、`receivedAt: Date.parse(message.publishedAt)`——
**这里刻意不同于 `normalizeTwitchChatMessage`**：Twitch 的
`TwitchChatNotification` 没有任何服务端时间字段，只能用本地收到
时间（`receivedAt` 由 `eventSubClient.ts` 的注入时钟在 WebSocket
收到帧那一刻记录）；YouTube 的 `liveChatMessages` 资源本身真实携带
`snippet.publishedAt`（服务端权威时间），直接使用该字段比伪造/复用
本地轮询到达时间更准确、也更符合"不发明"——本地轮询到达时间因
`pollingIntervalMillis` 存在系统性滞后，不是消息真实发生时间。
`Date.parse` 失败（`NaN`）时视为转换失败，返回 `undefined`（同
Twitch 字段缺失/类型不对时的诚实失败先例）。

4. **`sendChat.ts`** —— 发送聊天：

```typescript
export type YoutubeSendChatResult =
  { ok: true; messageId: string } | { ok: false; reason: string };
export interface YoutubeSendChatConfig {
  authPort: YoutubeAuthPort;
  liveChatId: string;
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
}
export interface YoutubeSendChat {
  sendChat(message: string): Promise<YoutubeSendChatResult>;
}
export const noopYoutubeSendChat: YoutubeSendChat = {
  sendChat: async () => ({ ok: false, reason: 'no YouTube send-chat configured' }),
};
export function createYoutubeSendChat(config: YoutubeSendChatConfig): YoutubeSendChat;
```

`POST {apiBaseUrl}/liveChat/messages?part=snippet`，body
`{snippet:{liveChatId, type:'textMessageEvent', textMessageDetails:{messageText: message}}}`，
`Authorization: Bearer <accessToken>`。成功响应体真实字段 `id`
（消息 id）；非 2xx 或异常 → `{ok:false, reason}`（结构与
`sendChat.ts` 的 `TwitchSendChatResult` 完全对应，字段名照抄
"result 类型而非裸 `Promise<void>`"这一先例）。

**`index.ts`** 只原样重导出以上四个模块（同 `platform-twitch/src/index.ts`
先例），不组装任何顶层 Adapter 对象——这不是遗漏，是 DEV-042 D2
YAGNI 裁定在本节点的延续（见 §1）。

**不新建 `messageDedup.ts` 类比物**：Twitch 的去重是为了应对
WebSocket 重连场景下同一通知可能被 EventSub 重复投递；YouTube 的
`nextPageToken` 分页游标机制本身就保证每次轮询只返回"上次游标之后"
的新消息，不存在同等的重复投递问题——**不为不存在的问题发明解决
方案**。

## 3. Scope

### Writable Scope

```
packages/platform-youtube/package.json                        （新增）
packages/platform-youtube/tsconfig.json                        （新增）
packages/platform-youtube/src/index.ts                          （新增）
packages/platform-youtube/src/youtubeAuth.ts                    （新增）
packages/platform-youtube/src/youtubeAuth.test.ts               （新增）
packages/platform-youtube/src/liveChatPoller.ts                 （新增）
packages/platform-youtube/src/liveChatPoller.test.ts            （新增）
packages/platform-youtube/src/chatMessageAdapter.ts             （新增）
packages/platform-youtube/src/chatMessageAdapter.test.ts        （新增）
packages/platform-youtube/src/sendChat.ts                       （新增）
packages/platform-youtube/src/sendChat.test.ts                  （新增）
tsconfig.json                                                     （根，追加一条 references 条目）
pnpm-lock.yaml（自动生成：新增 packages/platform-youtube 的
importer 条目，含对 @interactive-story/platform-core 的
workspace 依赖解析——新增包被授权后 pnpm 工具链的强制副作用，
同 DEV-070 msg 0310 裁定，已连续适用于 DEV-071~075）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-080/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交；追加行放在历史消息表格
`---` 分隔符之前，不要追加到文件末尾"当前待处理"表格之后——
DEV-071 msg 0312 曾误写在后面，本节点须避免重犯）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/platform-core/src/index.ts、interactionAggregator.ts（Read-only，
只消费 NormalizedChatMessage/ChatHandler 类型，不修改）
packages/platform-twitch/src/twitchAuth.ts、eventSubClient.ts、
chatMessageAdapter.ts、sendChat.ts（Read-only，仅作结构先例参考，
不 import、不新增对 platform-twitch 的 workspace 依赖）
specs/baseline/DEV_SPEC_V1.0.md 第 1767-1772 行、
specs/audit/CR-RESOLUTIONS-001.md 第 198-253 行（Read-only）
```

### Forbidden Scope

```
修改除本节点 Writable Scope 之外的任何既有文件
import 或依赖 @interactive-story/platform-twitch、
@interactive-story/platform-core 之外的任何其他既有包
新增 googleapis / google-auth-library 等任何第三方 SDK 依赖
（本节点延续 platform-twitch/audio-engine 零 SDK、手写 fetch 先例，
新增依赖需要单独理由，本节点未给出，不得自行引入）
组装任何"LivePlatformAdapter"顶层类型或对象（DEV-042 D2 已裁定
YAGNI，本节点不重开该裁定）
把 eventSubClient.ts 的 WebSocket 八态机原样搬来当 YouTube 的状态
拓扑（YouTube 机制是长轮询非 WebSocket 会话，Dev Spec 未给出对应
状态列表，照搬会是发明）
新建去重逻辑（nextPageToken 游标机制已保证不重复投递，见 §2）
真实调用任何网络 API（测试必须全部注入 fetchImpl/clock 假实现，
不得触发真实 HTTP 请求；账号/密钥继续占位处理）
```

## 4. Required Skills

TypeScript strict mode、Vitest、pnpm workspace 包骨架搭建。需要先
读懂并结构性参照（不得原样复制到不适用之处）
`packages/platform-twitch/src/twitchAuth.ts`（OAuth `refresh_token`
grant 手写 fetch 客户端 + `noop*`/`createOptional*(env)` 降级先例）、
`sendChat.ts`（结果类型而非裸 `Promise<void>` 的先例）、
`chatMessageAdapter.ts`（`normalize*`/`create*OnNotification` 双函数
拆分先例）；理解 `packages/platform-core/src/index.ts` 冻结的
`NormalizedChatMessage`/`ChatHandler` 窄契约；理解真实 YouTube Data
API v3 `liveChatMessages.list`/`liveChatMessages.insert` 的响应体
字段形状（`nextPageToken`/`pollingIntervalMillis`/`items[].id`/
`items[].snippet.publishedAt`/`items[].snippet.textMessageDetails.messageText`/
`items[].authorDetails.channelId`）。

## 5. Task Breakdown

- **T001** 节点文档（INDEX/REQUIREMENTS/ACCEPTANCE/DECISIONS/REPORT）。
- **T002** 实现四个源文件 + 四个测试文件 + 包骨架 + 根 `tsconfig.json`
  引用 + 全量验证（六条命令）+ `REPORT.md`/`DECISIONS.md` 填写 +
  commit + 写入（不提交）LEDGER 追加行与 NODE_REPORT 消息文件。

## 6. Key Decisions（撰写 DECISIONS.md 时必须覆盖）

- 为何 CR-017"计划性修订"针对的是 Dev Spec 第 43 节从未落地的接口
  描述，而不是任何已存在的代码类型（直接引用 `DEV-042/DECISIONS.md`
  D2、`ACCEPTANCE.md` A14，证明 `LivePlatformAdapter` 从未被组装）。
- 为何不照搬 `eventSubClient.ts` 的 WebSocket 八态机作为 YouTube
  的状态拓扑（机制不同：长轮询非 WebSocket 会话；Dev Spec 第 45 节
  的八态列表是 Twitch 专属权威定义，第 46 节没有对应列表，照搬即
  发明）。
- 为何 `receivedAt` 使用 YouTube 消息自带的 `snippet.publishedAt`
  而不是像 Twitch 一样用本地时钟收到时间（YouTube 真实提供服务端
  权威时间字段，Twitch 的通知载荷没有；两个平台字段可用性不同，
  不能套用同一处置）。
- 为何不新建去重逻辑（`nextPageToken` 游标机制的作用与去重目标
  重叠，重复实现是发明不存在问题的解决方案）。
- 为何不新增 `googleapis`/`google-auth-library` 依赖，延续零 SDK
  手写 fetch 先例（引用 `DEV-040/DECISIONS.md` 第 9-10 行"新增依赖
  扩大攻击面/维护面"的原文理由）。
- 为何本节点测试全部注入假 `fetchImpl`/`clock`，不触发真实网络
  请求（同 Twitch/ElevenLabs 先例；真实账号/密钥继续占位处理，
  `createOptionalYoutubeAuthProvider` 在凭据缺失时降级为
  `noopYoutubeAuthPort`，不阻塞本节点关闭——USER 已就 M8 明确裁决
  "不要让任何真实数据阻碍完成"）。

## 7. Definition of Done

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 入库；
`REPORT.md` 完成且 `INDEX.md` Status = `READY_FOR_REVIEW`；LEDGER
追加行与 NODE_REPORT 消息文件已写入工作区但未提交；工作区无残留
临时文件；测试零真实网络调用。

## 8. Exit Procedure

提交前用 `git status` 自查工作区是否干净，不得留下任何额外的
临时/草稿文件（DEV-061 MAJOR-01 先例）。LEDGER 追加行必须写在历史
消息表格 `---` 分隔符之前。

## 9. Non-Goals

不组装 `LivePlatformAdapter` 顶层对象；不实现重连/退避重试逻辑；
不实现去重；不新增第三方 SDK 依赖；不触发任何真实网络请求；不
修改 `platform-core`/`platform-twitch`/`runtime-kernel` 任何一行；
不把 `sendChat` 适配成 `runtime-kernel` 的 `PlatformPort` 签名
（组装/适配层是未分配的未来职责）。

## 10. Out of Scope (Future Nodes)

真实生产入口进程/composition root（把 platform-youtube 与其他平台
包、runtime-kernel、ai-host 组合成一个运行中的直播系统）——不在
现有 Dev Spec DEV-000~083 编号范围内，需 USER 另行裁定排期；重连/
退避重试策略；账号/密钥真实供给。

## 11. Dependencies

依赖 DEV-042（`platform-core`，`DONE`，冻结，提供
`NormalizedChatMessage`/`ChatHandler`）。与 DEV-040/041
（`platform-twitch`，`DONE`，冻结）为结构先例参照关系，无代码依赖
（Forbidden Scope 明确禁止 import）。M8 内后续节点 DEV-081/082/083
的 Task Package 起草时可参照本节点先例，但本节点不预先为它们做
任何设计假设。

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install --frozen-lockfile` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0，新增测试数量 > 0，既有测试零回归 | 命令 |
| A07 | `packages/platform-youtube/package.json` 依赖恰为
  `@interactive-story/platform-core`（workspace），无第三方 SDK | 读源码 |
| A08 | `youtubeAuth.ts` 真实 OAuth2 `refresh_token` grant POST
  `https://oauth2.googleapis.com/token`，凭据缺失/请求失败均返回
  `{ok:false,reason}`，不抛异常 | 读源码 + 测试 |
| A09 | `createOptionalYoutubeAuthProvider(env)` 在
  `YOUTUBE_CLIENT_ID`/`YOUTUBE_CLIENT_SECRET`/`YOUTUBE_REFRESH_TOKEN`
  任一缺失时返回 `noopYoutubeAuthPort`，`getAccessToken()` 恒为
  `{ok:false}` | 测试 |
| A10 | `liveChatPoller.ts` 的 `connect()` 在 token 获取失败时直接
  转 `ERROR`，不发起 HTTP 请求 | 测试 |
| A11 | `connect()` 成功后首次请求不带 `pageToken`，收到响应后用
  返回的 `nextPageToken` 与 `pollingIntervalMillis` 排定下一次
  带 `pageToken` 的请求（用注入 `clock` 断言） | 测试 |
| A12 | 只对 `snippet.type === 'textMessageEvent'` 的 item 调用
  `onMessage`，其余类型静默跳过 | 测试 |
| A13 | 请求失败/非 2xx 时转 `ERROR`，不自动重试（`getState()` 停留
  在 `ERROR` 直到调用方重新 `connect()`） | 测试 |
| A14 | `disconnect()` 取消挂起的下一次轮询定时器，回到 `STOPPED` | 测试 |
| A15 | `normalizeYoutubeChatMessage` 的 `receivedAt` 等于
  `Date.parse(message.publishedAt)`，`publishedAt` 非法时返回
  `undefined` | 测试 |
| A16 | `normalizeYoutubeChatMessage` 输出 `platform:'youtube'`，
  其余字段逐一对应 `authorChannelId`/`messageId`/`text` | 测试 |
| A17 | `sendChat.ts` 成功路径返回 `{ok:true, messageId}`，失败路径
  （非 2xx/异常/无凭据）均返回 `{ok:false, reason}`，不抛异常 | 测试 |
| A18 | 全部测试注入假 `fetchImpl`/`clock`，零真实网络调用 | 读测试代码 |
| A19 | 不存在任何 `messageDedup.ts` 或等价去重模块 | 读文件列表 |
| A20 | 不存在任何组装 `LivePlatformAdapter` 的顶层类型/对象/函数 | 读源码 |
| A21 | Forbidden Scope 全部条目零违反（`git diff --stat` 核对改动
  文件范围） | 命令 + 读 diff |
