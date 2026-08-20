# TASK PACKAGE — DEV-006

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-006 |
| Node Name | Action Resolution Engine（PASS 4） |
| Milestone | M1 — Story Machine Complete |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-004（DONE）、DEV-005（DONE） |
| Commander | Claude |
| Executor | Codex（协议角色名 `OPENCODE`） |

### 规范原文

第 65 节 DEV-006："实现：participant scale / dice quality / result lookup / world effects / player effects"。`DAG.md` CR-006 额外把 **PASS 4 Rule Coverage** 并入本节点。

### 本节点触碰两个已冻结包，职责按性质分开（与 DEV-002A 同一模式）

| 关注点 | 归属包 | 理由 |
|---|---|---|
| PASS 4（编译期，静态检查"每个可达 quality 都有合法结果"） | `packages/chapter-compiler`（追加式扩展） | 性质与 PASS1/2/3/5/6 相同——消费 `SchemaValidationResult` + DEV-003 可达集合，不碰运行时状态 |
| Action Resolution（运行时，参与规模/结果查表/效果提取） | `packages/rule-engine`（追加式扩展） | 与 DEV-004 是"同一求值器的两个使用面"（`DAG.md` CR-016），纯函数，不读文件 |

**不新建包**——两个目标包都已存在且已冻结部分内容，本节点是对它们的追加式扩展，边界规则与 DEV-003/DEV-002A 完全一致：只新增文件，或对既有文件只追加、不改动已有行。

### 一条重要的架构澄清：DEV-006 不掷骰，只消费已掷好的骰子结果

第 9 节 `ResolveInput.dice: DiceResult` 是**输入**，不是本节点去调用 `dice-engine.rollDice()`。真实流程是：`DICE.REQUESTED` → Kernel 调用 `dice-engine` 掷骰 → 掷骰结果（含已经算好的 `quality`）作为 `ResolveInput.dice` 喂给本节点。**本节点不import 并调用 `rollDice`，只 import `DiceRollResult` 类型**用于对齐 `ResolveInput.dice` 的字段形状，避免重复定义。

---

## 2. Current Objective

1. `packages/chapter-compiler` 新增 PASS4：对每个可达的 Action，判定其 `DiceProfile` 实际能摸到的每个 `Quality`，在对应 `ResultDictionary` 里是否都有合法（非 `unreachable`）结果。
2. `packages/rule-engine` 新增 Action Resolution：给定人数与规模档，给定已掷好的骰子结果，查出对应 `ResultEntry`，组装成 `ResolveResult`。**不实际应用 `worldEffects`**——那是调用方（未来的 DEV-009 Kernel）拿到 `ResolveResult.worldEffects` 后再用 DEV-004 的 `applyEffect` 去做的事，本节点只负责"算出该做什么"，不负责"真的去做"。

---

## 3. Scope

### Writable Scope — `packages/rule-engine`（新增文件）

```
packages/rule-engine/src/actionScale.ts
packages/rule-engine/src/actionScale.test.ts
packages/rule-engine/src/actionResolve.ts
packages/rule-engine/src/actionResolve.test.ts
```

### Writable Scope — `packages/rule-engine`（既有文件，仅追加）

```
packages/rule-engine/package.json（仅追加一行 dependencies: @interactive-story/dice-engine）
packages/rule-engine/tsconfig.json（仅追加 references 指向 ../dice-engine）
packages/rule-engine/src/index.ts（仅追加 export）
```

### Writable Scope — `packages/chapter-compiler`（新增文件）

```
packages/chapter-compiler/src/pass4RuleCoverage.ts
packages/chapter-compiler/src/pass4RuleCoverage.test.ts
packages/chapter-compiler/test-fixtures/coverage-gap/**
packages/chapter-compiler/test-fixtures/coverage-clean/**（若确认某既有 fixture 已满足，可省略改为直接复用）
```

### Writable Scope — `packages/chapter-compiler`（既有文件，仅追加）

