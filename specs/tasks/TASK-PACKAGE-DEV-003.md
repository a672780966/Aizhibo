# TASK PACKAGE — DEV-003

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-003 |
| Node Name | Story Graph Analyzer（PASS 3 + PASS 5） |
| Milestone | M1 — Story Machine Complete |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-002（DONE，接口冻结，`git_head 75f2554`） |
| Commander | Claude |
| Executor | Codex（协议角色名 `OPENCODE`，见 `COMMS-PROTOCOL-V1.md` 附录 A 顶部说明） |

### 规范原文（第 65 节）

```text
## DEV-003
### Story Graph Analyzer
实现：
Reachability / Dead ends / Cycles / Boss reachability / Ending reachability
```

`DAG.md` CR-006 额外把 **PASS 5 State Reachability** 并入本节点（"原无归属；与 PASS 3 同源合并"，因为两者都是"给定图/状态空间，什么是真正可达的"这一类静态分析）。

| PASS | 归属 |
|---|---|
| PASS 3 Graph（Reachability / Dead-end / Unreachable node / Infinite loop / Ending reachability / Boss reachability） | **DEV-003（本节点）** |
| PASS 5 State Reachability（Ending/Recovery 可满足性、StatePath 键存在性所需的可达状态集合） | **DEV-003（本节点）** |

### 本节点是对已冻结包的增量扩展，不是新包

`packages/chapter-compiler` 已被 DEV-002 冻结。仓库 17 包清单中**没有**独立的"story-graph-analyzer"包——PASS 3/5 在概念上是同一个 Compiler 的更多 PASS，继续加进 `chapter-compiler`。这意味着本节点的 Scope 边界比前几个节点更细：**同一个包内，部分文件冻结只读，部分文件允许追加式修改**，见第 3 节。

### 下游依赖

`DAG.md` 已注明：**DEV-002A（PASS 6 Hidden Information）依赖本节点**——`ADDENDUM-001 §A15` 的时序性判定需要 PASS 3 的可达节点集合与 PASS 5 的可达状态集合。本节点的输出类型必须清晰导出（`index.ts`），供 DEV-002A 直接消费，不得只是内部使用完就丢弃的中间变量。

### 权威输入

1. Dev Spec V1.0 第 24 节（PASS 3、PASS 5 原文）
2. 现有 `packages/chapter-compiler` 源码（`types.ts`、`compile.ts`、`pass1Schema.ts` 的 `SchemaValidationResult` 形状——本节点直接消费，不重新解析）
3. `specs/audit/SPEC-ADDENDUM-001.md` §A11（Boss）、§A12（Endings）、§A6（StateRules，StatePath 存在性检查）、§A13（Recovery）
4. `specs/dev/DAG.md` CR-006 决议

---

## 2. Current Objective

在 `packages/chapter-compiler` 内新增 PASS 3（图分析）与 PASS 5（状态可达性）两组函数，追加进 `compile()` 的编排流程，**不改动 DEV-002 已冻结的 PASS 1/PASS 2 任何文件的内容**。

**核心设计前提，必须遵守**：PASS 5 是**保守的过近似（over-approximation）**，不是精确的路径敏感符号执行。它只回答"某个 key/value 组合是否可能由某条可达路径产生"，不追踪"在某个具体场景那一刻，flag 的精确值是什么"。**宁可把不确定的东西判定为"可能可达"而放行，也不能把真正可达的内容误判为不可达而挡下**——假阴性（漏判死内容）好过假阳性（错杀活内容）。这不是偷懒，是第 24 节 PASS 5 原文"不是穷举所有布尔排列，只追踪 Story Graph 中真正可达的状态"这句话在工程上唯一可行的实现方式；真正精确的状态空间分析是不可判定/指数级的，对当前产品规模没有必要（反过度设计）。

---

## 3. Scope

### Writable Scope — 新增文件

