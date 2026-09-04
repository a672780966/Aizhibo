# DEV-050 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-050 — Public State Gateway

## Objective

在 `packages/runtime-kernel` 内新增 `getPublicState(actor,
hostPublicSpec): PublicRuntimeState`——DEV-009 DECISIONS D3 明确留给
本节点的唯一授权修改。投影 `currentLocation`/`knownFacts`（经 PASS 6
运行时对偶断言 `isFactSafeToDisclose` 过滤）/`currentChoices`/
`publishedDice`/`currentTension`/`storyPhase`/`interactionPhase`。
`chapterTitle`/`currentChoiceCounts`/`visiblePlayerCondition` 因无
数据来源或超出"投影已有数据"范围而省略（记录于 DECISIONS.md）。不
接入 DEV-050A/ai-host（未来节点）。

## Allowed Scope

```
packages/runtime-kernel/src/publicState.ts        （新增）
packages/runtime-kernel/src/publicState.test.ts   （新增）
packages/runtime-kernel/src/index.ts              （仅追加导出，不改动既有行）
specs/dev/DEV-050/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
packages/runtime-kernel/src/{snapshot,machine,interactionRegion,event}.ts（DEV-008/009 冻结）
packages/chapter-schema/src/{hostPublic,worldState}.ts（DEV-001/002A 冻结）
packages/chapter-compiler/src/pass6Disclosure.ts（Read-only，不 import）
packages/dice-engine/src/index.ts（Read-only，仅核对字段名）
其余同既有节点惯例
```

## Forbidden Scope

```
修改 packages/runtime-kernel/** 内除 index.ts（仅追加）与新文件之外的任何现有文件
修改任何既有导出函数/类型的签名或行为
导出 unwrapSnapshot 或任何暴露 InternalSnapshot 真实结构的符号到 index.ts
实现 currentChoiceCounts/visiblePlayerCondition/chapterTitle/PublicPhase 枚举
新增投票计数/玩家状态等运行时能力
接入 DEV-050A/ai-host
新增第三方 npm 依赖
创建 packages/ai-host
```

## Task Order

- [x] T001 节点文档
- [x] T002 publicState.ts 核心实现 + 测试
- [x] T003 index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T003（完成）

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`git diff` 证明
`runtime-kernel` 既有文件（除 `index.ts` 追加行）零改动；
`DECISIONS.md` 已入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；
LEDGER 追加行与 NODE_REPORT 消息文件已写入工作区但**未提交**。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
