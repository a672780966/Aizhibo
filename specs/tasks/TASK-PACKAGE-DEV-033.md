# TASK PACKAGE — DEV-033

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-033 |
| Node Name | Narrative Composer |
| Milestone | M1 — Story Machine Complete |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-006（DONE） |
| Commander | Claude |
| Executor | Codex（协议角色名 `OPENCODE`） |

### 规范原文

第 13 节："不使用语言模型。输入：Resolved ResultSet + Narrative Dictionary + Scene Tone + Priority。输出：ResultNarrationText。例如：PREFIX+SUPPORT+PRIMARY+URGENCY+TRANSITION。"
第 12 节："每一个 ResultSet 要计算 PRIMARY/SUPPORT/CONTEXT/DEFERRED，尽量由 priority/category/urgency 完成，禁止运行时 LLM 判断。"

### 本节点是全项目截至目前规范最模糊的一个，起草时做了不少解释性设计决策，请重点看第 9 节

第 12 节的 `PRIMARY/SUPPORT/CONTEXT/DEFERRED` 与第 13 节例子里的 `PREFIX/SUPPORT/PRIMARY/URGENCY/TRANSITION` **是两个不同的轴，只是都用了"PRIMARY"/"SUPPORT"这两个词，容易混淆**：

- 第 13 节的五个词是**单条 `ResultNarrative` 内部的文本槽位**——已经由 `ADDENDUM-001 §A7` 落地成 `ResultNarrative.primaryBlockId`/`supportBlockIds`/`urgencyBlockId`/`transitionBlockId`/`prefixBlockId` 五个字段，DEV-001 已经把"结构"建好了。
- 第 12 节的四个词是**同一轮里可能有好几个 ActionGroup 同时结算、产生好几条 `ResultNarrative` 时，怎么分主次**——这才是本节点真正要新做的判断逻辑。

`SceneNode` 没有 `tone` 字段（已核实，`packages/chapter-schema/src/scene.ts` 无此字段）。`NarrativeBlock.tone` 目前只是创作期的一致性提示，**没有运行时可比对的场景基调**，本节点不做任何基于 `tone` 的筛选或匹配——这是已核实的事实，不是猜测。

---

## 2. Current Objective

交付 `packages/narrative-composer`：

1. 把**单条** `ResultNarrative` 组装成完整文本（五槱位拼接，逐槱位过滤 `when` 条件）。
2. 当**一轮里有多条** `ResultNarrative` 同时产生（多个 ActionGroup 同时结算）时，按 `focus.priority`/`category`/`urgency` 分出 PRIMARY / SUPPORT / CONTEXT / DEFERRED，决定谁被完整念出来、谁被简短提及、谁这一轮不念。
3. **不使用任何语言模型**——全部是确定性的数据驱动拼接与查表。

---

## 3. Scope

### Writable Scope

```
packages/narrative-composer/package.json
packages/narrative-composer/tsconfig.json
packages/narrative-composer/src/index.ts
packages/narrative-composer/src/composeSingle.ts
packages/narrative-composer/src/composeSingle.test.ts
packages/narrative-composer/src/focus.ts
packages/narrative-composer/src/focus.test.ts
packages/narrative-composer/src/composeResultSet.ts
packages/narrative-composer/src/composeResultSet.test.ts

specs/dev/DEV-033/INDEX.md
specs/dev/DEV-033/REQUIREMENTS.md
specs/dev/DEV-033/ACCEPTANCE.md
specs/dev/DEV-033/REPORT.md
specs/dev/DEV-033/DECISIONS.md（**本节点解释性设计决策最多的一次，几乎肯定要写，且要写得比以往详细**）
specs/dev/DEV-033/BLOCKERS.md（仅在需要时创建）

根 tsconfig.json（追加一行 references 指向 packages/narrative-composer）
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/chapter-schema/**（含 narrative.ts、scene.ts、stateRules.ts、worldState.ts）
packages/rule-engine/**（消费其 evaluateCondition，不修改）
packages/chapter-compiler/**、packages/dice-engine/**、packages/runtime-kernel/**、packages/shared/**
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts
```

### Forbidden Scope

```
packages/* 除 narrative-composer 外的任何目录
apps/**、chapters/**、assets/**、scripts/**、tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration、任何网络调用代码、任何文件系统 IO
任何 LLM SDK、任何 NLP 库、任何"生成式"文本处理——本节点是纯拼接，不是生成
基于 NarrativeBlock.tone 做筛选/匹配的逻辑（无 SceneNode.tone 可比对，已核实）
```

---

## 4. Required Skills

### Required

