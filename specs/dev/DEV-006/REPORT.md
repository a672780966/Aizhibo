# DEV-006 REPORT

## Status

READY_FOR_REVIEW

## Implemented

T001–T008 全部完成（含 `EXECUTOR_QUERY 0061` 上报的两个 BLOCKING，经 `SCOPE_RULING 0062` 裁决后
按方案继续）。实际完成内容：

- **T002 rule-engine 依赖**：按 `SCOPE_RULING 0062`（BLK-006 方案 B）**豁免** Task Package T002 #2 /
  T004 #1 字面要求——`rule-engine` 的 `dependencies` 与 `references` 均**不**追加 dice-engine，保持
  `{ @interactive-story/chapter-schema }` / `[{ "../chapter-schema" }]` 一项。豁免理由与 DECISIONS D5。
- **T003 参与规模判定**（`actionScale.ts`）：`resolveScale` 按数组顺序找首个覆盖 band；防御性兜底
  （全部不匹配 → 开放上限档，连它也没有 → `MASS`），见 DECISIONS D2。
- **T004 Action Resolution 编排**（`actionResolve.ts`）：`ResolveInput`（省略 `playerStateSummary`、
  保留 `worldState`，DECISIONS D1）、`ResolveResult`、`resolveAction` 四分支（完整结果 / mapsTo 单跳 /
  unreachable / quality undefined）+ 畸形多跳返回 undefined 不抛异常；只返回效果不应用（Constraint 2）；
  因 `0062` 方案 B，本地定义 `ResolveRollResult` 结构类型、**不 import dice-engine**（DECISIONS D5）；
  `ResolveResult.quality` 取实际生效条目 quality（DECISIONS D4）。
- **T005 PASS 4**（`pass4RuleCoverage.ts`）：`checkRuleCoverage(schemaResult, pass3)` 对每个**可达且去重**
  Action 判断其 DiceProfile 能摸到的每个 quality，在 ResultDictionary 里是否都有合法（非 unreachable /
  非多跳）结果；只查可达内容，不查死内容。
- **T006 compile() 扩展**：`types.ts` 新增 `RuleCoverageIssue`/`RuleCoverageIssueCategory`
  （`UNREACHABLE_BUT_ROLLABLE`）；`compile.ts` 新增 `runPass4`、`CompileResult.ruleCoverageIssues`、
  `passed` 纳入 `ruleCoverageIssues.length === 0`；`compile.test.ts` 既有断言逐字保留，新增 PASS4 集成
  断言；`index.ts` 追加 `pass4RuleCoverage` 导出。
- **T007 PASS4 fixture**：新建 `coverage-gap`（复制修正后的 `graph-clean`，仅把可达 `action-follow` 所用
  `result-follow.json` 的 `SPECIAL` 改回 unreachable）；`coverage-clean` 直接复用修正后的 `graph-clean`
  （不新建，符合 Task Package §3）；`test-fixtures/README.md` 追加说明。
- **SCOPE_RULING 0062 的 fixture 修正**：`valid-minimal`/`graph-clean`/`host-clean` 的
  `results/result-fight.json`/`result-follow.json` 共 6 文件，把 `SPECIAL` 的 `unreachable: true` 修正为
  完整结果条目（镜像各文件 `GREAT_SUCCESS`，`resultId` 新起 `res-*-special`，`narrativeId` 复用
  `narr-follow-success`——偏差原因 DECISIONS D7）；`dice-standard.json` 的 SPECIAL 阈值保留。
- **T008 验证**：六条命令按序全绿（56 文件 / 339 断言，增量 +26：rule-engine 2 文件、
  chapter-compiler 2 文件 + compile.test 追加，既有全部零回归）；REPORT；commit 恰 1 条；LEDGER 追加
  NODE_REPORT；`DECISIONS.md`/`BLOCKERS.md` 已入库。
