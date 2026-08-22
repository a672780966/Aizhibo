---
msg_id: "0121"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-025
in_reply_to: "0120"
created_at: 2026-08-22
requires_response: false
---

# NODE_RULING — DEV-025

```yaml
ruling: FAIL
verdict_ref: "0120"
```

## Finding Disposition

### BLOCKING-01 — 转 FIX（发 `FIX_PACKAGE DEV-025-FIX-01`）

`DECISIONS.md` D2 与 `REQUIREMENTS.md` §2.2 中的安全论证事实有误（详见 VERDICT）。这不是
OpenCode 的施工缺陷——该论证逐字源自我（Commander）撰写的 `TASK-PACKAGE-DEV-025.md`
§2.2，OpenCode 依协议要求沿用，且其**实际实现**（`onResolve` 显式手写五字段白名单）独立
于这一错误前提、本身是安全的。我在此承认这处 Task Package 撰写错误：我在起草时误以为
"`DICE.PUBLISHED` 标记 `visibility:'PUBLIC'`"等价于"该事件 payload 的每个字段都已判定
为对观众公开"，但实际上 `DICE.PUBLISHED` 与 `DICE.ROLLED`（HIDDEN）共用同一未裁剪
`record` 对象，`seed`/`rollIndex`/`appliedModifiers` 只是恰好没被读取/转发，而非"从未
以 PUBLIC 身份存在"。

由于修复范围纯粹是文档措辞、不涉及任何代码改动，且 `REQUIREMENTS.md`/`DECISIONS.md` 是
OpenCode 的 Writable 文件，按协议 §5.2 发 `FIX_PACKAGE`（见消息 `0122`），不采用"接受并
说明"——协议判定规则"任一 BLOCKING → FAIL"无例外，且本 finding 的补救可行、成本低、
对未来节点（尤其 DEV-037）的参考价值高，不适用"补救不可行/无意义故接受"的既往先例
（如 DEV-000 F-02 那种不可逆场景）。

### OBSERVATION-01 — 接受并说明，不影响本次裁决

既有 `DICE.PUBLISHED` 事件在 PUBLIC 标记下携带 `seed` 的架构不一致，记入 Future
Consideration，留待未来 CR 或 DEV-037 起草时一并评估，不在本节点范围内处理。

## 节点新状态

`AUDITED` → **`FIX_REQUIRED`** → （随附 `FIX_PACKAGE DEV-025-FIX-01`）**`IN_PROGRESS`**。

接口**未冻结**——`onLock`/`onResolve` 的两次 CR 与 `pickDiceState` 均待 FIX 完成、二轮
审计 PASS 后才正式冻结。本轮不更新 `PROJECT_INDEX.md`/`DAG.md`（DEV-025 状态保持
`IN_PROGRESS`，未转 `DONE`）。

`git_head`（待修复的基线）：`770276f`。

## 下一步

`FIX_PACKAGE DEV-025-FIX-01` 已随本轮一并发出（消息 `0122`），要求 OpenCode 更正
`REQUIREMENTS.md` §2.2 与 `DECISIONS.md` D2 的安全论证措辞，不改动任何源码，不重开任何
已 VERIFIED 的 Task。完成后发第二轮 `NODE_REPORT` 交 `AUDITOR` 复核。

→ 发给 Codex（照抄即可）：
"处理 LEDGER 中消息 0122（FIX_PACKAGE DEV-025-FIX-01）。"
