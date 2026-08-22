# DEV-025 VERDICT

> 本文件由 `AUDITOR`（`project-auditor` 角色）产出内容，经 `COMMANDER` 逐字转录套入本模板
> （依据 `COMMS-PROTOCOL-V1.md` 附录 B2/B3）。字段映射：`BLOCKER`/`MAJOR` → `BLOCKING`，
> `MINOR` → `DEVIATION`，`INFO` → `OBSERVATION`。

## Audit Basis

- Task Package: `specs/tasks/TASK-PACKAGE-DEV-025.md`
- Acceptance 权威副本: `specs/dev/DEV-025/ACCEPTANCE.md` A01–A19
- `git_head` 审核锚点（`NODE_REPORT` 消息 `0119` 申报）：`770276f`
- 基线锚点：`da8539b`（DEV-024 冻结提交）

## Scope Audit

PASS

- `git diff da8539b..770276f -- packages/runtime-kernel/src/machine.ts` 恰两处 hunk：
  `onLock`（+3 行，`DICE_INTRO` 发送）与 `onResolve`（+10 行，`resolveGroups` 之后、
  `buildNarrativeInputs` 之前插入 `DICE_RESULT` 发送）。无其余 action 被触碰。
- `packages/runtime-kernel/src/index.ts`、`machine.test.ts`、`interactionRegion.*`——零 diff。
- `apps/renderer/src/App.tsx` diff 为纯追加——`git diff ... | grep '^-'` 只剩 diff 头部，
  零真实删除行。
- DEV-020～024 冻结的 renderer 文件（`ws/`、`server/`、`main.tsx`、`composeLayers.*`、
  `composeCharacters.*`、`pickDialogueLines.*`、`lineIndex.*`、`pickInteractionOpen.*`、
  各类 config、`App.test.tsx`）——零 diff。
- `packages/{chapter-schema,chapter-compiler,rule-engine,dice-engine,narrative-composer,
  persistence,shared}`——零 diff。根配置（`tsconfig*`、`vitest.config.ts`、
  `eslint.config.js`、根 `package.json`、`pnpm-lock.yaml`）——零 diff，无新增依赖。
- `specs/PROJECT_INDEX.md`/`specs/dev/DAG.md` 在 `da8539b..770276f` 范围内确有 diff，
  但 `git log` 核实这些改动完全归属 Commander 自己的提交（`4ff315a`/`d970760`），非
  OpenCode 的 `770276f` 提交所致（`git diff d970760..770276f` 未触碰这些文件）。OpenCode
  无越权。
- OpenCode 实际提交 `770276f` 恰改动 REPORT.md 声明的 10 个文件，与
  `git diff d970760..770276f --stat` 逐一对应。

## Requirement Verification

| Requirement | Status | Evidence |
|---|---|---|
| `onLock` 仅追加 `DICE_INTRO` 信号 | VERIFIED | `machine.ts:307-310` |
| `onResolve` 在 `resolveGroups` 之后、`buildNarrativeInputs` 之前追加裁剪后的 `DICE_RESULT` | VERIFIED | `machine.ts:323-340` |
| INTERACTION/STORY 其余 action 逐字节不变 | VERIFIED | 两处 hunk 之外零 diff |
| `index.ts` 未改动 | VERIFIED | 零 diff |
| 端到端：`DICE_INTRO` 在 `LOCK` 后、`DICE_RESULT` 在 `LOCKED` 后，五字段裁剪正确，`finalValue = rawValue + modifier` | VERIFIED | 独立用临时测试复现（用后即删） |
| `pickDiceState` 四/七分支正确性 | VERIFIED | 阅读源码与测试，逻辑与规格一致（`commandSeq` 由 `wrapPresentationPort` 保证单调唯一，无平局歧义） |
| `App.tsx` 纯追加 | VERIFIED | `grep '^-'` 为空 |
| LOOP 为纯本地视觉过渡，无人为延迟 | VERIFIED | `App.tsx` 内 grep `setTimeout`/`setInterval`/`sleep` 只命中既有、与本节点无关的倒计时代码；`rolling` 状态完全由 `dice.phase`/`dice.key` 经 `useEffect` 驱动，无延迟逻辑 |
| `DICE_RESULT` 排除 `seed`/`rollIndex`/`appliedModifiers` | VERIFIED（功能安全） | `machine.ts:333-339` 手写 5 键对象字面量；独立端到端测试确认 |
| **D2 安全论证**（"seed 从未以 PUBLIC 可见性存在过"；"这些字段本来就是 DICE.PUBLISHED 已公开信息"） | **PARTIAL / 事实有误** | 见下方 Findings/BLOCKING |

