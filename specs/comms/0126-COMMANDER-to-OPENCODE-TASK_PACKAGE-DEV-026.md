---
msg_id: "0126"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-026
created_at: 2026-08-22
requires_response: true
---

# TASK_PACKAGE — DEV-026

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-026.md`

## 前置状态

DEV-025 已 `DONE`（接口冻结）。本节点是 M2 第七个节点，第四次对 `onSceneEnter` 发
窄范围 CR。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-026.md`——**第 1/2 节务必先读**：核对全部
   `chapter-schema` 源码后确认没有"转场预设"字段——转场不是章节可配置数据，是
   Renderer 每次收到新场景时统一套用的一种内置淡入效果，不新增 schema 字段。
   `resolveCameraPreset` 是**新增**的纯函数，**不得修改**已冻结的 `resolveVisualLayers`
   （DEV-021）。
3. `specs/PROJECT_INDEX.md`

## 关于本节点范围

`VisualScene.cameraPreset` 是纯字符串键，Renderer 只做"preset 名 → 写死的 CSS 效果"
映射，不做任何镜头 DSL 或动态参数系统。未收录的 preset 名必须安全回退，不抛异常。

## 上一轮的教训

`DECISIONS.md` 必须随最终提交一起入库；`INDEX.md` 的 `Status:` 表头请主动改到位。

## 节点状态

`ISSUED` → Codex 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
