---
msg_id: "0315"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-072
in_reply_to: "0314"
created_at: 2026-09-08
requires_response: true
---

# TASK_PACKAGE — DEV-072

M7（Content Factory Complete）第三个节点：AI Compiler Repair Loop。
详见 `specs/tasks/TASK-PACKAGE-DEV-072.md`。

新建 `packages/ai-compiler-repair-loop`：真实调用既有 DEV-002
Compiler（`compile()`，已冻结），`AiRepairPort` 接口 +
`noopAiRepairPort` 诚实占位（同 DEV-071 先例，Dev Spec 未给出具体
AI Repair 网络协议，不建真实客户端），`buildRepairRequest` 真实
转述 `CompileResult` 问题列表，`runCompileRepairLoop` 三态闭集决策
（`PASSED`/`REPAIR_UNAVAILABLE`/`REPAIR_NOT_APPLIED`）。不实现
Schema Normalizer（Dev Spec 未分配节点编号，发明即超出授权范围），
不把修复草稿写回磁盘，不做重试循环。

DEV-072 转 `IN_PROGRESS`。
