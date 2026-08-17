# TASK PACKAGE — DEV-004

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-004 |
| Node Name | State Rule Engine |
| Milestone | M1 — Story Machine Complete |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-002（DONE，用于 Task Package 里被引用的 chapter-schema 类型经由它冻结；实际类型来源是 DEV-001） |
| Commander | Claude |
| Executor | Codex（协议角色名 `OPENCODE`） |

### 规范原文（第 65 节）

```text
## DEV-004
### State Rule Engine
实现：
Condition / Guard / Effect / Flag mutation
```

### 与 DEV-001 的分工（此前已在 DAG.md 记录的归属更正）

`Condition`/`StateEffect`/`StateRuleSet`/`StateRule`/`SceneGuard` 的**静态形状**（Zod schema + 类型）已由 DEV-001 冻结在 `packages/chapter-schema/src/stateRules.ts`。**本节点只实现对这些类型的运行时求值/变更逻辑**，不重新定义任何类型。

### 全项目第一个真正的运行时包

`chapter-schema`（纯数据）与 `chapter-compiler`（编译期离线批处理）都不在直播运行时跑。`packages/rule-engine` 是第一个**会在直播进行中被反复调用**的包。但这不改变它本身的设计——它仍然是一个**纯函数库**：不做 IO、不发 Event、不维护内部状态。谁在直播时调用它、调用后是否要发 `RuntimeEvent`，是 DEV-009 Kernel 的职责，不是本节点的。

---

## 2. Current Objective

交付 `packages/rule-engine`：给定 `WorldState` 实例和 `Condition`/`StateEffect`/`StateRuleSet`/`SceneGuard` 之一，计算求值结果或产出新的 `WorldState`。全部函数**纯**——相同输入永远相同输出，不修改传入对象。

---

## 3. Scope

### Writable Scope

```
packages/rule-engine/package.json
packages/rule-engine/tsconfig.json
packages/rule-engine/src/index.ts
packages/rule-engine/src/statePath.ts
packages/rule-engine/src/statePath.test.ts
packages/rule-engine/src/condition.ts
packages/rule-engine/src/condition.test.ts
packages/rule-engine/src/effect.ts
packages/rule-engine/src/effect.test.ts
packages/rule-engine/src/ruleSet.ts
packages/rule-engine/src/ruleSet.test.ts
packages/rule-engine/src/guard.ts
packages/rule-engine/src/guard.test.ts

specs/dev/DEV-004/INDEX.md
specs/dev/DEV-004/REQUIREMENTS.md
specs/dev/DEV-004/ACCEPTANCE.md
specs/dev/DEV-004/REPORT.md
specs/dev/DEV-004/DECISIONS.md（仅在需要时创建）
specs/dev/DEV-004/BLOCKERS.md（仅在需要时创建）

tsconfig.json（追加一行 references 指向 packages/rule-engine）
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/chapter-schema/**（全部，含 stateRules.ts、worldState.ts——本节点消费其类型，不修改）
packages/chapter-compiler/**、packages/runtime-kernel/**、packages/shared/**
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts
```

### Forbidden Scope

```
packages/* 除 rule-engine 外的任何目录
apps/**、chapters/**、assets/**、scripts/**、tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration、任何网络调用代码、任何文件系统 IO
Dice / Action / Result 相关任何逻辑（DEV-005 / DEV-006 的职责）
RuntimeEvent 的构造或发送（DEV-008 已冻结该类型，DEV-009 才负责在状态变化时发出事件）
```

---

## 4. Required Skills

### Required

- 纯函数式状态更新（不可变更新模式：浅拷贝被改动的分支，其余结构共享）
- 递归求值（`Condition` 的 `all`/`any`/`not` 嵌套结构）
- TypeScript 可辨识联合的穷尽匹配

### Forbidden / Unnecessary

