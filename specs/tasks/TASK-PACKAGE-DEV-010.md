# TASK PACKAGE — DEV-010

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-010 |
| Node Name | Persistence |
| Milestone | M1 — Story Machine Complete |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-009（DONE，`verdict_ref: "0080"`）、DEV-007（DONE，`verdict_ref: "0084"`，非依赖但已验证同一驱动模式可行） |
| Commander | Claude |
| Executor | Codex（协议角色名 `OPENCODE`） |

### 首次创建 `packages/persistence`

Rev 2 冻结的 17 包列表包含 `persistence`，此前从未创建（"包按节点逐步创建，禁止提前建空包"）。本节点是它的首次创建者。

### 本节点解决的是 Dev Spec 第 18 节（LKG）+ 第 50 节（Persistence）+ CR-017（观众表列约束），不是全部十张表

Dev Spec 第 50 节列出的 SQLite 表有 10 张，但其中多张**目前没有任何真实消费者**（`audio_cache`
是 DEV-036 的、`platform_events` 是 M4 的、`errors` 是 DEV-062 的、`chapter_runs` 尚无归属节点）。
按项目一贯的"不为假设中的未来需求设计"纪律（`WorldState`/`DangerState`/`ViewerState` 都是在真正
需要它们的节点才定义 shape，不提前builds），本节点只建**有真实消费者或已被 Commander 明确指派**的
四张表：`runtime_sessions`/`runtime_snapshots`/`runtime_events`/`viewer_states`。其余六张表延后到
各自的首个真实消费节点建表，见第 10 节 Non-goals 的归属表。

---

## 2. 架构设计（Commander 已核对真实代码后做出的决策，Codex 按此实现）

### 2.1 关键发现：`RuntimeSnapshot` 的不透明类型无法直接持久化——解决方案是 XState 原生的 persisted-snapshot 机制，不是新开一个后门

DEV-009 的 `RuntimeSnapshot`（CR-008 类型层可见性分区）是故意不透明的品牌类型，`index.ts` 不导出
内部结构，本节点**不能也不应该**破坏这个设计去"偷"内部字段。

正确的解法：XState v5 的 `Actor` 原生自带 `getPersistedSnapshot()`（返回完整可序列化的 context + 各
Region 状态）与 `createActor(machine, { snapshot })`（从持久化快照原样恢复）。`RuntimeActor` 目前的
TS 接口只声明了 `send`/`getSnapshot`，但 `createRuntimeMachine` 返回的真实对象结构上就是一个 XState
actor，`getPersistedSnapshot()` 在运行时确实存在。

本节点对已冻结的 `packages/runtime-kernel` 做**唯二的追加式编辑**（继续 DEV-007 已经用过的模式，
不改动任何既有行）：

```typescript
// machine.ts 追加
export function getPersistedSnapshot(actor: RuntimeActor): unknown
export function restoreRuntimeMachine(input: {
  ports?: Partial<Ports>;
  chapterRootDir: string;
  seed: string;
  persisted: unknown;
}): RuntimeActor
```

`restoreRuntimeMachine` 内部用 `createActor(makeRuntimeMachine(...), { snapshot: input.persisted })`
恢复，其余与 `createRuntimeMachine` 一致（含 `actor.start()`）。这两个函数是 `persistence` 包与
`runtime-kernel` 之间**唯一**的耦合点——`persistence` 全程把 `getPersistedSnapshot` 的返回值当作
不透明的 `unknown`/JSON blob 存取，不解析其内部结构，同样不破坏 CR-008 的信息隐藏原则。

### 2.2 LKG 策略：写穿透（write-through），不做"快照+事件回放"的二次机制

Dev Spec 第 18 节要求崩溃恢复走"`load LKG → Replay events after LKG if needed → resume`"。真正的
"用记录下来的 `RuntimeEvent` 重放重建状态"是 **DEV-011（Deterministic Replay）明确的职责**（第 65
节原文："输入 Event Log → 重建 Runtime"），`runtime-kernel` 目前也没有"重放单条 RuntimeEvent"的能力
（`RuntimeEvent` 是输出型日志，不是可重新喂给机器的输入指令）。

