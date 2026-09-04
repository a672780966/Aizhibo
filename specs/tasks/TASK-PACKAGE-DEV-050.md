# TASK PACKAGE — DEV-050

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-050 |
| Node Name | Public State Gateway |
| Milestone | M5 — AI Host Complete（第一个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-009（DONE，`verdict_ref: "0080"`）——`RuntimeSnapshot` 不透明品牌类型 + 具名访问器骨架；DEV-002A（DONE，`verdict_ref: "0046"`）——`HostPublicSpec`/`SceneDisclosure` 冻结形状 |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### 现实核对：`packages/runtime-kernel` 自 M1 起首次被授权修改——DEV-009 DECISIONS D3 明确把 `getPublicState()` 列为"留给 DEV-050 的职责"

`packages/runtime-kernel/src/snapshot.ts`（DEV-009 冻结，`verdict_ref:
"0080"`）已经把 `RuntimeSnapshot` 设计为不透明品牌类型
（`{readonly __brand:'RuntimeSnapshot'}`），真实结构 `InternalSnapshot`
与 `unwrapSnapshot` 均不从 `index.ts` 导出，只导出具名访问器
（`getStoryPhase`/`getInteractionPhase`/`getSequenceNumber`）。DEV-009
DECISIONS.md D3 原文："这不是最终的 Public/Hidden 投影——`getPublicState()`
读投影是 DEV-050（M5）的职责"——即 DEV-009 从设计之初就把这个新增
具名访问器的口子留给了本节点，本节点在 `runtime-kernel` 内部新增
`getPublicState()`（连同必要的类型）属于**计划内的、唯一授权的一次
修改**，不是打破冻结惯例。`specs/audit/SPEC-AUDIT-001.md` 第 203 行、
`DAG.md` 第 117/279 行三处独立确认："DEV-050 退化为只实现投影函数
`getPublicState()`，以及第 24 节 PASS 6 的运行时对偶断言"——范围被
反复强调为"退化"（最小化），不是一个通用的"State Gateway 服务"。

### 范围核对：Dev Spec 第 38 节 `PublicRuntimeState` 是"例如"（illustrative），本节点逐字段核对现有 Schema 后决定哪些字段可以诚实实现、哪些必须省略并记录理由

Dev Spec 第 1552-1588 行（第 38 节）给出的 `PublicRuntimeState` 形状
标注"Public State **例如**"，逐字段核对全仓库现有冻结 Schema 后的
结论：

| 字段 | 处置 | 理由 |
|---|---|---|
| `currentLocation` | **实现** | `HostPublicSpec.sceneDisclosures[sceneId].locationLabel`（DEV-002A 冻结）直接可取 |
| `knownFacts` | **实现**（+运行时对偶断言过滤） | `sceneDisclosures[sceneId].knownFactIds`，逐条用 `knownFactDependencies` 复核 |
| `currentChoices` | **实现**（简化为 `{id}[]`） | 复用 `getCurrentChoiceIds(actor)`（DEV-009 已导出）；Dev Spec 未定义 `PublicChoice` 字段，不发明选项文案等未冻结数据 |
| `publishedDice` | **实现** | 从 `getEventLog(actor)`（DEV-009 已导出）过滤 `type==='DICE.PUBLISHED'`（已标 `visibility:'PUBLIC'`），只取 `diceType`/`finalValue`/`quality` 三个"叙事需要"字段，不带 `rawValue`/`modifier`（机制内部细节） |
| `currentTension` | **实现** | `HostPublicSpec.tensionLabels[world.danger.tensionKey]`（`WorldState.danger` 冻结形状） |
| `phase` | **改为两个原始字段** `storyPhase`/`interactionPhase` | Dev Spec 未定义 `PublicPhase` 的取值集合/映射规则；直接复用 DEV-009 已经公开授权的 `getStoryPhase`/`getInteractionPhase` 字符串，不发明未经规范定义的枚举 |
| `chapterTitle` | **省略** | 全仓库 `ChapterPack`/`WorldState` 冻结 Schema 均无标题字段（只有不透明 `chapterId`），无数据来源 |
| `currentChoiceCounts` | **省略** | 投票计数是运行时活动内部状态（`interactionRegion.ts` 的 `votes: Record<string,string>`），从未通过任何具名访问器导出；暴露它是新增能力而非"投影已有数据"，超出"退化为投影函数"的范围 |
| `visiblePlayerCondition` | **省略** | `WorldState` 冻结 Schema 无独立于 `npc`/`flags` 的"玩家状态"实体，发明这个字段的取值规则没有依据 |

