# TASK PACKAGE — DEV-005

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-005 |
| Node Name | Dice Engine |
| Milestone | M1 — Story Machine Complete |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-002（DONE，用于确认 chapter-schema 类型经此冻结通道可用；类型真正来源是 DEV-001） |
| Commander | Claude |
| Executor | Codex（协议角色名 `OPENCODE`） |

### 规范原文

第 65 节 DEV-005："实现：Seeded PRNG / Dice / Modifiers / Replay"
第 8 节："要求 Seeded PRNG，禁止 `Math.random()` 作为正式骰子源。每次骰子产生 seed/rollIndex/diceType/rawValue/modifier/finalValue，全部进入 Event Log。"

### 与已冻结接口的关系

- **输入类型**（`DiceProfile`/`QualityThreshold`/`DiceModifier`）已由 DEV-001 冻结在 `packages/chapter-schema/src/dice.ts`，本节点只消费，不重新定义。
- **`Quality` 类型**唯一权威定义在 `packages/chapter-schema/src/result.ts`（`dice.ts` 已 import 它），本节点沿用，不新建。
- **输出结果的字段形状故意对齐** DEV-008 已冻结的 `DiceRollRecordPayload`（`packages/runtime-kernel/src/diceEvent.ts`：`seed`/`rollIndex`/`diceType`/`rawValue`/`modifier`/`finalValue`）——但**本节点不依赖 `runtime-kernel`，也不构造 `RuntimeEvent`**。字段形状对齐是为了让未来的 DEV-009 Kernel 能直接把本节点的返回值套进事件 payload，不需要转换层；构造事件、决定何时发 `DICE.ROLLED` 与 `DICE.PUBLISHED`（第 8 节强调两者时间必须分离）是 Kernel 的职责，不在本节点内实现——这与 DEV-004 Rule Engine 不构造 `RuntimeEvent` 是同一条设计纪律。

---

## 2. Current Objective

交付 `packages/dice-engine`：给定 `DiceProfile`、种子、roll 序号、当前 `WorldState`，产出确定性的骰子结果与对应的 `Quality`。**不产出随机——同一组输入永远得到同一个输出**，这是第 61 节 Replay Test 的硬前提。

---

## 3. Scope

### Writable Scope

```
packages/dice-engine/package.json
packages/dice-engine/tsconfig.json
packages/dice-engine/src/index.ts
packages/dice-engine/src/hash.ts
packages/dice-engine/src/hash.test.ts
packages/dice-engine/src/diceNotation.ts
packages/dice-engine/src/diceNotation.test.ts
packages/dice-engine/src/roll.ts
packages/dice-engine/src/roll.test.ts
packages/dice-engine/src/modifiers.ts
packages/dice-engine/src/modifiers.test.ts
packages/dice-engine/src/quality.ts
packages/dice-engine/src/quality.test.ts

specs/dev/DEV-005/INDEX.md
specs/dev/DEV-005/REQUIREMENTS.md
specs/dev/DEV-005/ACCEPTANCE.md
specs/dev/DEV-005/REPORT.md
specs/dev/DEV-005/DECISIONS.md（**本节点含多条设计决策，几乎必须创建，不要留空**）
specs/dev/DEV-005/BLOCKERS.md（仅在需要时创建）

tsconfig.json（追加一行 references 指向 packages/dice-engine）
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/chapter-schema/**（含 dice.ts、result.ts、stateRules.ts、worldState.ts）
packages/rule-engine/**（消费其 evaluateCondition，不修改）
packages/chapter-compiler/**、packages/runtime-kernel/**、packages/shared/**
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts
```

### Forbidden Scope

```
packages/* 除 dice-engine 外的任何目录
apps/**、chapters/**、assets/**、scripts/**、tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration、任何网络调用代码、任何文件系统 IO
`Math.random()`、`crypto.randomBytes`、任何非确定性随机源——**这是第 8 节的红线，
  违反即 BLOCKING，无论测试是否通过**
RuntimeEvent 的构造或发送（DEV-008 已冻结该类型；DEV-009 才在状态变化时发出事件）
Action/Result 相关任何逻辑（DEV-006 的职责，本节点只管骰子本身）
```

---

## 4. Required Skills

### Required

