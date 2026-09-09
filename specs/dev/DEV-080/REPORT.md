# DEV-080 REPORT

## 1. Status

READY_FOR_REVIEW — DEV-080（YouTube Adapter，M8 第一个节点）T001–T002
施工完成，六条验证命令全部退出码 0，恰 1 条提交。待 AUDITOR 审计。

## 2. Implemented

新建 `packages/platform-youtube`（`@interactive-story/platform-youtube`）。
职责澄清自 Task Package 第 1 节：Dev Spec 第 46 节（
`DEV_SPEC_V1.0.md:1767-1772`）的「server-streaming 推送」是对真实机制
的产品侧简化描述，YouTube Data API v3 `liveChatMessages.list` 的真实
机制是**长轮询**（响应携带 `nextPageToken` 与 `pollingIntervalMillis`），
本节点按真实机制实现。结构对齐 `platform-twitch` 五模块分解先例，按
机制差异调整：去掉不适用的去重层（D4）、去掉不适用的 WebSocket 八态机
（D2）。`package.json` `dependencies` **恰一项**：
`@interactive-story/platform-core`（`workspace:*`），无第三方依赖（D5，
A07）；`tsconfig.json` 与 platform-twitch/platform-obs 逐字一致。

- `src/youtubeAuth.ts`：OAuth2 `refresh_token` grant 手写 `fetch`
  客户端，POST `https://oauth2.googleapis.com/token`（`baseUrl` 可注入，
  默认即真实端点），form 字段 `grant_type`/`refresh_token`/
  `client_id`/`client_secret`。成功映射 `{accessToken: access_token,
  expiresInSeconds: expires_in}`；响应守卫 `isTokenResponseBody` **只校验
  `access_token`/`expires_in` 两字段**——Google 的 refresh_token 响应不
  保证 `scope`（与 Twitch 不同，测试显式覆盖无 scope 响应成功解析）。
  任何失败（非 2xx/JSON 解析失败/形状不符/fetch 抛错/凭据缺失）都返回
  `{ok:false, reason}` 不抛异常（A08）。导出
  `noopYoutubeAuthPort`（恒 `{ok:false}`）与
  `createOptionalYoutubeAuthProvider(env)`——`YOUTUBE_CLIENT_ID`/
  `YOUTUBE_CLIENT_SECRET`/`YOUTUBE_REFRESH_TOKEN` 任一缺失即返回
  `noopYoutubeAuthPort` 本身（A09，同 `createOptionalTwitchAuthProvider`
  精确先例，凭据占位处理不阻塞节点关闭，D6）。每次 `getAccessToken()`
  都是独立无状态换取，不缓存（同 twitchAuth D3 先例）。
- `src/liveChatPoller.ts`：长轮询客户端。状态恰为三态
  `STOPPED|POLLING|ERROR`（D2）。`connect()`：已在 POLLING 则忽略；
  STOPPED/ERROR 均可（重新）发起（ERROR 后调用方直接再 connect，
  A13）；先经 `authPort.getAccessToken()`，失败 → `ERROR` 且**不发起
  任何 HTTP 请求**（A10 诚实失败先例）；成功后
  `GET {apiBaseUrl}/liveChat/messages?liveChatId=...&part=snippet,
  authorDetails`，首次**不带** `pageToken`（A11）。每个 item 经
  `toYoutubeChatMessage` 守卫：只对 `snippet.type === 'textMessageEvent'`
  且四字段齐全（`id`/`publishedAt`/`messageText`/`channelId`）的 item
  产出 `YoutubeChatMessage` 并调用 `config.onMessage`，其余类型
  （superChatEvent 等）与畸形 item 静默跳过（A12）。响应守卫
  `isPollResponseBody` 校验 `pollingIntervalMillis` 必为 number（真实
  必带字段）；随后用响应携带的 `nextPageToken` 与 `pollingIntervalMillis`
  经 `config.clock`（缺省真实 `setTimeout`）排定下一次带 `pageToken` 的
  请求；**不自动重试**——请求失败/非 2xx/形状不符 → `ERROR`（A13）。
  响应不再带 `nextPageToken` = API 告知直播聊天已结束，回 `STOPPED`
  不排下一次（真实行为映射，不是错误，D2 注）。`disconnect()` 取消
  挂起定时器、作废凭据、回 `STOPPED`（A14）。episode 代数（`generation`）
  守卫：断开后重连期间，上一 episode 晚到的 token/响应不得驱动新
  episode（D7）。`getHealth()`：POLLING → OK，STOPPED/ERROR → DOWN。
  Clock/Health 均为本地镜像（同 `eventSubClient.ts`/`twitchAuth.ts`
  先例）。
