---
node: DEV-081
title: Bilibili Adapter
milestone: M8 — Platform Expansion
status: ISSUED
task_package_ref: "0339"
---

# TASK PACKAGE — DEV-081（Bilibili Adapter）

## 1. Context

Dev Spec 第 47 节（`specs/baseline/DEV_SPEC_V1.0.md:1775-1787`）正文：

> 最终产品预留。Bilibili 官方开放平台明确包含：「开播能力和直播间
> 消息长连能力。」因此平台抽象结构可以覆盖 Bilibili，但具体协议
> 实现放在 Twitch 主链稳定之后（已满足——Twitch/YouTube 均已
> `DONE`）。同时 Bilibili 开放平台涉及开发者认证、应用关联和用户
> 数据处理规则，因此该 Adapter 的数据存储策略必须单独经过平台
> 合规检查，不能简单照搬 Twitch Viewer Memory。

CR-017 §3.3/§3.4（`specs/audit/CR-RESOLUTIONS-001.md:228-260`）是本
节点的合规裁决依据：

> §3.3（第 228-246 行）：合规变量必须在 M1 前置——DEV-010
> （Persistence，M1，已 `DONE`）已把 `viewer_states`/
> `host_viewer_memory`/`host_running_jokes` 三表做成**按平台可配置**
> （`platform` 列进 PK/唯一索引 + `created_at`/`last_seen_at` +
> 保留策略非硬编码），purge job 本身延后到 DEV-054/DEV-081 时代。

> §3.4（第 247-260 行）：`LivePlatformAdapter` v1 由 Twitch 单实现
> 推导，未经第二实现验证；DEV-080 是首个异构平台落地的计划性修订
> （预期事件非设计失败）；`platform-bilibili` 包在本节点前不创建。

**关键事实核查（直接读源码确认，解决本节点唯一的合规歧义）**：
`packages/host-memory/src/hostMemory.ts:17-20,38-42`（DEV-054，已
`DONE`，接口已冻结）——`purge(retentionMsByPlatform: Record<string,
number>)` 与 `recallViewer(platform, viewerId)`/`addRunningJoke(platform,
...)`/`listRunningJokes(platform)` 全部以 `platform: string` 为
**通用参数**，从未硬编码 Twitch，DEV-010 的 CR-017 §3.3 合规前置在
DEV-054 已经落地成一个**平台无关**的存储/清理层。

**因此 Dev Spec 第 47 节"数据存储策略必须单独经过平台合规检查"这
句话，对本节点（Adapter 本身）不构成任何新增实现义务**：Twitch/
YouTube 两个既有 Adapter 先例（`platform-twitch`/`platform-youtube`）
均**从未直接调用 `host-memory`**——Adapter 的职责边界止于产出
`NormalizedChatMessage`，交给调用方（未分配的未来 Interaction/
Host 组装层）决定是否/如何写入 `host-memory`。DEV-081 遵循完全
相同的边界：**本节点不触碰 `host-memory`、不做任何数据持久化，
因此"合规检查"要求的对象（真实持久化实现）本节点根本不存在**，
无需也不应该在本节点内提前假设/发明该集成方式。

**真实协议机制核查（避免发明）**：Bilibili 直播开放平台
（`open-live.bilibili.com`，与"直播间数据"文档一致的官方第三方
应用接入体系，区别于 `live.bilibili.com` 网页端非官方逆向协议）
真实流程为：

1. HTTP `POST /v2/app/start`（`body: {code, app_id}`，`code` 为主播
   身份码）启动一个"项目场次"，响应含 `game_info.game_id`（心跳
   用）、`websocket_info.auth_body`（长连鉴权 JSON 字符串，第三方
   不需要解析其内容，建连时原样使用）、`websocket_info.wss_link`
   （长连地址列表）。
2. HTTP `POST /v2/app/heartbeat`（`body: {game_id}`）**每 20 秒**发
   送一次，超过 60 秒无心跳服务端自动关闭场次。
3. HTTP `POST /v2/app/end`（`body: {app_id, game_id}`）结束场次。
4. 以上三个 HTTP 接口均需签名 Header：`x-bili-content-md5`（body
   JSON 的 MD5）、`x-bili-timestamp`、`x-bili-signature-version:
   1.0`、`x-bili-signature-nonce`（随机串）、`x-bili-signature-method:
   HMAC-SHA256`、`x-bili-accesskeyid`，`Authorization` 为上述字段按
   固定顺序 `\n` 拼接后，用 `access_key_secret` 作密钥计算
   HMAC-SHA256 的十六进制结果。