本节点的设计：**每次事件追加后立即连带保存一次完整 persisted snapshot**（成本很低——都是内存态
JSON 序列化，不是重量级操作）。这样 LKG 永远与最新事件序号同步，恢复时**不存在"LKG 之后还有事件
未重放"的间隙**，`load LKG` 单独一步就是完整恢复，不需要在本节点里实现事件回放逻辑。这一决策记入
`DECISIONS.md`，并明确写清：真正意义上的"从任意历史点用 Event Log 重建"是 DEV-011 的范围，本节点
不越界实现。

### 2.3 表结构

```sql
CREATE TABLE IF NOT EXISTS runtime_sessions (
  session_id  TEXT PRIMARY KEY,
  chapter_id  TEXT NOT NULL,
  seed        TEXT NOT NULL,
  started_at  TEXT NOT NULL,
  status      TEXT NOT NULL        -- 'ACTIVE' | 'ENDED' | 'ERROR'
);

CREATE TABLE IF NOT EXISTS runtime_events (
  session_id  TEXT NOT NULL,
  sequence    INTEGER NOT NULL,
  id          TEXT NOT NULL,
  type        TEXT NOT NULL,
  payload     TEXT NOT NULL,       -- JSON.stringify(RuntimeEvent.payload)
  chapter_id  TEXT NOT NULL,
  visibility  TEXT NOT NULL,       -- 'PUBLIC' | 'HIDDEN'
  timestamp   TEXT NOT NULL,
  PRIMARY KEY (session_id, sequence)
);

CREATE TABLE IF NOT EXISTS runtime_snapshots (
  session_id  TEXT NOT NULL,
  sequence    INTEGER NOT NULL,
  persisted   TEXT NOT NULL,       -- JSON.stringify(getPersistedSnapshot(actor))
  chapter_id  TEXT NOT NULL,       -- 第 18 节 "Chapter Version" 的替代——见 DECISIONS
  created_at  TEXT NOT NULL,
  PRIMARY KEY (session_id, sequence)
);

CREATE TABLE IF NOT EXISTS viewer_states (
  platform             TEXT NOT NULL,
  viewer_id            TEXT NOT NULL,
  hp                   INTEGER NOT NULL,
  life                 INTEGER NOT NULL,
  alive                INTEGER NOT NULL,   -- 0/1
  last_choice          TEXT,
  participation_count  INTEGER NOT NULL,
  joined_chapter_at    INTEGER,
  created_at           TEXT NOT NULL,
  last_seen_at         TEXT NOT NULL,
  PRIMARY KEY (platform, viewer_id)
);
```

`viewer_states` 字段严格对齐 Dev Spec 第 15 节 `ViewerState`（`platform + viewerId` 复合身份键），
`created_at`/`last_seen_at` 是 CR-017 的强制要求。**不实现 purge/retention job**（CR-017 已明确指派
给 DEV-054/DEV-081）。

**"Chapter Version" 的已知缺口**：第 18 节 LKG 要求包含 "Chapter Version"，但 `chapter-schema` 的
`manifest.ts` 目前没有任何 version 字段（已核实）。本节点用已有的 `chapterId` 作为可用的最接近替代，
如实记录缺口，不因此去修改冻结的 `chapter-schema`（超出本节点授权范围）。

### 2.4 SQLite 驱动：用 Node 内置 `node:sqlite`，不新增 npm 依赖

