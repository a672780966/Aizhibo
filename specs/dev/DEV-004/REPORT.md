# DEV-004 REPORT

## Status

READY_FOR_REVIEW

## Implemented

T001–T008 全部完成。实际完成内容：

- **T002 包脚手架**：新包 `packages/rule-engine`（`name: @interactive-story/rule-engine`，
  `dependencies` 恰为 `{ @interactive-story/chapter-schema: workspace:* }`，无 `zod`——本包不
  做校验只做求值）；包级 tsconfig extends base 且 `references: [{ path: '../chapter-schema' }]`
  （T002 #2）；根 tsconfig references 追加 `./packages/rule-engine`。
- **T003 StatePath 寻址**（`statePath.ts`）：`resolveStatePath` 按五种 container 分派——
  `flags`/`chapterVariables` 按键取值；`npc` 支持 `present`/`alive`/`disposition` 与复合
  `flags.<subkey>`；`danger` 单例取 `level`/`tensionKey`（key 忽略）；`discovered`/`activeThreats`
  为成员判定布尔。`writeStatePath` 不可变写入（flags/chapterVariables/npc.field/danger.field）。
  未定义/不支持寻址返回 `undefined`（读）或原样 state（写），不抛异常。
- **T004 Condition 求值**（`condition.ts`）：`evaluateCondition` 六种比较符 + `IN` + `EXISTS` +
  `all`/`any`/`not` 递归。类型不匹配时 EQ/NEQ 按 `===`/`!==` 判定（必然不等），有序比较返回
  `false`；`discovered`/`activeThreats` 上非 EXISTS 比较统一 `false`，EXISTS 直接返回成员判定
  布尔；全防御不抛异常。
- **T005 StateEffect 应用**（`effect.ts`）：`applyEffect` 不可变，五种 op——`SET` 走
  `writeStatePath`；`INC`/`DEC` 数值累加（增量默认 1、非数字目标从 0 起）；`PUSH`/`REMOVE` 仅
  对 `discovered`/`activeThreats`，字符串化成员、PUSH 幂等；作用于其它容器原样返回不变 state。
- **T006 StateRuleSet 求值**（`ruleSet.ts`）：`applyStateRuleSet` 按数组顺序（顺序即优先级）
  对每规则：`once === true` 且 id∈firedRuleIds 则跳过；`when` 成立则效果按序累积到运行态，
  once 规则 id 记入 `newlyFiredRuleIds`。多规则可同批触发；`firedRuleIds` 只读不修改；
  是否持久化由调用方（DEV-009）决定。
- **T007 SceneGuard 解析**（`guard.ts`）：`resolveGuard` 按 `priority` 从高到低求值 `when`，
  返回第一个成立的 `goto`；全不成立返回 `undefined`。
- **T008 验证**：六条命令按序全绿（48 文件 / 280 断言，含 rule-engine 新增 26 条，既有
  chapter-schema/compiler/runtime-kernel/shared 零回归）；REPORT 完成；commit 恰 1 条；
  LEDGER 追加 NODE_REPORT（消息 `0049`）。
- 测试全部为手写 TypeScript 对象字面量（任务包通用惯例），无 fixture、不碰文件系统。

## Changed Files

