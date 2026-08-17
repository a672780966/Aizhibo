# TASK PACKAGE — DEV-002A

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-002A |
| Node Name | Hidden Information Validator（PASS 6） |
| Milestone | M1 — Story Machine Complete |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-001（DONE）、DEV-003（DONE，接口冻结，`git_head be43f75f`） |
| Commander | Claude |
| Executor | Codex（协议角色名 `OPENCODE`） |

### 规范原文与权威输入

- Dev Spec 第 24 节 PASS 6："检查 host.public 不得引用 future / hidden / ending / boss-secret"
- `specs/audit/SPEC-ADDENDUM-001.md` §A15、§A15.1（四条判定：穷举性、白名单、时序性、隔离性；`ForbiddenLexicon` 产物）
- `specs/dev/DAG.md` CR-006（本节点归属 PASS 6）、CR-010（`ForbiddenLexicon` 产物需求）
- 本节点是 **G06（Host Hidden Information Leak = 0）四道防线中的第一道**（编译期）——另外三道分别是类型层分区（DEV-009）、运行时读投影（DEV-050）、运行时写词表消费（DEV-050A）

### 本节点发现并解决的一处规范空白

`ADDENDUM-001 §A15` 的判定 2（白名单）要求"`knownFactIds` 引用的每个事实，其依赖的 flag 必须全部为 `PUBLIC`"——但冻结的 `HostPublicSpec`/`SceneDisclosure`（`packages/chapter-schema`）从未定义"一个事实依赖哪些 flag"这个映射，`knownFactIds` 只是一组不透明字符串。没有这个映射，判定 2 和判定 3（时序性）**在结构上无法实现**。

**处置**：对 `packages/chapter-schema/src/hostPublic.ts` 做**唯一一次、纯新增字段**的扩展（详见第 3 节），不改动任何既有字段的类型或语义。这不是产品分叉，是补齐一个此前遗漏、且已被 ADDENDUM-001 自己要求却未落实的结构，性质与 `ADDENDUM-002` 补 `DangerState`/`HostPolicy`/`ResultDictionary` 相同——按同一纪律处理，不重新走用户逐项批准，随本任务包一并交付并记录在案。

---

## 2. Current Objective

在 `packages/chapter-compiler` 内新增 PASS 6（Hidden Information），并在 `packages/chapter-schema` 的 `hostPublic.ts` 做一次纯新增字段扩展，交付四条判定 + `ForbiddenLexicon` 产物。

**核心设计原则，与 DEV-003 刻意相反**：DEV-003（PASS3/5）的原则是"不确定就放行"（假阴性好过假阳性，怕误杀合法内容）。**本节点必须"不确定就拒绝"**——因为这里保护的是"AI 助播会不会剧透"，一旦放过一个不确定的泄露点，后果是产品级事故（观众被剧透），而误报只是让作者多解释一句"这个事实其实安全"。两个节点原则相反不是矛盾，是各自任务的性质决定的：PASS5 判定"内容是否可达"，判错方向是拦住好内容；PASS6 判定"能不能说"，判错方向是让 AI 说漏嘴。

---

## 3. Scope

### Writable Scope — 新增文件（`packages/chapter-compiler`）

```
packages/chapter-compiler/src/pass6Ancestors.ts
packages/chapter-compiler/src/pass6Ancestors.test.ts
packages/chapter-compiler/src/pass6Exhaustiveness.ts
packages/chapter-compiler/src/pass6Exhaustiveness.test.ts
packages/chapter-compiler/src/pass6Isolation.ts
packages/chapter-compiler/src/pass6Isolation.test.ts
packages/chapter-compiler/src/pass6Disclosure.ts
packages/chapter-compiler/src/pass6Disclosure.test.ts
packages/chapter-compiler/src/pass6ForbiddenLexicon.ts
packages/chapter-compiler/src/pass6ForbiddenLexicon.test.ts
packages/chapter-compiler/test-fixtures/host-exhaustive-missing-flag/**
packages/chapter-compiler/test-fixtures/host-scene-not-covered/**
packages/chapter-compiler/test-fixtures/host-isolation-leak/**
packages/chapter-compiler/test-fixtures/host-fact-undeclared/**
packages/chapter-compiler/test-fixtures/host-fact-future-leak/**
packages/chapter-compiler/test-fixtures/host-clean/**（若确认 `valid-minimal` 已满足全部四条判定，可省略，改为在测试中直接复用 `valid-minimal`）
```

