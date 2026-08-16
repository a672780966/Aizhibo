# TASK PACKAGE — DEV-002

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-002 |
| Node Name | Chapter Compiler Core（PASS 1 + PASS 2） |
| Milestone | M1 — Story Machine Complete |
| Status | ISSUED → 待 OpenCode 施工 |
| Dependencies | DEV-001（DONE，接口冻结，`git_head cbcbd8d`） |
| Commander | Claude |
| Executor | OpenCode |

### 规范原文（第 65 节）

```text
## DEV-002
### Chapter Compiler Core
实现：
Schema validation / Reference validation / Graph validation / Coverage
依赖：
DEV-001。
```

**本节点只做前两项**（Schema validation、Reference validation）。Graph validation 与 Coverage 由 `DAG.md` CR-006 重新分配给下游节点：

| PASS | 归属 |
|---|---|
| PASS 1 Schema | **DEV-002（本节点）** |
| PASS 2 Reference（含资产**引用**完整性，吸收原 PASS 7 前半段） | **DEV-002（本节点）** |
| PASS 3 Graph | DEV-003 |
| PASS 4 Rule Coverage | DEV-006 |
| PASS 5 State Reachability | DEV-003 |
| PASS 6 Hidden Information | DEV-002A |
| PASS 7 Asset 文件存在性 | DEV-075 |
| PASS 8 Simulation | DEV-007 |

### 权威输入

1. Dev Spec V1.0 第 19、23、24 节
2. `packages/chapter-schema`（DEV-001 冻结产物，本节点唯一的类型/校验来源）
3. `specs/audit/SPEC-ADDENDUM-001.md` §A1–A19（尤其 §A18 Compiler 检查项汇总）
4. `specs/audit/SPEC-ADDENDUM-002.md` §B1–B5
5. `specs/dev/DAG.md` CR-006 决议

---

## 2. Current Objective

交付 `packages/chapter-compiler`：一个把**磁盘上的原始 Chapter Pack 目录**读入内存、跑完 PASS 1（Schema）与 PASS 2（Reference）、产出结构化错误/成功报告的纯函数库。

**这是全仓库第一个被授权读取文件系统的包**——DEV-001 明确禁止 IO，本节点是 IO 边界的合法起点。

**本节点不产出"最终 Validated Runtime Bundle"**。全部 8 个 PASS 分布在 6 个不同节点（DEV-002/002A/003/006/007，另 DEV-075 管文件存在性），谁来组装最终 Bundle 尚未有定论——这是一个跨节点的开放设计问题，本节点**明确不解决它**，只暴露 `runPass1()`/`runPass2()`/`compile()`（仅含 PASS1+2）三个函数供下游按需组合。

---

## 3. Scope

### Writable Scope

```
packages/chapter-compiler/package.json
packages/chapter-compiler/tsconfig.json
packages/chapter-compiler/src/index.ts
packages/chapter-compiler/src/types.ts
packages/chapter-compiler/src/types.test.ts
packages/chapter-compiler/src/loader.ts
packages/chapter-compiler/src/loader.test.ts
packages/chapter-compiler/src/pass1Schema.ts
packages/chapter-compiler/src/pass1Schema.test.ts
packages/chapter-compiler/src/pass1Uniqueness.ts
packages/chapter-compiler/src/pass1Uniqueness.test.ts
packages/chapter-compiler/src/referenceIndex.ts
packages/chapter-compiler/src/referenceIndex.test.ts
packages/chapter-compiler/src/pass2StoryGraph.ts
packages/chapter-compiler/src/pass2StoryGraph.test.ts
packages/chapter-compiler/src/pass2ActionChain.ts
packages/chapter-compiler/src/pass2ActionChain.test.ts
packages/chapter-compiler/src/pass2NpcVisuals.ts
packages/chapter-compiler/src/pass2NpcVisuals.test.ts
packages/chapter-compiler/src/pass2BossRecovery.ts
packages/chapter-compiler/src/pass2BossRecovery.test.ts
packages/chapter-compiler/src/compile.ts
packages/chapter-compiler/src/compile.test.ts
packages/chapter-compiler/test-fixtures/**

specs/dev/DEV-002/INDEX.md
specs/dev/DEV-002/REQUIREMENTS.md
specs/dev/DEV-002/ACCEPTANCE.md
specs/dev/DEV-002/REPORT.md
specs/dev/DEV-002/DECISIONS.md      （仅在需要记录决策时创建）
specs/dev/DEV-002/BLOCKERS.md       （仅在出现 blocker 时创建）

tsconfig.json                       （追加一行 references 指向 packages/chapter-compiler）

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
packages/shared/**           （冻结）
packages/chapter-schema/**   （DEV-001 冻结产物，只读引用，不修改）
packages/runtime-kernel/**   （DEV-008 冻结产物；本节点不依赖它，也不得修改）
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts
```