- 确定性哈希函数（如 FNV-1a）用于把 `(seed, rollIndex, drawIndex)` 映射为可复现的伪随机数值
- 骰子记法解析（`"d20"`/`"2d6"` 形式的字符串 → 骰子数量与面数）
- 纯函数设计（同输入同输出，不携带跨调用的可变状态）

### Forbidden / Unnecessary

- 任何有状态的 PRNG 对象（如"生成器 advance 一次"模式）——本节点用纯哈希函数，见第 9 节设计理由
- 第三方随机数/哈希库——`FNV-1a` 十几行代码手写即可，无需引入依赖
- Action/Result/Narrative 相关任何逻辑
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `DiceProfile`/`QualityThreshold`/`DiceModifier`（`chapter-schema`） | 骰子规则的数据来源 |
| `Quality`（`chapter-schema`） | 结算等级的唯一权威类型 |
| `evaluateCondition`（`rule-engine`，DEV-004 冻结） | 判定哪些 `DiceModifier` 生效 |
| `WorldState`（`chapter-schema`） | `DiceModifier.when` 求值所需的当前状态 |

---

## 6. Outputs

1. `rollDice(profile: DiceProfile, seed: string, rollIndex: number, state: WorldState): DiceRollResult`
2. `resolveQuality(profile: DiceProfile, finalValue: number): Quality | undefined`
3. `specs/dev/DEV-005/` 节点文档，含至少一份 `DECISIONS.md`（记录本节点的确定性哈希方案、骰子记法解析规则、阈值覆盖缺口的处置）

---

## 7. Task Breakdown

> **通用约定**：本节点全部测试使用手写对象（`DiceProfile`/`WorldState` 等），不需要任何 fixture、不走文件系统。

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-005/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Acceptance**：四文件存在；`INDEX.md` 含原句；Task Order 恰 T001–T008。

---

### T002 — 包脚手架

- **Allowed Files**：`packages/dice-engine/package.json`、`tsconfig.json`、根 `tsconfig.json`
- **Requirements**：
  1. `package.json`：`"name": "@interactive-story/dice-engine"`，`dependencies` 恰为 `{ @interactive-story/chapter-schema, @interactive-story/rule-engine }`。
  2. 包级 `tsconfig.json` extends `../../tsconfig.base.json`，`references` 指向 `chapter-schema` 与 `rule-engine`。
  3. 根 `tsconfig.json` 追加 `references` 指向 `packages/dice-engine`。
- **Acceptance**：`pnpm install` 成功；`packages/dice-engine` 出现在 `pnpm ls -r --depth -1`；`dependencies` 恰为上述两项。

---

### T003 — 确定性哈希

- **Objective**：交付把任意字符串确定性映射为 32 位无符号整数的基础函数，供 T005 派生骰子点数，不依赖任何有状态的生成器。
- **Allowed Files**：`src/hash.ts`、`src/hash.test.ts`
- **Requirements**：
  1. 导出 `fnv1a32(input: string): number`——实现标准 FNV-1a 32 位哈希（offset basis `0x811c9dc5`，prime `0x01000193`），返回 `[0, 2^32)` 范围内的无符号整数。
  2. **不引入第三方哈希库**，手写实现。
  3. 同一输入必须永远返回同一输出（这是本节点确定性的地基，必须有测试直接断言）。
- **Acceptance**：对已知测试向量（可用任意固定字符串，记录预期哈希值到 `DECISIONS.md`）验证实现正确；同输入多次调用结果一致；不同输入通常得到不同结果（不要求密码学级别的抗碰撞，只要求"日常输入分布均匀，不出现明显的大批量碰撞"）。

---

### T004 — 骰子记法解析

- **Objective**：把 `DiceProfile.diceType`（如 `"d20"`、`"2d6"`、`"3d8"`）解析成骰子数量与面数。
- **Allowed Files**：`src/diceNotation.ts`、`src/diceNotation.test.ts`
- **Requirements**：
  1. 导出 `parseDiceNotation(diceType: string): { count: number; sides: number }`，正则 `^(\d*)d(\d+)$`（大小写不敏感），`count` 省略时默认 `1`。
  2. 解析失败（不匹配该格式）时**不抛异常**，返回 `{ count: 1, sides: 1 }`（退化为"恒定摸到 1 点"的安全默认——第 9 节的防御性原则延续），并在 `DECISIONS.md` 记录这个退化选择。