### Writable Scope — 既有文件，仅允许追加式修改（同 DEV-003 的判定标准：`git diff` 只含新增行）

```
packages/chapter-schema/src/hostPublic.ts       （唯一允许的字段新增：SceneDisclosure 追加
                                                  knownFactDependencies?: Record<string, string[]>）
packages/chapter-schema/src/hostPublic.test.ts  （追加针对新字段的测试，不改既有断言）
packages/chapter-schema/src/index.ts            （若因新增导出需要，只许追加 export）
packages/chapter-compiler/src/types.ts          （追加 HiddenInfoIssue / HiddenInfoIssueCategory /
                                                  ForbiddenLexicon 类型）
packages/chapter-compiler/src/compile.ts        （追加 runPass6，扩展 CompileResult 新增字段）
packages/chapter-compiler/src/compile.test.ts   （追加测试用例）
packages/chapter-compiler/src/index.ts          （追加 export）
packages/chapter-compiler/test-fixtures/README.md（仅追加新增目录说明）

specs/dev/DEV-002A/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md
specs/dev/DEV-002A/DECISIONS.md（仅在需要时创建）
specs/dev/DEV-002A/BLOCKERS.md（仅在需要时创建）
specs/comms/LEDGER.md（仅追加行）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/chapter-schema/src/ 除 hostPublic.ts、hostPublic.test.ts、index.ts 外的全部 17 个模块
packages/chapter-compiler/src/loader.ts、pass1Schema.ts、pass1Uniqueness.ts、referenceIndex.ts、
  pass2StoryGraph.ts、pass2ActionChain.ts、pass2NpcVisuals.ts、pass2BossRecovery.ts、
  pass3GraphModel.ts、pass3Reachability.ts、pass3Cycles.ts、
  pass5ReachableState.ts、pass5Satisfiability.ts（及各自 .test.ts）
packages/chapter-compiler/test-fixtures/valid-minimal/**、broken-*/**、graph-*/**、state-*/**
packages/chapter-compiler/package.json、tsconfig.json
packages/runtime-kernel/**、packages/shared/**
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts、根 tsconfig.json
```

### Forbidden Scope

```
packages/* 除 chapter-schema、chapter-compiler 外的任何目录
apps/**、chapters/**、assets/**、scripts/**、tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration、任何网络调用代码
对 knownFactIds 关联文本做全文扫描/自然语言处理——本节点只处理结构化标题/名称
  （EndingNode.title、BossNode.displayName 之类），不解析 NarrativeBlock 正文
```

---

## 4. Required Skills

### Required

- 图的反向可达性（祖先集合计算）——复用 DEV-003 已冻结的 `StoryGraphModel`/`buildReachableStateModel`，只是换一个起点集合
- Zod schema 的纯新增字段扩展（`.optional()`，不破坏既有 `.parse()` 行为）
- 保守但方向相反的静态分析设计（"不确定就拒绝"，与 DEV-003 对照理解）

### Forbidden / Unnecessary

- 自然语言处理、文本相似度、任何形式的语义理解
- 对 chapter-schema 除 `hostPublic.ts` 外任何模块的修改
- 运行时 Host/LLM 相关任何代码——本节点是编译期检查，产物是数据，不是服务
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| DEV-003 冻结导出：`StoryGraphModel`、`Pass3ReachabilityResult.reachable`、`buildReachableStateModel` | 祖先集合计算 + 场景前置状态计算的基础，直接复用不重新实现 |
| `HostPublicSpec`（扩展后）、`SceneDisclosure.knownFactDependencies` | PASS6 判定的直接输入 |
| `EndingNode.title`、`BossNode.displayName` | `ForbiddenLexicon` 的词条来源 |