当前环境 Node 版本为 v24（已核实 `node -v` → v24.18.0），`node:sqlite`（`DatabaseSync`）已随 Node
内置且稳定，不需要 `better-sqlite3` 这类需要 C++ 工具链编译的原生依赖。本节点**不得**添加任何新的
npm 依赖，`packages/persistence/package.json` 的 `dependencies` 只应包含
`@interactive-story/runtime-kernel`、`@interactive-story/shared`。若实测发现当前 Node 版本仍需要
`--experimental-sqlite` 之类的运行时标志，发 `EXECUTOR_QUERY`，不要通过修改任何构建/测试脚本的隐藏
方式绕过。

### 2.5 `getHealth()`——本节点适用 CR-019，且是恰当的落地时机

`persistence` 是持续被调用的运行时服务模块（CR-019：自落地起就实现 `getHealth()`），且"能否成功
执行一次简单查询"是一个天然、低成本、可验证的健康检查，不像 DEV-009 那样需要发明一整套体系。本
节点**必须**交付：

```typescript
export function getHealth(db: DatabaseSync): Health   // Health 来自 @interactive-story/shared
```

`status: 'OK'` 当 `SELECT 1` 成功；`'DOWN'` 当抛异常（`error` 字段记录异常信息）；`lastSuccessAt`/
`latencyMs` 用 `Date.now()` 计时。**这里允许使用裸 `Date.now()`**——运行时确定性红线（禁止
`Math.random()`/裸 `Date.now()`）专门约束的是 `runtime-kernel` 里会进入 Replay 的游戏状态转移
（DEV-005/DEV-009 的既有先例），`getHealth()` 是运维遥测，不进入 Event Log/Replay，不适用该红线。
这一区分记入 `DECISIONS.md`，避免审计时被误套用错误的红线判定。

### 2.6 端到端验证场景——证明整条链路真的能用

本节点必须有一个测试，完整走一遍"驱动 actor → 写事件+快照 → 模拟崩溃（丢弃内存中的 actor 引用）
→ `restoreSession` 恢复出全新 actor → 断言恢复后的 `getStoryPhase`/`getInteractionPhase`/
`getEventLog` 与崩溃前逐字段一致"。用真实的 `runtime-kernel`（不 mock）+ 真实的 `node:sqlite`
（`:memory:` 或临时文件，不 mock），复用 `packages/chapter-compiler/test-fixtures/valid-minimal`
（只读引用，参考 `machine.test.ts`/DEV-007 `simulator.test.ts` 的驱动手法）。

---

## 3. Scope

### Writable Scope — 新建包

```
packages/persistence/package.json
packages/persistence/tsconfig.json
packages/persistence/src/db.ts
packages/persistence/src/db.test.ts
packages/persistence/src/sessionStore.ts
packages/persistence/src/sessionStore.test.ts
packages/persistence/src/eventStore.ts
packages/persistence/src/eventStore.test.ts
packages/persistence/src/snapshotStore.ts
packages/persistence/src/snapshotStore.test.ts
packages/persistence/src/recovery.ts
packages/persistence/src/recovery.test.ts
packages/persistence/src/viewerState.ts
packages/persistence/src/viewerState.test.ts
packages/persistence/src/health.ts
packages/persistence/src/health.test.ts
packages/persistence/src/index.ts
```

### Writable Scope — 既有文件，仅追加（唯二两个文件，逐行核对不得删改既有内容）

```
packages/runtime-kernel/src/machine.ts   （追加 getPersistedSnapshot / restoreRuntimeMachine）
packages/runtime-kernel/src/index.ts     （追加导出）
```

### Writable Scope — 根配置（追加式）

```
根 tsconfig.json（若 solution 级 references 缺少 packages/persistence，需追加；不改动既有条目）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-010/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/runtime-kernel/src/ 下除 machine.ts/index.ts 外的全部文件（含各自 .test.ts）
packages/runtime-kernel/package.json、tsconfig.json——本节点不需要新依赖，不动
packages/chapter-schema/**、packages/chapter-compiler/**（含 test-fixtures/**）、
  packages/rule-engine/**、packages/dice-engine/**、packages/narrative-composer/**、
  packages/shared/**
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
eslint.config.js、.prettierrc.json、vitest.config.ts
```

