# TASK PACKAGE — DEV-070

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-070 |
| Node Name | Chapter Authoring Schema Prompt |
| Milestone | M7 — Content Factory Complete（第一个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | 新建 `packages/chapter-authoring-prompts`；零依赖（不 import 任何既有包，包括 `chapter-schema`——本节点只产出面向 AI 的自然语言 prompt 文本，不做程序化 schema 校验） |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### 现实核对：本节点的交付物类型与 M1–M6 全部节点不同——不是确定性类型/决策代码，而是一段指导 AI 模型写作的 prompt 文本

`specs/baseline/DEV_SPEC_V1.0.md` 第 2758-2761 行（DEV-070 原文）：

```
让 Sol/F5 按 Schema 写。
```

第 25 节（第 1175-1210 行）说明"Sol/F5"指 `GPT-5.6 Sol / Fable 5`
两个强模型，"只用于 Offline Authoring"，任务流程是：

```
World Bible → Chapter Outline → Scene Graph → Interaction Design
→ Rule Dictionary → Result Dictionary → Narrative Blocks → Boss
→ Ending → Review
```

第 26 节（第 1213-1237 行）进一步明确：AI 不直接生成最终 Chapter
Bundle，必须经过 `AI Draft → Schema Normalizer → Compiler →
Compiler Error → AI Repair → Compiler → PASS`（Compile–Repair
Loop，DEV-072 的职责）。**本节点（DEV-070）只产出上面流程第一步
"AI Draft"用的指导性 prompt 文本本身**，不调用任何真实 AI API
（那是 DEV-071 AI Chapter Generator 的职责），不做 Schema
Normalizer/Compiler（那是既有 DEV-002 Compiler 与未来 DEV-072
的职责）。

USER 2026-09-08 已就"这段 prompt 该写多详细"裁决：**完整、逐
模块覆盖**——`packages/chapter-schema`（DEV-001 冻结）下全部 19
个 schema 组件（`manifest`/`storyGraph`/`initialState`/
`worldRules`/`hostPublic`/`scenes`/`interactions`/`actions`/
`dice`/`results`/`state-rules`/`narrative.result`/
`narrative.block`/`npc`/`recovery`/`boss`/`endings`/`visuals`/
`audio`/`metadata`，见 `chapterPack.ts` 的 `ChapterPackSchemas`
聚合表）都要在 prompt 里给出字段级指导，不是只写第 25 节那条
十步流程的标题。

### 范围裁决：本节点不做程序化 schema 校验，只用"关键字覆盖"证明 prompt 真的谈到了每个模块

因为 prompt 的"正确性"最终由 AI 模型的写作质量决定，不是一个可以
用 TypeScript 类型系统机械验证的东西——这与 M1–M6 每个节点都不同。
本节点的测试只做**机械的关键字覆盖检查**（prompt 字符串里是否
出现某个模块的关键字段名/枚举值），不判断文字质量、不判断
"AI 读了这段话真的会写对"——那需要 DEV-071（真实调用 AI）+
DEV-072（真实跑 Compiler）才能端到端验证。

---

## 2. 架构设计

### 2.1 `packages/chapter-authoring-prompts/src/chapterAuthoringSchemaPrompt.ts`（新文件）

导出一个字符串常量 `CHAPTER_AUTHORING_SCHEMA_PROMPT`，内容为下方
**逐字给出**的 Markdown 格式 prompt 全文（英文——供 AI 模型使用，
同仓库内其余给 AI 的系统提示词惯例）。**必须逐字照抄，不得
改写/精简/意译**——这段文字本身就是本节点唯一的交付物，Commander
已经逐一核对 `packages/chapter-schema` 全部 19 个组件的真实 Zod
定义（`metadata.ts`/`worldState.ts`/`scene.ts`/`npc.ts`/
`interaction.ts`/`stateRules.ts`/`dice.ts`/`result.ts`/
`endings.ts`/`boss.ts`/`audio.ts`/`visuals.ts`/`hostPublic.ts`/
`recovery.ts`/`narrative.ts`/`action.ts`/`manifest.ts`/
`chapterPack.ts`）逐字段撰写，任何改写都可能引入与冻结 Schema
不一致的错误指导：

