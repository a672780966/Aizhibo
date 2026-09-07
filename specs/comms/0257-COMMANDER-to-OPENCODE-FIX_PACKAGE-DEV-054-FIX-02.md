---
msg_id: "0257"
type: FIX_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-054
in_reply_to: "0256"
created_at: 2026-09-07
requires_response: true
---

# FIX_PACKAGE — DEV-054-FIX-02

## 范围

只改 `packages/persistence/src/hostViewerMemory.test.ts` 里
`'updates the note on a second upsert of the same platform and
viewer id'` 这一条测试的最后一行断言，不要动其他任何测试或任何
实现代码。

## 问题

现有断言 `expect(secondWrite.last_seen_at.length).toBeGreaterThan(0)`
从**第一次** insert 之后就已经恒真（`last_seen_at` 首次插入就是
非空字符串），完全测不出"conflict 分支忘记更新
`last_seen_at = excluded.last_seen_at`"这类退化实现——一个只更新
`note`、不更新 `last_seen_at` 的错误实现，`secondWrite.last_seen_at`
依然是首次插入时的非空值，这条断言照样通过。

## 要求

在第一次 upsert 之后、读取 `firstWrite` 之前或之后，用原生 SQL
把这一行的 `last_seen_at` 手动改成一个已知的哨兵值（比如很早的
固定时间字符串，例如 `'1999-01-01T00:00:00.000Z'`），确保这个
哨兵值和"当前真实时间"明显不同。然后做第二次 upsert，读取
`secondWrite`，把最后一行断言改成：`secondWrite.last_seen_at`
**不等于**这个哨兵值（例如 `expect(secondWrite.last_seen_at).not.toBe('1999-01-01T00:00:00.000Z')`）——
这样如果二次 upsert 真的更新了 `last_seen_at`，断言通过；如果
退化实现忘记更新，`last_seen_at` 会保持哨兵值不变，断言就会
真实失败。

注意：把哨兵值写入的时机要放在 `firstWrite` 读取*之后*、第二次
`upsertHostViewerMemory` 调用*之前*，这样 `created_at` 不变的
断言（`secondWrite.created_at` 等于 `firstWrite.created_at`）
依然成立，不受这次改动影响（`firstWrite.created_at` 应该在写入
哨兵值之前就已经读出来记录好）。

## 完成后

1. 六条命令全部跑一遍并记录退出码，确认全部通过（测试数量不变，
   只是重写了这一条测试的最后一部分）。
2. `git add`：仅 `hostViewerMemory.test.ts`（如需在 REPORT.md
   里简单补一句说明也可以顺带改）。
3. `git commit`，首行：`DEV-054-FIX-02: fix non-discriminating last_seen_at assertion with sentinel value`。
4. 写入（不提交）新的 NODE_REPORT 消息文件与 LEDGER 追加行，
   msg_id 用 `0258`，格式同上一轮 `0254`。
5. STOP，等待 Commander 独立验证 + 再次审计。
