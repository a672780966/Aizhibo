# TASK PACKAGE — DEV-054

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-054 |
| Node Name | Viewer Memory |
| Milestone | M5 — AI Host Complete（第六个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-010（DONE，`persistence` 包与 `viewer_states` 表已存在）；DEV-052/DEV-053（DONE，`ai-host` 内同类"基础设施不发明内容"先例） |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### 现实核对：`host_viewer_memory`/`host_running_jokes` 两张表的建表本身已被 CR-017 明确延后到本节点，列约束是强制约束不是本节点可以重新讨论的

`specs/dev/DAG.md` 第 52 行（CR-017）与第 54-60 行（"CR-017 执行澄清"）
记录了 DEV-010 起草时的明确裁定：`viewer_states` 已按 Dev Spec 第 15
节建表，但 `host_viewer_memory`/`host_running_jokes` 当时"没有任何
已定义的 shape"（AI Host 记忆模型是本节点的产物，M5 当时尚未开工），
"在毫无 shape 依据的情况下建表纯属猜测列结构"，所以 DEV-010 明确把
**这两张表的建表本身延后到 DEV-054**，但列约束继续强制有效：**必含
`platform` 列与 `created_at`/`last_seen_at`**，且**保留策略必须按
平台配置，不能硬编码**。本节点就是被延后建表任务的执行方，不是
"要不要建表"的自由裁量，是"终于可以建表了，按已冻结的列约束建"。

### 现实核对：`host-memory` 是包结构表里明确列出的独立第 17 个包，且明确禁止自持 DB 连接或 schema——本节点必须创建这个新包，且新表/schema 必须落在 `persistence` 里

`specs/dev/DAG.md` 第 404-413 行（"包结构 Rev 2"）列出仓库最终 17 个
包，其中包含 `host-memory`（与 `ai-host`/`persistence` 并列，是三个
不同的包）。第 413 行明确写"`host-memory` 不得自持 DB 连接或
schema"。核对现状：`persistence` 包（`packages/persistence/`）已有
`db.ts`（`openDatabase`/`initSchema`）、`viewerState.ts`（CRUD 范式
参照）、`health.ts`（`getHealth(db): Health`，CR-019）。

**取舍**：
1. 两张新表的 `CREATE TABLE` 语句加进 `persistence/src/db.ts` 的
   `initSchema()`（沿用 `viewer_states` 的列命名风格），**不在
   `host-memory` 里另开 schema**。
2. 两张表的原始 CRUD（含"按绝对时间戳删除过期行"的底层删除函数，
   不做"按相对时长转换"的业务逻辑）加进 `persistence`
   （`hostViewerMemory.ts`/`hostRunningJokes.ts`，沿用
   `viewerState.ts` 的"传入 `DatabaseSync`，函数不持有连接"范式）。
3. 新建 `packages/host-memory` 包，只依赖 `persistence`（workspace
   依赖），提供面向 Host 消费的高层 API（`createHostMemory(db)`）：
   把"记住一个观众/回忆一个观众/记一个梗/列出梗/按平台保留策略清理
   过期数据"这几件事包装成语义清晰的方法，**内部把"per-platform
   相对保留时长"换算成绝对截止时间戳后再调用 `persistence` 的底层
   删除函数**——"按平台配置"这层业务逻辑放在 `host-memory`，
   `persistence` 继续保持"只做机械 CRUD，不含业务规则"的既有风格。
   `host-memory` 本身**不 `import` `node:sqlite`、不调用
   `openDatabase`、不写任何 `CREATE TABLE`**。

### 现实核对：不发明 Viewer Memory/Running Joke 的具体字段内容，同 DEV-052/053 的"不发明创作内容"取舍精神

Dev Spec 第 37 节把 Viewer Memory 列为 Host Context 八项输入之一，
第 36 节把"建立直播间内部梗"列为 Host 职责，但全篇未定义"该记住
观众的什么"或"梗记录该有哪些字段"。同 DEV-052（`voiceDescription`
自由文本）/DEV-053（`label` 自由文本）的取舍：`HostViewerMemoryEntry`
用单一自由文本 `note` 字段代表"Host 记住这个观众的什么"，
`HostRunningJokeEntry` 用单一自由文本 `text` 字段代表梗的内容本身，
不发明结构化的"好感度分数""互动次数分类"等 Dev Spec 未定义的字段。

### 范围核对：不接入 Host Scheduler/LLM Provider，不实现真正的"记忆检索/相关性排序"算法，purge 由调用方主动触发不做后台定时任务