````markdown
# Chapter Authoring Instructions

You are authoring a single Chapter for an AI-driven interactive fiction livestream. Your output must strictly conform to the ChapterSchema defined in `packages/chapter-schema`. Produce your draft by working through the following eleven stages, in order. Do not skip a stage. Do not invent fields not listed below.

## Stage 1 — World Bible

Free-form worldbuilding notes for your own reference (setting, tone, factions, stakes). This stage is not part of the machine-checked schema; use it to keep the rest of your output internally consistent.

## Stage 2 — Chapter Outline

A short outline of the chapter's dramatic arc: opening state, escalation points, the boss/climax, and the possible endings. This stage is also not machine-checked; it is planning scaffolding for Stage 3 onward.

## Stage 3 — Manifest & World Rules

Produce `manifest` matching `ChapterManifestSchema`:
- `schemaVersion`, `chapterId`, `chapterVersion`, `title`, `entryNodeId`, `language` (all strings)
- `entryNodeId` must be the `id` of the first Scene node you will define in Stage 4
- `authoring`: `{ generatedBy?, auditedBy?, createdAt }` — `createdAt` is a required string

Produce `worldRules` matching `WorldRulesSchema`:
- `viewerDefaults`: `{ hp: 0|1|2|3, life: 0|1|2 }`
- `downedPolicy`: `'AUTO_SPEND_LIFE' | 'REQUIRE_RECOVERY'`
- `defaultScaleBands`: array of `{ scale: 'SOLO'|'SMALL'|'MEDIUM'|'LARGE'|'MASS', minParticipants, maxParticipants (nullable) }` — bands must be contiguous and cover every viewer count you intend to support
- `defaultDiceProfileId`: id of a DiceProfile you will define in Stage 6
- `interactionDefaults`: `{ openDurationMs, noParticipationPolicy }` — `noParticipationPolicy` is one of `DEFAULT_CHOICE` (`{ kind, choiceId: A|B|C|D }`), `SKIP` (`{ kind }`), or `HOLD` (`{ kind, extendMs, maxExtensions, thenFallback: DEFAULT_CHOICE|SKIP }`)
- `diceBuffer`: `{ minDiceMs, targetDiceMs, maxDiceMs }` — must satisfy `minDiceMs <= targetDiceMs <= maxDiceMs`

Produce `initialState` matching `WorldStateSchema`:
- `chapterId`, `sceneId` (must equal your `entryNodeId`)
- `flags`: free-form record of boolean/number/string
- `npc`: record of `NPCState` (`present`, `alive`, `disposition: HOSTILE|NEUTRAL|FRIENDLY`, `flags`) keyed by NPC id — every NPC id used here must have a matching NPC definition in Stage 4
- `danger`: `{ level: non-negative integer, tensionKey: string }`
- `discovered`, `activeThreats`: string arrays
- `chapterVariables`: free-form record

Produce `metadata` (optional but recommended) matching `ChapterMetadataSchema`: `synopsis?`, `tags?`, `contentWarnings?`, `estimatedDurationMinutes?`, `targetAudience?`, `authoringNotes?`. This is pure authoring context; the runtime ignores it entirely.

### Conditions

Conditions are used by scene guards, recovery triggers, ending `when`, narrative block `when`, dice modifiers, and state rules. A Condition is always one of:
- a leaf comparison: `{ path: { container: 'flags'|'npc'|'danger'|'discovered'|'activeThreats'|'chapterVariables', key, field? }, op: 'EQ'|'NEQ'|'GT'|'GTE'|'LT'|'LTE', value }`
- a leaf set membership: `{ path, op: 'IN', value: [...] }`
- a leaf existence check: `{ path, op: 'EXISTS' }`
- a combinator: `{ all: Condition[] }`, `{ any: Condition[] }`, or `{ not: Condition }`

Reuse this exact shape everywhere a Condition is required below.

## Stage 4 — Scene Graph

