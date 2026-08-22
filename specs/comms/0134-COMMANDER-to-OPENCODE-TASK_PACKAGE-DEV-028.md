---
msg_id: "0134"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-028
created_at: 2026-08-23
requires_response: true
---

# TASK_PACKAGE — DEV-028

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-028.md`

## 前置状态

DEV-027 已 `DONE`（接口冻结）。**本节点是 M2 的最后一个节点**——PASS 后 M2
（Presentation Complete）全部完成。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-028.md`——**第 1/2 节务必先读**：本节点与前八个
   节点性质不同，**不新增任何生产代码**。核对下来"序号分配"（DEV-012）与"分发"
   （DEV-020）都已实现，本节点只补齐 CR-012 明确要求、此前从未测过的三个属性：
   真实断线重连走同一条代码路径、同连接连续 RESYNC 请求的幂等性、多客户端广播
   分发一致性。
3. `specs/PROJECT_INDEX.md`

## 关于本节点范围

只追加测试（`wsServer.test.ts`/`presentationCommand.test.ts`），不改任何生产代码、
不改任何既有测试用例。若测试过程中发现真实 bug，发 `EXECUTOR_QUERY`，不要自行修。

## 上一轮的教训

`DECISIONS.md` 必须随最终提交一起入库；`INDEX.md` 的 `Status:` 表头请主动改到位。

## 节点状态

`ISSUED` → Codex 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
