---
msg_id: "0217"
type: FIX_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-050A
in_reply_to: "0216"
created_at: 2026-09-05
requires_response: true
---

# FIX_PACKAGE — DEV-050A-FIX-01

## 背景

`AUDIT_VERDICT`（消息 `0215`）：AUDIT_FAIL，1 Blocker + 2 Major，
全部采纳。

## 修复范围

### FIX-1（对应 F-01，BLOCKER）—— C3 正则确定性修复

`packages/ai-host/src/egressGate.ts` 的 C3 检查：

```typescript
for (const pattern of platformDenylist) {
  if (pattern.test(input.text)) {
    return { decision: 'DROP', rule: 'PLATFORM_DENYLIST', matchedTerm: pattern.source };
  }
}
```

问题：调用方传入的正则若带 `g`/`y` 标志，`.test()` 会推进该正则
实例的 `lastIndex`，导致同一实例连续两次对同一段违规文本调用可能
得到不同结果（第一次命中，`lastIndex` 前移到字符串末尾后第二次
同样文本反而"未命中"，构成绕过）。

**修复**：在每次 `.test()` 调用前无条件重置
`pattern.lastIndex = 0;`（对没有 `g`/`y` 标志的正则，赋值这个属性
本身没有任何副作用，统一处理最安全，不需要分支判断标志位）：

```typescript
for (const pattern of platformDenylist) {
  pattern.lastIndex = 0;
  if (pattern.test(input.text)) {
    return { decision: 'DROP', rule: 'PLATFORM_DENYLIST', matchedTerm: pattern.source };
  }
}
```

### FIX-2（对应 F-01，回归测试）

新增测试：用一个带 `g` 标志的正则（如 `/badword/g`）连续两次对
**完全相同**的违规文本调用 `attempt()`（用两个独立的 gate 实例，
每个实例各自 new 一次同一个 pattern 变量传入，或同一 gate 实例但
两次都是新文本+相同违规词以规避 C4 去重——用不同的 `sceneId`/文本
前缀避开 C4，只让 C3 成为变量），断言**两次都是** `DROP` +
`PLATFORM_DENYLIST`（证明 `lastIndex` 被正确重置，不会因为上一次
调用的副作用而在第二次漏判）。

### FIX-3（对应 F-02，MAJOR）—— 补 A13 完整覆盖

新增/扩展测试：先用 `permission:'MUTED'` 让某段文本被 DROP
（PERMISSION 规则），然后用**完全相同**的文本+`permission:'ALLOWED'`
再次尝试，断言这次是 **ALLOW**（不是 DROP DUPLICATE）——证明第一次
被 MUTED 丢弃的文本没有进入 C4 重复历史缓冲。

### FIX-4（对应 F-03，MAJOR）—— 补 A16 默认值直接测试

新增测试：
- 不传 `recentLinesLimit`（用默认值 20），连续放行 20 条不同文本，
  然后重复第 1 条文本 → 由于默认容量已被 20 条占满且第 1 条已被
  挤出环形缓冲，第 1 条文本应该 **ALLOW**（不是 DUPLICATE，因为它
  已经不在最近 20 条窗口内）；相反，重复刚放行的第 20 条文本 →
  应该 DROP DUPLICATE（仍在窗口内）。
- 不传 `rateLimit`（用默认 `{maxLines:5, windowMs:60000}`），用注入
  `clock` 在窗口内放行 5 条不同文本后，第 6 条应该 DROP RATE_LIMIT；
  快进 `clock` 超过 60000ms 后应恢复 ALLOW。

不得修改既有测试断言（只新增），不得修改 C1/C2/C4/C5 除本 FIX 明确
要求之外的任何逻辑。

## Scope

### Writable Scope

```
packages/ai-host/src/egressGate.ts        （仅 C3 的 lastIndex 重置一处改动）
packages/ai-host/src/egressGate.test.ts   （仅新增/扩展断言，不改既有测试的既有部分）
specs/dev/DEV-050A/REPORT.md、DECISIONS.md、INDEX.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Task Breakdown

### FIX-T001 — 修复 + 测试 + 全量验证 + REPORT/DECISIONS 更新 + commit

- 按 FIX-1~FIX-4 实施。
- 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、
  `pnpm format:check`、`pnpm build`、`pnpm test`，全部退出码 0，
  既有全部测试零回归。
- `DECISIONS.md` 追加一条，说明 F-01 根因（`RegExp.test()` 对
  `g`/`y` 正则的 `lastIndex` 副作用）与修复方式（无条件重置）。
- 更新 `REPORT.md`：追加 FIX 轮次的 Acceptance Results（A09/A13/A16
  由 FAIL/PARTIAL 改 PASS 并给出新证据）。
- `git add`（仅本 FIX Writable Scope 内文件）`&& git commit`，提交
  信息首行：
  `DEV-050A-FIX-01: reset regex lastIndex for deterministic denylist matching`。
  **恰 1 条提交**。
- 追加 LEDGER 行、写好 NODE_REPORT 消息文件——都不要提交，只写入
  工作区。
- **STOP**。

## Acceptance

| # | 判定 |
|---|---|
| FIX-A01 | 六条命令全部退出码 0，既有全部测试零回归 |
| FIX-A02 | C3 无条件重置 `pattern.lastIndex`，新增回归测试证明带 `g` 标志的正则连续两次匹配同一违规文本都能正确 DROP |
| FIX-A03 | 新增测试证明 MUTED 丢弃的文本不会污染 C4 重复历史（相同文本改用 ALLOWED 权限后能正常放行） |
| FIX-A04 | 新增测试直接验证默认 C4 容量（20）与默认 C5 频率上限（5-per-60000ms）本身 |
| FIX-A05 | `git log` 新增恰 1 条提交，首行 `DEV-050A-FIX-01: reset regex lastIndex for deterministic denylist matching` |
