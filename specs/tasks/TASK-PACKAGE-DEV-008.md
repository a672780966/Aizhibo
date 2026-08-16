# TASK PACKAGE — DEV-008

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-008 |
| Node Name | Runtime Event Model |
| Milestone | M1 — Story Machine Complete |
| Status | ISSUED → 待 OpenCode 施工 |
| Dependencies | DEV-000（DONE，接口冻结）、DEV-001（DONE，接口冻结） |
| Commander | Claude |
| Executor | OpenCode |

### 规范原文（第 65 节）

```text
## DEV-008
### Runtime Event Model
实现统一 Runtime Event。
```

### 执行序说明（CR-009）

`DEV-008` 编号排在 `DEV-004`/`DEV-005`/`DEV-006` 之后，但**执行序**（见 `specs/dev/DAG.md` Exec 3）把它提前到 `DEV-001` 之后、`DEV-002` 之前。理由（CR-009，`specs/audit/SPEC-AUDIT-001.md` P1-6）：第 16 节要求"每个状态变化必须来源于 Event"，第 8 节要求骰子 `seed`/`rollIndex`/`rawValue`/`finalValue` 全部进 Event Log；若 Event Model 按编号顺序才实现，`DEV-004`/`005`/`006` 会各自发明事件格式后返工。编号不变，执行序前移，本 Task Package 是本节点的第一次下发。

### 权威输入（按优先级）

1. Dev Spec V1.0 第 8 节「Dice Engine」（`seed`/`rollIndex`/`diceType`/`rawValue`/`modifier`/`finalValue` 六字段与 `DICE.REQUESTED`/`DICE.ROLLED`/`DICE.PUBLISHED` 三事件）、第 16 节「Event Log」（`RuntimeEvent` 信封）、第 17 节「Snapshot / Checkpoint」（仅作理解上下文，不属本节点实现范围）
2. `specs/dev/DAG.md`「M1 内因 CR-RESOLUTIONS-001 产生的职责变更」与「CR-009」「CR-008」两条决议说明
3. `specs/audit/SPEC-AUDIT-001.md` P1-6（DEV-008 执行序问题）、CR-016（取消 `event-engine`/`state-engine` 包，见下方「包位置裁定」）

三份文档合起来是本节点唯一的规范权威，冲突时以 `DAG.md` 的落地决议为准（它是对 `SPEC-AUDIT-001` 建议的实际采纳结果）。

### 包位置裁定（Commander 决策，非规范原文，需在此显式记录）

原始规范第 4 节把 Event 相关职责放在 `packages/event-engine`；`CR-016`（`SPEC-AUDIT-001.md` P3-4，已被 `DAG.md` 采纳）取消了该包，"Event Log 追加/读取/序列号"职责并入 `persistence`（`DEV-010`，尚未创建）。同时 `DEV-000` Task Package 第 10 节 Non-goals 明确排除"在 `packages/shared` 中定义 `RuntimeEvent`"。

`RuntimeEvent` 的信封与事件目录因此没有一个"现成"的包可放。Commander 裁定：本节点在 `packages/runtime-kernel`（第 4 节原始包名，`DEV-009` "XState Runtime Kernel" 的既定包）**提前建立空壳并只填入事件类型**，`DEV-009` 后续在同一个包内补充实际的 statechart / actor 代码。理由：

- `runtime-kernel` 是 Event 最终的核心消费者（Kernel 驱动状态转移必须读 Event），提前用同一个包名不产生新的、未被规范列出的包，符合 CR-016"控制包数量"的精神。
- 不复活已取消的 `event-engine`，不提前创建尚未轮到的 `persistence`。

`DEV-009` 的 Task Package 下发时会声明"复用 `packages/runtime-kernel`，不重建"。

---

## 2. Current Objective

交付一个纯类型定义包（本阶段）：为 Runtime 的统一事件信封 `RuntimeEvent` 与骰子事件族提供 Zod schema + 推导类型，使后续 `DEV-004`（State Rule）、`DEV-005`（Dice Engine）、`DEV-006`（Action Resolution）、`DEV-009`（XState Kernel）都能在一份已冻结的信封格式上构造自己的事件，不必各自发明格式。

**这是一个纯类型包，不含任何行为逻辑**：