同 DEV-052/053：把 Viewer Memory 拼进 LLM prompt 是 DEV-055/056 的
职责。`recallViewer`/`listRunningJokes` 只做"按 key 精确查询/按
platform 列出全部"，不做任何相关性排序/摘要/相似度检索（Dev Spec
没有定义这类算法）。`purge()` 是一个**同步方法，由调用方主动
调用**，本节点不实现任何 `setInterval`/后台定时任务/进程——Runtime
生命周期管理是 Ops 里程碑（M6）的职责，本节点只提供"清理这一动作
本身"的正确实现。第 56 节把"Viewer memory error"列为 L1（非关键，
"忽略，故事继续"）——本节点的 CRUD 函数遇到 DB 错误应该让异常正常
抛出（不吞掉），由调用方按 L1 语义决定"忽略并继续"，本节点不负责
错误降级策略本身。

---

## 2. 架构设计

### 2.1 `packages/persistence/src/db.ts`（修改，追加两张表）

在 `initSchema()` 现有 SQL 字符串末尾（`viewer_states` 表定义之后）
追加：

```sql
CREATE TABLE IF NOT EXISTS host_viewer_memory (
  platform TEXT NOT NULL,
  viewer_id TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  PRIMARY KEY (platform, viewer_id)
);

CREATE TABLE IF NOT EXISTS host_running_jokes (
  id TEXT NOT NULL,
  platform TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  PRIMARY KEY (platform, id)
);
```

不改动 `runtime_sessions`/`runtime_events`/`runtime_snapshots`/
`viewer_states` 四张既有表的任何一行。

### 2.2 `packages/persistence/src/hostViewerMemory.ts`（新文件）

```typescript
export interface HostViewerMemoryEntry {
  platform: string;
  viewerId: string;
  note: string;
}

export function upsertHostViewerMemory(db: DatabaseSync, entry: HostViewerMemoryEntry): void;
export function getHostViewerMemory(db: DatabaseSync, platform: string, viewerId: string): HostViewerMemoryEntry | undefined;
export function deleteExpiredHostViewerMemory(db: DatabaseSync, platform: string, olderThanIso: string): void;
```

- `upsertHostViewerMemory`：沿用 `viewerState.ts` 的
  `INSERT ... ON CONFLICT (platform, viewer_id) DO UPDATE` 范式，
  `created_at` 只在首次插入写入，`last_seen_at` 每次写入都更新为
  当前时间。
- `deleteExpiredHostViewerMemory`：机械删除
  `platform = ? AND last_seen_at < ?` 的行，`olderThanIso` 是
  调用方算好的绝对时间戳（ISO 字符串），本函数不做任何"相对时长"
  换算——那是 `host-memory` 的职责。

### 2.3 `packages/persistence/src/hostRunningJokes.ts`（新文件）

```typescript
export interface HostRunningJokeEntry {
  id: string;
  platform: string;
  text: string;
}

export function addHostRunningJoke(db: DatabaseSync, entry: HostRunningJokeEntry): void;
export function listHostRunningJokes(db: DatabaseSync, platform: string): HostRunningJokeEntry[];
export function deleteExpiredHostRunningJokes(db: DatabaseSync, platform: string, olderThanIso: string): void;
```

- `addHostRunningJoke`：`INSERT`（`id` 由调用方提供，不在本层生成
  UUID——同"不发明未被要求的机制"取舍），`created_at`/`last_seen_at`
  写入时都设为当前时间。
- `listHostRunningJokes`：按 `platform` 查询全部，不做分页/排序
  以外的处理（按 `created_at` 升序返回即可）。
- `deleteExpiredHostRunningJokes`：同 `deleteExpiredHostViewerMemory`
  的机械删除范式，按 `created_at < olderThanIso` 删除。

### 2.4 `packages/persistence/src/index.ts`（修改，追加导出）

追加两行：
```typescript
export { getHostViewerMemory, upsertHostViewerMemory, deleteExpiredHostViewerMemory, type HostViewerMemoryEntry } from './hostViewerMemory.js';
export { addHostRunningJoke, listHostRunningJokes, deleteExpiredHostRunningJokes, type HostRunningJokeEntry } from './hostRunningJokes.js';
```

不改动既有五行导出。

### 2.5 `packages/host-memory/`（新建包）

- `package.json`：`name: "@interactive-story/host-memory"`，仅依赖
  `@interactive-story/persistence`（workspace:*）与
  `@interactive-story/shared`（workspace:*，`Health` 类型）。
