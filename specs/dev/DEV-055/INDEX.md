# DEV-055 INDEX

Status: IN_PROGRESS

## Current Node

DEV-055 — Host Scheduler

## Objective

新增 `packages/ai-host/src/hostScheduler.ts`：`decideHostScheduling(factors)`
只实现 Dev Spec 第 41 节唯一明确的调度规则"Story Audio > Host
Audio"（`audioChannelBusy` 为真时禁止 Host 说话），其余五个调度
因子（Chat Velocity/Last Host Speech Time/Selected Comment
Importance/Conversation Continuity/Current Story Phase）只保留
类型签名，不实现任何组合/阈值/权重逻辑（Dev Spec 未定义，USER 已
裁决不发明）。零依赖，不读取真实 runtime-kernel 状态。

## Allowed Scope

```
packages/ai-host/src/hostScheduler.ts        （新增）
packages/ai-host/src/hostScheduler.test.ts   （新增）
packages/ai-host/src/index.ts                （追加导出）
specs/dev/DEV-055/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
packages/ai-host/src/egressGate.ts、commentPipeline.ts、hostPersona.ts、hostMood.ts（Read-only，不 import）
其余同既有节点惯例
```

## Forbidden Scope

```
修改 packages/platform-core/**、packages/platform-twitch/**、packages/runtime-kernel/**、packages/ai-host/src/egressGate.ts、commentPipeline.ts、hostPersona.ts、hostMood.ts
实现除"Story Audio > Host Audio"外任何其他因子的组合/阈值/权重逻辑
读取任何真实的 runtime-kernel Audio Channel/Story Phase 状态
接入 Host LLM Provider/prompt 拼装
新增第三方 npm 依赖
创建除 ai-host 内文件外的任何新包
```

## Task Order

- [ ] T001 节点文档
- [ ] T002 hostScheduler.ts + 测试 + index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与
NODE_REPORT 消息文件已写入工作区但**未提交**。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