5. 用 `wss_link[0]` 建立 WebSocket 连接后，先发送**认证包**
   （op=7，body 为 `auth_body` 原样字节）；服务端返回 op=8
   （`body.code===0` 表示成功）。认证成功后，客户端**每 30 秒**
   发送一次心跳包（op=2，空 JSON body）；服务端 op=3 回应。
6. 业务消息为 op=5 包，body 为 JSON，按 `cmd` 字段分发；本节点只
   处理 `cmd === 'LIVE_OPEN_PLATFORM_DM'`（弹幕），其余 cmd（礼物/
   舰长/SC/进退房等）**静默跳过**（同 DEV-080 对非
   `textMessageEvent` 类型的处置先例）。
7. 二进制包头固定 16 字节：`packetLen(int32)`/`headerLen(int16,恒16)`/
   `protoVersion(int16，本节点固定用 0——不压缩业务消息/1——不压缩
   连接类消息，不实现 Brotli，见 Forbidden Scope)`/`op(int32)`/
   `seq(int32，客户端固定 1)`，随后是 UTF-8 JSON body。

`LIVE_OPEN_PLATFORM_DM` 的真实 `data` 字段（本节点只消费其中四个）：
`open_id`（用户唯一标识，`uid` 已废弃恒 0，不使用）、`msg_id`
（消息唯一 id）、`msg`（弹幕文本）、`timestamp`（秒级服务端时间）。

**官方开放平台无应用级发送弹幕接口**：`/v2/app/*` 只有
`start`/`heartbeat`/`end` 三个接口，均是场次管理与接收侧鉴权，没有
任何"以 App 身份发送弹幕"的接口。已知的 `POST
api.live.bilibili.com/msg/send` 是 `live.bilibili.com` 网页端非官方
接口，鉴权模型是登录态 Cookie（`SESSDATA`/`bili_jct`），完全不同于
开放平台的 `app_id`/`access_key`/`access_key_secret` 签名模型——
落地它意味着本 Adapter 要额外持有用户会话 Cookie，这正是 Dev Spec
第 47 节"数据处理规则须单独合规检查"要警惕的那类未经审查的凭据
存储，本节点不落地它（见 §2 `sendChat.ts`、Forbidden Scope）。

## 2. Deliverable

新建 `packages/platform-bilibili`
（`@interactive-story/platform-bilibili`，包名已在
`specs/dev/DAG.md:669` 冻结的 17 包列表预留），四个源文件 + 对应
测试，结构对齐 `platform-twitch`/`platform-youtube` 先例、按真实
机制调整：

1. **`bilibiliAuth.ts`** —— 项目场次生命周期 + HMAC-SHA256 签名
   HTTP 客户端（零 SDK，手写 `fetch`；HMAC 用 Node 内置
   `node:crypto`，不算第三方依赖，同 `crypto`/`fetch` 均为运行时
   自带 API 的先例）：

```typescript
export interface BilibiliGameSession {
  gameId: string;
  authBody: string;
  wssLinks: string[]; // websocket_info.wss_link，真实字段
}
export type BilibiliStartResult =
  { ok: true; session: BilibiliGameSession } | { ok: false; reason: string };
export type BilibiliVoidResult = { ok: true } | { ok: false; reason: string };
export interface BilibiliAuthPort {
  startGame(): Promise<BilibiliStartResult>;
  heartbeat(gameId: string): Promise<BilibiliVoidResult>;
  endGame(gameId: string): Promise<BilibiliVoidResult>;
}
export const noopBilibiliAuthPort: BilibiliAuthPort = {
  startGame: async () => ({ ok: false, reason: 'no Bilibili open-platform credentials configured' }),
  heartbeat: async () => ({ ok: false, reason: 'no Bilibili open-platform credentials configured' }),
  endGame: async () => ({ ok: false, reason: 'no Bilibili open-platform credentials configured' }),
};
export interface BilibiliAuthProviderConfig {
  appId: string;
  accessKeyId: string;
  accessKeySecret: string;
  anchorCode: string; // 主播身份码，/v2/app/start 的 code 参数
  baseUrl?: string;    // 默认 https://live-open.biliapi.com
  fetchImpl?: typeof fetch;
}
export function createBilibiliAuthProvider(config: BilibiliAuthProviderConfig): BilibiliAuthPort;
export function createOptionalBilibiliAuthProvider(env: NodeJS.ProcessEnv): BilibiliAuthPort;
// 读取 BILIBILI_APP_ID / BILIBILI_ACCESS_KEY_ID / BILIBILI_ACCESS_KEY_SECRET /
// BILIBILI_ANCHOR_CODE，任一缺失即返回 noopBilibiliAuthPort（同
// createOptionalYoutubeAuthProvider/createOptionalTwitchAuthProvider 精确
// 先例——USER 已就 M8 明确裁决"不要让任何真实数据阻碍完成"）。
```

