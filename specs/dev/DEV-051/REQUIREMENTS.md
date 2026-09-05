# DEV-051 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-051.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- `createCommentPipeline(config?).ingest(message)`：Safety（黑名单/
  长度）检查后归一化文本精确匹配聚类，容量超限淘汰优先级最低的簇。
- `selectCandidate()`：只读查询，按簇大小降序、并列按最近时间降序
  选出候选，不清空状态。
- `clear()`：清空全部簇。
- 不做语义聚类/情感分析/关键词权重；零 LLM、零第三方依赖。

## Scope（Task Package 第 3 节）

Writable：`commentPipeline.ts(.test.ts)`、`index.ts`（追加）、
`specs/dev/DEV-051/*.md`、`specs/comms/LEDGER.md`（仅追加，写入不
提交）、`specs/comms/NNNN-OPENCODE-to-*.md`。

Forbidden（摘录）：不改 `platform-core`/`platform-twitch`/
`runtime-kernel`/`egressGate.ts`；不做语义聚类；不接入未来节点；
不新增第三方依赖。

## Task Order

T001 节点文档 → T002 `commentPipeline.ts` + 测试 + `index.ts` 导出 +
全量验证 + REPORT + commit（**恰一条提交，LEDGER/NODE_REPORT 写入
工作区但不提交**）。
