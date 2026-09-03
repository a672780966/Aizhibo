---
msg_id: "0162"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-037
created_at: 2026-09-04
requires_response: true
---

# TASK_PACKAGE — DEV-037

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-037.md`

## 前置状态

DEV-009/011 均已 `DONE`。本节点是全系统第一次给 Runtime 状态机引入真实
（非瞬时）延迟。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-037.md`——**第 1 节"关键工程风险"务必先
   读**：本节点如果不同步给 Simulator/Replay/既有测试接上假时钟，会让整个
   测试套件因为真实等待而严重变慢，这是本节点最容易踩的坑。
3. `specs/PROJECT_INDEX.md`

## 关于本节点范围

不实现 `AUDIO_READY` 安全阀分支（系统里没有真实信号可用）；`interactionRegion.ts`
只改 `LOCKING` 一处；既有测试只能追加 `clock: instantClock` 字段，不得改动
判定逻辑。

## 节点状态

`ISSUED` → 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
