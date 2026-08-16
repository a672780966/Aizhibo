# TASK PACKAGE — DEV-001

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-001 |
| Node Name | Chapter Schema |
| Milestone | M1 — Story Machine Complete |
| Status | ISSUED → 待 OpenCode 施工 |
| Dependencies | DEV-000（DONE，接口冻结） |
| Commander | Claude |
| Executor | OpenCode |

### 规范原文（第 65 节）

```text
## DEV-001
### Chapter Schema
实现：
Scene / Interaction / Choice / Action / Result / Rule / World State / Narrative / Asset / Audio
所有 JSON Schema / Zod Schema。
```

### 权威输入（按优先级）

1. Dev Spec V1.0 第 14、15、19–22 节（`specs/baseline/DEV_SPEC_V1.0.md`）
2. `specs/audit/SPEC-ADDENDUM-001.md`（§A1–A19，FROZEN）
3. `specs/audit/SPEC-ADDENDUM-002.md`（§B1–B5，FROZEN）——补齐 `DangerState` / `HostPolicy` / `ResultDictionary` 三处此前缺失定义，并更正 WorldState 归属

三份文档合起来是本节点唯一的规范权威，冲突时以后写入者为准（ADDENDUM-002 晚于 ADDENDUM-001）。

---

## 2. Current Objective

交付一个纯数据形状定义包 `packages/chapter-schema`：为 Chapter Pack 的全部内容文件类型提供 Zod schema + 推导 TypeScript 类型，使后续 Compiler（DEV-002 起）能够 `parse()` 出结构正确的对象。

**这是一个纯类型包，不含任何行为逻辑**：

- 不做引用校验（`Scene → Asset` 之类的存在性检查是 PASS 2，属 DEV-002）
- 不做图可达性分析（PASS 3/5，属 DEV-003）
- 不做 Condition 求值或 Effect 应用（属 DEV-004）
- 不做骰子结算（属 DEV-005）
- 不做叙事拼装（属 DEV-033）

`chapter-schema` 只回答一个问题：**这个 JSON 对象的形状对不对**，不回答"它和其它文件放在一起讲不讲得通"。

---

## 3. Scope

### Writable Scope

```
packages/chapter-schema/package.json
packages/chapter-schema/tsconfig.json
packages/chapter-schema/src/index.ts
packages/chapter-schema/src/manifest.ts
packages/chapter-schema/src/manifest.test.ts
packages/chapter-schema/src/worldState.ts
packages/chapter-schema/src/worldState.test.ts
packages/chapter-schema/src/stateRules.ts
packages/chapter-schema/src/stateRules.test.ts
packages/chapter-schema/src/scene.ts
packages/chapter-schema/src/scene.test.ts
packages/chapter-schema/src/interaction.ts
packages/chapter-schema/src/interaction.test.ts
packages/chapter-schema/src/action.ts
packages/chapter-schema/src/dice.ts
packages/chapter-schema/src/action.test.ts
packages/chapter-schema/src/dice.test.ts
packages/chapter-schema/src/result.ts
packages/chapter-schema/src/result.test.ts
packages/chapter-schema/src/narrative.ts
packages/chapter-schema/src/narrative.test.ts
packages/chapter-schema/src/npc.ts
packages/chapter-schema/src/npc.test.ts
packages/chapter-schema/src/visuals.ts
packages/chapter-schema/src/visuals.test.ts
packages/chapter-schema/src/audio.ts
packages/chapter-schema/src/audio.test.ts
packages/chapter-schema/src/boss.ts
packages/chapter-schema/src/boss.test.ts
packages/chapter-schema/src/endings.ts
packages/chapter-schema/src/endings.test.ts
packages/chapter-schema/src/recovery.ts
packages/chapter-schema/src/recovery.test.ts
packages/chapter-schema/src/hostPublic.ts
packages/chapter-schema/src/hostPublic.test.ts
packages/chapter-schema/src/metadata.ts
packages/chapter-schema/src/metadata.test.ts
packages/chapter-schema/src/chapterPack.ts
packages/chapter-schema/src/chapterPack.test.ts

specs/dev/DEV-001/INDEX.md
specs/dev/DEV-001/REQUIREMENTS.md
specs/dev/DEV-001/ACCEPTANCE.md
specs/dev/DEV-001/REPORT.md
specs/dev/DEV-001/DECISIONS.md      （仅在需要记录决策时创建）
specs/dev/DEV-001/BLOCKERS.md       （仅在出现 blocker 时创建）

tsconfig.json                       （根 tsconfig 的 references 追加一行指向 packages/chapter-schema）

specs/comms/LEDGER.md               （仅追加行）
specs/comms/NNNN-OPENCODE-to-*.md   （仅自己发出的消息）
```

### Read-only Scope

```
specs/baseline/DEV_SPEC_V1.0.md
specs/audit/**
specs/protocol/**
specs/PROJECT_INDEX.md
specs/dev/DAG.md
specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
packages/shared/**                  （DEV-000 冻结产物，只读引用，不修改）
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts   （DEV-000 冻结基线，不修改）
```

### Forbidden Scope