- 数据驱动的模板拼接（不是字符串生成，是"选对块、按顺序拼起来"）
- 简单的排序/分组逻辑（按 priority 排序、按 category 分组）

### Forbidden / Unnecessary

- 任何 LLM SDK、Prompt 工程、文本生成模型
- 任何 NLP（分词、情感分析、相似度）
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `NarrativeBlock`/`ResultNarrative`（chapter-schema） | 文本槱位数据来源 |
| `evaluateCondition`（rule-engine，DEV-004 冻结） | `NarrativeBlock.when` 的求值 |
| `WorldState`（chapter-schema） | `when` 求值所需的状态 |

---

## 6. Outputs

1. `composeSingleNarrative(narrative: ResultNarrative, blocksById: Map<string, NarrativeBlock>, worldState: WorldState): string`
2. `interface FocusCategorization { primary: ResultNarrative; support: ResultNarrative[]; context: ResultNarrative[]; deferred: ResultNarrative[] }`、`categorizeFocus(narratives: ResultNarrative[]): FocusCategorization`
3. `interface ComposedResultSet { text: string; deferredNarrativeIds: string[] }`、`composeResultSetNarration(narratives: ResultNarrative[], blocksById: Map<string, NarrativeBlock>, worldState: WorldState): ComposedResultSet`
4. `specs/dev/DEV-033/DECISIONS.md`，详细记录第 9 节全部解释性决策

---

## 7. Task Breakdown

> **通用约定**：全部测试用手写对象（`ResultNarrative`/`NarrativeBlock`/`WorldState`），不需要 fixture、不走文件系统。

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-033/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Acceptance**：四文件存在；`INDEX.md` 含原句；Task Order 恰 T001–T006。

---

### T002 — 包脚手架

- **Allowed Files**：`packages/narrative-composer/package.json`、`tsconfig.json`、根 `tsconfig.json`
- **Requirements**：
  1. `package.json`：`"name": "@interactive-story/narrative-composer"`，`dependencies` 恰为 `{ @interactive-story/chapter-schema, @interactive-story/rule-engine }`。
  2. 包级 `tsconfig.json` extends `../../tsconfig.base.json`，`references` 指向两个依赖包。
  3. 根 `tsconfig.json` 追加 `references` 指向 `packages/narrative-composer`。
- **Acceptance**：`pnpm install` 成功；`packages/narrative-composer` 出现在 `pnpm ls -r --depth -1`；`dependencies` 恰为上述两项。

---

### T003 — 单条叙事组装

- **Objective**：把一条 `ResultNarrative` 的五个槱位按第 13 节例子的顺序（PREFIX → SUPPORT → PRIMARY → URGENCY → TRANSITION）拼成一段文本。
- **Allowed Files**：`src/composeSingle.ts`、`src/composeSingle.test.ts`
- **Requirements**：
  1. 导出 `composeSingleNarrative(narrative: ResultNarrative, blocksById: Map<string, NarrativeBlock>, worldState: WorldState): string`。
  2. 按固定顺序处理五个字段：`prefixBlockId`（可选）→ `supportBlockIds`（可选数组，按数组顺序全部尝试）→ `primaryBlockId`（必填）→ `urgencyBlockId`（可选）→ `transitionBlockId`（可选）。
  3. 每个字段引用的 block：从 `blocksById` 查找；若查不到，**跳过**（防御性，不抛异常——理论上 DEV-002 PASS2 应该已保证这些引用存在，运行时仍要防御）；若查到但其 `when` 条件不满足（用 `evaluateCondition` 判定，`when` 未提供视为恒真），**跳过**该块。
  4. 未跳过的块，取其 `text`，用**单个空格**连接（不引入任何格式化标点逻辑——这是最简单、最不会引入意外拼接问题的连接方式，记入 `DECISIONS.md`）。
  5. `primaryBlockId` 对应的块若查不到或条件不满足而被跳过，**整体仍返回其它已拼好的块**（不因为 primary 缺失就整段返回空字符串）——防御性优先于"看起来更正确"的严格失败。
- **Acceptance**：五槱位全部提供且条件满足的正例；某个可选槱位缺失/条件不满足时被正确跳过且不影响其它槱位；`primaryBlockId` 缺失时其它槱位仍正常拼接。

---

### T004 — 焦点分级（Focus Categorization）