- **Acceptance**：`"d20"` → `{count:1, sides:20}`；`"2d6"` → `{count:2, sides:6}`；无效字符串（如 `"abc"`）返回退化默认值，不抛异常。

---

### T005 — 骰子摸点（核心：确定性、无状态）

- **Objective**：给定种子与 roll 序号，产出确定性的原始点数——**不使用任何有状态的 PRNG 对象**，纯函数直接从 `(seed, rollIndex, drawIndex)` 算出每一点的值。
- **Allowed Files**：`src/roll.ts`、`src/roll.test.ts`
- **Requirements**：
  1. 导出 `drawDie(seed: string, rollIndex: number, drawIndex: number, sides: number): number`——用 T003 的 `fnv1a32` 对字符串 `` `${seed}:${rollIndex}:${drawIndex}` `` 求哈希，`(hash % sides) + 1` 得到 `[1, sides]` 范围内的点数。
  2. 导出 `rollRaw(diceType: string, seed: string, rollIndex: number): number`——用 T004 解析出 `count`/`sides`，对 `drawIndex = 0..count-1` 各调用一次 `drawDie` 并求和。
  3. **不得**引入任何形式的"生成器对象"（例如 `class Rng { next() {...} }`），也不得让 `rollRaw` 内部维护跨调用的计数器——`drawIndex` 必须是显式参数，不是隐藏状态。这样"重放"永远只是"用同样的参数再调一次"，不存在"是否按同样顺序调用过"这类隐患。
  4. 本任务承认统计上的模偏（modulo bias）在 `sides` 较大时存在，但**明确不修正**——本产品是叙事骰子，不是博彩系统，第 8 节没有统计公平性的量化要求，修正是无谓的过度设计。这条判断记入 `DECISIONS.md`。
- **Acceptance**：同一 `(seed, rollIndex)` 多次调用 `rollRaw` 得到完全相同的结果；不同 `rollIndex` 通常得到不同结果；`drawDie` 对不同 `drawIndex` 通常给出不同点数（验证"2d6"不是简单地把同一个值翻倍）。

---

### T006 — Modifier 求值

- **Objective**：交付"哪些修正生效、总修正是多少"的计算，复用 DEV-004 冻结的 Condition 求值。
- **Allowed Files**：`src/modifiers.ts`、`src/modifiers.test.ts`
- **Requirements**：
  1. 导出 `interface AppliedModifier { amount: number; reason: string }`、`function resolveModifiers(profile: DiceProfile, state: WorldState): { total: number; applied: AppliedModifier[] }`。
  2. 遍历 `profile.modifiers ?? []`，用 `rule-engine` 的 `evaluateCondition(modifier.when, state)` 判定是否生效；生效的累加进 `total`，并记入 `applied`（带 `reason`，用于审计——第 8 节"每次骰子...全部进入 Event Log"背后的审计意图，即使 DEV-008 冻结的事件 payload 目前只携带 `modifier` 汇总数值，没有逐条 reason 字段，本节点仍在自己的返回值里保留明细，供未来若需要更细粒度审计时复用，不需要事后重新计算）。
  3. `profile.modifiers` 为空/未提供时，返回 `{ total: 0, applied: [] }`。
- **Acceptance**：多个 modifier 中只有部分条件成立时，`total` 只累加成立的部分，`applied` 只包含成立的部分；无 modifier 的正例返回 `{ total: 0, applied: [] }`。

---

### T007 — Quality 解析 + 顶层 `rollDice` 编排

