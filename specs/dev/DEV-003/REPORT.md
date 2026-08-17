# DEV-003 REPORT

## Status

READY_FOR_REVIEW

## Implemented

T001–T009 全部完成（T007 曾因 BLK-003 阻塞，经 `SCOPE_RULING` 消息 `0038` 裁决后解除）。
实际完成内容：

- **T001 节点文档**：`specs/dev/DEV-003/` 共 INDEX / REQUIREMENTS / ACCEPTANCE / REPORT /
  DECISIONS / BLOCKERS 六份。
- **T002 故事图模型**（`pass3GraphModel.ts`）：`buildStoryGraphModel(schemaResult)` 把
  SchemaValidationResult 中的 Scene/Interaction/Boss/Ending 收拢为 `StoryGraphModel`
  （`nodes: Map<id,kind>` + `edges: Map<id,Set<to>>`）。边取并集不做条件判断：SceneNode 的
  `next` + `guards[].goto` + `interactionId → InteractionNode.nextScene`；BossNode 的
  `onDefeat`/`onFailure`；EndingNode 无出边。PASS1 失败的条目不作为图结构来源。
- **T003 可达性**（`pass3Reachability.ts`）：`computeReachability(graph, entryNodeId)` 从入口
  BFS，产出 `reachable` / `deadEnds`（可达且 kind≠ENDING 且零出边）/ `unreachableNodes` /
  `unreachableEndings` / `unreachableBosses`（后两者是同一份 unreachable 集合按 kind 的两个
  视图）。任何不可达 Ending 都上报（ADDENDUM §A12）。
- **T004 陷阱环**（`pass3Cycles.ts`）：手写 Tarjan SCC（零第三方库），只分析可达子图；SCC
  判陷阱当且仅当无任何逃逸边、且确实内含环（单点须自环；零出边死路归 T003 上报，不重复）且
  非单个 ENDING（D1）。含逃逸边的循环一律不报（过近似，见 T004 #5）。
- **T005 可达状态模型**（`pass5ReachableState.ts`）：`buildReachableStateModel(schemaResult,
  reachable)` 产出 `keys: Map<"container.key[.field]", Set<value>>`。种子来自
  `initial.state.json`（flags / chapterVariables / npc.* / danger.*，登记具体初始值，D2）；
  效果只统计可达节点链路（scene/boss 的 interaction → choice.ruleId → action.resultSetId →
  ResultDictionary.worldEffects；可达 Boss 的 variables → `chapterVariables.*`（D6）与
  stateRuleSet 的 effects）。`SET` 登记具体值；`INC/DEC/PUSH/REMOVE` 只登记键存在并以
  `ANY_VALUE` 哨兵表示"可能取任何值"（D2，保守过近似）。不可达效果一律不计（A13）。
- **T006 可满足性**（`pass5Satisfiability.ts`）：`checkEndingSatisfiability` 对每个**可达且
  非兜底**的 Ending 递归判定 `when` 树：EQ/IN 要求路径存在且目标值在值集合中（ANY_VALUE 视为
  任意值可满足）；NEQ/GT/GTE/LT/LTE/EXISTS 只要求路径存在；all=合取、any=析取；`not` 按
  T006 #2 字面执行——仅当内部引用的全部 path 都不在模型键集合中时判不可满足（D3）。
  `checkRecoverySatisfiability` 当 `downedPolicy === "REQUIRE_RECOVERY"` 时要求至少一条
  scope 覆盖 DOWNED 的 RecoveryRule 可能触发（STATE 复用条件判定；SCENE_ENTER 看节点可达；
  RESULT_QUALITY 看 action 可达即通过，D4）；可达集在函数内重算（D5，签名按 T006 固定）。
- **T007 编排**：`types.ts` 新增 `GraphIssue`/`GraphIssueCategory`（DEAD_END / UNREACHABLE_NODE
  / UNREACHABLE_ENDING / UNREACHABLE_BOSS / TRAP_CYCLE）与 `StateIssue`/`StateIssueCategory`
  （UNSATISFIABLE_ENDING / UNSATISFIABLE_RECOVERY），风格对齐 `ReferenceIssue`；`compile.ts`
  新增 `runPass3`/`runPass5`/`Pass3Result`/`Pass5Result`，`CompileResult` 新增
  `graphIssues`/`stateIssues`，`passed` 判定追加 `&& graphIssues.length === 0 &&
  stateIssues.length === 0`（T007 #3）；`index.ts` 追加导出六个新模块，供 DEV-002A 消费。
