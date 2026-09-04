# DEV-044 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-044.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- `createInteractionAggregator`：`onVote(handler)` 单一注册（覆盖式）+
  `ingest(message)` 解析 `NormalizedChatMessage.text`（trim+大写精确
  匹配 A/B/C/D）合成 `Vote` 调用 handler，非法输入静默忽略。
- `Vote` 本地镜像 `runtime-kernel` 冻结形状，不 import/依赖它（依赖
  方向：platform-core 是被消费的中立层）。
- 不做去重（DEV-043 已完成）、频率限制、模糊匹配。

## Scope（Task Package 第 3 节）

Writable：`interactionAggregator.ts(.test.ts)`、`index.ts`（追加）、
`specs/dev/DEV-044/*.md`、`specs/comms/LEDGER.md`（仅追加，写入不
提交）、`specs/comms/NNNN-OPENCODE-to-*.md`（写入不提交）。

Forbidden（摘录）：不改/不依赖 `runtime-kernel`；不实现频率限制/模糊
匹配/去重；不新增第三方依赖。

## Task Order

T001 节点文档 → T002 `interactionAggregator.ts` + 测试 + `index.ts`
导出 + 全量验证 + REPORT + commit（**恰一条提交，LEDGER/NODE_REPORT
写入工作区但不提交**）。