- **Objective**：把点数映射到结算等级，并把 T003–T006 串成唯一的对外入口。
- **Allowed Files**：`src/quality.ts`、`src/quality.test.ts`、`src/index.ts`
- **Requirements**：
  1. `src/quality.ts` 导出 `resolveQuality(profile: DiceProfile, finalValue: number): Quality | undefined`：遍历 `profile.qualityThresholds`，返回第一个满足 `min <= finalValue <= max` 的 `quality`；全部不匹配返回 `undefined`（不抛异常——这是已知的编译期空白，见下方"已知缺口"）。若多个区间重叠意外都匹配（理论上编译期应该防止，但本节点防御性处理），取数组中**第一个**匹配的，不合并、不报错。
  2. 导出 `interface DiceRollResult { seed: string; rollIndex: number; diceType: string; rawValue: number; modifier: number; finalValue: number; quality: Quality | undefined; appliedModifiers: AppliedModifier[] }`。
  3. 导出 `rollDice(profile: DiceProfile, seed: string, rollIndex: number, state: WorldState): DiceRollResult`：调用 T005 的 `rollRaw` 得 `rawValue`，调用 T006 的 `resolveModifiers` 得 `{ total, applied }`，`finalValue = rawValue + total`，调用 `resolveQuality` 得 `quality`，组装返回。**前六个字段的名字与类型必须与 `runtime-kernel` 的 `DiceRollRecordPayload` 逐字一致**（`seed`/`rollIndex`/`diceType`/`rawValue`/`modifier`/`finalValue`），但**不 import `runtime-kernel`**——独立定义，字段对齐是约定，不是类型复用。
  4. **已知缺口，记入 `DECISIONS.md`，不在本节点修复**：`qualityThresholds` 是否完整覆盖 `diceType` 解析出的实际数值范围（`[count, count*sides+modifier 的可能区间]`）、区间是否有重叠——这条静态校验此前没有被任何 DEV 节点认领（不属于 DEV-002 PASS1/2，也不属于 DEV-006 的 PASS4 Rule Coverage，PASS4 管的是"每个 quality 都有合法结果"，不是"骰子数值分区本身完整无缝"）。本节点只做运行时防御（返回 `undefined`），不做编译期校验，也不在本节点新增校验逻辑——那会是范围外的越界实现。发现即如实记录，留给 Commander 决定归属。
- **Acceptance**：`resolveQuality` 对完整覆盖的阈值集合返回正确等级；对故意留空隙的阈值集合、落在空隙里的 `finalValue`，返回 `undefined` 而不抛异常；`rollDice` 端到端对同一组输入两次调用结果完全一致（确定性回归测试）。

---

### T008 — 全量验证、REPORT 与 commit

- **Allowed Files**：`specs/dev/DEV-005/INDEX.md`、`specs/dev/DEV-005/REPORT.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-005.md`
- **Requirements**：
  1. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  2. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  3. **`DECISIONS.md` 必须在本 Task 完成前已经存在并提交**——DEV-004 上一轮 FIX 就是因为 `REPORT.md` 引用了 `DECISIONS.md` 却没提交它，证据链断裂被判 FAIL。这次不要重复同一个错误。
  4. 更新 `INDEX.md`：T001–T008 全部勾选，`Status: READY_FOR_REVIEW`，每完成一个 Task 立即勾选。
  5. `git add -A && git commit`，提交信息首行：`DEV-005: dice engine`。
  6. 追加 LEDGER 行，发 `NODE_REPORT` 给 `AUDITOR`（cc `COMMANDER`）。
  7. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`REPORT.md` 引用的每一份文档（含 `DECISIONS.md`）都已随本次提交入库；`git log` 新增恰 1 条提交；LEDGER 含新记录。

---

## 8. Node INDEX Requirements

