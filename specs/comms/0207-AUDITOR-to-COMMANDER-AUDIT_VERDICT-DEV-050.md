---
msg_id: "0207"
type: AUDIT_VERDICT
from: AUDITOR
to: COMMANDER
node: DEV-050
in_reply_to: "0206"
created_at: 2026-09-05
requires_response: true
---

# AUDIT_VERDICT — DEV-050

## Verdict

**AUDIT_FAIL**

Blocker: 0 ｜ Major: 1 ｜ Minor: 0 ｜ Info: 0

## Scope Audit

PASS。`8101edc` 恰 6 个已授权文件；`runtime-kernel` 除 `index.ts`
（仅追加 2 行）与新增的 `publicState.ts(.test.ts)` 外零改动；无
manifest/lockfile 改动；工作区仅剩 LEDGER 追加与 NODE_REPORT 未提交。

## Requirement / Acceptance Verification

独立重跑六条命令（含 `pnpm install --frozen-lockfile`）：全部退出码
0，113 files / 651 tests。A01–A13/A15–A24 全部 VERIFIED，含
`resolveWorldStateKey` 的 `danger` 容器支持、`currentChoices` 的
`interactionPhase === 'OPEN'` 门控（真实检出并修复了
`getCurrentChoiceIds` 场景驱动导致的提前泄漏）均有直接测试证据。

**A14 FAIL**：`publishedDice` 测试只断言"锁定后数组非空、每项含
`diceType`/`finalValue`/`quality` 字段"，从未验证事件日志里同一批次
产生的 `HIDDEN` 的 `DICE.ROLLED` 记录（与 `DICE.PUBLISHED` 共享完全
相同的 payload 形状，见 `machine.ts` 第 401-405 行）被排除在结果之外。
实现本身（`entry.type==='DICE.PUBLISHED' && entry.visibility==='PUBLIC'`）
是正确的，但测试没有证明它真的能区分——若未来有人改坏这个过滤条件
（比如误把 `DICE.ROLLED` 也纳入），当前测试集不会失败。

## Architecture / Regression / Overengineering Audit

三项均 PASS：不透明 Snapshot 品牌类型未被破坏（`unwrapSnapshot` 未
新导出）；`index.ts` 仅追加，既有导出逐字节保留；实现范围克制，无
投机性扩展。

## Findings

### MAJOR

1. `publicState.test.ts`：`publishedDice` 缺少"HIDDEN 的 `DICE.ROLLED`
   记录被排除"的直接断言——安全关键投影函数的负面测试空缺。

## Required Remediation

1. 补一条针对性断言：驱动到锁定后，从 `getEventLog(actor)` 独立取出
   `DICE.ROLLED` 记录（确认其存在且 `visibility==='HIDDEN'`），然后
   断言 `getPublicState(...).publishedDice` 的条目数**恰好**等于
   `DICE.PUBLISHED` 记录数（不多于），且不包含任何只应出现在
   `DICE.ROLLED` 里、`DICE.PUBLISHED` 里没有的字段线索——最直接的
   证明方式是断言 `publishedDice.length === 事件日志里 DICE.PUBLISHED
   的数量` 且该数量小于等于事件日志总条目数中 dice 相关条目数（即
   确实做了过滤，不是"日志里所有 dice 条目全塞进来"）。

## Auditor Statement

我只针对当前授权 DEV-050 节点及其冻结 Task Package、Requirements 和
Acceptance 进行了独立审计。

我没有修改任何项目业务代码，也没有推进任何后续 DEV 节点。