```
packages/* 除 chapter-schema 外的任何目录
apps/**
chapters/**
assets/**
scripts/**
tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration
任何网络调用代码
```

---

## 4. Required Skills

### Required

- Zod（schema 定义、`z.infer`、discriminated union、`.refine()`）
- TypeScript strict 模式下的可辨识联合类型设计
- Vitest 单元测试（正例 + 反例）

### Optional

- JSON Schema 概念（用于理解 Compiler 未来如何消费这些 schema，不要求本节点导出 JSON Schema 格式）

### Forbidden / Unnecessary

- 图遍历 / 可达性算法（DEV-003）
- Condition 求值引擎、Effect 应用逻辑（DEV-004）——本节点只定义 `Condition`/`StateEffect` 的**形状**，不实现"给定一个 WorldState，这个 Condition 是否成立"这类函数
- 骰子随机数生成（DEV-005）
- 文本拼装 / 叙事生成（DEV-033）
- 任何文件系统读取、任何 JSON 文件解析器（本节点只导出 schema 对象，不读取任何 `.json` 文件）
- 任何 LLM SDK
- 第 70 节禁止清单全部

---

## 5. Inputs

见第 1 节「权威输入」。补充：

| Input | 用途 |
|---|---|
| `packages/shared`（`Brand`、`Health`） | **不使用**。见第 9 节 Constraints 第 4 条——本节点所有 id 字段保持 `z.string()`，不引入品牌类型；`Health` 不适用于纯数据包（见 ADDENDUM-002 §6） |
| DEV-000 冻结的 `tsconfig.base.json` / `eslint.config.js` / `vitest.config.ts` | 直接复用，不重新配置 |

---

## 6. Outputs

1. `packages/chapter-schema` 包，`pnpm build` 产出 `dist/` 与完整 `.d.ts`
2. 覆盖 Chapter Pack 全部 19 个内容分类（5 根文件 + 14 子目录，见 Dev Spec 第 19 节）的 Zod schema + 推导类型
3. 每个 schema 模块含正例（`.parse()` 成功）与至少一条反例（`.safeParse()` 失败）测试
4. `chapterPack.ts` 聚合导出：一个把全部文件级 schema 按 Dev Spec 第 19 节目录路径映射起来的类型，供 DEV-002 Compiler 直接消费
5. `specs/dev/DEV-001/` 四份（或五份）节点文档

---

## 7. Task Breakdown

> **通用约定（适用于 T003–T019）**：每个模块导出 `XxxSchema`（Zod 对象）与 `type Xxx = z.infer<typeof XxxSchema>`（推导类型），二者同名导出、同文件、同步维护。禁止手写与 Zod schema 不同步的 TS `interface`/`type`。

### T001 — 建立当前节点施工索引与节点文档

