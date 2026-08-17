# DEV-002A REPORT

## Status

READY_FOR_REVIEW

## Implemented

T001–T010 全部完成（T008/T010 曾因 BLK-004 阻塞，经 `SCOPE_RULING` 消息 `0044` 裁决后解除）。
实际完成内容：

- **T001 节点文档**：`specs/dev/DEV-002A/` 共 INDEX / REQUIREMENTS / ACCEPTANCE / REPORT /
  DECISIONS / BLOCKERS 六份。
- **T002 `HostPublicSpec` 结构扩展**（chapter-schema，`hostPublic.ts`）：`SceneDisclosureSchema`
  追加**唯一一个**可选字段 `knownFactDependencies?: Record<string, string[]>`（key 为 facts id，
  value 为依赖 flag key 列表，`"<container>.<field>"` 格式）。`.optional()`，既有合法
  `host.public.json` 继续通过校验，既有 `.parse()` 行为零破坏（A07）。补齐 ADDENDUM §A15 判定
  2/3 所需的"事实依赖哪些 flag"映射（任务包第 1 节记录的规范空白处置）。
- **T003 祖先集合**（`pass6Ancestors.ts`）：`computeAncestors(graph, target, globalReachable)`
  ——反向图 BFS 遍历完整图，结果与 `globalReachable` 取交（D4：路径存在性是图级事实）。
- **T004 穷举性 + 场景覆盖**（`pass6Exhaustiveness.ts`）：`checkFlagExhaustiveness` 对全局可达
  状态模型 `keys` 逐键核对 `flagVisibility`（未声明即 BLOCKING，A10）；`checkSceneCoverage`
  对每个可达 SCENE 核对 `sceneDisclosures`（缺失即 BLOCKING，A11；可达集函数内重算）。
- **T005 隔离性**（`pass6Isolation.ts`）：`checkIsolation` 收集全部 `EndingNode.when` 引用的
  StatePath 与全部 `BossNode.variables` 键（→ `chapterVariables.<k>`），任一被标 `PUBLIC` 即
  BLOCKING（A12）。全局性，不需祖先集合。
- **T006 白名单 + 时序性**（`pass6Disclosure.ts`）：`checkDisclosureSafety` 对每个可达 SCENE
  的 `knownFactIds`：`knownFactDependencies` 无条目 → `FACT_DEPENDENCY_NOT_DECLARED`；依赖键
  未标 `PUBLIC` 或不在该场景祖先可达状态模型中 → `FACT_FUTURE_LEAK`（D1：判定 2/3 共用两个
  类别）。祖先状态模型复用 DEV-003 冻结的 `buildReachableStateModel(schemaResult, ancestors)`
  （A13）。
- **T007 ForbiddenLexicon**（`pass6ForbiddenLexicon.ts`）：`buildForbiddenLexicon` 产物
  `{ bySceneId, always }`；词条来源仅 `EndingNode.title` + `BossNode.displayName`（不解析叙事
  正文）；`bySceneId[S]` = S 祖先集合之外的结局名/Boss 名，`always` = 不属于任何可达场景祖先
  集合的名称（A15）。
- **T008 编排**：`types.ts` 新增 `HiddenInfoIssue`/`HiddenInfoIssueCategory`（五类）；
  `compile.ts` 新增 `runPass6`/`Pass6Result`，`CompileResult` 新增 `hiddenInfoIssues`，`passed`
  追加 `&& hiddenInfoIssues.length === 0`；`ForbiddenLexicon` 经 `runPass6` 暴露、不参与
  `passed`（产物非校验，A16）；`index.ts` 追加导出五个新模块，供 DEV-050/DEV-050A 消费（A18）。
- **T009 测试 Fixture**：6 组 `host-*` fixture，复制 `valid-minimal` 后针对性编辑
  `host.public.json`（host-isolation-leak 同步编辑 endings/scenes/results），纯 JSON 无生成
  脚本；每组先通过 PASS1–PASS5（A19）。`host-clean` 为四条判定全过的正例（valid-minimal 自身
  host 为空配置，不满足，故另建——见 BLK-004）。
- **T010**：六条命令按序全绿（254/254）；`INDEX.md` T001–T010 全勾选；REPORT 完成；commit 恰
  1 条；LEDGER 追加 NODE_REPORT（消息 `0045`）。

## Changed Files