```
packages/chapter-compiler/src/pass3GraphModel.ts
packages/chapter-compiler/src/pass3GraphModel.test.ts
packages/chapter-compiler/src/pass3Reachability.ts
packages/chapter-compiler/src/pass3Reachability.test.ts
packages/chapter-compiler/src/pass3Cycles.ts
packages/chapter-compiler/src/pass3Cycles.test.ts
packages/chapter-compiler/src/pass5ReachableState.ts
packages/chapter-compiler/src/pass5ReachableState.test.ts
packages/chapter-compiler/src/pass5Satisfiability.ts
packages/chapter-compiler/src/pass5Satisfiability.test.ts
packages/chapter-compiler/test-fixtures/graph-clean/**
packages/chapter-compiler/test-fixtures/graph-dead-end/**
packages/chapter-compiler/test-fixtures/graph-unreachable-scene/**
packages/chapter-compiler/test-fixtures/graph-unreachable-ending/**
packages/chapter-compiler/test-fixtures/graph-unreachable-boss/**
packages/chapter-compiler/test-fixtures/graph-trap-cycle/**
packages/chapter-compiler/test-fixtures/state-unsatisfiable-ending/**
packages/chapter-compiler/test-fixtures/state-unsatisfiable-recovery/**

specs/dev/DEV-003/INDEX.md
specs/dev/DEV-003/REQUIREMENTS.md
specs/dev/DEV-003/ACCEPTANCE.md
specs/dev/DEV-003/REPORT.md
specs/dev/DEV-003/DECISIONS.md      （仅在需要记录决策时创建）
specs/dev/DEV-003/BLOCKERS.md       （仅在出现 blocker 时创建）

specs/comms/LEDGER.md               （仅追加行）
specs/comms/NNNN-OPENCODE-to-*.md   （仅自己发出的消息）
```

### Writable Scope — 既有文件，仅允许追加式修改

```
packages/chapter-compiler/src/types.ts     （只许新增类型/接口，不得修改或删除现有导出）
packages/chapter-compiler/src/compile.ts   （只许新增 runPass3/runPass5 与扩展 CompileResult 新增字段，
                                             不得修改 runPass1/runPass2/loadChapterPack 的现有行为）
packages/chapter-compiler/src/compile.test.ts（只许新增测试用例，不得删除或修改 DEV-002 已有断言）
packages/chapter-compiler/src/index.ts     （只许新增 export，不得删除或重排现有 export）
packages/chapter-compiler/test-fixtures/README.md（仅追加新增 fixture 目录的说明，不改写已有条目）
```

**"追加式修改"的判定标准**：对上述 5 个文件跑 `git diff`，其中不涉及 DEV-003 新增内容的每一行原有代码必须逐字不变（允许纯粹的插入，不允许对已有行的编辑）。

### Read-only Scope — 本节点内被冻结、禁止触碰

```
packages/chapter-compiler/package.json
packages/chapter-compiler/tsconfig.json
packages/chapter-compiler/src/loader.ts、loader.test.ts
packages/chapter-compiler/src/pass1Schema.ts、pass1Schema.test.ts
packages/chapter-compiler/src/pass1Uniqueness.ts、pass1Uniqueness.test.ts
packages/chapter-compiler/src/referenceIndex.ts、referenceIndex.test.ts
packages/chapter-compiler/src/pass2StoryGraph.ts、pass2StoryGraph.test.ts
packages/chapter-compiler/src/pass2ActionChain.ts、pass2ActionChain.test.ts
packages/chapter-compiler/src/pass2NpcVisuals.ts、pass2NpcVisuals.test.ts
packages/chapter-compiler/src/pass2BossRecovery.ts、pass2BossRecovery.test.ts
packages/chapter-compiler/test-fixtures/valid-minimal/**
packages/chapter-compiler/test-fixtures/broken-*/**
packages/chapter-compiler/dist/**（构建产物，不手工修改）

packages/chapter-schema/**、packages/runtime-kernel/**、packages/shared/**（其它冻结包）
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts、根 tsconfig.json
```

### Forbidden Scope

```
packages/* 除 chapter-compiler 外的任何目录
apps/**、chapters/**、assets/**、scripts/**、tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration、任何网络调用代码
第三方图算法库（如 graphlib）——图规模小，手写 SCC/BFS 即可，见第 9 节
```

---

## 4. Required Skills

### Required

- 图算法：BFS/DFS 可达性、Tarjan 或 Kosaraju 强连通分量（SCC）算法（用于陷阱环检测）
- 保守静态分析的设计思维（过近似 vs 精确分析的取舍，见第 2 节）
- TypeScript：在不破坏既有导出的前提下扩展一个模块的公共接口

### Optional

- 图的凝聚（condensation）思想，用于把 SCC 检测转化为"零出边非终结分量"检测

### Forbidden / Unnecessary

