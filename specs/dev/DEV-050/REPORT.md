# DEV-050 REPORT

## 1. Status

READY_FOR_REVIEW

## 2. Implemented

- 新建 `packages/runtime-kernel/src/publicState.ts`：
  - **类型**：`PublicChoice{id}`/`PublicDiceResult{diceType,
    finalValue, quality}`/`PublicRuntimeState{currentLocation,
    knownFacts, currentChoices?, publishedDice?, currentTension,
    storyPhase, interactionPhase}`（`currentChoices`/`publishedDice`
    可选——无数据时字段省略而非 `undefined` 赋值，
    `exactOptionalPropertyTypes` 下用条件 spread 实现）。
  - **内部辅助** `resolveWorldStateKey(world, key)`（不导出）：把
    `container.field` 键（与 `pass5ReachableState.ts` 键格式逐字节
    一致）解析回 `WorldState` 值，覆盖 `flags.<name>`/
    `chapterVariables.<name>`/`npc.<id>.present|alive|disposition|
    flags.<name>`/`danger.level`/`danger.tensionKey` 六种格式；
    `=== undefined` 存在性检查（非真值检查，`false`/`0`/`''` 均为
    已确立值）。
  - `isFactSafeToDisclose(dependencies, flagVisibility, world)`：
    PASS 6 编译期 `checkDisclosureSafety` 的**运行时对偶**，
    default-reject（依赖未声明/未标 PUBLIC/当前未确立值，任一不满足
    即剔除，不抛异常）。
  - `getPublicState(actor, hostPublicSpec)`：读快照
    `internal.world`/`interactionPhase`（包内 import
    `unwrapSnapshot`，不新增对外导出）；`currentLocation` 取自
    `sceneDisclosures[sceneId].locationLabel`；`knownFacts` 经
    `isFactSafeToDisclose` 逐条过滤；`currentChoices` 仅当
    `interactionPhase === 'OPEN'` 时取 `getCurrentChoiceIds`；
    `publishedDice` 仅当相位越过 OPEN/CLOSED 时过滤
    `DICE.PUBLISHED`（只取 `diceType`/`finalValue`/`quality`）；
    `currentTension` 取自 `tensionLabels[world.danger.tensionKey]`；
    `storyPhase`/`interactionPhase` 复用 DEV-009 具名访问器。
  - **零新增 npm 依赖**；不改动任何既有导出函数签名/行为；不改动
    `machine.ts`/`interactionRegion`/`eventSubMachine` 既有逻辑。
- 新建 `packages/runtime-kernel/src/publicState.test.ts`（21 条测试，
  见 §4）：15 条 `isFactSafeToDisclose` 直接单元测试（4 种拒绝 +
  通过 + 六种 key 格式 + 部分安全 + 空数组真空）+ 6 条
  `getPublicState` 投影测试（真实 fixture 驱动 + `instantClock` +
  合成 `HostPublicSpec`）。
- `packages/runtime-kernel/src/index.ts` **末尾追加两行**导出
  `getPublicState`/`isFactSafeToDisclose` 函数与
  `PublicRuntimeState`/`PublicChoice`/`PublicDiceResult` 类型，既有
  任何一行未改动顺序或内容。
- 新建 `specs/dev/DEV-050/DECISIONS.md`（D1–D6，见 §5/§3 A20）：
  D1 字段取舍表 / D2 运行时对偶 default-reject 设计 / D3
  `unwrapSnapshot` 包内读取 / D4 + D5 两个实测缺陷记录 / D6
  `publishedDice` 相位门控。
- **T002 实测发现并修复两个真实缺陷**（详见 DECISIONS D4/D5，审计
  重点）：
  - (a) `resolveWorldStateKey` 初版漏了 `danger` 容器——跨查
    `pass5ReachableState.ts` 键构造（`danger.level`/`danger.tensionKey`）
    与 fixture `host.public.json` 发现，补 `danger` 分支修复；
  - (b) `getCurrentChoiceIds` 是 **scene-driven 而非 phase-gated**——
    当前场景声明 `interactionId` 即返回选项 id，互动未 OPEN 也泄漏。
    探针实验证实 BOOT 后（STORY_PLAYING）已返回 `['A']`。修复：
    `currentChoices` 门控 `interactionPhase === 'OPEN'`；
    `publishedDice` 防御性门控相位越过 OPEN/CLOSED。
