---
seq: 0339
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-081
in_reply_to: "0338"
status: ISSUED
---

# TASK_PACKAGE — DEV-081 (Bilibili Adapter)

见 `specs/tasks/TASK-PACKAGE-DEV-081.md` 完整内容。

## Summary

M8（Platform Expansion）第二个节点。新建 `packages/platform-bilibili`，
结构对齐既有 `platform-twitch`/`platform-youtube` 先例的四模块
分解，按 Bilibili 直播开放平台真实机制调整：

1. **`bilibiliAuth.ts`** —— 项目场次生命周期（`/v2/app/start` /
   `/v2/app/heartbeat` / `/v2/app/end`）+ HMAC-SHA256 签名 HTTP
   客户端（零 SDK，签名用 Node 内置 `node:crypto`）。
   `createOptionalBilibiliAuthProvider(env)` 在
   `BILIBILI_APP_ID`/`BILIBILI_ACCESS_KEY_ID`/
   `BILIBILI_ACCESS_KEY_SECRET`/`BILIBILI_ANCHOR_CODE` 任一缺失时
   降级 `noopBilibiliAuthPort`——延续 USER 已裁决"不让真实数据阻碍
   M8 完成"。
2. **`liveConnectClient.ts`** —— WebSocket 长连客户端，**不照搬**
   `eventSubClient.ts` 的八态机：真实协议有两条独立心跳（20 秒
   HTTP 场次心跳 + 30 秒 WS op=2 包），状态拓扑
   `STOPPED/STARTING/CONNECTING/AUTHENTICATING/CONNECTED/ERROR`
   如实反映这一真实机制；16 字节包头编解码有独立单元测试；不实现
   多主机 failover/自动重试/Brotli 解压（未证实需要，不发明）。
3. **`chatMessageAdapter.ts`** —— `normalizeBilibiliChatMessage`
   用 `LIVE_OPEN_PLATFORM_DM` 真实携带的 `timestamp` 服务端时间作
   `receivedAt`（对齐 YouTube `snippet.publishedAt` 处置，不对齐
   Twitch 本地时钟处置——字段可用性决定处置）。
4. **`sendChat.ts`** —— **诚实能力缺口**：官方开放平台协议层面
   没有任何应用级发送弹幕接口（`/v2/app/*` 只有
   start/heartbeat/end），唯一已知的发送端点是
   `live.bilibili.com` 非官方 Cookie 鉴权接口，鉴权模型与开放平台
   完全不同、落地即引入未经合规审查的用户会话凭据存储——本节点
   不落地它，只导出一个恒失败常量 `unsupportedBilibiliSendChat`，
   不提供任何 config 化工厂（这不是凭据缺失式降级，是能力本身
   不存在，处置上刻意与 Twitch/YouTube 的 `noop*SendChat` 不同——
   那两个是"有真实接口，缺凭据"，这个是"没有真实接口"）。

**Dev Spec 第 47 节合规检查要求已核实不构成本节点新增义务**：直接
读源码确认 `packages/host-memory/src/hostMemory.ts`（DEV-054，已
`DONE`）的 `purge`/`recallViewer`/`addRunningJoke`/`listRunningJokes`
全部以 `platform: string` 为通用参数，从未硬编码 Twitch；
Twitch/YouTube 两个既有 Adapter 均从未直接调用 `host-memory`——
Adapter 边界止于产出 `NormalizedChatMessage`。本节点遵循相同边界，
**完全不触碰 `host-memory`**，因此"数据存储策略合规检查"所指的
对象（具体持久化集成实现）本节点根本不产出，无需在此提前假设。

恰一项 workspace 依赖：`@interactive-story/platform-core`。零第三方
SDK（HMAC 用 Node 内置 `node:crypto`，不算新增依赖；不新增 `ws`
等第三方 WebSocket 库，延续 `eventSubClient.ts` 用全局 `WebSocket`
先例）。测试全部注入假 `fetchImpl`/`webSocketImpl`/`clock`，零真实
网络/WebSocket 调用。

## Scope

见 Task Package 第 3 节。新建 `packages/platform-bilibili`（包名已
在 `specs/dev/DAG.md:669` 冻结的 17 包列表预留，DEV-080 前不创建的
约束已随 DEV-080 DONE 解除）。

## Definition of Done

见 Task Package 第 7 节：六条命令全绿 + 22 项 Acceptance + 节点
文档齐全 + LEDGER/NODE_REPORT 写入不提交。

## 下一步

OpenCode 执行 T001–T002，完成后回复 NODE_REPORT，转 AUDITOR。
