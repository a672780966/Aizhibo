---
msg_id: "0098"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-020
created_at: 2026-08-21
requires_response: true
---

# TASK_PACKAGE — DEV-020

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-020.md`

## 前置状态

M1 全部 15 个节点已 `DONE`，三个对外契约冻结。USER 已选定下一步走 M2（演出），本节点是
M2 第一个节点，依赖已冻结的 DEV-012。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-020.md`——**第 2 节务必先读**：这是全项目第一次引入前端
   应用（React + Vite）、第一次真实网络协议（WebSocket）、第一次新增运行时 npm 依赖。
   Commander 已核对根级 `tsc -b`/`eslint`/`vitest` 配置与新技术栈的适配缺口，第 2.5 节
   列出**唯三**允许的根配置改动，每一处都有明确理由，严格照办，不要额外调整任何根配置。
3. `specs/PROJECT_INDEX.md`

## 关于本节点的范围

只做"Shell"——连接管理、`RENDERER_HELLO` 握手、`commandSeq` 跳空检测、调试用命令列表，
**不画任何真实场景/角色/字幕**（那些是 DEV-021～025 的职责）。`packages/**` 全部
Read-only，本节点不对 `runtime-kernel` 做任何追加式扩展，纯粹作为消费方使用它已冻结的
`PresentationCommand`/`wrapPresentationPort` 等导出。

## 上一轮的教训

`DECISIONS.md` 必须随最终提交一起入库；本节点需要记录包/应用边界决策、类型边界纪律理由
（客户端半不得值导入 `runtime-kernel`）、根配置三处改动的逐项理由。

## 节点状态

`ISSUED` → Codex 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
