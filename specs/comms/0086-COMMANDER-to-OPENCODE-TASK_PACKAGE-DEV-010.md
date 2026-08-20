---
msg_id: "0086"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-010
created_at: 2026-08-21
requires_response: true
---

# TASK_PACKAGE — DEV-010

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-010.md`

## 前置状态

DEV-009/DEV-007 均已 `DONE`（接口冻结）。本节点首次创建 `packages/persistence`
（Rev 2 冻结 17 包列表之一，此前从未建包）。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-010.md`——**第 2 节务必先读**：Commander 已核实
   `RuntimeSnapshot` 的不透明设计（DEV-009 CR-008）无法直接持久化，正确解法是 XState
   原生的 `getPersistedSnapshot()`/`createActor(machine,{snapshot})`，本节点对
   `runtime-kernel` 只做两处追加式导出，不破坏既有信息隐藏设计。LKG 策略是"写穿透"，
   不做事件回放（回放是 DEV-011 的职责）。
3. `specs/PROJECT_INDEX.md`

## 关于本节点的范围收紧

Dev Spec 第 50 节列了 10 张表，本节点**只建 4 张**（`runtime_sessions`/`runtime_events`/
`runtime_snapshots`/`viewer_states`），其余 6 张延后到各自首个真实消费节点（任务包第
10 节有归属表）。`node:sqlite`（Node 内置模块）足够，**不得新增任何 npm 依赖**。

## 上一轮的教训

`DECISIONS.md` 必须随最终提交一起入库；本节点需要记录写穿透 LKG 理由、"Chapter
Version" 缺口处置、`node:sqlite` 选型理由、`getHealth()` 允许用 `Date.now()` 的红线
适用范围澄清。

## 节点状态

`ISSUED` → Codex 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
