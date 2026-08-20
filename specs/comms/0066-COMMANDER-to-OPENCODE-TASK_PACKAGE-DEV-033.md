---
msg_id: "0066"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-033
created_at: 2026-08-20
requires_response: true
---

# TASK_PACKAGE — DEV-033

## 指针

授权内容全文位于：`specs/tasks/TASK-PACKAGE-DEV-033.md`

## 前置状态

DEV-000/DEV-001/DEV-008/DEV-002/DEV-003/DEV-002A/DEV-004/DEV-005/DEV-006 均已 `DONE`。新包 `packages/narrative-composer`，依赖 `chapter-schema` + `rule-engine`。

## 必读顺序

1. `specs/protocol/COMMS-PROTOCOL-V1.md`
2. `specs/tasks/TASK-PACKAGE-DEV-033.md`——**第 1 节与第 9 节务必先读**：Dev Spec 第 12 节的 `PRIMARY/SUPPORT/CONTEXT/DEFERRED` 与第 13 节例子里的 `PREFIX/SUPPORT/PRIMARY/URGENCY/TRANSITION` 是两个不同的轴，本任务包已经把两者的关系和具体判定规则写清楚，不要自行重新解释规范原文。
3. `specs/PROJECT_INDEX.md`

## 关于本节点的模糊度

这是目前规范最模糊的一个节点，任务包里第 9 节列了 6 条解释性设计决策（分级规则、连接策略、异常处理边界等），全部是我做出的判断，不是规范逐字规定的。**严格照办即可，不要在此基础上再自行发明变体**——如果实现过程中发现某条规则确实说不通，发 `EXECUTOR_QUERY` 而不是自行改动判定逻辑。

## 上一轮的教训

`DECISIONS.md` 必须随最终提交一起入库，且本节点的决策数量比以往都多，务必写完整。

## 节点状态

`ISSUED` → Codex 开工后将本消息 LEDGER 状态置为 `CLOSED`，节点转 `IN_PROGRESS`。
