# DEV-044 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-044 — Interaction Aggregator (A/B/C/D)

## Objective

新增 `packages/platform-core/src/interactionAggregator.ts`：把
`NormalizedChatMessage.text` 解析为 A/B/C/D 投票（trim+大写精确匹配），
合成本地镜像的 `Vote{viewerId,choiceId}` 并调用注册的 handler（签名与
`runtime-kernel` 冻结的 `PlatformPort.onVote` 一致，但不 import/依赖
`runtime-kernel`）。不做去重（DEV-043 已完成）、不做频率限制、不接入
真实数据流或 runtime-kernel。

## Allowed Scope

```
packages/platform-core/src/interactionAggregator.ts        （新增）
packages/platform-core/src/interactionAggregator.test.ts   （新增）
packages/platform-core/src/index.ts                        （追加导出）
specs/dev/DEV-044/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
packages/platform-core/src/index.ts（DEV-042 冻结部分）
packages/runtime-kernel/src/ports.ts（Read-only，仅核对形状，不得 import）
其余同既有节点惯例
```

## Forbidden Scope

```
修改 packages/runtime-kernel/**
import 或依赖 @interactive-story/runtime-kernel
实现多次投票限制/频率限制/模糊匹配解析
实现去重（DEV-043 职责）
把聚合器接入任何真实数据流或 runtime-kernel 调用点
新增第三方 npm 依赖
创建 packages/ai-host
```

## Task Order

- [x] T001 节点文档
- [x] T002 interactionAggregator.ts + 测试 + index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

（全部完成，等待 AUDITOR 审计）

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已入库；
REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与 NODE_REPORT
消息文件已写入工作区但**未提交**。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