- **Objective**：交付第 12 节 PRIMARY/SUPPORT/CONTEXT/DEFERRED 的分级算法。**这是本节点解释性最强的一步，具体规则见下，务必按此实现，不要自行发明替代算法。**
- **Allowed Files**：`src/focus.ts`、`src/focus.test.ts`
- **Requirements**：
  1. 导出 `interface FocusCategorization { primary: ResultNarrative; support: ResultNarrative[]; context: ResultNarrative[]; deferred: ResultNarrative[] }`、`categorizeFocus(narratives: ResultNarrative[]): FocusCategorization`。
  2. 若 `narratives` 为空数组：**这是调用方的错误用法**（一轮结算至少要有一条叙事），本函数不处理这个情形的产出美化，直接抛出错误也不合适（防御性原则），改为返回 `primary` 取 `narratives[0]`（此时是 `undefined`）——**不对**，因为 TypeScript 类型不允许 `undefined` 赋给 `ResultNarrative`。**正确处理**：本函数要求 `narratives.length >= 1`，调用方负责保证；若传入空数组，函数抛出一个描述性错误（这是本节点唯一允许抛异常的地方，因为这是调用契约违反，不是"数据内容有缺陷"）。此例外记入 `DECISIONS.md`，说明为什么这一处允许抛异常而其它地方都是防御性返回。
  3. **PRIMARY**：`focus.priority` 数值最高的一条；并列时取数组中**靠前**的一条（确定性 tie-break，不引入额外随机或复杂规则）。
  4. **SUPPORT**：除 PRIMARY 外，`focus.category` 与 PRIMARY 的 `focus.category` **相同**的其它条目。
  5. **CONTEXT**：除 PRIMARY/SUPPORT 外，`focus.urgency !== "NONE"` 的条目（类别不同但紧急度不为 NONE，值得简短提一句）。
  6. **DEFERRED**：其余全部（类别不同且不紧急）——这一轮不念，交给调用方决定"以后要不要找机会补上"（本节点不管"以后"，只负责标出来）。
- **Acceptance**：单条输入正例（该条即为 PRIMARY，其余三组为空）；同类别多条命中 SUPPORT；不同类别但紧急命中 CONTEXT；不同类别不紧急落入 DEFERRED；并列最高优先级时 tie-break 取靠前一条；空数组输入抛出描述性错误。

---

### T005 — 顶层编排

- **Objective**：把 T003/T004 串成对外唯一入口，产出最终文本与被延后的叙事 id 列表。
- **Allowed Files**：`src/composeResultSet.ts`、`src/composeResultSet.test.ts`、`src/index.ts`
- **Requirements**：
  1. 导出 `interface ComposedResultSet { text: string; deferredNarrativeIds: string[] }`、`composeResultSetNarration(narratives: ResultNarrative[], blocksById: Map<string, NarrativeBlock>, worldState: WorldState): ComposedResultSet`。
  2. 用 T004 的 `categorizeFocus` 分级。
  3. **PRIMARY**：用 T003 的 `composeSingleNarrative` 完整组装（五槱位）。
  4. **SUPPORT / CONTEXT**：各自只取其 `primaryBlockId` 对应块的 `text`（若查不到/条件不满足则跳过该条，不报错）——简短提及，不做五槱位全展开。这条"只取 primary 槱位"的简化规则记入 `DECISIONS.md`，说明理由：完整展开每一条会让一轮结算的旁白过长，只取核心句子足够传达"这件事也发生了"。
  5. **DEFERRED**：不出现在 `text` 里，其 `id` 收进 `deferredNarrativeIds`。
  6. 最终 `text` = PRIMARY 完整文本 + 空格 + 按 SUPPORT 数组顺序拼接的简短句子 + 空格 + 按 CONTEXT 数组顺序拼接的简短句子（三段依次连接，段内/段间统一用单空格分隔，不引入分句符号——与 T003 的连接策略保持一致）。
  7. `index.ts` 导出全部公开类型与函数。
- **Acceptance**：单条叙事的正例（`text` 等于该条的完整组装，`deferredNarrativeIds` 为空）；多条叙事的正例（PRIMARY 完整 + SUPPORT/CONTEXT 简短片段都出现在 `text` 里，DEFERRED 的文本不出现但 id 出现在 `deferredNarrativeIds`）。

---

### T006 — 全量验证、REPORT 与 commit

- **Allowed Files**：`specs/dev/DEV-033/INDEX.md`、`specs/dev/DEV-033/REPORT.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-033.md`
- **Requirements**：
  1. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  2. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  3. **`DECISIONS.md` 必须在提交前已经存在且内容详实**——本节点的分级算法、连接策略、空数组异常处理都是解释性决策，全部要能在 `DECISIONS.md` 里查到依据。
  4. 更新 `INDEX.md`：T001–T006 全部勾选，每完成一个 Task 立即勾选。
  5. `git add -A && git commit`，提交信息首行：`DEV-033: narrative composer`。
  6. 追加 LEDGER 行，发 `NODE_REPORT`。
  7. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`REPORT.md` 引用的全部文档已入库；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-033 INDEX

