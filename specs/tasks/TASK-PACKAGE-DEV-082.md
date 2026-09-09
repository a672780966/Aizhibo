---
node: DEV-082
title: Interaction Gateway
milestone: M8 — Platform Expansion
status: ISSUED
task_package_ref: "0343"
---

# TASK PACKAGE — DEV-082（Interaction Gateway）

## 1. Context

Dev Spec 第 66 节标题区（`specs/baseline/DEV_SPEC_V1.0.md:2818-2819`）
对本节点只有标题「Interaction Gateway」，无正文——同 DEV-072/DEV-075
先例，`specs/dev/DAG.md:661` 已裁定具体范围于本节点起草 Task Package
时基于既有真实接口确定，不预先发明。DAG.md 同一行原文明确点名了
候选真实接口：`platform-core`/`interaction-engine`。

**关键事实核查（直接读源码，确定本节点范围的依据）**：

1. `specs/dev/DAG.md:676`「包结构（Rev 2）」冻结的 17 个包列表包含
   `interaction-engine`，但该包**从未被创建**——DEV-044
   （Interaction Aggregator，已 `DONE`，`verdict_ref: "0191"`）把
   `createInteractionAggregator`/`InteractionAggregator`/`Vote` 直接
   加进了既有的 `platform-core` 包（`packages/platform-core/src/
   interactionAggregator.ts`），而不是新建 `interaction-engine`。这个
   历史决策未在 DEV-044 的任何文档中论证过为何偏离冻结包列表，本
   节点不重开该决策（`platform-core` 里的 `createInteractionAggregator`
   已冻结、被广泛引用，重新搬迁纯属churn），但既然 DAG.md 在
   DEV-082 这一行重新点名了 `interaction-engine`，本节点是把这个
   一直闲置的保留包名**首次真正投入使用**的合理时机——名字对应的
   真实职责（下述）与"聚合器本体"不同，不构成对 DEV-044 决策的
   推翻。
2. `createInteractionAggregator()`（DEV-044，冻结）目前**从未被任何
   代码实例化并接入超过一个平台**——它是一个独立、无状态的解析器
   原语，`onVote`/`ingest` 都还没有真实调用点。同时三个平台 Adapter
   （`platform-twitch`/`platform-youtube`/`platform-bilibili`，均已
   `DONE`）各自导出了把 `ChatHandler` 包装成本平台专属回调形状的
   函数（`createTwitchChatOnNotification`/`createYoutubeChatOnMessage`/
   `createBilibiliChatOnMessage`），但从未有任何代码把这三个包装函数
   接到**同一个共享的** `ChatHandler`/聚合器实例上——目前若真的接入
   三个平台，会各自得到三个互相独立、互不知道彼此存在的聚合状态，
   这与"一个直播间同时开三个平台，观众投票应汇入同一场投票"的产品
   语义（Dev Spec 第 43 节"多平台观众互动"的既定前提）不符。
3. `sendChat` 侧同理：`TwitchSendChat`/`YoutubeSendChat`/
   `BilibiliSendChat` 三者的 `sendChat(message: string):
   Promise<{ok:true;messageId:string}|{ok:false;reason:string}>`
   方法签名结构完全一致（读三包源码逐一核实），但没有任何代码把
   "给主播消息广播到全部已连接平台"这一操作统一成一次调用——目前
   若要同时发到三个平台，调用方要自己写三次独立调用与结果收集。

**因此本节点的真实范围是**：新建 `packages/interaction-engine`，
只做两件已被三个真实 Adapter 包的既有导出函数直接证明"缺一层"的
组合工作——**多平台聊天消息汇入单一聚合器**（fan-in）与**多平台
发送广播**（fan-out）。不发明任何新协议、不做任何网络 I/O（本节点
纯组合层，测试无需注入 `fetchImpl`/`webSocketImpl`，直接传入桩函数/
桩对象即可）。

**明确不做的组装（避免重开已裁定的 YAGNI）**：不组装
`LivePlatformAdapter`（DEV-042 D2 已裁定 YAGNI，且那是"单平台
connect/disconnect/onChat/sendChat/getHealth 五件套"的组装，与本
节点"多平台消息路由"性质不同，不是同一个决策的重新讨论）；不把
`sendChat`/`onVote` 适配成 `runtime-kernel` 的 `PlatformPort` 签名
（历次先例——DEV-081 §9、DEV-080 等——一致地把这个适配层留给未分配
的未来"composition root"节点，本节点遵循相同边界，不 import/依赖
`runtime-kernel`）；不做任何平台连接生命周期编排（`connect`/
`disconnect`/重连——三个平台各自的 client 已有自己的生命周期方法，
统一编排同样是 composition root 的职责，不是消息路由层的职责）。