新增：

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
specs/comms/0049-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-004.md
```

修改：

```
tsconfig.json                    （references 追加 packages/rule-engine 一行）
pnpm-lock.yaml                   （新增 workspace 包）
specs/comms/LEDGER.md            （追加行 + 0048 状态流转）
```

`packages/rule-engine/dist/` 为 gitignored 构建产物。其余冻结包（chapter-schema /
chapter-compiler / runtime-kernel / shared）与全部治理文件均未由 OPENCODE 修改（A18）。

## Tests Executed

（清空 `packages/*/dist` 与 `*.tsbuildinfo` 后严格按 T008 §1 顺序，未插入任何额外命令。）

| 命令 | 结果 | 关键输出 |
|---|---|---|
| pnpm install | PASS | `Done in 460ms using pnpm v11.5.3`，退出码 0 |
| pnpm typecheck | PASS | `tsc -b && tsc -b --noEmit`，无错误输出，退出码 0（含 rule-engine references 图） |
| pnpm lint | PASS | `eslint .`，无错误无警告输出，退出码 0 |
| pnpm format:check | PASS | `All matched files use Prettier code style!`，退出码 0 |
| pnpm build | PASS | `tsc -b`，无错误输出，退出码 0 |
| pnpm test | PASS | `Test Files 48 passed (48)` / `Tests 280 passed (280)`，退出码 0；rule-engine 5 文件 / 26 断言，既有全部测试零回归（254 → 280 增量恰为 26） |

## Acceptance Results

| # | 结果 | 证据 |
|---|---|---|
| A01 | PASS | `pnpm install` 退出码 0（见 Tests Executed） |
| A02 | PASS | `pnpm typecheck` 退出码 0（全五包通过，含 rule-engine） |
| A03 | PASS | `pnpm lint` 退出码 0 |
| A04 | PASS | `pnpm format:check` 退出码 0 |
| A05 | PASS | `pnpm build` 退出码 0 |
| A06 | PASS | `pnpm test` 退出码 0：48 文件 / 280 断言；既有全部测试零回归 |
| A07 | PASS | `packages/rule-engine/package.json` dependencies 恰为 `{ @interactive-story/chapter-schema: workspace:* }`，无 `zod`（见 Changed Files） |
| A08 | PASS | `resolveStatePath` 五种 container 正例 + `npc` 复合 `flags.<subkey>` + 未知 field/无效寻址返回 undefined（statePath.test.ts） |
| A09 | PASS | `evaluateCondition` 六比较符 + IN + EXISTS + all/any/not 深度≥2 + 类型不匹配/成员容器误用返回安全默认值（condition.test.ts） |
| A10 | PASS | `applyEffect` 五种 op 正例 + PUSH 幂等 + 全部 op 深度相等不可变性断言（effect.test.ts） |
| A11 | PASS | `applyStateRuleSet` once 已触发跳过 / 未触发触发并记录 / 多规则同批有序累积（ruleSet.test.ts） |
| A12 | PASS | `resolveGuard` 高优先级成立者选中（与数组位置无关）/ 全不成立返回 undefined / 空数组 undefined（guard.test.ts） |
| A13 | PASS | grep：rule-engine 源码无任何文件系统 IO、网络调用、`RuntimeEvent` 构造代码（grep 证据见上） |
| A14 | PASS | grep：rule-engine 源码无 `throw`（第 9 节 Constraint 3 的防御性求值，grep 证据见上） |
| A15 | PASS | `specs/dev/DEV-004/` 四份文档齐全；INDEX.md 含原句 `OpenCode 禁止自行推进下一 DEV Node.`；T001–T008 全部勾选 |
| A16 | PASS | `git log` 新增恰 1 条提交，首行 `DEV-004: state rule engine`；提交时 `git status --porcelain` 为空（详见 Known Issues #1） |
| A17 | PASS | LEDGER 含 `OPENCODE → AUDITOR` 的 `NODE_REPORT-DEV-004` 记录（0049 行）；信封 `git_head` 与提交 sha 一致 |
| A18 | PASS | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**`、`packages/chapter-schema/**`、`packages/chapter-compiler/**`、`packages/runtime-kernel/**`、`packages/shared/**` 未被 OPENCODE 修改：git diff 仅含 Commander 下发 DEV-004 时未单独提交的治理改动（会话开场 git status 快照留档，归因见 Known Issues #1） |

## Scope Deviations

NONE（实现范围严格限定 T001–T008。明确未实现：`newlyFiredRuleIds` 的持久化决定（T006 #4 明示属
DEV-009 职责）、Dice/Action/Result 逻辑（DEV-005/006）、`RuntimeEvent` 构造/发送（DEV-008
类型已冻结，DEV-009 使用）、任何异步/IO。包级 tsconfig 的 `references: [{ path: '../chapter-schema' }]`
按 T002 #2 字面加入；因 chapter-schema 是叶子依赖包、且根 `tsc -b` 已先构建依赖，未复现
DEV-002 FIX 移除包级 references 时所针对的问题——见 DECISIONS D1）。

## Known Issues

1. **Commander 下发 DEV-004 时的治理文件未单独提交**（`specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`
   为 modified，消息 `0048` 文件与 `specs/tasks/TASK-PACKAGE-DEV-004.md` 为 untracked，均系
   Commander 写入，OPENCODE 未改动其内容——会话开场 git status 快照留档）。按 T008 第 4 步
   `git add -A && git commit` 执行，Commander 治理改动随本提交入库（亦含 pnpm-lock.yaml 的
   包登记），归因在提交 diff 中可见；处理与前几节点一致。
2. rule-engine 无 fixture、无 loader——本包全部函数接受已解析的类型化对象，测试用手写对象
   字面量（任务包惯例），无需 `valid-minimal` 等编译期 fixture。

## Blockers

NONE。

## Future Considerations

- `applyStateRuleSet` 返回 `newlyFiredRuleIds` 后，DEV-009 Kernel 需决定如何持久化（写入
  `chapterVariables` 或独立记忆），并据此在每次调用时回填 `firedRuleIds` 输入；本包保持无状态。
- 包级 tsconfig `references` 的取舍：本包按 T002 #2 字面保留了到 chapter-schema 的项目引用
  （见 DECISIONS D1）。若未来根 typecheck 机制再变、或扩包到 DAG 图中产生引用环，可回头评估
  是否与 chapter-compiler 一致改为纯根 solution 引用。
- `resolveStatePath`/`writeStatePath` 对 `discovered`/`activeThreats` 只做成员判定/PUSH/REMOVE
  ——不存在"按下标取值/写入"的语义（ADDENDUM §A6 亦无此需求）；若未来需要数组下标寻址，属新增
  语义，需 Commander 裁决后扩展。