---
msg_id: "0262"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-054
in_reply_to: "0261"
created_at: 2026-09-07
requires_response: true
git_head: bf8b1f8ceab98ea34af6d2c6459595545b1e8df7
changed_files_count: 8
commands_run: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-054-T003

T003（CHANGE_REQUEST 0261 修正，USER 已批准）施工完成，
`READY_FOR_REVIEW`。Dev Spec 第 42 节"Host Memory"结构化字段
（起草时按"Viewer Memory"检索遗漏的权威 schema）已替换原自由文本
`note`；决策记录见 `specs/dev/DEV-054/DECISIONS.md` D6；验收权威
副本为 `specs/tasks/TASK-PACKAGE-DEV-054.md` 附录 T003 Acceptance
（A22–A28）。

## 交付快照

- `git_head`: `bf8b1f8ceab98ea34af6d2c6459595545b1e8df7`
- Changed Files（8，与实现提交一致）：
  - `packages/persistence/src/db.ts`：`host_viewer_memory` schema 从
    `platform`/`viewer_id`/`note`/`created_at`/`last_seen_at` 改为
    `platform`/`viewer_id`/`nickname`/`interaction_count`/
    `known_running_jokes`/`host_affinity`/`notable_events`/
    `created_at`/`last_seen_at`（Dev Spec 第 42 节，CR 0261）；两个
    数组列 JSON 字符串存储（沿用 eventStore/snapshotStore 范式）；
    `nickname` 可 NULL；`host_running_jokes` 表零改动
  - `packages/persistence/src/hostViewerMemory.ts`：
    `HostViewerMemoryEntry` 类型换结构化字段；upsert 整行覆盖式
    机械语义不变（不发明自动递增/追加业务逻辑，D6）；get 读整行
    并 parse 两个 JSON 列
  - `packages/persistence/src/hostViewerMemory.test.ts`：重写，
    5 → 7 条
  - `packages/host-memory/src/hostMemory.ts`：`rememberViewer`
    签名从三独立参数改为接收完整 `HostViewerMemoryEntry`
  - `packages/host-memory/src/hostMemory.test.ts`：重写，
    完整 entry 端到端
  - `specs/dev/DEV-054/DECISIONS.md`（追加 D6）、`REPORT.md`
    （追加 §10）、`INDEX.md`（T003 勾选 + Status=READY_FOR_REVIEW）
- 六条命令全部退出码 0；`pnpm test` 120 files / **705 tests**
  （T002-FIX-02 基线 703 + 新增 2，净 +2），零回归。
- `host_running_jokes` 表、`hostRunningJokes.ts`、`db.test.ts` 表数量
  断言、`purge`/`getHealth` 均未修改（A28），既有测试零回归（A27）。

## 验收结果摘要

A22（新 schema 九列齐全，`host_running_jokes` 零改动）/A23（覆盖式
写入全部字段，二次写入 `created_at` 不变、`last_seen_at` 更新，
沿用原 A08 同类验证手法）/A24（两个 JSON 数组列写入读回一致）/
A25（`nickname` 省略时 `undefined`/`NULL` 不报错）/A26（host-memory
`rememberViewer`/`recallViewer` 端到端转发完整新 schema）/A27
（deleteExpired/purge 行为不变，既有测试零回归）/A28（running
jokes 相关 + `db.test.ts` 断言未动）全部 PASS。

## 请 AUDITOR 核验

请 AUDITOR 以该 `git_head` 独立核验 A22–A28，重点复核 A23 的
`created_at` 不变 / `last_seen_at` 更新断言、A24 的 JSON 数组往返
一致性、A26 的端到端转发，以及 A28 红线（`host_running_jokes` /
`hostRunningJokes.ts` / `db.test.ts` 表数量断言零改动，`purge`/
`getHealth` 零改动）。