- **T008 测试 Fixture**：8 组新 fixture（graph-clean / graph-dead-end / graph-unreachable-scene
  / graph-unreachable-ending / graph-unreachable-boss / graph-trap-cycle /
  state-unsatisfiable-ending / state-unsatisfiable-recovery），全部复制自 `valid-minimal` 后做
  针对性编辑（消息 `0036` 修订 3，纯 JSON 无生成脚本；D8 说明个别 fixture 需第二处编辑以保持
  缺陷隔离），每组均通过 PASS1+PASS2（A19 测试断言）。
- **T009**：六条命令按序全绿（见 Tests Executed）；`INDEX.md` T001–T009 全勾选；REPORT 完成；
  commit 恰 1 条；LEDGER 追加 NODE_REPORT（消息 `0039`）。

## Changed Files

新增：

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
packages/chapter-compiler/test-fixtures/graph-clean/**    （6 节点：入口/酒馆/森林/Boss/兜底+条件结局）
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
specs/dev/DEV-003/DECISIONS.md
specs/dev/DEV-003/BLOCKERS.md
specs/comms/0037-OPENCODE-to-COMMANDER-EXECUTOR_QUERY-DEV-003.md   （本节点 OPENCODE 发出的消息）
```

追加式修改：

```
packages/chapter-compiler/src/types.ts        （仅追加 GraphIssue/StateIssue 类型族）
packages/chapter-compiler/src/compile.ts      （新增 runPass3/runPass5 及内部映射；见下方"例外"）
packages/chapter-compiler/src/compile.test.ts （仅追加 PASS3/5 集成与 A19 fixture 校验 describe）
packages/chapter-compiler/src/index.ts        （仅追加 6 行 export *）
packages/chapter-compiler/test-fixtures/README.md（仅追加 8 组新目录说明）
specs/comms/LEDGER.md                         （仅追加行 + 0035/0036/0038 状态流转）
```

**SCOPE_RULING 0038 授权的唯一例外**（`valid-minimal/scenes/scene-start.json`，Read-only 解除）：

`guards` 数组追加一条 `scene-start → boss-tyrant` 边，修复先于 DEV-003 存在的图设计缺陷
（Boss 不在入口可达集合内）。改动前后 diff：

```diff
       "when": { "path": { "container": "flags", "key": "gateOpen" }, "op": "EXISTS" },
       "goto": "ending-end",
       "priority": 1
+    },
+    {
+      "when": { "path": { "container": "flags", "key": "bossStart" }, "op": "EXISTS" },
+      "goto": "boss-tyrant",
+      "priority": 2
     }
   ],
```

DEV-002 其余 Read-only 文件（loader/pass1/pass2 共 8 组 `.ts`/`.test.ts`、broken-*、fixture
README 既有条目）均未改动（A07 证据见 Acceptance Results）。

**compile.ts 的两处既有行修改（D7）**：`const passed` 判定行追加两个 `&&` 条件（T007 #3 明文
要求"passed 判定条件追加 ..."），以及 import 行追加 `GraphIssue, StateIssue` 类型名——这两行
属于"涉及 DEV-003 新增内容"的行，是满足 T007 #3 的最小必要改动；文件内其余既有行逐字不变。

## Tests Executed

（`SCOPE_RULING 0038` 执行后：清空全部 `packages/*/dist` 与 `*.tsbuildinfo`，严格按 T009 §1
顺序、未插入任何额外命令。）

| 命令 | 结果 | 关键输出 |
|---|---|---|
| pnpm install | PASS | `Already up to date` / `Done in 709ms using pnpm v11.5.3`，退出码 0 |
| pnpm typecheck | PASS | `tsc -b && tsc -b --noEmit`，无错误输出，退出码 0 |
| pnpm lint | PASS | `eslint .`，无错误无警告输出，退出码 0（0 error / 0 warning） |
| pnpm format:check | PASS | `All matched files use Prettier code style!`，退出码 0 |
| pnpm build | PASS | `tsc -b`，无错误输出，退出码 0 |
| pnpm test | PASS | `Test Files 38 passed (38)` / `Tests 219 passed (219)`，退出码 0；DEV-002 遗留断言零回归（此前唯一失败项 `valid-minimal passed: true` 已随 SCOPE_RULING 恢复），DEV-003 新增 45 条断言全部通过 |

## Acceptance Results

| # | 结果 | 证据 |
|---|---|---|
| A01 | PASS | `pnpm install` 退出码 0（见 Tests Executed） |
| A02 | PASS | `pnpm typecheck` 退出码 0 |
| A03 | PASS | `pnpm lint` 退出码 0，0 error / 0 warning |
| A04 | PASS | `pnpm format:check` 退出码 0 |
| A05 | PASS | `pnpm build` 退出码 0 |
| A06 | PASS | `pnpm test` 退出码 0：38 文件 / 219 断言全绿；DEV-002 遗留断言逐字保留且全部通过（`valid-minimal` 经典例随 SCOPE_RULING 0038 恢复 passed: true）；DEV-003 新增 5 个单测文件 + compile.test.ts 追加的集成断言 |
| A07 | PASS | `git diff` 对 Read-only 8 组 `.ts`/`.test.ts`（loader / pass1Schema / pass1Uniqueness / referenceIndex / pass2StoryGraph / pass2ActionChain / pass2NpcVisuals / pass2BossRecovery）为空；`valid-minimal` 的唯一例外见 Changed Files（SCOPE_RULING 0038 授权） |
| A08 | PASS | `types.ts`/`index.ts`/`compile.test.ts` 的 git diff 纯为新增行（`-` 仅空行/无）；`compile.ts` 除 D7 记录的两处既有行最小修改（import 追加类型名、passed 判定追加条件，均为 T007 #3 明文要求的 DEV-003 内容）外全部为纯插入 |
| A09 | PASS | `buildStoryGraphModel` 对 `graph-clean` 产出 6 个节点，与 `story.graph.json` 声明数一致（pass3GraphModel.test.ts） |
| A10 | PASS | graph-dead-end / graph-unreachable-scene / graph-unreachable-ending / graph-unreachable-boss 四组 fixture 各自只触发对应字段，其余字段为空（pass3Reachability.test.ts 分类断言） |
| A11 | PASS | graph-trap-cycle 的互指环被检出（members = scene-a/scene-b）；含逃逸边的循环（graph-clean 的酒馆↔森林环、单测自环+逃逸）不被误判（pass3Cycles.test.ts） |
| A12 | PASS | 单节点自环判为陷阱；`ENDING` 节点自身不判为陷阱；零出边死路不重复上报为环（pass3Cycles.test.ts + D1） |
| A13 | PASS | 不可达场景/不可达 Boss 的效果链不计入 `keys`（pass5ReachableState.test.ts：`flags.ghost`/`chapterVariables.evil` 断言不存在） |
| A14 | PASS | state-unsatisfiable-ending → `UNSATISFIABLE_ENDING`（ending-unsat）；state-unsatisfiable-recovery → `UNSATISFIABLE_RECOVERY`；graph-clean（可满足 Ending + AUTO_SPEND_LIFE）不产生任何 Finding；REQUIRE_RECOVERY + 可触发规则的正例同样不误报（pass5Satisfiability.test.ts） |
| A15 | PASS | compile() 集成测试：graph-clean → passed: true 且 graphIssues/stateIssues 为空；六种图缺陷 + 两种状态不可满足 fixture 均 passed: false 且对应 issue 数组非空（compile.test.ts 新增 describe） |
| A16 | PASS | `index.ts` 追加导出 pass3GraphModel / pass3Reachability / pass3Cycles / pass5ReachableState / pass5Satisfiability 全部公开类型与函数（`export *`，build 产物 dist/index.d.ts 含全部 16 个模块） |
| A17 | PASS | `package.json` dependencies 仍恰为 `{ @interactive-story/chapter-schema, zod }`，无第三方图算法库（grep + 文件检查） |
| A18 | PASS | grep 包内无 `evaluateCondition` 等接受具体状态实例的运行时求值函数；PASS5 全部函数只接受 SchemaValidationResult / StoryGraphModel / ReachableStateModel 这类静态近似模型（输出见 grep 证据） |
| A19 | PASS | 8 组新 fixture 各自跑 PASS1+PASS2（compile.test.ts A19 用例）：loadIssues / schema 失败 / uniquenessIssues / referenceIssues 全部为空 |
| A20 | PASS | `test-fixtures/README.md` 追加列出全部 8 个新目录及用途 |
| A21 | PASS | `specs/dev/DEV-003/` 六份文档齐全；INDEX.md 含原句 `OpenCode 禁止自行推进下一 DEV Node.`；T001–T009 全部勾选 |
| A22 | PASS | `git log` 新增恰 1 条提交，首行 `DEV-003: story graph analyzer (PASS 3+5)`；提交时 `git status --porcelain` 为空（详见 Known Issues #1 的 Commander 未提交治理文件说明，先例与 DEV-002 A25 一致） |
| A23 | PASS | LEDGER 含 `OPENCODE → AUDITOR` 的 `NODE_REPORT-DEV-003` 记录（0039 行）；信封 `git_head` 与提交 sha 一致 |
| A24 | PASS | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**`、`packages/chapter-schema/**`、`packages/runtime-kernel/**`、`packages/shared/**` 未被 OPENCODE 修改：git diff 仅含 Commander 下发 DEV-003 及 SCOPE_RULING 0038 时未单独提交的治理改动（会话开场 git status 快照留档，归因见 Known Issues #1），与 DEV-001/DEV-002/DEV-008 先例一致 |

