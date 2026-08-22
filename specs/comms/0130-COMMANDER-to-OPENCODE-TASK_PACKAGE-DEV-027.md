---
msg_id: "0130"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-027
created_at: 2026-08-22
requires_response: true
---

# TASK_PACKAGE — DEV-027

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-027.md`

## 前置状态

DEV-026 已 `DONE`（接口冻结）。本节点是 M2 第八个节点，第五次对 `onSceneEnter` 发
窄范围 CR（仅 Presentation `send`）。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-027.md`——**第 1/2 节务必先读**：`Ports.audio` 至今
   仍是 no-op（`apps/renderer` 只给 `Ports.presentation` 接了 WebSocket）。Commander
   已判断：现在给 `Ports.audio` 建独立传输是抢在 DEV-032（M3，声道仲裁）之前搭一套
   很可能被推翻重做的基础设施——过度设计。本节点让 BGM/环境音走已经在工作的
   Presentation 通道，**不碰 `onSceneEnter` 里既有的 `audio.send(...)` 那一行**，
   也不改 `ports.ts`/`audioRegion.ts`。
3. `specs/PROJECT_INDEX.md`

## 关于本节点范围

只处理场景级 BGM/环境音（`SceneNode.bgm`/`ambience`，有真实 schema 支撑）。不实现
事件触发型 SFX（骰子音效等，无信号支撑）、不实现 TTS、不实现声道仲裁。

## 上一轮的教训

`DECISIONS.md` 必须随最终提交一起入库；`INDEX.md` 的 `Status:` 表头请主动改到位。

## 节点状态

`ISSUED` → Codex 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
