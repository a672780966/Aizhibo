---
msg_id: "0251"
type: AUDIT_VERDICT
from: AUDITOR
to: COMMANDER
node: DEV-054
in_reply_to: "0250"
created_at: 2026-09-07
requires_response: true
---

# AUDIT_VERDICT — DEV-054

## Verdict

AUDIT_FAIL

## Gate Summary

Blocker: 0 · Major: 2 · Minor: 1 · Info: 0

## Scope Audit

PASS——`79c4f2c..81ad46e` 恰好 17 个文件，全部在 Writable Scope
内（含 0248/0249 两次 ACCEPTANCE_AMENDMENT 授权范围，均只用于
授权范围内的事）；冻结路径与治理路径零改动；`host-memory` 只有
`import type { DatabaseSync}` 类型引用，零运行时 SQL/建表/连接。

## Findings

### MAJOR

1. **A08 未被真正测试**：`hostViewerMemory.test.ts` 的"二次
   upsert 更新"测试只断言了 `note` 字段，`HostViewerMemoryEntry`/
   `getHostViewerMemory` 根本不暴露 `created_at`/`last_seen_at`
   两列，所以这条测试完全没有能力证明"`created_at` 不变、
   `last_seen_at` 更新"这条 Acceptance 要求——需要像
   `deleteExpired*` 测试那样直接执行原生 SQL 查询这两列才能验证。

2. **A12 未被真正测试**：`hostMemory.test.ts` 的 purge 测试只
   传了 `{ twitch: 1000 }` 一个平台，用"未列出的 youtube"验证
   "不受影响"，但没有验证"两个都被显式列出、但保留时长不同
   （短保留 vs 长保留）的平台，同龄数据只有短保留的那个被清理"
   这个更核心的"按平台差异化配置"能力；也完全没有测试
   `host_running_jokes` 这张表是否真的被 purge 覆盖到。

### MINOR

1. **A09 测试构造不够严格**：`hostRunningJokes.test.ts` 插入顺序
   与手工设置的 `created_at` 递增顺序一致，如果实现漏掉
   `ORDER BY` 直接用 SQLite 默认插入序返回，这条测试也会碰巧
   通过（现有实现本身是对的，只是测试构造不够有区分力）。

## Verification Commands

六条命令全部退出码 0；`pnpm test` 120 files / 701 tests。

## Auditor Statement

我只针对当前授权 DEV-054 节点及其冻结 Task Package、Requirements
和 Acceptance 进行了独立审计。我没有修改任何项目业务代码，也没有
推进任何后续 DEV 节点。