```
packages/chapter-compiler/src/types.ts
packages/chapter-compiler/src/compile.ts
packages/chapter-compiler/src/compile.test.ts
packages/chapter-compiler/src/index.ts
packages/chapter-compiler/test-fixtures/README.md（仅追加条目）
```

### Writable Scope — 节点文档与通信（同既有惯例）

```
specs/dev/DEV-006/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md
specs/dev/DEV-006/DECISIONS.md（本节点有多条设计决策，几乎必须创建）
specs/dev/DEV-006/BLOCKERS.md（仅在需要时创建）
根 tsconfig.json（本节点两个目标包均已在 references 中，通常不需要改动；若发现缺失才追加）
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/rule-engine/src/statePath.ts、condition.ts、effect.ts、ruleSet.ts、guard.ts（及其 .test.ts）
packages/chapter-compiler/src/loader.ts、pass1Schema.ts、pass1Uniqueness.ts、referenceIndex.ts、
  pass2*.ts、pass3*.ts、pass5*.ts、pass6*.ts（及其 .test.ts）
packages/chapter-compiler/test-fixtures/valid-minimal/**、broken-*/**、graph-*/**、state-*/**、host-*/**
packages/dice-engine/**（全部，只读消费其 `DiceRollResult` 类型，不修改）
packages/chapter-schema/**、packages/runtime-kernel/**、packages/shared/**
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts
```

### Forbidden Scope

```
packages/* 除 rule-engine、chapter-compiler 外的任何目录
apps/**、chapters/**、assets/**、scripts/**、tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration、任何网络调用代码、任何文件系统 IO（rule-engine 侧）
调用 dice-engine 的 rollDice/resolveQuality 等函数（本节点只消费其类型，不调用其函数）
RuntimeEvent 的构造或发送
实际应用 worldEffects/playerEffects（只返回，不执行——那是 Kernel 的职责）
Narrative 文本拼装（DEV-033）
```

---

## 4. Required Skills

### Required

- Zod-free 的纯 TypeScript 类型设计（`ResolveInput`/`ResolveResult` 是运行时接口类型，不需要 Zod 校验——它们在进程内传递，不来自文件）
- 静态覆盖性分析（PASS4：给定一个数值区间的分段查表，判定某个离散值集合是否都有对应的合法映射）

### Forbidden / Unnecessary

- 骰子随机数逻辑（DEV-005 已完成，本节点只读其输出类型）
- Condition/Effect 的运行时求值实现（DEV-004 已完成；本节点若要判定 Guard/Condition，直接 import 现成函数，不重新实现）
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `ActionDefinition`/`ScaleBand`/`WorldRules`（chapter-schema） | 规模判定的数据来源 |
| `ResultDictionary`/`ResultEntry`/`Quality`/`PlayerEffect`（chapter-schema） | 结果查表 |
| `DiceProfile.qualityThresholds`（chapter-schema） | PASS4 判定"这个 Action 实际能摸到哪些 quality" |
| `DiceRollResult`（`dice-engine`，仅取其类型形状） | `ResolveInput.dice` 字段对齐，不调用其函数 |
| DEV-003 冻结导出：可达节点集合 | PASS4 只检查可达 Action，不检查死内容 |

---

## 6. Outputs

### `packages/rule-engine`

1. `resolveScale(participantCount: number, bands: ScaleBand[]): ActionScale`
2. `type ResolveInput`、`type ResolveResult`（第 9 节原文形状，`playerStateSummary` 字段的处置见 T004 的 Decision 要求）
3. `resolveAction(input: ResolveInput, action: ActionDefinition, resultDict: ResultDictionary): ResolveResult | undefined`

### `packages/chapter-compiler`

4. `checkRuleCoverage(schemaResult, pass3: Pass3Result): RuleCoverageIssue[]`
5. `compile()` 扩展：`CompileResult` 新增 `ruleCoverageIssues` 字段

### 文档

6. `specs/dev/DEV-006/` 节点文档，含 `DECISIONS.md`（记录 `playerStateSummary` 省略的理由、`worldState` 保留但未被读取的理由、mapsTo 单跳限制的处置）