---

## 6. Outputs

1. `packages/chapter-schema` 的 `SceneDisclosure` 新增可选字段 `knownFactDependencies`
2. `runPass6(schemaResult, pass3): Pass6Result`——四条判定的 Finding 列表 + `ForbiddenLexicon`
3. `compile()` 扩展：`CompileResult` 新增 `hiddenInfoIssues` 字段，纳入 `passed` 判定
4. `index.ts` 导出全部新增类型与函数，供 DEV-050（Public State Gateway）与 DEV-050A（Host Egress Gate，M5）未来消费
5. 5 组新增测试 fixture（每条判定失败模式各一组）
6. `specs/dev/DEV-002A/` 节点文档

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-002A/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Requirements**：INDEX 采用第 8 节模板，Task Order 列 T001–T010；其余同既有惯例。
- **Acceptance**：四文件存在；`INDEX.md` 含原句；Task Order 恰 T001–T010。

---

### T002 — `HostPublicSpec` 结构扩展

- **Objective**：补齐"事实依赖哪些 flag"这个此前缺失的映射，且不破坏任何既有 `.parse()` 行为。
- **Allowed Files**：`packages/chapter-schema/src/hostPublic.ts`、`hostPublic.test.ts`
- **Requirements**：
  1. `SceneDisclosureSchema` 追加：`knownFactDependencies: z.record(z.string(), z.array(z.string())).optional()`——key 为 `knownFactIds` 中的某个事实 id，value 为该事实依赖的 flag key 列表（格式与 DEV-003 `ReachableStateModel` 的 key 格式一致：`"<container>.<field>"`）。
  2. **不改动** `flagVisibility`/`sceneDisclosures`/`tensionLabels`/`forbiddenTopics`/`locationLabel`/`knownFactIds`/`tensionKey` 任何既有字段的类型。
  3. 新增字段为 `.optional()`——已有的、未声明此字段的合法 `host.public.json`（如 DEV-002/003 现有 fixture）必须继续通过校验，不产生 schema 层面的回归。
  4. 追加测试：验证新字段可选（省略时 `.parse()` 仍成功）、验证提供时的形状校验。
- **Acceptance**：`hostPublic.test.ts` 中 DEV-001/DEV-002/DEV-003 遗留断言逐字保留且通过；新增断言验证 `knownFactDependencies` 的可选性与形状。

---

### T003 — 祖先集合计算

- **Objective**：为"时序性"判定提供"某场景之前可能已知道什么"的基础设施。
- **Allowed Files**：`src/pass6Ancestors.ts`、`src/pass6Ancestors.test.ts`
- **Requirements**：
  1. 导出 `computeAncestors(graph: StoryGraphModel, targetNodeId: string, globalReachable: Set<string>): Set<string>`。
  2. 定义：节点 X 是 `targetNodeId` 的祖先，当且仅当 X 本身在 `globalReachable` 中，**且**沿 `graph.edges` 存在一条从 X 到 `targetNodeId` 的路径（含 X === targetNodeId 自身，一个场景当然知道自己已经发生的事）。
  3. 实现：对 `graph.edges` 反向建图，从 `targetNodeId` 做一次 BFS/DFS，结果与 `globalReachable` 取交集。
  4. **直接复用** DEV-003 的 `StoryGraphModel` 类型，不重新定义图结构。
- **Acceptance**：对一个简单链式图 `A→B→C`，`computeAncestors(graph, "C", {A,B,C})` 返回 `{A,B,C}`；对存在分支未汇合的图，验证不相关分支不被误included。

---

