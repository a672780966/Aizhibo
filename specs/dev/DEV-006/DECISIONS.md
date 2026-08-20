# DEV-006 DECISIONS

本节点的设计决策。**本文件随最终提交入库**（DEV-004 上一轮 FIX 的教训：REPORT 引用但未提交
证据链断裂被判 FAIL）。

## D1 — ResolveInput：省略 `playerStateSummary`，保留 `worldState`（T004）

`ResolveInput`（spec §9）采用了**省略 `playerStateSummary`、保留 `worldState`**的组合：

- **省略 `playerStateSummary`**：spec §9 原文提到该字段，但其形状从未在任何已冻结节点中定义过，
  且本节点全部必需计算（规模判定 / 结果查表 / 效果提取）都不读取它。省略比发明一个当前无消费者的
  新类型更符合"不做投机性设计"的纪律。若未来某节点确实需要它，走 CHANGE_REQUEST 补上成本很低
  （新增字段，不破坏现有调用方）。
- **保留 `worldState`**：虽然本节点当前计算逻辑不读取它的任何字段，但它复用的是已完整定义的冻结
  `WorldState` 类型，不需要发明新结构，保留成本为零，且为未来可能的状态相关结果变化留一个不需要
  破坏性改接口就能用上的位置。
- 两者区别刻意不同（Task Package T004 #1 明示）：一个发明新结构（省略），一个零成本传递既有结构
  （保留）。记录于此。

## D2 — `resolveScale` 的防御性兜底（T003）

正常 `WorldRules.defaultScaleBands`/`action.scaleBands` 按 DEV-002 T008 已验证完整覆盖且不重叠，
理论上任意非负人数都能命中某个 band。防御性兜底（Task Package T003 #3）：全部不匹配时返回数组中
`maxParticipants === null` 的 band 的 `scale`（开放上限档），若连它也没有返回字面 `"MASS"`——不抛
异常（Constraint 4）。这是把"内容已保证正确"当作事实但仍给一个可用返回值的纯防御设计。

## D3 — `mapsTo` 只跟一跳（T004）

`resolveAction` 对 `mapsTo` 条目**只跟一跳**：在同一 `ResultDictionary` 里找 `mapsTo` 指向的 quality
对应的条目，那一跳必须是完整结果条目，否则（它仍是 `mapsTo`、或 `unreachable`、或不存在）视为解析
失败返回 `undefined`，不递归多跳、不抛异常。这是防止内容错误导致死循环的硬边界，即使牺牲某些理论上
可多跳解析成功的畸形内容。与 Task Package Constraint 3 一致，记录于此。PASS4（`checkRuleCoverage`）
对同一规则做静态侧验证：可达 Action 的 rollable quality 若经 `mapsTo` 无法一跳解析到完整结果，同样
报 `UNREACHABLE_BUT_ROLLABLE`。

## D4 — `ResolveResult.quality` 取实际生效条目的 quality（T004）

当 `mapsTo` 命中时（如 `DISASTER → FAILURE`），`ResolveResult.quality` 采用**实际生效条目**的
quality（即 `FAILURE`），而非骰子原始摸到的 quality（`DISASTER`）。理由：`ResolveResult` 的
`resultId`/`worldEffects`/`playerEffects`/`narrativeId`/`visibility` 全部来自实际生效条目，quality
作为该结果集的标签也应一致，避免下游消费方拿到一个指向 FAILURE 结果的 resultId 却标着 DISASTER 的
quality 造成自相矛盾。

## D5 — BLK-006 处置：本地 `ResolveRollResult`，不 import dice-engine（SCOPE_RULING 0062）

原 Task Package T002 #2 要求 rule-engine tsconfig `references` 追加 `../dice-engine`、T004 #1 要求
`import type { DiceRollResult } from '@interactive-story/dice-engine'`，但因 DEV-005 已冻结
`dice-engine → rule-engine`（`modifiers.ts` 运行时 `evaluateCondition`），新增反向引用形成项目引用环
（`TS6202`），`pnpm build`/typecheck 全环。经 `EXECUTOR_QUERY 0061` 上报后，`SCOPE_RULING 0062`
裁决采纳方案 B：

- rule-engine **豁免** T002 #2 / T004 #1 字面要求；`package.json`/`tsconfig.json` 保持只依赖
  `chapter-schema`，**不**追加 dice-engine；
- `actionResolve.ts` 本地定义 `ResolveRollResult` 结构类型，字段与 dice-engine `DiceRollResult` 逐字
  对齐，但**不 import** dice-engine；
- 这是 `DEV-005 DECISIONS D5`（"对齐是约定而非类型复用"）的**镜像应用**——dice-engine 对齐
  runtime-kernel 而不 import 它；本节点对齐 dice-engine 而不 import 它。此纪律在本项目已两处落地。

对应地，`A07`（dependencies 恰为 `{chapter-schema, dice-engine}`）在 REPORT 中如实标注偏离原文
（实际为 `{chapter-schema}` 一项），`A14` 文字隐含"类型 import"亦标注，均引用本条 `0062`，不构成
扣分项。

## D6 — BLK-005 处置：修正既有 clean fixture 的 SPECIAL 结果（SCOPE_RULING 0062）

`valid-minimal`/`graph-clean`/`host-clean` 三套 clean fixture 原把可达 Action（`action-follow`，
经入口 `scene-start` 的 `interaction-01` Choice A 引用）所用 `dice-standard` 能摸到的 `SPECIAL`
（阈值 20-20）在 `result-fight`/`result-follow` 中标为 `unreachable: true`——"能摸到但标不可能"
是内容自相矛盾，PASS4 接入后首次暴露。经 `EXECUTOR_QUERY 0061` 上报，`SCOPE_RULING 0062` 裁决
采纳方案①（BLK-005）：

- 解除上述 6 个 `results/result-*.json` 的 Read-only 限制（仅 SUPER 条目一处），把 `SPECIAL` 的
  `unreachable: true` 改为完整结果条目，镜像各文件 `GREAT_SUCCESS` 形状；
- `resultId` 各新起（`res-fight-special`/`res-follow-special`，ResultEntry 不校验 resultId 注册）；
- **`narrativeId` 复用既有 `narr-follow-success`**（见 D7），不新起——避免因缺少 narrative 文件触发
  PASS2 `actionChain.narrativeId` BLOCKING，超出 `0062` 授权范围；
- 不清除 `dice-standard` 的 SPECIAL 阈值（d20 本来就摸得到 20，删阈值是回避事实）。

由此三套 clean fixture 名副其实 PASS4-clean。T007 的 `coverage-clean` 正例直接复用修正后的
`graph-clean`（不新建，符合 Task Package §3）；`coverage-gap` 反例从修正后的 `graph-clean` 复制、
仅把 `result-follow.json` 的 `SPECIAL` 改回 `unreachable: true`。

## D7 — `narrativeId` 复用既有 id（SCOPE_RULING 0062 的细则偏差）

`0062` 给出示例 id `narr-fight-special`/`narr-follow-special`，但新建 narrativeId 需要对应的
`ResultNarrative` 文件；`0062` 仅授权修改 6 个 result 文件，未授权新建 narrative 文件，而 `0062`
自己也强调 fixtures 必须通过既有全部 PASS（否则不叫 clean）。因此新 `SPECIAL` 条目的 `narrativeId`
**复用各文件 GREAT_SUCCESS 本就在用的既有 `narr-follow-success`**（不新起、不引入缺失引用），
`resultId` 按 `0062` 字面新起。此偏差已在 `REPORT.md` 如实标注，核心意图（SPECIAL 有合法完整结果、
fixture PASS4-clean）完整达成。