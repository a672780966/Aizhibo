# DEV-056 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-056.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- `HostLLMProvider` 接口：`generateReply(prompt): Promise<HostLLMResult>` +
  `getHealth(): Promise<Health>`。
- `noopHostLLMProvider`：唯一落地实现，诚实返回"未配置"，不发起
  任何网络请求。
- `Health` 用本地类型镜像（同 `twitchAuth.ts` 先例），不引入
  `@interactive-story/shared` 依赖。
- 零依赖：不 import `runtime-kernel`/`platform-core`/
  `egressGate.ts`/`commentPipeline.ts`/`hostPersona.ts`/
  `hostMood.ts`/`hostScheduler.ts`。

## Scope（Task Package 第 3 节）

Writable：`hostLLMProvider.ts(.test.ts)`、`index.ts`（追加）、
`specs/dev/DEV-056/*.md`、`specs/comms/LEDGER.md`（仅追加，写入不
提交）、`specs/comms/NNNN-OPENCODE-to-*.md`。

Forbidden（摘录）：不改 `platform-core`/`platform-twitch`/
`runtime-kernel`/ai-host 既有五个模块；不实现任何真实网络调用/
HTTP 客户端/第三方 LLM SDK；不接入未来节点；不新增第三方依赖。

## Task Order

T001 节点文档 → T002 `hostLLMProvider.ts` + 测试 + `index.ts` 导出 +
全量验证 + REPORT + commit（**恰一条提交，LEDGER/NODE_REPORT 写入
工作区但不提交**）。