### T004 — PASS 6：穷举性 + 场景覆盖

- **Objective**：交付 `ADDENDUM-001 §A15` 判定 1（白名单穷举的前提——先确保每个 flag 都被分类）与场景覆盖检查。
- **Allowed Files**：`src/pass6Exhaustiveness.ts`、`src/pass6Exhaustiveness.test.ts`
- **Requirements**：
  1. 导出 `checkFlagExhaustiveness(schemaResult, stateModel: ReachableStateModel): HiddenInfoIssue[]`：`stateModel.keys`（DEV-003 全局可达键集合）中的每个 key，必须在 `HostPublicSpec.flagVisibility` 中有对应条目；缺失即 BLOCKING（"未声明即视为违规"，白名单原则，不是黑名单）。
  2. 导出 `checkSceneCoverage(schemaResult): HiddenInfoIssue[]`：每个**可达**的 `SCENE` 节点 id，必须在 `HostPublicSpec.sceneDisclosures` 中有对应条目；缺失即 BLOCKING。
- **Acceptance**：`host-exhaustive-missing-flag`、`host-scene-not-covered` 两组 fixture 各自触发对应 Finding。

---

### T005 — PASS 6：隔离性

- **Objective**：交付 `ADDENDUM-001 §A15` 判定 4——防止 Ending/Boss 专属数据被误标为 `PUBLIC`。
- **Allowed Files**：`src/pass6Isolation.ts`、`src/pass6Isolation.test.ts`
- **Requirements**：
  1. 导出 `checkIsolation(schemaResult): HiddenInfoIssue[]`。
  2. 收集"Ending/Boss 专属键"集合：遍历全部 `EndingNode.when` 条件树引用的 `StatePath`，与全部 `BossNode.variables` 的键。
  3. 若这些键中任何一个在 `HostPublicSpec.flagVisibility` 中被标记为 `PUBLIC`，产出 BLOCKING Finding（该键理应标记 `HIDDEN`）。
  4. **这条判定不需要祖先集合**——它是全局性的：Ending/Boss 专属数据任何时候都不该公开，不存在"到了某个场景就可以公开"的情况。
- **Acceptance**：`host-isolation-leak` fixture（某 Ending 的 `when` 引用的 flag 被误标 `PUBLIC`）触发 Finding；正例（该 flag 正确标记 `HIDDEN`）不触发。

---

### T006 — PASS 6：白名单 + 时序性（合并判定）

- **Objective**：交付 `ADDENDUM-001 §A15` 判定 2 + 判定 3，这是本节点最核心也最容易被误判的一条。
- **Allowed Files**：`src/pass6Disclosure.ts`、`src/pass6Disclosure.test.ts`
- **Requirements**：
  1. 导出 `checkDisclosureSafety(schemaResult, graph: StoryGraphModel, globalReachable: Set<string>): HiddenInfoIssue[]`。
  2. 对每个可达 `SCENE` 节点 S 及其 `sceneDisclosures[S]`：
     - 调用 T003 的 `computeAncestors(graph, S, globalReachable)` 得到 S 的祖先集合；
     - 调用 DEV-003 冻结的 `buildReachableStateModel(schemaResult, ancestorsOfS)`，得到"S 发生之前，理论上可能已经确立的状态集合"；
     - 对 `sceneDisclosures[S].knownFactIds` 中的每个事实 id：
       - 若 `knownFactDependencies` 中**没有**该事实 id 的条目 → BLOCKING（"依赖未声明，本节点默认拒绝，不确定就不能公开"——呼应第 2 节的核心原则）；
       - 若有条目，其依赖的每个 flag key 必须**同时满足**：(a) 在 `flagVisibility` 中标记为 `PUBLIC`；(b) 存在于"S 之前可达状态集合"的 key 集合中。任一条不满足 → BLOCKING。
  3. **不对未声明 `knownFactIds` 的场景重复报错**——那已经是 T004 场景覆盖检查的职责，本任务只管"声明了的 fact 是否真的安全"。
