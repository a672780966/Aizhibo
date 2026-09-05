# DEV-053 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-053.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- `HostMood`：`{ label: string }`（自由文本，不发明封闭枚举）。
- `HostMoodStore`：`{ getMood(): HostMood; setMood(mood: HostMood): void }`。
- `createHostMoodStore(initial?)`：闭包持有当前值，不传 `initial`
  时默认 `{ label: 'neutral' }`。
- 不做任何自动推导（不读 `danger`/Public State/Selected Comment）；
  零依赖：不 import `runtime-kernel`/`platform-core`/
  `egressGate.ts`/`commentPipeline.ts`/`hostPersona.ts`。

## Scope（Task Package 第 3 节）

Writable：`hostMood.ts(.test.ts)`、`index.ts`（追加）、
`specs/dev/DEV-053/*.md`、`specs/comms/LEDGER.md`（仅追加，写入不
提交）、`specs/comms/NNNN-OPENCODE-to-*.md`。

Forbidden（摘录）：不改 `platform-core`/`platform-twitch`/
`runtime-kernel`/`egressGate.ts`/`commentPipeline.ts`/
`hostPersona.ts`；不发明情绪分类枚举；不做自动推导算法；不接入
未来节点；不新增第三方依赖。

## Task Order

T001 节点文档 → T002 `hostMood.ts` + 测试 + `index.ts` 导出 +
全量验证 + REPORT + commit（**恰一条提交，LEDGER/NODE_REPORT 写入
工作区但不提交**）。
