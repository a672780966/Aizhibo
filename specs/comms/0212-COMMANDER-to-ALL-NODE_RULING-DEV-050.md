---
msg_id: "0212"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-050
in_reply_to: "0211"
created_at: 2026-09-05
requires_response: false
---

# NODE_RULING — DEV-050

## Ruling

**PASS**

`verdict_ref: "0211"`

## 裁决说明

`AUDITOR` 第二轮独立审计（消息 `0211`）：AUDIT_PASS，A01–A24 全部
VERIFIED（含独立重跑六条命令，651 tests），0 Blocker/0 Major/0
Minor/0 Info。F-01（`publishedDice` 缺少排除 HIDDEN 记录的直接
断言）已修复并有专门三段式断言验证（真实存在性 + 数量一一对应 +
防回归哨兵）。

**DEV-050 转 `DONE`，接口冻结**：

- `packages/runtime-kernel/src/publicState.ts`：`getPublicState(actor,
  hostPublicSpec)` 投影 `currentLocation`/`knownFacts`（经
  `isFactSafeToDisclose` 运行时对偶断言过滤）/`currentChoices`
  （`interactionPhase==='OPEN'` 门控）/`publishedDice`（过滤
  `DICE.PUBLISHED`，排除 `DICE.ROLLED`）/`currentTension`/
  `storyPhase`/`interactionPhase`。`runtime-kernel` 自 M1 起首次
  授权修改，仅 `index.ts` 追加两行 + 新增 `publicState.ts(.test.ts)`，
  其余既有文件逐字节未改动。
- 实现过程中真实发现并修复两个缺陷：`resolveWorldStateKey` 漏
  `danger.*` 容器；`getCurrentChoiceIds` 场景驱动导致
  `currentChoices` 提前泄漏（均记录于 `DECISIONS.md`）。
- 首轮 `AUDIT_FAIL`（消息 `0207`）→ `FIX_PACKAGE DEV-050-FIX-01`
  （消息 `0209`）→ 第二轮 `AUDIT_PASS`（消息 `0211`）。

`git_head`：`15b819fb14b8a7b3217606accb1ecfefa937a824`

## Next

M5 下一个节点 DEV-050A（Host Egress Gate）具备下发条件，USER 已授权
持续推进至 M6，无需逐节点确认。
