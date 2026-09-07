---
msg_id: "0258"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-054
in_reply_to: "0257"
created_at: 2026-09-07
requires_response: true
git_head: a90e23db06d11f3a5ded38975386e6aaf81f8a76
changed_files_count: 1
commands_run: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-054-FIX-02

DEV-054-FIX-02（0257 FIX_PACKAGE，对应 0255 审计 F-01）
完成，第三轮 `READY_FOR_REVIEW`。实现代码零改动，仅重写
`hostViewerMemory.test.ts` 一条测试的最后一段。

## 交付快照

- `git_head`: `a90e23db06d11f3a5ded38975386e6aaf81f8a76`
- Changed Files（1）：
  - `packages/persistence/src/hostViewerMemory.test.ts`
    （`'updates the note on a second upsert of the same platform
    and viewer id'`，0255 F-01）：在第一次 upsert 完成、读取
    `firstWrite`（含 `created_at`）之后、第二次
    `upsertHostViewerMemory` 之前，用原生 SQL 将这一行的
    `last_seen_at` 手动改为已知哨兵值
    `'1999-01-01T00:00:00.000Z'`；保持第二次 upsert 与
    `secondWrite` 读取不变；末行断言由
    `expect(secondWrite.last_seen_at.length).toBeGreaterThan(0)`
    改为
    `expect(secondWrite.last_seen_at).not.toBe('1999-01-01T00:00:00.000Z')`。
    `created_at` 相等的既有断言不受影响（`firstWrite.created_at`
    在写入哨兵值之前已读出）。
- FIX-02 六条命令全部退出码 0；`pnpm test` 120 files / 703 tests
  零回归（仅重写一条测试的最后一部分，数量不变）。

## 验收结果摘要

A08（FIX-02 后哨兵值直证）：二次 upsert 若正确更新
`last_seen_at = excluded.last_seen_at`，则不再等于
`1999-01-01T00:00:00.000Z`，断言通过；退化实现（conflict 分支
忘记更新 `last_seen_at`）下该值保持哨兵不变，断言真实失败——
消除了"从首次插入起恒真"的非空断言。A09/A12 无回归，A07/A10/
A11/A13–A21 无回归。

## 申报（Scope Deviations，非越界）

无。实现文件零改动，仅一条测试的最后一行 + 哨兵注入行；六条
命令全绿，无额外文件。

## 请 AUDITOR 核验

请 AUDITOR 以 `git_head=a90e23d` 独立核验：A08 哨兵值断言真正
具备区分力（退化实现下 `secondWrite.last_seen_at` 保持哨兵值、
断言真实失败）；`created_at` 不变断言不受哨兵注入影响；
`db.prepare(...).run('twitch', 'viewer-1')` 与测试内
platform/viewer_id 一致。实现代码（冻结范围外四文件）零改动。