### Forbidden Scope

```
packages/* 除 chapter-compiler 外的任何目录
apps/**
chapters/**    （真实内容目录，不得在此创建测试用途的示例章节；测试 fixture 一律放
                 packages/chapter-compiler/test-fixtures/）
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

- Node.js 文件系统 API（`node:fs`、`node:path`，同步或 `fs/promises` 均可，本节点无并发/性能要求）
- Zod `.safeParse()` 与 `ZodError.issues` 的结构化错误提取
- 图/引用完整性校验的一般模式（构建 id → 存在性 的查找表，再遍历所有引用字段核对）
- Vitest 单元测试（正例 + 反例，含多文件夹 fixture 组织）

### Optional

- TypeScript discriminated union 上的 exhaustive switch（用于按 §19 文件角色分发校验逻辑）

### Forbidden / Unnecessary

- 图可达性 / 环检测算法（DEV-003 的 PASS 3）
- Condition 求值、StateEffect 应用（DEV-004）
- 骰子随机数、`finalValue → quality` 查表运行时逻辑（DEV-005）
- 叙事文本拼装（DEV-033）
- `host.public.json` 穷举性 / 白名单校验（DEV-002A 的 PASS 6）
- 资产**文件**存在性校验（`fs.existsSync` 检查图片/音频实体文件）——DEV-075，本节点只管"引用的 id 在对应集合里有没有声明"
- 第三方 glob 库（`fast-glob`/`globby` 等）——§19 目录结构固定已知，用简单的 `readdirSync` 逐目录读取即可，引入 glob 库是无谓依赖
- 任何 LLM SDK、任何 HTTP 客户端、任何数据库
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `@interactive-story/chapter-schema` 全部 19 个模块 | 每类内容文件对应的 Zod schema + 推导类型 |
| Dev Spec 第 19 节 | Chapter Pack 目录结构（本节点 Loader 的遍历依据） |
| `ADDENDUM-001 §A18` | PASS 1/PASS 2 检查项的既有分类（起点，本任务包据此精化到具体字段） |
| `ADDENDUM-002 §B4` | `ResultDictionary`/`ResultEntry` 的 `mapsTo` 自洽性规则 |

---

## 6. Outputs

1. `packages/chapter-compiler`，`pnpm build` 产出完整 `.d.ts`
2. `loadChapterPack(rootDir: string): RawChapterPack`——从磁盘加载，JSON 语法错误转为结构化 `LoadIssue[]`，不 throw
3. `runPass1(raw: RawChapterPack): Pass1Result`——逐项 Zod 校验 + 集合内 id 去重
4. `runPass2(raw: RawChapterPack, pass1: Pass1Result): Pass2Result`——仅对 PASS1 通过的条目建立引用索引并校验交叉引用
5. `compile(rootDir: string): CompileResult`——串联以上三步的便捷入口
6. 覆盖全部 19 个内容分类的测试 fixture（1 份最小合法 Chapter Pack + 若干针对性损坏 fixture）
7. `specs/dev/DEV-002/` 四份（或五份）节点文档

---

## 7. Task Breakdown

### T001 — 节点文档

- **Objective**：创建 DEV-002 节点文档。
- **Allowed Files**：`specs/dev/DEV-002/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Requirements**：INDEX 采用第 8 节模板，Task Order 列 T001–T013；REQUIREMENTS 抄第 3/6/9/10 节；ACCEPTANCE 抄第 12 节全部 A 项；REPORT 建骨架，`Status: IN_PROGRESS`。
- **Acceptance**：四文件存在；`INDEX.md` 含原句 `OpenCode 禁止自行推进下一 DEV Node.`；Task Order 恰 T001–T013。

---

### T002 — 包脚手架