## 2. Deliverable

新建 `packages/interaction-engine`
（`@interactive-story/interaction-engine`，包名已在
`specs/dev/DAG.md:676` 冻结的 17 包列表预留，此前从未创建），两个
源文件 + 对应测试：

1. **`chatFanIn.ts`** —— 多平台聊天消息汇入单一聚合器：

```typescript
import {
  createInteractionAggregator,
  type InteractionAggregator,
  type ChatHandler,
} from '@interactive-story/platform-core';
import { createTwitchChatOnNotification } from '@interactive-story/platform-twitch';
import { createYoutubeChatOnMessage } from '@interactive-story/platform-youtube';
import { createBilibiliChatOnMessage } from '@interactive-story/platform-bilibili';

export interface MultiPlatformChatFanIn {
  /** 三个平台共享的同一个聚合器实例；onVote 注册在这上面。 */
  aggregator: InteractionAggregator;
  /** 直接传给 createEventSubClient({ onNotification: ... })。 */
  twitchOnNotification: ReturnType<typeof createTwitchChatOnNotification>;
  /** 直接传给 createLiveChatPoller({ onMessage: ... })。 */
  youtubeOnMessage: ReturnType<typeof createYoutubeChatOnMessage>;
  /** 直接传给 createLiveConnectClient({ onMessage: ... })。 */
  bilibiliOnMessage: ReturnType<typeof createBilibiliChatOnMessage>;
}

export function createMultiPlatformChatFanIn(): MultiPlatformChatFanIn {
  const aggregator = createInteractionAggregator();
  const handler: ChatHandler = (message) => aggregator.ingest(message);
  return {
    aggregator,
    twitchOnNotification: createTwitchChatOnNotification(handler),
    youtubeOnMessage: createYoutubeChatOnMessage(handler),
    bilibiliOnMessage: createBilibiliChatOnMessage(handler),
  };
}
```

行为：新建**恰一个** `InteractionAggregator` 实例，用同一个
`ChatHandler`（调用该实例的 `ingest`）分别喂给三个平台既有的包装
函数。三个返回的回调（`twitchOnNotification`/`youtubeOnMessage`/
`bilibiliOnMessage`）形状分别与各平台 client 的
`onNotification`/`onMessage`/`onMessage` 配置项精确兼容，可以原样
传入（本节点不 import/依赖 `eventSubClient.ts`/`liveChatPoller.ts`/
`liveConnectClient.ts`，只依赖三个包各自的 `chatMessageAdapter.ts`
导出，接线到具体 client 是 composition root 的职责）。三个平台的
投票现在汇入同一个 `aggregator`，`aggregator.onVote(handler)`
注册一次即可收到来自任意平台的投票。

2. **`chatFanOut.ts`** —— 多平台发送广播：

```typescript
export interface PlatformSendChat {
  sendChat(message: string): Promise<
    { ok: true; messageId: string } | { ok: false; reason: string }
  >;
}

export type MultiPlatformSendChatResult = Record<
  string,
  { ok: true; messageId: string } | { ok: false; reason: string }
>;

export interface MultiPlatformSendChatConfig {
  twitch?: PlatformSendChat;
  youtube?: PlatformSendChat;
  bilibili?: PlatformSendChat;
}

export interface MultiPlatformSendChat {
  sendChat(message: string): Promise<MultiPlatformSendChatResult>;
}

export function createMultiPlatformSendChat(
  config: MultiPlatformSendChatConfig,
): MultiPlatformSendChat;
```

行为：`sendChat(message)` 只对 `config` 中**实际传入**的平台键
（`twitch`/`youtube`/`bilibili` 任意子集，缺失键直接不出现在结果里）
并发调用各自的 `sendChat(message)`（`Promise.all`，互不阻塞、互不
因某平台失败而影响其他平台），把每个平台的原始结果（不做任何
重新解释/包装）按平台键收集进返回的 `Record`。`PlatformSendChat`
是结构类型，`TwitchSendChat`/`YoutubeSendChat`/`BilibiliSendChat`
三者（均已冻结）天然满足这个结构（三包源码逐一核实：方法名/参数/
返回值形状完全一致），调用方直接传入 `createTwitchSendChat(...)`/
`createOptionalYoutubeAuthProvider` 对应的 `sendChat` 对象/
`noopYoutubeSendChat`/`unsupportedBilibiliSendChat` 等既有实例即可，
本节点不重新定义/不重复实现任何平台的发送逻辑。

