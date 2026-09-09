# DEV-081 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-081.md` 逐字抄录关键要求。
权威版本是 Task Package，不是本副本（协议 §1.4）。

1. 新建 `packages/platform-bilibili`（`@interactive-story/platform-bilibili`，
   包名已在 `specs/dev/DAG.md:676` 冻结的 17 包列表预留），恰一个
   workspace 依赖：`@interactive-story/platform-core`，无第三方 SDK。
   Dev Spec 第 47 节（`DEV_SPEC_V1.0.md:1775-1787`）对本节点只有
   "最终产品预留"正文；CR-017 §3.3/§3.4（`CR-RESOLUTIONS-001.md:228-260`）
   是合规裁决依据。**合规歧义的事实核查结论**：`host-memory` 的
   `purge(retentionMsByPlatform)`/`recallViewer(platform, viewerId)`/
   `addRunningJoke(platform, ...)`/`listRunningJokes(platform)`
   （`hostMemory.ts:17-20,38-42`）全部以 `platform: string` 为通用参数，
   从未硬编码 Twitch；Twitch/YouTube 两个既有 Adapter 均从未直接调用
   `host-memory`。因此 Dev Spec 第 47 节"数据存储策略须单独合规检查"
   对本节点（Adapter 本身）不构成新增实现义务——本节点不触碰
   `host-memory`、不做任何数据持久化。

2. `bilibiliAuth.ts` —— 项目场次生命周期 + HMAC-SHA256 签名 HTTP 客户端
   （零 SDK 手写 `fetch`，HMAC 用 Node 内置 `node:crypto`）。接口
   `BilibiliGameSession {gameId, authBody, wssLinks}`、
   `BilibiliStartResult`/`BilibiliVoidResult`、`BilibiliAuthPort`
   （`startGame`/`heartbeat`/`endGame`）、`noopBilibiliAuthPort`、
   `BilibiliAuthProviderConfig`、`createBilibiliAuthProvider`、
   `createOptionalBilibiliAuthProvider`（读取 `BILIBILI_APP_ID`/
   `BILIBILI_ACCESS_KEY_ID`/`BILIBILI_ACCESS_KEY_SECRET`/
   `BILIBILI_ANCHOR_CODE`，任一缺失返回 `noopBilibiliAuthPort`）。

3. 真实协议签名：`POST /v2/app/start`（body `{code: anchorCode, app_id:
   appId}`）、`/v2/app/heartbeat`（body `{game_id}`）、`/v2/app/end`
   （body `{app_id, game_id}`），签名 Header 六件套：`x-bili-content-md5`
   （body JSON 字符串 MD5）、`x-bili-timestamp`（10 位）、
   `x-bili-signature-version: 1.0`、`x-bili-signature-nonce`（随机串）、
   `x-bili-signature-method: HMAC-SHA256`、`x-bili-accesskeyid`，
   `Authorization` 为上述字段按固定顺序 `\n` 拼接后用
   `access_key_secret` 作密钥的 HMAC-SHA256 十六进制结果。成功响应体真实
   字段 `data.game_info.game_id`/`data.websocket_info.auth_body`/
   `data.websocket_info.wss_link`；非 2xx/异常 → `{ok:false,reason}`
   不抛异常。

4. `liveConnectClient.ts` —— WebSocket 长连客户端，替代 Twitch 的
   `eventSubClient.ts`（**不照搬**其八态机——Dev Spec 第 45 节八态列表
   是 Twitch 专属权威定义，本协议有两条独立心跳）。状态拓扑
   `STOPPED | STARTING | CONNECTING | AUTHENTICATING | CONNECTED | ERROR`。
   `connect()` → `STARTING` 调 `startGame()`，失败直接 `ERROR`（不做任何
   多主机 failover——`wss_link` 只取第一个）；成功后 `CONNECTING` 打开
   `wssLinks[0]`；`onopen` 后发 op=7 认证包（body 为 `auth_body` 原样
   字节），转 `AUTHENTICATING`；收 op=8 且 `body.code===0` → `CONNECTED`，
   否则 → `ERROR`（`AUTHENTICATING` 期间 WS 提前 `onclose`/`onerror`
   同样 → `ERROR`）。`CONNECTED` 后两条独立定时器：每 20 秒
   `authPort.heartbeat(gameId)`（失败不中断连接、只记录在
   `getHealth().error`）+ 每 30 秒 WS op=2 空 JSON 心跳包。op=5 包按
   `cmd` 分发，只处理 `LIVE_OPEN_PLATFORM_DM`（取 `data.open_id`/
   `data.msg_id`/`data.msg`/`data.timestamp` 组 `BilibiliChatMessage` 调
   `onMessage`），其余 cmd 静默跳过。`disconnect()`：取消两条定时器、
   关 WebSocket、best-effort `endGame(gameId)`、转 `STOPPED`。16 字节包头
   `packetLen(int32)/headerLen(int16,恒16)/protoVersion(int16)/op(int32)/
   seq(int32，客户端固定 1)` + UTF-8 JSON body，必须按真实字段顺序/字节
   长度实现并有独立单元测试（encode→decode 恒等 + 已知真实样例包解码）。

5. `chatMessageAdapter.ts` —— `normalizeBilibiliChatMessage` 逐字段映射：
   `platform:'bilibili'`、`viewerId: openId`、`messageId: msgId`、
   `text: msg`、`receivedAt: timestamp * 1000`（真实服务端秒级时间——
   **对齐 `normalizeYoutubeChatMessage` 而非 `normalizeTwitchChatMessage`**，
   Bilibili 事件真实携带 `timestamp` 服务端字段，同 YouTube 的
   `publishedAt`；字段可用性决定处置，不套用同一模板）。`openId`/`msgId`
   空串或 `text`/`timestamp` 类型不对 → `undefined` 诚实失败。
   `createBilibiliChatOnMessage(handler)` 包装为 onMessage 形状。

6. `sendChat.ts` —— **诚实反映能力缺口**：官方开放平台无应用级发送弹幕
   接口，不是凭据缺失而是协议层面能力不存在。只导出
   `unsupportedBilibiliSendChat` 恒失败常量，**不提供任何
   `createBilibiliSendChat(config)` 工厂**（没有真实端点可配置；唯一已知
   的发送端点 `api.live.bilibili.com/msg/send` 是非官方 Cookie 鉴权模型，
   落地即引入未经合规审查的用户会话凭据存储，是 Dev Spec 第 47 节警惕
   的对象，不落地）。

7. `index.ts` 只原样重导出以上四个模块，不组装任何顶层 Adapter 对象
   （DEV-042 D2 YAGNI 裁定延续）。**不新建 `messageDedup.ts` 类比物**
   （协议不保证不重复投递，但 Dev Spec/官方文档均未描述任何已观测到的
   重复投递场景，不为未证实的问题发明去重层）。**不触碰
   `host-memory`**。

8. Forbidden：修改 Writable Scope 之外的任何既有文件；import/依赖
   platform-twitch/platform-youtube/host-memory/platform-core 之外的任何
   包；新增任何第三方 SDK/npm 依赖（不新增 `ws`/`isomorphic-ws`，用全局
   WebSocket）；实现 Brotli 解压（protoVersion=3 视为解析失败）；实现
   多主机 failover/自动重试/断线重连；落地非官方 Cookie 鉴权发送端点；
   调用/修改 `host-memory`；组装 `LivePlatformAdapter` 顶层对象；照搬
   八态机；新建去重逻辑；真实调用任何网络 API（测试全部注入
   `fetchImpl`/`webSocketImpl`/`clock` 假实现，账号/密钥占位处理）。
