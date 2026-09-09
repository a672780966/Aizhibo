# DEV-082 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-082.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install --frozen-lockfile` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0，新增测试数量 > 0，既有测试零回归 | 命令 |
| A07 | `packages/interaction-engine/package.json` 依赖恰为
  `@interactive-story/platform-core`/`platform-twitch`/
  `platform-youtube`/`platform-bilibili` 四项（workspace），无
  第三方 SDK | 读源码 |
| A08 | `createMultiPlatformChatFanIn()` 内部只创建**恰一个**
  `InteractionAggregator` 实例，三个返回的回调共享同一个 `handler`
  闭包 | 读源码 |
| A09 | 分别喂给 `twitchOnNotification`/`youtubeOnMessage`/
  `bilibiliOnMessage` 各自平台原始形状的消息（内容分别解析为
  A/B/C/D 投票），断言同一个已注册的 `onVote` handler 收到全部
  三次调用（证明三平台汇入同一聚合器） | 测试 |
| A10 | 非有效投票文本（如 `'hello'`）经任一平台回调喂入后，`onVote`
  handler 不被调用（复用 DEV-044 既有解析语义，不重新实现） | 测试 |
| A11 | `createMultiPlatformSendChat(config)` 的 `sendChat(message)`
  只对 `config` 中实际提供的平台键并发调用对应 `sendChat`，返回的
  `Record` 的键恰为 `config` 中提供的平台键集合（未提供的平台
  不出现在结果里） | 测试 |
| A12 | 传入至少两个桩 `PlatformSendChat`（一个 resolve `{ok:true,
  messageId}`、一个 resolve `{ok:false,reason}`）断言两者的结果
  原样出现在返回的 `Record` 里，互不影响（一个失败不影响另一个
  的结果/不抛异常） | 测试 |
| A13 | `chatFanOut.ts` 的 `PlatformSendChat` 类型可以直接被
  `createTwitchSendChat`/`createYoutubeSendChat`/
  `unsupportedBilibiliSendChat` 的返回值/实例赋值（结构类型兼容，
  无需任何适配代码）——类型级断言（TS 编译通过即满足，可选补充
  运行时测试） | 读源码 + 测试 |
| A14 | 不存在任何 import `@interactive-story/host-memory`、
  `@interactive-story/runtime-kernel`、`@interactive-story/ai-host`
  的代码 | 读源码 |
| A15 | 不存在任何 import `eventSubClient.ts`/`liveChatPoller.ts`/
  `liveConnectClient.ts`（三个平台 client 内部实现文件）的代码，
  只 import 三包的 `chatMessageAdapter.ts`/`sendChat.ts` 导出 | 读源码 |
| A16 | 不存在任何把 `sendChat`/`onVote` 适配成
  `PlatformPort(connect/disconnect/onVote/sendChat/getHealth)`
  等价形状的代码；不存在任何组装"LivePlatformAdapter"式顶层对象的
  代码 | 读源码 |
| A17 | 全部测试使用桩函数/桩对象，不 import `fetch`/`WebSocket`，
  零真实网络调用 | 读测试代码 |
| A18 | 不存在任何 `messageDedup`/速率限制/内容过滤等价模块 | 读文件列表 + 读源码 |
| A19 | Forbidden Scope 全部条目零违反（`git diff --stat` 核对改动
  文件范围） | 命令 + 读 diff |
