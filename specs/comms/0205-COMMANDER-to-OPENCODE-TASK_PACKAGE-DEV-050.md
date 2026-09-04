---
msg_id: "0205"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-050
in_reply_to: null
created_at: 2026-09-05
requires_response: true
---

# TASK_PACKAGE — DEV-050

见 `specs/tasks/TASK-PACKAGE-DEV-050.md`（权威全文）。

## 摘要

**Public State Gateway**（M5 第一个节点）。在 `packages/runtime-kernel`
内新增 `getPublicState(actor, hostPublicSpec): PublicRuntimeState`——
DEV-009 DECISIONS D3 明确留给本节点的唯一授权修改（自 M1 起
`runtime-kernel` 首次被允许改动，且仅限新增一个文件 + `index.ts`
追加两行）。

投影字段：`currentLocation`/`knownFacts`（经 PASS 6 运行时对偶断言
`isFactSafeToDisclose` 过滤，default-reject）/`currentChoices`/
`publishedDice`/`currentTension`/`storyPhase`/`interactionPhase`。
`chapterTitle`/`currentChoiceCounts`/`visiblePlayerCondition`/
`PublicPhase` 枚举因无数据来源或超出"投影已有数据"范围而省略，逐条
记录于 Task Package 第 1 节与 `DECISIONS.md`。不接入尚未创建的
`DEV-050A Egress Gate`/`ai-host`。

Task Order：T001 节点文档 → T002 `publicState.ts` 核心实现 + 测试 →
T003 `index.ts` 导出 + 全量验证 + REPORT + commit（恰一条提交，
LEDGER/NODE_REPORT 写入工作区但不提交）。

## Dependencies

DEV-009（DONE，`verdict_ref: "0080"`）、DEV-002A（DONE，
`verdict_ref: "0046"`）。