新增：

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
packages/chapter-compiler/test-fixtures/host-clean/**
specs/dev/DEV-002A/INDEX.md
specs/dev/DEV-002A/REQUIREMENTS.md
specs/dev/DEV-002A/ACCEPTANCE.md
specs/dev/DEV-002A/REPORT.md
specs/dev/DEV-002A/DECISIONS.md
specs/dev/DEV-002A/BLOCKERS.md
specs/comms/0043-OPENCODE-to-COMMANDER-EXECUTOR_QUERY-DEV-002A.md
```

追加式修改：

```
packages/chapter-schema/src/hostPublic.ts        （唯一新增字段 knownFactDependencies；无既有字段改动）
packages/chapter-schema/src/hostPublic.test.ts   （追加新字段相关断言，不改既有断言）
packages/chapter-compiler/src/types.ts           （追加 HiddenInfoIssue 类型族）
packages/chapter-compiler/src/compile.ts         （新增 runPass6/Pass6Result；见下方"例外"）
packages/chapter-compiler/src/compile.test.ts    （追加 PASS6 集成与 A19 用例）
packages/chapter-compiler/src/index.ts           （仅追加 5 行 export *）
packages/chapter-compiler/test-fixtures/README.md（仅追加 6 组新目录说明）
specs/comms/LEDGER.md                            （追加行 + 0042/0044 状态流转）
```

**SCOPE_RULING 0044 授权的唯一例外**（两个 `host.public.json`，Read-only 解除，仅
`flagVisibility`/`sceneDisclosures` 两个字段补齐，`tensionLabels` 未动）：

`valid-minimal`：

```diff
-  "flagVisibility": {},
-  "sceneDisclosures": {},
+  "flagVisibility": {
+    "npc.npc-guide.present": "HIDDEN",
+    "npc.npc-guide.alive": "HIDDEN",
+    "npc.npc-guide.disposition": "HIDDEN",
+    "danger.level": "HIDDEN",
+    "danger.tensionKey": "HIDDEN",
+    "chapterVariables.bossHp": "HIDDEN"
+  },
+  "sceneDisclosures": { "scene-start": { "locationLabel": "森林入口", "knownFactIds": [], "tensionKey": "calm" } },
```

`graph-clean`：

```diff
-  "flagVisibility": {},
-  "sceneDisclosures": {},
+  "flagVisibility": {
+    "npc.npc-guide.present": "HIDDEN",
+    "npc.npc-guide.alive": "HIDDEN",
+    "npc.npc-guide.disposition": "HIDDEN",
+    "danger.level": "HIDDEN",
+    "danger.tensionKey": "HIDDEN",
+    "flags.gateOpen": "HIDDEN",
+    "flags.forestClear": "HIDDEN",
+    "chapterVariables.bossHp": "HIDDEN"
+  },
+  "sceneDisclosures": {
+    "scene-start": {...HIDDEN 同上},
+    "scene-tavern": { "locationLabel": "酒馆", "knownFactIds": [], "tensionKey": "calm" },
+    "scene-forest": { "locationLabel": "森林深处", "knownFactIds": [], "tensionKey": "calm" }
+  },
```

DEV-000/001/002/003 其它 Read-only 文件（chapter-schema 其余 17 模块、chapter-compiler 的
loader/pass1–pass3/pass5 源码、valid-minimal/broken-*/graph-*/state-* 其余文件）均未改动
（A08 证据见 Acceptance Results）。

**compile.ts 的既有行修改**（D7-a 先例）：`const passed` 判定行追加 `&& hiddenInfoIssues.length
=== 0`（T008 #3 明文要求），以及 import 行追加 `HiddenInfoIssue` 类型名——仍属"涉及 DEV-002A
新增内容"的最小必要改动；文件内其余既有行逐字不变。

## Tests Executed

（`SCOPE_RULING 0044` 执行后：清空全部 `packages/*/dist` 与 `*.tsbuildinfo`，严格按 T010 §1
顺序、未插入任何额外命令。）

| 命令 | 结果 | 关键输出 |
|---|---|---|
| pnpm install | PASS | `Done in 764ms using pnpm v11.5.3`，退出码 0 |
| pnpm typecheck | PASS | `tsc -b && tsc -b --noEmit`，无错误输出，退出码 0 |
| pnpm lint | PASS | `eslint .`，无错误无警告输出，退出码 0（0 error / 0 warning） |
| pnpm format:check | PASS | `All matched files use Prettier code style!`，退出码 0 |
| pnpm build | PASS | `tsc -b`，无错误输出，退出码 0 |
| pnpm test | PASS | `Test Files 43 passed (43)` / `Tests 254 passed (254)`，退出码 0；DEV-000/001/002/003 遗留断言零回归（此前 2 个失败项 valid-minimal/graph-clean 已随 SCOPE_RULING 恢复），DEV-002A 新增 35 条断言全部通过 |