- **Objective**：建立 `packages/chapter-compiler` 编译与依赖基础。
- **Allowed Files**：`packages/chapter-compiler/package.json`、`tsconfig.json`、根 `tsconfig.json`
- **Requirements**：
  1. `package.json`：`"name": "@interactive-story/chapter-compiler"`，结构比照 `chapter-schema`（`private`/`type: module`/`main`+`types`指向`dist`/`exports`/`scripts.build`）。
  2. `dependencies` 恰含 `@interactive-story/chapter-schema`（workspace 协议引用）与 `zod`——**`zod` 版本必须与 `chapter-schema` 使用的版本完全一致**（不同版本的 Zod 实例可能导致 schema 互操作问题），在 `DECISIONS.md` 记录版本对齐依据。
  3. 包级 `tsconfig.json` extends `../../tsconfig.base.json`，`outDir: dist`、`rootDir: src`，并通过 `references` 指向 `../chapter-schema`。
  4. 根 `tsconfig.json` 的 `references` 追加一行指向 `packages/chapter-compiler`。
- **Acceptance**：`pnpm install` 成功；`packages/chapter-compiler` 出现在 `pnpm ls -r --depth -1`；其 `zod` 版本与 `packages/chapter-schema/package.json` 的 `zod` 版本字符串相同。

---

### T003 — Loader

- **Objective**：把磁盘上的 Chapter Pack 目录读成内存对象，此为全仓库首个合法 IO 点。
- **Allowed Files**：`src/types.ts`、`src/types.test.ts`、`src/loader.ts`、`src/loader.test.ts`
- **Requirements**：
  1. `types.ts` 定义 `RawChapterPack`：按 Dev Spec 第 19 节的 5 根文件角色 + 14 子目录，每个字段类型为 `unknown`（根文件）或 `Array<{ file: string; content: unknown }>`（子目录条目集合）——**校验前不假设任何结构**，因为这一层还没跑 Zod。
  2. `types.ts` 同时定义 `LoadIssue`（`{ kind: "JSON_SYNTAX_ERROR" | "FILE_READ_ERROR"; path: string; message: string }`）。
  3. `loader.ts` 导出 `loadChapterPack(rootDir: string): { raw: RawChapterPack; issues: LoadIssue[] }`。按 Dev Spec 第 19 节固定的目录/文件名遍历（根文件用 `path.join(rootDir, "manifest.json")` 等；子目录用 `fs.readdirSync` 读取 `.json` 文件列表）。
  4. **不使用第三方 glob 库**，不使用 `fs.watch`/异步流式 IO——同步读取即可（Compiler 是离线批处理工具，非服务）。
  5. 单个文件 JSON 语法错误或读取失败**不得让整个 Loader 抛异常**——记录为 `LoadIssue`，继续加载其余文件，让 PASS 1 报告能一次性看到所有问题（呼应第 24 节 Compile–Repair Loop 的设计意图：AI Repair 需要尽可能完整的错误列表）。
  6. 根文件缺失（如没有 `manifest.json`）同样记为 `LoadIssue`，不抛异常。
- **Acceptance**：对一个混有 1 个语法错误 JSON 与若干正常文件的 fixture 目录调用，`loadChapterPack` 正常返回（不抛异常），`issues` 含且仅含那 1 条 `JSON_SYNTAX_ERROR`，其余文件正常出现在 `raw` 里。

---

### T004 — PASS 1：Schema 校验

- **Objective**：对 `RawChapterPack` 逐项跑 chapter-schema 的 Zod schema。
- **Allowed Files**：`src/pass1Schema.ts`、`src/pass1Schema.test.ts`
- **Requirements**：
  1. 导出 `runSchemaValidation(raw: RawChapterPack): SchemaValidationResult`。
  2. `SchemaValidationResult` 按 Dev Spec 第 19 节的 19 个内容分类分别记录：每个分类是「通过校验的条目列表（已获得强类型）」+「失败条目的错误列表（`{ file, issues: ZodIssue[] }`）」。
  3. 对每个 `ZodError`，**保留 `issues` 原始结构**（`path`/`message`/`code`），不得压缩成单一字符串——下游 AI Repair（第 26 节，非本节点范围）需要结构化定位。
  4. `manifest.json`、`story.graph.json`、`world.rules.json`、`initial.state.json`、`host.public.json` 五个根文件各自只有一份，直接调用对应 schema；14 个子目录下每个 `.json` 文件独立跑对应 schema。
  5. 本任务**不做**任何跨文件校验——单文件 schema 不过，只记录失败，不影响其它文件的独立校验结果。
- **Acceptance**：对 T012 制作的"每类内容各一条合法 + 一条非法"的 fixture，19 个分类的合法条目全部 PASS、非法条目全部 FAIL 且 `issues` 非空。

