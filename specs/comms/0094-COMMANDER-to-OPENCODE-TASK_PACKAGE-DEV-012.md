---
msg_id: "0094"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-012
created_at: 2026-08-21
requires_response: true
---

# TASK_PACKAGE — DEV-012

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-012.md`

## 前置状态

DEV-011 已 `DONE`（接口冻结）。**本节点是 M1（Story Machine Complete）的最后一个节点**——
PASS 后 M1 全部完成，`DAG.md` 第二施工组 M2（DEV-020 系列）全部依赖本节点。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-012.md`——**第 2 节务必先读**：Commander 已核实所有
   Presentation 命令目前在已冻结的 `machine.ts` action 内部直接发送，本节点**不改动
   这些 action 的任何一行**，而是用装饰器（`wrapPresentationPort`）包一层加 `commandSeq`
   信封 + 折叠状态投影。`ports.ts` 只做**唯一一次**纯新增可选字段
   （`PresentationPort.onRendererHello?`），先例见 DEV-002A 对 `hostPublic.ts` 的处置。
3. `specs/PROJECT_INDEX.md`

## 关于本节点范围（"Runtime API"这个名字比实际范围大）

Dev Spec 原文把 DEV-012 叫"Runtime API，给 Renderer/Operator/Platform 提供内部接口"，
但 `DAG.md` CR-012 明确只指派了 Presentation Command 契约给本节点。Operator API 是
DEV-060A（M6）的职责，平台专用接口是 M4 的职责——那些消费方现在都不存在，本节点不提前
建。任务包第 10 节已列出全部 Non-goals。

## 上一轮的教训

`DECISIONS.md` 必须随最终提交一起入库；本节点需要记录装饰器设计理由、`onRendererHello?`
可选字段扩展理由、"互动关闭无信号"已知缺口的如实记录。

## 节点状态

`ISSUED` → Codex 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
