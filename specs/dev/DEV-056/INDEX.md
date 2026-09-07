# DEV-056 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-056 — Host LLM Provider

## Objective

新增 `packages/ai-host/src/hostLLMProvider.ts`：`HostLLMProvider`
可替换接口（`generateReply`/`getHealth`）+ `noopHostLLMProvider`
诚实占位实现。Dev Spec 只要求"一个可替换 Provider API"，未指定
任何厂商/协议，不实现任何真实网络调用/HTTP 客户端/第三方 SDK
（USER 2026-09-07 已就此裁决）。零依赖。

## Allowed Scope

```
packages/ai-host/src/hostLLMProvider.ts        （新增）
packages/ai-host/src/hostLLMProvider.test.ts   （新增）
packages/ai-host/src/index.ts                  （追加导出）
specs/dev/DEV-056/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
packages/ai-host/src/egressGate.ts、commentPipeline.ts、hostPersona.ts、hostMood.ts、hostScheduler.ts（Read-only，不 import）
packages/platform-twitch/src/twitchAuth.ts（Read-only，Port/noop 范式参照，不 import）
其余同既有节点惯例
```

## Forbidden Scope

```
修改 packages/platform-core/**、packages/platform-twitch/**、packages/runtime-kernel/**、packages/ai-host/src/egressGate.ts、commentPipeline.ts、hostPersona.ts、hostMood.ts、hostScheduler.ts
实现任何真实的网络调用/HTTP 客户端/LLM API 协议对接
引入任何第三方 LLM SDK 依赖
接入 Host Scheduler/prompt 拼装/真实 Host Context 组装
新增第三方 npm 依赖
创建除 ai-host 内文件外的任何新包
```

## Task Order

- [x] T001 节点文档
- [x] T002 hostLLMProvider.ts + 测试 + index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T002 完成

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与
NODE_REPORT 消息文件已写入工作区但**未提交**。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
