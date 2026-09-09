# DEV-082 INDEX

Status: DONE

## Current Node

DEV-082 — Interaction Gateway（M8 — Platform Expansion 第三个节点）

## Objective

新建 `packages/interaction-engine`（`@interactive-story/interaction-engine`，
包名已在 `specs/dev/DAG.md:676` 冻结的 17 包列表预留、此前从未被创建，
本节点是它**首次真正投入使用**）。Dev Spec 第 66 节标题区
（`specs/baseline/DEV_SPEC_V1.0.md:2818-2819`）对本节点只有标题
「Interaction Gateway」无正文——范围基于既有真实接口的事实核查确定
（同 DEV-072/075 先例，DAG.md:661 点名候选真实接口
`platform-core`/`interaction-engine`）：`createInteractionAggregator`
（DEV-044，冻结）从未被任何代码接入超过一个平台；三个平台 Adapter 的
`ChatHandler` 包装函数（`createTwitchChatOnNotification`/
`createYoutubeChatOnMessage`/`createBilibiliChatOnMessage`）从未被接到
**同一个**共享聚合器上；`sendChat` 侧三个平台发送对象方法签名结构一致
（三包 `sendChat.ts` 逐一核实）但"广播到全部已连接平台"从未被统一成
一次调用。本节点做这两件缺一层的纯组合工作：

1. `chatFanIn.ts` —— `createMultiPlatformChatFanIn()` 新建**恰一个**
   `createInteractionAggregator()` 实例，同一 `ChatHandler`（调用该实例
   `ingest`）分别喂给三个平台既有的 `createTwitchChatOnNotification`/
   `createYoutubeChatOnMessage`/`createBilibiliChatOnMessage` 包装函数。
   三个返回的回调形状与各平台 client 的 `onNotification`/`onMessage`/
   `onMessage` 配置项精确兼容、可原样传入（本节点不 import/依赖三个
   client 实现文件，只依赖三包 `chatMessageAdapter.ts` 导出；接线到
   具体 client 是 composition root 职责）。三平台投票汇入同一
   `aggregator`，`aggregator.onVote(handler)` 注册一次即收到任意平台
   的投票。
2. `chatFanOut.ts` —— `createMultiPlatformSendChat(config)`：结构类型
   `PlatformSendChat`（三平台冻结 `TwitchSendChat`/`YoutubeSendChat`/
   `BilibiliSendChat` 天然满足，零适配），`sendChat(message)` 只对
   config 中实际提供的平台键（任意子集，缺失键不出现在结果里）并发
   调用各自的 `sendChat(message)`（`Promise.all`，互不阻塞、互不因某
   平台失败而影响其他平台），按平台键原样收集结果 `Record`（不重新
   解释/包装）。调用方直接传 `createTwitchSendChat(...)`/`noop*SendChat`/
   `unsupportedBilibiliSendChat` 等既有实例。

**`index.ts`** 只原样重导出以上两个模块，不组装任何"统一 Gateway
顶层对象"。

**明确不做**（延续已裁定 YAGNI，见 DECISIONS）：不组装
`LivePlatformAdapter`（DEV-042 D2 裁定）；不把 `sendChat`/`onVote`
适配成 `runtime-kernel` 的 `PlatformPort` 签名（适配层留给未分配的
未来 composition root，同 DEV-080/081 先例）；不做任何平台连接
生命周期编排；不重开 DEV-044 把聚合器放进 `platform-core` 的历史
决策（`platform-core` 的 `createInteractionAggregator` 已冻结被广泛
引用，重新搬迁纯属 churn）。本节点是纯组合层：**零真实网络/
WebSocket 调用**（测试直接传桩 `ChatHandler`/桩 `PlatformSendChat`
对象，无需 `fetchImpl`/`webSocketImpl`/`clock` 注入）。

## Allowed Scope

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
platform-bilibili 的 workspace 依赖解析——新增包被授权后 pnpm 工具链
的强制副作用，同 DEV-070 msg 0310 裁定，已连续适用于 DEV-071~081）
specs/dev/DEV-082/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交；追加行放在历史消息表格
`---` 分隔符之前，不放文件末尾"当前待处理"表格之后）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

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

## Forbidden Scope

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

## Task Order

- [x] T001 节点文档（INDEX / REQUIREMENTS / ACCEPTANCE / DECISIONS / REPORT）
- [x] T002 两个源文件 + 两个测试文件 + 包骨架 + 根 `tsconfig.json` 引用 +
  全量验证（六条命令）+ `REPORT.md`/`DECISIONS.md` 填写 + commit +
  写入（不提交）LEDGER 追加行与 NODE_REPORT 消息文件

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行（seq
0344，历史消息表格 `---` 分隔符之前）与 NODE_REPORT 消息文件（seq
0344）已写入工作区但**未提交**；工作区不得残留任何施工用临时文件；
测试零真实网络/WebSocket 调用。

## Next Node

M8（Platform Expansion）内后续节点 DEV-083 的 Task Package 由
Commander 起草（Task Package §11 注明可参照本节点先例）；本节点不
预先为它做任何设计假设。