---

### T005 — PASS 1：ID 唯一性

- **Objective**：交付 Dev Spec 第 24 节 PASS1"ID 唯一"要求。
- **Allowed Files**：`src/pass1Uniqueness.ts`、`src/pass1Uniqueness.test.ts`
- **Requirements**：
  1. 导出 `checkIdUniqueness(schemaResult: SchemaValidationResult): UniquenessIssue[]`，**只检查 PASS1 Schema 已通过的条目**（未通过的条目 id 可能都不合法，不纳入去重判断）。
  2. 对以下集合各自检查**集合内**唯一：scenes、interactions、actions、dice profiles、result dictionaries（`ResultDictionary.id`，不检查其内部 `ResultEntry` 因为它们没有独立 id，靠 quality 六选一约束）、narrative blocks、result narratives、npc definitions、visual scenes、character assets、image assets、audio assets、boss nodes、endings、recovery rules。
  3. `story.graph.json` 的 `StoryGraphNode[]` 额外检查**跨 scene/boss/ending 全局唯一**（`ADDENDUM-001 §A2` 已声明的规则：故事图节点共享一个 id 命名空间）——这与其它 14 类"各自集合内唯一"不同，需单独实现，不能套用通用的"同分类去重"逻辑。
  4. `UniquenessIssue` 记录 `{ category, id, conflictingFiles: string[] }`。
- **Acceptance**：fixture 中放置两个同 id 的 `scenes/*.json` 触发集合内冲突；放置一个 `boss/*.json` 与某个 `scenes/*.json` 共用 id 触发跨类冲突（后者若被误判为"不同分类互不冲突"即为该 Task 失败）。

---

### T006 — 引用索引

- **Objective**：为 PASS 2 建立统一的"id → 是否存在"查找基础设施，供 T007–T010 共用。
- **Allowed Files**：`src/referenceIndex.ts`、`src/referenceIndex.test.ts`
- **Requirements**：
  1. 导出 `buildReferenceIndex(schemaResult: SchemaValidationResult): ReferenceIndex`。
  2. `ReferenceIndex` 为每个内容分类提供一个 `Set<string>`（该分类下所有**通过 PASS1** 的条目 id），以及必要的辅助查找（例如 `characterAssets: Map<string, Set<string>>` 记录每个 CharacterAsset 的 `expressions` 键集合，供 T009 的两跳校验使用）。
  3. **本任务只建索引，不做任何校验判断**——T007–T010 消费这个索引产出实际的 Finding。
- **Acceptance**：索引条目数与 T004 产出的"通过 PASS1"条目数一一对应；对某个 CharacterAsset 的 `expressions: { happy: "...", sad: "..." }`，索引中对应键集合恰为 `{"happy", "sad"}`。

---

### T007 — PASS 2：故事图一致性

- **Objective**：交付 story graph 相关的全部交叉引用检查。
- **Allowed Files**：`src/pass2StoryGraph.ts`、`src/pass2StoryGraph.test.ts`
- **Requirements**：校验以下各项，每项产出独立可辨识的 `ReferenceIssue`：
  1. `ChapterManifest.entryNodeId` 存在于 `story.graph.json` 的节点注册表中，且该节点 `kind === "SCENE"`（`ADDENDUM-001 §A1` Compiler 检查项）。
  2. `StoryGraphNode[]` 中每个节点的 `file` 路径指向的文件存在，且该文件内容解析出的 `id` 与注册表中的 `id` 一致（`ADDENDUM-001 §A2`）。
  3. `scenes/`、`boss/`、`endings/` 目录下的每个文件都在 `story.graph.json` 注册表中出现——**无孤儿文件**（同上 §A2）。
  4. `SceneNode.next`（若存在）指向已注册的节点 id。
  5. `SceneNode.guards[].goto`（若存在）指向已注册的节点 id。
  6. `SceneNode.interactionId`（若存在）指向 `interactions/` 中已声明的 `InteractionNode.id`。
  7. `InteractionNode.nextScene` 指向已注册的节点 id。
  8. `BossNode.onDefeat` / `onFailure` 指向已注册的节点 id（`ADDENDUM-001 §A11`）。
- **Acceptance**：8 条各至少 1 条正例（引用合法）+ 1 条反例（引用不存在的 id）。

---

### T008 — PASS 2：Action / Dice / Result 链路

