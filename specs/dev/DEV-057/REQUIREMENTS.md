# DEV-057 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-057.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- `HostTtsProvider` 接口：`synthesizeSpeech(text): Promise<HostTtsResult>` +
  `getHealth(): Promise<Health>`。
- `HostTtsResult` 的 `ok:true` 分支用 `audioChunks:
  AsyncIterable<Uint8Array>` 表达流式产出（第 30 节要求），不是
  DEV-034 `TtsProviderPort` 的文件返回式形状。
- `noopHostTtsProvider`：唯一落地实现，诚实返回"未配置"，不发起
  任何网络请求。
- `Health` 用本地类型镜像，不引入 `@interactive-story/shared` 依赖。
- 零依赖：不 import `runtime-kernel`/`platform-core`/
  `audio-engine`/ai-host 既有六个模块。

## Scope（Task Package 第 3 节）

Writable：`hostTtsProvider.ts(.test.ts)`、`index.ts`（追加）、
`specs/dev/DEV-057/*.md`、`specs/comms/LEDGER.md`（仅追加，写入不
提交）、`specs/comms/NNNN-OPENCODE-to-*.md`。

Forbidden（摘录）：不改 `platform-core`/`platform-twitch`/
`runtime-kernel`/`audio-engine`/ai-host 既有六个模块；不复用/修改
DEV-034 `TtsProviderPort`；不实现任何真实网络调用/WebSocket/第三
方 TTS SDK；不接入未来节点；不重新打开 DEV-038；不新增第三方依赖。

## Task Order

T001 节点文档 → T002 `hostTtsProvider.ts` + 测试 + `index.ts` 导出 +
全量验证 + REPORT + commit（**恰一条提交，LEDGER/NODE_REPORT 写入
工作区但不提交**）。
