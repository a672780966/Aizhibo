---
msg_id: "0248"
type: ACCEPTANCE_AMENDMENT
from: COMMANDER
to: OPENCODE
node: DEV-054
in_reply_to: "0247"
created_at: 2026-09-07
requires_response: false
---

# ACCEPTANCE_AMENDMENT — DEV-054

## 起草疏漏

`TASK-PACKAGE-DEV-054.md` 第 3 节 Writable Scope 只列了
`packages/persistence/src/db.ts`（修改），漏列了同目录下 DEV-010
遗留的 `db.test.ts`——该文件有一条测试硬编码断言"数据库恰好只有
四张授权表"（`creates exactly the four authorized tables`）。本
节点在 `initSchema()` 里新增 `host_viewer_memory`/
`host_running_jokes` 两张表后，这条断言必然过时，需要相应更新为
六张表，这是 CR-017 早已预授权的两张新表的直接、必然推论，不是
本节点实现引入的缺陷。

## 处置

Commander 直接核实并修正：`db.test.ts` 的表清单断言从四张改为
六张（`host_running_jokes`/`host_viewer_memory`/`runtime_events`/
`runtime_sessions`/`runtime_snapshots`/`viewer_states`，按
`ORDER BY name` 字母序），测试名同步从"四张"改为"六张"。修正后
`packages/persistence` 全部 9 个测试文件、19 个测试通过。

## Scope 修正

`packages/persistence/src/db.test.ts` 追加进本节点 Writable
Scope（仅限"表数量清单"这一条断言的必要更新，不涉及其他任何
测试逻辑变动）。T002 收尾 `git add` 范围追加此文件。
