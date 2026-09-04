# DEV-050 DECISIONS

本文件记录 DEV-050（Public State Gateway，M5 第一个节点）实现中的工程
决策。Task Package 第 6 节要求至少覆盖：`PublicRuntimeState` 逐字段
取舍表、`isFactSafeToDisclose` 作为 PASS 6 运行时对偶断言的
default-reject 设计、为何用 `unwrapSnapshot` 包内直接读取而不新增对外
导出。另按 T002 实测记录两个真实缺陷的发现与修复（D4/D5）。

## D1 — PublicRuntimeState 逐字段取舍（实现 vs 省略）

Dev Spec 第 38 节（第 1552–1588 行）给出的 `PublicRuntimeState` 形状
标注为"Public State **例如**"（illustrative），不是冻结契约。本节点
逐字段核对全仓库现有冻结 Schema（`HostPublicSpec`/`SceneDisclosure`/
`WorldState`/`DiceRollRecordPayload`/DEV-009 具名访问器）后，决定哪些
字段可以诚实投影、哪些必须省略并记录理由：

| 字段 | 处置 | 理由 |
|---|---|---|
| `currentLocation` | **实现** | `HostPublicSpec.sceneDisclosures[sceneId].locationLabel`（DEV-002A 冻结）直接可取；场景无 disclosure 条目 → 空字符串 |
| `knownFacts` | **实现**（经运行时对偶断言过滤） | `sceneDisclosures[sceneId].knownFactIds`，逐条用 `knownFactDependencies` 经 `isFactSafeToDisclose` 复核（见 D2） |
| `currentChoices` | **实现**（简化为 `{id}[]`） | 复用 `getCurrentChoiceIds(actor)`（DEV-009 已导出）；Dev Spec 未定义 `PublicChoice` 字段，不发明选项文案等未冻结数据；**仅当 `interactionPhase === 'OPEN'` 时取值**（见 D4） |
| `publishedDice` | **实现** | 从 `getEventLog(actor)` 过滤 `type==='DICE.PUBLISHED'`（已标 `visibility:'PUBLIC'`），只取 `diceType`/`finalValue`/`quality` 三个"叙事需要"字段，不带 `rawValue`/`modifier`（机制内部细节）；**仅当互动已越过 OPEN/CLOSED 时取值**（见 D4） |
| `currentTension` | **实现** | `HostPublicSpec.tensionLabels[world.danger.tensionKey]`（`WorldState.danger` 冻结形状）；键不存在 → 空字符串 |
| `phase` | **改为两个原始字段** `storyPhase`/`interactionPhase` | Dev Spec 未定义 `PublicPhase` 的取值集合/映射规则；直接复用 DEV-009 已公开授权的 `getStoryPhase`/`getInteractionPhase` 字符串，不发明未经规范定义的枚举 |
| `chapterTitle` | **省略** | 全仓库 `ChapterPack`/`WorldState` 冻结 Schema 均无标题字段（只有不透明 `chapterId`），无数据来源 |
| `currentChoiceCounts` | **省略** | 投票计数是运行时活动内部状态（`interactionRegion.ts` 的 `votes: Record<string,string>`），从未通过任何具名访问器导出；暴露它是新增能力而非"投影已有数据"，超出"退化为投影函数"的范围 |
| `visiblePlayerCondition` | **省略** | `WorldState` 冻结 Schema 无独立于 `npc`/`flags` 的"玩家状态"实体，发明这个字段的取值规则没有依据 |

省略字段的完整理由链见 Task Package 第 1 节范围核对表与第 10 节
Non-goals，与本表一致。

## D2 — isFactSafeToDisclose：PASS 6 编译期判定的运行时对偶（default-reject）

第 24 节"PASS 6 的运行时对偶"：编译期 `checkDisclosureSafety`
（`pass6Disclosure.ts`，DEV-002A 冻结）对**每个可达场景**的
`knownFactIds` 做"依赖必须标 PUBLIC 且被祖先场景确立"的静态判定。
本节点的运行时对偶版本改为对**当前实际 `WorldState`** 做同一判定，
作为 G06 第三道防线的自我核验——即使编译期判定因未知原因失手，
运行时仍默认拒绝不安全的事实。

三条 default-reject 规则（与 `pass6Disclosure.ts` 的判定逐条对齐）：

1. `dependencies === undefined`（事实未在 `knownFactDependencies` 声明
   依赖）→ 不安全，剔除。对应编译期 `FACT_DEPENDENCY_NOT_DECLARED`。
2. 任一依赖 key 的 `flagVisibility[key] !== 'PUBLIC'`（未标 PUBLIC，
   含显式 HIDDEN 与完全无条目两种情况）→ 不安全，剔除。
