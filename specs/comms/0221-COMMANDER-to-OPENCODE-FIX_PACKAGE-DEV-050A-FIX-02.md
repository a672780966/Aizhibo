---
msg_id: "0221"
type: FIX_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-050A
in_reply_to: "0220"
created_at: 2026-09-05
requires_response: true
---

# FIX_PACKAGE — DEV-050A-FIX-02

## 背景

`AUDIT_VERDICT`（消息 `0219`）：AUDIT_FAIL，1 Major，采纳。FIX-01
里补的"`lastIndex` 回归测试"经审计逐字符核算，两段测试文本里
`badword` 的命中位置恰好都不早于遗留 `lastIndex`（21），导致测试
即使在撤销修复后也会"巧合通过"，不构成有效回归证明。修复代码本身
（`pattern.lastIndex = 0`）没有问题，只需要重新构造测试文本。

## 修复范围

### FIX-1（唯一修复项）—— 重新构造 `lastIndex` 回归测试文本

在 `packages/ai-host/src/egressGate.test.ts` 里，找到测试
`'C3: a stateful global regex correctly drops the same forbidden text on consecutive attempts (regression for DEV-050A-FIX-01)'`，
把其中的两段文本换成下面这两段（已经过逐字符核算，能真正区分
"修复生效"与"修复被撤销"）：

```typescript
const pattern = /badword/g;
const gate = createEgressGate(baseConfig({ platformDenylist: [pattern] }));

// 第一段：'badword' 出现在索引 21-27（'aaaaaaaaaaaaaaaaaaaa badword' ——
// 20 个 'a' + 1 个空格 + 'badword'），匹配后 lastIndex 变为 28。
const first = gate.attempt({
  text: 'aaaaaaaaaaaaaaaaaaaa badword',
  sceneId: 'scene-x',
  permission: 'ALLOWED',
});
expect(first).toEqual({
  decision: 'DROP',
  rule: 'PLATFORM_DENYLIST',
  matchedTerm: 'badword',
});

// 第二段：'badword' 出现在索引 0-6（字符串开头），远早于遗留的
// lastIndex=28；末尾填充一段不含 'badword' 的字符，确保从索引 28
// 往后搜索绝对找不到任何命中。若修复被撤销（不重置 lastIndex），
// 从 28 往后搜索这段文本会找不到开头的 'badword'，从而错误地判定
// 未命中 → ALLOW（暴露 bug）；修复生效时会重置到 0，正确找到并
// DROP。
const second = gate.attempt({
  text: 'badword zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
  sceneId: 'scene-x',
  permission: 'ALLOWED',
});
expect(second).toEqual({
  decision: 'DROP',
  rule: 'PLATFORM_DENYLIST',
  matchedTerm: 'badword',
});
```

验证方式：实施后，临时把 `egressGate.ts` 里的
`pattern.lastIndex = 0;` 那一行注释掉，重新跑这条测试，确认它会
**失败**（`second` 变成 `{decision:'ALLOW'}` 而不是预期的 DROP）；
确认后恢复那一行，重新跑测试确认通过。这一步是自我验证，不要把
注释掉的状态提交。

不得修改除这一条测试之外的任何测试，不得修改 `egressGate.ts` 实现
代码（FIX-01 已经修复正确，本轮只是测试文本问题）。

## Scope

### Writable Scope

```
packages/ai-host/src/egressGate.test.ts   （仅替换这一条测试内的两段文本，不改其余任何测试）
specs/dev/DEV-050A/REPORT.md、DECISIONS.md、INDEX.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Forbidden Scope

```
修改 packages/ai-host/src/egressGate.ts（实现代码本身，本轮不改）
修改/删除既有其余测试的任何断言
```

## Task Breakdown

### FIX-T001 — 替换测试文本 + 自我验证 + 全量验证 + REPORT/DECISIONS 更新 + commit

- 按 FIX-1 实施，含"临时注释修复行验证测试会失败"的自我验证步骤
  （验证后不提交该临时改动）。
- 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、
  `pnpm format:check`、`pnpm build`、`pnpm test`，全部退出码 0，既有
  全部测试零回归。
- `DECISIONS.md` 追加一条，说明 FIX-01 的回归测试为何无效（两段
  文本的命中位置选取不当）与本轮的正确构造方式（逐字符核算的索引
  关系）。
- 更新 `REPORT.md`：追加 FIX-02 轮次说明。
- `git add`（仅本 FIX Writable Scope 内文件）`&& git commit`，提交
  信息首行：
  `DEV-050A-FIX-02: fix ineffective lastIndex regression test`。
  **恰 1 条提交**。
- 追加 LEDGER 行、写好 NODE_REPORT 消息文件——都不要提交，只写入
  工作区。
- **STOP**。

## Acceptance

| # | 判定 |
|---|---|
| FIX-A01 | 六条命令全部退出码 0，既有全部测试零回归 |
| FIX-A02 | 新测试文本经核算能真正区分修复前后（临时撤销修复行会让测试失败，恢复后通过） |
| FIX-A03 | 未修改 `egressGate.ts` 实现代码，未修改其余既有测试 |
| FIX-A04 | `git log` 新增恰 1 条提交，首行 `DEV-050A-FIX-02: fix ineffective lastIndex regression test` |