- **Acceptance**：`host-fact-undeclared`（未声明依赖）、`host-fact-future-leak`（依赖的 flag 只在 S 之后才可达）两组 fixture 各自触发 Finding；正例（依赖已声明且确实 S 之前可达且标记 PUBLIC）不触发。

---

### T007 — `ForbiddenLexicon` 构建

- **Objective**：交付 `CR-010`/`ADDENDUM-001 §A15.1` 要求的运行时禁言词表产物。
- **Allowed Files**：`src/pass6ForbiddenLexicon.ts`、`src/pass6ForbiddenLexicon.test.ts`
- **Requirements**：
  1. 导出 `interface ForbiddenLexicon { bySceneId: Record<string, string[]>; always: string[] }`、`buildForbiddenLexicon(schemaResult, graph, globalReachable): ForbiddenLexicon`。
  2. **本节点的词表来源仅限结构化标题/名称字段**：`EndingNode.title`、`BossNode.displayName`——**不解析** `NarrativeBlock`/`ResultNarrative` 的正文文本（那是全文扫描，属于明显更大的功能，本节点不做，记入 Future Considerations）。
  3. 对每个可达 `SCENE` 节点 S：`bySceneId[S]` = 所有**不在** `computeAncestors(graph, S, globalReachable)` 集合内的 `EndingNode.title` 与 `BossNode.displayName`（即：S 发生时刻，理论上还没"发生"过的结局名/Boss 名，禁止提前说出口）。
  4. `always`：不属于任何场景祖先集合的 Ending/Boss 名称（即从入口到该名称对应节点之间，不存在任何场景能"提前看到"它——退化情形，多数章节可能为空数组）。
  5. **本产物只是数据结构，不涉及运行时匹配逻辑**（规范化匹配、DROP 判定是 DEV-050A 的职责，M5 才实现）。
- **Acceptance**：对 `valid-minimal`（`scene-start → boss-tyrant → ending-end`），`bySceneId["scene-start"]` 应包含 `"boss-tyrant"` 对应的 `displayName` 与 `"ending-end"` 的 `title`（因为 scene-start 是两者的祖先之外——需验证 scene-start 本身不在 boss/ending 的祖先集合内，即 boss/ending 尚未发生）。

---

### T008 — compile() 编排扩展

- **Objective**：接入既有编排入口，不破坏既有行为（同 DEV-003 的追加式修改纪律）。
- **Allowed Files**：`src/types.ts`（追加）、`src/compile.ts`（追加）、`src/compile.test.ts`（追加）、`src/index.ts`（追加）
- **Requirements**：
  1. `types.ts` 新增 `HiddenInfoIssue`/`HiddenInfoIssueCategory`（涵盖：穷举性缺失、场景未覆盖、隔离性泄露、事实未声明依赖、事实时序泄露 五类）、`ForbiddenLexicon` 类型（或从 `pass6ForbiddenLexicon.ts` re-export，二选一，保持全包一致风格）。
  2. `compile.ts` 新增 `interface Pass6Result { issues: HiddenInfoIssue[]; forbiddenLexicon: ForbiddenLexicon }`、`function runPass6(schemaResult, pass3: Pass3Result): Pass6Result`。
  3. `CompileResult` 新增 `hiddenInfoIssues: HiddenInfoIssue[]` 字段（新增，不删除任何既有字段）；`passed` 判定追加 `&& hiddenInfoIssues.length === 0`。**`ForbiddenLexicon` 本身不影响 `passed`**——它是产物，不是校验结果，一个 Chapter Pack 即使 `passed: true` 也必须携带这份词表供下游使用。
  4. `compile.test.ts` 中 DEV-000/001/002/003 遗留全部断言逐字保留。
  5. `index.ts` 追加导出 T002–T007 全部公开类型与函数。