3. 任一依赖 key 经 `resolveWorldStateKey(world, key)` 解析为
   `undefined`（在当前世界状态未确立值）→ 不安全，剔除。

**fail-closed，不抛异常**：任何一条不满足即静默从 `knownFacts` 剔除，
与 DEV-050A"静默丢弃"哲学一致。空依赖数组 → 真空安全（`true`）。
`resolveWorldStateKey` 判定用 `=== undefined`（存在性检查）而非真值
检查——`false`/`0`/`''` 都是**已确立的值**，事实应公开（测试 #11 的
`npc.guide.flags.suspicious: false` 显式覆盖此点）。

## D3 — 为何包内直接 import `unwrapSnapshot`，而不新增对外导出

`getPublicState` 需要读 `InternalSnapshot` 的真实结构（`world`/
`interactionPhase`），而 `RuntimeSnapshot` 是不透明品牌类型
（`{readonly __brand:'RuntimeSnapshot'}`），外部无法字段访问。两条路：

- **新增导出 `unwrapSnapshot`/`InternalSnapshot`**：把真实结构暴露到
  包外，破坏 DEV-009 冻结的"只经具名访问器读取"的不透明性保证
  （`snapshot.ts` 头注释 + DECISIONS D3 明令禁止，Task Package §3
  Forbidden 亦列明"导出 unwrapSnapshot 或任何暴露 InternalSnapshot
  真实结构的符号到 index.ts"）。
- **包内直接 import**：`publicState.ts` 与 `snapshot.ts` 同属
  `runtime-kernel` 包内，`unwrapSnapshot` 本来就不从 `index.ts` 再
  导出，但**包内其他模块一直能直接 import 使用**（`machine.ts` 等
  既有模块即如此）。本文件 `import { unwrapSnapshot } from
  './snapshot.js'` 属包内正常引用，零新增公开面。

故选后者：不改变类型系统的既有保证，`index.ts` 只追加
`getPublicState`/`isFactSafeToDisclose` 与三个 Public 类型的导出。
A18（`index.ts` 未导出 `unwrapSnapshot`/任何暴露 `InternalSnapshot`
的符号）由本次 `index.ts` 追加内容直接满足。

## D4 — 实测缺陷（一）：getCurrentChoiceIds 是 scene-driven 而非 phase-gated

**现象**：T002 第 5 条测试要求"互动开启前 `currentChoices` 为
undefined、`INTERACTION.OPEN` 后为 `[{id:'A'}]`"。初版 `getPublicState`
无条件调用 `getCurrentChoiceIds(actor)`，测试在 BOOT 后（STORY_PLAYING，
互动尚未开启）即断言失败：`expected [ { id: 'A' } ] to be undefined`。

**根因**：`getCurrentChoiceIds`（`machine.ts`，DEV-009 冻结）的判定是
**场景驱动**而非相位门控——只要当前场景声明了 `interactionId`，它就
返回该互动声明的选项 id，**完全不看互动机器是否真的 OPEN**。探针实验
（真实 fixture 驱动 + `instantClock`）证实：BOOT 后故事还在
STORY_PLAYING，`getCurrentChoiceIds` 已返回 `['A']`（因为 scene-start
声明了 `interactionId: interaction-01`）。照此实现，`currentChoices`
会在故事纯播放阶段提前泄漏"下一个待开互动的选项"，违反 Task Package
A13（"互动 OPEN 时正确返回，非互动时为 undefined"）。

**修复**：读快照里诚实的 `internal.interactionPhase`，仅当
`interactionPhase === 'OPEN'` 时才调 `getCurrentChoiceIds`，否则取 `[]`
（→ 字段省略为 `undefined`）。`interactionPhase` 是 `InternalSnapshot`
既有字段，经包内 `unwrapSnapshot` 读取，零新增公开面（D3）。修复后
测试 5 真实通过。

## D5 — 实测缺陷（二）：resolveWorldStateKey 初始漏了 'danger' 容器

**现象**：T002 对 `isFactSafeToDisclose` 的 key 格式覆盖测试初稿只有
`flags.*`/`chapterVariables.*`/`npc.*` 五种，跨查
`packages/chapter-compiler/src/pass5ReachableState.ts` 的键构造
（`add('danger.level', ...)` / `add('danger.tensionKey', ...)`，
约第 101–102 行）与真实测试 fixture 的 `host.public.json`
（`"danger.level": "HIDDEN"`、`"danger.tensionKey": "HIDDEN"`）时发现：
`pass5ReachableState` 会为 `WorldState.danger` 构造
`danger.level`/`danger.tensionKey` 两种 `container.field` 键，而初版
`resolveWorldStateKey` **没有 `danger` 容器分支**——任何以
`danger.` 开头的依赖 key 都会落回 `return undefined`，导致依赖
`danger.tensionKey` 的事实（如本节点测试里的 `danger-is-calm`）被
default-reject 误杀，即便它在 `flagVisibility` 里标了 PUBLIC 且
`world.danger.tensionKey` 明明有值。

