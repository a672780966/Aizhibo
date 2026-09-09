---
msg_id: "0332"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-080
in_reply_to: "0331"
created_at: 2026-09-09
requires_response: true
git_head: d3c9653
changed_files_count: 18
commands_run: [pnpm install --frozen-lockfile, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-080

DEV-080（YouTube Adapter，M8 — Platform Expansion 第一个节点）
T001–T002 施工完成，`READY_FOR_REVIEW`。

交付全文见 `specs/dev/DEV-080/REPORT.md`；决策记录见
`specs/dev/DEV-080/DECISIONS.md`（D1–D7）；验收权威副本为
`specs/tasks/TASK-PACKAGE-DEV-080.md` 第 12 节（A01–A21，节点
`ACCEPTANCE.md` 逐行一致）。

## 交付快照

- `git_head`: d3c9653
- Changed Files（18，与实现提交一致）：
  - `packages/platform-youtube/package.json`（新增：name
    `@interactive-story/platform-youtube`；`dependencies` **恰一项**
    `@interactive-story/platform-core`（`workspace:*`），无第三方依赖
    （A07，D5））
  - `packages/platform-youtube/tsconfig.json`（新增：与
    platform-twitch/platform-obs 逐字一致）
  - `packages/platform-youtube/src/index.ts`（新增：四行 barrel 原样
    重导出，**不组装任何顶层 Adapter 对象**（A20，D1））
  - `packages/platform-youtube/src/youtubeAuth.ts`（新增：OAuth2
    `refresh_token` grant 手写 `fetch` 客户端，POST
    `https://oauth2.googleapis.com/token`（`baseUrl` 可注入，默认即
    真实端点）；成功映射 `{accessToken, expiresInSeconds}`；守卫
    **只校验 `access_token`/`expires_in`**——Google refresh_token 响应
    不保证 `scope`（区别于 Twitch，无 scope 响应测试显式覆盖）；任何
    失败返回 `{ok:false, reason}` 不抛异常（A08）；
    `createOptionalYoutubeAuthProvider(env)` 按
    `YOUTUBE_CLIENT_ID`/`YOUTUBE_CLIENT_SECRET`/`YOUTUBE_REFRESH_TOKEN`
    任一缺失返回 `noopYoutubeAuthPort`（恒 `{ok:false}`，零网络）
    （A09，D6））
  - `packages/platform-youtube/src/liveChatPoller.ts`（新增：长轮询
    客户端，状态恰为 `STOPPED|POLLING|ERROR` 三态（D2）——**不照搬**
    `eventSubClient.ts` 的 WebSocket 八态机（Dev Spec 第 45 节八态
    列表是 Twitch 专属权威定义，第 46 节无对应列表，长轮询亦非
    WebSocket 会话）；`connect()` token 获取失败直接 `ERROR` 且零
    HTTP（A10）；成功后首请求**不带** `pageToken`（A11），
    `GET /liveChat/messages?liveChatId=...&part=snippet,authorDetails`；
    只对 `snippet.type === 'textMessageEvent'` 且字段齐全的 item 调用
    `onMessage`，其余类型静默跳过（A12）；用响应携带的
    `nextPageToken`+`pollingIntervalMillis` 经注入 `clock` 排定下一次
    带 `pageToken` 的请求（A11）；失败/非 2xx 不自动重试 → `ERROR`
    （A13）；`disconnect()` 取消挂起定时器回 `STOPPED`（A14）；
    `nextPageToken` 缺失 = API 告知聊天已结束，回 `STOPPED` 非错误；
    episode 代数守卫丢弃断开期间晚到的旧响应（D7））
  - `packages/platform-youtube/src/chatMessageAdapter.ts`（新增：
    `normalizeYoutubeChatMessage` 逐字段映射 `platform:'youtube'`/
    `viewerId`/`messageId`/`text`，`receivedAt: Date.parse(publishedAt)`
    （A15/A16）——**服务端权威时间**而非本地轮询到达时间（D3，
    区别于 Twitch：其载荷无服务端时间字段只能用注入时钟）；
    `Date.parse` NaN → `undefined`；`createYoutubeChatOnMessage`
    包装 `ChatHandler`，转换成功才调用）
  - `packages/platform-youtube/src/sendChat.ts`（新增：
    `POST /liveChat/messages?part=snippet`，body
    `{snippet:{liveChatId, type:'textMessageEvent',
    textMessageDetails:{messageText}}}`，`Authorization: Bearer`；
    成功（2xx + 顶层 `id`）→ `{ok:true, messageId}`，其余全
    `{ok:false, reason}` 不抛异常（A17）——结果类型对齐
    `TwitchSendChatResult` 先例，非裸 `Promise<void>`；含
    `noopYoutubeSendChat`）
  - 四个测试文件（新增，10+10+4+6 = 30 测试：A08–A18 全部直接断言
    覆盖；全部注入假 `fetchImpl`（vi.fn 返回手写 Response/抛错）与
    假 `clock`（FakeClock 只登记不触发、手动 runTimer 推进、记录
    timeout/cleared），零真实网络调用（A18）；`noop*` 降级路径用
    `vi.spyOn(globalThis, 'fetch')` 断言零调用）
  - `tsconfig.json`（根，references 追加 platform-youtube 一条）
  - `pnpm-lock.yaml`（新增 importer 条目——授权新包后 pnpm 工具链强制
    副作用，Task Package §3 已明确授权）
  - `specs/dev/DEV-080/DECISIONS.md`（新增，D1–D7）、`REPORT.md`、
    `INDEX.md`（T001–T002 勾选，Status → READY_FOR_REVIEW）、
    `REQUIREMENTS.md`、`ACCEPTANCE.md`

## 关键点

- **职责澄清来自 Task Package 第 1 节而非 Dev Spec 措辞**：Dev Spec
  第 46 节（`DEV_SPEC_V1.0.md:1767-1772`）的「server-streaming 推送」
  是对真实机制的产品侧简化描述——YouTube Data API v3
  `liveChatMessages.list` 的真实机制是**长轮询**（响应携带
  `nextPageToken` 与 `pollingIntervalMillis`，客户端按该间隔发起下一
  次请求）。Task Package 已把该措辞澄清为「API 自带续传机制，无需自建
  推送」，本节点按真实机制实现。
- **不组装 `LivePlatformAdapter`**（D1/A20）：`platform-core`（DEV-042
  冻结窄契约 `NormalizedChatMessage`/`ChatHandler`，见其 A14「未定义
  LivePlatformAdapter」）与 `platform-twitch` 都从未组装过该顶层对象——
  五模块由调用方自行组合。CR-017 措施三「计划性修订」针对的是 Dev Spec
  第 43 节**从未落地的接口文字描述**，本节点无对应代码类型可修订；
  DEV-042 D2 YAGNI 裁定延续（完整 Adapter 需等 M8 多个 platform-* 包
  落地后由调用方/未来节点拼装）。
- **无 `messageDedup` 类比物**（D4/A19）：Twitch 的去重（DEV-041）是
  WebSocket 重连场景 EventSub 重复投递的对策；YouTube `nextPageToken`
  游标机制本身保证每次轮询只返回上次游标之后的新消息，无同等重复投递
  问题。为不存在的问题发明解决方案违反仓库纪律。
- **零第三方 SDK**（D5/A07）：Google OAuth2 token 端点与 YouTube Data
  API v3 都是标准 HTTPS JSON 接口，Node ≥22 原生 `fetch`/
  `URLSearchParams`/`Response` 足够（沿用 DEV-040 DECISIONS 第 9-10 行
  「新增依赖只会扩大攻击面与维护面」理由）；`package.json` 恰一项
  workspace 依赖，延续 platform-twitch/audio-engine 先例。
- **机制差异如实落地**（D2/D3）：长轮询无会话状态，八态机是 Twitch
  专属拓扑，本节点只用真实机制的最小三态 + 代数守卫；`receivedAt`
  用 YouTube 真实携带的服务端 `publishedAt`，不套用 Twitch「本地时钟
  到达时间」处置（两平台字段可用性不同）。
- 既有 836 测试 + 新增 30 = **866 全部通过，零回归**；六条命令全部
  退出码 0（含根 references/锁文件改动后的
  `pnpm install --frozen-lockfile` 首条验证）。

## 范围与残留

- Writable Scope 外零改动：`platform-core/`、`platform-twitch/`、
  `runtime-kernel/` 无任何改动；`specs/PROJECT_INDEX.md`、
  `specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、
  `specs/protocol/**` 均未修改。根 `tsconfig.json` 只追加一条
  references 条目；`pnpm-lock.yaml` 只新增 importer 条目。
- 账号/密钥（`YOUTUBE_CLIENT_ID`/`YOUTUBE_CLIENT_SECRET`/
  `YOUTUBE_REFRESH_TOKEN`）真实供给属未来节点（Out of Scope）：当前
  `createOptionalYoutubeAuthProvider` 在缺失时降级 noop，不阻塞。
- 工作区无残留：`git status` 仅剩本 LEDGER 追加行与消息文件两处未提交
  改动。
- 本 LEDGER 追加行（msg_id 0332，置于历史表格内、`---` 分隔符之前、
  `当前待处理` 表格之前）与消息文件**未提交**，留待 Commander/AUDITOR
  收尾。
