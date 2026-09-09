---
msg_id: "0344"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-082
in_reply_to: "0343"
created_at: 2026-09-09
requires_response: true
git_head: 2cd1729
changed_files_count: 14
commands_run: [pnpm install --frozen-lockfile, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-082

DEV-082（Interaction Gateway，M8 — Platform Expansion 第三个节点）
T001–T002 施工完成，`READY_FOR_REVIEW`。

交付全文见 `specs/dev/DEV-082/REPORT.md`；决策记录见
`specs/dev/DEV-082/DECISIONS.md`（D1–D5）；验收权威副本为
`specs/tasks/TASK-PACKAGE-DEV-082.md` 第 12 节（A01–A19，节点
`ACCEPTANCE.md` 逐行一致）。

## 交付快照

- `git_head`: 2cd1729
- Changed Files（14，与实现提交一致）：
  - `packages/interaction-engine/package.json`（新增：name
    `@interactive-story/interaction-engine`——DAG.md:676 冻结 17 包
    列表预留、此前从未创建，本节点首次投入使用；`dependencies`
    **恰四项** `@interactive-story/platform-core`/`platform-twitch`/
    `platform-youtube`/`platform-bilibili`（均 `workspace:*`），无
    第三方依赖（A07））
  - `packages/interaction-engine/tsconfig.json`（新增：与既有包逐字
    一致）
  - `packages/interaction-engine/src/chatFanIn.ts`（新增：
    `createMultiPlatformChatFanIn()` 内部**恰一个**
    `createInteractionAggregator()` 实例（A08），同一 `ChatHandler`
    闭包（调用该实例 `ingest`）分别喂给三个平台既有的
    `createTwitchChatOnNotification`/`createYoutubeChatOnMessage`/
    `createBilibiliChatOnMessage` 包装函数——三个返回回调形状与各
    平台 client 的 `onNotification`/`onMessage` 配置项精确兼容可原样
    传入，接线到具体 client 是 composition root 职责（本文件只
    import 三包 `chatMessageAdapter.ts` 导出，不 import/依赖三个
    client 实现文件，A15）；三平台投票汇入同一 `aggregator`，
    `onVote(handler)` 注册一次收全部平台投票）
  - `packages/interaction-engine/src/chatFanOut.ts`（新增：结构类型
    `PlatformSendChat` + `createMultiPlatformSendChat(config)`；
    `sendChat(message)` 按 twitch/youtube/bilibili 顺序过滤出 config
    实际提供的平台键，`Promise.all` 并发调用各自 `sendChat`，按平台
    键**原样**收集 `MultiPlatformSendChatResult` Record——缺失键不出现
    在结果里、不重新解释/包装结果、平台间互不影响（A11/A12）；
    `PlatformSendChat` 为结构类型，三平台冻结
    `TwitchSendChat`/`YoutubeSendChat`/`BilibiliSendChat` 天然满足，
    零适配（A13））
  - `packages/interaction-engine/src/index.ts`（新增：两行 barrel 原样
    重导出 chatFanIn/chatFanOut，**不组装任何 Gateway 顶层对象**
    （A16））
  - 两个测试文件（新增，4+5 = **9 测试**：A09 三平台原始形状消息
    twitch('A')/youtube('B')/bilibili('C')/twitch('D') 汇入同一聚合
    器、一次注册 onVote 收全部 4 次调用逐一断言；A10 'hello'/'AB'/''
    喂入 handler 零调用；A11 config 子集只调用并收集提供键、未提供
    平台不出现在结果、空 config 空 Record、deferred 断言慢平台不阻塞
    其他平台（真并发）；A12 一成功一失败两桩结果原样收集互不影响
    不抛异常；A13 三个真实常量 noopTwitchSendChat/noopYoutubeSendChat/
    unsupportedBilibiliSendChat 直接赋 `PlatformSendChat` 配置位
    （编译期类型级断言）+ 运行时结果原样断言。全部桩函数/桩对象，
    零 import fetch/WebSocket、零真实网络调用（A17，D5））
  - `tsconfig.json`（根，references 追加 interaction-engine 一条）
  - `pnpm-lock.yaml`（新增 importer 条目——授权新包后 pnpm 工具链强制
    副作用，Task Package §3 已明确授权）
  - `specs/dev/DEV-082/DECISIONS.md`（新增，D1–D5）、`REPORT.md`、
    `INDEX.md`（T001–T002 勾选，Status → READY_FOR_REVIEW）、
    `REQUIREMENTS.md`、`ACCEPTANCE.md`

## 关键点

- **范围由真实接口事实核查确定而非发明**（Task Package §1）：Dev Spec
  第 66 节标题区只有「Interaction Gateway」无正文；三个平台 Adapter
  的 `ChatHandler` 包装函数此前从未被接到同一个共享聚合器上、
  `sendChat` 侧三平台发送对象结构一致但"广播到全部已连接平台"从未
  统一成一次调用。本节点只补这两件缺一层的**纯组合**工作
  （fan-in/fan-out），零新协议、零网络 I/O。
- **独立组合函数而非统一 Gateway 对象**（D3）：fan-in 依赖聚合器
  状态、fan-out 依赖发送配置，生命周期/失败模式/调用时机完全独立，
  捆成对象是没有真实消费方需求的投机分层；composition root（把两者
  与三平台 client 真实接线、适配 `runtime-kernel` `PlatformPort`、
  生命周期编排）是未分配的未来职责（D4，同 DEV-080/081 先例），本
  节点零 PlatformPort 适配、零连接编排、不 import runtime-kernel/
  host-memory/ai-host。
- **依赖方向正确性**（D1）：platform-core ← 三平台 ←
  interaction-engine（组合层在依赖图末端）；放进 platform-core 会
  反转成循环依赖——这正是 DAG.md 冻结列表把 interaction-engine 列为
  独立包的原因；DEV-044 聚合器落点历史决策不重开（D2，搬迁纯属
  churn），本节点只是让保留包名首次承载它真正对应的职责。
- **零注入测试**（D5）：本节点自身不做任何 I/O，测试直接传平台原始
  形状消息实参与桩 `PlatformSendChat` 对象，无需
  fetchImpl/webSocketImpl/clock——真实网络行为已在三平台包自身测试
  验证过，不重复验证。
- 既有 908 测试 + 新增 9 = **917 全部通过，零回归**；六条命令全部
  退出码 0（含根 references/锁文件改动后的
  `pnpm install --frozen-lockfile` 首条验证）。

## 范围与残留

- Writable Scope 外零改动：`platform-core/`、`platform-twitch/`、
  `platform-youtube/`、`platform-bilibili/`、`runtime-kernel/`、
  `host-memory/` 无任何改动；`specs/PROJECT_INDEX.md`、
  `specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、
  `specs/protocol/**` 均未修改。根 `tsconfig.json` 只追加一条
  references 条目；`pnpm-lock.yaml` 只新增 importer 条目。
- 工作区无残留：`git status` 仅剩本 LEDGER 追加行与消息文件两处未提交
  改动。
- 本 LEDGER 追加行（msg_id 0344，置于历史表格内、`---` 分隔符之前、
  `当前待处理` 表格之前）与消息文件**未提交**，留待 Commander/AUDITOR
  收尾。