- **Objective**：创建 DEV-001 节点文档。
- **Allowed Files**：`specs/dev/DEV-001/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Requirements**：
  1. `INDEX.md` 采用本包第 8 节模板，Task Order 列出 T001–T020。
  2. `REQUIREMENTS.md` 逐条抄录本包第 3、6、9、10 节。
  3. `ACCEPTANCE.md` 逐条抄录本包第 12 节全部 A 项。
  4. `REPORT.md` 先建为骨架，`Status: IN_PROGRESS`。
- **Acceptance**：四文件存在；`INDEX.md` 含原句 `OpenCode 禁止自行推进下一 DEV Node.`；Task Order 恰为 T001–T020。

---

### T002 — 包脚手架

- **Objective**：建立 `packages/chapter-schema` 的编译与依赖基础。
- **Allowed Files**：`packages/chapter-schema/package.json`、`tsconfig.json`、根 `tsconfig.json`
- **Requirements**：
  1. `package.json`：`"name": "@interactive-story/chapter-schema"`、`"private": true`、`"type": "module"`、`"main"`/`"types"` 指向 `dist`、`"exports"` 指向 `dist/index.js` 与 `dist/index.d.ts`、`"scripts": { "build": "tsc -b" }`。
  2. 添加 `zod` 为**运行时依赖**（`dependencies`，非 `devDependencies`）——这是本仓库第一个需要运行时依赖的包，因为 schema 校验在 Compiler 阶段真实执行。选定具体版本并在 `DECISIONS.md` 记录理由。
  3. 包级 `tsconfig.json` extends 根 `tsconfig.base.json`，`outDir: dist`、`rootDir: src`。
  4. 根 `tsconfig.json` 的 `references` 追加一行指向 `packages/chapter-schema`。
  5. **不得**修改 `tsconfig.base.json` 本身（DEV-000 冻结）。
- **Acceptance**：`pnpm install` 成功；`packages/chapter-schema` 出现在 `pnpm ls -r --depth -1`；`zod` 出现在该包 `dependencies` 而非根 `package.json`。

---

### T003 — Manifest / StoryGraph / WorldRules

- **Objective**：交付 Chapter Pack 三个根文件的 schema。
- **Allowed Files**：`src/manifest.ts`、`src/manifest.test.ts`
- **Requirements**：
  1. 实现 `ADDENDUM-001 §A1` 的 `ChapterManifest`。
  2. 实现 `ADDENDUM-001 §A2` 的 `StoryGraph` / `StoryGraphNode`（`kind` 为 `"SCENE"|"BOSS"|"ENDING"` 的可辨识联合或枚举字段）。
  3. 实现 `ADDENDUM-001 §A3` 的 `WorldRules`、`ScaleBand`，以及本文件承载 `NoParticipationPolicy`（`ADDENDUM-001 §A17`，供 T003 自身的 `interactionDefaults` 字段与 T007 的 `InteractionNode` 共同引用）。
  4. `ScaleBand` 的 `scale` 字段使用 `ADDENDUM-001 §A3` 定义的五档字面量联合，不使用字符串枚举以外的表示。
  5. **不实现** Compiler 检查项中列出的任何跨字段一致性校验（如 `entryNodeId` 必须存在于 StoryGraph）——那些是 PASS 1/2 的运行时逻辑，本节点只保证单个字段的类型正确。Zod 允许的 `.refine()` 仅用于**单对象内部**的结构约束（例如 `minDiceMs <= targetDiceMs <= maxDiceMs` 这种同一对象内的数值关系），不得用于跨文件校验。
- **Acceptance**：三个 schema 均能 `parse()` 一个手写合法样例；每个 schema 至少一条反例（缺字段 / 类型错）被 `safeParse()` 拒绝；`WorldRules` 的 `minDiceMs <= targetDiceMs <= maxDiceMs` 约束由 `.refine()` 强制且被测试覆盖违反该约束的反例。

---

### T004 — WorldState / NPCState / DangerState

- **Objective**：交付 `initial.state.json` 的 schema，即第 14 节 `WorldState`。
- **Allowed Files**：`src/worldState.ts`、`src/worldState.test.ts`
- **Requirements**：
  1. 逐字段实现第 14 节 `WorldState`：`chapterId`、`sceneId`、`flags: Record<string, boolean|number|string>`、`npc: Record<string, NPCState>`、`danger: DangerState`、`discovered: string[]`、`activeThreats: string[]`、`chapterVariables: Record<string, unknown>`。
  2. 实现 `ADDENDUM-001 §A8` 的 `NPCState`。
  3. 实现 `ADDENDUM-002 §B2` 的 `DangerState`。
  4. `chapterVariables` 使用 `z.record(z.string(), z.unknown())`——**不得**为其设计更强的类型，它按设计就是开放容器（Boss 变量等注入点，`ADDENDUM-001 §A11`）。
- **Acceptance**：`WorldState` 字段与第 14 节逐字对照一致（字段名、可选性、容器类型）；`DangerState.level` 拒绝负数反例。

---

### T005 — State Rules（Condition / StateEffect / SceneGuard）

- **Objective**：交付贯穿全包的条件与效果基础类型。本任务是后续多个模块的依赖，须先完成。
- **Allowed Files**：`src/stateRules.ts`、`src/stateRules.test.ts`
- **Requirements**：
  1. 实现 `ADDENDUM-001 §A6` 的 `Condition`（含 `EQ|NEQ|GT|GTE|LT|LTE`、`IN`、`EXISTS`、`all`、`any`、`not` 六种/复合形态的可辨识联合）、`StatePath`、`StateEffect`、`StateRuleSet`、`StateRule`、`SceneGuard`。
  2. `StatePath.container` 使用 `"flags"|"npc"|"danger"|"discovered"|"activeThreats"|"chapterVariables"` 字面量联合，与第 14 节 `WorldState` 字段**一一对应**（不多不少，见 `ADDENDUM-001 §A6` 设计理由）。
  3. `Condition` 的递归结构（`all`/`any`/`not` 内嵌 `Condition`）用 Zod 的 `z.lazy()` 实现。
  4. **不实现**求值函数——即不写任何 `evaluate(condition, worldState): boolean` 或 `applyEffect(effect, worldState): WorldState` 之类的行为代码。本任务只产出类型与运行时形状校验。
- **Acceptance**：`Condition` 的 5 种基础比较 + `IN` + `EXISTS` + `all`/`any`/`not` 复合形态均有正例测试；至少一条深度 ≥ 2 的嵌套 `all(any(...))` 正例；反例覆盖 `container` 超出六个枚举值的情况。

---

### T006 — Scene

- **Objective**：交付 §20 `SceneNode`。
- **Allowed Files**：`src/scene.ts`、`src/scene.test.ts`
- **Requirements**：
  1. 实现第 20 节 `SceneNode` 全部字段。
  2. 实现 `ADDENDUM-001 §A9` 的 `CharacterPlacement`（固定五档 `slot`：`LEFT|CENTER_LEFT|CENTER|CENTER_RIGHT|RIGHT`，见 D06 定稿）——**本任务承载它**，不放在 T012 visuals（因为它描述"角色在当前场景的站位"，是场景内容而非角色资产定义，二者是不同关注点）。
  3. 实现 `ADDENDUM-002 §B3` 的 `HostPolicy`。
  4. `SceneNode.guards?: SceneGuard[]` 引用 T005 的 `SceneGuard`。
  5. 同屏 `characters: CharacterPlacement[]` **不强制**去重校验 `slot` 唯一性——留给 Compiler PASS 1（本节点只做单对象形状），但在测试里可以观察到这一点（不校验不等于不测试边界，反例测试聚焦类型错误而非业务规则）。
- **Acceptance**：`slot` 拒绝五档之外的字符串反例；`guards` 字段类型正确引用 T005 的 `SceneGuard`。

---

### T007 — Interaction / Choice

- **Objective**：交付第 21 节 `InteractionNode` / `Choice`，含 `noParticipationPolicy` 必填字段。
- **Allowed Files**：`src/interaction.ts`、`src/interaction.test.ts`
- **Requirements**：
  1. 实现第 21 节 `InteractionNode`、`Choice`。
  2. `InteractionNode.noParticipationPolicy` 为**必填字段**（`ADDENDUM-001 §A17`，D19 定稿：不可省略），类型为该节定义的 `NoParticipationPolicy`（可辨识联合：`DEFAULT_CHOICE`/`SKIP`/`HOLD`）。
  3. `HOLD.thenFallback` 的类型层面**不得**允许其 `kind` 为 `"HOLD"`——用 Zod 在联合类型层面排除，而不是仅靠注释约定（例如 `thenFallback` 的类型标注为 `DefaultChoicePolicy | SkipPolicy` 的联合，物理上不包含 `HoldPolicy`）。
  4. `Choice.visibleIf?: Condition[]` 引用 T005 的 `Condition`。
- **Acceptance**：缺失 `noParticipationPolicy` 字段的对象被拒绝；构造 `thenFallback.kind = "HOLD"` 的对象在类型检查阶段即报错（写一个 `// @ts-expect-error` 测试用例验证），且 `safeParse()` 同样拒绝该形状的运行时输入。