- **Objective**：交付行动结算链路上的引用完整性。
- **Allowed Files**：`src/pass2ActionChain.ts`、`src/pass2ActionChain.test.ts`
- **Requirements**：
  1. `Choice.ruleId` 指向 `actions/` 中已声明的 `ActionDefinition.id`（第 21 节 `Choice.ruleId` 语义为"引用一个 Action 定义"——命名沿用规范原文，实际指向 Action，见本包 `DECISIONS.md` 需记录这条命名澄清）。
  2. `ActionDefinition.diceProfileId` 指向 `dice/` 中已声明的 `DiceProfile.id`（`ADDENDUM-001 §A4`）。
  3. `ActionDefinition.resultSetId` 指向 `results/` 中已声明的 `ResultDictionary.id`（同上）。
  4. `ResultEntry`（完整结果分支）的 `narrativeId` 指向 `narrative/` 中已声明的 `ResultNarrative.id`（`ADDENDUM-002 §B4` + `ADDENDUM-001 §A7`）。
  5. `ResultEntry`（`mapsTo` 分支）的 `mapsTo` 目标必须指向**同一个 `ResultDictionary`** 内某条非 `mapsTo` 的 entry（`ADDENDUM-002 §B4` 已声明的自洽规则；这是**单文件内部**引用，不查其它文件，但仍属"引用完整性"范畴，故归入 PASS2 而非 PASS1）。
  6. `RecoveryRule`（`kind: "RESULT_QUALITY"`）的 `actionId` 指向 `actions/` 中已声明的 `ActionDefinition.id`（`ADDENDUM-001 §A13` Compiler 检查项）。
- **Acceptance**：6 条各至少 1 条正例 + 1 条反例；第 5 条额外测试"`mapsTo` 指向另一个 `mapsTo` entry"（链式 mapsTo）必须被拒绝。

---

### T009 — PASS 2：NPC / Visuals 链路

- **Objective**：交付角色呈现相关的引用完整性，含一处需要 Commander 澄清的设计空白。
- **Allowed Files**：`src/pass2NpcVisuals.ts`、`src/pass2NpcVisuals.test.ts`
- **Requirements**：
  1. `NPCDefinition.characterAssetId` 指向 `visuals/` 中已声明的 `CharacterAsset.id`（`ADDENDUM-001 §A8`）。
  2. **`SceneNode.characters[].characterId` 指向 `npc/` 中已声明的 `NPCDefinition.id`。**
     > **Commander 澄清**：`ADDENDUM-001 §A9` 定义 `CharacterPlacement.characterId: string` 时未明确它引用哪个集合。现予明确：引用 `NPCDefinition.id`（叙事实体），而非直接引用 `CharacterAsset.id`（视觉资产）——因为一个 NPC 在不同场景可能换装/换资产，`NPCDefinition → CharacterAsset` 才是资产绑定关系，`CharacterPlacement → NPCDefinition` 是"这场戏里谁在场"。这不改变任何已冻结字段的类型（两者都是 `string`），只是补一条此前遗漏的 Compiler 检查项，不需要走 ADDENDUM 增补流程。
  3. `CharacterPlacement.expression`（若存在）必须是该 `characterId` 对应 `NPCDefinition.characterAssetId` 所指 `CharacterAsset.expressions` 的一个合法键（两跳引用：`Scene → NPC → CharacterAsset.expressions`）。若 `characterId` 或 `characterAssetId` 本身已经在第 2 条报错，本条**不重复报错**（避免同一根因产生级联噪音）。
- **Acceptance**：三条各至少 1 正例 + 1 反例；第 3 条额外验证"根因是 `characterId` 不存在时不重复报 `expression` 错误"（错误数量断言）。

---

### T010 — PASS 2：Boss 引用收尾

- **Objective**：补齐 Boss 相关、未被 T007/T008 覆盖的引用。
- **Allowed Files**：`src/pass2BossRecovery.ts`、`src/pass2BossRecovery.test.ts`
- **Requirements**：
  1. `BossPhase.interactionId` 指向 `interactions/` 中已声明的 `InteractionNode.id`（`ADDENDUM-001 §A11`）。
  2. 该 `InteractionNode.nextScene` 应指回本 Boss 节点或其 `onDefeat`/`onFailure` 之一（`ADDENDUM-001 §A11` Compiler 检查项第 3 条）——本条产生 `ReferenceIssue`（非 BLOCKING 级的强制中断，因为这是内容设计约定而非纯粹的存在性检查，但仍需报告）。