```markdown
# DEV-005 INDEX

Status: IN_PROGRESS

## Current Node

DEV-005 — Dice Engine

## Objective

确定性骰子摸点、修正计算、等级判定。纯函数，不用有状态 PRNG，不用 Math.random()，
不构造 RuntimeEvent。

## Allowed Scope
（抄录 Task Package 第 3 节 Writable Scope 实际条目）

## Read-only Scope
（抄录 Task Package 第 3 节 Read-only Scope 实际条目）

## Forbidden Scope
（抄录 Task Package 第 3 节 Forbidden Scope 实际条目，含"禁止 Math.random()"红线）

## Task Order

- [ ] T001 节点文档
- [ ] T002 包脚手架
- [ ] T003 确定性哈希
- [ ] T004 骰子记法解析
- [ ] T005 骰子摸点
- [ ] T006 Modifier 求值
- [ ] T007 Quality 解析 + rollDice 编排
- [ ] T008 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001（每完成一个 Task 立即勾选并更新本字段）

## Exit Criteria

六条命令全部退出码 0；`rollDice` 对同一输入确定性重现；包内无 `Math.random()`；
`DECISIONS.md` 已随最终提交入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；
已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **零随机源**：不得出现 `Math.random()`、`crypto.randomBytes`、`Date.now()` 参与取值计算等任何非确定性输入。**这是唯一一条"即使测试全过也判 BLOCKING"的红线**。
2. **纯函数，零副作用**：不读写文件、不发网络请求、不构造 `RuntimeEvent`。
3. **无隐藏状态**：不得用类实例、模块级可变变量等方式让"调用第 N 次"和"调用第 1 次"产生不同结果——所有影响输出的因素必须是显式参数。
4. **防御性求值**：解析失败、阈值缺口等情形返回安全默认值，不抛异常。
5. **不引入第三方哈希/随机数库**。
6. `CR-019` 不适用——纯函数库。
7. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现 Action/Result 相关任何逻辑（DEV-006）。
- 不构造、不发送 `RuntimeEvent`，不决定 `DICE.ROLLED`/`DICE.PUBLISHED` 的触发时机（DEV-009）。
- 不修改 `packages/chapter-schema`、`packages/rule-engine`、`packages/runtime-kernel` 的任何既有内容。
- 不新增"骰子数值分区完整性"的编译期校验（已知缺口，如实记录，不在本节点解决）。
- 不追求密码学级别的随机性或统计学模偏修正。
- 不创建真实产品内容。

---

## 11. Tests

### Unit tests

T003–T007 各自 `.test.ts`：正例 + 反例，含确定性重现测试（同输入两次调用结果一致）。

### Regression tests

`pnpm test` 覆盖全 workspace；既有测试零回归。

### 其余测试类型

不适用（属后续节点）。

---

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有测试零回归 | 命令输出 |
| A07 | `packages/dice-engine` 的 `dependencies` 恰为 `{ @interactive-story/chapter-schema, @interactive-story/rule-engine }` | 文件检查 |
| A08 | 包内不存在 `Math.random`、`crypto.randomBytes` 或其它非确定性随机源 | grep（全文件） |
| A09 | `fnv1a32` 对同一输入多次调用结果一致；已知测试向量核对正确 | 测试检查 |
| A10 | `parseDiceNotation` 对 `"d20"`/`"2d6"` 等正确解析；无效输入返回退化默认值不抛异常 | 测试检查 |
| A11 | `rollRaw`/`drawDie` 对同一 `(seed, rollIndex[, drawIndex])` 确定性重现；多次骰（如 2d6）各粒子通常不同值 | 测试检查 |
| A12 | `resolveModifiers` 只累加条件成立的修正，`applied` 明细正确 | 测试检查 |
| A13 | `resolveQuality` 正确映射；阈值缺口返回 `undefined` 不抛异常 | 测试检查 |
| A14 | `rollDice` 端到端对同一输入确定性重现；返回字段名与 `DiceRollRecordPayload` 逐字对齐 | 测试检查 |
| A15 | 包内不存在任何形式的有状态 PRNG 类/模块级可变计数器 | 代码审查 |
| A16 | 包内不存在 `RuntimeEvent` 构造代码，不 import `runtime-kernel` | grep 检查 |
| A17 | `DECISIONS.md` 存在且记录：哈希测试向量、骰子记法退化默认值选择、模偏不修正的理由、阈值覆盖缺口的已知记录 | 文件检查 |
| A18 | `specs/dev/DEV-005/` 节点文档齐全（含 `DECISIONS.md`，且随最终提交一起入库），`INDEX.md` T001–T008 全部勾选 | 文件 + 文本检查 |
| A19 | `git log` 新增恰 1 条提交，首行 `DEV-005: dice engine`；提交时 `git status --porcelain` 为空；`REPORT.md` 引用的全部文档均已入库 | 命令 |
| A20 | LEDGER 含 `NODE_REPORT-DEV-005` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A21 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**`、`packages/chapter-schema/**`、`packages/rule-engine/**`、`packages/chapter-compiler/**`、`packages/runtime-kernel/**`、`packages/shared/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT（含确认 `DECISIONS.md` 已提交）→ commit → 发 NODE_REPORT → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A21。