- `tsconfig.json`：与 `ai-host`/`persistence` 同构。
- `src/hostMemory.ts`：

```typescript
export interface HostMemory {
  rememberViewer(platform: string, viewerId: string, note: string): void;
  recallViewer(platform: string, viewerId: string): HostViewerMemoryEntry | undefined;
  addRunningJoke(platform: string, id: string, text: string): void;
  listRunningJokes(platform: string): HostRunningJokeEntry[];
  purge(retentionMsByPlatform: Record<string, number>): void;
  getHealth(): Health;
}

export function createHostMemory(db: DatabaseSync): HostMemory;
```

- `rememberViewer`/`recallViewer`/`addRunningJoke`/`listRunningJokes`
  直接调用 `persistence` 对应函数，纯转发，不加额外逻辑。
- `purge(retentionMsByPlatform)`：对传入的每个
  `{ platform: retentionMs }` 键值对，计算
  `olderThanIso = new Date(Date.now() - retentionMs).toISOString()`，
  分别调用 `deleteExpiredHostViewerMemory`/`deleteExpiredHostRunningJokes`。
  **不接受空对象之外的隐式默认值**——未在 `retentionMsByPlatform`
  里列出的 platform 不做任何清理（调用方必须显式决定每个平台的
  保留策略，符合 CR-017"按平台配置而非硬编码"）。
- `getHealth()`：转发 `persistence` 的 `getHealth(db)`（CR-019
  自落地起即实现，`host-memory` 本身不持有额外可健康检查的资源，
  委托给它唯一依赖的 `persistence` 连接状态）。
- **零新增第三方依赖**；**不 import `node:sqlite`**；**不调用
  `openDatabase`/`initSchema`**（`db` 由调用方在 Runtime 组合层
  打开后传入，同 `viewerState.ts`/`health.ts` 现有范式）。

---

## 3. Scope

### Writable Scope

```
packages/persistence/src/db.ts                （修改，仅追加两张表定义，不改既有四张表）
packages/persistence/src/hostViewerMemory.ts   （新增）
packages/persistence/src/hostViewerMemory.test.ts（新增）
packages/persistence/src/hostRunningJokes.ts   （新增）
packages/persistence/src/hostRunningJokes.test.ts（新增）
packages/persistence/src/index.ts              （修改，仅追加两行导出）
packages/host-memory/package.json              （新增）
packages/host-memory/tsconfig.json             （新增）
packages/host-memory/src/hostMemory.ts         （新增）
packages/host-memory/src/hostMemory.test.ts    （新增）
packages/host-memory/src/index.ts              （新增）
tsconfig.json                                  （根，修改，追加一行 { "path": "./packages/host-memory" }，排在既有引用之后）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-054/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交，同 Constraint 7）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/persistence/src/viewerState.ts（Read-only，CRUD 范式参照，不改）
packages/persistence/src/health.ts（Read-only，getHealth 范式参照，不改）
packages/persistence/src/sessionStore.ts、eventStore.ts、snapshotStore.ts、recovery.ts（Read-only，不改）
packages/ai-host/**（Read-only，不 import——`ai-host` 与 `host-memory` 是两个独立包，本节点不接线两者）
其余同既有节点惯例
```

### Forbidden Scope

```
修改 packages/persistence/src/viewerState.ts、health.ts、sessionStore.ts、eventStore.ts、snapshotStore.ts、recovery.ts（既有四张表/既有功能零改动）
修改 packages/ai-host/**、packages/platform-core/**、packages/platform-twitch/**、packages/runtime-kernel/**
在 host-memory 包内 import 'node:sqlite'、调用 openDatabase/initSchema、编写任何 CREATE TABLE
实现相关性排序/摘要/相似度检索算法
实现后台定时清理任务（setInterval/进程/调度器）
硬编码任何全局保留时长默认值（retention 必须整个由调用方传入）
接入 Host Scheduler/Host LLM Provider/prompt 拼装（未来节点职责）
新增第三方 npm 依赖
```

---

## 4. Required Skills

### Required

- `node:sqlite` 同步 API CRUD（沿用 `viewerState.ts` 范式）
- pnpm workspace 新建包（package.json/tsconfig.json/根 tsconfig 引用，沿用 `ai-host` DEV-050A 先例）

### Forbidden / Unnecessary