- **Acceptance**：`compile.test.ts` 遗留断言零回归；新增断言覆盖 `valid-minimal` 触发 `hiddenInfoIssues: []` 且 `forbiddenLexicon` 非空结构合理，任一 `host-*` fixture 触发 `passed: false`。

---

### T009 — 测试 Fixture

- **Objective**：建立本节点专属 fixture，复用 DEV-003 已确立的"复制 valid-minimal 改一处"惯例。
- **Allowed Files**：`test-fixtures/host-*/**`、`test-fixtures/README.md`（仅追加）
- **Requirements**：
  1. 每组 fixture = 复制 `valid-minimal/` + 一处针对性编辑（主要编辑 `host.public.json`，必要时同步编辑对应的 ending/boss/scene 文件以制造隔离性泄露场景）。
  2. **不写生成脚本**（沿用 DEV-003 澄清后确立的纪律）。
  3. 每组 fixture 必须先通过 PASS1+PASS2+PASS3+PASS5（即已经是"图和状态都合法"的内容），本节点测的是 PASS6 缺陷，不是前面几个 PASS 的缺陷。
- **Acceptance**：`test-fixtures/README.md` 列出全部新增目录；每组 fixture 单独跑 PASS1–PASS5 均无 issue。

---

### T010 — 全量验证、REPORT 与 commit

- **Allowed Files**：`specs/dev/DEV-002A/INDEX.md`、`specs/dev/DEV-002A/REPORT.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-002A.md`
- **Requirements**：
  1. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  2. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  3. 更新 `INDEX.md`：T001–T010 全部勾选，`Status: READY_FOR_REVIEW`，**每完成一个 Task 立即勾选**。
  4. `git add -A && git commit`，提交信息首行：`DEV-002A: hidden information validator (PASS 6)`。
  5. 追加 LEDGER 行，发 `NODE_REPORT` 给 `AUDITOR`（cc `COMMANDER`）。
  6. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`REPORT.md` 八节齐全；`git log` 新增恰 1 条提交；LEDGER 含新记录。

---

## 8. Node INDEX Requirements

