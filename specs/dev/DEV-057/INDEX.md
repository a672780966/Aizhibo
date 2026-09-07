# DEV-057 INDEX

Status: IN_PROGRESS

## Current Node

DEV-057 — Host TTS

## Objective

新增 `packages/ai-host/src/hostTtsProvider.ts`：`HostTtsProvider`
流式合成接口（`synthesizeSpeech` 返回 `AsyncIterable<Uint8Array>`
音频块）+ `noopHostTtsProvider` 诚实占位实现。Dev Spec 第 30 节
明确 Host TTS 应为流式（WebSocket 类）协议，与 DEV-034 冻结的
文件返回式 `TtsProviderPort` 是两种不同形状，本节点新建独立接口，
不复用/修改 `TtsProviderPort`。不指定任何具体厂商/协议细节，不
实现任何真实网络调用（同 DEV-056 先例）。不重新打开 DEV-038。

## Allowed Scope

```
packages/ai-host/src/hostTtsProvider.ts        （新增）
packages/ai-host/src/hostTtsProvider.test.ts   （新增）
packages/ai-host/src/index.ts                  （追加导出）
specs/dev/DEV-057/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
packages/ai-host/src/egressGate.ts、commentPipeline.ts、hostPersona.ts、hostMood.ts、hostScheduler.ts、hostLLMProvider.ts（Read-only，不 import）
packages/audio-engine/src/ttsProvider.ts（Read-only，对照参照，不 import）
packages/platform-twitch/src/twitchAuth.ts（Read-only，Port/noop 范式参照，不 import）
其余同既有节点惯例
```

## Forbidden Scope

```
修改 packages/platform-core/**、packages/platform-twitch/**、packages/runtime-kernel/**、packages/audio-engine/**、packages/ai-host/src/egressGate.ts、commentPipeline.ts、hostPersona.ts、hostMood.ts、hostScheduler.ts、hostLLMProvider.ts
修改/复用 DEV-034 冻结的 TtsProviderPort
实现任何真实的网络调用/WebSocket 连接/HTTP 客户端/TTS API 协议对接
引入任何第三方 TTS SDK 依赖
接入 Egress Gate/Host Scheduler/真实 Runtime 组合层
重新打开 DEV-038（Audio Ducking，BLOCKED）
新增第三方 npm 依赖
创建除 ai-host 内文件外的任何新包
```

## Task Order

- [ ] T001 节点文档
- [ ] T002 hostTtsProvider.ts + 测试 + index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与
NODE_REPORT 消息文件已写入工作区但**未提交**。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