- 不生成 `id`/`sequence`（谁触发事件谁负责赋值，属发出方节点的职责）
- 不实现 PRNG / 骰子随机数生成（属 `DEV-005`）
- 不实现事件总线、dispatch、actor、statechart（属 `DEV-009`）
- 不实现 Event Store 的追加/读取/持久化（属 `DEV-010`，`event-engine` 职责的接收方）
- 不实现 Deterministic Replay 的重建逻辑（属 `DEV-011`）
- 不定义 Dice 之外的任何业务事件目录（`STORY.*`/`INTERACTION.*`/`RESULT.*` 等由拥有该领域的节点在自己的 Task Package 里按同一信封模式定义，本节点不得代为发明）

`runtime-kernel`（本阶段）只回答一个问题：**一个 Runtime Event 长什么样、骰子事件长什么样**，不回答"谁在什么时候产生它"。

---

## 3. Scope

### Writable Scope

```
packages/runtime-kernel/package.json
packages/runtime-kernel/tsconfig.json
packages/runtime-kernel/src/index.ts
packages/runtime-kernel/src/index.test.ts
packages/runtime-kernel/src/event.ts
packages/runtime-kernel/src/event.test.ts
packages/runtime-kernel/src/diceEvent.ts
packages/runtime-kernel/src/diceEvent.test.ts

specs/dev/DEV-008/INDEX.md
specs/dev/DEV-008/REQUIREMENTS.md
specs/dev/DEV-008/ACCEPTANCE.md
specs/dev/DEV-008/REPORT.md
specs/dev/DEV-008/DECISIONS.md      （仅在需要记录决策时创建）
specs/dev/DEV-008/BLOCKERS.md       （仅在出现 blocker 时创建）

tsconfig.json                       （根 tsconfig 的 references 追加一行指向 packages/runtime-kernel）

specs/comms/LEDGER.md               （仅追加行）
specs/comms/NNNN-OPENCODE-to-*.md   （仅自己发出的消息）
```

### Read-only Scope

```
specs/baseline/DEV_SPEC_V1.0.md
specs/audit/**
specs/protocol/**
specs/PROJECT_INDEX.md
specs/dev/DAG.md
specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
packages/shared/**                  （DEV-000 冻结产物，只读引用，不修改）
packages/chapter-schema/**          （DEV-001 冻结产物，本节点不引用它，仅明确列为只读防误改）
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts   （DEV-000 冻结基线，不修改）
specs/dev/DEV-000/**、specs/dev/DEV-001/**   （已 DONE 节点的节点文档与 VERDICT，冻结，不得修改）
.claude/**                          （Commander / AUDITOR 工具链目录，不得写入；构建/格式化命令作用范围须排除本目录，DEV-000 F-02 教训）
```

### Forbidden Scope

```
packages/* 除 runtime-kernel 外的任何目录
apps/**
chapters/**
assets/**
scripts/**
tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration
任何网络调用代码
任何 XState 或其它状态机运行时依赖 / 代码
任何 PRNG / 随机数生成算法实现
```

---

## 4. Required Skills

### Required

- Zod（schema 定义、`z.infer`、discriminated union、`.extend()`）
- TypeScript strict 模式下的可辨识联合类型设计
- Vitest 单元测试（正例 + 反例）

### Forbidden / Unnecessary

- XState / 任何状态机运行时（`DEV-009`）
- PRNG 算法、随机数生成（`DEV-005`）
- SQLite / 任何数据库驱动（`DEV-010`）
- 事件总线、dispatch、观察者模式实现
- 第 70 节禁止清单全部

---

## 5. Inputs

见第 1 节「权威输入」。补充：

| Input | 用途 |
|---|---|
| `packages/shared`（`Brand`、`Health`） | **不使用**。ID 字段保持 `z.string()`，不引入品牌类型（与 `DEV-001` 起草纪律一致）；本阶段零行为逻辑，无运行时服务可报告健康状态，`getHealth()` 不适用（见第 9 节 Constraints 第 6 条） |
| `packages/chapter-schema` | **不使用**。骰子事件的 `diceType`/`modifier` 字段本节点仅校验类型（`z.string()`/`z.number()`），不跨包引用 `chapter-schema` 的 `DiceProfile`——那是运行时事件记录，不是章节内容定义，两者独立 |
| DEV-000 冻结的 `tsconfig.base.json` / `eslint.config.js` / `vitest.config.ts` | 直接复用，不重新配置 |