- **Acceptance**：两条各至少 1 正例 + 1 反例。

---

### T011 — compile() 编排

- **Objective**：把 T003–T010 串成一个入口，定义清晰的部分成功语义。
- **Allowed Files**：`src/compile.ts`、`src/compile.test.ts`
- **Requirements**：
  1. 导出 `compile(rootDir: string): CompileResult`，内部顺序：`loadChapterPack` → `runSchemaValidation` → `checkIdUniqueness` → `buildReferenceIndex` → 依次调用 T007–T010 的四个校验函数。
  2. `CompileResult` 结构：`{ loadIssues, schemaResult, uniquenessIssues, referenceIssues, passed: boolean }`；`passed` 仅当 `loadIssues`、schema 失败条目、`uniquenessIssues`、全部 `referenceIssues` 均为空时为 `true`。
  3. **PASS 2 只对 PASS1 通过的条目建立引用索引**（T006 已如此设计）——一个 schema 都没过的文件，其"引用了什么"没有意义，不应该在 PASS2 里产生大量派生的"目标不存在"噪音。
  4. `compile()` 本身**不写任何输出文件**，纯粹返回内存中的结果对象——是否写 Bundle 文件、写到哪里，留给尚未确定归属的后续工作。
- **Acceptance**：对 T012 的合法 fixture，`compile()` 返回 `passed: true`；对综合损坏 fixture（同时含 T004–T010 各类问题），`passed: false` 且四类 issue 数组均非空，互相印证。

---

### T012 — 测试 Fixture

- **Objective**：建立本包全部测试共用的 Chapter Pack fixture。
- **Allowed Files**：`packages/chapter-compiler/test-fixtures/**`
- **Requirements**：
  1. `test-fixtures/valid-minimal/`：一份**最小但覆盖全部 19 个内容分类**的合法 Chapter Pack（每类至少 1 个条目，故事图至少含 1 个 SCENE + 1 个 ENDING 且可达，`isFallback` 唯一）。
  2. `test-fixtures/broken-*/`：每种主要失败模式一个独立 fixture 目录（JSON 语法错误、schema 类型错误、id 重复、跨类 id 冲突、悬空引用各若干组），文件名自解释。
  3. **本目录不是 `chapters/`**（Forbidden Scope），且这些 fixture 不代表任何真实产品内容，纯粹是测试数据。
- **Acceptance**：`valid-minimal` 能让 T011 的 `compile()` 返回 `passed: true`；每个 `broken-*` fixture 都能让对应的 Task（T004/T005/T007/T008/T009/T010）的测试复现预期错误。

---

### T013 — 全量验证、REPORT 与 commit

- **Objective**：证明节点完成并交付审计材料，接入通信协议。
- **Allowed Files**：`specs/dev/DEV-002/INDEX.md`、`specs/dev/DEV-002/REPORT.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-002.md`
- **Requirements**：
  1. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  2. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  3. 更新 `INDEX.md`：T001–T013 全部勾选，`Status: READY_FOR_REVIEW`。
  4. `git add -A && git commit`，提交信息首行：`DEV-002: chapter compiler core (PASS 1+2)`。
  5. 追加 LEDGER 行，发 `NODE_REPORT` 给 `AUDITOR`（cc `COMMANDER`），信封含 `git_head`、`changed_files_count`、`commands_run`。
  6. **STOP**。不得开始任何后续 DEV 节点。
- **Acceptance**：六条命令全部退出码 0；`REPORT.md` 八节齐全；`git log` 新增恰 1 条提交；LEDGER 含新 `NODE_REPORT-DEV-002` 记录。

---

## 8. Node INDEX Requirements

