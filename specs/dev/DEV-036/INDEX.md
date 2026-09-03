# DEV-036 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-036 — Audio Cache

## Objective

实现 Dev Spec 第 51 节要求的完整缓存 key 算法（`hash(voiceModelVersion +
voiceId + text + voiceSettings)`）与对应的文件缓存存取（`findCached`/
`store`），修正 DEV-035 自身幂等命名哈希缺少 `voiceModelVersion`/完整
`voiceSettings` 的已知缺口。`voiceModelVersion` 作为部署级常量放在
`createAudioCache` 的构造参数里，不进入已冻结的 `AudioResolutionRequest`。
不接入 `AudioResolutionPorts`/`resolveAudioSource`/`runtime-kernel` 任何
调用点，接线是未来节点的职责。

## Allowed Scope

```
packages/audio-engine/src/audioCache.ts        （新增）
packages/audio-engine/src/audioCache.test.ts   （新增）
packages/audio-engine/src/index.ts             （追加导出）
specs/dev/DEV-036/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

## Read-only Scope

```
packages/audio-engine/src/{resolveAudioSource.ts,ttsProvider.ts,elevenLabsTtsProvider.ts}
packages/persistence/src/health.ts
packages/runtime-kernel/**、apps/renderer/**
其余同既有节点惯例
```

## Forbidden Scope

```
修改 AudioResolutionRequest（不得新增 voiceModelVersion 字段）
修改 resolveAudioSource.ts / ttsProvider.ts / elevenLabsTtsProvider.ts
把 AudioCache 接入 runtime-kernel 任何调用点
复用/修改 DEV-035 内部的幂等命名哈希
新增任何 npm 依赖
```

## Task Order

- [x] T001 节点文档
- [x] T002 audioCache.ts + 测试
- [x] T003 index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

（全部完成，等待 AUDITOR 审计）

## Exit Criteria

六条命令全部退出码 0；`computeAudioCacheKey` 的 `voiceModelVersion` 敏感性
测试通过；跨模型版本互不串扰的端到端测试通过；`DECISIONS.md` 已入库；
REPORT.md 完成且 Status = READY_FOR_REVIEW；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