- 未实现：`chapterTitle`/`currentChoiceCounts`/`visiblePlayerCondition`/
  `PublicPhase` 枚举（无数据来源或超出"投影已有数据"范围，D1）；
  未接入 DEV-050A/ai-host；未导出 `unwrapSnapshot`；未新增任何依赖。

## 3. Changed Files

Writable Scope 内共 6 个文件（本次实现提交 6，含 INDEX.md 状态更新）：

```text
packages/runtime-kernel/src/publicState.ts       （新增，投影函数 + 类型 + 内部辅助）
packages/runtime-kernel/src/publicState.test.ts  （新增，21 条测试）
packages/runtime-kernel/src/index.ts             （追加 2 行导出，既有行零改动）
specs/dev/DEV-050/DECISIONS.md                   （新增，D1–D6）
specs/dev/DEV-050/REPORT.md                      （T001 模板 → T003 回填，本文件）
specs/dev/DEV-050/INDEX.md                       （T001–T003 勾选 + Status=READY_FOR_REVIEW）
```

节点文档 `REQUIREMENTS.md`/`ACCEPTANCE.md` 由 Commander 在
`da3c99e` dispatch 时预填，本节点零改动；`packages/runtime-kernel/**`
既有文件（除 `index.ts` 追加两行外）逐字节未改动（见 §6 Scope Check
的 git diff 佐证）；`packages/chapter-schema/**`/
`chapter-compiler/**`/`dice-engine/**` 及 `PROJECT_INDEX.md`/`DAG.md`/
`tasks/**`/`audit/**`/`protocol/**` 均未修改。

## 4. Tests Executed

六条命令严格按要求顺序执行，全部退出码 0：

| # | 命令 | 结果 |
|---|---|---|
| 1 | `pnpm install` | 0；13 workspace projects，Already up to date |
| 2 | `pnpm typecheck` | 0；`tsc -b` + `tsc -b --noEmit` + renderer typecheck |
| 3 | `pnpm lint` | 0；`eslint .`（初跑报 2 个 unused-import 错误，移除测试文件多余 import 后全绿） |
| 4 | `pnpm format:check` | 0；Prettier 全绿（初跑报 2 个新文件格式，`prettier --write` 后全绿，仅格式） |
| 5 | `pnpm build` | 0；`tsc -b` |
| 6 | `pnpm test` | 0；113 test files passed，651 tests passed（DEV-046 基线 630，新增 21） |

新增 21 条测试（`publicState.test.ts`）：A08–A11 过滤语义 4 条 +
A12 key 格式 6 条 + 拒绝/真空/部分安全 5 条（共 15 条
`isFactSafeToDisclose`）+ A07/A13/A14/A15/A16 投影 5 条 + 场景无
disclosure 兜底 1 条（共 6 条 `getPublicState`）。既有全部包测试
零回归（651 = 630 基线 + 21 新增）。lint/format 初跑的 4 个告警均为
本节点新文件自身问题（2 unused import + 2 格式），修复后无遗留，
未触碰任何既有文件。

## 5. Acceptance Results

