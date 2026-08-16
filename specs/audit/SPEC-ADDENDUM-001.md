# SPEC ADDENDUM 001

Development Specification V1.0 增补稿
Drafted by: Claude Commander
Approved by: USER — 2026-08-16
Status: **FROZEN** — 全部 20 项决策（D01–D20）已定稿
Covers: CR-001、CR-002、CR-003、CR-011

> 冻结后本稿与 Dev Spec V1.0 具有同等约束力。变更须走 `CHANGE_REQUEST` 并经 USER 批准。

---

## 0. 本稿性质

本稿补齐 Dev Spec V1.0 第 19 节 Chapter Pack 中**正文零定义或仅有零散引用**的结构，以及 HP / Life 的产品闭环与 `playerEffects` 的作用粒度。

编号使用 `A1 … A19`，避开原规范 §0–§72，不修改原文任何已定义内容。

### 起草纪律

1. **不引入任何新子系统。** 所有新结构必须复用原规范已确立的机制：Condition 求值、批量 scope、六等级 quality、Event Log、WorldState 容器。
2. **不引入表达式语言。** 所有条件与效果均为纯数据结构，禁止字符串表达式、禁止 `eval`。理由：第 24 节 PASS 5 要求静态追踪可达状态，可执行表达式无法静态分析。
3. **不引入新的状态容器。** Boss 变量、Ending 判定、Recovery 计数全部落在第 14 节 `WorldState.chapterVariables` 或 `flags` 内。
4. 每条设计决策的定稿结果见 §A19。

### 冻结状态

DEV-001 Chapter Schema 的规范阻塞已解除。本稿即其权威输入。

---

## A1. `manifest.json`

Chapter Pack 顶层清单。**只承载创作期身份信息，不承载完整性校验数据。**

```typescript
type ChapterManifest = {
  schemaVersion: string        // Chapter Schema 版本，用于向后兼容判定
  chapterId: string
  chapterVersion: string       // 第 18 节 LKG 要求记录的 Chapter Version
  title: string

  entryNodeId: string          // 故事图入口，必须是 story.graph 中的 SCENE 节点

  language: string
  authoring: {
    generatedBy?: string       // 第 25 节：GPT-5.6 Sol / Fable 5
    auditedBy?: string         // 第 25 节：另一个模型审计
    createdAt: string
  }
}
```

### 设计理由

Bundle Integrity Check（第 6.2 节）所需的逐文件哈希由 **Compiler 生成并写入 Runtime Bundle**，不放在 raw manifest 里。理由：作者手写的哈希必然过期，而 Compiler 是唯一有资格签名的环节（第 26 节 Compile–Repair Loop 只有 PASS 才进入资产生产）。

### Compiler 检查项

- `entryNodeId` 必须存在且 kind 为 `SCENE`
- `schemaVersion` 必须为编译器支持的版本
- `chapterVersion` 在同一 `chapterId` 下不得与已发布 Bundle 重复

---

## A2. `story.graph.json`

**节点注册表 + 入口声明。不重复声明边。**

```typescript
type StoryGraph = {
  nodes: StoryGraphNode[]
}

type StoryGraphNode = {
  id: string
  kind: "SCENE" | "BOSS" | "ENDING"
  file: string                 // 相对 Chapter Pack 根的路径
}
```

### 设计理由

边（`SceneNode.next`、`InteractionNode.nextScene`、`SceneGuard`）已由节点自身声明。若 story.graph 再声明一遍边，就出现两个可漂移的真相源，违反 P-01 的意图。

story.graph 的价值在于：给 Compiler PASS 3 一份**权威节点清单**，从而能判定"声明了但图上不可达"与"图上引用了但未声明"两类错误 —— 若只靠扫描 `scenes/` 目录，无法区分"漏写文件"和"故意移除"。

`kind` 让 BOSS 与 ENDING 成为图上的一等节点，PASS 3 的 "Boss reachability" / "Ending reachability" 才有明确检查对象。

### Compiler 检查项

- 节点 id 全局唯一
- 每个 `file` 存在且解析出的 id 与注册表一致
- `scenes/` `boss/` `endings/` 下的每个文件都在注册表中（无孤儿文件）
- 至少一个 `ENDING` 节点

---

## A3. `world.rules.json`

章节级默认值与全局规则。第 10 节"具体人数边界由 Chapter / World Rules 定义"的落点。

```typescript
type WorldRules = {
  viewerDefaults: {
    hp: 0 | 1 | 2 | 3          // 新观众初始 HP，建议 3
    life: 0 | 1 | 2            // 新观众初始 Life，建议 2
  }

  downedPolicy: "AUTO_SPEND_LIFE" | "REQUIRE_RECOVERY"   // 见 §A13

  defaultScaleBands: ScaleBand[]        // Action 可覆盖
  defaultDiceProfileId: string

  interactionDefaults: {
    openDurationMs: number
    noParticipationPolicy: NoParticipationPolicy         // 见 §A17
  }

  diceBuffer: {
    minDiceMs: number          // 第 31 节，建议 3500
    targetDiceMs: number       // 建议 6000
    maxDiceMs: number          // 建议 12000
  }
}

type ScaleBand = {
  scale: "SOLO" | "SMALL" | "MEDIUM" | "LARGE" | "MASS"
  minParticipants: number
  maxParticipants: number | null    // null 表示无上限，仅允许最高档使用
}
```

