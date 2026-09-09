---
seq: 0331
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-080
in_reply_to: "0330"
status: ISSUED
---

# TASK_PACKAGE — DEV-080 (YouTube Adapter)

见 `specs/tasks/TASK-PACKAGE-DEV-080.md` 完整内容。

## Summary

M8（Platform Expansion）第一个节点，USER 已裁定正式排期
（2026-09-08）。新建 `packages/platform-youtube`，结构对齐既有
`platform-twitch` 先例的五模块分解（去掉不适用的去重层），逐一按
YouTube 真实机制调整：

1. **`youtubeAuth.ts`** —— OAuth2 `refresh_token` grant，手写
   `fetch` POST `oauth2.googleapis.com/token`（零 SDK，同
   `twitchAuth.ts`），`createOptionalYoutubeAuthProvider(env)` 在
   `YOUTUBE_CLIENT_ID`/`YOUTUBE_CLIENT_SECRET`/`YOUTUBE_REFRESH_TOKEN`
   任一缺失时降级 `noopYoutubeAuthPort`——**USER 已明确裁决"不要让
   任何真实数据阻碍 M8 完成"**，本节点严格照此落地。
2. **`liveChatPoller.ts`** —— 长轮询客户端，**不是** Twitch
   `eventSubClient.ts` 的 WebSocket 八态机搬运：Dev Spec 第 46 节
   没有给出对应状态拓扑（第 45 节的八态列表是 Twitch 专属权威
   定义），照搬即发明，故只用真实机制如实反映的
   `STOPPED|POLLING|ERROR` 三态，`nextPageToken`+
   `pollingIntervalMillis` 续传，请求失败直接 `ERROR` 不自动重试。
3. **`chatMessageAdapter.ts`** —— `normalizeYoutubeChatMessage` 用
   YouTube 消息真实携带的 `snippet.publishedAt` 服务端时间作为
   `receivedAt`，不是本地时钟收到时间——这里刻意不同于
   `normalizeTwitchChatMessage`（Twitch 通知载荷没有对应服务端时间
   字段，只能用本地时钟；两平台字段可用性不同，不套用同一处置）。
4. **`sendChat.ts`** —— 结果类型 `{ok:true;messageId}|{ok:false;reason}`
   完全对齐 `TwitchSendChatResult` 先例，非裸 `Promise<void>`。

**不建 `messageDedup.ts` 类比物**：Twitch 的去重解决 WebSocket
重连场景下的重复投递，YouTube 的 `nextPageToken` 游标机制本身已
防止重复，不为不存在的问题发明解决方案。

**不组装 `LivePlatformAdapter` 顶层对象**：直接读源码确认该类型
从未在代码里落地——`DEV-042/DECISIONS.md` D2 已裁定 YAGNI 不建，
DEV-046 之后也未补上。CR-017 所称"计划性修订"的对象是 Dev Spec
第 43 节这段从未落地的接口文字描述，不是任何已存在的代码接口，
本节点不需要（也不可能）"修订"一个不存在的代码类型；真正落地、
需要遵守的是 CR-017 措施一已冻结的窄契约——
`platform-core` 的 `NormalizedChatMessage`/`ChatHandler`。

恰一项 workspace 依赖：`@interactive-story/platform-core`。零第三方
SDK（不新增 `googleapis`/`google-auth-library`，延续
`platform-twitch`/`audio-engine` 零依赖手写 `fetch` 先例）。测试
全部注入假 `fetchImpl`/`clock`，零真实网络调用。

## Scope

见 Task Package 第 3 节。新建 `packages/platform-youtube`（包名已
在 `specs/dev/DAG.md` 第 676 行冻结的 17 包列表预留）。

## Definition of Done

见 Task Package 第 7 节：六条命令全绿 + 21 项 Acceptance + 节点
文档齐全 + LEDGER/NODE_REPORT 写入不提交。

## 下一步

OpenCode 执行 T001–T002，完成后回复 NODE_REPORT，转 AUDITOR。