`startGame()`：签名 POST `{baseUrl}/v2/app/start`（body
`{code: anchorCode, app_id: appId}`），签名 Header 按 §1 第 4 点
计算（`x-bili-content-md5` 为 body JSON 字符串的 MD5，
`x-bili-timestamp` 为当前 10 位时间戳，`x-bili-signature-nonce`
随机串，`Authorization` 为 HMAC-SHA256 十六进制）。成功响应体真实
字段 `data.game_info.game_id`/`data.websocket_info.auth_body`/
`data.websocket_info.wss_link`；非 2xx/异常 → `{ok:false,reason}`。
`heartbeat`/`endGame` 同一签名机制，分别 POST `/v2/app/heartbeat`
（body `{game_id}`）/`/v2/app/end`（body `{app_id, game_id}`）。

2. **`liveConnectClient.ts`** —— WebSocket 长连客户端，替代 Twitch
   的 `eventSubClient.ts`（**不照搬**其八态机——Dev Spec 第 45 节
   的八态列表是 Twitch 专属权威定义，第 47 节无对应状态拓扑，机制
   也不同：本协议有两条独立心跳——HTTP 场次心跳与 WS 心跳，
   Twitch/YouTube 均只有一条）：

```typescript
export type LiveConnectState =
  | 'STOPPED' | 'STARTING' | 'CONNECTING' | 'AUTHENTICATING' | 'CONNECTED' | 'ERROR';

export interface BilibiliChatMessage {
  msgId: string;     // data.msg_id
  openId: string;    // data.open_id
  text: string;       // data.msg
  timestamp: number;  // data.timestamp（秒级，真实服务端时间）
}

export interface LiveConnectClientConfig {
  authPort: BilibiliAuthPort;
  /** 测试注入；默认全局 WebSocket（Node ≥22 原生），同 eventSubClient.ts 先例。 */
  webSocketImpl?: typeof WebSocket;
  /** 测试注入；默认真实时钟，驱动两条心跳定时器。 */
  clock?: Clock; // 本地镜像形状，同 eventSubClient.ts Clock 先例
  onMessage?: (message: BilibiliChatMessage) => void;
}

export interface LiveConnectClient {
  connect(): void;
  disconnect(): void;
  getState(): LiveConnectState;
  getHealth(): Health; // 本地镜像形状，同既有三个先例
}

export function createLiveConnectClient(config: LiveConnectClientConfig): LiveConnectClient;
```

行为：`connect()` → `STARTING`，调用 `authPort.startGame()`；失败
直接 `ERROR`（同 DEV-080 token 获取失败即 `ERROR` 的诚实失败先例，
不做任何多主机 failover——`wss_link` 只取第一个，失败即 `ERROR`,
不自动尝试列表中其余地址，同"不自动重试"纪律，failover 策略是未
分配的未来职责）。成功后 `CONNECTING`，用 `webSocketImpl` 打开
`wssLinks[0]`；`onopen` 后发送 op=7 认证包（body 为 `authBody`
字符串原样打包，本节点不解析其内容，同真实协议"第三方无需关注
内容"的性质），转 `AUTHENTICATING`；收到 op=8 且 `body.code===0`
→ `CONNECTED`，否则 → `ERROR`（真实协议下认证失败服务端可能不回
任何包——若 `AUTHENTICATING` 期间 WS 提前 `onclose`/`onerror` 同样
→ `ERROR`）。`CONNECTED` 后启动两条独立定时器：每 20 秒调用
`authPort.heartbeat(gameId)`（HTTP，场次心跳，失败不中断连接、只
记录在 `getHealth().error`）；每 30 秒发送一次 op=2 心跳包（WS，
空 JSON body）。收到 op=5 包：解析 JSON body，`cmd !==
'LIVE_OPEN_PLATFORM_DM'` 静默跳过；是则取 `data.open_id`/
`data.msg_id`/`data.msg`/`data.timestamp` 组装 `BilibiliChatMessage`
调用 `onMessage`。`disconnect()`：取消两条定时器、关闭 WebSocket、
best-effort 调用 `authPort.endGame(gameId)`（不等待/不因其失败而
影响状态转换），转 `STOPPED`。