## Acceptance Results

| # | 结果 | 证据 |
|---|---|---|
| A01 | PASS | `pnpm install` 退出码 0（见 Tests Executed） |
| A02 | PASS | `pnpm typecheck` 退出码 0 |
| A03 | PASS | `pnpm lint` 退出码 0 |
| A04 | PASS | `pnpm format:check` 退出码 0 |
| A05 | PASS | `pnpm build` 退出码 0 |
| A06 | PASS | `pnpm test` 退出码 0：43 文件 / 254 断言全绿；DEV-000/001/002/003 遗留断言逐字保留且全部通过（valid-minimal / graph-clean 正例随 SCOPE_RULING 0044 恢复 passed: true） |
| A07 | PASS | `hostPublic.ts` 的 git diff 仅新增 `knownFactDependencies` 一个字段，无对任何既有字段的改动（见 Changed Files） |
| A08 | PASS | `git diff` 对 DEV-000/001/002/003 只读源文件（chapter-schema 其余 17 模块、chapter-compiler 的 loader/pass1–pass3/pass5 及各 .test.ts）为空；valid-minimal/broken-*/graph-*/state-* 的唯一例外见 Changed Files（SCOPE_RULING 0044 授权） |
| A09 | PASS | `types.ts`/`compile.test.ts`/`index.ts` 及两包 `hostPublic.test.ts` 的 git diff 纯为新增行；`compile.ts` 除 D7-a 记录的两处既有行最小修改外全部为纯插入 |
| A10 | PASS | host-exhaustive-missing-flag → `FLAG_NOT_DECLARED`（`danger.level` 被检出）（pass6Exhaustiveness.test.ts） |
| A11 | PASS | host-scene-not-covered → `SCENE_NOT_COVERED`（`scene-start` 被检出）（pass6Exhaustiveness.test.ts） |
| A12 | PASS | host-isolation-leak → `ISOLATION_LEAK`（`flags.secretFlag` 被检出）；host-clean（全 HIDDEN）不误报；boss variables 标 PUBLIC 亦被检出（pass6Isolation.test.ts） |
| A13 | PASS | host-fact-undeclared → `FACT_DEPENDENCY_NOT_DECLARED`；host-fact-future-leak → `FACT_FUTURE_LEAK`；祖先已建立 + PUBLIC 的合法依赖不误报（pass6Disclosure.test.ts，含程序化链式图正例） |
| A14 | PASS | `computeAncestors` 链式图 A→B→C 返 {A,B,C}；分支图不误含不相关分支；不可达目标返空；环不无限循环（pass6Ancestors.test.ts） |
| A15 | PASS | `ForbiddenLexicon.bySceneId['scene-start']` 对 valid-minimal 产出 `['暴君','结局']`；`always` 同样；boss 前置于后场景时该名称不在后场景 `bySceneId` 中（pass6ForbiddenLexicon.test.ts） |
| A16 | PASS | compile() 集成测试：host-clean → `passed: true` 且 `hiddenInfoIssues: []` 且 `forbiddenLexicon` 非空（Lexicon 不影响 passed）；六个失败 fixture → `passed: false` 且对应 category 非空（compile.test.ts 新增 describe） |
| A17 | PASS | grep：chapter-schema/chapter-compiler 两包内无 NLP/文本相似度/正文解析相关代码；ForbiddenLexicon 仅读 `EndingNode.title`/`BossNode.displayName` |
| A18 | PASS | `index.ts` 追加导出 pass6Ancestors / pass6Exhaustiveness / pass6Isolation / pass6Disclosure / pass6ForbiddenLexicon 全部公开类型与函数（`export *`，build 产物 dist/index.d.ts 含全部 21 个模块） |
| A19 | PASS | 6 组 host-* fixture 各自跑 PASS1–PASS5 均无任何 issue（compile.test.ts A19 用例：loadIssues/schemaFailures/uniqueness/reference/graph/{trapCycles,reachation}/state 全空） |
| A20 | PASS | `specs/dev/DEV-002A/` 六份文档齐全；INDEX.md 含原句 `OpenCode 禁止自行推进下一 DEV Node.`；T001–T010 全部勾选 |
| A21 | PASS | `git log` 新增恰 1 条提交，首行 `DEV-002A: hidden information validator (PASS 6)`；提交时 `git status --porcelain` 为空（详见 Known Issues #1 的 Commander 未提交治理文件说明，先例与前几节点一致） |
| A22 | PASS | LEDGER 含 `OPENCODE → AUDITOR` 的 `NODE_REPORT-DEV-002A` 记录（0045 行）；信封 `git_head` 与提交 sha 一致 |
| A23 | PASS | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**`、`packages/runtime-kernel/**`、`packages/shared/**` 未被 OPENCODE 修改：git diff 仅含 Commander 下发 DEV-002A 及 SCOPE_RULING 0044 时未单独提交的治理改动（会话开场 git status 快照留档，归因见 Known Issues #1） |

## Scope Deviations

NONE（实现范围严格限定 T001–T010 与消息 `0042`/`0044` 授权。明确未实现：`ForbiddenLexicon` 的
运行时规范化匹配/DROP 判定（DEV-050A，M5）、叙事正文全文扫描（本节点 ForbiddenLexicon 仅取
结构化标题/名称，见 Future Considerations）、DEV-050 运行时读投影、SceneGuard 条件/StatePath
存在性检查的其余归属（沿用 DEV-003 REPORT 先例，非本节点 Task 内容））。

## Known Issues

1. **Commander 下发 DEV-002A 与 SCOPE_RULING 0044 时的治理文件未单独提交**（`specs/PROJECT_INDEX.md`、
   `specs/dev/DAG.md` 为 modified，`specs/tasks/TASK-PACKAGE-DEV-002A.md` 与消息 `0042`/`0044`
   文件为 untracked，均系 Commander 写入，OPENCODE 未改动其内容——会话开场 git status 快照留档）。
   T010 按任务包要求 `git add -A && git commit` 执行，Commander 治理改动随本次提交入库，归因在
   提交 diff 中可见；处理与前几节点一致（`SCOPE_RULING 0044` Exit Procedure 第 6 步明文指示
   `git add -A`）。
2. **BLK-004 结案记录**：valid-minimal / graph-clean 的 host 配置为空是先于 DEV-002A 存在的
   fixture 空配置缺口（DEV-002/003 无 PASS 消费其内容），PASS6 使其可见；经 `SCOPE_RULING 0044`
   （技术性 FIX）授权补齐该两文件，全部验收恢复。详见 `specs/dev/DEV-002A/BLOCKERS.md` 与
   DECISIONS D6。
3. **flagVisibility 键格式约定**：PASS6 按 PASS5 的 `"<container>.<field>"` 键格式读取
   `flagVisibility`/`sceneDisclosures` 相关键；章节作者需按此格式声明（与 `initial.state.json`/
   StateEffect 的 StatePath 渲染一致）。已在 README fixture 说明与 D2 中记录。

## Blockers

BLK-004 已结案（CLOSED，引用消息 `0044`）。当前无 open blocker。

## Future Considerations

- **ForbiddenLexicon 的全文本扫描**：本节点词表仅覆盖结构化标题/名称（`EndingNode.title` /
  `BossNode.displayName`）。若要覆盖叙事正文中可能剧透的句子/关键词，需更大范围的全文扫描 +
  词条抽取功能，属明显更大的范围，Dev Spec 亦未要求；建议由 Commander 在后续 PASS 7（DEV-075，
  资产存在性）或独立节点评估是否需要，作为对 DEV-050A 运行时匹配的补充输入。
- **`CompileResult` 是否携带 `forbiddenLexicon`**：本节点按 T008 #3 仅向 `CompileResult` 加了
  `hiddenInfoIssues`，词表经导出的 `runPass6` 暴露（D3）。若未来 Runtime Bundle 组装入口需要
  `compile()` 直接产出词表，可走 CHANGE_REQUEST 把 `forbiddenLexicon` 提到 `CompileResult`。
- **flagVisibility 键格式的统一解释**：PASS6 与 PASS5（DEV-003）共用 `"container.field"` 键格式，
  但 Addendum A15 #1 原文是"覆盖 ... 的全部 flag 键"，未显式规定格式；本实现按可达状态模型键
  格式（含 npc/danger/chapterVariables 等容器）对齐。若后续希望 flagVisibility 只覆盖 `flags.*`
  一个容器，属规范解释问题，需 Commander 裁决。