---

## 7. Task Breakdown

> **通用约定**：`rule-engine` 侧全部测试用手写对象，不需要 fixture。`chapter-compiler` 侧的 PASS4 测试需要 fixture（复制既有 `valid-minimal` 或 `graph-clean` 改一处，禁止另写生成脚本——沿用 DEV-003/002A 已确立的纪律）。

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-006/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Acceptance**：四文件存在；`INDEX.md` 含原句；Task Order 恰 T001–T008。

---

### T002 — `rule-engine` 依赖追加

- **Allowed Files**：`packages/rule-engine/package.json`、`tsconfig.json`
- **Requirements**：
  1. `package.json` 的 `dependencies` 追加 `"@interactive-story/dice-engine": "workspace:*"`（保留既有 `@interactive-story/chapter-schema` 不变）。
  2. `tsconfig.json` 的 `references` 追加指向 `../dice-engine`（保留既有指向 `chapter-schema` 不变）。
- **Acceptance**：`pnpm install` 成功；`rule-engine` 的 `dependencies` 恰为两项（`chapter-schema` + `dice-engine`），无其它新增。

---

### T003 — 参与规模判定

- **Allowed Files**：`src/actionScale.ts`、`src/actionScale.test.ts`
- **Requirements**：
  1. 导出 `resolveScale(participantCount: number, bands: ScaleBand[]): ActionScale`。
  2. 按数组顺序找第一个满足 `minParticipants <= participantCount && (maxParticipants === null || participantCount <= maxParticipants)` 的 band，返回其 `scale`。
  3. **防御性兜底**（理论上不该触发，因为 DEV-002 T008 已验证 bands 完整覆盖不重叠）：全部不匹配时，返回数组中 `maxParticipants === null` 的那个 band 的 `scale`；若连这个都没有，返回 `"MASS"`。此兜底逻辑与理由记入 `DECISIONS.md`。
- **Acceptance**：多档 band 各自的边界值（`minParticipants`、`maxParticipants` 两端）正确命中；故意构造"全不匹配"的反例验证兜底行为。

---

### T004 — Action Resolution 编排

- **Objective**：交付第 9 节 `ResolveInput`/`ResolveResult` 与顶层 `resolveAction`。
- **Allowed Files**：`src/actionResolve.ts`、`src/actionResolve.test.ts`、`src/index.ts`（追加导出）
- **Requirements**：
  1. 定义 `interface ResolveInput { chapterId: string; sceneId: string; interactionId: string; actionId: string; participantCount: number; dice: DiceRollResult; worldState: WorldState }`。
     **`playerStateSummary` 字段不包含在内**——第 9 节原文提到它，但其形状从未在任何已冻结节点中定义，且本节点全部必需计算（规模/结果查表/效果提取）都不需要读取它。省略比发明一个当前无消费者的新类型更符合"不做投机性设计"的纪律。若未来某节点确实需要它，走 Change Request 补上，成本很低（新增字段，不破坏现有调用方）。此决策记入 `DECISIONS.md`。
     **`worldState: WorldState` 字段保留**，即使本节点当前的计算逻辑不读取它的任何字段——它复用的是已经完整定义好的冻结类型，不需要发明新结构，保留的成本是零，且第 9 节原文明确列出这个字段，为未来可能的状态相关结果变化留一个不需要破坏性改动接口就能用上的位置。这条决策与上一条"省略 playerStateSummary"的区别（一个发明新结构、一个零成本传递既有结构）也要记入 `DECISIONS.md`。
  2. 定义 `interface ResolveResult { actionId: string; scale: ActionScale; quality: Quality; resultId: string; worldEffects: StateEffect[]; playerEffects: PlayerEffect[]; narrativeId: string; visibility: "PUBLIC" | "DEFERRED" }`。
  3. 导出 `resolveAction(input: ResolveInput, action: ActionDefinition, worldRules: WorldRules, resultDict: ResultDictionary): ResolveResult | undefined`：
     - `input.dice.quality` 为 `undefined` 时直接返回 `undefined`（骰子那边没能判出等级，本节点无法继续，不抛异常）。
     - 用 T003 的 `resolveScale(input.participantCount, action.scaleBands ?? worldRules.defaultScaleBands)` 得到 `scale`。
     - 在 `resultDict.entries` 里找 `quality` 匹配的条目：
       - 完整结果条目：直接使用其 `resultId`/`worldEffects`/`playerEffects`/`narrativeId`/`visibility`。
       - `mapsTo` 条目：**只跟一跳**，在同一 `resultDict` 里找 `mapsTo` 指向的 quality 对应的条目；那一跳必须是完整结果条目，否则（它还是 `mapsTo` 或 `unreachable`）视为解析失败，返回 `undefined`——**不递归多跳**，这是防止内容错误导致死循环的硬边界，即使这样会牺牲某些理论上可以多跳解析成功的畸形内容，这个取舍记入 `DECISIONS.md`。
       - `unreachable: true` 条目：返回 `undefined`（骰子摸到了一个内容作者标记为不可能出现的等级——理论上 PASS4 应该已经防止这种情况在可达 Action 上发生，但运行时仍要防御）。
       - 找不到任何匹配 quality 的条目（不应该发生，因为 chapter-schema 保证六等级必须全覆盖）：返回 `undefined`。
     - 组装并返回 `ResolveResult`。