- 测试：rule-engine 侧全部手写对象（任务包惯例）；chapter-compiler 侧 PASS4 用程序化 raw pack + 修正后
  fixture，均不碰文件系统读入之外的数据。

## Changed Files

新增（OPENCODE）：

```
packages/rule-engine/src/actionScale.ts
packages/rule-engine/src/actionScale.test.ts
packages/rule-engine/src/actionResolve.ts
packages/rule-engine/src/actionResolve.test.ts
packages/chapter-compiler/src/pass4RuleCoverage.ts
packages/chapter-compiler/src/pass4RuleCoverage.test.ts
packages/chapter-compiler/test-fixtures/coverage-gap/**   （复制 graph-clean + 改 result-follow SPECIAL）
specs/dev/DEV-006/INDEX.md
specs/dev/DEV-006/REQUIREMENTS.md
specs/dev/DEV-006/ACCEPTANCE.md
specs/dev/DEV-006/REPORT.md
specs/dev/DEV-006/DECISIONS.md
specs/dev/DEV-006/BLOCKERS.md
specs/comms/0061-OPENCODE-to-COMMANDER-EXECUTOR_QUERY-DEV-006.md
specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-006.md
```

修改（OPENCODE）：

```
packages/rule-engine/src/index.ts                       （仅追加 export）
packages/chapter-compiler/src/types.ts                  （仅追加 RuleCoverageIssue）
packages/chapter-compiler/src/compile.ts                （仅追加 runPass4 + 字段 + passed 项）
packages/chapter-compiler/src/index.ts                  （仅追加 export）
packages/chapter-compiler/src/compile.test.ts           （既有断言逐字保留，仅追加 PASS4 组）
packages/chapter-compiler/test-fixtures/README.md       （仅追加）
packages/chapter-compiler/test-fixtures/{valid-minimal,graph-clean,host-clean}/results/result-fight.json
packages/chapter-compiler/test-fixtures/{valid-minimal,graph-clean,host-clean}/results/result-follow.json
  （上述 6 文件由 SCOPE_RULING 0062 解除 Read-only，仅改 SPECIAL 条目）
specs/comms/LEDGER.md                                    （0060→CLOSED、0061/0062/NODE_REPORT 行）
```

Commander 治理文件随 `git add -A` 一并入库（非 OPENCODE 编写）：`specs/PROJECT_INDEX.md`、
`specs/dev/DAG.md`、`specs/comms/0060`、`specs/comms/0062`、`specs/tasks/TASK-PACKAGE-DEV-006.md`
（归因见 Known Issues #1，先例与前几节点一致）。

`packages/rule-engine/package.json` / `packages/rule-engine/tsconfig.json` 相对 HEAD **零 diff**
（0062 裁决为不追加 dice-engine，驳加后已复原）。`packages/chapter-compiler/dist/`、`*.tsbuildinfo`
为 gitignored 构建产物。

## Tests Executed

（清空 `packages/*/dist` 与 `*.tsbuildinfo` 后严格按 T008 顺序，未插入额外命令。）

| 命令 | 结果 | 关键输出 |
|---|---|---|
| pnpm install | PASS | `Already up to date` / `Done in 514ms`，退出码 0 |
| pnpm typecheck | PASS | `tsc -b && tsc -b --noEmit`，无错误，退出码 0（BLK-006 环已解） |
| pnpm lint | PASS | `eslint .`，0 error / 0 warning，退出码 0 |
| pnpm format:check | PASS | `All matched files use Prettier code style!`，退出码 0 |
| pnpm build | PASS | `tsc -b`，无错误，退出码 0 |
| pnpm test | PASS | `Test Files 56 passed (56)` / `Tests 339 passed (339)`，退出码 0；增量 +26，既有 313 零回归 |

## Acceptance Results