### 设计理由

第 31 节把 dice 时长写为"配置"而非硬编码，本稿把它落在 world.rules 而非全局运行时配置 —— 因为不同章节的叙事节奏不同（悬疑章节希望骰子悬停更久），这属于内容属性。

### Compiler 检查项

- `defaultScaleBands` 必须覆盖 `participantCount >= 1` 的全部整数值域，且区间不重叠
- 恰有一个 band 的 `maxParticipants` 为 `null`
- `minDiceMs <= targetDiceMs <= maxDiceMs`
- 若 `downedPolicy === "REQUIRE_RECOVERY"`，则 `recovery/` 至少存在一条 scope 覆盖 `DOWNED` 的规则（否则观众将永久锁死）

---

## A4. `actions/`

```typescript
type ActionDefinition = {
  id: string
  actionType: string           // 第 10 节：SEARCH / STEALTH / LIFT / …

  scaleBands?: ScaleBand[]     // 省略则用 world.rules.defaultScaleBands
  scaleSemantics?: Record<ActionScale, string>   // 仅供创作与审计阅读，运行时忽略

  diceProfileId: string
  resultSetId: string          // 指向 results/ 中的 Result Dictionary
}
```

### 设计理由

第 10 节强调不同 Action Type 的"更多人"含义不同（SEARCH 扩大覆盖 / STEALTH 转为分散潜入 / LIFT 提高搬运规模）。这种语义差异**已经体现在 results 里**（同一 scale + 同一 quality 指向不同 resultId），因此运行时不需要"scale function"这种可执行逻辑 —— 只需要人数 → scale 的分段映射，剩下的交给 Result Dictionary 查表。

`scaleSemantics` 是纯文档字段，保留它是为了让 AI 创作管线（第 25 节）与人工审计能看懂设计意图，运行时必须忽略。

**这条设计消灭了一个潜在的过度设计**：如果把 scale function 做成可执行的，就需要一套表达式语言，与起草纪律第 2 条冲突，且 PASS 5 无法静态分析。

### Compiler 检查项

- `diceProfileId` / `resultSetId` 引用存在（PASS 2）
- `scaleBands` 覆盖完整且不重叠

---

## A5. `dice/`

```typescript
type DiceProfile = {
  id: string
  diceType: string             // "d20" | "2d6" | …
  qualityThresholds: QualityThreshold[]
  modifiers?: DiceModifier[]
}

type QualityThreshold = {
  quality: "DISASTER" | "FAILURE" | "COSTLY_SUCCESS" | "SUCCESS" | "GREAT_SUCCESS" | "SPECIAL"
  min: number                  // 含
  max: number                  // 含
}

type DiceModifier = {
  when: Condition              // 见 §A6
  amount: number               // 可正可负
  reason: string               // 进 Event Log，供审计
}
```

### 设计理由

`finalValue → quality` 必须是**纯查表**，不能是运行时计算 —— 这是第 61 节 Replay Test 要求"完全一致"的前提，也让 PASS 4 Rule Coverage 能静态枚举"every reachable quality"。

`modifiers` 用 Condition 而非表达式，同纪律第 2 条。`reason` 字段是为第 8 节"全部进入 Event Log"服务的 —— 审计时必须能回答"这 +2 是哪来的"。

注意 `scale` **不进 modifier**。人数只决定 scale，scale 只决定查哪张 result 表（第 10 节：人数不得直接转换为攻击力）。若允许 scale 加骰子修正，就等于人数变相转成了战斗力，违反核心原则。

### Compiler 检查项

- `qualityThresholds` 必须完整覆盖 `diceType` 的理论值域（含 modifier 可达的极值），区间不重叠
- 六等级中未出现在 thresholds 里的，视为该 profile 下 `unreachable`，并须在 Result Dictionary 中以 `unreachable = true` 显式对应（呼应第 22 节）

---

## A6. `state-rules/`

Condition / Guard / Effect 的统一结构。第 65 节 DEV-004 的输入契约。

```typescript
type Condition =
  | { path: StatePath; op: "EQ" | "NEQ" | "GT" | "GTE" | "LT" | "LTE"; value: boolean | number | string }
  | { path: StatePath; op: "IN"; value: (boolean | number | string)[] }
  | { path: StatePath; op: "EXISTS" }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }

type StatePath = {
  container: "flags" | "npc" | "danger" | "discovered" | "activeThreats" | "chapterVariables"
  key: string
  field?: string               // 仅 npc / danger 使用
}

type StateEffect = {
  path: StatePath
  op: "SET" | "INC" | "DEC" | "PUSH" | "REMOVE"
  value?: boolean | number | string
}

type StateRuleSet = {
  id: string
  rules: StateRule[]
}

type StateRule = {
  id: string
  when: Condition
  effects: StateEffect[]
  once?: boolean               // 每章最多触发一次
}
```