包头编码/解码（16 字节 `packetLen/headerLen/protoVersion/op/seq` +
JSON body）为本文件内部实现细节，不要求导出固定函数名，但必须
按 §1 第 7 点真实字段顺序/字节长度实现，且必须有独立单元测试
覆盖编码往返（encode→decode 恒等）与已知真实样例包的解码正确性。

3. **`chatMessageAdapter.ts`** —— 转换成平台无关契约：

```typescript
export function normalizeBilibiliChatMessage(
  message: BilibiliChatMessage,
): NormalizedChatMessage | undefined;
export function createBilibiliChatOnMessage(
  handler: ChatHandler,
): (message: BilibiliChatMessage) => void;
```

逐字段映射：`platform:'bilibili'`、`viewerId: message.openId`、
`messageId: message.msgId`、`text: message.text`、
`receivedAt: message.timestamp * 1000`（真实服务端秒级时间转
毫秒——**这里对齐 `normalizeYoutubeChatMessage` 而不是
`normalizeTwitchChatMessage`**：Bilibili 弹幕事件真实携带
`timestamp` 服务端字段，同 YouTube 的 `snippet.publishedAt`，与
Twitch 通知载荷无服务端时间字段、只能用本地时钟的处置不同——按
"字段可用性决定处置"的既有纪律，不套用同一模板）。`openId`/
`msgId` 为空字符串或 `text`/`timestamp` 类型不对时视为转换失败，
返回 `undefined`（同既有两个先例的诚实失败处置）。

4. **`sendChat.ts`** —— 诚实反映能力缺口，**不是**凭据缺失式
   降级，而是**协议层面本来就不存在该能力**：

```typescript
export type BilibiliSendChatResult = { ok: false; reason: string };
export interface BilibiliSendChat {
  sendChat(message: string): Promise<BilibiliSendChatResult>;
}
export const unsupportedBilibiliSendChat: BilibiliSendChat = {
  sendChat: async () => ({
    ok: false,
    reason:
      'Bilibili live open platform (open-live.biliapi.com /v2/app/*) has no application-level send-message API; the unofficial cookie-authenticated live.bilibili.com endpoint is out of scope for this Adapter',
  }),
};
```

不提供任何 `createBilibiliSendChat(config)` 工厂——没有真实端点
可配置，提供一个"看起来可配置但恒失败"的工厂会误导未来调用方
以为凭据齐全就能用，掩盖"协议本身不支持"这一事实（诚实纪律，
同 `noopHostTtsProvider`/`noopHostLLMProvider` 系列"如实反映当前
不存在的能力"先例，但本例更进一步——连"配置齐全后可用"的可能性
本身都不存在，故不设 config 参数）。

**`index.ts`** 只原样重导出以上四个模块（同 `platform-twitch`/
`platform-youtube` 先例），不组装任何顶层 Adapter 对象（DEV-042
D2 YAGNI 裁定的延续，见 DEV-080 §1 论证，本节点不重复展开）。

**不新建 `messageDedup.ts` 类比物**：`msg_id` 是消息唯一标识但
协议本身不保证重复投递（不同于 YouTube `nextPageToken` 游标机制
天然防重）；但 Dev Spec/官方文档均未描述任何已观测到的重复投递
场景，本节点不为未证实的问题发明去重层（同 DEV-080 对
`messageDedup` 的处置纪律：只在真实证实的问题上建解决方案）。
**不触碰 `host-memory`**（见 §1，Adapter 边界止于产出
`NormalizedChatMessage`）。

## 3. Scope

### Writable Scope

