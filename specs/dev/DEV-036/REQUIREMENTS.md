# DEV-036 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-036.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- `computeAudioCacheKey`：对 `{voiceModelVersion, voiceId, text,
  voiceSettings}` 做确定性序列化（`voiceSettings` 键先排序）后 `sha256`；
  仅 `voiceModelVersion` 不同必须得到不同 key（核心要求，修正 DEV-035 自身
  幂等哈希的已知缺口）。
- `createAudioCache({cacheDir, voiceModelVersion})`：`voiceModelVersion` 是
  构造参数（部署级常量），不进入 `AudioResolutionRequest`。`findCached` 用
  目录前缀扫描（不假设固定扩展名）；`store` 用 `fs.copyFileSync` 保留源文件
  真实扩展名。
- `getAudioCacheHealth(cacheDir)`：CR-019 本模块首次真正适用，参照
  `persistence.getHealth`（DEV-010 先例）风格，写临时探测文件验证可写性。
- 不接入 `AudioResolutionPorts`/`resolveAudioSource`/`runtime-kernel` 任何
  调用点；不修改 `AudioResolutionRequest`；不复用 DEV-035 内部哈希。

## Scope（Task Package 第 3 节）

Writable：`audioCache.ts(.test.ts)`、`index.ts`（追加）、
`specs/dev/DEV-036/*.md`、`specs/comms/LEDGER.md`（仅追加）、
`specs/comms/NNNN-OPENCODE-to-*.md`。

Forbidden（摘录）：不改 `AudioResolutionRequest`；不改
`resolveAudioSource.ts`/`ttsProvider.ts`/`elevenLabsTtsProvider.ts`；不接入
任何调用点；不复用 DEV-035 哈希；不新增依赖。

## Task Order

T001 节点文档 → T002 `audioCache.ts` + 测试（含跨 `voiceModelVersion` 互不
串扰的端到端验证）→ T003 `index.ts` 导出 + 全量验证 + REPORT + commit +
NODE_REPORT。
