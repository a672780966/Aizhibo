---
msg_id: "0250"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-054
in_reply_to: "0249"
created_at: 2026-09-07
requires_response: true
git_head: 81ad46ea6e21d81ff73bc7177a8f6d5a7692b6bc
changed_files_count: 17
commands_run: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-054

DEV-054（Viewer Memory，M5 第六个节点）施工完成，`READY_FOR_REVIEW`。

交付全文见 `specs/dev/DEV-054/REPORT.md`；决策记录见
`specs/dev/DEV-054/DECISIONS.md`（D1–D5）；验收权威副本为
`specs/tasks/TASK-PACKAGE-DEV-054.md` 第 12 节（A01–A21，节点
`ACCEPTANCE.md` 逐行一致）。

## 交付快照

- `git_head`: `81ad46ea6e21d81ff73bc7177a8f6d5a7692b6bc`
- Changed Files（17，与实现提交一致）：
  - `packages/persistence/src/db.ts`（修改，追加 `host_viewer_memory`/
    `host_running_jokes` 两表，CR-017 延后建表在本节点落地）
  - `packages/persistence/src/db.test.ts`（修改，表数量断言 四→六，
    Commander ACCEPTANCE_AMENDMENT 0248 授权）
  - `packages/persistence/src/hostViewerMemory.ts(.test.ts)`（新增：
    upsert/get/deleteExpired + `HostViewerMemoryEntry`；5 测试）
  - `packages/persistence/src/hostRunningJokes.ts(.test.ts)`（新增：
    add/list/deleteExpired + `HostRunningJokeEntry`；5 测试）
  - `packages/persistence/src/index.ts`（修改，追加两行导出）
  - `packages/host-memory/**`（新包：`createHostMemory(db)` 转发外壳 +
    `purge(retentionMsByPlatform)` + `getHealth()`；5 测试）
  - 根 `tsconfig.json`（追加 host-memory 引用）、`pnpm-lock.yaml`
    （新包依赖刷新，无外部新增）
  - `specs/dev/DEV-054/DECISIONS.md`（新增，D1–D5）、`REPORT.md`
    （T001 模板 → T002 回填）、`INDEX.md`（T001–T002 勾选 +
    Status=READY_FOR_REVIEW）
- 六条命令全部退出码 0；`pnpm test` 120 files / 701 tests
  （DEV-053 基线 117 files / 686 tests + 新增 3 文件 / 15 测试，
  零回归）。
- `note`/`text` 自由文本、零结构化字段（D3）；`purge` 保留时长整个
  由调用方传入、无隐式/全局默认（D4）；同步方法、无后台定时任务
  （D5，Runtime 调度属 M6）；host-memory 不自持 DB 连接/schema，
  仅 `import type { DatabaseSync }` 类型引用（D2，0249 澄清：纯类型
  import 允许，运行时调用禁止）；`db.test.ts` 断言更新由 0248 授权。
- **红线核验**：`git diff HEAD~1 HEAD --stat -- packages/persistence/
  src/viewerState.ts packages/persistence/src/health.ts packages/
  persistence/src/sessionStore.ts packages/persistence/src/eventStore.ts
  packages/persistence/src/snapshotStore.ts packages/persistence/src/
  recovery.ts packages/ai-host packages/platform-core
  packages/platform-twitch packages/runtime-kernel
  specs/PROJECT_INDEX.md specs/dev/DAG.md specs/tasks specs/audit
  specs/protocol` 为**空**——全部冻结/治理路径零改动（A16/A21）。
  工作区既有的 egressGate.ts/commentPipeline.ts CRLF 行尾标记为
  pre-existing 非内容差异（同 DEV-052/053 审计 Info 记录），未触碰
  未提交。

## 验收结果摘要

A01–A06（命令）PASS；A07（db.test.ts 六张授权表全量断言，列约束
platform+created_at/last_seen_at 均 NOT NULL）/A08（同 viewer 二次
upsert 更新 note/last_seen_at 且 created_at 不变）/A09（list 按
created_at 升序 + platform 隔离）/A10（删除函数只删过期且同 platform
的行，其余保留）/A11（remember/recall/add/list 端到端，未记 viewer
undefined）/A12（purge 按 per-platform 保留时长差异化清理，未列出
platform 不受影响）/A13（getHealth 返回 status OK）PASS；A14（无
运行时 node:sqlite import、无 openDatabase/initSchema/CREATE
TABLE）/A15（零第三方依赖）/A16（冻结六文件 + 四包空 diff）/A17
（DECISIONS D1–D5 覆盖第 6 节五要点）/A18（节点文档齐全，INDEX
T001–T002 全勾 + READY_FOR_REVIEW）/A19（恰 1 条提交 `81ad46e`，
首行 `DEV-054: viewer memory (host_viewer_memory/host_running_jokes
tables + host-memory package)`）/A20（本 NODE_REPORT 与 LEDGER 追加
行写入工作区但未提交）/A21（PROJECT_INDEX/DAG/tasks/audit/protocol
未动）PASS。

## 申报（Scope Deviations，非越界）

无。六条命令首轮全绿，无格式修正、无 SCOPE_RULING、无额外文件。

## 请 AUDITOR 核验

请 AUDITOR 以该 `git_head` 独立核验 A01–A21，重点复核 A08–A12 的
断言质量（upsert 幂等/升序/限定删除/端到端转发/per-platform purge
逐一直证）、A14（host-memory 仅类型引用、零运行时 SQL）与 A16/A21
红线（冻结路径 + 治理路径均空 diff）。