| # | 判定 | 结果 | 依据 |
|---|---|---|---|
| A01 | `pnpm install` 退出码 0 | PASS | Tests Executed #1 |
| A02 | `pnpm typecheck` 退出码 0 | PASS | Tests Executed #2 |
| A03 | `pnpm lint` 退出码 0 | PASS | Tests Executed #3 |
| A04 | `pnpm format:check` 退出码 0 | PASS | Tests Executed #4 |
| A05 | `pnpm build` 退出码 0 | PASS | Tests Executed #5 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | PASS | 113 files / 651 tests；DEV-046 基线 630 全绿 + 新增 21 |
| A07 | `currentLocation` 正确取自 `sceneDisclosures[sceneId].locationLabel` | PASS | 测试：BOOT 后 `getPublicState(actor, spec)` → `state.currentLocation === '森林入口'`（fixture scene-start 的 locationLabel） |
| A08 | `knownFacts` 依赖全 PUBLIC 且已确立 → 事实出现 | PASS | 测试：`guide-is-here`（依赖 `npc.npc-guide.present` PUBLIC+已确立）/`danger-is-calm`（依赖 `danger.tensionKey`）均出现 |
| A09 | `knownFacts` 依赖含 HIDDEN → 事实剔除 | PASS | 测试：`flagVisibility` 标 HIDDEN 的依赖 → `isFactSafeToDisclose` false → 剔除 |
| A10 | `knownFacts` 依赖未确立值 → 事实剔除 | PASS | 测试：`something-unestablished`（依赖 `flags.neverSet` PUBLIC 但 world 无此 key）→ 剔除 |
| A11 | `knownFacts` 事实未声明依赖 → 剔除（default-reject） | PASS | 测试：`undeclared-fact`（`knownFactDependencies` 无条目 → `dependencies === undefined`）→ 剔除 |
| A12 | `isFactSafeToDisclose` 覆盖 6 种 key 格式 | PASS | 测试：`flags.*`/`chapterVariables.*`/`npc.*.present`/`alive`/`disposition`/`flags.*`/`danger.level`/`danger.tensionKey` 各一条全 true |
| A13 | `currentChoices` 互动 OPEN 时正确返回，非互动时为 `undefined` | PASS | 测试：BOOT 后（STORY_PLAYING）`currentChoices` undefined；`STORY.DONE`+`INTERACTION.OPEN` 后 `[{id:'A'}]`（D4 修复后真实通过） |
| A14 | `publishedDice` 正确过滤 `DICE.PUBLISHED`（不误取 `DICE.ROLLED`），无记录时为 `undefined` | **FAIL → PASS（FIX-01）** | 初版：LOCK 前 `undefined`；VOTE+LOCK 后非空数组，逐条形状正确（`diceType`/`finalValue`/`quality`）——但只验证了非空+形状，**未证明 HIDDEN `DICE.ROLLED` 记录（与 `DICE.PUBLISHED` 同 payload 形状）被排除**，若实现退化成不过滤全塞仍会通过（AUDIT F-01 MAJOR）。FIX-01 追加三段式断言后 PASS：`DICE.ROLLED` 记录确实存在且全部 `visibility==='HIDDEN'`；`publishedDice` 数量 === `rolledEntries` 数量 === `publishedEntries` 数量（一一对应）；`publishedDice` 数量 < 全部 `DICE.*` 条目总数（回归哨兵）。实现代码零改动，过滤条件 `type==='DICE.PUBLISHED' && visibility==='PUBLIC'` 本身审计确认正确 |
| A15 | `currentTension` 正确取自 `tensionLabels[world.danger.tensionKey]` | PASS | 测试：fixture 初始 `danger.tensionKey==='calm'` → `state.currentTension === '平静'` |
| A16 | `storyPhase`/`interactionPhase` 与既有访问器输出逐字节一致 | PASS | 测试：`state.storyPhase === getStoryPhase(getRuntimeSnapshot(actor))`，interactionPhase 同 |
| A17 | `runtime-kernel` 除 `index.ts`（仅追加两行）与新文件外零改动 | PASS | `git diff -- packages/runtime-kernel` 仅 `index.ts` +2 行；`publicState.ts(.test.ts)` 为新增 untracked（见 §6） |
| A18 | `index.ts` 未导出 `unwrapSnapshot`/任何暴露 `InternalSnapshot` 的符号 | PASS | 源码检查：追加两行仅导出 `getPublicState`/`isFactSafeToDisclose` 与 3 个 Public 类型；`unwrapSnapshot` 仅包内 `./snapshot.js` import（D3） |
| A19 | 未新增第三方 npm 依赖 | PASS | 零新增；纯既有 API 投影，`package.json`/`pnpm-lock.yaml` 无 diff |
| A20 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | PASS | D1 字段取舍表 / D2 运行时对偶 default-reject / D3 unwrapSnapshot 包内读取；另含 D4+D5 实测缺陷记录与 D6（§2） |
| A21 | `specs/dev/DEV-050/` 节点文档齐全，`INDEX.md` T001–T003 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | PASS | INDEX/REQUIREMENTS/ACCEPTANCE/DECISIONS/REPORT 五份齐全；INDEX Task 全勾 + Status 已更新（§7） |
| A22 | `git log` 新增恰 1 条提交，首行 `DEV-050: public state gateway (projection function)` | PASS | 本次交付 commit 核验（§7） |
| A23 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | PASS | commit 后 `git status --porcelain`（见 §8） |
| A24 | `PROJECT_INDEX.md`/`DAG.md`/`tasks/**`/`audit/**`/`protocol/**` 均未被修改 | PASS | 交付 diff 为空（见 §6 Scope Check） |

