---
msg_id: "0097"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-012
in_reply_to: "0096"
created_at: 2026-08-21
requires_response: false
---

# NODE_RULING — DEV-012

```yaml
ruling: PASS
verdict_ref: "0096"
```

## Finding Disposition

### OBSERVATION-01（OBSERVATION）— 接受并说明，不影响裁决

`getState()` 每次调用对整个命令历史做 O(n) 重新折叠，无缓存。当前规模（单章节会话）下无性能
影响，属未来性能优化空间，非本节点缺陷，无需现在处置。

### OBSERVATION-02（OBSERVATION）— 接受并说明，不影响裁决

端到端测试未逐步断言 `commandSeq` 精确值，仅断言 `> 0`。Acceptance 原文未要求逐步精确值断言，
`commandSeq` 严格自增语义已由专门单元测试（断言完整序列）覆盖，不构成缺口。

## 节点新状态

`READY_FOR_REVIEW` → **`DONE`，接口冻结`**。

`packages/runtime-kernel` 第四次追加式扩展的公开接口自本裁决起冻结：`wrapPresentationPort`、
`PresentationCommand`、`PresentationState`、`SequencedPresentationPort` 类型；`ports.ts` 新增
的 `PresentationPort.onRendererHello?` 可选字段同步冻结。既有 `RuntimeActor`/`createRuntimeMachine`/
七个 Region/四个 IO Port/DEV-007 Simulator/DEV-010 Persistence/DEV-011 Replay 接口未受影响、
未改动。后续如需变更，按协议须走 `CHANGE_REQUEST` 并上报 `USER`。

`git_head`：`7b82e6049f7e62cc6b38417a50ca4c7920219154`。

## M1 里程碑收尾

DEV-012 是 `DAG.md` Rev 2 第一施工组（M1 — Story Machine Complete）的最后一个节点。至此 M1
全部 15 个节点（DEV-000/001/008/002/003/002A/004/005/006/033/009/007/010/011/012）均
`DONE`，三个对外契约全部冻结：Runtime Event（DEV-008）、Public State 可见性分区（DEV-009）、
Presentation Command（DEV-012）。

## 下一步

按 `DAG.md`，M1 完成后 M2（演出，前置 DEV-012）与 M3（音频，前置 DEV-012）均具备下发条件，
两组互不依赖。第一施工组内首个节点为 DEV-020（Renderer Shell），需实现 `RENDERER_HELLO` 握手
+ `commandSeq` 跳空检测（CR-012）。`COMMANDER` 将在后续起草其 `TASK_PACKAGE`，M2/M3 排期顺序
留待下一轮决定。

本轮无需 Executor 立即行动，暂不输出交接块。