For every reachable narrative beat, produce one Scene node matching `SceneNodeSchema`:
- `id`, `visualSceneId` (id of a VisualScene you will define in Stage 10)
- `narration?`: array of narration line strings shown before/around the scene
- `characters`: array of `CharacterPlacement { characterId, slot: LEFT|CENTER_LEFT|CENTER|CENTER_RIGHT|RIGHT, expression?, visible }` — exactly these five fixed slots, no more
- `bgm?`, `ambience?`: optional audio asset ids (Stage 10)
- `interactionId?`: id of an InteractionNode (Stage 5) if this scene offers a choice
- `next?`: id of the next Scene node if this scene has no interaction and flows directly onward
- `guards?`: array of `SceneGuard { when: Condition, goto: nodeId, priority }` — evaluated before the default `next`/interaction flow, highest priority first
- `hostPolicy`: `ALLOWED|LIMITED|MUTED` — how much the AI Host may speak while this scene is active

Also produce a `storyGraph` matching `StoryGraphSchema` (`{ nodes: [{ id, kind: SCENE|BOSS|ENDING, file }] }`) listing every Scene/Boss/Ending node you author, and an `npc` definition matching `NPCDefinitionSchema` (`{ id, characterAssetId, displayName, initialState: NPCState }`) for every NPC referenced anywhere in the chapter.

## Stage 5 — Interaction Design

For every scene that offers viewer choices, produce an `interactions` node matching `InteractionNodeSchema`:
- `id`, `promptAudioId?`, `openDurationMs` (how long voting stays open)
- `choices`: array of up to four `Choice` entries `{ id: 'A'|'B'|'C'|'D', label, actionType, ruleId, visibleIf? }` — `actionType` must match an ActionDefinition you define below; `visibleIf` is an optional array of Condition filtering when that choice is shown
- `diceMode`: always the literal `'PER_ACTION_GROUP'`
- `resultPolicy`: string identifying how results are resolved (document your own convention consistently)
- `nextScene`: id of the Scene node to move to after this interaction resolves
- `noParticipationPolicy`: same shape as Stage 3's world-rules default; may override it per interaction

Also produce one `actions` entry per distinct `actionType` referenced above, matching `ActionDefinitionSchema`: `{ id, actionType, scaleBands?, scaleSemantics?, diceProfileId, resultSetId }` — `scaleBands` overrides the chapter default scale bands for this action if present; `scaleSemantics` is a record keyed by scale describing what that scale means narratively for this action; `diceProfileId` and `resultSetId` point at Stage 6/7 entries.

## Stage 6 — Rule Dictionary (Dice Profiles & State Rules)

For every `diceProfileId` referenced above, produce a `dice` entry matching `DiceProfileSchema`:
- `id`, `diceType` (free-form label for the roll mechanic used)
- `qualityThresholds`: array of `{ quality, min, max }` with `min <= max`; the thresholds together must partition the roll range with no gaps for every quality you intend to be reachable
- `modifiers?`: array of `{ when: Condition, amount, reason }` — situational bonuses/penalties

Produce one or more `state-rules` sets matching `StateRuleSetSchema` (`{ id, rules: StateRule[] }`) where each `StateRule` is `{ id, when: Condition, effects: StateEffect[], once? }`, and each `StateEffect` is `{ path: StatePath, op: 'SET'|'INC'|'DEC'|'PUSH'|'REMOVE', value? }`. Use these for world-state changes that should fire automatically whenever a condition becomes true, independent of any specific dice roll's outcome.

## Stage 7 — Result Dictionary

For every `resultSetId` referenced above, produce a `results` entry matching `ResultDictionarySchema` (`{ id, entries: ResultEntry[] }`) where each entry is exactly one of:
- a full entry: `{ quality, resultId, worldEffects: StateEffect[], playerEffects: PlayerEffect[], narrativeId, visibility: 'PUBLIC'|'DEFERRED' }`
- a redirect: `{ quality, mapsTo: <a different quality> }` — this quality produces no unique outcome; it behaves as if the mapped-to quality had occurred
- an unreachable marker: `{ quality, unreachable: true }` — this quality can never actually occur for this action (note why in your authoring notes)

Every one of the six `Quality` values — `DISASTER`, `FAILURE`, `COSTLY_SUCCESS`, `SUCCESS`, `GREAT_SUCCESS`, `SPECIAL` — must appear exactly once across a ResultDictionary's entries, as one of the three shapes above. Never omit one.

