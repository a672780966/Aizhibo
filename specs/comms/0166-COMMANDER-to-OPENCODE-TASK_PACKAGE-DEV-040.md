---
msg_id: "0166"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-040
created_at: 2026-09-04
requires_response: true
---

# TASK_PACKAGE — DEV-040

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-040.md`

## 前置状态

M3 真实可施工范围已完成（DEV-030/031/032/034/035/036/037 均 `DONE`）；
DEV-038（Audio Ducking）因依赖尚不存在的 `ai-host`（M5）已裁定推迟，见
`specs/dev/DAG.md`。USER 已授权跨里程碑自动推进，M4（Twitch）现在开工，本
节点是 M4 第一个节点，也是全项目第一个 Twitch/平台相关节点，`packages/`
下没有任何可复用的既有代码。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-040.md`——**第 1/2 节务必先读**：三个环境
   变量（`TWITCH_CLIENT_ID`/`TWITCH_CLIENT_SECRET`/`TWITCH_REFRESH_TOKEN`）
   任一缺失时必须原样返回 `noopTwitchAuthPort`（身份相等）；**测试全程不得
   发出任何真实网络请求**，全部用注入的 `fetchImpl` 假实现；不实现交互式
   授权首次获取、不实现 EventSub/Chat 客户端、不实现 token 缓存调度。
3. `specs/PROJECT_INDEX.md`

## 关于本节点范围

只允许新建 `packages/platform-twitch/*`（`package.json`/`tsconfig.json`/
`src/twitchAuth.ts(.test.ts)`/`src/index.ts`）与根 `tsconfig.json`（追加 1
条 `references`）。`packages/audio-engine/**`、`packages/runtime-kernel/**`、
`apps/renderer/**` 一律不得触碰；不得创建 `packages/ai-host`。

## 节点状态

`ISSUED` → 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
