# DEV-054 REPORT

## 1. Status

READY_FOR_REVIEW

## 2. Implemented

CR-017 延后建表的两张表（`host_viewer_memory`/`host_running_jokes`，
列约束强制：`platform`+`created_at`/`last_seen_at`）在本节点落地：

**`packages/persistence`**（schema/CRUD 全部留在此包，D2）：

- `db.ts` 追加 `host_viewer_memory`（`platform`/`viewer_id`/`note`/
  `created_at`/`last_seen_at`，PK `(platform, viewer_id)`）与
  `host_running_jokes`（`id`/`platform`/`text`/`created_at`/
  `last_seen_at`，PK `(platform, id)`）两张表，均 `IF NOT EXISTS`。
- `hostViewerMemory.ts`（新增）：`upsertHostViewerMemory` /
  `getHostViewerMemory` / `deleteExpiredHostViewerMemory` +
  `HostViewerMemoryEntry` 类型。
- `hostRunningJokes.ts`（新增）：`addHostRunningJoke` /
  `listHostRunningJokes` / `deleteExpiredHostRunningJokes` +
  `HostRunningJokeEntry` 类型。
- `index.ts` 追加两行导出（`./hostViewerMemory.js`、`./hostRunningJokes.js`）。
- `note`/`text` 均为自由文本字段，不发明结构化记忆/梗数据模型（D3）。

**`packages/host-memory`**（新建，仓库最终 17 包列表一员）：

- `createHostMemory(db)` 提供四个转发方法 + `purge` + `getHealth`：
  `rememberViewer`/`recallViewer`/`addRunningJoke`/`listRunningJokes`
  逐条转发 persistence 的原始 CRUD；`purge(retentionMsByPlatform)`
  按调用方传入的 per-platform 保留时长清理两个方向的过期数据（未列出
  的 platform 不受影响，D4）；`getHealth()` 转发 persistence 健康检查。
- host-memory **不持有数据库连接或 schema**：只做类型引用（`import
  type { DatabaseSync } from 'node:sqlite'`，0249 澄清允许），零运行时
  SQL、零 CREATE TABLE、零 `openDatabase`/`initSchema` 调用（D2）。

**不做的事**：不实现后台定时清理任务（D5）、不硬编码任何全局保留
时长默认值（D4）、不实现相关性排序/摘要/相似度检索、不接入 Host
Scheduler/Host LLM Provider/prompt 拼装、未新增任何第三方 npm 依赖。

## 3. Changed Files

Writable Scope 内共 15 个文件（§7 恰 1 条提交；INDEX/REPORT/DECISIONS
随该提交入库，LEDGER 追加行与 NODE_REPORT 消息文件写入工作区但不提交）：

```text
packages/persistence/src/db.ts                      （修改，追加两张表）
packages/persistence/src/db.test.ts                 （修改，表数量断言 四→六，0248 授权）
packages/persistence/src/hostViewerMemory.ts        （新增，CRUD + 机械删除）
packages/persistence/src/hostViewerMemory.test.ts   （新增，5 条测试）
packages/persistence/src/hostRunningJokes.ts        （新增，CRUD + 机械删除）
packages/persistence/src/hostRunningJokes.test.ts   （新增，5 条测试）
packages/persistence/src/index.ts                   （修改，追加两行导出）
packages/host-memory/package.json                   （新增，@interactive-story/host-memory）
packages/host-memory/tsconfig.json                  （新增）
packages/host-memory/src/index.ts                   （新增，导出 createHostMemory/HostMemory）
packages/host-memory/src/hostMemory.ts              （新增，转发外壳）
packages/host-memory/src/hostMemory.test.ts         （新增，5 条测试）
tsconfig.json                                       （根，修改，追加 host-memory 引用）
pnpm-lock.yaml                                      （修改，新包依赖刷新）
specs/dev/DEV-054/DECISIONS.md                      （新增，D1–D5）
specs/dev/DEV-054/REPORT.md                         （本文件，T001 模板 → T002 回填）
specs/dev/DEV-054/INDEX.md                          （T001–T002 勾选 + Status=READY_FOR_REVIEW）
```

## 4. Tests Executed

