# DEV-011 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-011 — Deterministic Replay

## Objective

在已冻结的 `runtime-kernel` 上追加确定性重放能力：从历史 `RuntimeEvent[]` 提取投票轮次，
复用与 DEV-007 相同的相位驱动循环重新跑一遍章节，产出的新事件日志与原始记录逐字段一致
（G03）。不涉及崩溃恢复（DEV-010 已用写穿透 LKG 解决），不新建包。

## Allowed Scope（新增文件）

```text
packages/runtime-kernel/src/voteExtraction.ts
packages/runtime-kernel/src/voteExtraction.test.ts
packages/runtime-kernel/src/replay.ts
packages/runtime-kernel/src/replay.test.ts
packages/runtime-kernel/src/replayCompare.ts
packages/runtime-kernel/src/replayCompare.test.ts
```

## Allowed Scope（既有文件，仅追加）

```text
packages/runtime-kernel/src/index.ts
```

## Read-only Scope

`runtime-kernel/src/` 下除 `index.ts` 外的既有文件、所有其它 packages、persistence、章节
fixtures、规范正本、PROJECT_INDEX、DAG、tasks、audit、protocol 与工具配置均只读。

## Forbidden Scope

不修改任何状态机定义，不新增依赖，不接入服务器/真实驱动，不实现部分重放、CLI 或 apps
入口，不接触 `packages/persistence`。

## Task Order

- [x] T001 节点文档
- [x] T002 extractVoteRounds
- [x] T003 replayFromEventLog
- [x] T004 compareEventLogs
- [x] T005 Public exports
- [x] T006 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

—（T001–T006 全部完成，节点 READY_FOR_REVIEW，待向 AUDITOR 发 NODE_REPORT）

## Exit Criteria

六条命令全部退出码 0；`valid-minimal` 端到端重放测试通过；虚拟时钟场景完成包含
`id`/`timestamp` 的全字段比较；`index.ts` 只有新增行；`DECISIONS.md` 已入库；REPORT.md
Status = READY_FOR_REVIEW；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。OpenCode 禁止自行推进下一 DEV Node。