### Forbidden Scope

```
packages/* 除 runtime-kernel（唯二两文件）与新建的 persistence 外的任何目录
apps/**、chapters/**、assets/**、scripts/**、tools/**
真正的"用 Event Log 重放重建状态"逻辑（DEV-011）
purge/retention job（CR-017 已指派 DEV-054/DEV-081）
`audio_cache`/`platform_events`/`errors`/`chapter_runs`/`host_viewer_memory`/
  `host_running_jokes` 六张表（见第 10 节 Non-goals 归属）
新增任何 npm 依赖（`node:sqlite` 是 Node 内置模块，不需要）
把 persistence 接入任何真实驱动循环/服务器（DEV-012 Runtime API 的职责）
对 `chapter-schema`/`manifest.ts` 的任何修改（"Chapter Version" 缺口不在本节点修）
```

---

## 4. Required Skills

### Required

- Node.js 内置 `node:sqlite`（`DatabaseSync`）的基本用法（`exec`/`prepare`/`run`/`all`）
- 阅读 XState v5 `Actor.getPersistedSnapshot()`/`createActor(machine, {snapshot})` 的语义

### Forbidden / Unnecessary

- 任何 ORM 框架、连接池、迁移框架（表结构目前用 `CREATE TABLE IF NOT EXISTS` 即可，无需版本化迁移机制）
- 第 70 节禁止清单全部（含 Redis/Kafka 等——本节点只用 SQLite）

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `createRuntimeMachine`/`getStoryPhase`/`getInteractionPhase`/`getEventLog`（runtime-kernel，DEV-009/DEV-007 冻结） | 端到端验证测试驱动 actor |
| `getPersistedSnapshot`/`restoreRuntimeMachine`（本节点新增，追加进 machine.ts） | LKG 保存与恢复的唯一耦合点 |
| `Health`（`@interactive-story/shared`，DEV-000 冻结） | `getHealth()` 返回类型 |
| `packages/chapter-compiler/test-fixtures/valid-minimal`（Read-only 引用） | 端到端测试的章节素材 |

---

## 6. Outputs

1. `packages/persistence`：`db.ts`/`sessionStore.ts`/`eventStore.ts`/`snapshotStore.ts`/
   `recovery.ts`/`viewerState.ts`/`health.ts`/`index.ts`
2. `runtime-kernel` 追加导出：`getPersistedSnapshot`、`restoreRuntimeMachine`
3. `specs/dev/DEV-010/DECISIONS.md`，记录：写穿透 LKG 策略理由、"Chapter Version" 缺口处置、
   `node:sqlite` 选型理由、`getHealth()` 允许用 `Date.now()` 的红线适用范围澄清、六张延后表的归属

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-010/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Acceptance**：四文件存在；`INDEX.md` 含 Task Order T001–T009。

---

### T002 — 新包脚手架

- **Allowed Files**：`packages/persistence/package.json`、`packages/persistence/tsconfig.json`、根 `tsconfig.json`（仅追加 references，不改既有条目）
- **Requirements**：
  1. `package.json`：`name: "@interactive-story/persistence"`，`dependencies` 只含
     `@interactive-story/runtime-kernel`、`@interactive-story/shared`。
  2. `tsconfig.json`：沿用其余包一致的 `composite`/`references` 结构（参照 `runtime-kernel` 或
     `narrative-composer` 现有写法，不要重新发明配置风格）。
- **Acceptance**：`pnpm install` 成功；新包能被 workspace 正确识别（`pnpm -F @interactive-story/persistence typecheck` 或等价命令可运行，即便此刻源码为空）。

---

### T003 — `runtime-kernel` 追加：LKG 序列化耦合点