`SceneGuard`（第 20 节被引用但未定义）：

```typescript
type SceneGuard = {
  when: Condition
  goto: string                 // 目标节点 id，覆盖 SceneNode.next
  priority: number             // 必须全局唯一，保证确定性
}
```

### 设计理由

`container` 枚举与第 14 节 `WorldState` 的字段**一一对应**，不多不少。这让 PASS 5 State Reachability 有了明确的分析边界：可达状态空间 = story graph 可达节点 × 这些 container 上被 effect 触及过的键。

`SceneGuard.priority` 必须唯一 —— 多个 guard 同时成立时若无总序，转移就不确定，直接击穿 G03（Replay 100% deterministic）。这是本稿反复使用的模式（见 §A12 Ending）。

### Compiler 检查项

- 所有 `StatePath` 引用的键在 `initial.state.json` 中已声明，或被某条 effect 创建（禁止读未定义键）
- `SceneGuard.priority` 在同一节点内唯一
- `INC` / `DEC` 只能作用于数值型键
- `PUSH` / `REMOVE` 只能作用于 `discovered` / `activeThreats`

---

## A7. `narrative/`

第 13 节只给了拼装顺序（PREFIX + SUPPORT + PRIMARY + URGENCY + TRANSITION），本节补齐字段结构。

```typescript
type NarrativeBlock = {
  id: string
  slot: "PREFIX" | "SUPPORT" | "PRIMARY" | "URGENCY" | "TRANSITION"
  text: string
  tone?: string                // 与 SceneNode 的场景基调匹配
  when?: Condition             // 省略则始终可用
}

type ResultNarrative = {
  id: string                   // 被 ResolveResult.narrativeId 引用
  primaryBlockId: string
  supportBlockIds?: string[]
  urgencyBlockId?: string
  transitionBlockId?: string
  prefixBlockId?: string

  focus: {                     // 第 12 节 Narrative Focus 的创作期声明
    priority: number
    category: string
    urgency: "NONE" | "LOW" | "MEDIUM" | "HIGH"
  }
}
```

### 设计理由

第 12 节明确 PRIMARY / SUPPORT / CONTEXT / DEFERRED 的计算"尽量由 Chapter Pack 中提前定义的 priority / category / urgency 完成"，且"禁止运行时 LLM 判断"。本稿把这三个字段固化在 `ResultNarrative.focus` 上，于是 Composer 的焦点计算退化为**按 priority 排序 + 按 urgency 选块**，是纯确定性的。

`priority` 在同一 ResultSet 内必须唯一 —— 同理，否则焦点选择不确定。

### Compiler 检查项

- 每个 `resultId` 都有对应 `ResultNarrative`（除 `unreachable = true` 者）
- 引用的所有 blockId 存在且 `slot` 匹配字段位置
- 同一场结算中可能共现的 ResultNarrative，其 `focus.priority` 不得相同（需 PASS 4 的共现集合）
- 每个 `PRIMARY` 块至少被一个 ResultNarrative 引用（无死块）

---

## A8. `npc/`

```typescript
type NPCDefinition = {
  id: string
  characterAssetId: string     // 指向 visuals/ 中的 CharacterAsset
  displayName: string
  initialState: NPCState
}

type NPCState = {              // 补齐第 14 节被引用但未定义的类型
  present: boolean
  alive: boolean
  disposition: "HOSTILE" | "NEUTRAL" | "FRIENDLY"
  flags: Record<string, boolean | number | string>
}
```

### Compiler 检查项

- `characterAssetId` 存在（第 24 节 PASS 2 的 NPC → Character）
- `initial.state.json` 的 `npc` 字段与 `npc/` 定义集合一致

---

## A9. `visuals/`

```typescript
type VisualScene = {
  id: string                   // 被 SceneNode.visualSceneId 引用
  layers: VisualLayer[]
  cameraPreset?: string
}

type VisualLayer = {
  assetId: string
  z: number
  parallax?: number
}

type CharacterAsset = {
  id: string
  expressions: Record<string, string>      // expressionKey → 图片资产 id
  microAnimations?: string[]
  defaultExpression: string
}

type CharacterPlacement = {   // 补齐第 20 节被引用但未定义的类型
  characterId: string
  slot: "LEFT" | "CENTER_LEFT" | "CENTER" | "CENTER_RIGHT" | "RIGHT"
  expression?: string          // 省略则用 defaultExpression
  visible: boolean
}

type ImageAsset = {
  id: string
  file: string
}
```

### 设计理由

`slot` 采用**固定五档**而非自由坐标。理由：这是绘本而非游戏引擎，固定站位让插画生产有确定的构图约束（第 65 节 DEV-073 Asset Requirement Generator 要能自动导出"需要哪些立绘"），也让 Renderer 无需布局计算。

