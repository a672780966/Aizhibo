# DEV-082 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-082.md` 逐字抄录关键要求。
权威版本是 Task Package，不是本副本（协议 §1.4）。

1. 新建 `packages/interaction-engine`
   （`@interactive-story/interaction-engine`，包名已在
   `specs/dev/DAG.md:676` 冻结的 17 包列表预留、此前从未被创建），
   两个源文件 + 对应测试 + index.ts 桶导出。范围的事实核查基础：Dev
   Spec 第 66 节标题区（`DEV_SPEC_V1.0.md:2818-2819`）只有标题
   「Interaction Gateway」无正文；`createInteractionAggregator()`
   （DEV-044，冻结）从未被任何代码实例化并接入超过一个平台；三个
   平台 Adapter（platform-twitch/platform-youtube/platform-bilibili，
   均 DONE）的 `ChatHandler` 包装函数
   （`createTwitchChatOnNotification`/`createYoutubeChatOnMessage`/
   `createBilibiliChatOnMessage`）从未被接到同一个共享
   `ChatHandler`/聚合器实例上（分别接入会得到三个互相独立的聚合
   状态，与"一个直播间同时开三个平台，观众投票应汇入同一场投票"
   的产品语义不符）；`TwitchSendChat`/`YoutubeSendChat`/
   `BilibiliSendChat` 的 `sendChat(message): Promise<{ok:true;
   messageId}|{ok:false;reason}>` 方法签名结构完全一致（三包源码逐一
   核实），但没有任何代码把"给主播消息广播到全部已连接平台"统一成
   一次调用。本节点只做这两件缺一层的**纯组合**工作（fan-in/fan-out），
   不发明任何新协议、不做任何网络 I/O（测试无需注入
   `fetchImpl`/`webSocketImpl`，直接传入桩函数/桩对象即可）。

2. `chatFanIn.ts` —— 多平台聊天消息汇入单一聚合器。接口
   `MultiPlatformChatFanIn {aggregator: InteractionAggregator;
   twitchOnNotification: ReturnType<typeof createTwitchChatOnNotification>;
   youtubeOnMessage: ReturnType<typeof createYoutubeChatOnMessage>;
   bilibiliOnMessage: ReturnType<typeof createBilibiliChatOnMessage>}`。
   `createMultiPlatformChatFanIn()`：新建**恰一个**
   `createInteractionAggregator()` 实例，同一 `ChatHandler`（调用该
   实例的 `ingest`）分别喂给三个平台既有的包装函数。三个返回的回调
   形状分别与各平台 client 的 `onNotification`/`onMessage`/`onMessage`
   配置项精确兼容，可以原样传入（本节点不 import/依赖
   `eventSubClient.ts`/`liveChatPoller.ts`/`liveConnectClient.ts`，只
   依赖三个包各自的 `chatMessageAdapter.ts` 导出；接线到具体 client
   是 composition root 的职责）。三平台投票汇入同一个 `aggregator`，
   `aggregator.onVote(handler)` 注册一次即可收到来自任意平台的投票。

3. `chatFanOut.ts` —— 多平台发送广播。结构类型
   `PlatformSendChat {sendChat(message): Promise<{ok:true;messageId}|
   {ok:false;reason}>}`、`MultiPlatformSendChatResult = Record<string,
   ...>`、`MultiPlatformSendChatConfig {twitch?; youtube?; bilibili?}`、
   `MultiPlatformSendChat {sendChat(message): Promise<
   MultiPlatformSendChatResult>}`、`createMultiPlatformSendChat(config)`。
   `sendChat(message)` 只对 config 中**实际传入**的平台键（任意子集，
   缺失键直接不出现在结果里）**并发**调用各自的 `sendChat(message)`
   （`Promise.all`，互不阻塞、互不因某平台失败而影响其他平台），把
   每个平台的原始结果（不做任何重新解释/包装）按平台键收集进返回的
   `Record`。`PlatformSendChat` 是结构类型，三个冻结平台发送类型天然
   满足，调用方直接传入 `createTwitchSendChat(...)`/
   `createOptionalYoutubeAuthProvider` 对应的 `sendChat` 对象/
   `noopYoutubeSendChat`/`unsupportedBilibiliSendChat` 等既有实例即可，
   本节点不重新定义/不重复实现任何平台的发送逻辑。