---

### T008 — Action / Dice

- **Objective**：交付 `ADDENDUM-001 §A4`、`§A5`。
- **Allowed Files**：`src/action.ts`、`src/dice.ts`、`src/action.test.ts`、`src/dice.test.ts`
- **Requirements**：
  1. 实现 `ActionDefinition`（引用 T003 的 `ScaleBand`）。
  2. 实现 `DiceProfile`、`QualityThreshold`、`DiceModifier`，`quality` 字段使用 `ADDENDUM-002 §B4` 提升出的具名 `Quality` 类型（在 `result.ts` 定义前，本任务暂时在 `dice.ts` 内联定义 `Quality` 并 re-export；T009 完成后由 T009 成为唯一权威定义——见 T009 Requirement #5 的收尾处理）。
  3. `DiceModifier.when: Condition` 引用 T005。
  4. `scaleSemantics` 字段类型为 `Record<ActionScale, string>` 且标注为文档字段（不参与任何运行时逻辑，本任务只需保证类型存在，不需要特殊处理）。
- **Acceptance**：`QualityThreshold` 的 `min <= max` 由 `.refine()` 强制；反例覆盖 `min > max`。

---

### T009 — Result Dictionary

- **Objective**：交付 `ADDENDUM-001 §A14` + `ADDENDUM-002 §B4`，并把 `Quality` 收编为唯一权威定义。
- **Allowed Files**：`src/result.ts`、`src/result.test.ts`、`src/dice.ts`（仅限移除内联 `Quality`、改为从 `result.ts` 导入）
- **Requirements**：
  1. 在 `result.ts` 中定义唯一权威的 `Quality`（六字面量联合）。
  2. 修改 `dice.ts`：删除 T008 中的内联 `Quality` 定义，改为 `import { Quality } from "./result.js"`。
  3. 实现 `PlayerEffect`、`ViewerScope`（`ADDENDUM-001 §A14`）。
  4. 实现 `ResultEntry`（三分支可辨识联合：完整结果 / `mapsTo` / `unreachable`，`ADDENDUM-002 §B4`）与 `ResultDictionary`。
  5. `ResultEntry` 的三分支必须是 Zod discriminated union 或等效的互斥校验——不得允许一个对象同时携带 `resultId` 与 `mapsTo`。
  6. `ResultEntry.worldEffects: StateEffect[]` 引用 T005。
- **Acceptance**：`Quality` 在全包内只有一处定义（grep 验证 `dice.ts` 不再包含字面量重复定义）；`ResultEntry` 反例覆盖"同时含 `resultId` 与 `mapsTo`"的非法对象。

---

### T010 — Narrative

- **Objective**：交付 `ADDENDUM-001 §A7`。
- **Allowed Files**：`src/narrative.ts`、`src/narrative.test.ts`
- **Requirements**：
  1. 实现 `NarrativeBlock`（`slot` 为 `PREFIX|SUPPORT|PRIMARY|URGENCY|TRANSITION` 五档字面量）、`ResultNarrative`。
  2. `NarrativeBlock.when?: Condition` 引用 T005。
  3. `ResultNarrative.focus` 字段逐字对应 `ADDENDUM-001 §A7` 的 `priority`/`category`/`urgency` 三元组。
- **Acceptance**：`slot` 拒绝五档之外的字符串；`focus.urgency` 拒绝四档（`NONE|LOW|MEDIUM|HIGH`）之外的值。