- **Allowed Files**：`packages/runtime-kernel/src/machine.ts`（**仅追加**）、`packages/runtime-kernel/src/index.ts`（**仅追加**）
- **Requirements**：按第 2.1 节实现 `getPersistedSnapshot`/`restoreRuntimeMachine`，`index.ts` 追加对应导出。
- **Acceptance**：`getPersistedSnapshot(actor)` 返回值可 `JSON.stringify`；`restoreRuntimeMachine({..., persisted})` 恢复出的 actor 的 `getStoryPhase`/`getInteractionPhase`/`getEventLog` 与恢复前逐字段一致；`git diff` 显示两文件只有新增行。

---

### T004 — `db.ts`：连接与建表

- **Allowed Files**：`src/db.ts`、`src/db.test.ts`
- **Requirements**：按第 2.3/2.4 节，`openDatabase(path: string)`（支持 `:memory:`）+ `initSchema(db)` 建四张表。
- **Acceptance**：对 `:memory:` 与临时文件路径均能成功建表；重复调用 `initSchema` 幂等（`IF NOT EXISTS`）。

---

### T005 — `sessionStore.ts` + `eventStore.ts`

- **Allowed Files**：`src/sessionStore.ts`、`src/sessionStore.test.ts`、`src/eventStore.ts`、`src/eventStore.test.ts`
- **Requirements**：
  1. `createSession`/`getSession`/`endSession`（更新 `status`）。
  2. `appendEvents(db, sessionId, events: readonly RuntimeEvent[])`（批量追加，`payload` 用
     `JSON.stringify`）、`loadEvents(db, sessionId): RuntimeEvent[]`（按 `sequence` 升序，`payload`
     还原为 `JSON.parse`）。
- **Acceptance**：往返（写入再读出）的 `RuntimeEvent[]` 与原始输入逐字段相等；`loadEvents` 顺序正确。

---

### T006 — `snapshotStore.ts` + `recovery.ts`（写穿透 LKG + 恢复）

- **Allowed Files**：`src/snapshotStore.ts`、`src/snapshotStore.test.ts`、`src/recovery.ts`、`src/recovery.test.ts`
- **Requirements**：
  1. `saveSnapshot(db, sessionId, sequence, persisted, chapterId)`、
     `loadLatestSnapshot(db, sessionId)`（取 `sequence` 最大的一行）。
  2. `restoreSession(db, input: { sessionId; chapterRootDir; seed; ports? }): RuntimeActor`：读最新
     `runtime_snapshots` 行，`JSON.parse` 后交给 `restoreRuntimeMachine` 恢复。
- **Acceptance**：按第 2.6 节的端到端场景——驱动一个 actor 跑若干步，每步后 `appendEvents` +
  `saveSnapshot`（写穿透），丢弃内存引用后 `restoreSession` 恢复，断言恢复后 `getStoryPhase`/
  `getInteractionPhase`/`getEventLog` 与崩溃前完全一致。

---

### T007 — `viewerState.ts`

- **Allowed Files**：`src/viewerState.ts`、`src/viewerState.test.ts`
- **Requirements**：按第 2.3 节表结构，`upsertViewerState(db, state: ViewerState)`、
  `getViewerState(db, platform, viewerId): ViewerState | undefined`；`ViewerState` 接口按 Dev Spec
  第 15 节字段原样定义（`platform`/`viewerId`/`hp`/`life`/`alive`/`lastChoice?`/
  `participationCount`/`joinedChapterAt?`），不新增字段。
- **Acceptance**：`upsert` 对同一 `(platform, viewerId)` 二次调用更新而非重复插入（复合主键约束）；`created_at` 只在首次插入写入，`last_seen_at` 每次 upsert 都更新。

---

### T008 — `health.ts`

- **Allowed Files**：`src/health.ts`、`src/health.test.ts`
- **Requirements**：按第 2.5 节实现 `getHealth(db): Health`。
- **Acceptance**：正常数据库返回 `status: 'OK'`；对已关闭/损坏的 db 句柄返回 `status: 'DOWN'` 且 `error` 非空。