第 24 节"PASS 6 的运行时对偶"：编译期 `checkDisclosureSafety`
（`pass6Disclosure.ts`，DEV-002A 冻结）对每个可达场景的
`knownFactIds` 做"依赖必须标 PUBLIC 且被祖先场景确立"的静态判定；
本节点的运行时对偶版本改为对**当前实际 `WorldState`**做同一判定
（依赖必须标 PUBLIC 且在当前世界状态里已有确定值），作为 G06 第三道
防线的自我核验——即使编译期判定因未知原因失手，运行时仍默认拒绝
不安全的事实（fail-closed，不抛异常，静默从 `knownFacts` 里剔除，
与 DEV-050A"静默丢弃"哲学一致）。

---

## 2. 架构设计

### 2.1 `packages/runtime-kernel/src/publicState.ts`（新文件）

```typescript
import type { HostPublicSpec } from '@interactive-story/chapter-schema';
import type { RuntimeActor } from './machine.js';

export interface PublicChoice {
  id: string;
}

export interface PublicDiceResult {
  diceType: string;
  finalValue: number;
  quality: string | undefined;
}

export interface PublicRuntimeState {
  currentLocation: string;
  knownFacts: string[];
  currentChoices?: PublicChoice[];
  publishedDice?: PublicDiceResult[];
  currentTension: string;
  storyPhase: string;
  interactionPhase: string;
}

/**
 * PASS 6（编译期 checkDisclosureSafety）的运行时对偶：给定一个事实的
 * 已声明依赖 keys（"container.field" 格式，与 pass5ReachableState 键
 * 格式一致）、flagVisibility 白名单与当前 WorldState，判定该事实此刻
 * 是否真的安全可公开。default-reject：任何依赖未声明/未标 PUBLIC/
 * 当前未确立值，一律不安全。
 */
export function isFactSafeToDisclose(
  dependencies: string[] | undefined,
  flagVisibility: Record<string, 'PUBLIC' | 'HIDDEN'>,
  world: WorldState,
): boolean;

export function getPublicState(
  actor: RuntimeActor,
  hostPublicSpec: HostPublicSpec,
): PublicRuntimeState;
```

- `isFactSafeToDisclose`：`dependencies === undefined` → `false`
  （未声明依赖，默认拒绝，同 `pass6Disclosure.ts` 的
  `FACT_DEPENDENCY_NOT_DECLARED` 判定）；否则每个 `key`
  必须 `flagVisibility[key] === 'PUBLIC'` **且** 用一个内部
  （不导出）的 `resolveWorldStateKey(world, key)` 辅助函数解析出的值
  不是 `undefined`（键格式：`flags.<name>`／`chapterVariables.<name>`／
  `npc.<id>.present`／`npc.<id>.alive`／`npc.<id>.disposition`／
  `npc.<id>.flags.<name>`，与 `pass5ReachableState.ts` 的键构造逐字节
  一致，只是方向相反——由 key 解析回值而非由值枚举出 key）。
- `getPublicState(actor, hostPublicSpec)`：
  1. `const snapshot = getRuntimeSnapshot(actor)`（已导出）；解出
     `sceneId`/`world`/`storyPhase`/`interactionPhase`（通过既有具名
     访问器 + 一个内部 `unwrapSnapshot` 调用，本文件在包内部可以
     import `unwrapSnapshot`，因为它只是不从 `index.ts` 再导出，包内
     其他模块本来就能用）。
  2. `currentLocation = hostPublicSpec.sceneDisclosures[sceneId]?.locationLabel ?? ''`。
  3. `knownFacts`：取 `sceneDisclosures[sceneId]?.knownFactIds ?? []`，
     用 `isFactSafeToDisclose(disclosure.knownFactDependencies?.[factId],
     hostPublicSpec.flagVisibility, world)` 逐条过滤。
  4. `currentChoices`：`getCurrentChoiceIds(actor)`（已导出）映射为
     `{id}[]`；数组为空则整个字段设为 `undefined`。
  5. `publishedDice`：`getEventLog(actor)`（已导出）过滤
     `entry.type === 'DICE.PUBLISHED'`，把 `entry.payload` 断言为
     `DiceRollResult` 形状后取 `diceType`/`finalValue`/`quality` 三个
     字段；结果数组为空则整个字段设为 `undefined`。
  6. `currentTension = hostPublicSpec.tensionLabels[world.danger.tensionKey] ?? ''`。
  7. `storyPhase`/`interactionPhase` 直接来自
     `getStoryPhase(snapshot)`/`getInteractionPhase(snapshot)`（已导出）。