- 骰子随机数、Action/Result 查表逻辑（DEV-005/006）
- Event 构造、发送、持久化（DEV-008 类型已冻结，DEV-009 才用）
- 任何 IO、任何异步逻辑（求值应是同步纯函数，不需要 `Promise`）
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `packages/chapter-schema` 的 `Condition`/`StatePath`/`StateEffect`/`StateRule`/`StateRuleSet`/`SceneGuard`/`WorldState`/`NPCState`/`DangerState` | 本节点全部函数的输入/输出类型，直接 import，不重新定义 |

---

## 6. Outputs

1. `resolveStatePath(state: WorldState, path: StatePath): unknown`——底层地址解析，供 T004/T005 共用
2. `evaluateCondition(condition: Condition, state: WorldState): boolean`
3. `applyEffect(effect: StateEffect, state: WorldState): WorldState`（不可变，返回新对象）
4. `applyStateRuleSet(ruleSet: StateRuleSet, state: WorldState, firedRuleIds: ReadonlySet<string>): { nextState: WorldState; newlyFiredRuleIds: string[] }`
5. `resolveGuard(guards: SceneGuard[], state: WorldState): string | undefined`
6. `specs/dev/DEV-004/` 节点文档

---

## 7. Task Breakdown

> **通用约定**：本节点全部测试使用**手写的最小 TypeScript 对象字面量**（`WorldState`/`Condition`/`StateEffect` 等），不需要任何 `.json` fixture、不走 chapter-compiler 的 loader——DEV-004 的全部函数直接接受已解析的类型化对象，不涉及文件系统（这条在 DEV-003 是靠后来的 ACCEPTANCE_AMENDMENT 才澄清的，本节点直接在 Task Package 里写清楚，不留给 Codex 猜）。

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-004/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Requirements**：INDEX 采用第 8 节模板，Task Order 列 T001–T008；其余同既有惯例。
- **Acceptance**：四文件存在；`INDEX.md` 含原句；Task Order 恰 T001–T008。

---

### T002 — 包脚手架

- **Allowed Files**：`packages/rule-engine/package.json`、`tsconfig.json`、根 `tsconfig.json`
- **Requirements**：
  1. `package.json`：`"name": "@interactive-story/rule-engine"`，结构比照 `chapter-schema`（无 `zod` 依赖必要——本包不做校验，只做求值，`dependencies` 只含 `@interactive-story/chapter-schema`）。
  2. 包级 `tsconfig.json` extends `../../tsconfig.base.json`，通过 `references` 指向 `../chapter-schema`。
  3. 根 `tsconfig.json` 追加 `references` 指向 `packages/rule-engine`。
- **Acceptance**：`pnpm install` 成功；`packages/rule-engine` 出现在 `pnpm ls -r --depth -1`；`dependencies` 恰为 `{ @interactive-story/chapter-schema }`。

---

### T003 — StatePath 地址解析（本节点的核心设计决策所在）

- **Objective**：把 `StatePath` 解析为 `WorldState` 里的实际值，作为 Condition 求值与 Effect 应用共用的地基。`ADDENDUM-001 §A6` 定义了 `StatePath` 形状但未定义每种 `container` 具体怎么寻址——本任务补齐这个运行时语义，属于纯实现细节，不改动任何已冻结类型。
- **Allowed Files**：`src/statePath.ts`、`src/statePath.test.ts`
- **Requirements**：
  1. 导出 `resolveStatePath(state: WorldState, path: StatePath): unknown`，按 `container` 分派：
     - `"flags"`：返回 `state.flags[path.key]`
     - `"chapterVariables"`：返回 `state.chapterVariables[path.key]`
     - `"npc"`：`path.field` 必须提供。若 `field` 为 `"present"`/`"alive"`/`"disposition"`，返回 `state.npc[path.key]?.[field]`；若 `field` 形如 `"flags.<subkey>"`，返回 `state.npc[path.key]?.flags[subkey]`；其它 `field` 值返回 `undefined`。
     - `"danger"`：`path.field` 必须为 `"level"` 或 `"tensionKey"`，返回 `state.danger[field]`；`path.key` 不使用（`danger` 是单例，不是映射）。
     - `"discovered"` / `"activeThreats"`：返回 `boolean`——`path.key` 是否作为字符串出现在对应数组里（成员判定，不是取值）。
  2. 导出 `writeStatePath(state: WorldState, path: StatePath, value: unknown): WorldState`——按同样的寻址规则**不可变写入**（浅拷贝被改动的容器分支）。仅供 T005 使用，`discovered`/`activeThreats` 的写入语义由 T005 单独处理（push/remove 不是简单赋值），此函数只处理 `flags`/`chapterVariables`/`npc.field`/`danger.field` 的直接赋值场景。
  3. **未定义/不支持的寻址组合一律返回 `undefined`（读）或原样返回不变的 state（写），不抛异常**——引擎面对已编译内容要保持健壮，克制的失败模式是"什么都不做"而不是崩溃。