**根因**：`resolveWorldStateKey` 的容器清单是从"事实可能依赖什么"反推
的，初版只枚举了 `flags`/`chapterVariables`/`npc` 三类，漏了
`WorldState.danger`（`DangerState{level:number, tensionKey:string}`，
DEV-002A 冻结）——而编译期 `pass5ReachableState.ts` 的键构造是
"值 → 键"方向、覆盖全 `WorldState`，两方向不对称，正是这类遗漏的
温床。

**修复**：补 `container === 'danger'` 分支——`rest[0] === 'level'` →
`world.danger.level`；`rest[0] === 'tensionKey'` →
`world.danger.tensionKey`；其余 → `undefined`。与既有
flags/chapterVariables/npc 分支并列，不改变任何其他逻辑。修复后
`danger.level`/`danger.tensionKey` 两个 key 格式测试真实通过。

## D6 — 为何 publishedDice 对相位做防御性门控

初版 `getPublicState` 对 `publishedDice` 无条件过滤事件日志。实测
探针（真实 fixture，LOCK 前）显示互动未解决时日志里**本就没有**
`DICE.PUBLISHED` 条目（骰子只在 LOCK→RESOLVED 时发布），因此测试 6
"LOCK 前为 undefined"在无门控下也能通过；但为与 A14（"非互动时为
undefined"）的语义严格对齐、并防御未来接入方在日志中注入早期骰子
条目的情况，`publishedDice` 取值门控为 `interactionPhase` 已越过
`OPEN`/`CLOSED`（即 RESOLVED/LOCKED 等解决后相位）才过滤日志，否则取
`[]`。与 D4 的 `currentChoices` 门控同源同风格，二者共用
`internal.interactionPhase` 单一事实源。

## D7 — FIX-01：publishedDice 测试只验证形状，从未证明 HIDDEN 记录被排除（F-01 MAJOR）

**审计发现（AUDIT_VERDICT 0207，F-01 MAJOR）**：初版
`publicState.test.ts` 里"锁定后 `publishedDice` 反映骰子结果"的测试
只断言结果数组非空（`length > 0`）且逐项字段形状正确
（`diceType` string/`finalValue` number/`quality` string|undefined），
**从未证明 `HIDDEN` 的 `DICE.ROLLED` 记录被正确排除在结果之外**。这
不是空泛的覆盖焦虑：`DICE.ROLLED` 与 `DICE.PUBLISHED` 共享**完全
相同**的 payload 形状（`DiceRollRecordPayload`，
`machine.ts` 第 401–405 行），仅 `type`/`visibility` 不同——若实现
退化成"不过滤，把所有 dice 条目都塞进 `publishedDice`"，初版测试
（非空 + 形状）**照样全部通过**，测试无法区分正确实现与错误实现。

**修复（三段式断言，全部追加在既有测试尾部，零删除零改动）**：
1. **HIDDEN 记录确实存在**：独立调用 `getEventLog(actor)` 过滤
   `type === 'DICE.ROLLED'`，断言 `length > 0` 且每条
   `visibility === 'HIDDEN'`——证明测试场景**真的产生了**需被排除的
   Hidden 记录，排除行为不是"根本没有可排除的东西"的假阳性。
2. **数量一一对应**：再过滤 `type === 'DICE.PUBLISHED'`，断言
   `state.publishedDice!.length === rolledEntries.length ===
   publishedEntries.length`——三数相等，证明没有多算（把 ROLLED
   混进来）或漏算（把 PUBLISHED 丢掉）。
3. **回归哨兵**：断言 `state.publishedDice!.length` **小于**事件日志
   里全部 dice 相关条目（`DICE.REQUESTED`+`DICE.ROLLED`+
   `DICE.PUBLISHED`）的总数——若未来有人误删/改坏过滤条件（回到
   "不过滤全塞"），此断言必失败。

**为何不改实现**：审计确认 `publicState.ts` 的过滤实现本身正确
（`type === 'DICE.PUBLISHED' && visibility === 'PUBLIC'`，`DICE.ROLLED`
为 HIDDEN 天然被排除），缺口在**测试未锁定该行为**。本轮只补测试，
实现代码零改动。