`cameraPreset` 只给字符串键，不定义镜头脚本语言 —— 第 33 节提到"镜头"，但为它设计一套 DSL 属过度设计，Renderer 侧用预设名映射到具体动画即可。

### Compiler 检查项

- 所有 `assetId` / `expressions` 值在 `ImageAsset` 集合中存在
- `defaultExpression` 是 `expressions` 的合法键
- 文件是否真实存在**不在此检查**（见审计 CR-006：归 DEV-075 Chapter Packager）

---

## A10. `audio/`

```typescript
type AudioAsset = {
  id: string
  kind: "SPEECH" | "BGM" | "SFX" | "AMBIENCE"
  source: "PREPRODUCED" | "PREGENERATED" | "RUNTIME_TTS"
  file?: string                // source = PREPRODUCED | PREGENERATED 时必填
  ttsSpec?: {                  // source = RUNTIME_TTS 时必填
    voiceId: string
    voiceSettings: Record<string, number | string>
  }
  loop?: boolean
  gain?: number
}
```

### 设计理由

第 27 节的三分类 MASTER / COMPILED / SOUND 中，MASTER 与 COMPILED 的区别是"谁生产的"，属内容管线关注点；运行时只关心"有没有可播文件"。因此本稿在 `kind` 上收敛为 SPEECH / BGM / SFX / AMBIENCE，把生产来源移到 `source`。

三档 `source` 的含义：

- `PREPRODUCED` — 人工或离线精修，第 28 节 Master Audio（Chapter Intro / Boss 登场 / Ending 等）
- `PREGENERATED` — **编译期由 `NarrativeBlock` 批量生成**（CR-018 已裁决采纳，见 `CR-RESOLUTIONS-001.md` §4）
- `RUNTIME_TTS` — 运行时现场生成，兜底路径

> CR-018 裁决要点：预生成的对象是**块（NarrativeBlock）而非完整语句**。完整语句对应 ResultSet 组合，一个章节约 7 万条量级，不可行；而块是作者手写的有限集合，几百条量级，全量离线生成可行。运行时退化为按序播放 2–5 个片段。

全系统统一的音频解析链（在 DEV-030 定义）：

```
PREGENERATED → CACHE → RUNTIME_TTS → SUBTITLE_ONLY
```

### Compiler 检查项

- `source` 与 `file` / `ttsSpec` 的互斥必填关系
- `kind = SPEECH` 且 `source = RUNTIME_TTS` 时，`ttsSpec.voiceId` 非空（第 51 节 Cache Key 依赖它）
- `source = PREGENERATED` 的资产必须可追溯到一个 `NarrativeBlock` id
- 文件存在性不在此检查（归 DEV-075 Chapter Packager）

---

## A11. `boss/`

**Boss 不是新子系统。** 它是故事图上的一个受约束子图，加上 `WorldState.chapterVariables` 里的若干变量。

```typescript
type BossNode = {
  id: string
  displayName: string
  visualSceneId: string

  phases: BossPhase[]

  variables: Record<string, number | boolean | string>   // 注入 chapterVariables
  stateRuleSetId: string       // 相位推进复用 state-rules

  onDefeat: string             // 目标节点 id
  onFailure: string            // 目标节点 id
  maxRounds?: number           // 兜底，防止无限循环
}

type BossPhase = {
  id: string
  order: number                // 唯一
  enterWhen: Condition
  interactionId: string        // 复用普通 InteractionNode
  narrationBlockIds?: string[]
  hostPolicy: HostPolicy       // 第 39 节：Boss cinematic 应为 MUTED
}
```

### 设计理由

这是本稿最需要克制的地方。Boss 战很容易被设计成"新的战斗引擎"：Boss HP、伤害公式、技能表、回合制调度器。那会立刻违反第 10 节（人数不转攻击力）和第 70 节禁止清单的精神，并且引入第二套规则求值器。

本稿的立场：

- **Boss 没有独立 HP 字段。** Boss 的"血量"就是 `variables` 里的一个数值，由普通 `StateEffect` 增减 —— 与世界上任何其他计数器无区别。
- **Boss 战的每一轮就是一次普通 Interaction。** 复用 `InteractionNode`、复用 ActionGroup、复用 dice、复用 Result Dictionary 六等级。
- **相位推进复用 state-rules。** 不新增相位调度器。
- `maxRounds` 是唯一的新增保护，为满足第 24 节 PASS 3 的 "Infinite loop detection"。

于是 Boss 在代码上**不需要任何专属运行时模块** —— DEV-004 / DEV-005 / DEV-006 已经足够跑完 Boss 战。这也解释了为什么第 65 节没有 Boss 节点：它本来就不需要一个。

### Compiler 检查项