- 任何向量检索/embedding/相关性排序依赖
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/dev/DAG.md` 第 52、54-60、404-413 行（CR-017 + 包结构 Rev 2） | 两张表列约束与 `host-memory` 包边界的唯一权威来源 |
| `packages/persistence/src/viewerState.ts`（Read-only） | CRUD 范式参照 |
| `packages/persistence/src/health.ts`（Read-only） | `getHealth(db): Health` 范式参照（CR-019） |
| `packages/ai-host/src/hostPersona.ts`/`hostMood.ts`（Read-only，DEV-052/053 冻结） | "自由文本字段、不发明结构化内容"取舍先例参照 |

---

## 6. Outputs

1. `persistence` 追加：`host_viewer_memory`/`host_running_jokes` 两张
   表 + 对应 CRUD/删除函数。
2. 新包 `packages/host-memory`：`createHostMemory(db)` 高层 API。
3. `specs/dev/DEV-054/DECISIONS.md`，至少覆盖：为何两张表建表本身
   延后到本节点才做（CR-017 澄清引用）、为何 schema/DB 连接必须留在
   `persistence`（"host-memory 不得自持 DB 连接或 schema"引用）、
   为何 `note`/`text` 用自由文本不发明结构化字段、为何 `purge` 的
   保留时长必须整个由调用方传入不允许隐式默认、为何 purge 是同步
   方法不是后台定时任务。

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-054/{INDEX,REQUIREMENTS,ACCEPTANCE,REPORT}.md`
- **Acceptance**：四份节点文档存在；`INDEX.md` 含 Task Order T001–T002。

---

### T002 — 两张表 + CRUD + `host-memory` 新包 + 测试 + 全量验证、REPORT 与 commit

- **Allowed Files**：见第 3 节 Writable Scope 全部文件 + `specs/dev/DEV-054/{INDEX,REPORT,DECISIONS}.md`
- **Requirements**：按第 2 节实现。
- **Acceptance（功能部分）**：
  - `initSchema()` 后 `host_viewer_memory`/`host_running_jokes` 两
    张表存在，列名/约束与第 2.1 节一致。
  - `upsertHostViewerMemory` 首次写入后 `getHostViewerMemory` 能
    读到；同一 `(platform, viewerId)` 二次写入更新 `note` 与
    `last_seen_at`，`created_at` 保持首次写入时的值不变。
  - `addHostRunningJoke` 写入后 `listHostRunningJokes` 能读到；
    同一 `platform` 下多条记录按 `created_at` 升序返回。
  - `deleteExpiredHostViewerMemory`/`deleteExpiredHostRunningJokes`
    只删除 `last_seen_at`/`created_at` 早于给定截止时间的行，
    未过期的行不受影响；只删除指定 `platform` 的行，不影响其他
    platform 的同名/同期数据（验证按平台隔离）。
  - `host-memory` 的 `createHostMemory(db).rememberViewer`/
    `recallViewer`/`addRunningJoke`/`listRunningJokes` 正确转发
    到 `persistence` 对应函数（可用同一个内存 SQLite `db` 实例
    验证端到端行为）。
  - `purge({ platformA: 短保留期, platformB: 长保留期 })`：对
    `platformA` 的旧数据被清理、`platformB` 同期的数据因保留期
    更长而不被清理（验证"按平台配置"真正生效，不是全局一刀切）；
    未在参数里列出的第三个 platform 的数据完全不受影响（验证不做
    隐式默认清理）。
  - `getHealth()` 在 DB 正常时返回 `status: 'OK'`。
- **Requirements（回归部分）**：`pnpm test` 全量跑通，既有全部包
  测试零改动通过；`viewer_states`/`runtime_sessions`/
  `runtime_events`/`runtime_snapshots` 四张既有表相关测试零回归。