- 精确的路径敏感符号执行 / 模型检测（Model Checking）——规模与需求都不需要
- Condition 求值引擎的运行时版本（DEV-004 的职责；本节点只做"这个 key 有没有被声明/可能取到某个值"的静态存在性判断，不实现"给定一个具体 WorldState 实例，这个 Condition 现在成不成立"这类函数）
- 骰子、叙事生成、资产文件存在性检查
- Compile–Repair Loop、AI 相关任何逻辑
- 第三方图/图数据库依赖
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `SchemaValidationResult`（`pass1Schema.ts` 导出，PASS1 产物） | 本节点全部分析的唯一数据来源——只处理 PASS1 通过的条目 |
| `ChapterManifest.entryNodeId` | 可达性分析的起点 |
| `StoryGraph.nodes[]`（kind: SCENE/BOSS/ENDING） | 图节点集合 |
| `SceneNode.next` / `.guards[].goto` / `.interactionId` | 场景出边来源 |
| `InteractionNode.nextScene` | 场景经由互动转移的最终目标（`nextScene` 是互动节点上的单一字段，不按 quality 分支——第 21 节原文如此，图层面只需要这一个目标） |
| `BossNode.onDefeat` / `.onFailure` | Boss 节点出边（Boss 内部各 `BossPhase.interactionId → nextScene` 的自环已由 DEV-002 T010 校验过必然指回 Boss 自身或其 onDefeat/onFailure，图层面把 Boss 视为一个节点，内部相位跳转不单独建模） |
| `EndingNode` | 终结节点，无出边 |
| `initial.state.json`（`WorldState`） | PASS5 可达键集合的初始种子 |
| `ResultDictionary` 各 `ResultEntry.worldEffects`、`BossNode.variables`、`StateRuleSet`（经 `BossNode.stateRuleSetId` 引用） | PASS5 可达键值集合的效果来源 |

---

## 6. Outputs

1. `runPass3(schemaResult): Pass3Result`——可达节点集合、死路列表、不可达节点列表、不可达 Ending 列表、不可达 Boss 列表、陷阱环列表
2. `runPass5(schemaResult, pass3): Pass5Result`——可达 key/value 集合、不可满足 Ending 列表、不可满足 Recovery 规则列表
3. `compile()` 编排扩展：`CompileResult` 新增 `graphIssues`、`stateIssues` 字段，`passed` 判定同步纳入这两类
4. `index.ts` 导出全部新增类型与函数，供 DEV-002A 消费
5. 8 组新增测试 fixture（图缺陷类 6 组 + 状态不可满足类 2 组）
6. `specs/dev/DEV-003/` 四份（或五份）节点文档

---

## 7. Task Breakdown

### T001 — 节点文档

