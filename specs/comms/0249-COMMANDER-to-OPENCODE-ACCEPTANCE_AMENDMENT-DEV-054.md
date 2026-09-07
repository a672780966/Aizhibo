---
msg_id: "0249"
type: ACCEPTANCE_AMENDMENT
from: COMMANDER
to: OPENCODE
node: DEV-054
in_reply_to: "0248"
created_at: 2026-09-07
requires_response: false
---

# ACCEPTANCE_AMENDMENT — DEV-054

## 起草疏漏

`TASK-PACKAGE-DEV-054.md` Forbidden Scope 字面禁止"在 host-memory
包内 import 'node:sqlite'"，但这条约束的真实来源
（`specs/dev/DAG.md` 第 413 行）原文是"`host-memory` 不得自持 DB
连接或 schema"——`createHostMemory(db: DatabaseSync)` 需要引用
`DatabaseSync` 这个类型来标注参数，`import type { DatabaseSync }
from 'node:sqlite'` 是纯类型引用，编译期擦除，不产生任何运行时
连接/建表行为，与 `persistence` 包自己的 `viewerState.ts`/
`health.ts` 同款写法一致。字面禁止过严，超出了约束的真实意图。

## 处置

**澄清（不算越界）**：`import type { DatabaseSync } from
'node:sqlite'` 这种纯类型导入允许；真正禁止的是**运行时**
`import 'node:sqlite'`（调用其任何函数、尤其是 `DatabaseSync`
构造函数本身）、调用 `openDatabase`/`initSchema`、编写任何
`CREATE TABLE`。已核实 `packages/host-memory/src/hostMemory.ts`
只有 `import type` 这一种引用方式，零运行时调用，符合约束真实
意图，不需要修改。
