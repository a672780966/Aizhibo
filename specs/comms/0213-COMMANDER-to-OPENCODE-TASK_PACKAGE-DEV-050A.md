---
msg_id: "0213"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-050A
in_reply_to: null
created_at: 2026-09-05
requires_response: true
---

# TASK_PACKAGE — DEV-050A

见 `specs/tasks/TASK-PACKAGE-DEV-050A.md`（权威全文）。

## 摘要

**Host Egress Gate**（M5 第二个节点，CR-010）。全仓库第一次创建
`packages/ai-host`。五道确定性检查（C1 权限档位由调用方传入，
`MUTED` 直接丢弃/C2 消费 DEV-002A 冻结的 `ForbiddenLexicon` 词表/C3
平台 denylist 作为构造参数注入/C4 最近已放行文本环形缓冲去重/C5
长度上限 + 滑动窗口频率限制）按顺序短路判定，结果只有
`ALLOW`/`DROP`。不改写文本、不重试；只有真正 ALLOW 的尝试计入 C4/C5
历史状态。

明确排除：本节点不计算"此刻是什么权限档位"（第 39 节判定逻辑，留给
未来 Host Scheduler）；不接入 `runtime-kernel` 事件日志；不加载真实
平台配置文件；不接入 `DEV-046 Send Chat`/`DEV-057 Host TTS`（未来
集成节点职责）。

Task Order：T001 新包骨架 + 节点文档 → T002 `egressGate.ts` 实现 +
测试 → T003 `index.ts` 导出 + 全量验证 + REPORT + commit（恰一条
提交，LEDGER/NODE_REPORT 写入工作区但不提交）。

## Dependencies

DEV-002A（DONE，`verdict_ref: "0046"`）、DEV-050（DONE，
`verdict_ref: "0211"`）。