---

### T011 — NPC（内容定义）

- **Objective**：交付 `ADDENDUM-001 §A8` 的 `NPCDefinition`。
- **Allowed Files**：`src/npc.ts`、`src/npc.test.ts`
- **Requirements**：
  1. 实现 `NPCDefinition`。`initialState: NPCState` 引用 T004 的 `NPCState`。
  2. `characterAssetId` 为 `z.string()`——**不**引用 T012 的任何类型，跨文件的资产存在性属 Compiler PASS 2，本节点只校验它是字符串。
- **Acceptance**：`initialState` 字段类型正确引用 T004。

---

### T012 — Visuals（资产定义）

- **Objective**：交付 `ADDENDUM-001 §A9`（`CharacterPlacement` 除外，已归 T006）。
- **Allowed Files**：`src/visuals.ts`、`src/visuals.test.ts`
- **Requirements**：
  1. 实现 `VisualScene`、`VisualLayer`、`CharacterAsset`、`ImageAsset`。
  2. `cameraPreset?: string`——**不**为镜头设计任何 DSL 或结构化类型（D07 定稿：只用 preset 键）。
- **Acceptance**：`CharacterAsset.expressions` 为 `Record<string, string>`，反例覆盖 `defaultExpression` 类型错误（非字符串）。

---

### T013 — Audio

- **Objective**：交付 `ADDENDUM-001 §A10`（含 CR-018 追加的 `PREGENERATED`）。
- **Allowed Files**：`src/audio.ts`、`src/audio.test.ts`
- **Requirements**：
  1. 实现 `AudioAsset`，`kind` 为 `SPEECH|BGM|SFX|AMBIENCE`，`source` 为 `PREPRODUCED|PREGENERATED|RUNTIME_TTS`。
  2. `source` 与 `file`/`ttsSpec` 的互斥必填关系用 Zod discriminated union 或 `.refine()` 强制（`PREPRODUCED`/`PREGENERATED` 需要 `file`；`RUNTIME_TTS` 需要 `ttsSpec`）。
- **Acceptance**：反例覆盖"`source = RUNTIME_TTS` 但缺 `ttsSpec`"与"`source = PREPRODUCED` 但缺 `file`"两种非法组合。

---

### T014 — Boss

- **Objective**：交付 `ADDENDUM-001 §A11`（D08 定稿：复用普通 Interaction，零新增运行时模块——本任务只是把这份"零新增"的 schema 落地）。
- **Allowed Files**：`src/boss.ts`、`src/boss.test.ts`
- **Requirements**：
  1. 实现 `BossNode`、`BossPhase`。
  2. `BossPhase.enterWhen: Condition` 引用 T005；`hostPolicy: HostPolicy` 引用 T006。
  3. `variables: Record<string, number|boolean|string>`——**不得**为 Boss 变量设计比这更强的类型（呼应 D08：Boss 没有独立 HP 字段，血量只是这个 record 里的一个普通数值）。
  4. `maxRounds?: number` 为正整数（`.refine()` 或 `z.number().int().positive()`）。
- **Acceptance**：`BossNode` 不含任何 `hp`/`health`/`damage`/`attack` 等战斗语义字段名（grep 检查，呼应 D08）。

---

### T015 — Endings

- **Objective**：交付 `ADDENDUM-001 §A12`。
- **Allowed Files**：`src/endings.ts`、`src/endings.test.ts`
- **Requirements**：
  1. 实现 `EndingNode`。`when: Condition | null` 引用 T005。
  2. `isFallback` 与 `when` 的关系（`isFallback = true` 时 `when` 应为 `null`；反之非 `null`）用 `.refine()` 校验单对象内部一致性——**不做**跨节点"全局恰一个 fallback"的校验（那是 PASS 3，属 DEV-003）。
- **Acceptance**：反例覆盖 `isFallback: true` 但 `when` 非 `null` 的非法组合。

---

### T016 — Recovery

- **Objective**：交付 `ADDENDUM-001 §A13.4`。
- **Allowed Files**：`src/recovery.ts`、`src/recovery.test.ts`
- **Requirements**：
  1. 实现 `RecoveryRule`、`RecoveryTrigger`（三种 `kind`：`STATE`/`SCENE_ENTER`/`RESULT_QUALITY` 的可辨识联合）。
  2. `RecoveryRule.scope: ViewerScope`、`effects: ViewerEffect[]` 引用 T009（`ViewerEffect` = `PlayerEffect` 的类型别名，`ADDENDUM-001 §A13.4` 已声明二者复用同一结构）。
  3. `RecoveryTrigger` 的 `RESULT_QUALITY` 分支含 `actionId: string`、`minQuality: Quality`（引用 T009 的 `Quality`）。
- **Acceptance**：三种 `kind` 分支均有正例；反例覆盖 `kind` 超出三值枚举。

---

### T017 — Host Public

