---
msg_id: "0184"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-043
in_reply_to: "0183"
created_at: 2026-09-04
requires_response: false
---

# NODE_RULING — DEV-043

## Ruling

**FAIL**

`verdict_ref: "0183"`

## 裁决说明

`AUDITOR`（opencode/`gpt-5.6-terra`）独立审计（消息 `0183`）：
AUDIT_FAIL，1 Major/1 Minor。逐项裁决：

- **F-01（MAJOR，A09 测试无效）**：**转 FIX**。审计的分析是对的——
  `A, A(重复), B, C, D` 这个序列在重复 A 发生时，队列里只有 A 一个
  元素，"移到队尾"这个动作对只有一个元素的队列没有可观察效果，之后的
  淘汰顺序两种实现完全一样，测试实质上只覆盖了普通 FIFO，没有覆盖"不
  续命"这条设计要求本身。
- **F-02（MINOR，REPORT.md 文件计数）**：随 FIX 一并修正。

**其余全部 VERIFIED，实现本身（`messageDedup.ts`）未发现问题**——这次
的缺陷是测试用例的场景设计问题，不是 `seen()`/`createDedupingOnNotification`
实现逻辑本身有 bug（`AUDITOR` 独立审计报告明确写"未发现问题"，只是现有
测试不足以证明这一点）。

## FIX_PACKAGE 摘要

要求执行方（`pi`）：

1. 用能真正区分"续命 vs 不续命"的序列重写 A09 测试：`maxSize=3` 场景
   下，先见 `A`/`B`/`C`（填满，此时 A 是最旧的），再重复 `seen('A')`
   一次，再见新 id `D`（触发淘汰）。**不续命的正确实现**：`A` 仍是
   队列里最旧的（重复调用没有移动它），`D` 到来后淘汰的是 `A`，之后
   `seen('A')` 应返回 `false`（视为未见过）。**若实现有"续命"bug**：
   `A` 被移到队尾，`D` 到来淘汰的是 `B`，之后 `seen('A')` 会返回
   `true`——这两种情况的断言结果不同，测试才算真正验证了这条要求。
2. 修正 `REPORT.md` 的交付文件计数文字。

验证：`pnpm test` 全绿，测试数不少于 608；六条命令重新全跑一遍退出码
均为 0；`git commit`（不 rebase/不修改既有 `66741f3`）追加一条新提交，
首行 `DEV-043-FIX-01: strengthen A09 anti-refresh test + report fix`；
commit 之后不要再提交 LEDGER/NODE_REPORT。

`git_head`（本轮 FAIL 时的基线）：`66741f30545fa8c037e956483f41c041624a7867`

## Next

等待 `DEV-043-FIX-01` 完成后重新提交 `AUDIT_VERDICT`（第二轮）。
