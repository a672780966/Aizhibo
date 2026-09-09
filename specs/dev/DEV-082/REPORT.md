# DEV-082 REPORT

## 1. Status

READY_FOR_REVIEW — DEV-082（Interaction Gateway，M8 — Platform
Expansion 第三个节点）T001–T002 施工完成，六条验证命令全部退出码 0，
恰 1 条提交。待 AUDITOR 审计。

## 2. Implemented

新建 `packages/interaction-engine`
（`@interactive-story/interaction-engine`）——DAG.md:676 冻结 17 包
列表中**此前从未被创建**的保留包名，本节点首次真正投入使用。范围
基于 Task Package §1 的事实核查（直接读六个冻结文件）：三个平台
Adapter 的 `ChatHandler` 包装函数从未被接到同一个共享聚合器上、
`sendChat` 侧"广播到全部已连接平台"从未被统一成一次调用。职责澄清
见 DECISIONS D1–D5。`package.json` `dependencies` **恰四项**
（`workspace:*`）：`@interactive-story/platform-core`/
`platform-twitch`/`platform-youtube`/`platform-bilibili`，无第三方
依赖（A07）；`tsconfig.json` 与既有包逐字一致；根 `tsconfig.json`
追加一条 references 条目；`pnpm-lock.yaml` 新增 importer 条目。

- `src/chatFanIn.ts`：`createMultiPlatformChatFanIn()` 内部**恰一个**
  `createInteractionAggregator()` 实例（A08），同一 `ChatHandler`
  闭包（调用该实例的 `ingest`）分别喂给三个平台既有的
  `createTwitchChatOnNotification`/`createYoutubeChatOnMessage`/
  `createBilibiliChatOnMessage` 包装函数——三个返回的回调形状与各
  平台 client 的 `onNotification`/`onMessage` 配置项精确兼容，接线
  到具体 client 是 composition root 的职责（本文件只 import 三包
  的 `chatMessageAdapter.ts` 导出，不 import/依赖三个 client 实现
  文件，A15）。三平台原始形状消息经各自平台回调喂入后汇入同一个
  `aggregator`，`aggregator.onVote(handler)` 注册一次即收到任意平台
  的投票（A09）；非法文本复用 DEV-044 既有解析语义静默忽略（A10）。
- `src/chatFanOut.ts`：结构类型 `PlatformSendChat` + 
  `createMultiPlatformSendChat(config)`。`sendChat(message)` 按
  `PLATFORM_KEYS`（twitch/youtube/bilibili）顺序过滤出 config 中
  **实际提供**的平台键，`Promise.all` 并发调用各自 `sendChat`，按
  平台键原样收集 `MultiPlatformSendChatResult` Record——缺失键不出现
  在结果里、不重新解释/包装结果（A11/A12）。`PlatformSendChat` 是
  结构类型，三个冻结平台发送类型（`TwitchSendChat`/
  `YoutubeSendChat`/`BilibiliSendChat`，方法名/参数/返回值形状完全
  一致）天然满足，本文件不重新定义任何平台发送逻辑（A13）。
- `src/index.ts`：两行 barrel 原样重导出 `chatFanIn.js`/
  `chatFanOut.js`，**不组装任何"统一 Gateway 顶层对象"**（A16）。
- 两个测试文件（新增，4+5 = 9 测试）：全部使用桩 `ChatHandler`/
  桩 `PlatformSendChat` 对象，**零真实网络/WebSocket 调用、不 import
  `fetch`/`WebSocket`、无 `fetchImpl`/`webSocketImpl`/`clock` 注入**
  （A17，D5）——平台原始形状消息直接以内联对象实参喂回调，结构类型
  检查保证与三平台冻结形状兼容，测试文件不 import 三个平台 client
  内部实现文件（A15）。

## 3. Verification

六条命令全部退出码 0（在新增包 + 根 references + 锁文件改动后执行）：

| 命令 | 结果 |
|---|---|
| `pnpm install --frozen-lockfile` | 退出码 0 |
| `pnpm typecheck` | 退出码 0 |
| `pnpm lint` | 退出码 0 |
| `pnpm format:check` | 退出码 0 |
| `pnpm build` | 退出码 0 |
| `pnpm test` | 退出码 0，**917/917 通过**（既有 908 + 新增 9，零回归） |

## 4. Acceptance Matrix（A01–A19）

