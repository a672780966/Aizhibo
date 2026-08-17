# DEV-002A DECISIONS

本文件记录 DEV-002A 施工中做出的设计决策。

## D1 — 事实依赖未声明 / 白名单 / 时序性共用两个 Finding 类别

T008 给定的五类 `HiddenInfoIssueCategory` 中，白名单（判定 2）与时序性（判定 3）没有各自
独立的类别，只有 `FACT_DEPENDENCY_NOT_DECLARED` 与 `FACT_FUTURE_LEAK` 两类。实现按任务包
字面执行：

- 依赖条目缺失 → `FACT_DEPENDENCY_NOT_DECLARED`（判定 2 的前置：未声明即拒绝）；
- 依赖键未标记 `PUBLIC`，或已标记 `PUBLIC` 但尚未在场景祖先可达状态中建立 →
  `FACT_FUTURE_LEAK`（判定 2 的白名单违反与判定 3 的时序违反归入同一类别，message 文本区分
  两种原因）。

## D2 — `ForbiddenLexicon` 类型定义在 `pass6ForbiddenLexicon.ts`，经 index re-export

T008 #1 允许"types.ts 定义或从 pass6ForbiddenLexicon.ts re-export，二选一"。选择后者：
`ForbiddenLexicon` 与其构建函数同文件定义，`types.ts` 不重复定义，`index.ts` 的
`export * from './pass6ForbiddenLexicon.js'` 一并导出类型与函数，全包风格一致。

## D3 — `CompileResult` 只新增 `hiddenInfoIssues`，`ForbiddenLexicon` 经 `runPass6` 暴露

T008 #3 只要求 `CompileResult` 新增 `hiddenInfoIssues` 字段（`ForbiddenLexicon` 是产物、不
影响 `passed`）。`compile()` 内部调用 `runPass6` 并丢弃其 lexicon；下游如需词表（DEV-050 /
DEV-050A / Runtime Bundle 组装）直接调用导出的 `runPass6(schemaResult, pass3)`，结果确定
（纯函数、输入相同输出相同）。若未来希望 `compile()` 直接携带词表，属接口变更，走
CHANGE_REQUEST。

## D4 — `computeAncestors` 全图反向 BFS，最后才与 `globalReachable` 取交

T003 #2 定义"X 是祖先当且仅当 X 在 globalReachable 中且存在 X→target 的路径"。路径存在性
是图级事实（中间节点是否可达不影响路径存在），故反向 BFS 遍历**完整**反向图、收集 visited，
最后 `visited ∩ globalReachable` 得祖先集合。若 BFS 中途跳过不可达节点，会漏掉"路径经由
不可达中间节点、但起点本身可达"的祖先（虽然合法内容中几乎不可能出现，字面定义如此）。
对应测试：pass6Ancestors.test.ts "intersects with globalReachable"。

## D5 — 两个正例 fixture 的 host 配置补齐（BLK-004，待 SCOPE_RULING）

`valid-minimal` 与 `graph-clean` 的 `host.public.json` 为空配置，PASS6 白名单/覆盖判定下
必然不通过；而 T008 Acceptance 与 DEV-002/003 遗留断言都要求它们 `passed: true`。方案 A：
经 SCOPE_RULING 授权，把两个文件补齐为完全合规的最小配置——可达状态键全部显式标记
`HIDDEN`（含被非兜底结局 `when` 引用的 `flags.gateOpen`/`flags.forestClear`，按判定 4 本
就该 `HIDDEN`），`sceneDisclosures` 覆盖全部可达场景且 `knownFactIds` 为空。这同时是白名单
纪律的正确示范（每个键都被显式分类）。详见 `specs/dev/DEV-002A/BLOCKERS.md` BLK-004。

## D6 — SCOPE_RULING 0044 授权补齐两个冻结 fixture 的 host 配置

`valid-minimal` 与 `graph-clean` 的 `host.public.json` 此前从未被要求填充（DEV-002/003 无 PASS
消费其内容，两个文件都是空配置 `{flagVisibility: {}, sceneDisclosures: {}}`）。PASS6 的
"未声明即违规"（判定 1）与场景覆盖（判定 1b）接入后首次使其可见——这是先于 DEV-002A 存在
的 fixture 空配置缺口，不是判定逻辑或验收标准问题，与 `BLK-003` 同性质（`SCOPE_RULING`
常规范围内技术性 FIX）。

经 `SCOPE_RULING`（消息 `0044`）授权，解除两个 `host.public.json` 的单文件只读限制，仅补齐
`flagVisibility`/`sceneDisclosures` 两个字段（`tensionLabels` 及其它文件未改动）：

- `valid-minimal`：6 个可达状态键全部显式标记 `HIDDEN`；`sceneDisclosures` 覆盖 `scene-start`
  （`knownFactIds: []`、`tensionKey: "calm"`）。
- `graph-clean`：8 个可达状态键全部 `HIDDEN`（含 `flags.gateOpen`，被非兜底结局 `ending-nice`
  的 `when` 引用，属隔离性键，本应 `HIDDEN`；`flags.forestClear` 为普通可达键，标 `HIDDEN` 亦
  合规——`0044` 已澄清此点）；`sceneDisclosures` 覆盖三个可达场景（各 `knownFactIds: []`、
  `tensionKey: "calm"`）。

效果：四条判定全通过，`hiddenInfoIssues` 均为 `[]`，`compile('valid-minimal')`/
`compile('graph-clean')` 恢复 `passed: true`；PASS1–PASS5 结果不受影响（host 内容不被 PASS 1–5
消费）；既有断言逐字保留、零回归（六命令全绿，254/254）。