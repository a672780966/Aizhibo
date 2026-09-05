# DEV-051 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-051 — Comment Pipeline

## Objective

新增 `packages/ai-host/src/commentPipeline.ts`：Dev Spec 第 40 节
流水线的 Safety→Priority→Topic Cluster→Select Candidate 四步
（Deduplicate/Normalize 已在 M4 完成）。`ingest()` 做黑名单/长度
Safety 检查 + 归一化文本精确匹配聚类；`selectCandidate()` 按簇大小+
最近时间只读选出候选；`clear()` 清空。零 LLM、零第三方依赖、不做
语义聚类。

## Allowed Scope

```
packages/ai-host/src/commentPipeline.ts        （新增）
packages/ai-host/src/commentPipeline.test.ts   （新增）
packages/ai-host/src/index.ts                  （追加导出）
specs/dev/DEV-051/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
packages/platform-core/src/index.ts（DEV-042 冻结）
packages/ai-host/src/egressGate.ts（Read-only，不 import）
其余同既有节点惯例
```

## Forbidden Scope

```
修改 packages/platform-core/**、packages/platform-twitch/**、packages/runtime-kernel/**、packages/ai-host/src/egressGate.ts
实现真正的语义聚类/情感分析/关键词权重公式
接入 runtime-kernel/Host LLM Provider/Host Scheduler
新增第三方 npm 依赖（含 AITuber OnAir 的 comment-intelligence 包）
创建除 ai-host 内文件外的任何新包
```

## Task Order

- [x] T001 节点文档
- [x] T002 commentPipeline.ts + 测试 + index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T001、T002 已全部完成

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与
NODE_REPORT 消息文件已写入工作区但**未提交**。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
