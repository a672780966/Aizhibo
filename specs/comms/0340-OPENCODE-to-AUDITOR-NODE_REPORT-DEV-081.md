---
msg_id: "0340"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-081
in_reply_to: "0339"
created_at: 2026-09-09
requires_response: true
git_head: 4240993
changed_files_count: 18
commands_run: [pnpm install --frozen-lockfile, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-081

DEV-081（Bilibili Adapter，M8 — Platform Expansion 第二个节点）
T001–T002 施工完成，`READY_FOR_REVIEW`。

交付全文见 `specs/dev/DEV-081/REPORT.md`；决策记录见
`specs/dev/DEV-081/DECISIONS.md`（D1–D8）；验收权威副本为
`specs/tasks/TASK-PACKAGE-DEV-081.md` 第 12 节（A01–A22，节点
`ACCEPTANCE.md` 逐行一致）。

## 交付快照

- `git_head`: 4240993
- Changed Files（18，与实现提交一致）：
  - `packages/platform-bilibili/package.json`（新增：name
    `@interactive-story/platform-bilibili`；`dependencies` **恰一项**
    `@interactive-story/platform-core`（`workspace:*`），无第三方依赖
    （A07，D6））
  - `packages/platform-bilibili/tsconfig.json`（新增：与既有平台包
    逐字一致）
  - `packages/platform-bilibili/src/index.ts`（新增：四行 barrel 原样
    重导出，**不组装任何顶层 Adapter 对象**（A21，D2 延续 DEV-042
    YAGNI 裁定））
  - `packages/platform-bilibili/src/bilibiliAuth.ts`（新增：项目场次
    生命周期 + HMAC-SHA256 签名 `fetch` 客户端（零 SDK，HMAC/MD5/
    nonce 用 Node 内置 `node:crypto`）：`startGame()` 签名 POST
    `/v2/app/start`（body `{code: anchorCode, app_id: appId}`）→ 解析
    真实字段路径 `data.game_info.game_id`/
    `data.websocket_info.auth_body`/`data.websocket_info.wss_link` 为
    `BilibiliGameSession`；`heartbeat`/`endGame` 同机制分 POST
    `/v2/app/heartbeat`（body `{game_id}`）/`/v2/app/end`（body
    `{app_id, game_id}`）。签名按真实官方布局：六个 `x-bili-*` 头
    （content-md5 = body JSON 的 MD5 / timestamp 10 位 /
    signature-version `1.0` / signature-nonce / signature-method
    `HMAC-SHA256` / accesskeyid）按名字典序 `name:value` 行 `\n`
    拼接，`access_key_secret` 作密钥小写十六进制 → `Authorization`
    （A08）；纯函数 `bilibiliContentMd5`/`computeBilibiliAuthorization`
    供已知向量直测（A10 金样：contentMd5 `584c4536…`、authorization
    `0ac5cfc1…`，固定 accessKeyId/secret/timestamp/nonce 独立计算）；
    `createOptionalBilibiliAuthProvider(env)` 按 `BILIBILI_APP_ID`/
    `BILIBILI_ACCESS_KEY_ID`/`BILIBILI_ACCESS_KEY_SECRET`/
    `BILIBILI_ANCHOR_CODE` 任一缺失/空串返回 `noopBilibiliAuthPort`
    （恒 `{ok:false}`，零网络）（A09）；非 2xx/非 JSON/`code !== 0`/
    响应缺字段/fetch 抛错全 `{ok:false, reason}` 不抛异常（A08））
  - `packages/platform-bilibili/src/liveConnectClient.ts`（新增：
    WebSocket 长连客户端，状态拓扑恰为 Task Package §2 冻结的六态
    `STOPPED|STARTING|CONNECTING|AUTHENTICATING|CONNECTED|ERROR`
    （D2）——**不照搬** `eventSubClient.ts` 的 WebSocket 八态机（Dev
    Spec 第 45 节八态是 Twitch 专属权威定义；机制也不同：本协议**有
    两条独立心跳**——HTTP 场次心跳 + WS 心跳），状态变量 + generation
    代数守卫（同 liveChatPoller 先例，不引入 xstate）。`connect()` →
    `STARTING` 调 `authPort.startGame()`，失败直接 `ERROR` 且不构造
    WebSocket（A12）、`wss_link` 只取第一个（无 failover/自动重试/重连，
    D5）；成功后 `CONNECTING` 打开 `wssLinks[0]`，`onopen` 发送 op=7
    认证包（protoVersion=1、seq=1，body 为 `auth_body` **原样字节**，
    本节点不解析其内容），转 `AUTHENTICATING`；收 op=8 且
    `body.code === 0` → `CONNECTED`（A13），否则 → `ERROR`（真实协议
    下认证失败服务端可能不回任何包：AUTHENTICATING 期间提前
    close/error 同样 → ERROR）。CONNECTED 后两条独立定时器（A14）：
    每 20 秒 HTTP `authPort.heartbeat(gameId)`（失败不中断连接、记录
    在 `getHealth().error` → DEGRADED，成功恢复 OK）+ 每 30 秒 WS op=2
    心跳包（空 JSON body）。op=5 业务包按 `cmd` 分发，只处理
    `cmd === 'LIVE_OPEN_PLATFORM_DM'`——取真实字段 `data.open_id`/
    `msg_id`/`msg`/`timestamp` 组 `BilibiliChatMessage` 调 `onMessage`，
    其余 cmd/畸形包/非 JSON/protoVersion=3（Brotli）一律静默跳过
    （A15）。16 字节包头 encode/decode（`packetLen` int32 BE /
    `headerLen` int16 BE 恒 16 / `protoVersion` int16 BE / `op` int32 BE
    / `seq` int32 BE 客户端固定 1）+ UTF-8 JSON body；decode 要求
    `headerLen === 16` 且 `packetLen === buffer 长度`（单帧语义，多帧
    拼接未经证实不实现，D8）；`onMessage` 回调内同步 `disconnect()`
    的重入路径有回归测试覆盖（DEV-080 MAJOR-01 教训）。`disconnect()`：
    取消两条定时器、关 WebSocket、best-effort
    `authPort.endGame(gameId)`（不等待/不因失败影响转换）、转
    `STOPPED`（A16）。`getHealth()`：CONNECTED → OK/DEGRADED，其余 →
    DOWN）
  - `packages/platform-bilibili/src/chatMessageAdapter.ts`（新增：
    `normalizeBilibiliChatMessage` 逐字段映射 `platform:'bilibili'`/
    `viewerId: openId`/`messageId: msgId`/`text`/`receivedAt:
    timestamp * 1000`（真实服务端秒级时间转毫秒——**对齐
    `normalizeYoutubeChatMessage` 的 `publishedAt` 处置而非 Twitch 的
    本地时钟处置**：Bilibili 弹幕事件真实携带 `timestamp` 服务端字段，
    字段可用性决定处置（D3，A17）；`openId`/`msgId` 空串或
    `text`/`timestamp` 类型不对 → `undefined` 诚实失败；
    `createBilibiliChatOnMessage(handler)` 纯外部包装）
  - `packages/platform-bilibili/src/sendChat.ts`（新增：**诚实反映能力
    缺口**（A18）——官方开放平台 `/v2/app/*` 只有 start/heartbeat/end，
    **协议层面没有应用级发送弹幕接口**，非凭据缺失（D4）；只导出恒
    失败常量 `unsupportedBilibiliSendChat`（reason 点名协议缺口与非官方
    Cookie 鉴权端点边界），**无 config 化工厂**——与 Twitch/YouTube
    "有接口缺凭据"式 `noop*SendChat` 先例刻意不同：连"配置齐全后可用"
    都不存在，工厂会误导调用方）
  - 四个测试文件（新增，12+20+6+3 = 41 测试：A08–A18 全部直接断言
    覆盖；全部注入假 `fetchImpl`（vi.fn 返回手写 `Response`/抛错）、
    假 `webSocketImpl`（FakeWebSocket：登记实例、记录 send 字节、emit
    模拟服务端事件，同 eventSubClient.test.ts 先例）与假 `clock`
    （FakeClock：setTimeout 只登记不触发、记录 timeout 参数、
    clearTimeout 清除槽位、手动 runTimer 推进），零真实网络/WebSocket
    调用（A19））
  - `tsconfig.json`（根，references 追加 platform-bilibili 一条）
  - `pnpm-lock.yaml`（新增 importer 条目——授权新包后 pnpm 工具链强制
    副作用，Task Package §3 已明确授权）
  - `specs/dev/DEV-081/DECISIONS.md`（新增，D1–D8）、`REPORT.md`、
    `INDEX.md`（T001–T002 勾选，Status → READY_FOR_REVIEW）、
    `REQUIREMENTS.md`、`ACCEPTANCE.md`

## 关键点

- **合规裁决基于事实核查而非措辞推导**（D1）：Dev Spec 第 47 节
  （`DEV_SPEC_V1.0.md:1775-1787`）「数据存储策略必须单独经过平台合规
  检查」经直接读源码确认 `host-memory/src/hostMemory.ts:17-20,38-42`
  （DEV-054 冻结）的 `purge(retentionMsByPlatform)`/`recallViewer
  (platform, ...)`/`addRunningJoke(platform, ...)`/`listRunningJokes
  (platform)` 全部以 `platform: string` 为**通用参数**、从未硬编码
  Twitch——CR-017 §3.3 的"按平台可配置"合规前置已在 DEV-054 落地成
  平台无关的存储/清理层；且 Twitch/YouTube 两个既有 Adapter 从未直接
  调用 `host-memory`。本节点遵循相同边界：**不触碰 host-memory、不做
  任何数据持久化**，合规检查要求的对象（真实持久化实现）在本节点内
  不存在，无需也不应该提前假设/发明该集成方式。
- **能力缺口的诚实形态**（D4/A18）：`sendChat.ts` 是既有三平台中
  唯一"协议层面无此能力"的节点——Twitch/YouTube 的 noop 是凭据缺失式
  降级（配置齐全即可用），Bilibili 官方开放平台根本没有以 App 身份
  发弹幕的接口。唯一已知发送端点 `api.live.bilibili.com/msg/send` 是
  网页端非官方 Cookie 鉴权接口，落地即引入未经合规审查的用户会话
  凭据存储，正是 Dev Spec 第 47 节警惕的对象。故只导出恒失败常量、
  无工厂，避免误导未来调用方。
- **机制差异如实落地**（D2/D3/D5）：六态拓扑（认证期显式成态，因真实
  协议下认证失败服务端可能不回任何包）+ 两条独立心跳（HTTP 20s +
  WS 30s，Twitch/YouTube 均只有一条）；`receivedAt` 用 Bilibili 真实
  携带的服务端 `timestamp`（×1000），不套用 Twitch「本地时钟」处置；
  不实现 Brotli（protoVersion=3 视为解析失败）、failover/自动重试/
  重连、去重（`msg_id` 唯一不等于已观测到重复投递）——不为未经证实
  的场景发明解决方案。
- **HMAC 签名规范**（A08/A10）：六个 `x-bili-*` 头按名字典序
  `name:value` 行 `\n` 拼接、`access_key_secret` 作密钥
  HMAC-SHA256 小写十六进制 → `Authorization`；`node:crypto` 是运行时
  自带 API 不算新增依赖（D6），`package.json` 恰一项 workspace 依赖，
  延续零 SDK 手写 fetch 先例。
- 既有 867 测试 + 新增 41 = **908 全部通过，零回归**；六条命令全部
  退出码 0（含根 references/锁文件改动后的
  `pnpm install --frozen-lockfile` 首条验证）。

## 范围与残留

- Writable Scope 外零改动：`platform-core/`、`platform-twitch/`、
  `platform-youtube/`、`host-memory/`、`runtime-kernel/` 无任何改动；
  `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、
  `specs/audit/**`、`specs/protocol/**` 均未修改。根 `tsconfig.json`
  只追加一条 references 条目；`pnpm-lock.yaml` 只新增 importer 条目。
- 账号/密钥（`BILIBILI_APP_ID`/`BILIBILI_ACCESS_KEY_ID`/
  `BILIBILI_ACCESS_KEY_SECRET`/`BILIBILI_ANCHOR_CODE`）真实供给属未来
  节点（Out of Scope）：当前 `createOptionalBilibiliAuthProvider` 在
  缺失时降级 noop，不阻塞。
- 工作区无残留：`git status` 仅剩本 LEDGER 追加行与消息文件两处未提交
  改动。
- 本 LEDGER 追加行（msg_id 0340，置于历史表格内、`---` 分隔符之前、
  `当前待处理` 表格之前）与消息文件**未提交**，留待 Commander/AUDITOR
  收尾。
