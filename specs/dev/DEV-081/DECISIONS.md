# DEV-081 DECISIONS

## D1 — Dev Spec 第 47 节「数据存储策略须单独合规检查」对本节点不构成新增实现义务

Dev Spec 第 47 节正文要求 Bilibili Adapter 的数据存储策略"必须单独经过
平台合规检查，不能简单照搬 Twitch Viewer Memory"。事实核查
（`packages/host-memory/src/hostMemory.ts:17-20,38-42`，直接读源码）：
DEV-054 冻结的 `purge(retentionMsByPlatform: Record<string, number>)`、
`recallViewer(platform, viewerId)`、`addRunningJoke(platform, ...)`、
`listRunningJokes(platform)` 全部以 `platform: string` 为**通用参数**，
从未硬编码 Twitch——DEV-010（CR-017 §3.3）的"按平台可配置"合规前置
已在 DEV-054 落地成一个平台无关的存储/清理层，接口层面已支持 Bilibili
（传 `'bilibili'` 即可）。同时 Twitch/YouTube 两个既有 Adapter
（`platform-twitch`/`platform-youtube`）均**从未直接调用
`host-memory`**——Adapter 的职责边界止于产出 `NormalizedChatMessage`，
交给未分配的未来组装层决定是否/如何写入。因此合规检查要求的对象
（真实持久化实现）在本节点内根本不存在：本节点不触碰
`host-memory`、不做任何数据持久化，无需也不应该在本节点内提前
假设/发明该集成方式。见 REQUIREMENTS 第 1 点、INDEX Read-only Scope。

## D2 — 不照搬 `eventSubClient.ts` 的 WebSocket 八态机作为 Bilibili 的状态拓扑

Dev Spec 第 45 节冻结的八态列表是 Twitch 专属权威定义，第 47 节对
Bilibili 无对应状态拓扑，机制也不同：本协议**有两条独立心跳**（HTTP
场次心跳 20s + WS 心跳 30s），Twitch/YouTube 均只有一条。因此用
Task Package §2 冻结的六态 `STOPPED|STARTING|CONNECTING|
AUTHENTICATING|CONNECTED|ERROR`（认证期显式成态，因为真实协议下
认证失败服务端可能不回任何包、AUTHENTICATING 期间提前
close/error 必须落 ERROR）。实现用状态变量 + generation 代数守卫
（同 `liveChatPoller.ts` 先例），**不引入 xstate**——forbidden 新增
第三方依赖，且单连接状态机用代数守卫已够，照搬机器即发明。

## D3 — `receivedAt` 对齐 YouTube 的「用真实服务端时间字段」处置而非 Twitch 的「用本地时钟」处置

Bilibili 弹幕事件真实携带服务端权威秒级时间 `data.timestamp`，同
YouTube `snippet.publishedAt` 的字段可用性，与 Twitch 通知载荷无服务端
时间字段、只能用本地时钟收到时间的处置**刻意不同**——按"字段可用性
决定处置"的既有纪律（DEV-080 D3 同源裁定），不套用同一模板：
`receivedAt = message.timestamp * 1000`（秒转毫秒）。

## D4 — `sendChat.ts` 只导出一个恒失败常量、无 config 化工厂

Bilibili 官方开放平台（`open-live.biliapi.com` `/v2/app/*`）只有
`start`/`heartbeat`/`end` 三个接口，**协议层面没有以 App 身份发送弹幕
的接口**——这不是凭据缺失式降级（Twitch/YouTube `noop*SendChat`
先例的前提是"凭据齐全后可用"），而是能力本身不存在。唯一已知的发送
端点 `POST api.live.bilibili.com/msg/send` 是 `live.bilibili.com` 网页端
非官方接口，鉴权模型是登录态 Cookie（`SESSDATA`/`bili_jct`），与开放
平台签名模型完全不同，落地即引入未经合规审查的用户会话凭据存储——
正是 Dev Spec 第 47 节"数据处理规则须单独合规检查"要警惕的对象，
本节点不落地。提供一个"看起来可配置但恒失败"的工厂会误导未来调用
方以为凭据齐全就能用、掩盖"协议不支持"这一事实，故不设 config 参数、
不提供工厂（诚实纪律，同 noop 系列先例但更进一步）。

## D5 — 不实现 Brotli 解压与多主机 failover/自动重试/断线重连

真实协议 `protoVersion=3` 时用 Brotli 压缩 body，但本节点固定发送/
期望 `protoVersion∈{0,1}`（0=不压缩业务消息/1=不压缩连接类消息），
收到 3（及 2/zlib）的包视为解码解析失败、静默跳过——测试环境永不会
产生需要 Brotli 的场景，不新增 Brotli 依赖处理不存在的问题（同"字段
不对时诚实失败"先例）。`wss_link` 只取第一个，HTTP/WS 任一阶段失败即
`ERROR` 不自动重试：failover/重连策略是未分配的未来职责（同
DEV-080/040/041 先例），不是本节点发明解决方案的地方。同一纪律
延伸到去重：`msg_id` 唯一但不等于已观测到重复投递，不新建
`messageDedup.ts` 类比物。

## D6 — HMAC 签名用 Node 内置 `node:crypto`，不新增第三方依赖

`createHash('md5')`/`createHmac('sha256')`/`randomBytes` 是 Node 运行时
自带 API，与全局 `fetch`/`WebSocket` 一样不算"新增依赖"——延续
`twitchAuth.ts`/`youtubeAuth.ts` 零 SDK 手写 `fetch` 先例，实现方保持
"恰一个 workspace 依赖 `@interactive-story/platform-core`"不变。

## D7 — 全部测试注入假 `fetchImpl`/`webSocketImpl`/`clock`，零真实网络/WebSocket 连接

同 Twitch/YouTube 先例：`bilibiliAuth.test.ts` 注入 `fetchImpl`
（vi.fn 返回手写 `Response` 或抛错），`liveConnectClient.test.ts` 注入
FakeWebSocket（登记实例、记录 send 字节、emit 模拟服务端事件，同
eventSubClient.test.ts）与 FakeClock（setTimeout 只登记不触发、记录
timeout 参数、clearTimeout 清除槽位、手动 runTimer 推进）。真实账号/
密钥（`BILIBILI_APP_ID` 等）继续占位处理，
`createOptionalBilibiliAuthProvider` 凭据缺失降级 `noopBilibiliAuthPort`，
不阻塞本节点关闭（USER 已就 M8 明确裁决"不要让任何真实数据阻碍完成"）。

## D8 — 解码语义：一条 WS 消息 = 一个完整帧；多帧拼接不做

真实协议存在服务端批量推送（一条消息含多个 16 字节头拼接的包）的
可能性，但官方文档未证实、本节点测试/运行场景（认证回复 + 逐条弹幕
推送）不会产生——decode 要求 `packetLen === 整个 buffer 长度`，不等
即返回 `undefined` 静默跳过，诚实面对"多帧拼接未经证实"这一事实而
不发明解析器（同 D5 纪律）。`headerLen !== 16` 同样视为布局不可信、
解析失败。