## 6. Scope Check

只施工 DEV-050。没有推进任何其他 DEV 节点；没有实现
`chapterTitle`/`currentChoiceCounts`/`visiblePlayerCondition`/
`PublicPhase` 枚举（D1）；没有导出 `unwrapSnapshot` 或任何暴露
`InternalSnapshot` 真实结构的符号（D3）；没有接入
DEV-050A/ai-host；没有新增任何第三方 npm 依赖（A19）；没有改动
`machine.ts`/`interactionRegion.ts`/`eventSubMachine` 既有逻辑。

**`runtime-kernel` 零回归红线核验（本节点最重要 Scope Check）**：
自 M1 起 `runtime-kernel` 首次被授权修改，Constraint 1 要求除
`index.ts`（仅追加两行）与本节点新增的 `publicState.ts(.test.ts)`
外，其余任何现有文件**逐字节不得改动**。核验方式：`git diff --
packages/runtime-kernel` 的输出**只有** `index.ts` 一个已跟踪文件，
且 diff 为**恰好 +2 行**（文件末尾追加的两行导出，无任何既有行被
改动顺序或内容）；`publicState.ts`/`publicState.test.ts` 是两个
全新 untracked 文件。除此之外 `runtime-kernel` 内**没有任何其他已
跟踪文件出现在 diff 中**——即除那两行追加外零改动，红线满足。
（注：`git diff` 不显示 untracked 新文件，二者以 `git status` 单独
确认；CRLF 换行警告为 Git 工作区规范化提示，非内容改动。）

`PROJECT_INDEX.md`/`DAG.md`/`tasks/**`/`audit/**`/`protocol/**`
均未修改。Constraints 1–8 全部遵守。

**Scope Deviations（申报，非越界）**：
1. T002 实测发现两个真实缺陷并修复，均在 `publicState.ts` 内完成，
   属本节点 Writable Scope（DECISIONS D4/D5 全文记录，A13/A14 因
   此才真实通过）：(a) `resolveWorldStateKey` 补 `danger` 容器分支；
   (b) `currentChoices` 门控 `interactionPhase === 'OPEN'`、
   `publishedDice` 防御性门控相位。
2. lint/format 初跑 4 个告警（2 unused import + 2 格式）均为本节点
   新文件自身问题，已修复，未触碰既有文件。
3. Writable Scope 列出的节点文档 `REQUIREMENTS.md` 与 `ACCEPTANCE.md`
   由 Commander 预填于 `da3c99e`，本节点未再改动（同 DEV-046 先例）；
   REPORT.md 为 T001 新建模板 → T003 回填。

## 7. Commit

提交信息首行：`DEV-050: public state gateway (projection function)`。

提交内容仅限 Writable Scope 内 6 个文件（§3），恰 1 条新提交；
`git add` 逐一列名，未使用 `git add -A`。`DECISIONS.md` 已包含在该
提交中。LEDGER 追加行与 NODE_REPORT 消息文件（`specs/comms/`）已写入
工作区但**未提交**，留给 Commander 收尾统一提交（Constraint 8 /
A23）。

## 8. Handoff

NODE_REPORT 发往 `AUDITOR`，抄送 `COMMANDER`；审核锚点与交付快照见
`specs/comms/0206-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-050.md`。审计
重点：D4/D5 两个实测缺陷的发现与修复过程（`currentChoices` 相位
门控 + `danger` 容器分支），以及 §6 的 `runtime-kernel` 零回归红线
核验（`git diff` 仅 `index.ts` +2 行）。