- **Objective**：交付 `ADDENDUM-001 §A15`（不含 `ForbiddenLexicon`——那是 DEV-002A 的**运行时产物**，不是章节作者手写的输入，不属于本节点）。
- **Allowed Files**：`src/hostPublic.ts`、`src/hostPublic.test.ts`
- **Requirements**：
  1. 实现 `HostPublicSpec`、`SceneDisclosure`。
  2. `flagVisibility: Record<string, "PUBLIC"|"HIDDEN">`——**不**在 Zod 层面做"是否穷举了所有 flag"的校验，那需要跨文件对照 `initial.state.json` 和全部 `StateEffect`，属 DEV-002A（PASS 6），不是单对象形状校验能做到的。
- **Acceptance**：`flagVisibility` 的 value 拒绝 `PUBLIC`/`HIDDEN` 之外的字符串。

---

### T018 — Metadata

- **Objective**：交付 `ADDENDUM-001 §A16`。
- **Allowed Files**：`src/metadata.ts`、`src/metadata.test.ts`
- **Requirements**：
  1. 实现 `ChapterMetadata`，全部字段可选。
  2. 在模块顶部注释一句：本类型**不参与**任何 Compiler PASS 2–8 的引用/图/覆盖/可达性检查（呼应 `ADDENDUM-001 §A16` 设计理由：防止业务逻辑偷偷读它）——这是注释要求，不是可测试项，但 Acceptance 会检查该注释存在。
- **Acceptance**：注释存在；所有字段均为 `.optional()`。

---

### T019 — ChapterPack 聚合 + 桶导出

- **Objective**：把 T003–T018 的全部 schema 组织成一个供 DEV-002 Compiler 直接消费的聚合类型，并建立包的唯一入口。
- **Allowed Files**：`src/chapterPack.ts`、`src/chapterPack.test.ts`、`src/index.ts`
- **Requirements**：
  1. `chapterPack.ts` 导出一个映射类型，把 Dev Spec 第 19 节的每个文件角色（`manifest`/`storyGraph`/`initialState`/`worldRules`/`hostPublic`，以及五个内容目录各自的条目 schema）关联到对应的 Zod schema，供 Compiler 按文件角色取用。**不实现**任何文件系统读取或路径解析——这是纯粹的类型/schema 索引，不是加载器。
  2. `index.ts` re-export 全部 19 个模块的具名导出（schema + 类型），不做默认导出，不做重新命名。
  3. **不创建**任何名为 `parseChapterPack` / `loadChapter` / `compileChapter` 之类的函数——那是 DEV-002 的职责边界，本节点只到"这里有一堆 schema 对象"为止。
- **Acceptance**：`import * as ChapterSchema from "@interactive-story/chapter-schema"` 能访问到全部 19 个内容分类对应的 schema 与类型；`grep` 确认包内不存在 `parseChapterPack`/`loadChapter`/`compileChapter` 等函数名。

---

### T020 — 全量验证、REPORT 与 commit

- **Objective**：证明节点完成并交付审计材料，接入通信协议。
- **Allowed Files**：`specs/dev/DEV-001/INDEX.md`、`specs/dev/DEV-001/REPORT.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-001.md`
- **Requirements**：
  1. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  2. 按 DEV-000 REPORT 模板填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  3. 更新 `INDEX.md`：T001–T020 全部勾选，`Status: READY_FOR_REVIEW`。
  4. 在 `specs/comms/LEDGER.md` 追加一行取号，创建 `NODE_REPORT` 消息发给 `AUDITOR`（cc `COMMANDER`），信封含 `git_head`（本次 commit 后的 sha）、`changed_files_count`、`commands_run`。
  5. `git add -A && git commit`，提交信息首行：`DEV-001: chapter schema`。
  6. commit 后发出上一步的 `NODE_REPORT` 消息（消息文件本身在 commit 之后创建，属预期的提交后新增，不计入 A 项的 `git status` 判定，做法与 DEV-000 一致）。
  7. **STOP**。不得开始 DEV-008 或任何后续节点。
- **Acceptance**：六条命令全部退出码 0；`REPORT.md` 八节齐全；`git log` 新增恰 1 条提交，首行为 `DEV-001: chapter schema`；LEDGER 含一条 `OPENCODE → AUDITOR` 的 `NODE_REPORT-DEV-001` 记录。

---

## 8. Node INDEX Requirements