- **Acceptance**：五种 container 各自的正例；`npc` 的 `flags.<subkey>` 复合寻址正例；未知 `field`/无效寻址返回 `undefined` 而非抛异常。

---

### T004 — Condition 求值

- **Allowed Files**：`src/condition.ts`、`src/condition.test.ts`
- **Requirements**：
  1. 导出 `evaluateCondition(condition: Condition, state: WorldState): boolean`。
  2. 六种比较符（`EQ`/`NEQ`/`GT`/`GTE`/`LT`/`LTE`）：用 T003 的 `resolveStatePath` 取值后与 `condition.value` 比较。**类型不匹配时（例如拿字符串和数字比大小）—— `EQ`/`NEQ` 正常按 `!==`/`===` 判定（类型不同必然不等），`GT`/`GTE`/`LT`/`LTE` 一律返回 `false`**（无法比较大小的默认视为不成立，不抛异常）。
  3. `IN`：解析值是否出现在 `condition.value` 数组中。
  4. `EXISTS`：解析结果非 `undefined` 即为 `true`——对 `discovered`/`activeThreats` 这两个数组容器，`EXISTS` 就是 T003 定义的成员判定本身。
  5. `all`/`any`/`not`：标准布尔组合，递归调用自身。
  6. `container` 为 `discovered`/`activeThreats` 时，只有 `EXISTS`（及其在 `not` 内的取反）有明确语义；`EQ`/`GT` 等比较符作用于这两个容器时统一返回 `false`（防御性默认，不抛异常）。
- **Acceptance**：六种比较符 + `IN` + `EXISTS` 各自正反例；`all(any(...))` 嵌套深度 ≥2 的组合正例；`discovered` 容器上误用 `GT` 返回 `false` 而非抛异常。

---

### T005 — StateEffect 应用

- **Allowed Files**：`src/effect.ts`、`src/effect.test.ts`
- **Requirements**：
  1. 导出 `applyEffect(effect: StateEffect, state: WorldState): WorldState`——**不修改传入的 `state`**，返回新对象。
  2. `SET`：对 `flags`/`chapterVariables`/`npc.field`/`danger.field` 直接赋值（用 T003 的 `writeStatePath`）。
  3. `INC`/`DEC`：仅对数值型目标有效；增量为 `effect.value`（若为 `number`），未提供时默认 `1`。`DEC` 等价于用负增量的 `INC`。目标当前值非数字时，视为从 `0` 开始累加（防御性默认，不抛异常）。
  4. `PUSH`：仅对 `discovered`/`activeThreats` 有效，把 `String(effect.value)` 加入对应数组——**幂等**（已存在则不重复添加）。作用于其它容器时原样返回不变的 state。
  5. `REMOVE`：仅对 `discovered`/`activeThreats` 有效，把 `String(effect.value)` 从对应数组移除（不存在则不变）。作用于其它容器时原样返回不变的 state。
  6. 每个测试用例都要验证：**输入的 `state` 对象在调用前后深度相等**（证明没有被就地修改）。
- **Acceptance**：五种 op 各自正例；`PUSH` 幂等性（重复 PUSH 同一个值，数组长度不增长）验证；不可变性验证覆盖全部五种 op。

---

### T006 — StateRuleSet 求值（含 once 语义）