- **零新增 npm 依赖**；不改动任何既有导出函数的签名/行为；不改动
  `eventSubMachine`/`interactionRegion`/`machine.ts` 里任何既有逻辑，
  只新增一个文件 + `index.ts` 追加两行导出。

---

## 3. Scope

### Writable Scope

```
packages/runtime-kernel/src/publicState.ts        （新增）
packages/runtime-kernel/src/publicState.test.ts   （新增）
packages/runtime-kernel/src/index.ts              （仅追加导出，不改动既有行）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-050/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交，同 Constraint 8）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/runtime-kernel/src/{snapshot,machine,interactionRegion,event}.ts（DEV-008/009 冻结，只读取，不修改）
packages/chapter-schema/src/{hostPublic,worldState}.ts（DEV-001/002A 冻结）
packages/chapter-compiler/src/pass6Disclosure.ts（Read-only，仅供理解编译期判定逻辑，不 import）
packages/dice-engine/src/index.ts（Read-only，仅核对 DiceRollResult 字段名）
其余同既有节点惯例
```

### Forbidden Scope

```
修改 packages/runtime-kernel/** 内除 index.ts（仅追加）与新文件之外的任何现有文件
修改任何既有导出函数/类型的签名或行为（RuntimeSnapshot/getRuntimeSnapshot/getEventLog/
  getCurrentChoiceIds/getStoryPhase/getInteractionPhase/getSequenceNumber/wrapSnapshot 等）
导出 unwrapSnapshot 或任何暴露 InternalSnapshot 真实结构的符号到 index.ts
实现 currentChoiceCounts/visiblePlayerCondition/chapterTitle/PublicPhase 枚举
新增投票计数/玩家状态等运行时能力（超出投影现有数据的范围）
接入 DEV-050A/ai-host（尚未创建，属未来节点）
新增任何 npm 依赖
创建 packages/ai-host
```

---

## 4. Required Skills

### Required

- 在既有不透明品牌类型基础上新增一个纯投影函数（不改变类型系统的既有保证）
- 复用/理解冻结的 `HostPublicSpec`/`WorldState`/`DiceRollResult` 形状

### Forbidden / Unnecessary

- 任何新状态机/XState 改动
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/baseline/DEV_SPEC_V1.0.md` 第 1552-1588 行（第 38 节） | `PublicRuntimeState` 例示形状（逐字段核对后决定取舍） |
| `specs/dev/DEV-009/DECISIONS.md` D3 | `getPublicState()` 是本节点职责的官方记录 |
| `packages/chapter-compiler/src/pass6Disclosure.ts`（Read-only） | 编译期判定逻辑，本节点写运行时对偶版本 |
| `packages/chapter-compiler/src/pass5ReachableState.ts`（Read-only） | `container.field` 键格式权威参照 |
| `packages/runtime-kernel/src/{snapshot,machine}.ts`（Read-only，冻结） | 现有具名访问器签名 |

---

## 6. Outputs

1. `getPublicState`/`isFactSafeToDisclose`/`PublicRuntimeState`/
   `PublicChoice`/`PublicDiceResult`（`publicState.ts`），从 `index.ts`
   追加导出
2. `specs/dev/DEV-050/DECISIONS.md`，至少覆盖：`PublicRuntimeState`
   逐字段取舍表（同第 1 节范围核对表）、PASS 6 运行时对偶断言的
   default-reject 设计、为何用 `unwrapSnapshot` 包内直接读取而不新增
   对外导出

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-050/{INDEX,REQUIREMENTS,ACCEPTANCE,REPORT}.md`
- **Acceptance**：四份节点文档存在；`INDEX.md` 含 Task Order T001–T003。

---

### T002 — `publicState.ts` 核心实现 + 测试

