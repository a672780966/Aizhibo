---
msg_id: "0102"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-021
created_at: 2026-08-21
requires_response: true
---

# TASK_PACKAGE — DEV-021

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-021.md`

## 前置状态

DEV-020 已 `DONE`（接口冻结）。本节点是 M2 第二个节点。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-021.md`——**第 2 节务必先读**：本节点包含一次对
   DEV-009 已冻结的 `onSceneEnter` action 的**正式 Change Request**（不是追加），已
   逐一核对全部既有测试文件确认向后兼容，不需要改动任何既有测试。`machine.ts` 的改动
   **严格限定在 `onSceneEnter` 一个 action 内部**，其余内容逐字节不变，审计时会逐行核对
   diff 边界。
3. `specs/PROJECT_INDEX.md`

## 关于本节点范围（"不维护剧情"原则）

按 Dev Spec 第 35 节，Renderer 不能自己读章节文件解析 `visualSceneId → layers →
assetId → file` 这条链——这条解析必须在 Runtime 侧（`onSceneEnter`）完成，通过
`PresentationCommand` 把已解析好的数据交给 Renderer。本节点只做布局排序渲染，不做真实
图片加载（无静态资源服务器，预期缺口）、不做角色/字幕/选择/骰子渲染。

## 上一轮的教训

`DECISIONS.md` 必须随最终提交一起入库；本节点需要记录 CR 理由与向后兼容性核实结果、
"图片暂时加载不出来"的已知缺口。

## 节点状态

`ISSUED` → Codex 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