- **Objective**：`StateRule.once` 要求"每章最多触发一次"，但本包是无状态纯函数库，不能自己"记住"跑过什么。因此把"记忆"的责任交还给调用方。
- **Allowed Files**：`src/ruleSet.ts`、`src/ruleSet.test.ts`
- **Requirements**：
  1. 导出 `applyStateRuleSet(ruleSet: StateRuleSet, state: WorldState, firedRuleIds: ReadonlySet<string>): { nextState: WorldState; newlyFiredRuleIds: string[] }`。
  2. 按 `ruleSet.rules` 数组顺序（顺序即优先级，源文件里怎么排就怎么求值）**依次**处理每条规则：若 `rule.once === true` 且 `rule.id` 已在 `firedRuleIds` 中，跳过；否则用 T004 求值 `rule.when`，成立则依次用 T005 把 `rule.effects` 累加应用到运行中的状态上，并把该 `id` 记入 `newlyFiredRuleIds`（若其 `once` 为真）。
  3. 多条规则可以在同一次调用里都触发（不是"只触发第一条匹配的"——这与 T007 的 Guard 语义不同，规则集是独立规则的集合，不是互斥分支）。
  4. `firedRuleIds` 是只读输入，本函数不修改它——**是否要把 `newlyFiredRuleIds` 持久化进 `WorldState.chapterVariables` 由调用方（未来的 DEV-009 Kernel）决定，本节点不做这个决定**。
- **Acceptance**：一条 `once` 规则在 `firedRuleIds` 已含其 id 时不再触发；多条规则在同一次调用里都触发的正例；规则效果按数组顺序累积应用（后一条规则能看到前一条规则改完的状态）。

---

### T007 — SceneGuard 解析

- **Allowed Files**：`src/guard.ts`、`src/guard.test.ts`
- **Requirements**：
  1. 导出 `resolveGuard(guards: SceneGuard[], state: WorldState): string | undefined`。
  2. 按 `priority`**数值从高到低**排序后逐个用 T004 求值 `when`，返回第一个成立的 `goto`；全部不成立返回 `undefined`（调用方此时应回退到 `SceneNode.next`，这是 Kernel/DEV-009 的职责，不在本函数内处理）。
  3. `priority` 全局唯一已由 DEV-001/DEV-002 的 Compiler 检查项保证，本函数不需要处理并列冲突。
- **Acceptance**：多个 guard 中优先级最高且成立的一个被选中（即使它在数组里排在后面）；全部不成立返回 `undefined`。

---

### T008 — 全量验证、REPORT 与 commit

- **Allowed Files**：`specs/dev/DEV-004/INDEX.md`、`specs/dev/DEV-004/REPORT.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-004.md`
- **Requirements**：
  1. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  2. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  3. 更新 `INDEX.md`：T001–T008 全部勾选，`Status: READY_FOR_REVIEW`，**每完成一个 Task 立即勾选**。
  4. `git add -A && git commit`，提交信息首行：`DEV-004: state rule engine`。
  5. 追加 LEDGER 行，发 `NODE_REPORT` 给 `AUDITOR`（cc `COMMANDER`）。
  6. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`REPORT.md` 八节齐全；`git log` 新增恰 1 条提交；LEDGER 含新记录。

---

## 8. Node INDEX Requirements