- **Allowed Files**：`packages/runtime-kernel/src/publicState.ts`、`.test.ts`
- **Requirements**：按第 2.1 节实现。
- **Acceptance（功能部分）**：
  - `currentLocation`：给定某场景的 `sceneDisclosures`，返回其
    `locationLabel`；场景无 disclosure 条目 → 返回空字符串。
  - `knownFacts`：
    - 依赖全部标 `PUBLIC` 且在当前 `world` 中已确立值 → 该事实出现
      在结果里。
    - 依赖里有任一 key 标 `HIDDEN` → 该事实被剔除（不出现）。
    - 依赖里有任一 key 在当前 `world` 中未确立（如某 flag 从未被
      设置过）→ 该事实被剔除。
    - 事实未在 `knownFactDependencies` 里声明依赖 → 该事实被剔除
      （default-reject）。
    - 至少覆盖 `flags.<name>`、`npc.<id>.flags.<name>`、
      `npc.<id>.present`/`alive`/`disposition`、
      `chapterVariables.<name>` 五种 key 格式各一例。
  - `currentChoices`：驱动到 INTERACTION `OPEN`（有当前选项）时返回
    `[{id:'A'},...]`；不在互动中（`getCurrentChoiceIds` 返回空数组）
    时字段为 `undefined`。
  - `publishedDice`：事件日志里有 `DICE.PUBLISHED` 条目时返回映射后的
    `{diceType,finalValue,quality}[]`；没有则字段为 `undefined`；
    确认 `DICE.ROLLED`（HIDDEN）条目不会被误当成 `DICE.PUBLISHED`
    纳入结果。
  - `currentTension`：`tensionLabels[world.danger.tensionKey]` 存在
    → 返回对应文案；键不存在 → 返回空字符串。
  - `storyPhase`/`interactionPhase`：与直接调用
    `getStoryPhase`/`getInteractionPhase` 得到的值逐字节一致。
  - `isFactSafeToDisclose` 本身作为独立导出函数至少 5 个直接单元
    测试（覆盖上面 knownFacts 的 4 种拒绝场景 + 1 个通过场景）。
- **Requirements（回归部分）**：不修改本文件之外的任何既有测试/实现；
  `pnpm test` 全量跑通，`runtime-kernel` 既有全部测试零改动通过。

---

### T003 — `index.ts` 导出 + 全量验证、REPORT 与 commit

- **Allowed Files**：`packages/runtime-kernel/src/index.ts`、`specs/dev/DEV-050/{INDEX,REPORT,DECISIONS}.md`
- **Requirements**：
  1. `index.ts` 只**追加**两行导出（`getPublicState`/`isFactSafeToDisclose`
     函数 + `PublicRuntimeState`/`PublicChoice`/`PublicDiceResult`
     类型），既有任何一行不得改动顺序或内容。
  2. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  3. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  4. **`DECISIONS.md` 必须已提交**，覆盖第 6 节列出的全部要点。
  5. 更新 `INDEX.md`：T001–T003 全部勾选，`Status:` 改为 `READY_FOR_REVIEW`。
  6. `git add`（仅本节点 Writable Scope 内文件，不要用 `git add -A`）
     `&& git commit`，提交信息首行：`DEV-050: public state gateway (projection function)`。
     **恰 1 条提交**。
  7. **不要**再单独提交 LEDGER 追加行或自己的 NODE_REPORT 消息文件——
     写入工作区留给 Commander 收尾统一提交。
  8. 追加 LEDGER 行、写好
     `NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-050.md` 消息文件——都
     不要提交，只是写入工作区。
  9. **在结束前自行核实**：`git log -1` 只看到步骤 6 那一条提交、
     `git diff` 确认 `runtime-kernel` 内除 `index.ts`（仅追加两行）
     与新增的 `publicState.ts(.test.ts)` 外无其他文件改动、
     NODE_REPORT 消息文件与 LEDGER 追加行存在于工作区但未提交。
  10. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`git log` 新增恰 1 条提交；
    `git diff` 证明 `runtime-kernel` 既有文件（除 `index.ts` 追加行）
    零改动。

---

## 8. Node INDEX Requirements

