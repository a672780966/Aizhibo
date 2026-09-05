# DEV-052 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-052.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- `HostPersona`：`{ name: string; voiceDescription: string }`。
- `getHostPersona()`：返回唯一一个硬编码默认值，不接受参数、不做
  任何可配置/可切换逻辑。
- `voiceDescription` 默认文案直接复述 Dev Spec 第 36 节职责列表，
  不发明性格形容词。
- 零依赖：不 import `runtime-kernel`/`platform-core`/`egressGate.ts`/
  `commentPipeline.ts`。

## Scope（Task Package 第 3 节）

Writable：`hostPersona.ts(.test.ts)`、`index.ts`（追加）、
`specs/dev/DEV-052/*.md`、`specs/comms/LEDGER.md`（仅追加，写入不
提交）、`specs/comms/NNNN-OPENCODE-to-*.md`。

Forbidden（摘录）：不改 `platform-core`/`platform-twitch`/
`runtime-kernel`/`egressGate.ts`/`commentPipeline.ts`；不发明性格
形容词；不做多人设/可配置系统；不接入未来节点；不新增第三方依赖。

## Task Order

T001 节点文档 → T002 `hostPersona.ts` + 测试 + `index.ts` 导出 +
全量验证 + REPORT + commit（**恰一条提交，LEDGER/NODE_REPORT 写入
工作区但不提交**）。