**`index.ts`** 只原样重导出以上两个模块。不组装任何"统一 Gateway
顶层对象"把 fan-in/fan-out/生命周期捆在一起（见 §1，composition
root 的职责，本节点只产出两个独立、可分别使用的组合函数）。

## 3. Scope

### Writable Scope

```
packages/interaction-engine/package.json                          （新增）
packages/interaction-engine/tsconfig.json                          （新增）
packages/interaction-engine/src/index.ts                           （新增）
packages/interaction-engine/src/chatFanIn.ts                       （新增）
packages/interaction-engine/src/chatFanIn.test.ts                  （新增）
packages/interaction-engine/src/chatFanOut.ts                      （新增）
packages/interaction-engine/src/chatFanOut.test.ts                 （新增）
tsconfig.json                                                        （根，追加一条 references 条目）
pnpm-lock.yaml（自动生成：新增 packages/interaction-engine 的
importer 条目，含对 platform-core/platform-twitch/platform-youtube/
platform-bilibili 的 workspace 依赖解析——新增包被授权后 pnpm
工具链的强制副作用，同 DEV-070 msg 0310 裁定，已连续适用于
DEV-071~081）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-082/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交；追加行放在历史消息表格
`---` 分隔符之前，不放文件末尾"当前待处理"表格之后）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/platform-core/src/index.ts、interactionAggregator.ts（Read-only，
只 import createInteractionAggregator/InteractionAggregator/ChatHandler/
NormalizedChatMessage/Vote，不修改）
packages/platform-twitch/src/chatMessageAdapter.ts、sendChat.ts（Read-only，
只 import createTwitchChatOnNotification/TwitchSendChat 类型，不修改，
不 import eventSubClient.ts/twitchAuth.ts/messageDedup.ts）
packages/platform-youtube/src/chatMessageAdapter.ts、sendChat.ts（Read-only，
只 import createYoutubeChatOnMessage/YoutubeSendChat 类型，不修改，
不 import liveChatPoller.ts/youtubeAuth.ts）
packages/platform-bilibili/src/chatMessageAdapter.ts、sendChat.ts（Read-only，
只 import createBilibiliChatOnMessage/BilibiliSendChat 类型，不修改，
不 import liveConnectClient.ts/bilibiliAuth.ts）
packages/runtime-kernel/src/ports.ts（Read-only，仅用于核对
PlatformPort.onVote/Vote 形状与本节点的选择一致，不 import、不新增
对 runtime-kernel 的 workspace 依赖）
specs/baseline/DEV_SPEC_V1.0.md 第 2818-2819 行、
specs/dev/DAG.md 第 653-679 行（Read-only）
```

### Forbidden Scope

```
修改除本节点 Writable Scope 之外的任何既有文件
import 或依赖 @interactive-story/host-memory、
@interactive-story/runtime-kernel、@interactive-story/ai-host 之外的
任何其他既有包（仅可 import platform-core/platform-twitch/
platform-youtube/platform-bilibili 这四个已授权的既有包）
新增任何第三方 SDK/npm 依赖
实现真实网络/WebSocket 调用（本节点纯组合层，不 import fetch/
WebSocket，测试用桩函数/桩对象，不需要 fetchImpl/webSocketImpl 注入）
把 sendChat/onVote 适配成 runtime-kernel 的 PlatformPort 签名（组装/
适配层是未分配的未来 composition root 职责，同 DEV-081 §9 先例）
组装任何跨平台连接生命周期编排（connect/disconnect/重连/健康检查
汇总）——三个平台各自 client 已有自己的生命周期方法，本节点只做
消息路由，不做连接管理
把 eventSubClient.ts/liveChatPoller.ts/liveConnectClient.ts 三个
client 类型本身 import 进本节点（本节点只依赖三包的
chatMessageAdapter.ts/sendChat.ts 导出，不需要也不应该知道底层
client 的连接细节）
新建去重逻辑（各平台层已各自处置，见 DEV-043/080/081 先例）
新建任何速率限制/反垂直轰炸/内容过滤逻辑（Dev Spec 未要求，属未来
可能的扩展，不预先发明）
把 createInteractionAggregator 迁出 platform-core 或修改
platform-core 任何既有文件（DEV-044 决策不重开，见 §1）
```