```markdown
# DEV-050 INDEX

Status: IN_PROGRESS

## Current Node

DEV-050 — Public State Gateway

## Objective

在 `packages/runtime-kernel` 内新增 `getPublicState(actor,
hostPublicSpec): PublicRuntimeState`——DEV-009 DECISIONS D3 明确留给
本节点的唯一授权修改。投影 `currentLocation`/`knownFacts`（经 PASS 6
运行时对偶断言 `isFactSafeToDisclose` 过滤）/`currentChoices`/
`publishedDice`/`currentTension`/`storyPhase`/`interactionPhase`。
`chapterTitle`/`currentChoiceCounts`/`visiblePlayerCondition` 因无
数据来源或超出"投影已有数据"范围而省略（记录于 DECISIONS.md）。不
接入 DEV-050A/ai-host（未来节点）。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 publicState.ts 核心实现 + 测试
- [ ] T003 index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`git diff` 证明
`runtime-kernel` 既有文件（除 `index.ts` 追加行）零改动；
`DECISIONS.md` 已入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；
LEDGER 追加行与 NODE_REPORT 消息文件已写入工作区但**未提交**。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **`packages/runtime-kernel` 除 `index.ts`（仅追加两行）与本节点新增的
   `publicState.ts(.test.ts)` 外，其余任何现有文件逐字节不得改动**——
   这是自 M1 起首次授权的修改，零回归红线极高。
2. **不导出 `unwrapSnapshot` 或任何暴露 `InternalSnapshot` 真实结构的
   符号到 `index.ts`**——包内直接 import 使用即可，不再导出。
3. **`knownFacts` 采用 default-reject**：依赖未声明/未标 PUBLIC/当前
   未确立值，一律不安全，静默剔除，不抛异常。
4. **不实现 `currentChoiceCounts`/`visiblePlayerCondition`/`chapterTitle`
   /`PublicPhase` 枚举**（均已在第 1 节记录省略理由）。
5. **不新增任何第三方 npm 依赖**。
6. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
7. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发
   `EXECUTOR_QUERY`，等 `SCOPE_RULING`。
8. **T003 提交后，LEDGER 追加行与自己的 NODE_REPORT 消息文件一律不要
   再提交**——写入工作区即可，留给 Commander 收尾统一提交。

---

## 10. Non-goals / Out-of-scope

- 不实现 `currentChoiceCounts`（投票计数运行时暴露，未来节点职责）。
- 不实现 `visiblePlayerCondition`/`chapterTitle`（无数据来源）。
- 不发明 `PublicPhase` 枚举（直接复用现有 `storyPhase`/`interactionPhase`）。
- 不接入 `DEV-050A Egress Gate`/`ai-host`（尚未创建）。
- 不改动编译期 PASS 6（`pass6Disclosure.ts`）本身。

---

## 11. Tests

### Unit tests

T002：`getPublicState` 全部 7 个字段的取值路径 + `isFactSafeToDisclose`
的 4 种拒绝场景 + 1 种通过场景，覆盖 5 种 `container.field` key 格式。

### Regression tests

`pnpm test` 覆盖全 workspace；`runtime-kernel` 既有全部测试零改动
通过（本节点未修改任何既有测试文件）。

---

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `currentLocation` 正确取自 `sceneDisclosures[sceneId].locationLabel` | 测试检查 |
| A08 | `knownFacts` 依赖全 PUBLIC 且已确立 → 事实出现 | 测试检查 |
| A09 | `knownFacts` 依赖含 HIDDEN → 事实剔除 | 测试检查 |
| A10 | `knownFacts` 依赖未确立值 → 事实剔除 | 测试检查 |
| A11 | `knownFacts` 事实未声明依赖 → 剔除（default-reject） | 测试检查 |
| A12 | `isFactSafeToDisclose` 覆盖 5 种 key 格式（flags/npc.present/npc.alive/npc.disposition/npc.flags/chapterVariables） | 测试检查 |
| A13 | `currentChoices` 互动 OPEN 时正确返回，非互动时为 `undefined` | 测试检查 |
| A14 | `publishedDice` 正确过滤 `DICE.PUBLISHED`（不误取 `DICE.ROLLED`），无记录时为 `undefined` | 测试检查 |
| A15 | `currentTension` 正确取自 `tensionLabels[world.danger.tensionKey]` | 测试检查 |
| A16 | `storyPhase`/`interactionPhase` 与既有访问器输出逐字节一致 | 测试检查 |
| A17 | `runtime-kernel` 除 `index.ts`（仅追加两行）与新文件外零改动 | git diff 比对 |
| A18 | `index.ts` 未导出 `unwrapSnapshot`/任何暴露 `InternalSnapshot` 的符号 | 源码检查 |
| A19 | 未新增第三方 npm 依赖 | 文件检查 |
| A20 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A21 | `specs/dev/DEV-050/` 节点文档齐全，`INDEX.md` T001–T003 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A22 | `git log` 新增恰 1 条提交，首行 `DEV-050: public state gateway (projection function)` | 命令 |
| A23 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A24 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归（尤其
`runtime-kernel` 既有文件逐字节未改动）→ 填 REPORT → 仅 commit
代码+节点文档（一条提交）→ 写入但不提交 LEDGER/NODE_REPORT → 自行
核实完成三要素 → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A24。
