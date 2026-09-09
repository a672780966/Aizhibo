# DEV-080 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-080 — YouTube Adapter（M8 — Platform Expansion 第一个节点）

## Objective

新建 `packages/platform-youtube`（`@interactive-story/platform-youtube`，
包名已在 `specs/dev/DAG.md` 第 676 行冻结的 17 包列表预留）。Dev Spec
第 46 节对本节点只有两句「最终产品预留」正文，且其中「server-streaming
低延迟推送」是对真实机制的产品侧简化描述——YouTube Data API v3
`liveChatMessages.list` 的真实机制是**长轮询**（每次响应携带
`nextPageToken` 与 `pollingIntervalMillis`，客户端按该间隔发起下一次
请求），Dev Spec 的措辞应理解为「不需要自建续传机制、API 自带」的
强调，不是要求实现真正的推送连接。本节点按真实机制实现，结构对齐
`platform-twitch`（DEV-040/041）的五模块分解先例、按机制差异调整：

1. `youtubeAuth.ts` —— OAuth2 `refresh_token` grant 手写 `fetch` 客户端
   （零 SDK，同 `twitchAuth.ts`），`createOptionalYoutubeAuthProvider(env)`
   在 `YOUTUBE_CLIENT_ID`/`YOUTUBE_CLIENT_SECRET`/`YOUTUBE_REFRESH_TOKEN`
   任一缺失时降级 `noopYoutubeAuthPort`（USER 已裁决不让真实数据阻碍
   M8 完成）。
2. `liveChatPoller.ts` —— 长轮询客户端，**不照搬** `eventSubClient.ts`
   的 WebSocket 八态机（Dev Spec 第 45 节八态列表是 Twitch 专属权威
   定义，第 46 节无对应列表，机制也不同：长轮询非 WebSocket 会话，
   照搬即发明）：只用 `STOPPED|POLLING|ERROR` 三态 +
   `nextPageToken`/`pollingIntervalMillis` 续传；token 失败/请求失败/
   非 2xx → `ERROR` 不自动重试；`disconnect()` 取消定时器回 `STOPPED`。
3. `chatMessageAdapter.ts` —— `normalizeYoutubeChatMessage` 用消息真实
   携带的服务端时间 `snippet.publishedAt` 作 `receivedAt`（**刻意不同于**
   Twitch：Twitch 载荷无服务端时间字段只能用本地时钟，两平台字段可用性
   不同，不套用同一处置）。
4. `sendChat.ts` —— 结果类型 `{ok:true;messageId}|{ok:false;reason}`
   对齐 `TwitchSendChatResult` 先例，非裸 `Promise<void>`。

**不新建 `messageDedup.ts` 类比物**（`nextPageToken` 游标机制本身防止
重复投递，不为不存在的问题发明解决方案）；**不组装 `LivePlatformAdapter`
顶层对象**（DEV-042 D2 YAGNI 裁定延续，见 DECISIONS D1）。恰一个
workspace 依赖 `@interactive-story/platform-core`；零第三方 SDK。
测试全部注入假 `fetchImpl`/`clock`，零真实网络调用。

## Allowed Scope

```
packages/platform-youtube/package.json                        （新增）
packages/platform-youtube/tsconfig.json                        （新增）
packages/platform-youtube/src/index.ts                          （新增）
packages/platform-youtube/src/youtubeAuth.ts                    （新增）
packages/platform-youtube/src/youtubeAuth.test.ts               （新增）
packages/platform-youtube/src/liveChatPoller.ts                 （新增）
packages/platform-youtube/src/liveChatPoller.test.ts            （新增）
packages/platform-youtube/src/chatMessageAdapter.ts             （新增）
packages/platform-youtube/src/chatMessageAdapter.test.ts        （新增）
packages/platform-youtube/src/sendChat.ts                       （新增）
packages/platform-youtube/src/sendChat.test.ts                  （新增）
tsconfig.json                                                     （根，追加一条 references 条目）
pnpm-lock.yaml（自动生成：新增 packages/platform-youtube 的 importer
条目，含对 @interactive-story/platform-core 的 workspace 依赖解析——
新增包被授权后 pnpm 工具链的强制副作用，同 DEV-070 msg 0310 裁定）
specs/dev/DEV-080/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交；追加行放在历史消息表格
`---` 分隔符之前，不放文件末尾"当前待处理"表格之后）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
packages/platform-core/src/index.ts、interactionAggregator.ts（Read-only，
只消费 NormalizedChatMessage/ChatHandler 类型，不修改）
packages/platform-twitch/src/twitchAuth.ts、eventSubClient.ts、
chatMessageAdapter.ts、sendChat.ts（Read-only，仅作结构先例参考，
不 import、不新增对 platform-twitch 的 workspace 依赖）
specs/baseline/DEV_SPEC_V1.0.md 第 1767-1772 行、
specs/audit/CR-RESOLUTIONS-001.md 第 198-253 行（Read-only）
```

## Forbidden Scope

```
修改除本节点 Writable Scope 之外的任何既有文件
import 或依赖 @interactive-story/platform-twitch、
@interactive-story/platform-core 之外的任何其他既有包
新增 googleapis / google-auth-library 等任何第三方 SDK 依赖
组装任何"LivePlatformAdapter"顶层类型或对象（DEV-042 D2 已裁定
YAGNI，本节点不重开该裁定）
把 eventSubClient.ts 的 WebSocket 八态机原样搬来当 YouTube 的状态拓扑
新建去重逻辑（nextPageToken 游标机制已保证不重复投递）
真实调用任何网络 API（测试必须全部注入 fetchImpl/clock 假实现，
不得触发真实 HTTP 请求；账号/密钥继续占位处理）
```

## Task Order

- [x] T001 节点文档（INDEX / REQUIREMENTS / ACCEPTANCE / DECISIONS / REPORT）
- [x] T002 四个源文件 + 四个测试文件 + 包骨架 + 根 `tsconfig.json` 引用 +
  全量验证（六条命令）+ `REPORT.md`/`DECISIONS.md` 填写 + commit +
  写入（不提交）LEDGER 追加行与 NODE_REPORT 消息文件

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行（seq
0332，历史消息表格 `---` 分隔符之前）与 NODE_REPORT 消息文件（seq
0332）已写入工作区但**未提交**；工作区不得残留任何施工用临时文件。

## Next Node

M8（Platform Expansion）内后续节点 DEV-081/082/083 的 Task Package
由 Commander 起草；本节点不预先为它们做任何设计假设。
