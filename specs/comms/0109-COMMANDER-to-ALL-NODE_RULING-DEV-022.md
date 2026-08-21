---
msg_id: "0109"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-022
in_reply_to: "0108"
created_at: 2026-08-21
requires_response: false
---

# NODE_RULING — DEV-022

```yaml
ruling: PASS
verdict_ref: "0108"
```

## Finding Disposition

### DEVIATION-01（DEVIATION）— 接受并说明，不影响裁决

`specs/dev/DEV-022/INDEX.md` 第 3 行 `Status:` 表头仍写 `IN_PROGRESS`，与文件内「Current Task」
章节及 LEDGER/REPORT.md 已一致确认的 `READY_FOR_REVIEW` 实际状态不符。未向 Commander/Auditor
误传节点真实状态（LEDGER 与 REPORT.md 均正确，独立审计据此判定不受影响），纯 OpenCode 可写文档
内表头字段的维护疏漏，与 DEV-021 审计（0104）同类问题。本轮裁决随即由 Commander 一并更正该字段
为 `DONE`，不发 FIX_PACKAGE。

### OBSERVATION-01（OBSERVATION）— 接受并说明，不影响裁决

A19 是通过独立的 `0107-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-022.md` 消息文件（`git_head` 与
HEAD 一致）满足的，而非已提交的 `LEDGER.md` 表格行——该行随本轮治理提交一并补入。与 DEV-021
先例（`d797f02`/`371999b`）完全一致，非新增或独有偏差。

### OBSERVATION-02（OBSERVATION）— 接受并说明，不影响裁决

REPORT.md 中 `Scope Deviations` §1、§2（`machine.ts` 1 行 import；`pickSceneCharacters` 测试
落点）经独立核实均准确、必要，与 DEV-021 D7/D8 先例一致，不构成缺陷。

## 节点新状态

`READY_FOR_REVIEW` → **`DONE`，接口冻结**。

`packages/runtime-kernel` 本轮变更：`onSceneEnter` action 的 `SCENE_ENTER` 命令载荷第二次
Change Request 自本裁决起冻结（`{ kind, sceneId, visualSceneId, layers, characters }`）；新增
导出 `resolveCharacterPlacements`（`characterResolution.ts`）连同其三跳解析与防御性处理语义一并
冻结。`apps/renderer` 新增 `composeCharacters`（五档 slot → leftPercent 固定映射、不可见过滤、
animated 布尔判定）冻结为可复用渲染层工具；`App.tsx` 新增角色 `<img>` 渲染组（`zIndex: 1000`
固定高于背景层）。DEV-009/012/020/021 既有冻结接口（除 `onSceneEnter` 载荷本身经两次授权 CR
丰富外）未受影响、未改动。后续如需变更，按协议须走 `CHANGE_REQUEST` 并上报 `USER`。

`git_head`：`2909967`。

## 下一步

按 `DAG.md` 第二施工组（M2 — Presentation Complete）顺序，DEV-022 PASS 后下一节点为
DEV-023（Subtitle / Dialogue）。`COMMANDER` 将在后续起草其 `TASK_PACKAGE`。

本轮无需 Executor 立即行动，暂不输出交接块。
