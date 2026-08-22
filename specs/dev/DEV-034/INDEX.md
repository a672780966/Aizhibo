# DEV-034 INDEX

Status: IN_PROGRESS

## Current Node

DEV-034 — TTS Provider Interface

## Objective

在 `packages/audio-engine` 新增 `TtsProviderPort`/`TtsSynthesisRequest`/
`TtsSynthesisResult`/`noopTtsProviderPort`——只定义"TTS 提供方长什么样"的契约，
不实现任何真实 HTTP/流式调用（DEV-035 的职责），不接入任何调用点（`resolveAudioSource`/
`runtime-kernel` 均不改动）。

## Allowed Scope

```
packages/audio-engine/src/ttsProvider.ts        （新增）
packages/audio-engine/src/ttsProvider.test.ts   （新增）
packages/audio-engine/src/index.ts              （追加导出）
specs/dev/DEV-034/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

## Read-only Scope

```
packages/audio-engine/src/resolveAudioSource.ts（DEV-030 冻结，不得改动）
packages/runtime-kernel/**、apps/renderer/**
其余同既有节点惯例
```

## Forbidden Scope

```
修改 resolveAudioSource.ts / AudioResolutionPorts.hasTtsProvider
把 TtsProviderPort 接入 runtime-kernel 任何 action 或 Ports
实现任何真实 HTTP/网络调用
在接口里暴露具体的流式原语
新增任何 npm 依赖
新建 getHealth()
```

## Task Order

- [ ] T001 节点文档
- [ ] T002 ttsProvider.ts + 测试
- [ ] T003 index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001（每完成一个 Task 立即勾选并更新本字段）

## Exit Criteria

六条命令全部退出码 0；`noopTtsProviderPort` 诚实失败路径测试通过；可辨识联合
类型检查通过；`DECISIONS.md` 已入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；
已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
