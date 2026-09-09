# DEV-081 INDEX

Status: DONE

## Current Node

DEV-081 — Bilibili Adapter（M8 — Platform Expansion 第二个节点）

## Objective

新建 `packages/platform-bilibili`（`@interactive-story/platform-bilibili`，
包名已在 `specs/dev/DAG.md:676` 冻结的 17 包列表预留）。Dev Spec
第 47 节（`DEV_SPEC_V1.0.md:1775-1787`）对本节点只有「最终产品预留」
正文，且其「数据存储策略必须单独经过平台合规检查」经事实核查不构成
本节点的新增实现义务（§1 论证，见 DECISIONS D1）。结构对齐
`platform-twitch`/`platform-youtube` 先例、按真实机制调整：

1. `bilibiliAuth.ts` —— 项目场次生命周期（`/v2/app/start` →
   `game_info.game_id`/`websocket_info.auth_body`/`websocket_info.wss_link`；
   `/v2/app/heartbeat` 每 20 秒；`/v2/app/end`）+ HMAC-SHA256 签名
   HTTP 客户端（零 SDK 手写 `fetch`，HMAC 用 Node 内置
   `node:crypto`），六个 `x-bili-*` 签名头按名字典序 `name:value` 行
   `\n` 拼接、`access_key_secret` 作密钥、小写十六进制 →
   `Authorization`；`createOptionalBilibiliAuthProvider(env)` 在
   `BILIBILI_APP_ID`/`BILIBILI_ACCESS_KEY_ID`/`BILIBILI_ACCESS_KEY_SECRET`/
   `BILIBILI_ANCHOR_CODE` 任一缺失时降级 `noopBilibiliAuthPort`。
2. `liveConnectClient.ts` —— WebSocket 长连客户端，**不照搬**
   `eventSubClient.ts` 的八态机（Dev Spec 第 45 节八态是 Twitch 专属
   权威定义，第 47 节无对应状态拓扑；机制也不同：本协议有两条独立
   心跳——HTTP 场次心跳与 WS 心跳）：只用六态
   `STOPPED|STARTING|CONNECTING|AUTHENTICATING|CONNECTED|ERROR`，状态
   变量 + generation 代数守卫（同 liveChatPoller 先例，不引入 xstate）。
   `connect()` 时 `startGame()` 失败直接 `ERROR`、`wss_link` 只取第一
   个（无 failover/自动重试）；`onopen` 后发 op=7 认证包（body 为
   `auth_body` 原样字节，本节点不解析其内容），收 op=8 且
   `code===0` → `CONNECTED`；`CONNECTED` 后两条独立定时器：20 秒 HTTP
   `heartbeat(gameId)`（失败不中断连接、只记录在 `getHealth().error`，
   体现为 DEGRADED）+ 30 秒 WS op=2 空 JSON 心跳包。op=5 业务包按
   `cmd` 分发，只处理 `LIVE_OPEN_PLATFORM_DM`（取真实字段
   `open_id`/`msg_id`/`msg`/`timestamp` 组 `BilibiliChatMessage`），其余
   cmd 与畸形包静默跳过。16 字节包头（`packetLen` int32 BE /
   `headerLen` int16 恒 16 / `protoVersion` int16 / `op` int32 / `seq`
   int32 BE，客户端固定 1）encode/decode，`protoVersion` 在 {0,1} 之外
   （zlib=2/Brotli=3）视为解析失败；`onMessage` 回调内同步
   `disconnect()` 的重入场景有显式状态/代数再校验（DEV-080 MAJOR-01
   教训在本节点的回归测试覆盖）。`disconnect()`：取消两条定时器、
   关 WebSocket、best-effort `endGame`、转 `STOPPED`。
3. `chatMessageAdapter.ts` —— `normalizeBilibiliChatMessage` 用真实
   服务端秒级 `timestamp × 1000` 作 `receivedAt`（**刻意对齐**
   `normalizeYoutubeChatMessage` 的 `publishedAt` 处置、不同于 Twitch
   的本地时钟处置——字段可用性决定处置）；`openId`/`msgId` 空串或
   `text`/`timestamp` 类型不对 → `undefined` 诚实失败；
   `createBilibiliChatOnMessage(handler)` 外部包装。
4. `sendChat.ts` —— **能力缺口的诚实反映**：Bilibili 官方开放平台
   （`/v2/app/*`）**没有应用级发送弹幕接口**，不是凭据缺失而是协议
   层面能力不存在；只导出恒失败常量 `unsupportedBilibiliSendChat`，
   **无 config 化工厂**（与 Twitch/YouTube `noop*SendChat` 凭据缺失式
   降级先例刻意不同——连"配置齐全后可用"都不存在，工厂会误导调用
   方；非官方 `api.live.bilibili.com/msg/send` Cookie 鉴权端点不落地，
   是 Dev Spec 第 47 节警惕的未经合规审查凭据存储）。