```markdown
# DEV-004 INDEX

Status: IN_PROGRESS

## Current Node

DEV-004 — State Rule Engine

## Objective

实现 Condition/StateEffect/StateRuleSet/SceneGuard 的运行时求值，纯函数，
不可变更新，不做 IO，不发 Event。

## Allowed Scope
（抄录 Task Package 第 3 节 Writable Scope 实际条目）

## Read-only Scope
（抄录 Task Package 第 3 节 Read-only Scope 实际条目）

## Forbidden Scope
（抄录 Task Package 第 3 节 Forbidden Scope 实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 包脚手架
- [ ] T003 StatePath 地址解析
- [ ] T004 Condition 求值
- [ ] T005 StateEffect 应用
- [ ] T006 StateRuleSet 求值（含 once 语义）
- [ ] T007 SceneGuard 解析
- [ ] T008 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001（每完成一个 Task 立即勾选并更新本字段）

## Exit Criteria

六条命令全部退出码 0；五类函数各自的正反例全部通过；`applyEffect` 的不可变性
在每个 op 上都有验证；REPORT.md 完成且 Status = READY_FOR_REVIEW；已向 AUDITOR
发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **纯函数，零副作用**：不读写文件、不发网络请求、不打印到 stdout（测试断言之外）、不构造或发送 `RuntimeEvent`。
2. **不可变更新**：`applyEffect`/`writeStatePath` 绝不修改传入的 `state` 参数。
3. **防御性求值，不抛异常**：未定义的寻址组合、类型不匹配的比较，一律返回安全默认值（`undefined`/`false`/原样不变），不 `throw`——引擎面对已编译内容必须保持健壮。
4. **`once` 的记忆责任在调用方**：本包不持有任何跨调用的状态。
5. **不引入 `zod` 依赖**——本包不做数据校验，只做已类型化对象的求值，`chapter-schema` 已经保证了类型正确性。
6. `CR-019` 不适用——纯函数库，无运行时服务/健康状态概念（未来被 DEV-009 Kernel 调用，Kernel 本身才是有健康状态的模块）。
7. Windows 环境：脚本 Git Bash / PowerShell 均可运行。
8. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现 Dice/Action/Result 相关任何逻辑（DEV-005/DEV-006）。
- 不构造、不发送 `RuntimeEvent`（DEV-008 类型已冻结，使用方是 DEV-009）。
- 不修改 `packages/chapter-schema` 的任何类型定义。
- 不实现"把 `newlyFiredRuleIds` 持久化进 `WorldState`"这个决定——那是调用方（DEV-009）的职责，本节点只把信息返回给调用方。
- 不创建真实产品内容，不做任何图/编译期分析（那些是 DEV-002/002A/003 已完成的）。
- 不引入任何异步逻辑。

---

## 11. Tests

### Unit tests

T003–T007 各自 `.test.ts`：正例 + 反例，覆盖第 7 节各任务描述的判定分支，含不可变性验证（T005）。

### Regression tests

`pnpm test` 覆盖全 workspace；`chapter-schema`/`chapter-compiler`/`runtime-kernel` 既有测试零回归。

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
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `packages/rule-engine` 的 `dependencies` 恰为 `{ @interactive-story/chapter-schema }`，无 `zod` | 文件检查 |
| A08 | `resolveStatePath` 五种 container 寻址正确，`npc` 复合 `flags.<subkey>` 寻址正确 | 测试检查 |
| A09 | `evaluateCondition` 六种比较符 + IN + EXISTS + all/any/not 全部正确；类型不匹配/无效容器返回安全默认值而非抛异常 | 测试检查 |
| A10 | `applyEffect` 五种 op 全部正确；`PUSH` 幂等；全部 op 验证不可变性（输入对象前后深度相等） | 测试检查 |
| A11 | `applyStateRuleSet` 的 `once` 语义正确（已触发的 once 规则不重复触发）；多规则同批次触发；效果按序累积 | 测试检查 |
| A12 | `resolveGuard` 按 priority 高到低选中正确的 `goto`；全不成立返回 `undefined` | 测试检查 |
| A13 | 包内不存在任何文件系统 IO、网络调用、`RuntimeEvent` 构造代码 | grep + 代码审查 |
| A14 | 包内不存在任何 `throw` 用于本应返回安全默认值的路径（第 9 节 Constraint 3） | 代码审查 |
| A15 | `specs/dev/DEV-004/` 节点文档齐全，`INDEX.md` T001–T008 全部勾选 | 文件 + 文本检查 |
| A16 | `git log` 新增恰 1 条提交，首行 `DEV-004: state rule engine`；提交时 `git status --porcelain` 为空 | 命令 |
| A17 | LEDGER 含 `NODE_REPORT-DEV-004` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A18 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**`、`packages/chapter-schema/**`、`packages/chapter-compiler/**`、`packages/runtime-kernel/**`、`packages/shared/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT → commit → 发 NODE_REPORT → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A18。
