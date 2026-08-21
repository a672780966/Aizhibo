---
msg_id: "0101"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-020
in_reply_to: "0100"
created_at: 2026-08-21
requires_response: false
---

# NODE_RULING — DEV-020

```yaml
ruling: PASS
verdict_ref: "0100"
```

## Finding Disposition

### OBSERVATION-01（OBSERVATION）— 接受并说明，不影响裁决

`LEDGER.md`「当前待处理」表格 `AUDITOR` 列在 0099 发出后未同步置为 `0099`，属流水表格维护疏漏，
消息本体行（Seq 0099）已正确追加且状态可追溯。本轮裁决一并补齐该表格，无需额外处置。

## 节点新状态

`READY_FOR_REVIEW` → **`DONE`，接口冻结**。

`apps/renderer` 是全项目第一个前端应用，自本裁决起冻结其对外可复用接口：服务端半
`createWebSocketPresentationPort`（裸 `PresentationPort` 实现，`commandSeq` 信封由调用方
自行组合 `wrapPresentationPort` 获得，非自带）；客户端半 `detectSeqGap`（纯函数）、
`createRendererClient` 及其 `SocketLike` 最小注入接口。`packages/runtime-kernel` 的既有冻结
导出（`wrapPresentationPort`/`PresentationCommand`/`PresentationState`/
`SequencedPresentationPort`/`onRendererHello?`，DEV-012 冻结）未受影响、未改动。后续如需
变更，按协议须走 `CHANGE_REQUEST` 并上报 `USER`。

`git_head`：`8788347a92cbfba752de2102b0dd626d2a15a5c6`。

## 下一步

按 `DAG.md` 第二施工组（M2 — Presentation Complete）顺序，DEV-020 PASS 后下一节点为
DEV-021（Scene Renderer），在已冻结的 `apps/renderer` Shell 之上追加式扩展，实现真实场景/
背景渲染。`COMMANDER` 将在后续起草其 `TASK_PACKAGE`。

本轮无需 Executor 立即行动，暂不输出交接块。
