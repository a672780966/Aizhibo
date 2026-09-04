---
msg_id: "0209"
type: FIX_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-050
in_reply_to: "0208"
created_at: 2026-09-05
requires_response: true
---

# FIX_PACKAGE — DEV-050-FIX-01

## 背景

`AUDIT_VERDICT`（消息 `0207`）：AUDIT_FAIL，F-01（MAJOR，采纳）：
`publicState.test.ts` 里"锁定后 `publishedDice` 反映骰子结果"的测试
只断言数组非空、每项字段形状正确，从未证明 `HIDDEN` 的
`DICE.ROLLED` 记录（与 `DICE.PUBLISHED` 共享完全相同的 payload 形状，
`machine.ts` 第 401-405 行）被正确排除在外。

## 修复范围

### FIX-1（对应 F-01，MAJOR）—— 补充 `publishedDice` 排除 HIDDEN 记录的直接断言

在现有测试
`'publishedDice is undefined before any dice roll, and reflects the
roll after vote resolution'`（`packages/runtime-kernel/src/publicState.test.ts`）
锁定后的断言部分，追加：

1. 独立调用 `getEventLog(actor)`，过滤出 `type === 'DICE.ROLLED'` 的
   记录，断言其存在（`length > 0`）且每条 `visibility === 'HIDDEN'`
   （证明测试场景确实产生了 Hidden 记录，不是"根本没有可排除的东西"
   的假阳性）。
2. 再过滤出 `type === 'DICE.PUBLISHED'` 的记录，断言
   `state.publishedDice!.length === rolledEntries.length` 这个数字
   同时等于 `publishedEntries.length`（三者相等，证明一一对应、没有
   多算或漏算）。
3. 额外断言 `state.publishedDice` 的条目数**不等于**事件日志里全部
   dice 相关条目（`DICE.REQUESTED`+`DICE.ROLLED`+`DICE.PUBLISHED`）
   的总数——如果实现退化成"不过滤，把所有 dice 条目都塞进结果"，
   这条断言必须失败（用来防止"过滤条件被误删/改坏"的回归）。

不得修改测试 1-5、`isFactSafeToDisclose` 的 15 条测试，以及
`publicState.ts` 的任何实现代码（本轮只补测试，不改实现——实现本身
审计已确认正确）。

## Scope

### Writable Scope

```
packages/runtime-kernel/src/publicState.test.ts   （仅追加断言，不改其余既有测试）
specs/dev/DEV-050/REPORT.md、DECISIONS.md、INDEX.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Forbidden Scope

```
修改 packages/runtime-kernel/src/publicState.ts（实现代码本身，本轮不改）
修改/删除 publicState.test.ts 中既有的任何断言（只能新增）
其余同原 Task Package 第 3 节 Forbidden Scope 全部条目
```

## Task Breakdown

### FIX-T001 — 补测试 + 全量验证 + REPORT/DECISIONS 更新 + commit

- 按上方 FIX-1 实施。
- 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、
  `pnpm format:check`、`pnpm build`、`pnpm test`，全部退出码 0，既有
  全部测试零回归。
- `DECISIONS.md` 追加一条，说明 F-01 根因（测试只验证形状未验证
  排除性）与修复方式（三段式断言：HIDDEN 记录确实存在 + 数量一一
  对应 + 不等于未过滤总数）。
- 更新 `REPORT.md`：追加 FIX 轮次的 Acceptance Results（A14 由 FAIL
  改 PASS 并给出新证据）。
- `git add`（仅本 FIX Writable Scope 内文件）`&& git commit`，提交
  信息首行：`DEV-050-FIX-01: prove publishedDice excludes HIDDEN dice-rolled records`。
  **恰 1 条提交**。
- 追加 LEDGER 行、写好 NODE_REPORT 消息文件——都不要提交，只写入
  工作区。
- **STOP**。

## Acceptance

| # | 判定 |
|---|---|
| FIX-A01 | 六条命令全部退出码 0，既有全部测试零回归 |
| FIX-A02 | 新断言证明 `DICE.ROLLED`（HIDDEN）确实存在且被排除，`publishedDice` 数量与 `DICE.PUBLISHED` 数量一一对应 |
| FIX-A03 | 新断言证明"不等于未过滤 dice 条目总数"（防止过滤条件被改坏的回归哨兵） |
| FIX-A04 | 未修改 `publicState.ts` 实现代码，未修改既有测试断言 |
| FIX-A05 | `git log` 新增恰 1 条提交，首行 `DEV-050-FIX-01: prove publishedDice excludes HIDDEN dice-rolled records` |
