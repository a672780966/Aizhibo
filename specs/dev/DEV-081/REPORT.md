# DEV-081 REPORT

## 1. Status

READY_FOR_REVIEW — DEV-081（Bilibili Adapter，M8 第二个节点）T001–T002
施工完成，六条验证命令全部退出码 0，恰 1 条提交。待 AUDITOR 审计。

## 2. Implemented

新建 `packages/platform-bilibili`（`@interactive-story/platform-bilibili`）。
职责澄清自 Task Package 第 1 节：Dev Spec 第 47 节（
`DEV_SPEC_V1.0.md:1775-1787`）的「数据存储策略必须单独经过平台合规
检查」经直接读源码的事实核查（`host-memory/src/hostMemory.ts:17-20,
38-42`：`purge(retentionMsByPlatform)`/`recallViewer(platform, ...)`/
`addRunningJoke(platform, ...)`/`listRunningJokes(platform)` 全部以
`platform: string` 为通用参数，从未硬编码 Twitch）确认 DEV-054 的
存储/清理层已是平台无关通用参数，且 Twitch/YouTube 两个既有 Adapter
从未直接调用 `host-memory`——本节点遵循相同边界，不触碰
`host-memory`、不做任何数据持久化（DECISIONS D1）。结构对齐
`platform-twitch`/`platform-youtube` 先例、按真实机制调整。
`package.json` `dependencies` **恰一项**：
`@interactive-story/platform-core`（`workspace:*`），无第三方依赖
（A07）；`tsconfig.json` 与既有平台包逐字一致。

- `src/bilibiliAuth.ts`：项目场次生命周期 + HMAC-SHA256 签名 HTTP
  客户端。`startGame()` 签名 POST `{baseUrl}/v2/app/start`（body
  `{code: anchorCode, app_id: appId}`），成功响应体按真实字段路径
  解析 `data.game_info.game_id`/`data.websocket_info.auth_body`/
  `data.websocket_info.wss_link` 为 `BilibiliGameSession`；`heartbeat`
  （body `{game_id}`）与 `endGame`（body `{app_id, game_id}`）同一
  签名机制。签名按真实官方布局：六个 `x-bili-*` 头（content-md5 =
  body JSON 字符串的 MD5 / timestamp 10 位 / signature-version `1.0` /
  signature-nonce 随机串 / signature-method `HMAC-SHA256` /
  accesskeyid）按名字典序 `name:value` 行 `\n` 拼接，`access_key_secret`
  作密钥 HMAC-SHA256 小写十六进制 → `Authorization`；纯函数
  `bilibiliContentMd5`/`computeBilibiliAuthorization` 供已知向量直测。
  `createOptionalBilibiliAuthProvider(env)` 在 `BILIBILI_APP_ID`/
  `BILIBILI_ACCESS_KEY_ID`/`BILIBILI_ACCESS_KEY_SECRET`/
  `BILIBILI_ANCHOR_CODE` 任一缺失/空时返回 `noopBilibiliAuthPort`
  （三个方法恒 `{ok:false}` 零网络）。非 2xx/非 JSON/`code !== 0`/
  响应缺字段/fetch 抛错 → `{ok:false, reason}`，不抛异常（A08）。
- `src/liveConnectClient.ts`：WebSocket 长连客户端，六态拓扑
  `STOPPED|STARTING|CONNECTING|AUTHENTICATING|CONNECTED|ERROR`（Task
  Package §2 冻结，**不照搬** Twitch 八态机，DECISIONS D2）。`connect()`
  → `STARTING` 调 `authPort.startGame()`；失败直接 `ERROR`（诚实失败，
  无 failover——`wss_link` 只取第一个，A12）；成功后 `CONNECTING` 用
  注入/全局 `WebSocket` 打开 `wssLinks[0]`，`onopen` 发送 op=7 认证包
  （protoVersion=1、seq=1，body 为 `auth_body` 原样字节，本节点不解析
  其内容，同真实协议"第三方无需关注"性质），转 `AUTHENTICATING`；
  收 op=8 且 `body.code === 0` → `CONNECTED`（A13），否则 → `ERROR`
  （AUTHENTICATING 期间提前 close/error 同样 → ERROR）。CONNECTED 后
  两条独立定时器（A14）：每 20 秒 HTTP `authPort.heartbeat(gameId)`
  （失败不中断连接、记录在 `getHealth().error` → DEGRADED，成功恢复
  OK）+ 每 30 秒 WS op=2 心跳包（空 JSON body）。op=5 业务包按 `cmd`
  分发，只处理 `LIVE_OPEN_PLATFORM_DM`（真实字段 `data.open_id`/
  `msg_id`/`msg`/`timestamp` → `BilibiliChatMessage` 调 `onMessage`），
  其余 cmd/畸形包/非 JSON body/protoVersion=3（Brotli）一律静默跳过
  （A15）。包头 encode/decode：16 字节 `packetLen(int32 BE)/headerLen
  (int16 BE,恒16)/protoVersion(int16 BE)/op(int32 BE)/seq(int32 BE,
  客户端固定 1)` + UTF-8 JSON body；decode 要求 `headerLen===16` 且
  `packetLen === buffer 长度`（单帧语义，DECISIONS D8），
  protoVersion∉{0,1} 视为解析失败。`onMessage` 回调内同步
  `disconnect()` 的重入路径在业务帧分发后无进一步动作（状态机同步
  推进，回调即最终态；DEV-080 MAJOR-01 教训的回归覆盖）。`disconnect()`：
  取消两条定时器、关 WebSocket、best-effort `endGame(gameId)`（不等待、
  不因失败影响转换）、转 `STOPPED`（A16）。状态变量 + generation 代数
  守卫丢弃断开后晚到的 startGame/心跳/WS 事件；ERROR 后可直接再
  `connect()`。`getHealth()`：CONNECTED → OK/DEGRADED，其余 → DOWN。