- `phases[].order` 唯一，且至少一个 phase 的 `enterWhen` 在进入 Boss 节点时可满足（否则一进入就卡死）
- `onDefeat` / `onFailure` 指向已注册节点
- 所有 `interactionId` 存在，且其 `nextScene` 指回本 Boss 节点或 `onDefeat` / `onFailure` 之一
- Boss 节点可达（第 24 节 PASS 3 Boss reachability）
- `variables` 的键不得与 `initial.state.json` 的 `chapterVariables` 冲突

---

## A12. `endings/`

```typescript
type EndingNode = {
  id: string
  title: string
  when: Condition | null       // null 表示兜底结局
  priority: number             // 全局唯一，数值大者优先
  isFallback: boolean

  visualSceneId: string
  narrationBlockIds: string[]
  masterAudioId?: string
  tags?: string[]              // 创作分类，运行时忽略
}
```

### 设计理由

结局选择必须是**全序确定的**：所有 `when` 成立的 Ending 中取 `priority` 最大者。`priority` 全局唯一由 Compiler 强制。

必须**恰好存在一个** `isFallback = true` 且 `when = null` 的 Ending。理由：第 24 节 PASS 3 要求 Dead-end detection 与 Ending reachability。若所有条件结局都不成立而没有兜底，Runtime 就走进了 `STORY.ERROR`，这在 7×24 无人值守下是不可接受的 —— 观众会看到一个没有结局的故事。

`tags` 明确标注运行时忽略，避免它被误用为逻辑分支。

### Compiler 检查项

- `priority` 全局唯一
- 恰有一个 `isFallback = true`，且其 `when === null`
- 非兜底结局的 `when !== null`
- 每个非兜底结局在 PASS 5 的可达状态集合中**至少有一个可满足解**（否则是死结局，应显式删除或标注）
- 所有 Ending 节点在图上可达

---

## A13. `recovery/` 与 HP / Life 产品闭环（CR-002）

### A13.1 生命周期状态

第 15 节给了 `hp` / `life` / `alive` 三个字段但未给语义。本稿定义观众的三档参与状态，**由现有字段派生，不新增字段**：

| 状态 | 派生条件 | 能否投票 | 能否聊天 |
|---|---|---|---|
| `ACTIVE` | `hp > 0` | ✅ | ✅ |
| `DOWNED` | `hp === 0 && life > 0` | ❌ | ✅ |
| `SPECTATOR` | `hp === 0 && life === 0` | ❌ | ✅ |

`alive` 字段等价于 `hp > 0`，保留它是为了兼容第 15 节原文。

**关键决策：DOWNED 与 SPECTATOR 都不能投票，但都能聊天。**

理由：投票是"参与故事"，必须有代价才有张力（第 72 节"观众每次选择都有真实作用"的对偶面是选错要付代价）。但聊天是"参与直播间"，切断它会直接把观众赶走，而 AI Host（第 36 节职责含"缓解冷场"、"建立直播间内部梗"）恰恰是靠聊天维持社交关系的。**惩罚玩法参与，不惩罚社交存在。**

### A13.2 DOWNED 的两种处置策略

由 `world.rules.downedPolicy` 选择：

**`AUTO_SPEND_LIFE`（建议默认）**

下一轮 Interaction 开始时，DOWNED 观众自动 `life -= 1`、`hp = 1`，恢复 ACTIVE。叙事上是"挣扎着站起来"。总耐受度 = 3 HP + 2 次复起 = 5 次伤害后成为 SPECTATOR。

**`REQUIRE_RECOVERY`**

DOWNED 状态持续到某条 Recovery Rule 触发。张力更强，但要求章节必须提供可靠的恢复路径 —— Compiler 强制检查 `recovery/` 中存在 scope 覆盖 `DOWNED` 的规则（见 §A3）。

### A13.3 新加入观众

第 15 节有 `joinedChapterAt` 但未说初始状态。本稿定义：**按 `world.rules.viewerDefaults` 满血满命加入**，不因加入时间晚而受罚。

理由：直播观众持续流入是常态，让迟到者带残血进场会立刻劝退新观众，与第 60 节 `first participation rate` 指标直接冲突。

### A13.4 Recovery Rule

```typescript
type RecoveryRule = {
  id: string
  when: RecoveryTrigger
  scope: ViewerScope
  effects: ViewerEffect[]
  oncePerChapter?: boolean
}

type RecoveryTrigger =
  | { kind: "STATE"; condition: Condition }
  | { kind: "SCENE_ENTER"; nodeId: string }
  | { kind: "RESULT_QUALITY"; actionId: string; minQuality: Quality }
```

`ViewerScope` 与 `ViewerEffect` 见 §A14 —— **Recovery 与 playerEffects 共用同一套批量作用语义**，不是两个机制。

### 设计理由

Recovery 的产品意义是"集体行动带来集体救赎"。最契合本产品的触发器是 `RESULT_QUALITY` —— 某个 ActionGroup 打出 `GREAT_SUCCESS` 时全场复活，这天然是一个叙事高点，也让"少数人选了对的选项"产生可见的集体价值（呼应第 60 节 `minority-choice participation` 指标）。