4. `index.ts` 只原样重导出以上两个模块。**不组装任何"统一 Gateway
   顶层对象"**把 fan-in/fan-out/生命周期捆在一起（composition root
   的职责，本节点只产出两个独立、可分别使用的组合函数）。

5. 明确不做：不组装 `LivePlatformAdapter`（DEV-042 D2 已裁定 YAGNI）；
   不把 `sendChat`/`onVote` 适配成 `runtime-kernel` 的 `PlatformPort`
   签名（适配层留给未分配的未来 composition root，同 DEV-081 §9、
   DEV-080 先例，不 import/依赖 runtime-kernel）；不做任何平台连接
   生命周期编排（connect/disconnect/重连——统一编排同样是
   composition root 的职责）；不重开 DEV-044 把
   `createInteractionAggregator` 迁出 `platform-core` 或修改
   `platform-core` 任何文件（该决策已冻结被广泛引用，搬迁纯属 churn；
   本节点只是首次让 `interaction-engine` 这个保留包名承载它真正对应
   的职责——多平台组合，不是聚合算法本体）。

6. 包依赖恰为 `@interactive-story/platform-core`/`platform-twitch`/
   `platform-youtube`/`platform-bilibili` 四项（workspace），无第三方
   SDK、零真实网络/WebSocket 调用。

7. 测试要求（A09–A13 行为断言）：A09 分别喂给 `twitchOnNotification`/
   `youtubeOnMessage`/`bilibiliOnMessage` 各自平台原始形状的消息（内容
   分别解析为 A/B/C/D 投票），断言同一个已注册的 `onVote` handler
   收到全部三次调用（证明三平台汇入同一聚合器）；A10 非有效投票文本
   （如 `'hello'`）经任一平台回调喂入后 `onVote` handler 不被调用
   （复用 DEV-044 既有解析语义，不重新实现）；A11
   `createMultiPlatformSendChat(config)` 的 `sendChat(message)` 只对
   config 中实际提供的平台键并发调用对应 `sendChat`，返回的 `Record`
   的键恰为 config 中提供的平台键集合（未提供的平台不出现在结果里）；
   A12 传入至少两个桩 `PlatformSendChat`（一个 resolve `{ok:true,
   messageId}`、一个 resolve `{ok:false,reason}`）断言两者的结果原样
   出现在返回的 `Record` 里，互不影响（一个失败不影响另一个的结果/
   不抛异常）；A13 `PlatformSendChat` 类型可直接被
   `createTwitchSendChat`/`createYoutubeSendChat`/
   `unsupportedBilibiliSendChat` 的返回值/实例赋值（结构类型兼容，
   零适配代码）——类型级断言（TS 编译通过即满足），可选补充运行时
   测试。

8. Forbidden（抄录自 Task Package §3）：修改 Writable Scope 之外的
   任何既有文件；import 或依赖 host-memory/runtime-kernel/ai-host 或
   四平台之外的任何既有包；新增任何第三方 SDK/npm 依赖；实现真实
   网络/WebSocket 调用；把 sendChat/onVote 适配成 PlatformPort 签名；
   组装跨平台连接生命周期编排；import 三个平台 client 内部实现文件
   （eventSubClient.ts/liveChatPoller.ts/liveConnectClient.ts）；新建
   去重逻辑；新建速率限制/反垂直轰炸/内容过滤逻辑；把
   `createInteractionAggregator` 迁出 platform-core 或修改 platform-core
   任何既有文件。

9. Definition of Done：六条命令（`pnpm install --frozen-lockfile`/
   `pnpm typecheck`/`pnpm lint`/`pnpm format:check`/`pnpm build`/
   `pnpm test`）全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md`
   入库；`REPORT.md` 完成且 `INDEX.md` Status = `READY_FOR_REVIEW`；
   LEDGER 追加行与 NODE_REPORT 消息文件已写入工作区但未提交；工作区
   无残留临时文件；测试零真实网络/WebSocket 调用。
