---
msg_id: "0125"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-025
in_reply_to: "0124"
created_at: 2026-08-22
requires_response: false
---

# NODE_RULING — DEV-025（第二轮，最终裁决）

```yaml
ruling: PASS
verdict_ref: "0124"
```

## Finding Disposition

### OBSERVATION-01（第二轮）— 接受并说明，不影响裁决

`VERDICT.md` 保留首轮 BLOCKING-01 的错误论证原文作为审计历史引述，属预期且正确的审计
留痕纪律（不篡改历史记录），不构成问题。

## 节点新状态

`FIX_REQUIRED` → `IN_PROGRESS`（FIX-01 施工）→ `READY_FOR_REVIEW`（二轮）→ `AUDITED`
→ **`DONE`，接口冻结**。

`packages/runtime-kernel` 本轮变更（含首轮 + FIX-01）：INTERACTION region 两处窄范围
Change Request 自本裁决起冻结——`onLock` 追加 `DICE_INTRO` 纯信号；`onResolve` 追加
`DICE_RESULT`（显式五字段白名单：`diceType`/`rawValue`/`modifier`/`finalValue`/
`quality`）。`apps/renderer` 新增 `pickDiceState`（INTRO/RESOLVE/IDLE 三态选择）冻结为
可复用渲染层工具；`App.tsx` 新增 INTRO→LOOP（本地视觉过渡）→RESOLVE 三阶段骰子 UI。
`specs/dev/DEV-025/REQUIREMENTS.md` §2.2 与 `DECISIONS.md` D2 的安全论证已按 FIX-01
更正为准确表述，成为未来节点（尤其 DEV-037）的权威参考。DEV-009/012/020/021/022/023/024
既有冻结接口未受影响、未改动。

`git_head`：`4c2ed0a`。

## 遗留事项（记入 Future Consideration，非本节点缺陷）

- OBSERVATION-01（首轮）：既有（Read-only、DEV-009 起冻结）的 `DICE.PUBLISHED` 事件
  在 PUBLIC 标记下携带 `seed`/`appliedModifiers` 的架构不一致，留待未来 CR 或 DEV-037
  起草时一并评估是否需要在源头（`machine.ts:349-352`）也做裁剪，而不仅在 Presentation
  出口手写白名单兜底。

## 下一步

按 `DAG.md` 第二施工组（M2 — Presentation Complete）顺序，DEV-025 PASS 后下一节点为
DEV-026（Camera / Transition，仅 preset 键映射，不做镜头 DSL）。`COMMANDER` 将在后续
起草其 `TASK_PACKAGE`。

本轮无需 Executor 立即行动，暂不输出交接块。