**不新建 `messageDedup.ts` 类比物**（`msg_id` 唯一但不等于已观测到
重复投递——不为未证实的问题发明解决方案）；**不触碰
`host-memory`**（§1 合规裁决：Adapter 边界止于产出
`NormalizedChatMessage`）；**不组装 `LivePlatformAdapter` 顶层对象**
（DEV-042 D2 YAGNI 裁定延续，见 DECISIONS D2）。恰一个 workspace
依赖 `@interactive-story/platform-core`；零第三方 SDK。测试全部注入
假 `fetchImpl`/`webSocketImpl`/`clock`，零真实网络/WebSocket。

## Allowed Scope

```
packages/platform-bilibili/package.json                        （新增）
packages/platform-bilibili/tsconfig.json                        （新增）
packages/platform-bilibili/src/index.ts                          （新增）
packages/platform-bilibili/src/bilibiliAuth.ts                   （新增）
packages/platform-bilibili/src/bilibiliAuth.test.ts              （新增）
packages/platform-bilibili/src/liveConnectClient.ts             （新增）
packages/platform-bilibili/src/liveConnectClient.test.ts        （新增）
packages/platform-bilibili/src/chatMessageAdapter.ts            （新增）
packages/platform-bilibili/src/chatMessageAdapter.test.ts       （新增）
packages/platform-bilibili/src/sendChat.ts                      （新增）
packages/platform-bilibili/src/sendChat.test.ts                 （新增）
tsconfig.json                                                     （根，追加一条 references 条目）
pnpm-lock.yaml（自动生成：新增 packages/platform-bilibili 的 importer
条目，含对 @interactive-story/platform-core 的 workspace 依赖解析——
新增包被授权后 pnpm 工具链的强制副作用，同 DEV-070 msg 0310 裁定，
已连续适用于 DEV-071~080）
specs/dev/DEV-081/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交；追加行放在历史消息表格
`---` 分隔符之前，不放文件末尾"当前待处理"表格之后）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
packages/platform-core/src/index.ts、interactionAggregator.ts（Read-only，
只消费 NormalizedChatMessage/ChatHandler 类型，不修改）
packages/platform-twitch/src/twitchAuth.ts、eventSubClient.ts、
chatMessageAdapter.ts、sendChat.ts（Read-only，结构先例参考，
不 import、不新增对 platform-twitch 的 workspace 依赖）
packages/platform-youtube/src/youtubeAuth.ts、liveChatPoller.ts、
chatMessageAdapter.ts、sendChat.ts（Read-only，结构先例参考，
尤其 receivedAt 用真实服务端时间字段的处置）
packages/host-memory/src/hostMemory.ts（Read-only，仅用于确认
purge/recallViewer/addRunningJoke/listRunningJokes 均为平台无关
通用参数——合规裁决的事实依据，不 import、不新增对 host-memory
的 workspace 依赖）
specs/baseline/DEV_SPEC_V1.0.md 第 1775-1787 行、
specs/audit/CR-RESOLUTIONS-001.md 第 198-260 行（Read-only）
```

## Forbidden Scope

```
修改除本节点 Writable Scope 之外的任何既有文件
import 或依赖 @interactive-story/platform-twitch、
@interactive-story/platform-youtube、@interactive-story/host-memory、
@interactive-story/platform-core 之外的任何其他既有包
新增任何第三方 SDK/npm 依赖（HMAC 用 Node 内置 node:crypto；不新增
ws/isomorphic-ws 等第三方 WebSocket 库，同 eventSubClient.ts 用全局
WebSocket 的先例）
实现 Brotli 解压（protoVersion=3 视为解析失败，不新增依赖处理测试
环境永不会产生的场景）
实现任何多主机 failover/自动重试/断线重连逻辑（wss_link 只取第一个，
任一阶段失败即 ERROR，重连策略是未分配的未来职责）
落地 api.live.bilibili.com/msg/send（非官方 Cookie 鉴权端点，落地即
引入未经合规审查的用户会话凭据存储，正是 Dev Spec 第 47 节警惕的
对象）
调用/修改 packages/host-memory 任何文件（Adapter 边界不包含持久化）
组装任何"LivePlatformAdapter"顶层类型或对象（DEV-042 D2 已裁定 YAGNI）
把 eventSubClient.ts 的八态机原样搬来当 Bilibili 的状态拓扑
新建去重逻辑（未证实的问题不发明解决方案）
真实调用任何网络 API（测试必须全部注入 fetchImpl/webSocketImpl/clock
假实现；账号/密钥继续占位处理）
```

## Task Order

- [x] T001 节点文档（INDEX / REQUIREMENTS / ACCEPTANCE / DECISIONS / REPORT）
- [x] T002 四个源文件 + 四个测试文件 + 包骨架 + 根 `tsconfig.json` 引用 +
  全量验证（六条命令）+ `REPORT.md`/`DECISIONS.md` 填写 + commit +
  写入（不提交）LEDGER 追加行与 NODE_REPORT 消息文件

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行（seq
0340，历史消息表格 `---` 分隔符之前）与 NODE_REPORT 消息文件（seq
0340）已写入工作区但**未提交**；工作区不得残留任何施工用临时文件；
测试零真实网络/WebSocket 连接。

## Next Node

M8（Platform Expansion）内后续节点 DEV-082/083 的 Task Package
由 Commander 起草；本节点不预先为它们做任何设计假设。