**全员 SPECTATOR 的情形**与零参与路径（§A17）在此衔接：没人能投票 → 空 ActionGroup → 走 `noParticipationPolicy`。两个机制自然接合，不需要额外兜底逻辑。

### Compiler 检查项

- `oncePerChapter` 的计数键落在 `chapterVariables`，不得与其他键冲突
- `RESULT_QUALITY` 引用的 `actionId` 存在
- 若 `downedPolicy === "REQUIRE_RECOVERY"`，至少一条规则的 scope 覆盖 DOWNED，且该规则在 PASS 5 可达状态集合中可满足

---

## A14. `playerEffects` 批量语义（CR-003）

### 定型

第 9 节 `ResolveResult.playerEffects: PlayerEffect[]` 采纳**批量语义**。

```typescript
type PlayerEffect = {
  scope: ViewerScope
  op: "DAMAGE" | "HEAL" | "SPEND_LIFE" | "GRANT_LIFE" | "REVIVE"
  amount?: number
}

type ViewerScope =
  | "THIS_ACTION_GROUP"        // 本次结算所属行动组全体
  | "OTHER_ACTION_GROUPS"      // 本轮其他行动组全体
  | "ALL_ACTIVE"               // 全场 ACTIVE
  | "ALL_DOWNED"
  | "ALL_SPECTATORS"
  | "ALL_VIEWERS"

type ViewerEffect = PlayerEffect   // Recovery 复用同一结构
```

**`PlayerEffect` 不含 `viewerId`。** 规则求值与观众身份彻底解耦。

### 设计理由

三条独立依据都指向批量：

1. 第 9 节 `ResolveInput` 只带 `participantCount: number`，不带参与者 ID 列表 —— 规范自身已经把规则求值设计成"按组"的。
2. 第 61 节 Simulation Test 要求测到 10,000 Viewer。逐人求值 + 逐人持久化，每轮 10,000 次写入，在 168h Soak（第 62 节）下不可接受。
3. 批量语义让 Replay 更容易确定性：重放只需要重放"组 → 效果"的映射，不依赖观众集合的枚举顺序。

### 产品意义

`THIS_ACTION_GROUP` 是核心 scope：某个组打出 DISASTER，**只有选了那个选项的人受伤**。这让集体决策产生真实分化 —— 观众会记住"上次跟着大部队进大厅的人全倒了"，这正是第 72 节"观众每次选择都有真实作用"的具体实现。

`ALL_VIEWERS` 留给 Boss 的范围攻击与世界事件。

### 个体事件的归属

点名、称呼、内部梗等个体互动**不走 `playerEffects`** —— 它们属于 AI Host 的社交层（第 36 节），不是世界事实（P-01）。Host 层的个体互动不改变 `ViewerState`，因此不需要进入确定性 Replay。

### Compiler 检查项

- `DAMAGE` / `HEAL` / `SPEND_LIFE` / `GRANT_LIFE` 必须带 `amount >= 1`
- `REVIVE` 不得带 `amount`
- `scope = OTHER_ACTION_GROUPS` 只允许出现在 `diceMode = "PER_ACTION_GROUP"` 的结算中（第 21 节当前只有这一种模式，此检查为前瞻保护）

---

## A15. `host.public.json` 与 PASS 6 判定规则

第 24 节 PASS 6 要求检查它"不得引用 future / hidden / ending / boss-secret"，但从未定义它的结构。

```typescript
type HostPublicSpec = {
  flagVisibility: Record<string, "PUBLIC" | "HIDDEN">   // 必须穷举所有 flag

  sceneDisclosures: Record<string, SceneDisclosure>     // 必须覆盖所有 SCENE 节点

  tensionLabels: Record<string, string>
  forbiddenTopics?: string[]
}

type SceneDisclosure = {
  locationLabel: string        // → PublicRuntimeState.currentLocation
  knownFactIds: string[]       // → PublicRuntimeState.knownFacts
  tensionKey: string           // → PublicRuntimeState.currentTension
}
```

### PASS 6 的四条判定

1. **穷举性**：`flagVisibility` 必须覆盖 `initial.state.json` 与所有 `StateEffect` 触及的全部 flag 键。**未声明即视为违规**，不得默认为 HIDDEN —— 默认值会让新增 flag 静默泄露。
2. **白名单**：`knownFactIds` 引用的每个事实，其依赖的 flag 必须全部为 `PUBLIC`。
3. **时序性**（关键）：场景 `S` 的 `knownFactIds` 只能引用在**图上 S 及之前可达**的状态所能推出的事实。这是 P-03"AI 不提前知道未来"的编译期执行点，需要 PASS 3 的可达性结果 + PASS 5 的状态可达集合。
4. **隔离性**：`knownFactIds` 不得引用任何 `EndingNode.when` 中出现的 flag，也不得引用 `BossNode.variables` 中的任何键。

### 设计理由

