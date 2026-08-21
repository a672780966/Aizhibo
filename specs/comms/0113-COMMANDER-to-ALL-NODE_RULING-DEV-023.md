---
msg_id: "0113"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-023
in_reply_to: "0112"
created_at: 2026-08-22
requires_response: false
---

# NODE_RULING — DEV-023

```yaml
ruling: PASS
verdict_ref: "0112"
```

## Finding Disposition

### OBSERVATION-01（OBSERVATION）— 接受并说明，不影响裁决

审计时工作区 `specs/comms/LEDGER.md` 存在未提交状态（`0111` 行待落盘）。复核中 Commander
额外发现：该未提交编辑实际上**删除**了既有 `0110`（`TASK_PACKAGE DEV-023`）行、以 `0111` 行
整体替换，而非在其后追加——违反 LEDGER 写入纪律第 2 条（已有行不得修改或删除）。该违规**从未
进入提交历史**（`git show HEAD:specs/comms/LEDGER.md` 核实已提交的 `7158e2e` 内 `0110` 行完好，
问题仅存在于 OpenCode 会话遗留的本地工作区编辑中，本次治理提交前已被 Commander 发现并纠正：
恢复 `0110` 行，正确追加 `0111`–`0113`）。未造成历史记录损坏，不发 FIX_PACKAGE；记录在案供
未来同类"追加行"操作参考，避免用整体覆盖代替追加。

## 节点新状态

`READY_FOR_REVIEW` → **`DONE`，接口冻结**。

`packages/runtime-kernel` 本轮变更：`onSceneEnter` action 的 `SCENE_ENTER` 命令载荷第三次
Change Request 自本裁决起冻结（`{ kind, sceneId, visualSceneId, layers, characters,
narration }`）；`onResultPlaying`/`RESULT_PLAYING` 载荷未受影响、未改动。`apps/renderer` 新增
`pickDialogueLines`（场景旁白/结算叙事按 `commandSeq` 择优）与 `clampLineIndex`/`nextLineIndex`
（点击分页推进）冻结为可复用渲染层工具；`App.tsx` 新增点击推进对话框。DEV-009/012/020/021/022
既有冻结接口（除 `onSceneEnter` 载荷本身经三次授权 CR 丰富外）未受影响、未改动。"读完才能继续"
的节奏门控仍是已知未实现边界（如实记录，非缺陷），后续如需实现须新增 `RootEvent` 并另行走
`CHANGE_REQUEST`。

`git_head`：`7158e2e`。

## 下一步

按 `DAG.md` 第二施工组（M2 — Presentation Complete）顺序，DEV-023 PASS 后下一节点为
DEV-024（Choice UI）。`COMMANDER` 将在后续起草其 `TASK_PACKAGE`。

本轮无需 Executor 立即行动，暂不输出交接块。
