---
msg_id: "0225"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-051
in_reply_to: null
created_at: 2026-09-05
requires_response: true
---

# TASK_PACKAGE — DEV-051

见 `specs/tasks/TASK-PACKAGE-DEV-051.md`（权威全文）。

## 摘要

**Comment Pipeline**（M5 第三个节点）。Dev Spec 第 40 节流水线
`Chat Stream → Deduplicate → Normalize → Safety → Priority → Topic
Cluster → Select Candidate → Host`——`Deduplicate`（DEV-043）/
`Normalize`（DEV-042）已在 M4 完成，本节点只做 `Safety`→`Priority`→
`Topic Cluster`→`Select Candidate` 四步。

新增 `packages/ai-host/src/commentPipeline.ts`：`ingest()` 黑名单/
长度 Safety 检查 + 归一化文本精确匹配聚类（容量超限淘汰优先级最低
的簇）；`selectCandidate()` 只读查询按簇大小+最近时间选出候选；
`clear()` 清空。零 LLM、零第三方依赖（含不引入 AITuber OnAir 的
`comment-intelligence` npm 包）、不做语义聚类/情感分析/关键词权重。

Task Order：T001 节点文档 → T002 `commentPipeline.ts` + 测试 +
`index.ts` 导出 + 全量验证 + REPORT + commit（恰一条提交，
LEDGER/NODE_REPORT 写入工作区但不提交）。

## Dependencies

DEV-050A（DONE，`verdict_ref: "0223"`）、DEV-042（DONE，
`verdict_ref: "0179"`）。