- **Acceptance**：完整结果、`mapsTo` 单跳、`unreachable`、`quality: undefined`（骰子未判出等级）四种情形各自的正确行为都有测试；`mapsTo` 指向另一个 `mapsTo` 的畸形反例返回 `undefined` 而非抛异常或死循环。

---

### T005 — PASS 4：Rule Coverage 判定

- **Objective**：交付第 24 节 PASS4——"每个可达 Action 实际能摸到的每个 quality，在其 ResultDictionary 里都有合法结果"。
- **Allowed Files**：`src/pass4RuleCoverage.ts`、`src/pass4RuleCoverage.test.ts`
- **Requirements**：
  1. 导出 `checkRuleCoverage(schemaResult: SchemaValidationResult, pass3: Pass3Result): RuleCoverageIssue[]`。
  2. 对每个**可达**（通过某个可达 Interaction 的某个 Choice 引用到）且**去重后唯一**的 `ActionDefinition`：
     - 找到其 `diceProfileId` 对应的 `DiceProfile`，从 `qualityThresholds` 得到"这个 Action 实际能摸到"的 quality 集合（每条 threshold 贡献一个 quality；若同一 quality 被多条 threshold 覆盖，去重）。
     - 找到其 `resultSetId` 对应的 `ResultDictionary`。
     - 对每个"实际能摸到"的 quality：查 `ResultDictionary` 对应条目——若是 `unreachable: true`，产出 `RuleCoverageIssue`（骰子能摸到、但内容说这不可能，矛盾）；若是完整结果或合法的单跳 `mapsTo`，视为合法覆盖；`mapsTo` 指向另一个非法目标（多跳或指向 `unreachable`）同样产出 `RuleCoverageIssue`。
  3. **不检查"摸不到的 quality 是否被误标为完整结果"**——那只是死内容（浪费但不是 bug），不属于第 24 节"必须存在合法结果"这句话的字面要求，硬要检查属于范围外的扩权。
- **Acceptance**：一个 Action 的 `DiceProfile` 能摸到某 quality、但对应 `ResultDictionary` 条目是 `unreachable: true` 的反例被检出；`mapsTo` 单跳合法的正例不误报；同一 Action 被多个可达 Interaction 的 Choice 共同引用时只检查一次（不重复报告）。

---

### T006 — compile() 编排扩展（PASS4 接入）