---

## FIX-01 轮次（AUDIT F-01 MAJOR 修复）

### 修复内容

AUDIT_VERDICT（0207）判定 A14 为 F-01 MAJOR：初版 `publishedDice`
测试只断言结果非空 + 逐项字段形状正确（`diceType`/`finalValue`/
`quality`），**从未证明 HIDDEN 的 `DICE.ROLLED` 记录被排除**——而
`DICE.ROLLED` 与 `DICE.PUBLISHED` 共享完全相同的 payload 形状
（`DiceRollRecordPayload`，`machine.ts` 第 401–405 行），仅
`type`/`visibility` 不同；若实现退化成"不过滤，把所有 dice 条目全塞
进结果"，初版测试照样全部通过。实现代码审计确认正确，缺口在测试
未锁定排除行为，故本轮只补测试，`publicState.ts` 零改动。

`publicState.test.ts` 在目标测试尾部追加三段式断言（零删除零改动既有
断言）：

1. `getEventLog(actor)` 过滤 `type === 'DICE.ROLLED'` → `length > 0`
   且每条 `visibility === 'HIDDEN'`（证明场景确实产生需排除的 Hidden
   记录，非假阳性）。
2. `state.publishedDice!.length === rolledEntries.length ===
   publishedEntries.length`（一一对应，无多算/漏算）。
3. `state.publishedDice!.length` < 全部 `DICE.*` 条目总数（回归哨兵，
   防过滤条件被误删/改坏）。

### FIX-01 命令与测试

六条命令全部退出码 0（见 §4 表格 + 本段）：`pnpm install` 0 /
`pnpm typecheck` 0 / `pnpm lint` 0 / `pnpm format:check` 0 /
`pnpm build` 0 / `pnpm test` 0。测试总数 **651 不变**（无新增测试
用例，仅既有测试内追加断言），113 files / 651 tests 全绿，既有全部
测试零回归。

### FIX-01 Acceptance Results

| # | 判定 | 结果 | 依据 |
|---|---|---|---|
| FIX-A01 | 六条命令全部退出码 0，既有全部测试零回归 | PASS | 六命令 0；113 files / 651 tests（计数不变） |
| FIX-A02 | 新断言证明 `DICE.ROLLED`（HIDDEN）确实存在且被排除，`publishedDice` 数量与 `DICE.PUBLISHED` 一一对应 | PASS | 三段式断言 #1（`length>0` 且全 HIDDEN）+ #2（`=== rolledEntries.length === publishedEntries.length`） |
| FIX-A03 | 新断言证明"不等于未过滤 dice 条目总数"（回归哨兵） | PASS | 三段式断言 #3（`< allDiceEntries.length`，即 < REQUESTED+ROLLED+PUBLISHED 总数） |
| FIX-A04 | 未修改 `publicState.ts` 实现，未修改既有测试断言 | PASS | FIX-01 交付 diff 仅 `publicState.test.ts`（追加）+ `DECISIONS.md`/`REPORT.md`/`INDEX.md` |
| FIX-A05 | `git log` 新增恰 1 条提交，首行 `DEV-050-FIX-01: prove publishedDice excludes HIDDEN dice-rolled records` | PASS | 见 §Commit 核验 |

### FIX-01 Changed Files（恰 1 条提交，仅 Writable Scope）

```text
packages/runtime-kernel/src/publicState.test.ts   （追加三段式断言，既有断言零改动）
specs/dev/DEV-050/DECISIONS.md                    （追加 D7）
specs/dev/DEV-050/REPORT.md                       （本 FIX-01 轮次 + A14 改 PASS）
```

### FIX-01 Commit

提交信息首行：`DEV-050-FIX-01: prove publishedDice excludes HIDDEN
dice-rolled records`。恰 1 条新提交；`git add` 逐一列名，未用
`git add -A`。LEDGER 追加行与 NODE_REPORT 消息文件已写入工作区但
**未提交**（Constraint 8 / A23 同款）。