```markdown
# DEV-001 INDEX

Status: IN_PROGRESS

## Current Node

DEV-001 — Chapter Schema

## Objective

为 Chapter Pack 全部内容文件类型交付 Zod schema + 推导类型（纯数据形状，无引用校验、无求值逻辑、无图分析）。

## Allowed Scope

（抄录 Task Package 第 3 节 Writable Scope 实际条目）

## Read-only Scope

（抄录 Task Package 第 3 节 Read-only Scope 实际条目）

## Forbidden Scope

（抄录 Task Package 第 3 节 Forbidden Scope 实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 包脚手架
- [ ] T003 Manifest / StoryGraph / WorldRules
- [ ] T004 WorldState / NPCState / DangerState
- [ ] T005 State Rules（Condition / StateEffect / SceneGuard）
- [ ] T006 Scene
- [ ] T007 Interaction / Choice
- [ ] T008 Action / Dice
- [ ] T009 Result Dictionary
- [ ] T010 Narrative
- [ ] T011 NPC
- [ ] T012 Visuals
- [ ] T013 Audio
- [ ] T014 Boss
- [ ] T015 Endings
- [ ] T016 Recovery
- [ ] T017 Host Public
- [ ] T018 Metadata
- [ ] T019 ChapterPack 聚合 + 桶导出
- [ ] T020 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001

## Exit Criteria

`pnpm build` / `pnpm typecheck` / `pnpm lint` / `pnpm format:check` / `pnpm test` 五条命令全部退出码 0；
19 个内容分类全部有 schema + 正反例测试；
`chapterPack.ts` 聚合导出完整；
包内不存在任何求值/编译/加载函数；
REPORT.md 完成且 Status = READY_FOR_REVIEW；
已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **零行为逻辑**。本包不得出现任何形如 `evaluate()`、`apply()`、`resolve()`、`compile()`、`parseChapterPack()`、`loadChapter()` 的函数——它们全部属于后续节点。本包只导出 Zod schema 与推导类型。
2. **零文件 IO**。不读取任何 `.json` 文件，不使用 `fs`。测试中的"正例/反例"一律是手写的 JS 对象字面量，不是从磁盘加载的 fixture 文件。
3. **零跨文件校验**。`.refine()` 只允许约束**同一 schema 内部**的字段关系（如 `min <= max`）；任何需要"查另一个文件是否存在"的校验一律不实现。
4. **不引入品牌类型**。所有 id 字段（`sceneId`、`chapterId`、`actionId` 等）均为 `z.string()`，不使用 `packages/shared` 的 `Brand<T,B>`。ADDENDUM-001/002 冻结的类型签名均以 `string` 声明 id，追加品牌类型需要改动已批准的签名，本节点无权自行决定。
5. **`Quality` 单一权威定义**，见 T009——不得在多个文件重复声明六等级字面量联合。
6. **每个模块同步导出 schema 与类型**（`XxxSchema` + `type Xxx = z.infer<typeof XxxSchema>`），不得手写脱离 Zod 推导的独立 `interface`。
7. **`CR-019`（getHealth 自落地起）不适用于本包**——见 `ADDENDUM-002 §6`，纯数据包无运行时服务可报告健康状态。`AUDITOR` 不应将缺少 `getHealth()` 判为缺陷。
8. Windows 环境：脚本须 Git Bash 与 PowerShell 均可运行。
9. 依赖最小化：本包 `dependencies` 只允许 `zod`。`devDependencies` 沿用 DEV-000 白名单，不新增。
10. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`（`blocking: true`），继续其它不受影响 Task，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现 Chapter Compiler 的任何 PASS（1–8），不实现引用校验、图可达性、Coverage 检查、Hidden Information 检查——全部属 DEV-002 / DEV-002A / DEV-003 / DEV-006。
- 不实现 Condition 求值函数或 StateEffect 应用函数——属 DEV-004。
- 不实现骰子随机数生成或 `finalValue → quality` 查表逻辑——属 DEV-005。
- 不实现叙事块拼装逻辑——属 DEV-033。
- 不创建任何示例/参考 Chapter Pack（`chapters/` 目录、完整的多文件 JSON 示例）——留给需要真实内容验证自身的后续节点（如 DEV-002 或 DEV-007）按需构建，本节点的测试 fixture 仅为内联 JS 对象。
- 不实现 `ForbiddenLexicon`（DEV-002A 的运行时产物，不是作者输入）。
- 不实现 `ViewerState` 的 Zod schema（不在 Chapter Pack 目录结构内，延后到实际需要它的节点）。
- 不修改 `packages/shared`。
- 不引入品牌类型、不引入表达式语言、不引入新状态容器（沿用 ADDENDUM-001 起草纪律）。
- 不为镜头设计 DSL（D07）。
- 不为 Boss 设计独立战斗系统字段（D08）。
- 不实现任何 CI 变更（DEV-000 的 CI 步骤对新包自动生效，因为它们跑的是根级命令）。

---

## 11. Tests

### Unit tests

T003–T019 每个模块的 `.test.ts`：至少一条正例（`.parse()` 成功）+ 至少一条反例（`.safeParse().success === false`）。可辨识联合类型需覆盖每个分支各一条正例。

### Contract tests

不适用——本节点本身就是在**定义**未来的 Contract（`ADDENDUM-001` 已是权威规格），尚无消费者可供契约测试。

### Integration / Simulation / Replay / Fuzz / Soak tests

不适用（属后续节点）。

### Regression tests

不适用于 `packages/shared`（DEV-000 冻结接口未被本节点触碰，`packages/shared` 的既有测试应保持通过——`pnpm test` 覆盖全 workspace，若因本节点改动导致 `shared` 测试失败即为 BLOCKING）。