- `src/chatMessageAdapter.ts`：`normalizeBilibiliChatMessage` 逐字段映射
  `platform:'bilibili'`/`viewerId: openId`/`messageId: msgId`/`text`/
  `receivedAt: timestamp * 1000`（真实服务端秒级时间——**刻意对齐**
  `normalizeYoutubeChatMessage` 的 `publishedAt` 处置、不同于 Twitch
  的本地时钟处置，DECISIONS D3，A17）；`openId`/`msgId` 空串或
  `text`/`timestamp` 类型不对 → `undefined` 诚实失败；
  `createBilibiliChatOnMessage(handler)` 纯外部包装（转换失败静默忽略）。
- `src/sendChat.ts`：**诚实反映能力缺口**（A18）——官方开放平台
  `/v2/app/*` 没有应用级发送弹幕接口，能力在协议层面不存在（非凭据
  缺失）；只导出恒失败常量 `unsupportedBilibiliSendChat`（reason 点名
  协议缺口与非官方 Cookie 端点的边界），**无 config 化工厂**
  （DECISIONS D4）。
- `src/index.ts`：四行 barrel 原样重导出四个模块（A21，无顶层 Adapter
  对象，DEV-042 D2 延续）。全包不存在 `messageDedup.ts`、Brotli 解压、
  failover/自动重试/重连、`host-memory` import、`LivePlatformAdapter`
  任何等价物（A20/A21）。

## 3. Changed Files

`git diff --stat`（对基线 `2aa7585`）：

- 新增 11 个包文件（package.json/tsconfig.json + 4 源文件 + 4 测试文件
  + src/index.ts）；根 `tsconfig.json` 追加一条 references 条目；
  `pnpm-lock.yaml` 新增 importer 条目；节点文档 5 个
  （INDEX/REQUIREMENTS/ACCEPTANCE/DECISIONS/REPORT）。
- 既有文件仅动根 `tsconfig.json` 与 `pnpm-lock.yaml` 两处授权项；
  `platform-core/`、`platform-twitch/`、`platform-youtube/`、
  `host-memory/`、`runtime-kernel/`、`specs/**` 其余文件零改动。

## 4. Tests Executed

- 六条命令严格顺序执行，全部退出码 0：`pnpm install --frozen-lockfile`
  → `pnpm typecheck`（tsc -b + --noEmit + renderer typecheck）→
  `pnpm lint` → `pnpm format:check` → `pnpm build` → `pnpm test`
  （vitest run，158 文件 908 用例全过）。
- 既有 867 测试（DEV-080 完结基线，含 MAJOR-01 回归测试）+ 新增 41
  （bilibiliAuth 12 / liveConnectClient 20 / chatMessageAdapter 6 /
  sendChat 3）= **908 全部通过，零回归**。
- 测试零真实网络/WebSocket 调用（A19）：`bilibiliAuth.test.ts` 注入
  假 `fetchImpl`（vi.fn 返回手写 `Response` 或抛错），
  `liveConnectClient.test.ts` 注入 FakeWebSocket（登记实例、记录 send
  字节、emit 模拟服务端事件，同 eventSubClient.test.ts 先例）与
  FakeClock（setTimeout 只登记不触发、记录 timeout 参数、clearTimeout
  清除槽位、手动 `runTimer` 推进）。A10 金样向量：contentMd5
  `584c45365cf7c0532b009fc0df455f78`、authorization
  `0ac5cfc15a2b216ac929eb790e25acd1bf7a235d9a585c9f30e3d1070d2e3dce`
  （固定 accessKeyId/secret/timestamp/nonce 独立计算）。A11 既有
  encode→decode 恒等、手写字节序样例包（op=8 认证回复与 op=5 DM 包）
  解码、6 组畸形包（短于 16 字节/packetLen 不符/headerLen≠16/
  protoVersion 2 与 3）→ undefined。

## 5. Acceptance Results

对照 `specs/tasks/TASK-PACKAGE-DEV-081.md` 第 12 节（A01–A22，节点
`ACCEPTANCE.md` 逐行一致）：

