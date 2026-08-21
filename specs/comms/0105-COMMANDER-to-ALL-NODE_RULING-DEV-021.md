---
msg_id: "0105"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-021
in_reply_to: "0104"
created_at: 2026-08-21
requires_response: false
---

# NODE_RULING — DEV-021

```yaml
ruling: PASS
verdict_ref: "0104"
```

## Finding Disposition

### DEVIATION-01（DEVIATION）— 接受并说明，不影响裁决

`specs/dev/DEV-021/INDEX.md` 第 3 行 `Status:` 表头仍写 `IN_PROGRESS`，与文件内「Current Task」
章节及 LEDGER/REPORT.md 已一致确认的 `READY_FOR_REVIEW` 实际状态不符。未向 Commander/Auditor
误传节点真实状态（LEDGER 与 REPORT.md 均正确，独立审计据此判定不受影响），纯 OpenCode 可写文档
内表头字段的维护疏漏。本轮裁决随即由 Commander 一并更正该字段为 `DONE`，不发 FIX_PACKAGE。

### OBSERVATION-01（OBSERVATION）— 接受并说明，不影响裁决

`NODE_REPORT`（消息 0103）信封 `changed_files_count: 15` 与提交 `d797f02` 实际 13 个文件不一致，
推测计入了随后落入治理提交的 2 个通信产物。REPORT.md 内真实 Changed Files 列表准确，不构成缺陷。

### OBSERVATION-02（OBSERVATION）— 接受并说明，不影响裁决

审计开始时工作区已存在的 `LEDGER.md`/`0103-...md` 未跟踪状态，符合协议既定流程，非审核员引入，
不影响被审计提交本身。

## 节点新状态

`READY_FOR_REVIEW` → **`DONE`，接口冻结**。

`packages/runtime-kernel` 本轮变更：`onSceneEnter` action 的 `SCENE_ENTER` 命令载荷 Change
Request 自本裁决起冻结（`{ kind, sceneId, visualSceneId, layers }`）；新增导出
`resolveVisualLayers`（`visualResolution.ts`）连同其两跳解析与防御性处理语义一并冻结。
`apps/renderer` 新增 `composeLayers`（`z` 升序排序、`zIndex` 映射、`parallax` 透传）冻结为
可复用渲染层工具。DEV-009/012 既有冻结接口（除 `onSceneEnter` 载荷本身经授权 CR 丰富外）未受
影响、未改动；DEV-020 冻结的 renderer Shell 接口（`createWebSocketPresentationPort`/
`detectSeqGap`/`createRendererClient`/`SocketLike`）未受影响。后续如需变更，按协议须走
`CHANGE_REQUEST` 并上报 `USER`。

`git_head`：`d797f02`。

## 下一步

按 `DAG.md` 第二施工组（M2 — Presentation Complete）顺序，DEV-021 PASS 后下一节点为
DEV-022（Character Renderer，固定五档 slot 站位，ADDENDUM §A9）。`COMMANDER` 将在后续起草其
`TASK_PACKAGE`。

本轮无需 Executor 立即行动，暂不输出交接块。