```
packages/platform-bilibili/package.json                          （新增）
packages/platform-bilibili/tsconfig.json                          （新增）
packages/platform-bilibili/src/index.ts                            （新增）
packages/platform-bilibili/src/bilibiliAuth.ts                     （新增）
packages/platform-bilibili/src/bilibiliAuth.test.ts                （新增）
packages/platform-bilibili/src/liveConnectClient.ts                （新增）
packages/platform-bilibili/src/liveConnectClient.test.ts           （新增）
packages/platform-bilibili/src/chatMessageAdapter.ts                （新增）
packages/platform-bilibili/src/chatMessageAdapter.test.ts           （新增）
packages/platform-bilibili/src/sendChat.ts                          （新增）
packages/platform-bilibili/src/sendChat.test.ts                     （新增）
tsconfig.json                                                        （根，追加一条 references 条目）
pnpm-lock.yaml（自动生成：新增 packages/platform-bilibili 的
importer 条目，含对 @interactive-story/platform-core 的 workspace
依赖解析——新增包被授权后 pnpm 工具链的强制副作用，同 DEV-070
msg 0310 裁定，已连续适用于 DEV-071~080）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-081/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交；追加行放在历史消息
表格 `---` 分隔符之前，不放文件末尾"当前待处理"表格之后）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/platform-core/src/index.ts、interactionAggregator.ts（Read-only，
只消费 NormalizedChatMessage/ChatHandler 类型，不修改）
packages/platform-twitch/src/twitchAuth.ts、eventSubClient.ts、
chatMessageAdapter.ts、sendChat.ts（Read-only，结构先例参考）
packages/platform-youtube/src/youtubeAuth.ts、liveChatPoller.ts、
chatMessageAdapter.ts、sendChat.ts（Read-only，结构先例参考，
尤其 receivedAt 用真实服务端时间字段的处置）
packages/host-memory/src/hostMemory.ts（Read-only，仅用于确认
purge/recallViewer/addRunningJoke/listRunningJokes 均为平台无关
通用参数，不 import、不新增对 host-memory 的 workspace 依赖）
specs/baseline/DEV_SPEC_V1.0.md 第 1775-1787 行、
specs/audit/CR-RESOLUTIONS-001.md 第 198-260 行（Read-only）
```

### Forbidden Scope

```
修改除本节点 Writable Scope 之外的任何既有文件
import 或依赖 @interactive-story/platform-twitch、
@interactive-story/platform-youtube、@interactive-story/host-memory、
@interactive-story/platform-core 之外的任何其他既有包
新增任何第三方 SDK/npm 依赖（HMAC 用 Node 内置 node:crypto，不算
新增依赖；不新增 ws/isomorphic-ws 等第三方 WebSocket 库，同
eventSubClient.ts 用全局 WebSocket 的先例）
实现 Brotli 解压（真实协议 protoVersion=3 时用 Brotli 压缩 body，
本节点固定发送/期望 protoVersion∈{0,1}，未压缩；收到 protoVersion=3
的包视为解析失败，同字段不对时诚实失败先例，不新增 Brotli 依赖
来处理一个测试环境永不会产生的场景）
实现任何多主机 failover/自动重试/断线重连逻辑（`wss_link` 只取
第一个；HTTP/WS 任一阶段失败即 `ERROR`，不自动重试，重连策略是
未分配的未来职责，同 DEV-080/040/041 先例）
落地 `api.live.bilibili.com/msg/send`（非官方 Cookie 鉴权端点，
鉴权模型与开放平台完全不同，落地即引入未经合规审查的用户会话
凭据存储，正是 Dev Spec 第 47 节警惕的对象）
调用/修改 `packages/host-memory` 任何文件（Adapter 边界不包含
持久化，见 §1）
组装任何"LivePlatformAdapter"顶层类型或对象（DEV-042 D2 已裁定
YAGNI，本节点不重开该裁定）
把 eventSubClient.ts 的八态机原样搬来当 Bilibili 的状态拓扑
新建去重逻辑（见 §2，未证实的问题不发明解决方案）
真实调用任何网络 API（测试必须全部注入 fetchImpl/webSocketImpl/
clock 假实现，不得触发真实 HTTP/WebSocket 连接；账号/密钥继续
占位处理）
```

## 4. Required Skills