判定 1 的"未声明即违规"是本节最重要的设计。第 24 节的原始表述是"不得引用 future / hidden / ending / boss-secret" —— 这是**黑名单**思路。黑名单在内容持续增长时必然漏项：作者新加一个 flag 忘了标注，就默认泄露。

改为**白名单 + 穷举强制**后，G06（Host Hidden Information Leak = 0）才有可能真正达成。这与 P-03"这是权限隔离，不是 Prompt 约束"的立场一致。

判定 3 需要跨 PASS 协作，这也印证了审计 CR-006 的结论：PASS 6 必须有独立节点（DEV-002A），且必须排在 PASS 3 / PASS 5 之后。

### A15.1 PASS 6 的运行时产物：`ForbiddenLexicon`（CR-010）

PASS 6 已经算出每个场景的**可公开集合**。DEV-002A 必须把它的**补集**作为运行时禁言词表输出到 Runtime Bundle：

```typescript
type ForbiddenLexicon = {
  bySceneId: Record<string, string[]>   // 该场景尚不得出现的表层字串
  always: string[]                      // 全章节始终禁止（结局名、Boss 秘密名等）
}
```

**为什么运行时也需要**：`getPublicState()` 保证 Host **读不到** Hidden State，但观众可以把剧透**喂给** Host，Host 复述出来 —— 泄露照样发生，而读向 Gateway 完全无感。

词表由 DEV-050A Host Egress Gate 在出站前做规范化匹配（去空白、统一大小写、去标点、可选同形字折叠）。词表只能由编译期算出，运行时无从推导。

详见 `CR-RESOLUTIONS-001.md` §1。

---

## A16. `metadata/`

**纯创作期信息，运行时必须忽略。**

```typescript
type ChapterMetadata = {
  synopsis?: string
  tags?: string[]
  contentWarnings?: string[]
  estimatedDurationMinutes?: number
  targetAudience?: string
  authoringNotes?: string
}
```

### Compiler 检查项

仅 Schema 合法性（PASS 1）。**不参与** PASS 2–8 的任何引用、图、覆盖、可达性检查。

明确这一点是为了防止后续把逻辑偷偷塞进 metadata —— 一旦运行时读了它，它就成了事实源，违反 P-01。

---

## A17. `noParticipationPolicy`（顺带覆盖 CR-011）

> **范围说明**：CR-011 属审计中的 P2，未在本次授权范围内明确批准。因它是 `InteractionNode` 的字段、与 Chapter Schema 属同一冻结面，故一并起草。若不批准，删除本节及 §A3 中对应字段即可，不影响其余内容。

第 21 节 `InteractionNode` 增加一个必填字段：

```typescript
type NoParticipationPolicy =
  | { kind: "DEFAULT_CHOICE"; choiceId: "A" | "B" | "C" | "D" }
  | { kind: "SKIP" }
  | { kind: "HOLD"; extendMs: number; maxExtensions: number; thenFallback: NoParticipationPolicy }
```

- `DEFAULT_CHOICE`：按指定选项以 `SOLO` scale 结算，故事继续
- `SKIP`：跳过互动，直接走 `nextScene`
- `HOLD`：延长窗口，用尽次数后回落

### 设计理由

7×24 无人值守必然遇到 0 观众时段（第 62 节要求 168h 连续运行）。当前规范下 `participantCount = 0` 会落到第 10 节最小档 `SOLO` 之外，Rule Engine 无合法输入。

设为**必填不可省略**，与第 22 节 Result Dictionary "不能省略，必须显式 mapsTo 或 unreachable" 是同一种设计纪律：让作者被迫思考边界情形，而不是让运行时猜。

`HOLD` 的 `thenFallback` 不允许再嵌套 `HOLD`（Compiler 检查），避免无限延长。

### Compiler 检查项

- 每个 `InteractionNode` 显式声明该字段（或由 `world.rules.interactionDefaults` 提供且被显式确认继承）
- `DEFAULT_CHOICE.choiceId` 是该 interaction 实际存在的选项，且该选项在 `visibleIf` 恒不成立时不可被选为默认
- `HOLD.thenFallback.kind !== "HOLD"`
- 纳入 PASS 4 Rule Coverage：默认选项在 `SOLO` scale 下必须有完整六等级结果覆盖

---

## A18. 本稿新增的 Compiler 检查项汇总

供 DEV-002 / DEV-002A / DEV-003 施工时对照。

**PASS 1 Schema**
- A1 schemaVersion 支持性；A16 metadata 仅结构校验

**PASS 2 Reference**
- A2 节点注册表与文件一致、无孤儿文件
- A4 diceProfileId / resultSetId、A8 characterAssetId、A9 assetId / defaultExpression
- A10 source 与 file / ttsSpec 互斥必填
- A11 onDefeat / onFailure / interactionId 引用
- A13 RESULT_QUALITY.actionId 引用
- **资产引用完整性**（审计 CR-006：原 PASS 7 的前半段并入此处）

**PASS 3 Graph**
- A2 至少一个 ENDING；A11 Boss 可达 + maxRounds 防环
- A12 所有 Ending 可达、恰一个 fallback、priority 全局唯一