Status: IN_PROGRESS

## Current Node

DEV-033 — Narrative Composer

## Objective

单条 ResultNarrative 的五槱位拼接 + 多条同时产生时的 PRIMARY/SUPPORT/CONTEXT/DEFERRED
分级。不使用语言模型，纯数据驱动拼接。

## Allowed Scope
（抄录 Task Package 第 3 节 Writable Scope 实际条目）

## Read-only Scope
（抄录 Task Package 第 3 节 Read-only Scope 实际条目）

## Forbidden Scope
（抄录 Task Package 第 3 节 Forbidden Scope 实际条目，含"不做 tone 匹配"）

## Task Order

- [ ] T001 节点文档
- [ ] T002 包脚手架
- [ ] T003 单条叙事组装
- [ ] T004 焦点分级
- [ ] T005 顶层编排
- [ ] T006 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001（每完成一个 Task 立即勾选并更新本字段）

## Exit Criteria

六条命令全部退出码 0；五槱位拼接与焦点分级的全部分支都有测试；`DECISIONS.md`
已入库且记录全部解释性决策；REPORT.md 完成且 Status = READY_FOR_REVIEW；已向
AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints（本节点的解释性决策清单，全部需要记入 DECISIONS.md）

1. **零语言模型**：不引入任何 LLM SDK、Prompt、文本生成逻辑——纯拼接、纯查表。
2. **不做 tone 匹配**：`SceneNode` 没有 `tone` 字段，`NarrativeBlock.tone` 目前只是创作期提示，本节点不实现任何基于它的筛选。
3. **PRIMARY/SUPPORT/CONTEXT/DEFERRED 的判定规则严格按第 7 节 T004 的 2–6 条**，不自行发明替代算法（例如不要因为"觉得应该按 urgency 优先"就改变判定顺序）。
4. **SUPPORT/CONTEXT 只取 primary 槱位简短提及**，不做完整五槱位展开——避免旁白过长。
5. **文本连接策略统一用单空格**，不引入标点/分句逻辑——最简单、最不容易引入拼接错误的方式。
6. **`categorizeFocus` 对空数组输入是本节点唯一允许抛异常的地方**（调用契约违反，不是数据内容缺陷）；其余全部函数对"查不到/条件不满足"一律防御性跳过，不抛异常。
7. `CR-019` 不适用——纯函数库。
8. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现任何 TTS/音频相关逻辑（第三施工组，M3）。
- 不实现"DEFERRED 的叙事以后怎么补上"——本节点只标出哪些被延后，不处理延后之后的调度。
- 不基于 `NarrativeBlock.tone` 做任何筛选/匹配（无对应场景数据可比对）。
- 不引入任何 LLM/NLP/文本生成能力。
- 不修改 `packages/chapter-schema`、`packages/rule-engine`。
- 不创建真实产品内容。

---

## 11. Tests

### Unit tests

T003–T005 各自 `.test.ts`：正例 + 反例，覆盖第 7 节各任务描述的判定分支。

### Regression tests

`pnpm test` 覆盖全 workspace；既有测试零回归。

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
| A06 | `pnpm test` 退出码 0；既有测试零回归 | 命令输出 |
| A07 | `packages/narrative-composer` 的 `dependencies` 恰为 `{ chapter-schema, rule-engine }` | 文件检查 |
| A08 | `composeSingleNarrative` 五槱位顺序正确；缺失/条件不满足的槱位被跳过不报错；primary 缺失时其它槱位仍拼接 | 测试检查 |
| A09 | `categorizeFocus` 四类判定规则均正确；tie-break 取靠前一条；空数组抛出描述性错误 | 测试检查 |
| A10 | `composeResultSetNarration` 单条/多条场景均正确；`deferredNarrativeIds` 正确排除文本 | 测试检查 |
| A11 | 包内不存在任何 LLM SDK/NLP 库依赖、不存在任何基于 `tone` 的筛选逻辑 | grep + 代码审查 |
| A12 | `DECISIONS.md` 存在，记录第 9 节全部 6 条解释性决策 | 文件检查 |
| A13 | `specs/dev/DEV-033/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T006 全部勾选 | 文件 + 文本检查 |
| A14 | `git log` 新增恰 1 条提交，首行 `DEV-033: narrative composer`；提交时 `git status --porcelain` 为空 | 命令 |
| A15 | LEDGER 含 `NODE_REPORT-DEV-033` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A16 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**`、`packages/chapter-schema/**`、`packages/rule-engine/**`、其它冻结包均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT（含确认 `DECISIONS.md` 已提交）→ commit → 发 NODE_REPORT → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A16。