---

## 6. Outputs

1. `packages/runtime-kernel` 包（本阶段仅含事件类型），`pnpm build` 产出 `dist/` 与完整 `.d.ts`
2. `RuntimeEvent` 统一信封：`id`/`sequence`/`timestamp`/`type`/`payload`/`chapterId`/`sessionId`/`visibility`（第 16 节 + CR-008 可见性分类要求）
3. 骰子事件族：`DICE.REQUESTED`/`DICE.ROLLED`/`DICE.PUBLISHED` 三个可辨识联合分支，`ROLLED`/`PUBLISHED` 均携带第 8 节六字段（`seed`/`rollIndex`/`diceType`/`rawValue`/`modifier`/`finalValue`）
4. 每个模块含正例（`.parse()` 成功）与至少一条反例（`.safeParse()` 失败）测试
5. `specs/dev/DEV-008/` 四份（或五份）节点文档

---

## 7. Task Breakdown

> **通用约定**：每个模块导出 `XxxSchema`（Zod 对象）与 `type Xxx = z.infer<typeof XxxSchema>`，二者同名导出、同文件、同步维护。

### T001 — 建立当前节点施工索引与节点文档

- **Objective**：创建 DEV-008 节点文档。
- **Allowed Files**：`specs/dev/DEV-008/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Requirements**：
  1. `INDEX.md` 采用本包第 8 节模板，Task Order 列出 T001–T006。
  2. `REQUIREMENTS.md` 逐条抄录本包第 3、6、9、10 节。
  3. `ACCEPTANCE.md` 逐条抄录本包第 12 节全部 A 项。
  4. `REPORT.md` 先建为骨架，`Status: IN_PROGRESS`。
- **Acceptance**：四文件存在；`INDEX.md` 含原句 `OpenCode 禁止自行推进下一 DEV Node.`；Task Order 恰为 T001–T006。

---

### T002 — 包脚手架

- **Objective**：建立 `packages/runtime-kernel` 的编译与依赖基础。
- **Allowed Files**：`packages/runtime-kernel/package.json`、`tsconfig.json`、根 `tsconfig.json`
- **Requirements**：
  1. `package.json`：`"name": "@interactive-story/runtime-kernel"`、`"private": true`、`"type": "module"`、`"main"`/`"types"` 指向 `dist`、`"exports"` 指向 `dist/index.js` 与 `dist/index.d.ts`、`"scripts": { "build": "tsc -b" }`。
  2. 添加 `zod` 为运行时依赖（`dependencies`，与 `chapter-schema` 使用同一版本线，见 `DECISIONS.md` 记录具体版本理由）。
  3. 包级 `tsconfig.json` extends 根 `tsconfig.base.json`，`outDir: dist`、`rootDir: src`。
  4. 根 `tsconfig.json` 的 `references` 追加一行指向 `packages/runtime-kernel`。
  5. **不得**修改 `tsconfig.base.json` 本身（DEV-000 冻结）。
- **Acceptance**：`pnpm install` 成功；`packages/runtime-kernel` 出现在 `pnpm ls -r --depth -1`；`zod` 出现在该包 `dependencies` 而非根 `package.json`。

---

### T003 — RuntimeEvent 信封

- **Objective**：交付第 16 节 `RuntimeEvent` 信封，并落地 CR-008 的可见性分类要求。
- **Allowed Files**：`src/event.ts`、`src/event.test.ts`
- **Requirements**：
  1. 逐字段实现第 16 节 `RuntimeEvent`：`id: string`、`sequence: number`（非负整数）、`timestamp: string`（ISO-8601）、`type: string`、`payload: unknown`、`chapterId: string`、`sessionId: string`。
  2. 追加 `visibility: "PUBLIC" | "HIDDEN"` 为**必填**字段（`DAG.md` CR-008："DEV-008 / DEV-009：Snapshot 每个字段在类型层面携带可见性分类"——本节点在 Event 信封层面落实这一要求，不得设为可选或遗漏）。
  3. `RuntimeEventSchema` 作为**基础信封**，供 T004 用 `.extend()` 派生具体事件类型；本任务本身不需要构造任何具体 `type` 字面量实例，只交付通用信封 + 至少一条使用任意字符串 `type` 的正例测试。
  4. `sequence` 用 `z.number().int().nonnegative()`；`timestamp` 用 `z.string().datetime()`（或等效 ISO-8601 校验，若 Zod 版本 API 不同须在 `DECISIONS.md` 说明替代方案）。
- **Acceptance**：`RuntimeEventSchema` 能 `parse()` 一个手写合法样例；反例覆盖 `sequence` 为负数、`timestamp` 非法格式、缺失 `visibility` 三种情况均被 `safeParse()` 拒绝。

---

### T004 — Dice 事件族

- **Objective**：交付第 8 节骰子事件目录，`.extend()` 自 T003 的 `RuntimeEventSchema`。
- **Allowed Files**：`src/diceEvent.ts`、`src/diceEvent.test.ts`
- **Requirements**：
  1. 定义 `DiceRequestPayloadSchema`：`rollIndex`（非负整数）、`diceType: string`、`modifier: number`、`actionId: string`（关联触发本次骰子的 Action，仅作不透明字符串，不做跨文件存在性校验）。
  2. 定义 `DiceRollRecordPayloadSchema`：第 8 节六字段 `seed`（`string`）、`rollIndex`（非负整数）、`diceType: string`、`rawValue: number`、`modifier: number`、`finalValue: number`。`ROLLED` 与 `PUBLISHED` 两个事件类型**共用**这一 payload 形状（规范原文未区分两者字段差异，均要求"全部进入 Event Log"）。
  3. 用 `RuntimeEventSchema.extend()` 派生三个具体事件 schema：
     - `DiceRequestedEventSchema`：`type: z.literal("DICE.REQUESTED")`、`visibility: z.literal("PUBLIC")`、`payload: DiceRequestPayloadSchema`
     - `DiceRolledEventSchema`：`type: z.literal("DICE.ROLLED")`、`visibility: z.literal("HIDDEN")`、`payload: DiceRollRecordPayloadSchema`（**必须**为 `HIDDEN`——结果在视觉动画结束前不得可被公开状态读取，第 8 节"这两个时间必须分离"+ G06 精神）
     - `DicePublishedEventSchema`：`type: z.literal("DICE.PUBLISHED")`、`visibility: z.literal("PUBLIC")`、`payload: DiceRollRecordPayloadSchema`
  4. 用 `z.discriminatedUnion("type", [...])` 聚合三者为 `DiceEventSchema`。
  5. **不实现**任何随机数生成、任何"从 seed 计算 rawValue"的函数——这些字段的值由 `DEV-005` 在运行时算出后填入，本节点只校验形状。
- **Acceptance**：三个事件类型均有正例；反例覆盖：`type` 为三值之外的字符串被拒绝、`ROLLED`/`PUBLISHED` 缺少六字段任一被拒绝、把 `ROLLED` 的 `visibility` 误写为 `"PUBLIC"` 被 Zod 字面量校验拒绝（`@ts-expect-error` 或 `safeParse` 二选一验证，需在测试中体现）。

---

### T005 — 桶导出

- **Objective**：建立包的唯一入口。
- **Allowed Files**：`src/index.ts`、`src/index.test.ts`
- **Requirements**：
  1. `index.ts` re-export `event.ts` 与 `diceEvent.ts` 的全部具名导出（schema + 类型），不做默认导出，不做重新命名。
  2. **不创建**任何名为 `emit`/`dispatch`/`publish`/`append`/`replay`/`rollDice`/`generateSeed` 之类的函数。
- **Acceptance**：`import * as RuntimeKernel from "@interactive-story/runtime-kernel"` 能访问到 `RuntimeEventSchema`、`DiceEventSchema`、三个具体 Dice 事件 schema 及其推导类型；grep 确认包内不存在上述禁止函数名。

---

### T006 — 全量验证、REPORT 与 commit

- **Objective**：证明节点完成并交付审计材料，接入通信协议。
- **Allowed Files**：`specs/dev/DEV-008/INDEX.md`、`specs/dev/DEV-008/REPORT.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-008.md`
- **Requirements**：
  1. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  2. 按 DEV-001 REPORT 模板填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  3. **先**把 `INDEX.md` 编辑到最终态（T001–T006 全部勾选，`Status: READY_FOR_REVIEW`），**确认无误后再** `git add -A && git commit`——**不得**先提交再补勾选（DEV-001 FIX-01 的教训：`git_head` 冻结的必须是真正的终态，commit 之后不得再修改 Writable Scope 内任何文件的实质内容）。
  4. `git add -A && git commit`，提交信息首行：`DEV-008: runtime event model`。
  5. 提交完成后立即执行 `git status --porcelain`，确认除 LEDGER 追加与即将创建的 `NODE_REPORT` 消息文件外为空；若发现任何 Writable Scope 内文件仍显示为 `M`/`??`，说明 commit 时机过早，必须视为流程错误处理（停止，发 `EXECUTOR_QUERY`，不得自行决定如何补救）。
  6. 在 `specs/comms/LEDGER.md` 追加一行取号，创建 `NODE_REPORT` 消息发给 `AUDITOR`（cc `COMMANDER`），信封含 `git_head`（本次 commit 后的 sha）、`changed_files_count`、`commands_run`。
  7. **STOP**。不得开始 `DEV-002`/`DEV-009` 或任何后续节点。
- **Acceptance**：六条命令全部退出码 0；`REPORT.md` 八节齐全；`git log` 新增恰 1 条提交，首行为 `DEV-008: runtime event model`；该提交时点 `git status --porcelain`（不计 LEDGER 追加与新消息文件）为空；LEDGER 含一条 `OPENCODE → AUDITOR` 的 `NODE_REPORT-DEV-008` 记录。

---

## 8. Node INDEX Requirements

```markdown
# DEV-008 INDEX