- **Allowed Files**：`packages/chapter-compiler/src/types.ts`（追加）、`compile.ts`（追加）、`compile.test.ts`（追加）、`index.ts`（追加）
- **Requirements**：
  1. `types.ts` 新增 `RuleCoverageIssue`/`RuleCoverageIssueCategory`（至少一类：`UNREACHABLE_BUT_ROLLABLE`）。
  2. `compile.ts` 新增 `function runPass4(schemaResult, pass3: Pass3Result): RuleCoverageIssue[]`（直接调用 T005 的 `checkRuleCoverage`）；`CompileResult` 新增 `ruleCoverageIssues: RuleCoverageIssue[]` 字段；`passed` 判定追加 `&& ruleCoverageIssues.length === 0`。
  3. `compile.test.ts` 中既有全部断言逐字保留，新增断言追加。
  4. `index.ts` 追加导出。
- **Acceptance**：既有测试零回归；新增断言覆盖"合法 fixture 触发 `ruleCoverageIssues: []`"与"覆盖缺口 fixture 触发非空"。

---

### T007 — PASS4 测试 Fixture

- **Allowed Files**：`test-fixtures/coverage-gap/**`、`test-fixtures/coverage-clean/**`（可选，若确认既有 fixture 已足够覆盖正例可省略）、`test-fixtures/README.md`（仅追加）
- **Requirements**：
  1. 复制既有合法 fixture（如 `valid-minimal` 或 `graph-clean`），改动其 `DiceProfile`/`ResultDictionary` 使某个可摸到的 quality 对应 `unreachable: true`，制造覆盖缺口。
  2. **不写生成脚本**。
  3. fixture 必须先通过 PASS1/2/3/5/6，只在 PASS4 层面失败。
- **Acceptance**：`coverage-gap` fixture 触发 `ruleCoverageIssues` 非空；正例（复用既有 clean fixture）触发 `ruleCoverageIssues: []`。

---

### T008 — 全量验证、REPORT 与 commit

- **Allowed Files**：`specs/dev/DEV-006/INDEX.md`、`specs/dev/DEV-006/REPORT.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-006.md`
- **Requirements**：
  1. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  2. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  3. **`DECISIONS.md` 必须已提交**（DEV-004 的教训：REPORT 引用但未提交会被判 FAIL）。
  4. 更新 `INDEX.md`：T001–T008 全部勾选，每完成一个 Task 立即勾选。
  5. `git add -A && git commit`，提交信息首行：`DEV-006: action resolution engine (PASS 4)`。
  6. 追加 LEDGER 行，发 `NODE_REPORT`。
  7. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`REPORT.md` 引用的全部文档已入库；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-006 INDEX

Status: IN_PROGRESS

## Current Node

DEV-006 — Action Resolution Engine（PASS 4）

## Objective

rule-engine 追加参与规模判定与 Action Resolution 编排；chapter-compiler 追加 PASS4
Rule Coverage 检查。两包均为追加式扩展，不新建包。

## Allowed Scope（rule-engine 新增文件）
（抄录 Task Package 第 3 节实际条目）

## Allowed Scope（rule-engine 既有文件，仅追加）
（抄录 Task Package 第 3 节实际条目）

## Allowed Scope（chapter-compiler 新增文件）
（抄录 Task Package 第 3 节实际条目）

## Allowed Scope（chapter-compiler 既有文件，仅追加）
（抄录 Task Package 第 3 节实际条目）

## Read-only Scope
（抄录 Task Package 第 3 节实际条目）

## Forbidden Scope
（抄录 Task Package 第 3 节实际条目，含"不得调用 dice-engine 的函数"）

## Task Order

- [ ] T001 节点文档
- [ ] T002 rule-engine 依赖追加
- [ ] T003 参与规模判定
- [ ] T004 Action Resolution 编排
- [ ] T005 PASS 4：Rule Coverage 判定
- [ ] T006 compile() 编排扩展
- [ ] T007 PASS4 测试 Fixture
- [ ] T008 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001（每完成一个 Task 立即勾选并更新本字段）

## Exit Criteria