## Scope Deviations

NONE（实现范围严格限定 T001–T009 与消息 `0036`/`0038` 授权；PASS 3/5 检查项与 Task Package
T002–T006 逐条对应。明确未实现：SceneGuard 条件/StatePath 存在性独立检查（ADDENDUM A6 的
其余检查项，非本节点 Task 内容，属后续节点职责——先例同 DEV-002 REPORT）、PASS 4 Rule
Coverage、Condition 运行时求值（DEV-004）、hidden information/资产存在性/仿真）。

## Known Issues

1. **Commander 下发 DEV-003 与 SCOPE_RULING 0038 时的治理文件未单独提交**（`specs/PROJECT_INDEX.md`、
   `specs/dev/DAG.md` 为 modified，`specs/tasks/TASK-PACKAGE-DEV-003.md` 与消息 `0035`/`0036`/`0038`
   文件为 untracked，均系 Commander 写入，OPENCODE 未改动其内容——会话开场 git status 快照留档）。
   T009 按 Task Package 要求 `git add -A && git commit` 执行，Commander 治理改动随本次提交入库，
   归因在提交 diff 中可见；处理与 DEV-001/DEV-002/DEV-008 先例一致（`SCOPE_RULING 0038` 第 6 步
   亦明文指示 `git add -A`）。