`PlayerEffect`: `{ scope: THIS_ACTION_GROUP|OTHER_ACTION_GROUPS|ALL_ACTIVE|ALL_DOWNED|ALL_SPECTATORS|ALL_VIEWERS, op: DAMAGE|HEAL|SPEND_LIFE|GRANT_LIFE|REVIVE, amount? }`.

Also produce `recovery` rules matching `RecoveryRuleSchema` (`{ id, when: RecoveryTrigger, scope: ViewerScope, effects: PlayerEffect[], oncePerChapter? }`) where `RecoveryTrigger` is one of `{ kind: 'STATE', condition: Condition }`, `{ kind: 'SCENE_ENTER', nodeId }`, or `{ kind: 'RESULT_QUALITY', actionId, minQuality: Quality }` — these fire automatically so downed/struggling viewers can recover without needing an explicit choice.

## Stage 8 — Narrative Blocks

For every `narrativeId` referenced in Stage 7, produce a `narrative.result` entry matching `ResultNarrativeSchema`: `{ id, primaryBlockId, supportBlockIds?, urgencyBlockId?, transitionBlockId?, prefixBlockId?, focus: { priority, category, urgency: NONE|LOW|MEDIUM|HIGH } }`.

Every block id referenced above must correspond to a `narrative.block` entry matching `NarrativeBlockSchema`: `{ id, slot: PREFIX|SUPPORT|PRIMARY|URGENCY|TRANSITION (must match the field name that referenced it), text, tone?, when? }` — `text` is the actual line(s) of prose/dialogue, and `when` (a Condition) lets a `SUPPORT` block apply only conditionally. This is the one stage where free creative writing is the deliverable, not structural bookkeeping.

## Stage 9 — Boss & Ending

If this chapter has a climactic Boss encounter, produce a `boss` node matching `BossNodeSchema`: `{ id, displayName, visualSceneId, phases: BossPhase[], variables, stateRuleSetId, onDefeat, onFailure, maxRounds? }`. Each `BossPhase` is `{ id, order, enterWhen: Condition, interactionId, narrationBlockIds?, hostPolicy }`. `onDefeat`/`onFailure` are ids of the Scene/Ending to go to next.

Produce every `endings` node matching `EndingNodeSchema`: `{ id, title, when: Condition|null, priority, isFallback, visualSceneId, narrationBlockIds, masterAudioId?, tags? }`. Exactly one ending must have `isFallback: true` with `when: null` (the catch-all if nothing else matches); every other ending must have `isFallback: false` with a non-null `when`. Endings are evaluated in descending `priority` order.

## Stage 10 — Visual & Audio Assets

For every `visualSceneId` referenced above, produce a `visuals` entry matching `VisualSceneSchema`: `{ id, layers: VisualLayer[] ({ assetId, z, parallax? }), cameraPreset? }`.

For every `characterId` placed in a scene, produce a `CharacterAsset` matching `CharacterAssetSchema`: `{ id, expressions, microAnimations?, defaultExpression }` — `expressions` is a record mapping expression name to an image asset id.

For every asset id referenced by a layer or expression, produce an `ImageAsset` matching `ImageAssetSchema`: `{ id, file }`.

For every audio id referenced above (`bgm`, `ambience`, `promptAudioId`, `masterAudioId`), produce an `audio` entry matching `AudioAssetSchema` — one of two shapes: `{ id, kind: SPEECH|BGM|SFX|AMBIENCE, loop?, gain?, source: 'PREPRODUCED'|'PREGENERATED', file }` for pre-made audio, or `{ id, kind, loop?, gain?, source: 'RUNTIME_TTS', ttsSpec: { voiceId, voiceSettings } }` for text-to-speech generated at runtime.

Also produce a `hostPublic` spec matching `HostPublicSpecSchema`: `{ flagVisibility, sceneDisclosures, tensionLabels, forbiddenTopics? }` — `flagVisibility` is a record of flag key to `PUBLIC`|`HIDDEN`, governing which world-state flags the AI Host is allowed to know about or mention; `sceneDisclosures` is a record of scene id to `{ locationLabel, knownFactIds, tensionKey, knownFactDependencies? }`; `tensionLabels` maps each `tensionKey` you used to a human-readable label. This is what keeps the AI Host from leaking hidden information.