- **Objective**：创建 DEV-003 节点文档。
- **Allowed Files**：`specs/dev/DEV-003/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Requirements**：INDEX 采用第 8 节模板，Task Order 列 T001–T009；REQUIREMENTS 抄第 3/6/9/10 节；ACCEPTANCE 抄第 12 节全部 A 项；REPORT 建骨架。
- **Acceptance**：四文件存在；`INDEX.md` 含原句 `OpenCode 禁止自行推进下一 DEV Node.`；Task Order 恰 T001–T009。

---

### T002 — 故事图模型构建

- **Objective**：把 `SchemaValidationResult` 里分散的 Scene/Interaction/Boss/Ending 数据，收拢成一个统一的图结构，供后续所有分析复用。
- **Allowed Files**：`src/pass3GraphModel.ts`、`src/pass3GraphModel.test.ts`
- **Requirements**：
  1. 导出 `type StoryGraphNodeKind = "SCENE" | "BOSS" | "ENDING"`、`interface StoryGraphModel { nodes: Map<string, StoryGraphNodeKind>; edges: Map<string, Set<string>> }`。
  2. 导出 `buildStoryGraphModel(schemaResult: SchemaValidationResult): StoryGraphModel`。
  3. 节点来源：`schemaResult.storyGraph.passed.nodes[]`（每个 `StoryGraphNode` 贡献一个图节点，`kind` 取自其声明）。
  4. 边的构建规则（每类各自贡献，取并集，不做条件判断——静态分析阶段不知道运行时哪个 guard 会成立）：
     - 每个 PASS1 通过的 `SceneNode`：若有 `next`，加一条边；`guards[]` 每项的 `goto` 各加一条边；若有 `interactionId`，查找对应 `InteractionNode.nextScene`，加一条边。
     - 每个 PASS1 通过的 `BossNode`：`onDefeat`、`onFailure` 各加一条边。
     - `EndingNode`：不产生任何出边。
  5. **不处理 PASS1 未通过的条目**——它们的字段可能是任意值，不构成可信的图结构来源。
  6. 本模块**不做任何有效性判断**（不检查目标是否存在——那已经是 DEV-002 PASS2 确认过的事，本节点信任其结果），只负责"组装"。
- **Acceptance**：对 T009 的 `graph-clean` fixture，构建出的模型节点数与 `story.graph.json` 声明数一致；某 Scene 同时具备 `next` 与 `guards` 时，两条边都出现在 edges 集合里（验证"并集不做条件判断"）。

---

### T003 — PASS 3：可达性 / 死路 / Ending 与 Boss 可达性

- **Objective**：从入口做一次可达性扫描，覆盖第 24 节 PASS3 除"环检测"外的全部条目。
- **Allowed Files**：`src/pass3Reachability.ts`、`src/pass3Reachability.test.ts`
- **Requirements**：
  1. 导出 `interface Pass3ReachabilityResult { reachable: Set<string>; deadEnds: string[]; unreachableNodes: string[]; unreachableEndings: string[]; unreachableBosses: string[] }`。
  2. 导出 `computeReachability(graph: StoryGraphModel, entryNodeId: string): Pass3ReachabilityResult`。
  3. 可达集合：从 `entryNodeId` 做 BFS/DFS，沿 `edges` 遍历。
  4. **死路**：`kind !== "ENDING"` 且出边数为 0 的可达节点（`ENDING` 天然无出边，不算死路；不可达节点的死路状态没有讨论意义，只检查可达节点）。
  5. **不可达节点**：图中存在但不在可达集合里的全部节点 id（不分 kind）。
  6. **不可达 Ending / Boss**：`unreachableNodes` 按 `kind` 过滤出的子集（不是独立算法，是同一份结果的两个视图）。
  7. `ADDENDUM-001 §A12`"所有 Ending 节点在图上可达"——因此**任何**不可达 Ending 都要报告，不只是 fallback ending。
- **Acceptance**：`graph-dead-end`/`graph-unreachable-scene`/`graph-unreachable-ending`/`graph-unreachable-boss` 四组 fixture 各自触发对应字段非空，其余字段为空（验证分类不串扰）。

---

### T004 — PASS 3：陷阱环检测

- **Objective**：交付"Infinite loop detection"，且不能把正常的可逃逸循环（例如"返回大厅"这种有其它出口的循环）误判为缺陷。
- **Allowed Files**：`src/pass3Cycles.ts`、`src/pass3Cycles.test.ts`
- **Requirements**：
  1. 导出 `interface TrapCycle { members: string[] }`、`function detectTrapCycles(graph: StoryGraphModel, reachable: Set<string>): TrapCycle[]`。
  2. **只分析可达子图**（不可达节点已经被 T003 单独报告，不需要在环检测里重复出现）。
  3. 算法：对可达子图求强连通分量（SCC，手写 Tarjan 或 Kosaraju，不引入第三方库）。一个 SCC 被判定为"陷阱"当且仅当：该 SCC 内所有节点的出边全部指向 SCC 内部（没有任何一条边离开该 SCC），**且** SCC 不是单个 `ENDING` 节点自身（`ENDING` 没有出边是设计如此，不是陷阱）。
  4. 单节点自环（一个节点的边指向自己）按同一标准处理——如果这个自环节点没有其它出边，也判定为陷阱（`ENDING` 除外）。
  5. **明确不报告的情况**：一个循环里有节点存在至少一条离开循环的边（哪怕那条边本身还没被验证为"运行时一定会走到"——静态分析无法知道 guard 条件是否成立，只要图上存在这条边就认为"有逃逸的可能性"，不报告为陷阱。这正是第 2 节"过近似"设计前提的直接应用）。
- **Acceptance**：`graph-trap-cycle` fixture（一组彼此往返、没有任何出口的场景）被检出；另需一条正例 fixture/用例：一个循环内某节点有一条通向循环外的边，不被判定为陷阱。

---

### T005 — PASS 5：可达状态集合构建

- **Objective**：构建"哪些 key 在哪些取值下，理论上可能被某条可达路径产生"的保守集合。
- **Allowed Files**：`src/pass5ReachableState.ts`、`src/pass5ReachableState.test.ts`
- **Requirements**：
  1. 导出 `interface ReachableStateModel { keys: Map<string, Set<string | number | boolean>> }`（key 格式为 `"<container>.<field>"`，如 `"flags.hasKey"`、`"danger.level"`）。
  2. 导出 `buildReachableStateModel(schemaResult: SchemaValidationResult, reachableNodeIds: Set<string>): ReachableStateModel`。
  3. 种子来源：`initial.state.json`（`WorldState`）声明的全部键（`flags`、`chapterVariables`、`npc.*`、`danger.*`），无论具体取值，先登记键本身存在。
  4. 效果来源（**只统计可达节点相关的效果**，不可达的 Action/Boss 贡献的效果不计入，因为它们不可能真的发生）：
     - 每个 `ResultEntry.worldEffects[]`（`StateEffect`）：只要该 `ResultEntry` 所属的 `ResultDictionary` 被某个可达节点上、可达 Interaction 里某个 Choice 的 `ruleId → ActionDefinition.resultSetId` 链路引用到，就把该 `StateEffect` 的 `{path, value}`（若 `op` 为 `SET`；`INC`/`DEC`/`PUSH`/`REMOVE` 只登记键存在，不尝试推算具体数值——保守近似，见第 2 节）计入。
     - 每个可达 `BossNode.variables`：直接登记键与其常量值。
     - 可达 `BossNode.stateRuleSetId` 指向的 `StateRuleSet.rules[].effects[]`：同上规则处理。
  5. **不判断某条效果"一定会发生"**——只要沾边可达，就算作"可能"，这是保守过近似的核心体现。
- **Acceptance**：对 `state-unsatisfiable-ending` fixture，某个 Ending 引用的 flag 键从未出现在任何可达效果或 `initial.state.json` 中，验证 `keys` 集合里确实不含该键。

---

### T006 — PASS 5：Ending / Recovery 可满足性

- **Objective**：用 T005 的可达状态集合，判定 Ending 与 Recovery 的条件是否有可能成立。
- **Allowed Files**：`src/pass5Satisfiability.ts`、`src/pass5Satisfiability.test.ts`
- **Requirements**：
  1. 导出 `interface UnsatisfiableFinding { targetId: string; reason: string }`、`function checkEndingSatisfiability(schemaResult, model: ReachableStateModel, reachable: Set<string>): UnsatisfiableFinding[]`、`function checkRecoverySatisfiability(schemaResult, model: ReachableStateModel): UnsatisfiableFinding[]`。
  2. **Ending 判定**（`ADDENDUM-001 §A12`）：对每个**可达且非兜底**的 Ending，递归遍历其 `when: Condition` 树：
     - `EQ`/`IN` 比较：引用的 `path` 必须在 `model.keys` 中存在，且比较的目标值必须出现在该键对应的 value 集合中，否则判定为该叶子节点不可满足。
     - `NEQ`/`GT`/`GTE`/`LT`/`LTE`/`EXISTS`：只要求引用的 `path` 在 `model.keys` 中存在（值域比较不做精确数值推理，保守放行——过近似原则）。
     - `all`：全部子条件都可满足才算整体可满足；`any`：至少一个子条件可满足即可；`not`：不对内部做不可满足推断（对 `not` 保守放行，除非其内部引用的 path 完全不存在于 `model.keys`）。
     - 整体不可满足 → 产出一条 `UnsatisfiableFinding`。
  3. **Recovery 判定**（`ADDENDUM-001 §A13`）：当 `world.rules.downedPolicy === "REQUIRE_RECOVERY"` 时，检查是否**至少存在一条** `scope` 覆盖 `DOWNED` 的 `RecoveryRule`，其 `when`（`RecoveryTrigger`）在当前可达状态集合下可能触发（`STATE` 分支复用上述 Condition 满足性判断；`SCENE_ENTER`/`RESULT_QUALITY` 分支只需引用的节点/action 本身可达即可判定为可能触发）。一条都不可能触发 → 产出一条 `UnsatisfiableFinding`。
- **Acceptance**：`state-unsatisfiable-ending`/`state-unsatisfiable-recovery` 两组 fixture 各自触发对应 Finding；另需一条正例（正常可满足的 Ending/Recovery 不产生 Finding）。

---

### T007 — compile() 编排扩展

- **Objective**：把 PASS3/PASS5 接入既有编排入口，且不破坏 PASS1/PASS2 的既有行为。
- **Allowed Files**：`src/types.ts`（追加）、`src/compile.ts`（追加）、`src/compile.test.ts`（追加）、`src/index.ts`（追加）
- **Requirements**：
  1. `types.ts` 新增：`GraphIssue`/`GraphIssueCategory`（涵盖死路/不可达节点/不可达 Ending/不可达 Boss/陷阱环五类）、`StateIssue`/`StateIssueCategory`（不可满足 Ending/不可满足 Recovery 两类）。命名风格与既有 `ReferenceIssue`/`ReferenceIssueCategory` 保持一致。
  2. `compile.ts` 新增 `interface Pass3Result { graphModel: StoryGraphModel; reachability: Pass3ReachabilityResult; trapCycles: TrapCycle[] }`、`interface Pass5Result { stateModel: ReachableStateModel; unsatisfiable: UnsatisfiableFinding[] }`、`function runPass3(schemaResult): Pass3Result`、`function runPass5(schemaResult, pass3: Pass3Result): Pass5Result`。
  3. `CompileResult` 新增 `graphIssues: GraphIssue[]` 与 `stateIssues: StateIssue[]` 两个字段（新增，不删除任何既有字段）；`compile()` 函数体在原有 PASS1/PASS2 调用之后追加调用 PASS3/PASS5，`passed` 的判定条件追加 `&& graphIssues.length === 0 && stateIssues.length === 0`。
  4. **回归验证**：`compile.test.ts` 中 DEV-002 原有的断言（针对 `valid-minimal`、`broken-*` fixture 的既有用例）必须逐字保留，新增用例追加在文件末尾或新的 `describe` 块中，不得与原有用例交织修改。
  5. `index.ts` 追加导出 T002–T006 的全部公开类型与函数。
- **Acceptance**：`compile.test.ts` 跑 DEV-002 遗留的全部原有断言，逐条与 DEV-002 `VERDICT.md` 记录的结果一致（无回归）；新增断言覆盖 PASS3/5 接入后 `graph-clean` fixture 返回 `passed: true`，任一图/状态类 fixture 返回 `passed: false` 且对应 issue 数组非空。

---

### T008 — 测试 Fixture

- **Objective**：建立本节点全部测试共用的图/状态类 fixture，与 DEV-002 既有 fixture 并存不冲突。
- **Allowed Files**：`test-fixtures/graph-*/**`、`test-fixtures/state-*/**`、`test-fixtures/README.md`（仅追加条目）
- **Requirements**：
  1. 6 组 `graph-*` fixture 对应 T003/T004 的每种缺陷各一组，另需 `graph-clean` 作为正例。
  2. 2 组 `state-*` fixture 对应 T006 的两种不可满足场景，另需在其中一组之外提供可满足的正例（可复用 `graph-clean` 兼做状态正例，不必重复建一份）。
  3. **命名前缀 `graph-`/`state-` 与 DEV-002 的 `broken-`/`valid-minimal` 区分**，避免混淆各自针对哪个 PASS。
  4. 每组 fixture 必须是**通过 PASS1+PASS2**（即符合 chapter-schema 且引用完整）的合法内容——本节点测的是图/状态缺陷，不是 schema/引用缺陷，混入 PASS1/2 级别的错误会让测试意图不清。
- **Acceptance**：`test-fixtures/README.md` 列出全部新增目录及其用途；每组 fixture 单独跑 PASS1+PASS2（复用 DEV-002 的 `compile()` 前半段）均无 `loadIssues`/schema 失败/`uniquenessIssues`/`referenceIssues`。

---

### T009 — 全量验证、REPORT 与 commit

- **Objective**：证明节点完成并交付审计材料，接入通信协议。
- **Allowed Files**：`specs/dev/DEV-003/INDEX.md`、`specs/dev/DEV-003/REPORT.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-003.md`
- **Requirements**：
  1. 依次执行并**严格按此顺序**记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`（DEV-002 FIX-01 已把根 `typecheck` 脚本改为"先 build 再 --noEmit"，本节点沿用现有脚本，不得改动脚本本身）。
  2. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项，并在 Allowed Files 逐文件改动核对中体现每个新增/追加文件的实际 diff 摘要（呼应协议附录 A"强约束：Allowed Files 逐一真实改动"）。
  3. 更新 `INDEX.md`：T001–T009 全部勾选，`Status: READY_FOR_REVIEW`，且**每完成一个 Task 立即勾选**，不得留到最后批量补写（DEV-000/DEV-001 均因此类问题被判 FAIL 过）。
  4. `git add -A && git commit`，提交信息首行：`DEV-003: story graph analyzer (PASS 3+5)`。
  5. 追加 LEDGER 行，发 `NODE_REPORT` 给 `AUDITOR`（cc `COMMANDER`），信封含 `git_head`、`changed_files_count`、`commands_run`。
  6. **STOP**。不得开始任何后续 DEV 节点。
