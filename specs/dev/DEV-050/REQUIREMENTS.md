# DEV-050 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-050.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- `getPublicState(actor, hostPublicSpec)`：投影 `currentLocation`/
  `knownFacts`（经 `isFactSafeToDisclose` 过滤）/`currentChoices`/
  `publishedDice`/`currentTension`/`storyPhase`/`interactionPhase`。
- `isFactSafeToDisclose`：PASS 6 编译期判定的运行时对偶，
  default-reject（依赖未声明/未标 PUBLIC/当前未确立值均不安全）。
- 省略 `chapterTitle`/`currentChoiceCounts`/`visiblePlayerCondition`/
  `PublicPhase` 枚举（无数据来源或超出投影范围，见 DECISIONS.md）。

## Scope（Task Package 第 3 节）

Writable：`publicState.ts(.test.ts)`、`index.ts`（仅追加两行）、
`specs/dev/DEV-050/*.md`、`specs/comms/LEDGER.md`（仅追加，写入不
提交）、`specs/comms/NNNN-OPENCODE-to-*.md`（写入不提交）。

Forbidden（摘录）：`runtime-kernel` 除 `index.ts` 追加行与新文件外
逐字节不得改动；不导出 `unwrapSnapshot`；不实现省略字段；不接入
`DEV-050A`/`ai-host`；不新增第三方依赖。

## Task Order

T001 节点文档 → T002 `publicState.ts` 核心实现 + 测试 → T003
`index.ts` 导出 + 全量验证 + REPORT + commit（**恰一条提交，
LEDGER/NODE_REPORT 写入工作区但不提交**）。
