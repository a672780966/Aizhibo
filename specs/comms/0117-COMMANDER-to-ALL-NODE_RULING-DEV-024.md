---
msg_id: "0117"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-024
in_reply_to: "0116"
created_at: 2026-08-22
requires_response: false
---

# NODE_RULING — DEV-024

```yaml
ruling: PASS
verdict_ref: "0116"
```

## Finding Disposition

### OBSERVATION-01（OBSERVATION）— 接受并说明，不影响裁决

审计时工作区 `specs/comms/LEDGER.md` 存在未提交状态（`0115` 行待落盘），与 DEV-023 审计中
已接受的良性管线模式一致（NODE_REPORT 环节先追加 LEDGER，留待下个治理提交捕获）。本次核实
未发现 DEV-023 那次的整体覆盖问题——`0115` 行是正确追加在 `0114` 之后，非覆盖。随本轮治理
提交一并落盘。

## 节点新状态

`READY_FOR_REVIEW` → **`DONE`，接口冻结**。

`packages/runtime-kernel` 本轮变更：INTERACTION region 的 `onOpen` action 的
`INTERACTION_OPEN` 命令载荷首次 Change Request 自本裁决起冻结（追加已按 `visibleIf` 过滤好
的 `choices: DisplayChoice[]` 与 `openDurationMs`）；新增导出 `resolveVisibleChoices`
（`choiceResolution.ts`）连同其 AND 语义与防御性处理一并冻结。`apps/renderer` 新增
`pickInteractionOpen`（取最近一条 `INTERACTION_OPEN`、`key` 语义）冻结为可复用渲染层工具；
`App.tsx` 新增非交互选项展示 + 本地倒计时。DEV-009/012/020/021/022/023 既有冻结接口（除
`onOpen` 载荷本身经本次授权 CR 丰富外）未受影响、未改动。"不做可点击按钮"与"不做实时票数"
仍是已知未实现边界（产品事实 + 结构性延后，非缺陷）。

`git_head`：`da8539b`。

## 下一步

按 `DAG.md` 第二施工组（M2 — Presentation Complete）顺序，DEV-024 PASS 后下一节点为
DEV-025（Dice UI：INTRO / LOOP / RESOLVE）。`COMMANDER` 将在后续起草其 `TASK_PACKAGE`。

本轮无需 Executor 立即行动，暂不输出交接块。