---

### T009 — Public exports、全量验证、REPORT 与 commit

- **Allowed Files**：`packages/persistence/src/index.ts`、`specs/dev/DEV-010/INDEX.md`、`REPORT.md`、`DECISIONS.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-010.md`
- **Requirements**：
  1. `index.ts` 汇总导出 T004–T008 全部公开符号 + `ViewerState` 类型。
  2. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  3. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  4. **`DECISIONS.md` 必须已提交**，覆盖第 6 节列出的全部要点。
  5. 更新 `INDEX.md`：T001–T009 全部勾选。
  6. `git add -A && git commit`，提交信息首行：`DEV-010: persistence`。
  7. 追加 LEDGER 行，发 `NODE_REPORT`。
  8. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`REPORT.md` 引用的全部文档已入库；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-010 INDEX

Status: IN_PROGRESS

## Current Node

DEV-010 — Persistence

## Objective

首次创建 `packages/persistence`：SQLite（Node 内置 `node:sqlite`）存储 `runtime_sessions`/
`runtime_events`/`runtime_snapshots`/`viewer_states` 四张表；用 XState 原生
`getPersistedSnapshot`/`createActor(machine,{snapshot})`（追加进已冻结的 `runtime-kernel`）实现
写穿透 LKG，崩溃后可完整恢复 Runtime Actor，不需要事件回放（那是 DEV-011 的职责）。

## Allowed Scope（新建包）
（抄录 Task Package 第 3 节实际条目）

## Allowed Scope（既有文件，仅追加）
（抄录 Task Package 第 3 节实际条目——runtime-kernel 的 machine.ts / index.ts + 根 tsconfig.json，
且逐行核对不得删改既有内容）

## Read-only Scope
（抄录 Task Package 第 3 节实际条目）

## Forbidden Scope
（抄录 Task Package 第 3 节实际条目，含六张延后表清单）

## Task Order

- [ ] T001 节点文档
- [ ] T002 新包脚手架
- [ ] T003 runtime-kernel 追加：LKG 序列化耦合点
- [ ] T004 db.ts：连接与建表
- [ ] T005 sessionStore.ts + eventStore.ts
- [ ] T006 snapshotStore.ts + recovery.ts（写穿透 LKG + 恢复）
- [ ] T007 viewerState.ts
- [ ] T008 health.ts
- [ ] T009 Public exports + 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001（每完成一个 Task 立即勾选并更新本字段）

## Exit Criteria

六条命令全部退出码 0；端到端崩溃恢复测试通过（恢复后状态与崩溃前逐字段一致）；
`machine.ts`/`index.ts` 的 git diff 只有新增行；`DECISIONS.md` 已入库；REPORT.md 完成且
Status = READY_FOR_REVIEW；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **不得修改 `runtime-kernel` 除 `machine.ts`/`index.ts` 外的任何文件**，且这两个文件只能追加。
2. **不新增任何 npm 依赖**——`node:sqlite` 是 Node 内置模块。
3. **不实现事件回放**（DEV-011 职责）、**不实现 purge/retention job**（DEV-054/081 职责）。
4. **只建四张表**（`runtime_sessions`/`runtime_events`/`runtime_snapshots`/`viewer_states`），其余六张 Non-goals 列出的表不得创建。
5. `getHealth()` 允许使用裸 `Date.now()`（第 2.5 节已说明理由，不适用 `runtime-kernel` 的确定性红线）；除此之外，本包**不应该**出现需要确定性的逻辑（本节点不涉及 Replay 相关计算）。
6. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
7. 遇到必须修改 Writable Scope 之外文件才能推进（例如发现 Node 版本确实需要 `--experimental-sqlite` 标志）：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- **六张表延后到各自首个真实消费节点**：

  | 表 | 归属节点 |
  |---|---|
  | `audio_cache` | DEV-036（Audio Cache，第 51 节已定义 key 组成） |
  | `platform_events` | M4 组（DEV-040～046） |
  | `errors` | DEV-062（Error Registry） |
  | `chapter_runs` | 待定，非本节点授权范围 |
  | `host_viewer_memory` | DEV-054（Viewer Memory）——CR-017 的 `platform`+`created_at`/`last_seen_at` 列约束对该节点仍然有效，只是建表本身延后，因为目前无任何已定义的 shape，本节点强行建表纯属猜测 |
  | `host_running_jokes` | 同上，DEV-054 |