TypeScript strict mode、Vitest、pnpm workspace 包骨架搭建、二进制
`Buffer`/`DataView` 包头编解码。需要先读懂并结构性参照（不得原样
复制到不适用之处）`packages/platform-twitch/src/eventSubClient.ts`
（`Clock`/`Health` 本地镜像先例、`webSocketImpl` 注入先例、
"connect 失败即 ERROR 不重试"先例）、
`packages/platform-youtube/src/liveChatPoller.ts`（
`receivedAt` 用真实服务端时间字段的处置先例、非目标类型静默跳过
先例）；理解 `packages/host-memory/src/hostMemory.ts` 的
`platform: string` 通用参数设计（用于确认本节点无需为此新增任何
适配代码）；理解真实 Bilibili 直播开放平台 `/v2/app/start`/
`/v2/app/heartbeat`/`/v2/app/end` 请求签名机制与 16 字节 WebSocket
包头格式（本文档 §1 第 4/7 点已给出全部必要字段，不需要额外调研，
不得偏离本文档描述的字段名/字节序自行发明）。

## 5. Task Breakdown

- **T001** 节点文档（INDEX/REQUIREMENTS/ACCEPTANCE/DECISIONS/REPORT）。
- **T002** 实现四个源文件 + 四个测试文件 + 包骨架 + 根 `tsconfig.json`
  引用 + 全量验证（六条命令）+ `REPORT.md`/`DECISIONS.md` 填写 +
  commit + 写入（不提交）LEDGER 追加行与 NODE_REPORT 消息文件。

## 6. Key Decisions（撰写 DECISIONS.md 时必须覆盖）

- 为何 Dev Spec 第 47 节"数据存储策略须单独合规检查"对本节点不
  构成新增实现义务（直接引用 `host-memory/src/hostMemory.ts:17-20,
  38-42` 证明 DEV-054 的存储/清理层已是平台无关通用参数，且
  Twitch/YouTube 两个既有 Adapter 均从未直接调用 `host-memory`，
  本节点遵循相同边界）。
- 为何不照搬 `eventSubClient.ts` 的八态机（机制不同：本协议有两条
  独立心跳，Dev Spec 第 45 节的八态是 Twitch 专属定义）。
- 为何 `receivedAt` 对齐 YouTube 的"用真实服务端时间字段"处置而非
  Twitch 的"用本地时钟"处置（Bilibili 弹幕事件真实携带
  `timestamp` 字段，字段可用性决定处置，不套用同一模板）。
- 为何 `sendChat.ts` 只有一个恒失败常量、无 config 化工厂（官方
  开放平台协议层面没有发送弹幕接口，不是凭据缺失，是能力不存在；
  唯一已知的发送端点是非官方 Cookie 鉴权模型，落地即引入未经合规
  审查的凭据存储，本节点不落地）。
- 为何不实现 Brotli 解压与多主机 failover/自动重试（未经真实测试
  场景证实需要，发明会违反"不为不存在的问题建解决方案"纪律，同
  DEV-080 对去重/重连策略的处置）。
- 为何 HMAC 签名用 Node 内置 `node:crypto` 而不新增第三方依赖
  （运行时自带 API 不算"新增依赖"，延续零 SDK 手写 `fetch` 先例）。
- 为何本节点测试全部注入假 `fetchImpl`/`webSocketImpl`/`clock`，
  不触发真实网络/WebSocket 连接（同 Twitch/YouTube 先例；真实
  账号/密钥继续占位处理，`createOptionalBilibiliAuthProvider` 在
  凭据缺失时降级为 `noopBilibiliAuthPort`，不阻塞本节点关闭——
  USER 已就 M8 明确裁决"不要让任何真实数据阻碍完成"）。

## 7. Definition of Done

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 入库；
`REPORT.md` 完成且 `INDEX.md` Status = `READY_FOR_REVIEW`；LEDGER
追加行与 NODE_REPORT 消息文件已写入工作区但未提交；工作区无残留
临时文件；测试零真实网络/WebSocket 连接。

## 8. Exit Procedure

提交前用 `git status` 自查工作区是否干净，不得留下任何额外的
临时/草稿文件（DEV-061 MAJOR-01 先例）。LEDGER 追加行必须写在历史
消息表格 `---` 分隔符之前。

## 9. Non-Goals

不组装 `LivePlatformAdapter` 顶层对象；不实现重连/退避重试/多主机
failover 逻辑；不实现去重；不实现 Brotli 解压；不新增第三方 SDK
依赖；不触发任何真实网络/WebSocket 连接；不修改
`platform-core`/`platform-twitch`/`platform-youtube`/`host-memory`/
`runtime-kernel` 任何一行；不落地非官方 Cookie 鉴权发送弹幕接口；
不把 `sendChat` 适配成 `runtime-kernel` 的 `PlatformPort` 签名
（组装/适配层是未分配的未来职责）。

