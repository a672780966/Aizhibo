---
seq: 0343
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-082
in_reply_to: "0342"
status: ISSUED
---

# TASK_PACKAGE — DEV-082 (Interaction Gateway)

见 `specs/tasks/TASK-PACKAGE-DEV-082.md` 完整内容。

## Summary

M8（Platform Expansion）第三个节点。新建 `packages/interaction-engine`
——`specs/dev/DAG.md:676` 冻结的 17 包列表预留、此前从未创建的
包名。事实核查发现：`createInteractionAggregator()`（DEV-044，
冻结，落在 `platform-core` 而非 `interaction-engine`，该历史决策
不重开）目前从未被任何代码实例化并接入超过一个平台；三个平台
Adapter 各自导出的 `chatMessageAdapter.ts` 包装函数从未被接到同一个
共享聚合器实例上；三平台 `sendChat` 结构完全一致却从未有代码统一
广播。`specs/dev/DAG.md:661` 本节点条目原文明确点名
`platform-core`/`interaction-engine` 为候选真实接口，本节点是让
这个闲置保留包名首次真正投入使用的时机：

1. **`chatFanIn.ts`** —— `createMultiPlatformChatFanIn()` 新建
   **恰一个** `InteractionAggregator` 实例，用同一个 `ChatHandler`
   分别喂给三包既有的 `createTwitchChatOnNotification`/
   `createYoutubeChatOnMessage`/`createBilibiliChatOnMessage`，
   返回的三个回调可原样传给各平台 client 的
   `onNotification`/`onMessage` 配置项（本节点不 import 三个
   client 本身）。三平台投票现在汇入同一个 `aggregator`，
   `aggregator.onVote(handler)` 注册一次即可收到任意平台的投票。
2. **`chatFanOut.ts`** —— `createMultiPlatformSendChat(config)` 用
   结构类型 `PlatformSendChat` 统一消费三平台 `sendChat`（三者
   `sendChat(message): Promise<{ok:true;messageId}|{ok:false;reason}>`
   结构完全一致，逐包源码核实），只对 `config` 中实际提供的平台键
   并发调用，按平台键收集原始结果 `Record`，不做任何重新解释/包装，
   未提供的平台不出现在结果里。

**明确不做的组装**：不组装 `LivePlatformAdapter`（DEV-042 D2 YAGNI
延续）；不适配 `runtime-kernel` 的 `PlatformPort`（组装/适配层延续
DEV-080/081 一致先例，留给未分配的未来 composition root）；不做任何
跨平台连接生命周期编排（connect/disconnect/重连/健康检查汇总）。

恰四项 workspace 依赖：`platform-core`/`platform-twitch`/
`platform-youtube`/`platform-bilibili`。零第三方依赖、零真实网络/
WebSocket 调用（本节点纯组合层，测试用桩函数/桩对象）。

## Scope

见 Task Package 第 3 节。新建 `packages/interaction-engine`（包名
已在 `specs/dev/DAG.md:676` 冻结的 17 包列表预留）。

## Definition of Done

见 Task Package 第 7 节：六条命令全绿 + 19 项 Acceptance + 节点
文档齐全 + LEDGER/NODE_REPORT 写入不提交。

## 下一步

OpenCode 执行 T001–T002，完成后回复 NODE_REPORT，转 AUDITOR。