---

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含 `packages/shared` 与 `packages/chapter-schema` 两包） | 命令 |
| A03 | `pnpm lint` 退出码 0，0 error / 0 warning | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0，`packages/chapter-schema/dist/index.d.ts` 存在 | 命令 + 文件检查 |
| A06 | `pnpm test` 退出码 0，`packages/shared` 原有 2 个测试文件仍全部通过（无回归），`packages/chapter-schema` 新增 17 个测试文件（T003–T019）全部通过 | 命令输出 |
| A07 | 根 `package.json` 与 `packages/chapter-schema/package.json` 的 `dependencies` 恰为 `{ zod }`；根 `package.json` 无 `dependencies` | 文件检查 |
| A08 | `packages/*` 恰为 `shared` 与 `chapter-schema` 两个包，无其它包目录 | 文件检查 |
| A09 | `apps/`、`chapters/`、`assets/`、`scripts/`、`tools/` 均不存在 | 文件检查 |
| A10 | 19 个内容分类（manifest / storyGraph / worldRules / worldState-npcState-dangerState / stateRules / scene / interaction-choice / action-dice / result / narrative / npc / visuals / audio / boss / endings / recovery / hostPublic / metadata / chapterPack）均有对应 `.ts` 模块与 `.test.ts` | 文件检查 |
| A11 | `Quality` 类型全包只在 `result.ts` 定义一次，`dice.ts` 通过 import 引用 | grep 检查 |
| A12 | `WorldState` 字段与 Dev Spec 第 14 节逐字对照一致 | 文本比对 |
| A13 | `DangerState`、`HostPolicy`、`ResultEntry`/`ResultDictionary` 与 `ADDENDUM-002 §B2/B3/B4` 逐字对照一致 | 文本比对 |
| A14 | `NoParticipationPolicy` 必填于 `InteractionNode`；`HOLD.thenFallback` 的类型层面不允许 `kind: "HOLD"`（`@ts-expect-error` 测试存在且通过） | 代码 + 测试检查 |
| A15 | `CharacterPlacement.slot` 为五档字面量联合，反例被拒绝 | 测试检查 |
| A16 | `BossNode`/`BossPhase` 不含 `hp`/`health`/`damage`/`attack` 等字段名 | grep 检查 |
| A17 | `AudioAsset` 的 `source`/`file`/`ttsSpec` 互斥必填关系有测试覆盖两种非法组合 | 测试检查 |
| A18 | `EndingNode` 的 `isFallback`/`when` 一致性由 `.refine()` 强制且有反例测试 | 测试检查 |
| A19 | `ResultEntry` 三分支互斥，反例覆盖"同时含 resultId 与 mapsTo" | 测试检查 |
| A20 | 包内不存在 `evaluate`/`apply`/`resolve`/`compile`/`parseChapterPack`/`loadChapter` 等函数名（grep，允许 Zod 内置的 `.parse`/`.safeParse` 方法调用，不含独立同名函数定义） | grep 检查 |
| A21 | 包内不存在任何 `fs`/`node:fs` 导入 | grep 检查 |
| A22 | 所有 id 字段类型为 `z.string()`，未从 `@interactive-story/shared` 导入 `Brand` | grep 检查 |
| A23 | `chapterPack.ts` 的聚合映射覆盖 Dev Spec 第 19 节列出的全部 5 根文件角色与 14 子目录条目类型 | 代码检查 |
| A24 | `metadata.ts` 顶部含"不参与 PASS 2–8"注释；所有字段 `.optional()` | 文本 + 代码检查 |
| A25 | `specs/dev/DEV-001/` 含 INDEX / REQUIREMENTS / ACCEPTANCE / REPORT 四份文档，`INDEX.md` 含原句 `OpenCode 禁止自行推进下一 DEV Node.`，T001–T020 全部勾选 | 文件 + 文本检查 |
| A26 | `git log` 新增恰 1 条提交，首行 `DEV-001: chapter schema`；`git status --porcelain` 在该提交时为空 | 命令 |
| A27 | `specs/comms/LEDGER.md` 含一条 `OPENCODE → AUDITOR` 的 `NODE_REPORT-DEV-001` 记录，对应消息文件存在，信封 `git_head` 与提交 sha 一致 | LEDGER + 文件 + 命令比对 |
| A28 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**`、`packages/shared/**`、`tsconfig.base.json`、`eslint.config.js`、`.prettierrc.json`、`vitest.config.ts` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

1. 更新 `specs/dev/DEV-001/INDEX.md`，勾选 T001–T020。
2. 运行第 11 节全部验证命令。
3. Regression：确认 `packages/shared` 既有测试无回归。
4. 填写 `REPORT.md`，逐条对应 A01–A28。
5. `INDEX.md` 与 `REPORT.md` Status 均设为 `READY_FOR_REVIEW`。
6. 执行 T020 的 git commit。
7. 追加 LEDGER 行，发出 `NODE_REPORT` 给 `AUDITOR`（cc `COMMANDER`）。
8. **STOP**。不得开始任何后续 DEV 节点，不得修改 `specs/PROJECT_INDEX.md` 或 `specs/dev/DAG.md`。

---

## REPORT.md 模板

沿用 DEV-000 REPORT 模板（Status / Implemented / Changed Files / Tests Executed / Acceptance Results / Scope Deviations / Known Issues / Blockers / Future Considerations 八节），Acceptance Results 覆盖 A01–A28。