- **Requirements（验证部分）**：
  1. `persistence/src/index.ts` 与 `host-memory/src/index.ts`
     追加/建立导出。
  2. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  3. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  4. **`DECISIONS.md` 必须已提交**。
  5. 更新 `INDEX.md`：T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW`。
  6. **写入（不提交）** `specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-054.md` 消息文件与 `specs/comms/LEDGER.md` 追加行（msg_id 取当前最大序号 + 1）。
  7. `git add`（仅本节点 Writable Scope 内文件，**不包含** LEDGER.md 与刚写的 NODE_REPORT 消息文件）`&& git commit`，首行：`DEV-054: viewer memory (host_viewer_memory/host_running_jokes tables + host-memory package)`，**恰 1 条提交**。
  8. 自行核实：`git log -1` 只看到这一条新提交、NODE_REPORT 消息文件与 LEDGER 追加行存在于工作区但未提交。
  9. **STOP**。
- **Acceptance（命令部分）**：六条命令全部退出码 0；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-054 INDEX

Status: IN_PROGRESS

## Current Node

DEV-054 — Viewer Memory

## Objective

`persistence` 追加 `host_viewer_memory`/`host_running_jokes` 两张表
（CR-017 延后至本节点建表，列约束强制：`platform`+
`created_at`/`last_seen_at`）+ 对应 CRUD/机械删除函数；新建独立包
`packages/host-memory`（`createHostMemory(db)`），不自持 DB 连接或
schema，`purge()` 按调用方传入的 per-platform 保留时长清理过期
数据，不硬编码默认值，不做后台定时任务。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 两张表 + CRUD + host-memory 新包 + 测试 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与
NODE_REPORT 消息文件已写入工作区但**未提交**。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **两张新表的列约束是强制约束**（CR-017）：`platform` +
   `created_at`/`last_seen_at` 必须都有，不能省略或改名。
2. **`host-memory` 包绝对不能自持 DB 连接或 schema**——不
   `import 'node:sqlite'`、不调用 `openDatabase`/`initSchema`、
   不写任何 `CREATE TABLE`。
3. **保留策略必须按平台配置传入，不允许硬编码任何全局默认值**。
4. **不新增任何第三方 npm 依赖**。
5. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
6. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发
   `EXECUTOR_QUERY`，等 `SCOPE_RULING`。
7. **T002 提交后，LEDGER 追加行与自己的 NODE_REPORT 消息文件一律不
   要再提交**——写入工作区即可，留给 Commander 收尾统一提交。

---

## 10. Non-goals / Out-of-scope

- 不实现相关性排序/摘要/相似度检索算法。
- 不实现后台定时清理任务（setInterval/进程/调度器）——purge 是
  由调用方主动触发的同步方法。
- 不接入 Host Scheduler/Host LLM Provider/prompt 拼装（未来节点
  职责）。
- 不实现 Bilibili 专属存储合规策略（Dev Spec 第 47 节明确"该
  Adapter 的数据存储策略必须单独经过平台合规检查"，属 DEV-081）。
- 不引入任何第三方业务逻辑依赖。

---

## 11. Tests

### Unit tests

T002：两张表 schema 存在性、`upsert`/`get`/`add`/`list` 各自的
读写正确性（含 `created_at` 保持不变、`last_seen_at` 更新）、
`deleteExpired*` 按截止时间与 platform 双重过滤、`host-memory`
四个转发方法端到端、`purge` 的 per-platform 差异化清理与"未列出
platform 不受影响"、`getHealth` 正常路径。

### Regression tests

`pnpm test` 覆盖全 workspace；既有全部包测试零回归（`persistence`
既有四张表/五个文件零改动，`ai-host` 完全不受影响）。

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
| A07 | `host_viewer_memory`/`host_running_jokes` 两张表存在且列约束符合第 2.1 节 | 测试检查 |
| A08 | `upsertHostViewerMemory` 二次写入更新 `note`/`last_seen_at`，`created_at` 不变 | 测试检查 |
| A09 | `listHostRunningJokes` 按 `created_at` 升序返回同 platform 全部记录 | 测试检查 |
| A10 | `deleteExpiredHostViewerMemory`/`deleteExpiredHostRunningJokes` 只删过期且同 platform 的行，其余不受影响 | 测试检查 |
| A11 | `host-memory` 四个转发方法（`rememberViewer`/`recallViewer`/`addRunningJoke`/`listRunningJokes`）端到端正确 | 测试检查 |
| A12 | `purge` 按 per-platform 保留时长差异化清理，未列出的 platform 不受影响 | 测试检查 |
| A13 | `getHealth()` 正常路径返回 `status: 'OK'` | 测试检查 |
| A14 | `host-memory` 源码不 `import 'node:sqlite'`、不调用 `openDatabase`/`initSchema` | 文件/文本检查 |
| A15 | 未新增第三方 npm 依赖 | 文件检查 |
| A16 | `viewerState.ts`/`health.ts`/`sessionStore.ts`/`eventStore.ts`/`snapshotStore.ts`/`recovery.ts`/`ai-host/**`/`platform-core/**`/`platform-twitch/**`/`runtime-kernel/**` 均未被修改 | git diff 比对 |
| A17 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A18 | `specs/dev/DEV-054/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A19 | `git log` 新增恰 1 条提交，首行 `DEV-054: viewer memory (host_viewer_memory/host_running_jokes tables + host-memory package)` | 命令 |
| A20 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A21 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT → 仅
commit 代码+节点文档（一条提交）→ 写入但不提交 LEDGER/NODE_REPORT →
自行核实完成三要素 → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A21。

---

## 附录：T003（CHANGE_REQUEST 0261 修正）

### 背景

`CHANGE_REQUEST` 消息 `0261`（USER 已批准）：DEV-054 起草时检索
"Viewer Memory"关键词，未搜到 Dev Spec 独立的**第 42 节"Host
Memory"**，该节明确定义结构化字段：`viewerId`/`nickname`/
`interactionCount`/`lastSeen`/`knownRunningJokes`/`hostAffinity`/
`notableEvents`，且强调"长期只保存：明确结构化事实"。原实现用
单一自由文本 `note` 字段代替，不符合该节的规范性字段列表（无
"例如"字样，视为权威 schema）。

### 变更范围

只改 `host_viewer_memory` 表 schema + `HostViewerMemoryEntry` 类型 +
其 CRUD 函数 + `host-memory` 的 `rememberViewer`/`recallViewer`
方法签名。`host_running_jokes` 表、`hostRunningJokes.ts`、
`purge`、`getHealth` **不受影响**，维持原样不动。

### 新 Schema

```sql
-- host_viewer_memory 表定义改为：
CREATE TABLE IF NOT EXISTS host_viewer_memory (
  platform TEXT NOT NULL,
  viewer_id TEXT NOT NULL,
  nickname TEXT,
  interaction_count INTEGER NOT NULL,
  known_running_jokes TEXT NOT NULL,
  host_affinity REAL NOT NULL,
  notable_events TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  PRIMARY KEY (platform, viewer_id)
);
```

`known_running_jokes`/`notable_events` 两列存 JSON 字符串（数组），
沿用 `eventStore.ts`/`snapshotStore.ts` 已有的 `JSON.stringify`/
`JSON.parse` 存储范式，不引入新依赖。`nickname` 允许为 `NULL`
（不是每次互动都能拿到昵称）。

```typescript
// HostViewerMemoryEntry 改为：
export interface HostViewerMemoryEntry {
  platform: string;
  viewerId: string;
  nickname?: string;
  interactionCount: number;
  knownRunningJokes: string[];
  hostAffinity: number;
  notableEvents: string[];
}
```

`upsertHostViewerMemory(db, entry)`：整行覆盖式写入/插入（不是
合并式的自动递增/追加——`interactionCount`/`hostAffinity`/
`knownRunningJokes`/`notableEvents` 具体怎么变化是未来 Host
Scheduler/LLM Provider 的业务逻辑，Dev Spec 未定义任何具体算法，
本层不发明，调用方自己读出旧值、算好新值、整体传入覆盖写入）。
`created_at` 冲突时不覆盖（同原逻辑不变），`last_seen_at`
每次写入都更新为当前时间。`getHostViewerMemory` 读出整行并把
两个 JSON 列 parse 回数组。`deleteExpiredHostViewerMemory` 逻辑
不变（仍按 `last_seen_at` 删除，不涉及新增列）。

`host-memory` 的 `rememberViewer`/`recallViewer` 方法签名同步
改为接收/返回完整的 `HostViewerMemoryEntry`（去掉原来只接受
`note: string` 的简化签名）。

### T003 Acceptance

| # | 判定 |
|---|---|
| A22 | `host_viewer_memory` 表列为 `platform`/`viewer_id`/`nickname`/`interaction_count`/`known_running_jokes`/`host_affinity`/`notable_events`/`created_at`/`last_seen_at`，`host_running_jokes` 表零改动 |
| A23 | `upsertHostViewerMemory` 覆盖式写入全部字段，二次写入 `created_at` 不变、`last_seen_at` 更新（沿用原 A08 同类验证手法） |
| A24 | `getHostViewerMemory` 正确 parse `knownRunningJokes`/`notableEvents` 两个 JSON 数组列，写入时是什么内容读出来就是什么内容 |
| A25 | `nickname` 未提供时可为 `undefined`/`null`，不报错 |
| A26 | `host-memory` 的 `rememberViewer`/`recallViewer` 端到端转发完整新 schema |
| A27 | `deleteExpiredHostViewerMemory`/`purge`（per-platform 差异化保留）在新 schema 下行为不变，既有测试逻辑零回归 |
| A28 | `host_running_jokes`/`hostRunningJokes.ts`/`db.test.ts` 表数量断言均未被修改 |