## Acceptance Verification

| Acceptance Item | Result | Evidence |
|---|---|---|
| A01 `pnpm install` | PASS | lockfile 无 diff，隐含依赖已解析 |
| A02 `pnpm typecheck` | PASS | 独立重跑，exit 0 |
| A03 `pnpm lint` | PASS | 独立重跑，exit 0 |
| A04 `pnpm format:check` | PASS | 独立重跑，exit 0 |
| A05 `pnpm build` | PASS | 独立重跑，exit 0 |
| A06 `pnpm test` | PASS | 独立重跑：94 files / 494 tests 全部通过 |
| A07 `machine.ts` diff 范围 | PASS | 上述核实 |
| A08 端到端 `DICE_INTRO`/`DICE_RESULT` 正确性 | PASS（功能层面）——但其记录的论证有误，见 BLOCKING | 独立复现 |
| A09 `machine.test.ts`/`interactionRegion.*` 未改动，测试全过 | PASS | 零 diff + `pnpm test` 全绿 |
| A10 `pickDiceState` 四/七种组合 | PASS | 代码 + 测试核实 |
| A11 `App.tsx` 纯追加 | PASS | `grep '^-'` 为空 |
| A12 `apps/renderer` DEV-020～024 冻结文件未改动 | PASS | 含 `App.test.tsx` 在内零 diff |
| A13 `packages/**` 除 `machine.ts` 外未改动 | PASS | 核实 |
| A14 无新增依赖 | PASS | package.json/lockfile 零 diff |
| A15 `DECISIONS.md` 覆盖必需要点 | PASS（内容有误）——D1/D2/D3/D4/D5/D6 均存在，但 D2 内容事实有误，见 BLOCKING | 阅读全文 |
| A16 节点文档齐全，Status=READY_FOR_REVIEW，T001–T005 全部勾选 | PASS | 核实 |
| A17 恰 1 条新提交，信息 `DEV-025: dice ui` | PASS | `git log`/`git show --stat` 核实 |
| A18 LEDGER 含 NODE_REPORT-DEV-025，git_head 一致 | PASS | LEDGER 0119 行 `git_head=770276f` 一致 |
| A19 PROJECT_INDEX/DAG/tasks/audit/protocol 未被 OpenCode 自己的提交改动 | PASS | `git diff d970760..770276f` 排除这些路径 |

## Verification Commands

审核员独立重跑：

| Command | Result | Notes |
|---|---|---|
| `pnpm typecheck` | 0 | 独立重跑 |
| `pnpm lint` | 0 | 独立重跑 |
| `pnpm format:check` | 0 | 独立重跑 |
| `pnpm build` | 0 | 独立重跑 |
| `pnpm test` | 0 | 94 files / 494 tests |
| 自建临时端到端测试（`packages/runtime-kernel/src/auditE2E.tmp.test.ts`，用后即删） | 断言通过，但据此发现下方 BLOCKING finding | 验证 `DICE_INTRO`/`DICE_RESULT` 顺序、字段裁剪正确性，并核实了 `DICE.PUBLISHED` 事件 payload 的真实内容 |

## Architecture Audit

FAIL（文档准确性缺陷，与 G06 相关；未发现功能性违规）