| # | 结果 | 证据 |
|---|---|---|
| A01 | PASS | `pnpm install --frozen-lockfile` 退出码 0 |
| A02 | PASS | `pnpm typecheck` 退出码 0 |
| A03 | PASS | `pnpm lint` 退出码 0 |
| A04 | PASS | `pnpm format:check` 退出码 0 |
| A05 | PASS | `pnpm build` 退出码 0 |
| A06 | PASS | `pnpm test` 退出码 0；160 个测试文件 917/917 通过，新增 9 测试（4 fan-in + 5 fan-out），既有 908 零回归 |
| A07 | PASS | `package.json` `dependencies` 恰四项 `@interactive-story/platform-core`/`platform-twitch`/`platform-youtube`/`platform-bilibili`（均 `workspace:*`），零第三方 SDK |
| A08 | PASS | 读源码：`createMultiPlatformChatFanIn()` 恰一次 `createInteractionAggregator()`；单一 `handler` 闭包喂给三个包装函数 |
| A09 | PASS | `chatFanIn.test.ts`：twitch('A')/youtube('B')/bilibili('C')/twitch('D') 原始形状消息喂入后，一次注册的 onVote handler 收到全部 4 次调用（viewerId/choiceId 逐一断言，含同平台多条） |
| A10 | PASS | `chatFanIn.test.ts`：'hello'（twitch）/ 'AB'（youtube）/ ''（bilibili）喂入后 votes 为空数组（handler 零调用） |
| A11 | PASS | `chatFanOut.test.ts`：config 提供 {twitch, bilibili} 时只并发调用二者、结果键恰为二者，youtube 不被调用不出现在结果；空 config 返回空 Record 不抛异常；慢平台不阻塞其他平台（deferred 断言） |
| A12 | PASS | `chatFanOut.test.ts`：twitch resolve `{ok:true,messageId:'tw-ok'}` + youtube resolve `{ok:false,reason:'youtube rate limited'}`，两者原样出现在 Record 里、互不影响、整体不抛异常 |
| A13 | PASS | 类型级：`noopTwitchSendChat`（TwitchSendChat）/`noopYoutubeSendChat`（YoutubeSendChat）/`unsupportedBilibiliSendChat`（BilibiliSendChat）三个真实常量直接赋给 `PlatformSendChat` 配置位，tsc 编译通过（零适配代码）；运行时测试三者 sendChat 结果原样收集 |
| A14 | PASS | grep 全包源码：无 host-memory/runtime-kernel/ai-host import |
| A15 | PASS | grep 全包源码：无 eventSubClient/liveChatPoller/liveConnectClient import；只 import 三包 chatMessageAdapter.ts/sendChat.ts 导出（含 index 桶导出常量） |
| A16 | PASS | 读源码：无 PlatformPort 等价形状适配（无 connect/disconnect/getHealth 方法）；index.ts 仅 barrel，无 LivePlatformAdapter 式顶层对象 |
| A17 | PASS | 读测试代码：全部桩函数/桩对象，无 fetch/WebSocket import，零真实网络调用 |
| A18 | PASS | 包文件列表仅 7 个文件（index/chatFanIn/chatFanIn.test/chatFanOut/chatFanOut.test/package.json/tsconfig.json）；无 messageDedup/速率限制/内容过滤模块 |
| A19 | PASS | `git diff --stat` 核对：改动仅限 Writable Scope（7 包文件 + 根 tsconfig + lock + 文档 5）；既有文件只动根 tsconfig/lock 两处授权项 |

## 5. Scope Check

- Writable Scope 外零改动：`platform-core/`、`platform-twitch/`、
  `platform-youtube/`、`platform-bilibili/`、`runtime-kernel/`、
  `host-memory/` 无任何改动；`specs/PROJECT_INDEX.md`、
  `specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、
  `specs/protocol/**` 均未修改。根 `tsconfig.json` 只追加一条
  references 条目（diff 单行）；`pnpm-lock.yaml` 只新增 importer
  条目。
- 未 import/依赖 host-memory/runtime-kernel/ai-host 或四平台之外的
  任何既有包；未新增第三方 SDK；零真实网络/WebSocket；无
  PlatformPort 适配、无 LivePlatformAdapter 式组装、无连接生命周期
  编排、无去重/速率限制/内容过滤模块；未修改四平台与 runtime-kernel
  任何一行。
- 提交后工作区仅剩 LEDGER 追加行与 NODE_REPORT 消息文件两处未提交
  改动（§8）。

## 6. Commit

恰 1 条提交（见 `git log -1`），首行 `DEV-082:` 前缀，包含全部代码
与节点文档；LEDGER 追加行与 NODE_REPORT 消息文件**不在**提交内。

## 7. Handoff

- 本 LEDGER 追加行（seq 0344，置于历史消息表格内、`---` 分隔符之前、
  `当前待处理` 表格之前）与消息文件
  `specs/comms/0344-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-082.md`
  **未提交**，留待 Commander/AUDITOR 收尾。
- 真实 composition root（把 fan-in/fan-out 接到三个平台 client 的
  真实 connect()/onMessage/onNotification 配置项、把
  `aggregator.onVote` 接到 `runtime-kernel` 的 `PlatformPort.onVote`、
  把 `createMultiPlatformSendChat` 的结果适配成 `PlatformPort.sendChat`
  签名）属未来节点（Out of Scope），本节点产出两个独立组合函数供其
  原样消费，不阻塞。