## 10. Out of Scope (Future Nodes)

真实生产入口进程/composition root；重连/退避重试/failover 策略；
账号/密钥真实供给；任何把 Bilibili 弹幕接入 `host-memory` 的具体
集成代码（该集成的合规检查对象是"具体集成实现"，本节点不产出
这类实现，故无需在本节点内完成该检查——见 §1）；Brotli 压缩支持。

## 11. Dependencies

依赖 DEV-042（`platform-core`，`DONE`，冻结，提供
`NormalizedChatMessage`/`ChatHandler`）。与 DEV-040/041
（`platform-twitch`）、DEV-080（`platform-youtube`）、DEV-054
（`host-memory`）均为结构/边界先例参照关系，无代码依赖（Forbidden
Scope 明确禁止 import）。M8 内后续节点 DEV-082/083 的 Task Package
起草时可参照本节点先例，但本节点不预先为它们做任何设计假设。

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install --frozen-lockfile` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0，新增测试数量 > 0，既有测试零回归 | 命令 |
| A07 | `packages/platform-bilibili/package.json` 依赖恰为
  `@interactive-story/platform-core`（workspace），无第三方 SDK | 读源码 |
| A08 | `bilibiliAuth.ts` 的 `startGame`/`heartbeat`/`endGame` 真实
  按 §1 第 4 点签名 POST 对应端点，凭据缺失/请求失败均返回
  `{ok:false,reason}`，不抛异常 | 读源码 + 测试 |
| A09 | `createOptionalBilibiliAuthProvider(env)` 在
  `BILIBILI_APP_ID`/`BILIBILI_ACCESS_KEY_ID`/`BILIBILI_ACCESS_KEY_SECRET`/
  `BILIBILI_ANCHOR_CODE` 任一缺失时返回 `noopBilibiliAuthPort`，三个
  方法恒 `{ok:false}` | 测试 |
| A10 | HMAC-SHA256 签名计算有独立单元测试，对已知输入产出确定性
  十六进制结果（不依赖真实网络） | 测试 |
| A11 | 包头编码/解码（16 字节 `packetLen/headerLen/protoVersion/op/seq`）
  有独立单元测试，覆盖 encode→decode 恒等与已知真实样例包解码 | 测试 |
| A12 | `liveConnectClient.ts` 的 `connect()` 在 `startGame()` 失败时
  直接转 `ERROR`，不打开 WebSocket | 测试 |
| A13 | 认证成功（收到 op=8 且 `code===0`）后转 `CONNECTED`；认证
  失败或提前 `onclose`/`onerror` 转 `ERROR` | 测试 |
| A14 | `CONNECTED` 后用注入 `clock` 断言两条独立心跳均被排定：
  20 秒 HTTP `heartbeat`、30 秒 WS op=2 包 | 测试 |
| A15 | 只对 `cmd === 'LIVE_OPEN_PLATFORM_DM'` 的 op=5 包调用
  `onMessage`，其余 `cmd` 静默跳过 | 测试 |
| A16 | `disconnect()` 取消两条心跳定时器、关闭 WebSocket，转
  `STOPPED` | 测试 |
| A17 | `normalizeBilibiliChatMessage` 的 `receivedAt` 等于
  `message.timestamp * 1000`，`platform:'bilibili'`，其余字段逐一
  对应 `openId`/`msgId`/`text`；字段缺失/类型不对返回 `undefined` | 测试 |
| A18 | `sendChat.ts` 只导出 `unsupportedBilibiliSendChat` 常量，
  `sendChat()` 恒返回 `{ok:false,reason}`，不存在任何 config 化
  工厂函数 | 读源码 |
| A19 | 全部测试注入假 `fetchImpl`/`webSocketImpl`/`clock`，零真实
  网络/WebSocket 调用 | 读测试代码 |
| A20 | 不存在任何 `messageDedup.ts`、Brotli 解压、多主机 failover/
  自动重试或等价模块 | 读文件列表 + 读源码 |
| A21 | 不存在任何组装 `LivePlatformAdapter` 的顶层类型/对象/函数；
  不存在任何 import `@interactive-story/host-memory` 的代码 | 读源码 |
| A22 | Forbidden Scope 全部条目零违反（`git diff --stat` 核对改动
  文件范围） | 命令 + 读 diff |