- `src/chatMessageAdapter.ts`：`normalizeYoutubeChatMessage` 逐字段映射
  `platform:'youtube'`、`viewerId: authorChannelId`、`messageId`、
  `text`、`receivedAt: Date.parse(publishedAt)`（A15/A16）——
  **服务端权威时间**而非本地轮询到达时间（D3，区别于
  `normalizeTwitchChatMessage` 的处置：Twitch 载荷无服务端时间字段）。
  `Date.parse` 为 NaN → 返回 `undefined`（诚实失败，不抛异常）。
  `createYoutubeChatOnMessage` 把 `ChatHandler` 包装成
  `LiveChatPollerConfig.onMessage` 形状（转换成功才调用 handler，
  失败静默忽略），纯外部包装不修改 poller。
- `src/sendChat.ts`：`POST {apiBaseUrl}/liveChat/messages?part=snippet`，
  `Authorization: Bearer <token>`，body
  `{snippet:{liveChatId, type:'textMessageEvent',
  textMessageDetails:{messageText}}}`（真实 insert 请求形状）。2xx +
  响应含顶层 `id` → `{ok:true, messageId}`（insert 成功响应是完整
  liveChatMessage 资源，顶层 id 即消息 id）；非 2xx/形状不符/fetch
  抛错/凭据失败 → `{ok:false, reason}`，不抛异常（A17）。结果类型
  对齐 `TwitchSendChatResult` 先例，非裸 `Promise<void>`；含
  `noopYoutubeSendChat`（恒 `{ok:false}`，零网络）。
- `src/index.ts`：四行 barrel 原样重导出（同 `platform-twitch/src/index.ts`
  先例），**不组装任何顶层 Adapter 对象**（D1，A20）。
- **无** `messageDedup.ts` 或任何等价去重模块（D4，A19）。
- 测试 4 文件 30 用例（下述）：A08–A18 全部有直接断言覆盖。

## 3. Changed Files

18 个文件（git diff 口径；含根 tsconfig 引用、pnpm-lock importer 与 5
份节点文档）：

- `packages/platform-youtube/package.json`（新增）
- `packages/platform-youtube/tsconfig.json`（新增）
- `packages/platform-youtube/src/index.ts`（新增）
- `packages/platform-youtube/src/youtubeAuth.ts`（新增）
- `packages/platform-youtube/src/youtubeAuth.test.ts`（新增，10 用例）
- `packages/platform-youtube/src/liveChatPoller.ts`（新增）
- `packages/platform-youtube/src/liveChatPoller.test.ts`（新增，10 用例）
- `packages/platform-youtube/src/chatMessageAdapter.ts`（新增）
- `packages/platform-youtube/src/chatMessageAdapter.test.ts`（新增，4 用例）
- `packages/platform-youtube/src/sendChat.ts`（新增）
- `packages/platform-youtube/src/sendChat.test.ts`（新增，6 用例）
- `tsconfig.json`（根，references 追加 `./packages/platform-youtube` 一条）
- `pnpm-lock.yaml`（新增 `packages/platform-youtube` importer 条目：含
  `@interactive-story/platform-core` workspace link——新增包被授权后
  pnpm 工具链的强制副作用，Task Package §3 已明确授权）