```markdown
# DEV-002 INDEX

Status: IN_PROGRESS

## Current Node

DEV-002 — Chapter Compiler Core（PASS 1 + PASS 2）

## Objective

把磁盘上的原始 Chapter Pack 读入内存，跑完 PASS 1（Schema）与 PASS 2（Reference），
产出结构化错误/成功报告。不含 Graph/Coverage/Hidden Information/Simulation。

## Allowed Scope
（抄录 Task Package 第 3 节 Writable Scope 实际条目——不得留占位符字样）

## Read-only Scope
（抄录 Task Package 第 3 节 Read-only Scope 实际条目）

## Forbidden Scope
（抄录 Task Package 第 3 节 Forbidden Scope 实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 包脚手架
- [ ] T003 Loader
- [ ] T004 PASS 1：Schema 校验
- [ ] T005 PASS 1：ID 唯一性
- [ ] T006 引用索引
- [ ] T007 PASS 2：故事图一致性
- [ ] T008 PASS 2：Action / Dice / Result 链路
- [ ] T009 PASS 2：NPC / Visuals 链路
- [ ] T010 PASS 2：Boss 引用收尾
- [ ] T011 compile() 编排
- [ ] T012 测试 Fixture
- [ ] T013 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001（每完成一个 Task 立即勾选并更新本字段，不得留到 T013 批量补写）

## Exit Criteria

六条命令全部退出码 0；`valid-minimal` fixture 令 `compile()` 返回 `passed: true`；
综合损坏 fixture 令四类 issue 数组均非空；REPORT.md 完成且 Status = READY_FOR_REVIEW；
已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **零 Graph/Coverage/Hidden Information/Simulation 逻辑**——不得出现可达性分析、环检测、六等级覆盖枚举、`host.public` 穷举校验、随机仿真循环。这些字面上"顺手就能加"，但都是下游节点的冻结职责边界。
2. **零文件写入**。`compile()` 及其全部子函数只读文件系统，不写任何文件（不产出 Bundle 文件、不写缓存、不写日志文件）。
3. **零资产文件存在性检查**。不得调用 `fs.existsSync` 检查图片/音频/字幕等真实文件是否存在——那是 DEV-075。本节点只检查"引用的 id 在对应内容集合里有没有被声明"。
4. **PASS2 只处理 PASS1 通过的条目**，避免级联噪音（T011 Requirement #3）。
5. **`zod` 版本必须与 `chapter-schema` 完全一致**。
6. **不引入 glob 库**，用 `node:fs`/`node:path` 手写遍历。
7. **`packages/chapter-compiler` 不得依赖 `packages/runtime-kernel` 或 `packages/shared`**——编译期校验与运行时事件模型是两个关注点，没有理由耦合。
8. `CR-019`（getHealth 自落地起）不适用于本包——同 `chapter-schema`，纯批处理函数库，无运行时服务。
9. Windows 环境：脚本须 Git Bash 与 PowerShell 均可运行；路径拼接一律用 `path.join`，不得手写 `/` 分隔符字符串拼接。
10. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`（`blocking: true`），继续其它不受影响 Task，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现 PASS 3（图可达性、死路检测、环检测、Ending/Boss 可达性）——DEV-003。
- 不实现 PASS 4（六等级 Rule Coverage 模拟）——DEV-006。
- 不实现 PASS 5（State Path 是否声明/可创建的可达性分析）——DEV-003。**本节点明确不检查 `StatePath` 引用的 flag/chapterVariables/npc/danger 键是否存在**，这需要全局状态可达集合，属图分析范畴，非简单存在性查找。
- 不实现 PASS 6（`host.public.json` 白名单穷举、时序性、隔离性）——DEV-002A。
- 不实现 PASS 7 资产文件存在性——DEV-075。
- 不实现 PASS 8 仿真——DEV-007。
- 不组装"最终 Validated Runtime Bundle"（跨节点开放问题，见第 2 节）。
- 不实现 Compile–Repair Loop（第 26 节 AI Draft → Compiler → AI Repair 循环）——那是内容生产管线节点（DEV-072），本节点只负责被调用、产出结构化错误。
- 不创建 `chapters/` 目录或任何真实产品内容。
- 不修改 `packages/chapter-schema`、`packages/runtime-kernel`、`packages/shared`。
- 不引入并发/流式 IO、不引入 glob 库、不引入 CLI 入口（`scripts/` 禁止）。

---

## 11. Tests

### Unit tests

T003–T011 每模块的 `.test.ts`：至少一条正例 + 至少一条反例，可辨识分支需覆盖每支。

### Contract tests

不适用——本节点自身在扩展"Compiler 是什么"的契约，尚无下游消费者。

### Regression tests

`pnpm test` 覆盖全 workspace；`chapter-schema` 与 `runtime-kernel` 既有测试必须保持通过，不因本节点引入而回归。

### Integration / Simulation / Replay / Fuzz / Soak tests

不适用（属后续节点）。