**PASS 4 Rule Coverage**
- A3 scaleBands 值域完整不重叠；A5 qualityThresholds 值域完整不重叠
- A5 未覆盖等级须在 Result Dictionary 显式 unreachable
- A7 共现 ResultNarrative 的 focus.priority 不冲突
- A17 默认选项的 SOLO 六等级覆盖

**PASS 5 State Reachability**
- A6 禁止读未声明键、SceneGuard.priority 唯一、类型化 op 约束
- A12 非兜底结局至少一个可满足解
- A13 REQUIRE_RECOVERY 下恢复路径可达

**PASS 6 Hidden Information（DEV-002A）**
- A15 四条判定：穷举性、白名单、时序性、隔离性

**PASS 7（拆分后）**
- 文件存在性 → DEV-075 Chapter Packager

---

## A19. 决策定稿清单

全部 20 项已于 2026-08-16 定稿。

### 由 USER 直接裁决（产品分叉）

| # | 决策 | 定稿 |
|---|---|---|
| D06 | 角色站位模型 | **固定五档 slot**（LEFT / CENTER_LEFT / CENTER / CENTER_RIGHT / RIGHT）。同屏上限 5 角色；构图确定，DEV-073 可自动导出资产需求 |
| D08 | Boss 形态 | **复用普通 Interaction，零新增运行时模块**。Boss 无独立 HP 字段，血量即 `chapterVariables` 中一个普通数值；相位推进复用 state-rules |
| D10 | DOWNED / SPECTATOR 能否投票 | **不能投票，能聊天**。惩罚玩法参与，不惩罚社交存在 |
| D11 | DOWNED 默认处置 | **`AUTO_SPEND_LIFE`** — 下一轮自动 `life -= 1`、`hp = 1` 站起。总耐受 3 HP + 2 次复起 = 5 次伤害。`world.rules.downedPolicy` 可切换为 `REQUIRE_RECOVERY` |
| D13 | Recovery 主力触发器 | **`RESULT_QUALITY`** — 某 ActionGroup 打出高等级结果时全场复活。「集体行动带来集体救赎」 |

### 由已冻结原则推导定稿（非新增产品决策）

| # | 决策 | 定稿 | 推导依据 |
|---|---|---|---|
| D01 | story.graph 是否重复声明边 | **不重复**，只做节点注册表 | P-01 单一事实源 |
| D02 | Bundle 完整性哈希放哪 | Compiler 生成，不入 raw manifest | §26 Compile–Repair Loop |
| D03 | Action scale 是否用可执行函数 | **不用**，分段映射 + Result 查表 | §24 PASS 5 需静态可分析 |
| D04 | scale 是否影响骰子修正 | **不影响** | §10 人数不得转攻击力 |
| D05 | Condition / Effect 是否允许表达式字符串 | **禁止**，纯数据结构 | §24 PASS 5 需静态可分析 |
| D07 | 是否为镜头设计 DSL | **不设计**，只用 preset 键 | 反过度设计（已批准 P3 立场） |
| D09 | Ending 冲突如何裁决 | 全局唯一 priority + 强制唯一兜底 | G03 Replay 确定性 |
| D12 | 迟到观众初始状态 | **满血满命**，不因加入晚受罚 | §60 first participation rate |
| D14 | playerEffects 粒度 | **批量**，无 viewerId | §9 ResolveInput 只带 participantCount；§61 需测 10,000 viewer |
| D15 | 个体互动（点名等）归属 | Host 社交层，不入 ViewerState，不入 Replay | P-01 |
| D16 | PASS 6 用黑名单还是白名单 | **白名单 + 穷举强制**，未声明即违规 | P-03 权限隔离而非 Prompt 约束 |
| D17 | host.public 是否做时序检查 | **做** | P-03 AI 不提前知道未来 |
| D18 | metadata 是否可被运行时读取 | **禁止** | P-01 |
| D19 | noParticipationPolicy 是否必填 | **必填不可省略** | §22「不能省略」的同一纪律 |
| D20 | audio kind 三分类是否收敛 | 收敛为 SPEECH / BGM / SFX / AMBIENCE + source 三档（含 PREGENERATED） | CR-018 裁决 |

### 相关 CR 状态

全部已裁决，无待批项。

| CR | 裁决 |
|---|---|
| CR-001 / 002 / 003 / 011 | 本稿采纳并冻结 |
| CR-010 | 采纳 — PASS 6 增加 `ForbiddenLexicon` 产物（§A15.1）；新增 DEV-050A |
| CR-012 | 采纳 — 契约归 DEV-012，与 Chapter Schema 无关 |
| CR-017 | 部分采纳 — 落在 DEV-010 与 DEV-040 组 |
| CR-018 | 采纳，机制修正为**块级**预生成（§A10） |
| CR-019 / CR-020 | 已在 DAG 层记录为跨节点约束 |

裁决详见 `specs/audit/CR-RESOLUTIONS-001.md`。
