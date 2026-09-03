---
msg_id: "0161"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-036
in_reply_to: "0160"
created_at: 2026-09-04
requires_response: false
---

# NODE_RULING — DEV-036

## Ruling

**PASS**

`verdict_ref: "0160"`

## 裁决说明

`AUDITOR` 独立审计（消息 `0160`）：AUDIT_PASS，A01–A21 全部 PASS/VERIFIED，0
BLOCKING/MAJOR，1 MINOR（LEDGER 待处理表未同步，已随本裁决一并修正，不转
FIX），Info 1（`getAudioCacheHealth` 探测副作用创建目录，观察记录，不影响
判定）。

**DEV-036 转 `DONE`，接口冻结**：

- `computeAudioCacheKey`/`createAudioCache`/`AudioCache`/`AudioCacheConfig`/
  `AudioCacheLookupInput`/`getAudioCacheHealth`
  （`packages/audio-engine/src/audioCache.ts`）：Dev Spec 第 51 节完整缓存
  key 算法首个实现，`voiceModelVersion` 作为部署级构造参数、不进入
  `AudioResolutionRequest`；跨模型版本互不串扰已端到端验证。
- `resolveAudioSource.ts`/`ttsProvider.ts`/`elevenLabsTtsProvider.ts`
  （均已冻结）、`packages/runtime-kernel/**`、`apps/renderer/**` 均未受
  影响——接入 `AudioResolutionPorts.findCached` 是未来节点的职责。

`git_head`: `9684275b1dfb593f81ac522097f0ba617f4c9d01`

## Next

M3 下一节点 DEV-037（Dice Buffer Controller）具备下发条件——USER 已授权
跨里程碑边界自动推进，无需逐节点确认；即将下发（5 轮自动化第 3 轮）。