Status: IN_PROGRESS

## Current Node

DEV-008 — Runtime Event Model

## Objective

为 Runtime 统一事件信封（`RuntimeEvent`）与骰子事件族交付 Zod schema + 推导类型（纯类型，无生成逻辑、无事件总线、无持久化）。

## Allowed Scope

（抄录 Task Package 第 3 节 Writable Scope 实际条目）

## Read-only Scope

（抄录 Task Package 第 3 节 Read-only Scope 实际条目）

## Forbidden Scope

（抄录 Task Package 第 3 节 Forbidden Scope 实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 包脚手架
- [ ] T003 RuntimeEvent 信封
- [ ] T004 Dice 事件族
- [ ] T005 桶导出
- [ ] T006 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001

## Exit Criteria

`pnpm build` / `pnpm typecheck` / `pnpm lint` / `pnpm format:check` / `pnpm test` 五条命令全部退出码 0；
`RuntimeEvent` 信封与 Dice 事件族均有 schema + 正反例测试；
包内不存在任何生成/分发/持久化函数；
REPORT.md 完成且 Status = READY_FOR_REVIEW；
已向 AUDITOR 发出 NODE_REPORT；
commit 时点 `git status --porcelain` 干净（不计 LEDGER 与新消息文件）。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **零行为逻辑**。本包不得出现任何形如 `emit()`、`dispatch()`、`publish()`、`append()`、`replay()`、`rollDice()`、`generateSeed()` 的函数——全部属于后续节点。
2. **零文件 IO、零网络调用**。不读取任何文件，不使用 `fs`，不发起任何请求。
3. **零跨文件/跨节点校验**。不校验 `actionId` 是否真的存在于某个 Chapter Pack，不引用 `packages/chapter-schema` 的任何类型。
4. **不引入品牌类型**。所有 id 字段（`id`、`chapterId`、`sessionId`、`actionId`）均为 `z.string()`，不使用 `packages/shared` 的 `Brand<T,B>`。
5. **`visibility` 为必填字面量**，不得设为 `.optional()` 或宽松的 `z.string()`——这是 CR-008 要求的类型层防线，宽松会使其失去意义。
6. **`CR-019`（`getHealth()` 自落地起）暂不适用于本包**——本阶段零行为逻辑，无运行时服务，参照 `DEV-001` Constraints 第 7 条的同一豁免理由。`DEV-009` 在同一包内补充真实 Kernel 行为时，`getHealth()` 义务随之生效，不属本节点范围。
7. 依赖最小化：本包 `dependencies` 只允许 `zod`。`devDependencies` 沿用 DEV-000 白名单，不新增。
8. Windows 环境：脚本须 Git Bash 与 PowerShell 均可运行。
9. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`（`blocking: true`），继续其它不受影响 Task，等 `SCOPE_RULING`。
10. **提交纪律**：`INDEX.md` 与 `REPORT.md` 必须在 commit **之前**达到最终态。commit 之后除 LEDGER 追加行与新建的 `NODE_REPORT` 消息文件外，不得再修改任何 Writable Scope 内文件；若必须修改，只能通过新的独立 commit 完成，禁止 `git commit --amend`。

---

## 10. Non-goals / Out-of-scope

- 不实现 PRNG / 随机数生成、不实现"从 `seed` 计算 `rawValue`/`finalValue`"的任何函数——属 `DEV-005`。
- 不实现事件总线、dispatch、观察者模式、任何形式的 pub/sub 运行时——属 `DEV-009`。
- 不实现 Event Store 的追加/读取/序列号分配、不涉及 SQLite——属 `DEV-010`（`event-engine` 职责的接收方，`CR-016`）。
- 不实现 Deterministic Replay 的重建逻辑——属 `DEV-011`。
- 不实现 Snapshot / Checkpoint（第 17 节）、不实现 LKG（第 18 节）——属 `DEV-009` / `DEV-010`。
- 不定义 Dice 之外的任何业务事件（`STORY.*`、`INTERACTION.*`、`RESULT.*`、`SCENE.*` 等）——这些由拥有对应领域的节点（`DEV-004`/`DEV-006`/`DEV-009`/`DEV-033` 等）在各自 Task Package 中基于本节点交付的 `RuntimeEventSchema` 信封自行 `.extend()`，本节点不得代为发明或预留占位类型。
- 不创建 `packages/persistence`、不复活 `packages/event-engine`。
- 不修改 `packages/shared`、`packages/chapter-schema`。
- 不引入品牌类型、不引入 XState 或任何状态机依赖。
- 不实现任何 CI 变更（DEV-000 的 CI 步骤对新包自动生效）。

---

## 11. Tests

### Unit tests

`event.test.ts`：`RuntimeEventSchema` 至少 1 条正例 + 3 条反例（`sequence` 负数、`timestamp` 非法、缺 `visibility`）。
`diceEvent.test.ts`：三个 Dice 事件类型各至少 1 条正例；反例覆盖非法 `type`、`ROLLED`/`PUBLISHED` 缺字段、`ROLLED` 的 `visibility` 误设为 `PUBLIC`。
`index.test.ts`：桶导出可访问性 smoke test。

### Contract tests

不适用——本节点本身在定义未来的事件契约，尚无消费者可供契约测试（`DEV-005`/`DEV-009` 等下游节点交付时应反向验证其事件符合本节点 schema，但那是下游节点的测试职责）。

### Integration / Simulation / Replay / Fuzz / Soad tests

不适用（属后续节点）。

### Regression tests

`pnpm test` 覆盖全 workspace；`packages/shared`（2 测试文件）与 `packages/chapter-schema`（18 测试文件）既有测试必须继续全部通过，无回归。

---

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含 `shared`/`chapter-schema`/`runtime-kernel` 三包） | 命令 |
| A03 | `pnpm lint` 退出码 0，0 error / 0 warning | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0，`packages/runtime-kernel/dist/index.d.ts` 存在 | 命令 + 文件检查 |
| A06 | `pnpm test` 退出码 0；`shared` 2 个测试文件、`chapter-schema` 18 个测试文件均无回归；`runtime-kernel` 新增 3 个测试文件全部通过 | 命令输出 |
| A07 | 根 `package.json` 无 `dependencies`；`packages/runtime-kernel/package.json` 的 `dependencies` 恰为 `{ zod }` | 文件检查 |
| A08 | `packages/*` 恰为 `shared`、`chapter-schema`、`runtime-kernel` 三个包 | 文件检查 |
| A09 | `apps/`、`chapters/`、`assets/`、`scripts/`、`tools/` 均不存在 | 文件检查 |
| A10 | `RuntimeEvent` 字段与第 16 节逐字对照一致（`id`/`sequence`/`timestamp`/`type`/`payload`/`chapterId`/`sessionId`），另含本节点新增的 `visibility` 字段（CR-008 授权，非规范原文，须在 REPORT 中如实标注为增补而非篡改） | 文本比对 |
| A11 | `sequence` 拒绝负数/非整数反例；`timestamp` 拒绝非法格式反例 | 测试检查 |
| A12 | `visibility` 为必填，`z.literal("PUBLIC")`/`z.literal("HIDDEN")` 而非宽松 `z.string()`；缺失被拒绝 | 代码 + 测试检查 |
| A13 | 三个 Dice 事件类型（`DICE.REQUESTED`/`DICE.ROLLED`/`DICE.PUBLISHED`）构成 `z.discriminatedUnion`；`type` 越界反例被拒绝 | 测试检查 |
| A14 | `ROLLED`/`PUBLISHED` 的 payload 含第 8 节六字段（`seed`/`rollIndex`/`diceType`/`rawValue`/`modifier`/`finalValue`）；反例覆盖缺任一字段 | 测试检查 |
| A15 | `DICE.ROLLED` 的 `visibility` 恰为 `"HIDDEN"`，`REQUESTED`/`PUBLISHED` 恰为 `"PUBLIC"`；反例覆盖把 `ROLLED` 误设为 `PUBLIC` 被拒绝 | 测试检查 |
| A16 | 包内不存在 `emit`/`dispatch`/`publish`/`append`/`replay`/`rollDice`/`generateSeed` 等函数名（grep，允许 Zod 内置方法调用） | grep 检查 |
| A17 | 包内不存在任何 `fs`/`node:fs` 导入；不存在 `xstate` 或任何数据库驱动依赖 | grep + 依赖检查 |
| A18 | 所有 id 字段类型为 `z.string()`，未从 `@interactive-story/shared` 导入 `Brand`；未导入 `@interactive-story/chapter-schema` | grep 检查 |
| A19 | `index.ts` 桶导出可访问 `RuntimeEventSchema`、`DiceEventSchema` 及三个具体事件 schema 与类型 | 代码检查 |
| A20 | `specs/dev/DEV-008/` 含 INDEX / REQUIREMENTS / ACCEPTANCE / REPORT 四份文档，`INDEX.md` 含原句 `OpenCode 禁止自行推进下一 DEV Node.`，T001–T006 全部勾选 | 文件 + 文本检查 |
| A21 | `git log` 新增恰 1 条提交，首行 `DEV-008: runtime event model`；**该提交时点** `git status --porcelain`（不计 LEDGER 追加与新消息文件）为空——须独立用 `git show <sha>:specs/dev/DEV-008/INDEX.md` 核实该提交内的 INDEX.md 已是终态，不得是骨架版本（DEV-001 FIX-01 教训） | 命令 |
| A22 | `specs/comms/LEDGER.md` 含一条 `OPENCODE → AUDITOR` 的 `NODE_REPORT-DEV-008` 记录，对应消息文件存在，信封 `git_head` 与提交 sha 一致 | LEDGER + 文件 + 命令比对 |
| A23 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**`、`packages/shared/**`、`packages/chapter-schema/**`、`specs/dev/DEV-000/**`、`specs/dev/DEV-001/**`、`.claude/**`、`tsconfig.base.json`、`eslint.config.js`、`.prettierrc.json`、`vitest.config.ts` 均未被修改 | git diff 比对（本次应可用干净 diff 证明，因 Commander 已在提交 `a5b0cd8` 完成治理文件独立提交） |

---

## 13. Exit Procedure

1. 先把 `specs/dev/DEV-008/INDEX.md` 编辑到最终态（T001–T006 全部勾选，`Status: READY_FOR_REVIEW`）。
2. 运行第 11 节全部验证命令。
3. Regression：确认 `packages/shared`、`packages/chapter-schema` 既有测试无回归。
4. 填写 `REPORT.md`，逐条对应 A01–A23。
5. `INDEX.md` 与 `REPORT.md` Status 均设为 `READY_FOR_REVIEW`。
6. 执行 T006 的 git commit（此时 `INDEX.md` 已是终态，见第 1 步）。
7. 提交后立即 `git status --porcelain` 自检，确认干净（不计 LEDGER 与新消息文件）。
8. 追加 LEDGER 行，发出 `NODE_REPORT` 给 `AUDITOR`（cc `COMMANDER`）。
9. **STOP**。不得开始任何后续 DEV 节点，不得修改 `specs/PROJECT_INDEX.md` 或 `specs/dev/DAG.md`。

---

## REPORT.md 模板

沿用 DEV-001 REPORT 模板（Status / Implemented / Changed Files / Tests Executed / Acceptance Results / Scope Deviations / Known Issues / Blockers / Future Considerations 八节），Acceptance Results 覆盖 A01–A23。