- `apps/renderer` 使用的 Presentation 信道（`ports.presentation.send` → `wrapPresentationPort` → WS）从不携带原始 `eventLog`；`apps/renderer/src` 内无任何 `getEventLog` 引用。新增的 `DICE_RESULT` 命令是 `machine.ts:333-339` 手写的 5 键对象字面量，**已交付代码不会把 `seed`/`rollIndex`/`appliedModifiers` 泄漏给 Renderer/观众**——已交付的实现不违反 G06。
- 但记录在案的安全论证（Task Package §2.2 原文，被逐字带入 `REQUIREMENTS.md` 与
  `DECISIONS.md` D2）在两点上**与实际冻结代码矛盾**（独立核实）：
  1. `machine.ts:349-352`（本节点未改动的既有代码）用**同一个 `record` 对象引用**
     （`DiceRollResult`，来自 `dice-engine`，含 `seed`/`rollIndex`/`appliedModifiers`/
     `quality`）分别发出 `{type:'DICE.ROLLED', visibility:'HIDDEN'}` 与
     `{type:'DICE.PUBLISHED', visibility:'PUBLIC'}` 两个事件；`emitLog`/事件存储对
     `payload` 不做任何字段裁剪（原样透传后 `JSON.stringify`）。独立临时测试证实
     `DICE.PUBLISHED` 落盘的 `payload` 确实含 `seed` 属性、同时标记
     `visibility: 'PUBLIC'`。这直接推翻 D2"`seed`……从未以 PUBLIC 可见性存在过"的
     断言。
  2. `DicePublishedEventSchema` 声明的 payload 类型（`diceEvent.ts` 的
     `DiceRollRecordPayloadSchema`）根本**未声明 `quality` 字段**，因此"`quality`……
     本来就是 `DICE.PUBLISHED` 已经承认公开的信息"这一说法在类型契约层面也不成立——
     它只是碰巧作为同一 JS 对象上的未声明附加属性搭车存在，从未被声明/审计为
     PUBLIC-安全字段。
- **归因**：这段有误的论证逐字源自已冻结的 `specs/tasks/TASK-PACKAGE-DEV-025.md` §2.2
  （Commander 撰写），`REQUIREMENTS.md`/`DECISIONS.md` 按惯例沿用同一论证。OpenCode 对
  Task Package 无权改动，且**独立于这一有误前提**，实际实现了真正安全的行为（显式
  五字段白名单，而非信任整个事件的"PUBLIC 可见性"）。这是本节点自身文档继承的规范/
  文档质量缺陷，不是 OpenCode 的施工缺陷。
- 不纠正的风险：未来节点（如 DEV-037，其 D5 明确表示不会改动本节点已下发的载荷形状）
  或未来工程师可能援引"`DICE.PUBLISHED` 已代表字段 X 可安全转发"这一错误模式，去为某处
  真正不安全的更宽泛转发（例如整体展开 `record`）背书。鉴于 G06 是明文红线，本节点关闭前
  应予纠正。

## Regression Audit

PASS

- `machine.test.ts`、`interactionRegion.*` 逐字节不变，全部通过。
- `pnpm test` 全绿：94/94 文件、494/494 测试（DEV-024 基线 93 files/487 tests；+1 文件/
  +7 条，恰好对应新增 `pickDiceState.test.ts`）。
- 无冻结导出/类型/事件载荷形状被改动（`index.ts` 未动）。

## Overengineering Audit

PASS

- 无投机性抽象；`pickDiceState` 沿用既有 `pickDialogueLines`/`pickInteractionOpen` 模式。
- 未添加任何真实掷骰/节奏控制逻辑（正确延后至 DEV-037，独立核实无 `setTimeout`/延迟代码）。
- 无新依赖，未见未使用代码。

## Undeclared Changes

NONE

## Findings

| ID | 等级 | 内容 | 依据 |
|---|---|---|---|
| BLOCKING-01 | BLOCKING（映射自 MAJOR） | `DECISIONS.md` D2 与 `REQUIREMENTS.md` §2.2 中对 `DICE_RESULT` 字段裁剪的安全论证在 G06 相关的两点断言上**事实有误**：(a) 声称五个下发字段"本来就是 `DICE.PUBLISHED`（`visibility:'PUBLIC'`）已经承认对观众公开的信息"；(b) 声称"`seed`……从未以 PUBLIC 可见性存在过"。两者均被冻结代码推翻：`machine.ts:349-352` 用与 `HIDDEN` 的 `DICE.ROLLED` 完全相同的 `record` 对象发出 `visibility:'PUBLIC'` 的 `DICE.PUBLISHED`，该 `record` 确实含 `seed`/`rollIndex`/`appliedModifiers`；且 `quality` 在 `DiceRollRecordPayloadSchema` 中根本未被声明。已交付源码本身安全（`onResolve` 显式手写 5 键白名单，`apps/renderer` 从不读取 `getEventLog`），**没有实际数据泄露**——本 finding 针对的是本节点自身冻结文档中记录的安全论证的准确性（该文档是未来节点如 DEV-037 的权威参考），不是功能性违规。归因：该有误论证逐字源自 Commander 撰写的已冻结 Task Package §2.2，OpenCode 无权改动、按惯例沿用，其自身代码实现独立于该有误前提、依然安全 | `machine.ts:349-352` vs `DECISIONS.md` D2 / `REQUIREMENTS.md` §2.2 |