## Stage 11 — Review

Before finalizing, re-check every one of the following:
- Every id referenced anywhere above (scene ids in `next`/`goto`/`nextScene`/`onDefeat`/`onFailure`, and every action/dice/result/narrative/visual/audio/character id) resolves to something you actually defined.
- Every one of the six Quality values is covered in every ResultDictionary you produced.
- The fallback Ending exists, is unique, and every other Ending has a non-null `when`.
- `entryNodeId` points at a real Scene you defined.

Do not submit content that references an id you have not defined. The Compiler will reject it, and the AI Repair Loop will bounce your draft back to you with the specific error.
````

- `CHAPTER_AUTHORING_SCHEMA_PROMPT` 的类型是纯 `string`（TypeScript
  模板字符串或字符串字面量均可，只要内容逐字与上文一致）。
- **零 import**：本文件不依赖任何 workspace 包，也不依赖
  `chapter-schema`（本节点只产出自然语言文本，不做程序化校验）。

### 2.2 `packages/chapter-authoring-prompts/src/index.ts`（barrel）

```typescript
export * from './chapterAuthoringSchemaPrompt.js';
```

---

## 3. Scope

### Writable Scope

```
packages/chapter-authoring-prompts/package.json            （新增）
packages/chapter-authoring-prompts/tsconfig.json            （新增）
packages/chapter-authoring-prompts/src/index.ts             （新增）
packages/chapter-authoring-prompts/src/chapterAuthoringSchemaPrompt.ts       （新增）
packages/chapter-authoring-prompts/src/chapterAuthoringSchemaPrompt.test.ts  （新增）
tsconfig.json                                               （根，追加一条 references 条目）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-070/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/chapter-schema/src/*.ts（Read-only，本节点撰写 prompt 时的事实核对来源，不 import、不修改）
```

### Forbidden Scope

```
修改除本节点 Writable Scope 之外的任何既有文件
import 或依赖 packages/chapter-schema 或任何其他既有包
真实调用任何 AI/LLM API（那是未来 DEV-071 的职责）
实现任何 Schema Normalizer/Compiler 逻辑（既有 DEV-002 的职责）
实现任何 AI Repair Loop 逻辑（未来 DEV-072 的职责）
改写第 2.1 节给出的 prompt 正文内容（必须逐字照抄）
新增第三方 npm 依赖
```

---

## 4. Required Skills

### Required

- 逐字抄录本 Task Package 第 2.1 节给出的 prompt 文本到 TypeScript 字符串常量
- 编写机械关键字覆盖测试（字符串 `includes` 断言）

### Forbidden / Unnecessary

