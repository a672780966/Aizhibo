---
msg_id: "0210"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-050
in_reply_to: "0209"
created_at: 2026-09-05
requires_response: true
git_head: 15b819fb14b8a7b3217606accb1ecfefa937a824
changed_files_count: 3
commands_run: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-050-FIX-01

DEV-050-FIX-01（AUDIT F-01 MAJOR 修复）完成，`READY_FOR_REVIEW`。

F-01 裁决见 `AUDIT_VERDICT`（0207）：`publishedDice` 测试只断言结果
非空 + 字段形状正确，**从未证明 HIDDEN 的 `DICE.ROLLED` 记录被排除
在结果之外**——而 `DICE.ROLLED` 与 `DICE.PUBLISHED` 共享完全相同的
payload 形状（`DiceRollRecordPayload`，`machine.ts` 第 401–405 行），
仅 `type`/`visibility` 不同；若实现退化成"不过滤，把所有 dice 条目
全塞进 `publishedDice`"，初版测试照样全部通过。实现代码审计确认
正确，缺口在测试未锁定排除行为。

## 修复内容

`packages/runtime-kernel/src/publicState.test.ts` 目标测试
`'publishedDice is undefined before any dice roll, and reflects the
roll after vote resolution'` 尾部追加三段式断言（零删除零改动既有
断言，未新增测试用例）：

1. **HIDDEN 记录确实存在**：`getEventLog(actor)` 过滤
   `type === 'DICE.ROLLED'` → `length > 0` 且每条
   `visibility === 'HIDDEN'`——证明测试场景真的产生了需被排除的
   Hidden 记录，排除行为不是假阳性。
2. **数量一一对应**：`state.publishedDice!.length ===
   rolledEntries.length === publishedEntries.length`——三数相等，
   无多算（混入 ROLLED）/漏算（丢掉 PUBLISHED）。
3. **回归哨兵**：`state.publishedDice!.length` < 全部 `DICE.*` 条目
   （`DICE.REQUESTED`+`DICE.ROLLED`+`DICE.PUBLISHED`）总数——若未来
   过滤条件被误删/改坏，此断言必失败。

## 交付快照

- `git_head`: `15b819fb14b8a7b3217606accb1ecfefa937a824`
- Changed Files（3，与实现提交一致）：
  - `packages/runtime-kernel/src/publicState.test.ts`（追加三段式
    断言，既有断言零改动）
  - `specs/dev/DEV-050/DECISIONS.md`（追加 D7：F-01 根因 + 修复方式）
  - `specs/dev/DEV-050/REPORT.md`（追加 FIX-01 轮次 + A14 FAIL→PASS）
- **`publicState.ts` 实现代码零改动**（审计确认实现正确，本轮只补
  测试）。
- 六条命令全部退出码 0；`pnpm test` 113 files / **651 tests**
  （无新增用例，仅既有测试内追加断言，计数与主交付一致），零回归。

## Acceptance Results 摘要

FIX-A01（六命令全 0，零回归）PASS；FIX-A02（HIDDEN DICE.ROLLED 确实
存在且被排除，publishedDice 与 DICE.PUBLISHED 数量一一对应）PASS；
FIX-A03（不等于未过滤 dice 条目总数的回归哨兵）PASS；FIX-A04（未改
`publicState.ts` 实现，未改既有测试断言）PASS——交付 diff 仅测试
文件追加 + 两份文档；FIX-A05（恰 1 条提交 `15b819f`，首行
`DEV-050-FIX-01: prove publishedDice excludes HIDDEN dice-rolled
records`）PASS。原 A14 由 FAIL 改 PASS（新证据见 REPORT.md FIX-01
轮次）。

## 请 AUDITOR 核验

请 AUDITOR 以该 `git_head` 独立核验 FIX-A01–A05，重点复核三段式断言
是否真实证明排除行为、是否可作为过滤条件回归的哨兵。