| # | 结果 | 证据 |
|---|---|---|
| A01 | PASS | `pnpm install --frozen-lockfile` 退出码 0 |
| A02 | PASS | `pnpm typecheck` 退出码 0 |
| A03 | PASS | `pnpm lint` 退出码 0 |
| A04 | PASS | `pnpm format:check` 退出码 0 |
| A05 | PASS | `pnpm build` 退出码 0 |
| A06 | PASS | `pnpm test` 退出码 0，新增 41 测试 > 0，既有零回归 |
| A07 | PASS | `dependencies` 恰为 `@interactive-story/platform-core`（workspace），读 package.json |
| A08 | PASS | bilibiliAuth 测试：startGame/heartbeat/endGame URL/body/签名头快照 + 非 2xx/`code!==0`/缺 wss_link/fetch 抛错全 `{ok:false}` 不抛异常 |
| A09 | PASS | 5 组缺失/空串组合全部 `toBe(noopBilibiliAuthPort)`，noop 恒 `{ok:false}` 零网络 |
| A10 | PASS | 金样向量：已知输入产出确定性小写 hex（contentMd5 + authorization），纯函数直测 |
| A11 | PASS | 独立 describe：encode→decode 恒等（4 组 body 含多字节文本）、手写 op=8/op=5 样例包解码、6 组畸形包 → undefined |
| A12 | PASS | startGame 失败 → ERROR、`FakeWebSocket.instances.length === 0` |
| A13 | PASS | op=8 code=0 → CONNECTED；code≠0/AUTHENTICATING 提前 close/CONNECTED 期间 error 与 close → ERROR（四场景逐一断言） |
| A14 | PASS | FakeClock 断言 `clock.timeouts === [20000, 30000]`；runTimer 后 heartbeat('game-1') 被调、续排 20s；WS op=2 包已发送（`timeouts[1]` 30s）、续排 30s |
| A15 | PASS | 只对 `LIVE_OPEN_PLATFORM_DM` 的 op=5 帧调 onMessage（字段快照逐一断言）；礼物/SC/空 data/timestamp 为串/open_id 为数字/非 JSON/protoVersion=3/op=3 心跳回复全静默跳过 |
| A16 | PASS | disconnect() → STOPPED，`closeCalls === 1`、endGame('game-1')、两条定时器 cleared、runTimer 不再触发动作 |
| A17 | PASS | `receivedAt === 1700000000 * 1000`、platform/viewerId/messageId/text 逐一断言；空 openId/空 msgId/非 string text/非 number timestamp → undefined |
| A18 | PASS | sendChat 恒 `{ok:false}` reason 点名协议缺口；`'createBilibiliSendChat' in module === false` |
| A19 | PASS | 读测试代码：全部注入假 fetchImpl/webSocketImpl/clock，无真实网络/WebSocket 调用 |
| A20 | PASS | 包文件列表无 messageDedup.ts/Brotli/failover/重连模块；decode 对 protoVersion=3 返回 undefined |
| A21 | PASS | 读源码：index.ts 仅 barrel，全包无 LivePlatformAdapter 类型/对象/函数；grep 无 host-memory import |
| A22 | PASS | `git diff --stat` 核对：改动仅限 Writable Scope（11 包文件 + 根 tsconfig + lock + 文档 5）；既有文件只动根 tsconfig/lock 两处授权项 |

## 6. Scope Check

- Writable Scope 外零改动：`platform-core/`、`platform-twitch/`、
  `platform-youtube/`、`host-memory/`、`runtime-kernel/` 无任何改动；
  `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、
  `specs/audit/**`、`specs/protocol/**` 均未修改。根 `tsconfig.json`
  只追加一条 references 条目（diff 单行）；`pnpm-lock.yaml` 只新增
  importer 条目。
- 未 import/依赖 platform-twitch/platform-youtube/host-memory 或任何
  platform-core 之外既有包；未新增第三方 SDK（HMAC 用 node:crypto，
  WS 用全局 WebSocket）；未实现 Brotli/failover/重连/去重；未组装
  LivePlatformAdapter；无八态机搬运；测试零真实网络调用。
- 提交后工作区仅剩 LEDGER 追加行与 NODE_REPORT 消息文件两处未提交
  改动（§8）。

## 7. Commit

恰 1 条提交（见 `git log -1`），首行 `DEV-081:` 前缀，包含全部代码与
节点文档；LEDGER 追加行与 NODE_REPORT 消息文件**不在**提交内。

## 8. Handoff

- 本 LEDGER 追加行（seq 0340，置于历史消息表格内、`---` 分隔符之前、
  `当前待处理` 表格之前）与消息文件
  `specs/comms/0340-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-081.md`
  **未提交**，留待 Commander/AUDITOR 收尾。
- 账号/密钥（`BILIBILI_APP_ID`/`BILIBILI_ACCESS_KEY_ID`/
  `BILIBILI_ACCESS_KEY_SECRET`/`BILIBILI_ANCHOR_CODE`）真实供给属未来
  节点（Out of Scope），当前 `createOptionalBilibiliAuthProvider` 在
  缺失时降级 noop，不阻塞。