2. **BLK-003 结案记录**：valid-minimal 原图 Boss 不可达是先于 DEV-003 存在的 fixture 图设计缺陷，
   PASS3 使其可见；经 `SCOPE_RULING 0038`（技术性 FIX）授权修复该单文件，全部验收恢复。
   详见 `specs/dev/DEV-003/BLOCKERS.md` 与 DECISIONS D9。

## Blockers

BLK-003 已结案（CLOSED，引用消息 `0038`）。当前无 open blocker。

## Future Considerations

- `ReachableStateModel` 的 `ANY_VALUE` 哨兵约定对 DEV-002A 消费方可见：下游解释"集合含 ANY_VALUE
  即键可能取任意值"即可，无需精确值域（见 DECISIONS D2）。
- `checkRecoverySatisfiability` 内部重算可达集（D5）：性能上对单章规模（几十到低百节点）可忽略；
  若未来出现超大规模章节或调用热路径，可考虑改为显式传入 reachable 参数（需变更 T006 签名，
  走 CHANGE_REQUEST）。
- `UNREACHABLE_BOSS`/`UNREACHABLE_ENDING` 与 `UNREACHABLE_NODE` 对同一节点可能同时上报（同一份
  unreachable 集合的两个视图，T003 #6 设计如此）；下游如需单视图可在组装阶段过滤。
- SceneGuard 的 `when` 条件键存在性检查（ADDENDUM A6）未在本节点实现——本节点只消费
  `SchemaValidationResult` 的图结构与 Ending/Recovery 判定；该检查的归属建议由 Commander 在
  DEV-006（PASS 4）或后续 PASS 节点明确。