## 4. Required Skills

TypeScript strict mode、Vitest、pnpm workspace 包骨架搭建。需要先读
懂三个平台包各自的 `chatMessageAdapter.ts`/`sendChat.ts`（六个文件，
均已冻结）以确认三者结构完全一致、可以用统一的结构类型消费；理解
`platform-core` 的 `createInteractionAggregator`/`ChatHandler`/
`NormalizedChatMessage` 冻结形状（DEV-044）。不需要理解任何平台的
底层协议细节（HTTP 签名/WebSocket 帧/长轮询 token）——本节点完全
不触碰这些，只消费三包已经产出的、平台无关的 `ChatHandler`/
`sendChat` 层。

## 5. Task Breakdown

- **T001** 节点文档（INDEX/REQUIREMENTS/ACCEPTANCE/DECISIONS/REPORT）。
- **T002** 实现两个源文件 + 两个测试文件 + 包骨架 + 根 `tsconfig.json`
  引用 + 全量验证（六条命令）+ `REPORT.md`/`DECISIONS.md` 填写 +
  commit + 写入（不提交）LEDGER 追加行与 NODE_REPORT 消息文件。

## 6. Key Decisions（撰写 DECISIONS.md 时必须覆盖）

- 为何新建 `packages/interaction-engine` 而不是继续往 `platform-core`
  里加（`platform-core` 是中立契约层，被三个平台包共同依赖；本节点
  反过来要 import 全部三个平台包，若放进 `platform-core` 会形成
  循环依赖——这正是 DAG.md 冻结列表把 `interaction-engine` 列为
  独立包、而不是 `platform-core` 子模块的原因）。
- 为何不重开 DEV-044 把聚合器放进 `platform-core` 而非
  `interaction-engine` 的历史决策（该决策已冻结且被广泛引用，本
  节点只是首次让 `interaction-engine` 这个保留包名承载它真正对应
  的职责——多平台组合，不是聚合算法本体）。
- 为何 `chatFanIn`/`chatFanOut` 是两个独立函数而不是一个统一
  "Gateway" 对象（fan-in 依赖聚合器状态，fan-out 依赖发送配置，
  二者生命周期、失败模式、调用时机完全独立；捆成一个对象是没有
  真实消费方需求的投机分层）。
- 为何不适配 `runtime-kernel` 的 `PlatformPort`（同 DEV-080/081 一致
  先例：适配层是未分配的未来 composition root 职责，本节点不
  重复展开该论证，只引用先例）。
- 为何本节点测试不需要任何 `fetchImpl`/`webSocketImpl`/`clock`
  注入（本节点是纯组合层，不做任何 I/O，测试用桩 `ChatHandler`/
  桩 `PlatformSendChat` 对象验证组合逻辑即可，真实网络行为已在
  三个平台包各自的测试里验证过，不重复验证）。

## 7. Definition of Done

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 入库；
`REPORT.md` 完成且 `INDEX.md` Status = `READY_FOR_REVIEW`；LEDGER
追加行与 NODE_REPORT 消息文件已写入工作区但未提交；工作区无残留
临时文件；测试零真实网络/WebSocket 调用。

## 8. Exit Procedure

提交前用 `git status` 自查工作区是否干净，不得留下任何额外的
临时/草稿文件。LEDGER 追加行必须写在历史消息表格 `---` 分隔符
之前。

## 9. Non-Goals

不组装 `LivePlatformAdapter`；不适配 `runtime-kernel` 的
`PlatformPort`；不做任何跨平台连接生命周期编排（connect/disconnect/
重连/健康检查汇总）；不做去重；不做速率限制/反垂直轰炸/内容过滤；
不新增第三方依赖；不触发任何真实网络/WebSocket 调用；不修改
`platform-core`/`platform-twitch`/`platform-youtube`/`platform-bilibili`/
`runtime-kernel`/`host-memory` 任何一行。

## 10. Out of Scope (Future Nodes)

真实生产入口进程/composition root（把本节点的 fan-in/fan-out 接到
三个平台 client 的真实 `connect()`/`onMessage`/`onNotification`
配置项、把 `aggregator.onVote` 接到 `runtime-kernel` 的
`PlatformPort.onVote`、把 `createMultiPlatformSendChat` 的结果适配成
`PlatformPort.sendChat(msg): Promise<void>` 签名）；跨平台连接生命周期
编排；速率限制/反垂直轰炸/内容过滤；把聊天消息接入 `host-memory`
的具体集成代码。