```markdown
# DEV-002A INDEX

Status: IN_PROGRESS

## Current Node

DEV-002A — Hidden Information Validator（PASS 6）

## Objective

补齐 host.public.json 的穷举性/白名单/时序性/隔离性四条判定，交付 ForbiddenLexicon
产物。默认拒绝原则（不确定就不安全，与 DEV-003 的默认放行原则相反）。

## Allowed Scope（新增文件）
（抄录 Task Package 第 3 节实际条目）

## Allowed Scope（既有文件，仅追加）
（抄录 Task Package 第 3 节实际条目——含 hostPublic.ts 的唯一新增字段）

## Read-only Scope
（抄录 Task Package 第 3 节实际条目）

## Forbidden Scope
（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 HostPublicSpec 结构扩展
- [ ] T003 祖先集合计算
- [ ] T004 PASS 6：穷举性 + 场景覆盖
- [ ] T005 PASS 6：隔离性
- [ ] T006 PASS 6：白名单 + 时序性
- [ ] T007 ForbiddenLexicon 构建
- [ ] T008 compile() 编排扩展
- [ ] T009 测试 Fixture
- [ ] T010 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001（每完成一个 Task 立即勾选并更新本字段）

## Exit Criteria

六条命令全部退出码 0；DEV-000/001/002/003 遗留测试零回归；四条判定各自的失败
fixture 均触发对应 Finding；`ForbiddenLexicon` 对 valid-minimal 产出合理结构；
REPORT.md 完成且 Status = READY_FOR_REVIEW；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **默认拒绝原则**：任何依赖关系未声明、任何判定条件不满足，一律判定为不安全（BLOCKING），不得因"看起来大概率安全"而放行。这与 DEV-003 的默认放行原则刻意相反，理由见第 2 节。
2. **不做全文本扫描**：`ForbiddenLexicon` 只取材于结构化标题/名称字段，不解析叙事正文。
3. **`hostPublic.ts` 只新增一个字段**，不改动、不删除任何既有字段。
4. **DEV-000/001/002/003 冻结文件逐字不变**（本任务包 Read-only Scope 列出的全部文件，`git diff` 必须为空）。
5. **既有文件仅追加**（`hostPublic.ts`、`compile.ts`、`compile.test.ts`、`index.ts` 等，只加行不改已有行）。
6. **Allowed Files 逐一真实改动**（协议附录 A 强约束）。
7. `CR-019` 不适用——纯批处理函数库。
8. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现 DEV-050 Public State Gateway（运行时读投影）或 DEV-050A Host Egress Gate（运行时写词表匹配/DROP 判定）——本节点只产出数据，不实现消费方。
- 不做叙事正文的全文扫描/NLP。
- 不修改 `chapter-schema` 除 `hostPublic.ts` 外任何模块。
- 不实现 PASS 4（DEV-006）、PASS 7（DEV-075）、PASS 8（DEV-007，已完成）。
- 不创建真实产品内容。
- 不引入任何 LLM/NLP 依赖。

---

## 11. Tests

### Unit tests

T002–T007 各自 `.test.ts`：正例 + 反例。

### Regression tests

`compile.test.ts`、`hostPublic.test.ts` 中既有断言全部保留通过；DEV-000/001/002/003 既有测试零回归。

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
| A06 | `pnpm test` 退出码 0；DEV-000/001/002/003 遗留测试零回归 | 命令输出 |
| A07 | `hostPublic.ts` 仅新增 `knownFactDependencies` 一个字段，`git diff` 不含对既有字段的改动 | git diff |
| A08 | DEV-000/001/002/003 只读源文件 `git diff` 为空 | git diff |
| A09 | `types.ts`/`compile.ts`/`compile.test.ts`/`index.ts`（两包）既有代码行只含新增，不含删除/修改 | git diff 逐行 |
| A10 | 穷举性检查：`stateModel.keys` 中任一未声明于 `flagVisibility` 的 key 被检出 | 测试检查 |
| A11 | 场景覆盖检查：任一可达 SCENE 未出现在 `sceneDisclosures` 被检出 | 测试检查 |
| A12 | 隔离性检查：Ending/Boss 专属键被误标 `PUBLIC` 被检出；正确标记 `HIDDEN` 不误报 | 测试检查 |
| A13 | 白名单+时序性检查：未声明依赖的 fact 被检出；依赖的 flag 尚未在场景祖先可达状态中出现的被检出；合法情形不误报 | 测试检查 |
| A14 | `computeAncestors` 对链式图与分支图给出正确结果 | 测试检查 |
| A15 | `ForbiddenLexicon.bySceneId` 对 `valid-minimal` 产出结构合理（起始场景包含尚未发生的 Boss/Ending 名称） | 测试检查 |
| A16 | `compile()` 的 `passed` 正确纳入 `hiddenInfoIssues`；`ForbiddenLexicon` 不影响 `passed` | 测试检查 |
| A17 | 包内不存在任何 NLP/文本相似度/正文解析相关代码 | grep + 代码审查 |
| A18 | `index.ts`（chapter-compiler）导出全部新增类型与函数 | 代码检查 |
| A19 | `test-fixtures/host-*` 均先通过 PASS1–PASS5 | 测试检查 |
| A20 | `specs/dev/DEV-002A/` 节点文档齐全，`INDEX.md` T001–T010 全部勾选 | 文件 + 文本检查 |
| A21 | `git log` 新增恰 1 条提交，首行 `DEV-002A: hidden information validator (PASS 6)`；提交时 `git status --porcelain` 为空 | 命令 |
| A22 | LEDGER 含 `NODE_REPORT-DEV-002A` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A23 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**`、`packages/runtime-kernel/**`、`packages/shared/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT → commit → 发 NODE_REPORT → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A23。
