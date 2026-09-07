# DEV-055 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-055.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- `decideHostScheduling(factors)`：只实现"Story Audio > Host
  Audio"一条规则——`audioChannelBusy` 为真时 `canSpeak:false`，
  否则 `canSpeak:true`。
- 其余五个因子（`currentStoryPhase`/`chatVelocity`/
  `lastHostSpeechTimeMs`/`selectedCommentImportance`/
  `conversationContinuity`）只出现在类型签名里，不参与判定逻辑。
- 零依赖：不 import `runtime-kernel`/`platform-core`/
  `egressGate.ts`/`commentPipeline.ts`/`hostPersona.ts`/
  `hostMood.ts`。

## Scope（Task Package 第 3 节）

Writable：`hostScheduler.ts(.test.ts)`、`index.ts`（追加）、
`specs/dev/DEV-055/*.md`、`specs/comms/LEDGER.md`（仅追加，写入不
提交）、`specs/comms/NNNN-OPENCODE-to-*.md`。

Forbidden（摘录）：不改 `platform-core`/`platform-twitch`/
`runtime-kernel`/`egressGate.ts`/`commentPipeline.ts`/
`hostPersona.ts`/`hostMood.ts`；不为其余五个因子发明任何组合/
阈值/权重逻辑；不读取真实 runtime-kernel 状态；不接入未来节点；
不新增第三方依赖。

## Task Order

T001 节点文档 → T002 `hostScheduler.ts` + 测试 + `index.ts` 导出 +
全量验证 + REPORT + commit（**恰一条提交，LEDGER/NODE_REPORT 写入
工作区但不提交**）。