| # | 结果 | 证据 |
|---|---|---|
| A01 | PASS | `pnpm install` 退出码 0（见 Tests Executed） |
| A02 | PASS | `pnpm typecheck` 退出码 0（六包全过，项目引用环已消除） |
| A03 | PASS | `pnpm lint` 退出码 0 |
| A04 | PASS | `pnpm format:check` 退出码 0 |
| A05 | PASS | `pnpm build` 退出码 0 |
| A06 | PASS | `pnpm test` 退出码 0：56 文件 / 339 断言；既有全部测试零回归 |
| A07 | **偏离** (见下) | 按 `SCOPE_RULING 0062` 方案 B：`rule-engine` `dependencies` 恰为 `{ @interactive-story/chapter-schema }` 一项（**不加** dice-engine），理由见 DECISIONS D5。原文要求 `{chapter-schema, dice-engine}` 已被该裁决豁免，不构成扣分项 |
| A08 | PASS | `resolveScale` 边界值（min/max 两端）正确命中；全不匹配兜底（开放档 / `MASS`）正确（actionScale.test.ts） |
| A09 | PASS | `resolveAction` 四分支行为正确；畸形多跳 mapsTo 返回 undefined 不抛异常（actionResolve.test.ts） |
| A10 | PASS | `checkRuleCoverage` 检出覆盖缺口；不误报可达但结果完整 / mapsTo 合法正例；多处引用同一 Action 只报一次（pass4RuleCoverage.test.ts） |
| A11 | PASS | `compile()` `passed` 正确纳入 `ruleCoverageIssues`：coverage-gap → false + `UNREACHABLE_BUT_ROLLABLE`，修正后 clean fixtures → [] + true（compile.test.ts PASS4 组） |
| A12 | PASS | `packages/rule-engine`、`packages/chapter-compiler` 被列为只读的既有源文件（statePath/condition/effect/ruleSet/guard、loader/pass1/2/3/5/6 等）`git diff` 为空 |
| A13 | PASS | 两包"仅追加"文件（rule-engine `index.ts`、chapter-compiler `types.ts`/`compile.ts`/`index.ts`/`compile.test.ts`）既有代码行 `git diff` 只含新增；rule-engine `package.json`/`tsconfig.json` 零 diff |
| A14 | **偏离** (见下) | 按 `SCOPE_RULING 0062` 方案 B：包内**无** `@interactive-story/dice-engine` import、无 `rollDice`/`resolveQuality`/`resolveModifiers` 调用（grep 仅命中注释，见下）。原文"只有类型 import"已被裁决豁免为"本地 re-define `ResolveRollResult`"，不构成扣分项 |
| A15 | PASS | grep：rule-engine 新代码无 `applyEffect` 调用（仅注释提及 Kernel 职责）（grep 证据见下） |
| A16 | PASS | `DECISIONS.md` 存在且记录：D1 省略 `playerStateSummary`/保留 `worldState` 理由、D3 mapsTo 单跳理由、D4 quality 语义、D5 方案 B、D6/D7 fixture 修正 |
| A17 | PASS | `specs/dev/DEV-006/` 六份文档齐全（含 DECISIONS.md、BLOCKERS.md，随提交入库）；INDEX.md `Status: READY_FOR_REVIEW` 且含原句 `OpenCode 禁止自行推进下一 DEV Node.`；T001–T008 全部勾选 |
| A18 | PASS | `git log` 新增恰 1 条提交，首行 `DEV-006: action resolution engine (PASS 4)`；提交时 `git status --porcelain` 为空 |
| A19 | PASS | LEDGER 含 `OPENCODE → AUDITOR` 的 `NODE_REPORT-DEV-006` 记录；信封 `git_head` 与提交 sha 一致 |
| A20 | PASS | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**`、`packages/chapter-schema/**`、`packages/dice-engine/**`、`packages/runtime-kernel/**`、`packages/shared/**` 未被 OPENCODE 修改（git diff 仅含 Commander 下发/裁决的治理改动，归因见 Known Issues #1） |

### grep 证据（A14 / A15）

```
$ grep -rn "dice-engine\|rollDice\|resolveQuality\|resolveModifiers" packages/rule-engine/src/ packages/chapter-compiler/src/
  actionResolve.ts: 命中均为人话注释（形状对齐说明、SCOPE_RULING 0062 说明），无 import、无调用 —— A14 PASS（方案 B）

$ grep -rn "applyEffect" packages/rule-engine/src/actionScale.ts packages/rule-engine/src/actionResolve.ts
  仅注释 "（DEV-004 applyEffect）is the Kernel's job"，无调用 —— A15 PASS

$ node -e "require('./packages/rule-engine/package.json').dependencies"
  {"@interactive-story/chapter-schema":"workspace:*"} —— A07（方案 B）
```

## Scope Deviations（含 `SCOPE_RULING 0062` 处置）

- **A07 / T002**：`rule-engine` 依赖**不加** dice-engine（原文要求加），按 `SCOPE_RULING 0062`（BLK-006
  方案 B）豁免。理由：加会形成项目引用环 `TS6202`（dice-engine→rule-engine 已被 DEV-005 冻结）。
  见 DECISIONS D5。
- **A14 / T004 #1**：`resolveAction` **不 import** `DiceRollResult`，改本地 `ResolveRollResult`（same 理由，`0062` 豁免）。grep 证实无任何 dice-engine import/调用。
- **`SCOPE_RULING 0062` 范围内新增改动**：6 个 clean fixture 的 `result-*.json` SPECIAL 条目修正
  （BLK-005 方案①，`0062` 授权）；`coverage-gap` 新建、`coverage-clean` 复用 `graph-clean`（`0062`
  + Task Package §3）。
- **`0062` 细则偏差（已在 DECISIONS D7 标注）**：新 SPECIAL 条目的 `narrativeId` 复用既有
  `narr-follow-success`，而非 `0062` 示例的 `narr-*-special`——新建 narrativeId 需对应 narrative 文件，
  `0062` 未授权；复用既有 id 使 fixture 通过全部既有 PASS（PASS2 `actionChain.narrativeId`），核心意图
  （SPECIAL 有合法完整结果、PASS4-clean）完整达成。
- 明确未实现（Non-goals）：PASS7/PASS8、Narrative 拼装（DEV-033）、效果实际应用、`RuntimeEvent`。

## Known Issues

1. **Commander 下发/裁决 DEV-006 的治理文件未单独提交**（`specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`
   为 modified；消息 `0060`/`0062` 与 `specs/tasks/TASK-PACKAGE-DEV-006.md` 为 untracked，均系
   Commander 写入，OPENCODE 未改动其内容——会话开场 git status 快照留档）。按 T008 第 4 步
   `git add -A && git commit` 执行，随本提交入库；处理与前几节点一致（先例同 DEV-004 Known Issues #1）。
2. BLK-005/BLK-006 全过程记录见 `specs/dev/DEV-006/BLOCKERS.md`（两 BLOCKING 均 `CLOSED`，依据
   `0062`）。

## Blockers

NONE（BLK-005 / BLK-006 已按 `SCOPE_RULING 0062` 结案，见 `BLOCKERS.md`）。

## Future Considerations

- **`ResolveResult.quality` 在 mapsTo 命中时取生效条目 quality（DECISIONS D4）**：这是本节点的运行时语义
  选择。若未来 DEV-009 Kernel 需要区分"骰子原始 quality"与"生效 quality"，可考虑在 `ResolveResult` 增
  加字段（不破坏现有字段），由 Commander 裁决。
- **`playerStateSummary`（DECISIONS D1）**：spec §9 提及但形状未冻结、当前无消费者。若后续节点需要，走
  CHANGE_REQUEST 补上（新增字段，成本低）。
- **PASS4 未检查"摸不到却标完整结果"的死内容**（Task Package Non-goals）：属范围外，若 Commander 认为
  需要可在未来节点纳入。