---

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含全部三包） | 命令 |
| A03 | `pnpm lint` 退出码 0，0 error / 0 warning | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0，`packages/chapter-compiler/dist/index.d.ts` 存在 | 命令 + 文件检查 |
| A06 | `pnpm test` 退出码 0；`chapter-schema`/`runtime-kernel` 既有测试无回归；`chapter-compiler` 新增全部测试通过 | 命令输出 |
| A07 | `packages/chapter-compiler` 的 `dependencies` 恰为 `{ @interactive-story/chapter-schema, zod }`；`zod` 版本与 `chapter-schema` 一致 | 文件检查 |
| A08 | `packages/*` 恰为 `shared`/`chapter-schema`/`runtime-kernel`/`chapter-compiler` 四包 | 文件检查 |
| A09 | `apps/`、`chapters/`、`assets/`、`scripts/`、`tools/` 均不存在 | 文件检查 |
| A10 | `loadChapterPack` 对含 1 个 JSON 语法错误的 fixture 不抛异常，`issues` 恰含该 1 条 | 测试检查 |
| A11 | PASS1：19 个内容分类的正例全部 PASS，反例全部 FAIL 且 `issues` 非空 | 测试检查 |
| A12 | PASS1：集合内 id 重复被拒绝；`story.graph.json` 跨 scene/boss/ending 的全局 id 冲突被拒绝（且不与"集合内唯一"逻辑混淆） | 测试检查 |
| A13 | PASS2：T007 八项故事图引用检查每项都有正反例 | 测试检查 |
| A14 | PASS2：T008 六项 Action/Dice/Result 链路检查每项都有正反例；`mapsTo` 链式指向被拒绝 | 测试检查 |
| A15 | PASS2：T009 三项 NPC/Visuals 检查每项都有正反例；两跳 `expression` 校验在根因已报错时不重复报错 | 测试检查 |
| A16 | PASS2：T010 两项 Boss 引用检查都有正反例 | 测试检查 |
| A17 | `compile()` 对合法 fixture 返回 `passed: true`，对综合损坏 fixture 返回 `passed: false` 且四类 issue 均非空 | 测试检查 |
| A18 | PASS2 不对 PASS1 失败条目产生级联引用错误 | 测试检查 |
| A19 | 包内不存在任何 `fs.existsSync`/文件存在性检查用于图片、音频等资产实体文件（允许存在于 Loader 读取 Chapter Pack 自身 JSON 文件的逻辑中） | grep + 代码审查 |
| A20 | 包内不存在图可达性/环检测/仿真循环相关函数名（`isReachable`/`detectCycle`/`simulate` 等） | grep 检查 |
| A21 | 包内不存在对 `packages/runtime-kernel` 或 `packages/shared` 的 import | grep 检查 |
| A22 | 未引入 `fast-glob`/`globby` 等第三方 glob 依赖 | 文件检查 |
| A23 | `test-fixtures/` 不在 `chapters/` 目录下，且未被误认作真实产品内容（`README` 或目录命名自解释） | 文件检查 |
| A24 | `specs/dev/DEV-002/` 四份节点文档齐全，`INDEX.md` 含原句且 T001–T013 全部勾选 | 文件 + 文本检查 |
| A25 | `git log` 新增恰 1 条提交，首行 `DEV-002: chapter compiler core (PASS 1+2)`；`git status --porcelain` 在该提交时为空 | 命令 |
| A26 | LEDGER 含 `OPENCODE → AUDITOR` 的 `NODE_REPORT-DEV-002` 记录，信封 `git_head` 与提交 sha 一致 | LEDGER + 命令比对 |
| A27 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**`、`packages/chapter-schema/**`、`packages/runtime-kernel/**`、`packages/shared/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

1. 更新 `INDEX.md`，勾选 T001–T013。
2. 运行第 11 节全部验证命令。
3. Regression：确认 `chapter-schema`/`runtime-kernel` 既有测试无回归。
4. 填写 `REPORT.md`，逐条对应 A01–A27。
5. `INDEX.md`/`REPORT.md` Status 均设为 `READY_FOR_REVIEW`。
6. 执行 T013 的 git commit。
7. 追加 LEDGER 行，发出 `NODE_REPORT` 给 `AUDITOR`（cc `COMMANDER`）。
8. **STOP**。不得开始任何后续 DEV 节点。

---

## REPORT.md 模板

沿用 DEV-000/DEV-001 REPORT 模板（八节：Status / Implemented / Changed Files / Tests Executed / Acceptance Results / Scope Deviations / Known Issues / Blockers / Future Considerations），Acceptance Results 覆盖 A01–A27。