- `specs/dev/DEV-080/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、
  `DECISIONS.md`、`REPORT.md`（新增）

## 4. Tests Executed

- 六条命令严格顺序执行，全部退出码 0：`pnpm install --frozen-lockfile`
  → `pnpm typecheck`（tsc -b + --noEmit + renderer typecheck）→
  `pnpm lint` → `pnpm format:check` → `pnpm build` → `pnpm test`
  （vitest run，154 文件 866 用例全过）。
- 既有 836 测试（DEV-075 完结基线）+ 新增 30 = **866 全部通过，零回归**。
- 测试零真实网络调用（A18）：`youtubeAuth`/`liveChatPoller`/`sendChat`
  全部注入假 `fetchImpl`（vi.fn 返回手写 `Response` 或抛错）与假
  `clock`（FakeClock：setTimeout 只登记不触发、记录 timeout 参数、
  clearTimeout 清除槽位，测试手动 `runTimer` 推进）；`noop*` 降级路径
  用 `vi.spyOn(globalThis, 'fetch')` 断言零调用。包内不出现对真实
  `oauth2.googleapis.com`/`www.googleapis.com` 的任何测试请求。

## 5. Acceptance Results

对照 `specs/tasks/TASK-PACKAGE-DEV-080.md` 第 12 节（A01–A21，节点
`ACCEPTANCE.md` 逐行一致）：

| # | 结果 | 证据 |
|---|---|---|
| A01 | PASS | `pnpm install --frozen-lockfile` 退出码 0 |
| A02 | PASS | `pnpm typecheck` 退出码 0 |
| A03 | PASS | `pnpm lint` 退出码 0 |
| A04 | PASS | `pnpm format:check` 退出码 0 |
| A05 | PASS | `pnpm build` 退出码 0 |
| A06 | PASS | `pnpm test` 退出码 0，新增 30 测试 > 0，既有零回归 |
| A07 | PASS | `dependencies` 恰为 `@interactive-story/platform-core`（workspace），读 package.json |
| A08 | PASS | youtubeAuth 测试：HTTP 400/fetch 抛错/形状不符/缺字段全部 `{ok:false}` 不抛异常 |
| A09 | PASS | 5 组缺失组合（含空串）全部 `toBe(noopYoutubeAuthPort)`，noop 恒 `{ok:false}` 零网络 |
| A10 | PASS | token 失败 → ERROR 且 `fetchImpl` 零调用断言 |
| A11 | PASS | FakeClock 断言：首请求无 pageToken；`clock.timeouts[0] === 2000`；runTimer 后次请求带 `pageToken=TOKEN-1` |
| A12 | PASS | 混合 items（textMessageEvent + superChatEvent + 两畸形）onMessage 恰 1 次且字段逐一映射 |
| A13 | PASS | 403 → ERROR、无定时器排定、重新 connect() 后恢复 POLLING；fetch 抛错同路径 |
| A14 | PASS | disconnect() → STOPPED，`clock.cleared` 含挂起定时器 id，runTimer 不再触发请求 |
| A15 | PASS | `receivedAt === Date.parse(publishedAt)`（含 5 秒前服务端时间用例）；`'not-a-date'` → undefined |
| A16 | PASS | 输出 `platform:'youtube'` + viewerId/messageId/text 逐一对应断言 |
| A17 | PASS | 成功 `{ok:true, messageId:'LCC-message-1'}` + URL/header/body 快照；403/抛错/无凭据/缺 id 全 `{ok:false}` 不抛异常 |
| A18 | PASS | 读测试代码：全部注入假 fetchImpl/clock，`noop` 路径 spyOn 断言零调用 |
| A19 | PASS | 包文件列表无 messageDedup.ts 或等价模块 |
| A20 | PASS | 读源码：index.ts 仅 4 行 barrel，全包无 LivePlatformAdapter 类型/对象/函数 |
| A21 | PASS | `git diff --stat` 核对：改动仅限 Writable Scope（代码 11 + 根 tsconfig + lock + 文档 5 = 18 文件）；既有文件只动根 tsconfig/lock 两处授权项 |

## 6. Scope Check

- Writable Scope 外零改动：`platform-core/`、`platform-twitch/`、
  `runtime-kernel/` 无任何改动；`specs/PROJECT_INDEX.md`、
  `specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、
  `specs/protocol/**` 均未修改。根 `tsconfig.json` 只追加一条 references
  条目（diff 单行）；`pnpm-lock.yaml` 只新增 importer 条目（diff 6 行）。
- 未 import/依赖 platform-twitch 或任何 platform-core 之外既有包；
  未新增第三方 SDK；未组装 LivePlatformAdapter；未建去重模块；
  无 WebSocket 状态拓扑搬运；测试零真实网络调用。
- 提交后工作区仅剩 LEDGER 追加行与 NODE_REPORT 消息文件两处未提交
  改动（§8）。

## 7. Commit

恰 1 条提交（见 `git log -1`），首行 `DEV-080:` 前缀，包含全部代码与
节点文档；LEDGER 追加行与 NODE_REPORT 消息文件**不在**提交内。

## 8. Handoff

- 本 LEDGER 追加行（seq 0332，置于历史消息表格内、`---` 分隔符之前、
  `当前待处理` 表格之前）与消息文件
  `specs/comms/0332-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-080.md`
  **未提交**，留待 Commander/AUDITOR 收尾。
- 账号/密钥（`YOUTUBE_CLIENT_ID`/`YOUTUBE_CLIENT_SECRET`/
  `YOUTUBE_REFRESH_TOKEN`）真实供给属未来节点（Out of Scope），当前
  `createOptionalYoutubeAuthProvider` 在缺失时降级 noop，不阻塞。