| 项 | 结果 |
|---|---|
| `pnpm test`（hostViewerMemory.test.ts） | 5 个测试全部通过（upsert 新写读回 / 二次 upsert 更新 note+last_seen_at 且 created_at 不变 / 未知 viewer 返回 undefined / 按 cutoff 删过期 / 同 platform 限定删除） |
| `pnpm test`（hostRunningJokes.test.ts） | 5 个测试全部通过（添加读回 / 同 platform 按 created_at 升序列出 / platform 隔离 / 按 cutoff 删过期 / 同 platform 限定删除） |
| `pnpm test`（db.test.ts） | 表数量断言更新 四→六 后通过（0248 授权，六张授权表全量断言） |
| `pnpm test`（hostMemory.test.ts） | 5 个测试全部通过（remember→recall 端到端 / 未记观众 undefined / add→list 端到端 / purge 按 per-platform 保留时长差异化清理且未列出 platform 不受影响 / getHealth 返回 OK） |
| `pnpm test`（全量 workspace） | 零回归：120 个测试文件，701 个测试全部通过（DEV-053 基线 117 文件 / 686 测试 + 新增 3 文件 / 15 测试） |

六条命令（`pnpm install`/`pnpm typecheck`/`pnpm lint`/
`pnpm format:check`/`pnpm build`/`pnpm test`）全部退出码 0，零回归。

## 5. Acceptance Results

| # | 判定 | 结果 | 说明 |
|---|---|---|---|
| A01 | `pnpm install` 退出码 0 | PASS | `Already up to date`（新包依赖为 workspace 内部引用，无外部新增，A15） |
| A02 | `pnpm typecheck` 退出码 0 | PASS | `tsc -b && tsc -b --noEmit` 通过（含新包 host-memory 引用） |
| A03 | `pnpm lint` 退出码 0 | PASS | `eslint .` 通过 |
| A04 | `pnpm format:check` 退出码 0 | PASS | Prettier `All matched files use Prettier code style!` |
| A05 | `pnpm build` 退出码 0 | PASS | `tsc -b` 通过 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | PASS | 全量 120 文件 / 701 测试全绿（见 §4），零回归 |
| A07 | 两张表存在且列约束符合第 2.1 节 | PASS | `db.test.ts` 断言六张授权表齐全；列：`platform`+`created_at`/`last_seen_at` 均 `NOT NULL`，PK 含 `platform` |
| A08 | `upsertHostViewerMemory` 二次写入更新 `note`/`last_seen_at`，`created_at` 不变 | PASS | 测试：同 `(platform, viewer_id)` 二次 upsert 后 `note` 为新值、`last_seen_at` 更新、`created_at` 保持首次值 |
| A09 | `listHostRunningJokes` 按 `created_at` 升序返回同 platform 全部记录 | PASS | 测试：同 platform 乱序插入三条，列表按 `created_at` 升序返回；其他 platform 记录不混入（platform 隔离测试佐证） |
| A10 | 删除函数只删过期且同 platform 的行，其余不受影响 | PASS | 两文件各 2 条测试：`created_at` 早于 cutoff 且同 platform 的删除、晚于 cutoff 的保留、其他 platform 的保留 |
| A11 | host-memory 四个转发方法端到端正确 | PASS | 测试：`rememberViewer`→`recallViewer` 读回 note；`addRunningJoke`→`listRunningJokes` 读回 joke；未记观众 `undefined` |
| A12 | `purge` 按 per-platform 保留时长差异化清理，未列出的 platform 不受影响 | PASS | 测试：两 platform 不同保留时长，仅短的过期；未列入的 platform 数据不受影响 |
| A13 | `getHealth()` 正常路径返回 `status: 'OK'` | PASS | 测试：健康 db 上 `getHealth()` 返回 `status: 'OK'`（转发 persistence） |
| A14 | host-memory 源码不 import `node:sqlite`（运行时）、不调用 `openDatabase`/`initSchema` | PASS | 仅 `import type { DatabaseSync }` 类型引用（0249 澄清：纯类型 import 允许，禁止的是运行时调用）；无 `openDatabase`/`initSchema`/CREATE TABLE |
| A15 | 未新增第三方 npm 依赖 | PASS | host-memory 依赖仅 workspace 内部 `@interactive-story/persistence`/`shared`；`pnpm install` 无外部新增 |
| A16 | 冻结文件均未被修改 | PASS | `viewerState.ts`/`health.ts`/`sessionStore.ts`/`eventStore.ts`/`snapshotStore.ts`/`recovery.ts`/`ai-host/**`/`platform-core/**`/`platform-twitch/**`/`runtime-kernel/**` 均未修改（见 §6） |
| A17 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | PASS | D1–D5 覆盖五要点（见 DECISIONS.md） |
| A18 | 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | PASS | 五份文档齐全；INDEX Task 全勾 + Status 已更新 |
| A19 | `git log` 新增恰 1 条提交，首行 `DEV-054: viewer memory (host_viewer_memory/host_running_jokes tables + host-memory package)` | PASS | 见 §7 |
| A20 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | PASS | 见 §8 |
| A21 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | PASS | 见 §6 Scope Check 空 diff 佐证 |