- 任何 AI/LLM SDK 或 API 调用
- 任何 Schema 校验/编译逻辑
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/baseline/DEV_SPEC_V1.0.md` 第 1175-1237 行（第 25-26 节）、第 2758-2761 行（DEV-070 原文） | "Sol/F5 按 Schema 写"这一职责与十一阶段authoring 流程的权威来源 |
| `packages/chapter-schema/src/*.ts`（DEV-001 冻结，19 个组件） | 本节点第 2.1 节 prompt 正文逐字段核对的权威来源，Commander 已核对 |
| USER 2026-09-08 裁决 | 确认写完整、逐模块覆盖的 prompt，而非只写高层框架 |

---

## 6. Outputs

1. `CHAPTER_AUTHORING_SCHEMA_PROMPT`（`chapterAuthoringSchemaPrompt.ts`）
2. `specs/dev/DEV-070/DECISIONS.md`，至少覆盖：为何本节点交付物是
   prompt 文本而非确定性代码、为何零依赖不 import
   `chapter-schema`、为何测试只做关键字覆盖而不做语义/质量判断、
   为何 prompt 正文必须逐字照抄第 2.1 节而不允许执行方自行改写

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-070/{INDEX,REQUIREMENTS,ACCEPTANCE,REPORT}.md`
- **Acceptance**：四份节点文档存在；`INDEX.md` 含 Task Order T001–T002。

---

### T002 — `chapterAuthoringSchemaPrompt.ts` + 测试 + 包骨架 + 根 tsconfig 引用 + 全量验证、REPORT 与 commit

- **Allowed Files**：`packages/chapter-authoring-prompts/{package.json,tsconfig.json,src/index.ts,src/chapterAuthoringSchemaPrompt.ts,src/chapterAuthoringSchemaPrompt.test.ts}`、根 `tsconfig.json`、`specs/dev/DEV-070/{INDEX,REPORT,DECISIONS}.md`
- **Requirements**：`chapterAuthoringSchemaPrompt.ts` 的字符串内容必须与本 Task Package 第 2.1 节给出的 Markdown 全文**逐字一致**（可以整段作为一个模板字符串字面量赋值，不得增删改写任何一句）；`package.json`（`name: "@interactive-story/chapter-authoring-prompts"`，**省略** `dependencies` 字段，同 `error-registry`/`watchdog` 的零依赖惯例）/`tsconfig.json` 结构对齐 `packages/watchdog/`；根 `tsconfig.json` 的 `references` 数组末尾（`platform-obs` 之后）追加 `{ "path": "./packages/chapter-authoring-prompts" }`。
- **Acceptance（功能部分）**：
  - `CHAPTER_AUTHORING_SCHEMA_PROMPT` 是非空字符串。
  - 字符串依次包含全部十一个阶段标题（`Stage 1` 到 `Stage 11`，逐一存在，用简单的 `for` 循环或逐条断言均可）。
  - 字符串包含以下 18 个关键字（每个关键字对应第 2.1 节列出的一个 schema 组件，逐一断言 `includes`，缺一不可）：`contentWarnings`（metadata）、`activeThreats`（worldState）、`hostPolicy`（scene）、`characterAssetId`（npc）、`PER_ACTION_GROUP`（interaction）、`EXISTS`（stateRules/Condition）、`qualityThresholds`（dice）、`mapsTo`（result）、`isFallback`（endings）、`onDefeat`（boss）、`RUNTIME_TTS`（audio）、`parallax`（visuals）、`forbiddenTopics`（hostPublic）、`oncePerChapter`（recovery）、`urgencyBlockId`（narrative）、`scaleSemantics`（action）、`diceBuffer`（manifest/worldRules）、`ChapterSchema`（整体引用）。
  - 字符串包含全部六个 Quality 取值（`DISASTER`/`FAILURE`/`COSTLY_SUCCESS`/`SUCCESS`/`GREAT_SUCCESS`/`SPECIAL`）。
  - 字符串包含全部五个角色 slot 取值（`LEFT`/`CENTER_LEFT`/`CENTER`/`CENTER_RIGHT`/`RIGHT`）。
- **Requirements（回归部分）**：`pnpm test` 全量跑通，既有全部包测试零改动通过。
- **Requirements（验证部分）**：
  1. `index.ts` 导出 `chapterAuthoringSchemaPrompt.ts` 的全部公开符号。
  2. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  3. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  4. **`DECISIONS.md` 必须已提交**。
  5. 更新 `INDEX.md`：T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW`。
  6. **写入（不提交）** `specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-070.md` 消息文件与 `specs/comms/LEDGER.md` 追加行（msg_id 取当前最大序号 + 1）。
  7. `git add`（仅本节点 Writable Scope 内文件，**不包含** LEDGER.md 与刚写的 NODE_REPORT 消息文件）`&& git commit`，首行：`DEV-070: chapter authoring schema prompt (11-stage AI authoring instructions, verbatim from chapter-schema)`，**恰 1 条提交**。
  8. 自行核实：`git log -1` 只看到这一条新提交、NODE_REPORT 消息文件与 LEDGER 追加行存在于工作区但未提交；**工作区不得残留任何本次施工产生的临时/草稿文件**（提交前先跑一次 `git status` 检查干净）。
  9. **STOP**。
- **Acceptance（命令部分）**：六条命令全部退出码 0；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-070 INDEX

Status: IN_PROGRESS

## Current Node

DEV-070 — Chapter Authoring Schema Prompt

## Objective

新建 `packages/chapter-authoring-prompts`：导出
`CHAPTER_AUTHORING_SCHEMA_PROMPT` 字符串常量——一段指导 AI 模型
（GPT-5.6 Sol / Fable 5）按 `chapter-schema`（DEV-001 冻结）逐
模块写作 Chapter 内容的十一阶段 prompt。本节点交付物类型与
M1–M6 全部节点不同（prompt 文本，非确定性类型/决策代码）；测试
只做机械关键字覆盖检查，不判断写作质量。不真实调用任何 AI API
（DEV-071 职责），不实现 Schema Normalizer/Compiler（既有
DEV-002）/AI Repair Loop（未来 DEV-072）逻辑。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 chapterAuthoringSchemaPrompt.ts + 测试 + 包骨架 + 根 tsconfig 引用 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与
NODE_REPORT 消息文件已写入工作区但**未提交**；工作区不得残留任何
施工用临时文件。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **`chapterAuthoringSchemaPrompt.ts` 的字符串内容必须与本 Task
   Package 第 2.1 节逐字一致**——不得改写/精简/意译/修正措辞。
2. **零 workspace 依赖，不 import `chapter-schema`**。
3. **不新增任何第三方 npm 依赖**。
4. **不真实调用任何 AI/LLM API**。
5. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
6. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发
   `EXECUTOR_QUERY`，等 `SCOPE_RULING`。
7. **T002 提交后，LEDGER 追加行与自己的 NODE_REPORT 消息文件一律不
   要再提交**——写入工作区即可，留给 Commander 收尾统一提交；
   **提交前用 `git status` 自查工作区是否干净，不得留下任何额外
   的临时/草稿文件**（DEV-061 的 MAJOR-01 先例）。

---

## 10. Non-goals / Out-of-scope

- 真实调用任何 AI/LLM API 生成 Chapter Draft（DEV-071 的职责）。
- Schema Normalizer/Compiler 逻辑（既有 DEV-002）。
- AI Repair Loop（未来 DEV-072）。
- 任何"验证某个具体 Chapter 草稿是否遵循本 prompt"的端到端测试
  （需要真实 AI 调用，非本节点范围）。

---

## 11. Tests

### Unit tests

T002：`CHAPTER_AUTHORING_SCHEMA_PROMPT` 非空、十一个 Stage 标题
全部存在、18 个模块关键字全部存在、六个 Quality 取值全部存在、
五个角色 slot 取值全部存在——全部为机械字符串 `includes` 检查。

### Regression tests

`pnpm test` 覆盖全 workspace；既有全部包测试零回归（新增独立包，
根 `tsconfig.json` 仅追加一条 reference）。

---

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含新包 `chapter-authoring-prompts` 真正被 `tsc -b` 构建） | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `CHAPTER_AUTHORING_SCHEMA_PROMPT` 非空字符串 | 测试检查 |
| A08 | 十一个 Stage 标题全部存在 | 测试检查 |
| A09 | 18 个模块关键字全部存在（见 T002 Acceptance 逐条列出） | 测试检查 |
| A10 | 六个 Quality 取值全部存在 | 测试检查 |
| A11 | 五个角色 slot 取值全部存在 | 测试检查 |
| A12 | 字符串内容与本 Task Package 第 2.1 节逐字一致（人工核对） | 文件比对 |
| A13 | 未新增第三方 npm 依赖，`package.json` 无 workspace 依赖 | 文件检查 |
| A14 | 未 import `chapter-schema` 或任何其他既有包 | 代码检查 |
| A15 | 未真实调用任何 AI/LLM API；未实现 Compiler/Repair Loop 逻辑 | 代码检查 |
| A16 | 除本节点 Writable Scope 外任何既有文件均未被修改 | git diff 比对 |
| A17 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A18 | `specs/dev/DEV-070/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A19 | `git log` 新增恰 1 条提交，首行 `DEV-070: chapter authoring schema prompt (11-stage AI authoring instructions, verbatim from chapter-schema)` | 命令 |
| A20 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交**；工作区无任何额外残留文件 | 命令 + `git status` 检查 |
| A21 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT → 仅
commit 代码+节点文档（一条提交）→ 写入但不提交 LEDGER/NODE_REPORT →
自行核实完成三要素、工作区无残留临时文件 → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A21。
