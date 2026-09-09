# DEV-080 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-080.md` 逐字抄录关键要求。
权威版本是 Task Package，不是本副本（协议 §1.4）。

1. 新建 `packages/platform-youtube`（`@interactive-story/platform-youtube`，
   包名已在 `specs/dev/DAG.md` 第 676 行冻结的 17 包列表预留），恰一个
   workspace 依赖：`@interactive-story/platform-core`，无第三方 SDK。
2. `src/youtubeAuth.ts`：OAuth2 `refresh_token` grant，POST
   `https://oauth2.googleapis.com/token`（零 SDK，手写 `fetch`，结构与
   `twitchAuth.ts` 逐一对应）。导出 `YoutubeTokenResult`/`YoutubeAuthResult`/
   `YoutubeAuthPort`/`noopYoutubeAuthPort`/`YoutubeAuthProviderConfig`/
   `createYoutubeAuthProvider`/`createOptionalYoutubeAuthProvider(env)`。
   `createOptionalYoutubeAuthProvider` 读取 `YOUTUBE_CLIENT_ID`/
   `YOUTUBE_CLIENT_SECRET`/`YOUTUBE_REFRESH_TOKEN`，任一缺失即返回
   `noopYoutubeAuthPort`。Google token 响应守卫只校验 `access_token`/
   `expires_in`（refresh_token 响应不保证 `scope`，与 Twitch 不同）。
3. `src/liveChatPoller.ts`：长轮询客户端（替代 Twitch WebSocket 八态机，
   Dev Spec 第 46 节无对应状态拓扑，不发明）。状态恰为
   `STOPPED|POLLING|ERROR`。`connect()` → 取 access token 失败直接
   `ERROR`（诚实失败，不发起 HTTP）；成功后
   `GET {apiBaseUrl}/liveChat/messages?liveChatId=...&part=snippet,authorDetails`
   （首次不带 `pageToken`），状态 `POLLING`。只处理
   `snippet.type === 'textMessageEvent'` 的 item，其余类型静默跳过；
   逐条调用 `config.onMessage`；随后用响应携带的 `pollingIntervalMillis`
   与 `nextPageToken` 通过 `config.clock`（缺省真实 `setTimeout`）排定
   下一次带 `pageToken` 的请求。请求失败/非 2xx → `ERROR`，**不自动
   重试**。`disconnect()` 取消挂起的定时器，回到 `STOPPED`。本地镜像
   Clock/Health 形状（同 `eventSubClient.ts`/`twitchAuth.ts` 先例）。
4. `src/chatMessageAdapter.ts`：`normalizeYoutubeChatMessage` 逐字段映射
   `platform:'youtube'`/`viewerId: message.authorChannelId`/`messageId`/
   `text`/`receivedAt: Date.parse(message.publishedAt)`——**刻意不同于
   Twitch**：YouTube 的 liveChatMessages 资源真实携带服务端权威时间
   `snippet.publishedAt`，直接使用而非伪造/复用本地轮询到达时间
   （本地到达时间因 `pollingIntervalMillis` 系统性滞后）。`Date.parse`
   失败（NaN）视为转换失败返回 `undefined`。`createYoutubeChatOnMessage`
   包装 `ChatHandler`，转换成功才调用。
5. `src/sendChat.ts`：`POST {apiBaseUrl}/liveChat/messages?part=snippet`，
   body `{snippet:{liveChatId, type:'textMessageEvent',
   textMessageDetails:{messageText: message}}}`，
   `Authorization: Bearer <accessToken>`。成功响应体真实字段 `id`。
   结果类型 `YoutubeSendChatResult = {ok:true;messageId} |
   {ok:false;reason}`（对齐 `TwitchSendChatResult` 先例，非裸
   `Promise<void>`），含 `noopYoutubeSendChat`。
6. `src/index.ts` 只原样重导出以上四个模块（同 `platform-twitch/src/index.ts`
   先例），**不组装任何顶层 Adapter 对象**（DEV-042 D2 YAGNI 裁定延续）。
7. **不新建 `messageDedup.ts` 类比物**：`nextPageToken` 分页游标机制本身
   保证每次轮询只返回上次游标之后的新消息，不存在 WebSocket 重连场景的
   重复投递问题，不为不存在的问题发明解决方案。
8. 不 import/不依赖 `@interactive-story/platform-twitch` 或任何其他既有包；
   不新增 `googleapis`/`google-auth-library` 等第三方 SDK（延续
   platform-twitch/audio-engine 零 SDK 手写 fetch 先例）。
9. 测试全部注入假 `fetchImpl`/`clock`，零真实网络调用；真实账号/密钥继续
   占位处理，不阻塞本节点关闭。
10. 节点文档（INDEX/REQUIREMENTS/ACCEPTANCE/DECISIONS/REPORT）齐全，
    INDEX T001–T002 勾选、Status = READY_FOR_REVIEW；六条验证命令全部
    退出码 0；恰 1 条 git commit（只含代码+节点文档）；LEDGER 追加行
    （seq 0332，历史消息表格 `---` 分隔符之前，不提交）与 NODE_REPORT
    消息文件（seq 0332、from OPENCODE、to AUDITOR、in_reply_to 0331，
    不提交）。
11. 详见 Task Package 第 1、2、6、12 节。