## 11. Dependencies

依赖 DEV-042（`platform-core`，`DONE`，冻结，提供
`createInteractionAggregator`/`ChatHandler`/`NormalizedChatMessage`）、
DEV-044（Interaction Aggregator，`DONE`，冻结，提供
`InteractionAggregator`/`Vote`）、DEV-040/041/046（`platform-twitch`，
`DONE`，冻结，提供 `createTwitchChatOnNotification`/
`TwitchSendChat`/`createTwitchSendChat`/`noopTwitchSendChat`）、
DEV-080（`platform-youtube`，`DONE`，冻结，提供
`createYoutubeChatOnMessage`/`YoutubeSendChat`/`createYoutubeSendChat`/
`noopYoutubeSendChat`）、DEV-081（`platform-bilibili`，`DONE`，冻结，
提供 `createBilibiliChatOnMessage`/`BilibiliSendChat`/
`unsupportedBilibiliSendChat`）。M8 内后续节点 DEV-083 的 Task
Package 起草时可参照本节点先例，但本节点不预先为它做任何设计假设。

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install --frozen-lockfile` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0，新增测试数量 > 0，既有测试零回归 | 命令 |
| A07 | `packages/interaction-engine/package.json` 依赖恰为
  `@interactive-story/platform-core`/`platform-twitch`/
  `platform-youtube`/`platform-bilibili` 四项（workspace），无
  第三方 SDK | 读源码 |
| A08 | `createMultiPlatformChatFanIn()` 内部只创建**恰一个**
  `InteractionAggregator` 实例，三个返回的回调共享同一个 `handler`
  闭包 | 读源码 |
| A09 | 分别喂给 `twitchOnNotification`/`youtubeOnMessage`/
  `bilibiliOnMessage` 各自平台原始形状的消息（内容分别解析为
  A/B/C/D 投票），断言同一个已注册的 `onVote` handler 收到全部
  三次调用（证明三平台汇入同一聚合器） | 测试 |
| A10 | 非有效投票文本（如 `'hello'`）经任一平台回调喂入后，`onVote`
  handler 不被调用（复用 DEV-044 既有解析语义，不重新实现） | 测试 |
| A11 | `createMultiPlatformSendChat(config)` 的 `sendChat(message)`
  只对 `config` 中实际提供的平台键并发调用对应 `sendChat`，返回的
  `Record` 的键恰为 `config` 中提供的平台键集合（未提供的平台
  不出现在结果里） | 测试 |
| A12 | 传入至少两个桩 `PlatformSendChat`（一个 resolve `{ok:true,
  messageId}`、一个 resolve `{ok:false,reason}`）断言两者的结果
  原样出现在返回的 `Record` 里，互不影响（一个失败不影响另一个
  的结果/不抛异常） | 测试 |
| A13 | `chatFanOut.ts` 的 `PlatformSendChat` 类型可以直接被
  `createTwitchSendChat`/`createYoutubeSendChat`/
  `unsupportedBilibiliSendChat` 的返回值/实例赋值（结构类型兼容，
  无需任何适配代码）——类型级断言（TS 编译通过即满足，可选补充
  运行时测试） | 读源码 + 测试 |
| A14 | 不存在任何 import `@interactive-story/host-memory`、
  `@interactive-story/runtime-kernel`、`@interactive-story/ai-host`
  的代码 | 读源码 |
| A15 | 不存在任何 import `eventSubClient.ts`/`liveChatPoller.ts`/
  `liveConnectClient.ts`（三个平台 client 内部实现文件）的代码，
  只 import 三包的 `chatMessageAdapter.ts`/`sendChat.ts` 导出 | 读源码 |
| A16 | 不存在任何把 `sendChat`/`onVote` 适配成
  `PlatformPort(connect/disconnect/onVote/sendChat/getHealth)`
  等价形状的代码；不存在任何组装"LivePlatformAdapter"式顶层对象的
  代码 | 读源码 |
| A17 | 全部测试使用桩函数/桩对象，不 import `fetch`/`WebSocket`，
  零真实网络调用 | 读测试代码 |
| A18 | 不存在任何 `messageDedup`/速率限制/内容过滤等价模块 | 读文件列表 + 读源码 |
| A19 | Forbidden Scope 全部条目零违反（`git diff --stat` 核对改动
  文件范围） | 命令 + 读 diff |