- 不实现用 Event Log 从任意历史点重建状态的重放逻辑（DEV-011）。
- 不把 persistence 接入任何真实驱动循环/服务器进程（DEV-012 Runtime API 的职责）。
- 不实现数据库迁移框架（当前只需要 `CREATE TABLE IF NOT EXISTS`，版本化 schema 迁移留到真正需要
  变更表结构时再引入）。
- 不修改 `chapter-schema`（"Chapter Version" 缺口不在本节点修复）。
- 不实现 Operator Console（第 52/53 节）的 `Restore LKG` 操作入口——本节点只提供
  `restoreSession` 这个底层能力，UI/操作入口是 DEV-060A/DEV-060B 的职责。

---

## 11. Tests

### Unit tests

T004–T008 各自 `.test.ts`：覆盖第 7 节各任务描述的具体行为。

### Regression tests

`pnpm test` 覆盖全 workspace；既有全部包测试零回归。

### 其余测试类型

不适用（Replay/Fuzz/Soak 属 DEV-011 及后续节点）。

---

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `packages/persistence/package.json` 的 `dependencies` 只含 `@interactive-story/runtime-kernel`、`@interactive-story/shared`，无新增 npm 包 | 文件检查 |
| A08 | `machine.ts`/`index.ts` 的 `git diff` 只包含新增行，无删除/修改任何既有行 | git diff 比对 |
| A09 | `getPersistedSnapshot`/`restoreRuntimeMachine` 往返一致（恢复后 phase/eventLog 与恢复前相同） | 测试检查 |
| A10 | 四张表（且仅四张表）被创建，`initSchema` 幂等 | 测试检查 |
| A11 | `appendEvents`/`loadEvents` 往返 `RuntimeEvent[]` 逐字段相等，顺序按 `sequence` | 测试检查 |
| A12 | 端到端崩溃恢复场景（第 2.6 节）通过：真实 actor + 真实 `node:sqlite`，恢复后状态与崩溃前逐字段一致 | 测试检查 |
| A13 | `viewerState` upsert 语义正确（同键更新不重复插入，`created_at`/`last_seen_at` 行为符合第 7 节 T007 要求） | 测试检查 |
| A14 | `getHealth` 对正常/异常数据库句柄分别返回 `OK`/`DOWN` | 测试检查 |
| A15 | 除四张授权表外，未创建 Non-goals 列出的任何一张表 | 测试/代码检查 |
| A16 | `packages/runtime-kernel` 除 `machine.ts`/`index.ts` 外的既有冻结文件 git diff 为空 | git diff 比对 |
| A17 | `packages/chapter-schema`/`chapter-compiler`/`rule-engine`/`dice-engine`/`narrative-composer` 全部未被修改 | git diff 比对 |
| A18 | 未新增任何 npm 依赖（`pnpm-lock.yaml` 变化仅反映 workspace 内部包链接，无新第三方包） | 文件检查 |
| A19 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A20 | `specs/dev/DEV-010/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T009 全部勾选 | 文件 + 文本检查 |
| A21 | `git log` 新增恰 1 条提交，首行 `DEV-010: persistence`；提交时 `git status --porcelain` 为空 | 命令 |
| A22 | LEDGER 含 `NODE_REPORT-DEV-010` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A23 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT（含确认 `DECISIONS.md` 已提交）→ commit → 发 NODE_REPORT → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A23。