- **Acceptance**：六条命令按序全部退出码 0；`REPORT.md` 八节齐全；`git log` 新增恰 1 条提交；LEDGER 含新 `NODE_REPORT-DEV-003` 记录。

---

## 8. Node INDEX Requirements

```markdown
# DEV-003 INDEX

Status: IN_PROGRESS

## Current Node

DEV-003 — Story Graph Analyzer（PASS 3 + PASS 5）

## Objective

在 chapter-compiler 内新增图可达性/死路/环检测（PASS3）与状态可达性/可满足性
分析（PASS5），保守过近似，不引入运行时求值逻辑。

## Allowed Scope（新增文件）
（抄录 Task Package 第 3 节"Writable Scope — 新增文件"实际条目）

## Allowed Scope（既有文件，仅追加）
（抄录 Task Package 第 3 节"既有文件，仅允许追加式修改"实际条目）

## Read-only Scope
（抄录 Task Package 第 3 节 Read-only Scope 实际条目——含 DEV-002 全部 PASS1/2 源文件）

## Forbidden Scope
（抄录 Task Package 第 3 节 Forbidden Scope 实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 故事图模型构建
- [ ] T003 PASS 3：可达性 / 死路 / Ending 与 Boss 可达性
- [ ] T004 PASS 3：陷阱环检测
- [ ] T005 PASS 5：可达状态集合构建
- [ ] T006 PASS 5：Ending / Recovery 可满足性
- [ ] T007 compile() 编排扩展
- [ ] T008 测试 Fixture
- [ ] T009 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001（每完成一个 Task 立即勾选并更新本字段，不得留到 T009 批量补写）

## Exit Criteria

六条命令按序全部退出码 0；DEV-002 原有测试断言零回归；`graph-clean`/满足正例
fixture 令 compile() 返回 passed: true；六种图缺陷 + 两种状态不可满足 fixture
各自触发对应 issue 非空；REPORT.md 完成且 Status = READY_FOR_REVIEW；已向
AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **零运行时求值逻辑**。PASS5 只做静态存在性/近似可满足性判断，不实现"给定一个具体 WorldState，Condition 现在是否成立"这类函数——那是 DEV-004 的职责。
2. **过近似原则贯穿全部判定**：不确定时一律倾向"判定为可能可达/可能可满足"，不得因为实现简单就收紧标准导致误杀合法内容。
3. **不引入第三方图算法库**。图规模是一个章节的场景数量级（几十到低百级），手写 BFS/Tarjan 完全够用，引入依赖是无谓成本。
4. **DEV-002 冻结文件逐字不变**——本任务包第 3 节列出的 Read-only 源文件与既有测试，`git diff` 必须为空。
5. **既有文件仅追加**——`types.ts`/`compile.ts`/`compile.test.ts`/`index.ts` 的既有代码行不得被编辑或删除，只能新增。
6. **Allowed Files 逐一真实改动**（协议附录 A 强约束）：T002–T008 列出的每个新文件都必须有实质内容，不得留空壳。
7. `CR-019`（getHealth 自落地起）不适用——`chapter-compiler` 全篇是纯批处理函数库。
8. Windows 环境：脚本 Git Bash / PowerShell 均可运行，路径用 `path.join`。
9. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`（`blocking: true`），继续其它不受影响 Task，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现 PASS 4（Rule Coverage）——DEV-006。
- 不实现 PASS 6（Hidden Information，`host.public.json` 白名单/时序/隔离性）——DEV-002A，但 DEV-002A **依赖本节点的输出**，接口需保持清晰可消费。
- 不实现 PASS 7（资产文件存在性）、PASS 8（仿真）。
- 不实现 Condition 的运行时求值函数、StateEffect 的运行时应用函数——DEV-004。
- 不做路径敏感的精确状态追踪（第 2 节已定过近似原则）。
- 不修改 DEV-002 的任何 PASS1/PASS2 源文件或既有测试断言。
- 不创建新包，不修改 `packages/chapter-schema`、`packages/runtime-kernel`、`packages/shared`。
- 不引入第三方图算法依赖。
- 不创建真实产品内容（`chapters/` 目录）。