六条命令全部退出码 0；`resolveAction` 四种分支行为正确；PASS4 正确检出覆盖缺口且
不误报；`DECISIONS.md` 已随提交入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；
已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **不调用 `dice-engine` 的任何函数**（`rollDice`/`resolveQuality`/`resolveModifiers` 等）——只 import 其类型（`DiceRollResult`）。骰子已经掷好，本节点只消费结果。
2. **不实际应用效果**——`resolveAction` 只返回 `worldEffects`/`playerEffects`，不调用 `applyEffect`，不修改任何 `WorldState`。
3. **`mapsTo` 只跟一跳**，多跳或指向非法目标一律返回 `undefined`，不递归、不抛异常。
4. **PASS4 只检查可达内容**，不对不可达 Action 报告覆盖缺口（那是死内容，不是 bug）。
5. **既有文件仅追加**——两个目标包被列为"仅追加"的文件，`git diff` 只能是新增行。
6. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
7. `CR-019` 不适用——两侧都是纯函数/静态分析库。
8. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现骰子随机数逻辑（DEV-005 已完成）。
- 不实现效果的实际应用（DEV-004 的 `applyEffect` 已提供，调用时机是 Kernel 的职责，DEV-006 不调用）。
- 不实现 Narrative 文本拼装（DEV-033）。
- 不实现 PASS7/PASS8。
- 不检查"摸不到的 quality 被误标为完整结果"这类死内容（非 bug，范围外）。
- 不修改 `packages/chapter-schema`、`packages/dice-engine`、`packages/runtime-kernel`、`packages/shared`。
- 不新建包。

---

## 11. Tests

### Unit tests

`rule-engine` 侧手写对象测试；`chapter-compiler` 侧 PASS4 用 fixture 测试（复制现成正例改一处）。

### Regression tests

`pnpm test` 覆盖全 workspace；两个目标包及其它既有包测试零回归。

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
| A07 | `rule-engine` 的 `dependencies` 恰为 `{ chapter-schema, dice-engine }` | 文件检查 |
| A08 | `resolveScale` 边界值正确；全不匹配时的兜底行为正确 | 测试检查 |
| A09 | `resolveAction` 四种分支（完整结果/mapsTo 单跳/unreachable/quality undefined）行为正确；畸形多跳 mapsTo 返回 undefined 不抛异常 | 测试检查 |
| A10 | `checkRuleCoverage` 正确检出覆盖缺口，不误报可达但结果完整的 Action，不重复检查被多处引用的同一 Action | 测试检查 |
| A11 | `compile()` 的 `passed` 正确纳入 `ruleCoverageIssues` | 测试检查 |
| A12 | `packages/rule-engine`/`packages/chapter-compiler` 被列为只读的既有源文件 `git diff` 为空 | git diff |
| A13 | 两包被列为"仅追加"的文件，既有代码行 `git diff` 只含新增 | git diff 逐行 |
| A14 | 包内不存在对 `dice-engine` 内部函数（`rollDice`/`resolveQuality`/`resolveModifiers`）的调用，只有类型 import | grep + 代码审查 |
| A15 | 包内不存在实际应用 `worldEffects`/`playerEffects` 的代码（无调用 `applyEffect`） | grep + 代码审查 |
| A16 | `DECISIONS.md` 存在，记录 `playerStateSummary` 省略理由、`worldState` 保留理由、`mapsTo` 单跳限制理由 | 文件检查 |
| A17 | `specs/dev/DEV-006/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T008 全部勾选 | 文件 + 文本检查 |
| A18 | `git log` 新增恰 1 条提交，首行 `DEV-006: action resolution engine (PASS 4)`；提交时 `git status --porcelain` 为空 | 命令 |
| A19 | LEDGER 含 `NODE_REPORT-DEV-006` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A20 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**`、`packages/chapter-schema/**`、`packages/dice-engine/**`、`packages/runtime-kernel/**`、`packages/shared/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT（含确认 `DECISIONS.md` 已提交）→ commit → 发 NODE_REPORT → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A20。
