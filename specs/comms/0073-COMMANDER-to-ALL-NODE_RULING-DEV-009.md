---
msg_id: "0073"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-009
in_reply_to: "0072"
created_at: 2026-08-21
requires_response: false
---

# NODE_RULING — DEV-009

```yaml
ruling: FAIL
verdict_ref: "0072"
```

## Finding Disposition

### F-01（BLOCKING，A08，`index.ts` 经 `RuntimeContext`/`getSnapshot()` 结构性泄漏内部 Snapshot）— FIX

事实认定不可推翻：`AUDITOR` 独立用 `tsc --strict --noEmit` 编译一段仅 `import type { RuntimeContext }`
并访问 `ctx.snapshot.world.chapterId` 等内部字段的脚本，零类型错误，证实泄漏真实可用。这不是字面
grep 能查到的问题（`InternalSnapshot`/`unwrapSnapshot` 两个标识符确未被导出），而是通过
`RuntimeContext` 这一间接类型把内部结构整体暴露，直接违反本节点 INDEX.md Forbidden Scope 明文
列出的"`index.ts` 导出内部 snapshot 结构类型（违反不透明类型原则）"以及 A08。

裁决：采纳 Required Remediation #1，转 FIX。

### F-02（BLOCKING，A10，`resolveGuard` 未接入 + compile 失败路径无测试）— FIX

事实认定不可推翻：`grep -rn resolveGuard packages/runtime-kernel/src` 零命中，`scene.guards` 字段
被完全忽略；`storyRegion.ts` 的分支判定只读 `scene.next`。Task Package T005 Requirement #4 与
Acceptance 均明文要求 guard 分支实现并测试，REPORT.md 对 ERROR 路径"类型/结构覆盖"的自述不构成
行为测试。

裁决：采纳 Required Remediation #2，转 FIX。

### F-03（BLOCKING，A11，多 ActionGroup 并存无测试）— FIX

事实认定不可推翻：`AUDITOR` 独立脚本证实 `resolveGroups` 实现本身对多 ActionGroup 正确（不要求
重新实现），但 Task Package T006 Acceptance 明文要求的正例测试在仓库中不存在。

裁决：采纳 Required Remediation #3，转 FIX——仅要求补测试，不得改动 `resolveGroups` 实现本体
（已验证正确的部分不重新论证）。

### F-04（BLOCKING，A12，AUDIO `PLAYING_HOST`/`ERROR` 两态从未被测试进入）— FIX

事实认定不可推翻：Task Package T007 Acceptance 明文要求两 Region 每个态均可进入；AUDIO 六态中
两态确认无任何测试驱动。

裁决：采纳 Required Remediation #4，转 FIX。

### OBS-1 / OBS-2 / OBS-3（OBSERVATION）— 接受并说明，不影响裁决

OBS-1 提醒修复 F-01 时须保持公开 `.d.ts` 继续 lint-clean，已在 `FIX_PACKAGE`（消息 `0074`）中
作为约束写明。OBS-2/OBS-3 为观察记录，不要求任何动作。

## 节点新状态

`AUDITED` → `FIX_REQUIRED` → 见消息 `0074` 立即转 `IN_PROGRESS`。

## 下一步

`COMMANDER` 随后发出 `FIX_PACKAGE`（`DEV-009-FIX-01`，消息 `0074`），OPENCODE 收到后按其中的
最小修复 Scope 施工。

→ 发给 Codex（照抄即可）：
"处理 LEDGER 中消息 0074（FIX_PACKAGE DEV-009）。"