### OBSERVATION

| ID | 等级 | 内容 | 依据 |
|---|---|---|---|
| OBSERVATION-01 | OBSERVATION | 既有（本节点未改动、Read-only/Frozen Scope 内）的事件发出代码（`machine.ts:349-352`）把 `DICE.PUBLISHED` 标记为 `visibility:'PUBLIC'`，但其 payload 字面上就是 `HIDDEN` 的 `DICE.ROLLED` 所用的同一份未裁剪 `DiceRollResult` record（含 `seed`/`appliedModifiers`）。这是一处既有架构不一致，值得 Commander 在未来节点/CR（如 DEV-037）中关注；非 DEV-025 缺陷（Read-only Scope 内，且当前任何 Presentation/WS 信道都不可达该原始 payload） | `machine.ts:349-352`（DEV-009 起冻结，本节点 Read-only） |

## Verdict

**FAIL**（存在 1 项 BLOCKING → FAIL，按判定规则"任一 BLOCKING → FAIL"）

## Required Remediation（转录自 project-auditor 原文）

纯文档修复，落在 DEV-025 自身 Writable Scope 内（无需改动任何代码——已交付行为本身安全）：

1. 更正 `specs/dev/DEV-025/REQUIREMENTS.md` §2.2 与 `specs/dev/DEV-025/DECISIONS.md` D2，
   删除/替换其中关于五个下发字段（尤其是 `seed` 的排除与 `quality` 的纳入）"因
   `DICE.PUBLISHED` 已经是 PUBLIC 状态而正当"的错误论证。替换为准确论证：`DICE_RESULT`
   载荷的安全性来自 `onResolve` 显式手写、只含五个具名字段的对象字面量（已核实：无
   展开、无泄漏），与冻结的 `DICE.PUBLISHED`/`DICE.ROLLED` 事件内部实际携带什么字段无关
   （经核实，后者确实在 `PUBLIC` 标记下携带 `seed`，但从未被转发给 `apps/renderer`）。
2. （可选，Commander 层面，超出 OpenCode 范围）：将上述既有 `DICE.PUBLISHED`/`seed`
   不一致（OBSERVATION-01）标记为未来 CR/DEV-037 的考虑项，无需为关闭 DEV-025 而修复。

## Scope Discipline Check

- 是否实现了 Non-goals 中明确禁止的内容：否（未实现真实节奏控制/等待逻辑）
- 是否提前实现了后续节点的内容：否（DEV-026/027 均未被实现或触碰）
- 是否引入了禁止清单中的技术：否
- 是否修改了权限矩阵中不属于自己的文件：否
- 是否顺手重构了未要求改动的代码：否

## Auditor Statement

我只针对当前授权 DEV-025 节点及其冻结 Task Package、Requirements 和 Acceptance 进行了
独立审计。我独立运行了 `pnpm typecheck`/`lint`/`format:check`/`build`/`test`（全部退出码
0，94 files/494 tests），并编写了一个临时端到端测试文件验证 `DICE_INTRO`/`DICE_RESULT`
顺序、字段裁剪正确性及 `DICE.PUBLISHED` 事件 payload 实际内容，运行后已删除，未提交到
仓库（`git status --porcelain` 核实与审计前一致）。我没有修改任何项目业务代码，也没有
推进任何后续 DEV 节点。

---

审核方式：直调 `project-auditor` subagent。原始输出（AUDIT_FAIL，Blocker 0 / Major 1 /
Minor 0 / Info 1）由 Commander 逐字转录、按附录 B2 字段映射表映射为上表，未改写、未删减、
未解读其结论。