## 6. Scope Check

只施工 DEV-054。严格在 Writable Scope 内改动（含 Commander 两次
ACCEPTANCE_AMENDMENT 授权的范围：0248 将 `db.test.ts` 表数量断言
（四→六）追加进 Writable Scope，0249 澄清 `node:sqlite` 纯类型
import 允许、运行时调用禁止——hostMemory.ts 仅 `import type` 符合
约束真实意图），未触碰 Forbidden Scope 任何文件：
`packages/persistence/src/viewerState.ts`、`health.ts`、
`sessionStore.ts`、`eventStore.ts`、`snapshotStore.ts`、`recovery.ts`、
`packages/ai-host/**`、`packages/platform-core/**`、
`packages/platform-twitch/**`、`packages/runtime-kernel/**` 均未修改
（A16）。host-memory 不自持 DB 连接/schema（D2）；`note`/`text`
自由文本不发明结构化字段（D3）；`purge` 保留时长整个由调用方传入，
无隐式/全局默认值（D4）；无后台定时清理任务（D5）；未实现相关性
排序/摘要/相似度检索；未接入 Host Scheduler/Host LLM Provider/prompt
拼装；未新增任何第三方 npm 依赖；`specs/PROJECT_INDEX.md`/`DAG.md`/
`tasks/**`/`audit/**`/`protocol/**` 零改动（A21）。Forbidden Scope
全部遵守，无越界。

**Scope Deviations（申报）**：`REQUIREMENTS.md` 与 `ACCEPTANCE.md` 由
Commander 在 dispatch 时预填，本节点零改动（同 DEV-052/053 先例）。
红线核验：对本次提交执行 `git diff`，`viewerState.ts`/`health.ts`/
`sessionStore.ts`/`eventStore.ts`/`snapshotStore.ts`/`recovery.ts`/
`ai-host/**`/`platform-core/**`/`platform-twitch/**`/
`runtime-kernel/**`/`specs/PROJECT_INDEX.md`/`specs/dev/DAG.md`/
`specs/tasks`/`specs/audit`/`specs/protocol` 输出为空，确认冻结/治理
路径零改动。工作区既有 `ai-host/src/egressGate.ts`/`commentPipeline.ts`
CRLF 行尾标记为 pre-existing 非内容差异（同 DEV-052/053 审计 Info
记录），未触碰未提交。

## 7. Commit

提交信息首行：`DEV-054: viewer memory (host_viewer_memory/host_running_jokes tables + host-memory package)`。

恰 1 条提交，包含：persistence 两张表 + 两个 CRUD 文件（含测试）、
`index.ts` 导出、`db.test.ts` 断言更新（0248）、host-memory 新包全部
文件、根 `tsconfig.json` 引用、`pnpm-lock.yaml`、`DECISIONS.md`/
`REPORT.md`/`INDEX.md` 节点文档。LEDGER 追加行与 NODE_REPORT 消息
文件已写入工作区但**未提交**（A19/A20）。

## 8. Handoff

LEDGER 追加行与 NODE_REPORT 消息文件（`specs/comms/`）留给 Commander
收尾统一提交，不在本次提交范围内（A20，Constraint 6）。NODE_REPORT
发往 `AUDITOR`，抄送 `COMMANDER`；审核锚点与交付快照见
`specs/comms/0250-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-054.md`。
