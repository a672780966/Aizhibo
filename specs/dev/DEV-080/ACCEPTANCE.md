# DEV-080 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-080.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install --frozen-lockfile` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0，新增测试数量 > 0，既有测试零回归 | 命令 |
| A07 | `packages/platform-youtube/package.json` 依赖恰为
  `@interactive-story/platform-core`（workspace），无第三方 SDK | 读源码 |
| A08 | `youtubeAuth.ts` 真实 OAuth2 `refresh_token` grant POST
  `https://oauth2.googleapis.com/token`，凭据缺失/请求失败均返回
  `{ok:false,reason}`，不抛异常 | 读源码 + 测试 |
| A09 | `createOptionalYoutubeAuthProvider(env)` 在
  `YOUTUBE_CLIENT_ID`/`YOUTUBE_CLIENT_SECRET`/`YOUTUBE_REFRESH_TOKEN`
  任一缺失时返回 `noopYoutubeAuthPort`，`getAccessToken()` 恒为
  `{ok:false}` | 测试 |
| A10 | `liveChatPoller.ts` 的 `connect()` 在 token 获取失败时直接转
  `ERROR`，不发起 HTTP 请求 | 测试 |
| A11 | `connect()` 成功后首次请求不带 `pageToken`，收到响应后用
  返回的 `nextPageToken` 与 `pollingIntervalMillis` 排定下一次
  带 `pageToken` 的请求（用注入 `clock` 断言） | 测试 |
| A12 | 只对 `snippet.type === 'textMessageEvent'` 的 item 调用
  `onMessage`，其余类型静默跳过 | 测试 |
| A13 | 请求失败/非 2xx 时转 `ERROR`，不自动重试（`getState()` 停留
  在 `ERROR` 直到调用方重新 `connect()`） | 测试 |
| A14 | `disconnect()` 取消挂起的下一次轮询定时器，回到 `STOPPED` | 测试 |
| A15 | `normalizeYoutubeChatMessage` 的 `receivedAt` 等于
  `Date.parse(message.publishedAt)`，`publishedAt` 非法时返回
  `undefined` | 测试 |
| A16 | `normalizeYoutubeChatMessage` 输出 `platform:'youtube'`，
  其余字段逐一对应 `authorChannelId`/`messageId`/`text` | 测试 |
| A17 | `sendChat.ts` 成功路径返回 `{ok:true, messageId}`，失败路径
  （非 2xx/异常/无凭据）均返回 `{ok:false, reason}`，不抛异常 | 测试 |
| A18 | 全部测试注入假 `fetchImpl`/`clock`，零真实网络调用 | 读测试代码 |
| A19 | 不存在任何 `messageDedup.ts` 或等价去重模块 | 读文件列表 |
| A20 | 不存在任何组装 `LivePlatformAdapter` 的顶层类型/对象/函数 | 读源码 |
| A21 | Forbidden Scope 全部条目零违反（`git diff --stat` 核对改动
  文件范围） | 命令 + 读 diff |