---

## 11. Tests

### Unit tests

T002–T006 每模块 `.test.ts`：正例 + 反例，覆盖第 7 节各 Task 描述的具体判定分支。

### Regression tests

`compile.test.ts` 中 DEV-002 遗留断言必须逐条通过，结果与 DEV-002 `VERDICT.md` 记录一致。`chapter-schema`/`runtime-kernel` 既有测试同样不得回归。

### Integration / Simulation / Replay / Fuzz / Soak / Contract tests

不适用（属后续节点）。

---

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0，0 error / 0 warning | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；DEV-002 遗留全部断言无回归；DEV-003 新增全部测试通过 | 命令输出 |
| A07 | DEV-002 只读源文件（第 3 节 Read-only Scope 列出的 8 组 `.ts`/`.test.ts`）`git diff` 为空 | git diff |
| A08 | `types.ts`/`compile.ts`/`compile.test.ts`/`index.ts` 的既有代码行 `git diff` 只含新增行（`+`），不含删除或修改（`-` 只能是空行调整） | git diff 逐行检查 |
| A09 | `buildStoryGraphModel` 对 `graph-clean` 产出的节点数与 `story.graph.json` 声明数一致 | 测试检查 |
| A10 | 死路 / 不可达节点 / 不可达 Ending / 不可达 Boss 四类各自的 fixture 只触发对应字段，互不串扰 | 测试检查 |
| A11 | 陷阱环被正确检出；含逃逸边的循环不被误判 | 测试检查 |
| A12 | 单节点自环（无其它出边）被判定为陷阱；`ENDING` 节点自身不被误判为陷阱 | 测试检查 |
| A13 | PASS5 可达键集合正确排除不可达效果贡献的键 | 测试检查 |
| A14 | 不可满足 Ending / Recovery 各自被正确检出；正例不产生误报 | 测试检查 |
| A15 | `compile()` 的 `passed` 判定正确纳入 `graphIssues`/`stateIssues` | 测试检查 |
| A16 | `index.ts` 导出 PASS3/PASS5 全部公开类型与函数，供下游可 import | 代码检查 |
| A17 | 包内不存在第三方图算法库依赖 | 文件检查 |
| A18 | 包内不存在 Condition 运行时求值函数（如 `evaluateCondition(condition, worldState): boolean` 这类接受具体状态实例的函数）——只允许接受"可达状态集合"这种近似模型的函数 | 代码审查 |
| A19 | `test-fixtures/graph-*`、`test-fixtures/state-*` 均通过自身的 PASS1+PASS2 前置校验（无 schema/引用错误混入） | 测试检查 |
| A20 | `test-fixtures/README.md` 列出全部新增目录 | 文件检查 |
| A21 | `specs/dev/DEV-003/` 四份节点文档齐全，`INDEX.md` 含原句且 T001–T009 全部勾选 | 文件 + 文本检查 |
| A22 | `git log` 新增恰 1 条提交，首行 `DEV-003: story graph analyzer (PASS 3+5)`；提交时 `git status --porcelain` 为空 | 命令 |
| A23 | LEDGER 含 `OPENCODE → AUDITOR` 的 `NODE_REPORT-DEV-003` 记录，信封 `git_head` 与提交 sha 一致 | LEDGER + 命令比对 |
| A24 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**`、`packages/chapter-schema/**`、`packages/runtime-kernel/**`、`packages/shared/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

1. 更新 `INDEX.md`，勾选 T001–T009。
2. 严格按第 11 节顺序运行全部验证命令。
3. Regression：确认 DEV-002 遗留断言、`chapter-schema`/`runtime-kernel` 既有测试均无回归。
4. 填写 `REPORT.md`，逐条对应 A01–A24。
5. `INDEX.md`/`REPORT.md` Status 均设为 `READY_FOR_REVIEW`。
6. 执行 T009 的 git commit。
7. 追加 LEDGER 行，发出 `NODE_REPORT` 给 `AUDITOR`（cc `COMMANDER`）。
8. **STOP**。不得开始任何后续 DEV 节点。

---

## REPORT.md 模板

沿用既有 REPORT 模板（八节），Acceptance Results 覆盖 A01–A24。
