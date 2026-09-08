---
node: DEV-073
title: Asset Requirement Generator
milestone: M7 — Content Factory Complete
status: ISSUED
task_package_ref: "0319"
---

# TASK PACKAGE — DEV-073（Asset Requirement Generator）

## 1. Context

Dev Spec 对 DEV-073 给出明确的产品需求（第 2785-2796 行）：从
Chapter 自动导出五类资产需求——插画、表情、序列帧、BGM、声音。
与 DEV-070/071/072 不同，本节点**不涉及任何 AI/LLM 调用**，是纯
确定性数据提取任务：真实调用既有 DEV-002 Compiler 的
`loadChapterPack`/`runSchemaValidation`（`chapter-compiler` 冻结
导出），从已校验的 Chapter Pack 内容里遍历收集资产 id，映射到
Dev Spec 给出的五个类别。类别到 schema 字段的对应关系（已核对
`packages/chapter-schema/src/visuals.ts`、`audio.ts` 真实定义）：

| Dev Spec 类别 | schema 来源 |
|---|---|
| 插画（illustrations） | 每个 `VisualScene.layers[].assetId`（`visuals` 集合里 `layers` 字段存在的条目） |
| 表情（expressions） | 每个 `CharacterAsset.expressions` 记录的**值**（`visuals` 集合里 `expressions` 字段存在的条目；键是表情名，值是图片 asset id） |
| 序列帧（frameSequences） | 每个 `CharacterAsset.microAnimations` 数组的全部元素 |
| BGM | 每个 `AudioAsset` 中 `kind === 'BGM'` 的 `id` |
| 声音（voice） | 每个 `AudioAsset` 中 `kind !== 'BGM'`（即 `SPEECH`/`SFX`/`AMBIENCE`）的 `id` |

`visuals` 集合是 `VisualScene | CharacterAsset | ImageAsset` 的
混合联合类型（`chapter-compiler` 的 `SchemaValidationResult.visuals`），
需要按字段存在性区分（`layers` 字段 → `VisualScene`；`expressions`
字段 → `CharacterAsset`；`ImageAsset` 条目本身不产生任何类别输出
——它只是被引用的目标，`illustrations`/`expressions` 类别输出的是
*引用它的 id*，不是 `ImageAsset` 自身的声明列表，同 Dev Spec "需要
哪些"的语义：只报告被内容实际引用、需要生产的资产，不报告
"已声明"的资产清单）。

本节点**不做可达性（reachability）过滤**——Dev Spec 原文没有提及
按可达性筛选资产需求，不发明这层逻辑；即便某个 Scene/NPC 在故事图
里不可达，只要它出现在 Chapter Pack 里，其引用的资产仍计入需求
（若未来需要"只统计可达内容"，那是另一个明确的 CR/USER 决策，本
节点不预判）。

## 2. Deliverable

新建 `packages/asset-requirement-generator`（两个 workspace 依赖：
`@interactive-story/chapter-compiler`——真实加载/校验 Chapter Pack；
`@interactive-story/chapter-schema`——`VisualScene`/`CharacterAsset`/
`ImageAsset`/`AudioAsset` 类型名，用于按字段窄化混合联合类型）。

### 2.1 `src/assetRequirements.ts`

```ts
export interface AssetRequirements {
  illustrations: string[];
  expressions: string[];
  frameSequences: string[];
  bgm: string[];
  voice: string[];
}
```

五个字段均为**去重后按字典序排序**的字符串数组（`Array.from(new
Set(...)).sort()`），保证输出确定性、与遍历顺序无关。

### 2.2 `src/extractAssetRequirements.ts`

```ts
export function extractAssetRequirements(schemaResult: SchemaValidationResult): AssetRequirements
```

（`SchemaValidationResult` 从 `@interactive-story/chapter-compiler`
import type）。纯函数，只读取 `schemaResult.visuals.passed` 与
`schemaResult.audio.passed`（每项都是 `{file, value}`，只用
`value`；忽略 `failed` 校验失败的条目——校验都没通过的内容不产生
任何资产 id，不发明如何处理它们）：

- 遍历 `visuals.passed`，用字段存在性窄化每个 `value`：
  - 有 `layers` 字段 → `VisualScene`：把每个 `layer.assetId` 推入
    `illustrations`。
  - 有 `expressions` 字段 → `CharacterAsset`：把
    `Object.values(value.expressions)` 全部推入 `expressions`；把
    `value.microAnimations ?? []` 的全部元素推入 `frameSequences`。
  - 否则（`ImageAsset`）：不产生任何输出（只是被引用的目标）。
- 遍历 `audio.passed`：`value.kind === 'BGM'` 的 `value.id` 推入
  `bgm`；其余（`SPEECH`/`SFX`/`AMBIENCE`）推入 `voice`。
- 五个数组分别去重排序后返回。

### 2.3 `src/generateAssetRequirements.ts`

```ts
export function generateAssetRequirements(rootDir: string): AssetRequirements
```

薄封装：`loadChapterPack(rootDir)`（`chapter-compiler` 真实导出）
拿到 `raw`，`runSchemaValidation(raw)`（`chapter-compiler` 真实
导出）拿到 `schemaResult`，调用 `extractAssetRequirements(schemaResult)`
返回结果。不检查 `loadChapterPack` 返回的 `issues`（加载错误）——
加载失败的文件本身在 `schemaResult` 里就不会出现在任何
`passed`/`failed` 集合中，`extractAssetRequirements` 只读
`passed`，天然忽略它们，不需要额外处理。

### 2.4 `src/index.ts`

```ts
export * from './assetRequirements.js';
export * from './extractAssetRequirements.js';
export * from './generateAssetRequirements.js';
```

## 3. Scope

### Writable Scope

```
packages/asset-requirement-generator/package.json                              （新增）
packages/asset-requirement-generator/tsconfig.json                              （新增）
packages/asset-requirement-generator/src/index.ts                               （新增）
packages/asset-requirement-generator/src/assetRequirements.ts                   （新增）
packages/asset-requirement-generator/src/extractAssetRequirements.ts            （新增）
packages/asset-requirement-generator/src/extractAssetRequirements.test.ts       （新增）
packages/asset-requirement-generator/src/generateAssetRequirements.ts           （新增）
packages/asset-requirement-generator/src/generateAssetRequirements.test.ts      （新增）
tsconfig.json                                                                    （根，追加一条 references 条目）
pnpm-lock.yaml（自动生成的新增 importer 条目，含对 chapter-compiler 与
chapter-schema 的 workspace 依赖）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-073/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/chapter-compiler/src/loader.ts、pass1Schema.ts、types.ts（Read-only）
packages/chapter-schema/src/visuals.ts、audio.ts（Read-only）
packages/chapter-compiler/test-fixtures/valid-minimal/**（Read-only，测试用真实 fixture）
```

### Forbidden Scope

```
修改除本节点 Writable Scope 之外的任何既有文件
import 或依赖除 @interactive-story/chapter-compiler、
@interactive-story/chapter-schema 外的任何其他既有包
实现任何可达性（reachability）过滤逻辑
实现任何"资产是否已生产/已存在"的比对逻辑（那是未来节点或运维流程的职责，本节点只报告需求，不报告生产状态）
新增除以上两个既有包外的任何第三方/workspace 依赖
```

## 4. Required Skills

TypeScript strict mode（含联合类型窄化）、Vitest、pnpm workspace
包骨架搭建，需要读懂 `packages/chapter-schema/src/visuals.ts`/
`audio.ts` 与 `packages/chapter-compiler/src/pass1Schema.ts` 的
真实导出类型。

## 5. Task Breakdown

- **T001** 节点文档。
- **T002** 实现三个源文件 + 两个测试文件 + 包骨架 + 根 `tsconfig.json`
  引用 + 全量验证（六条命令）+ `REPORT.md`/`DECISIONS.md` 填写 +
  commit + 写入（不提交）LEDGER 追加行（正确置于历史表格内，
  `当前待处理` 之前，同 DEV-072 msg 0316 先例）与 NODE_REPORT
  消息文件。

## 6. Key Decisions（撰写 DECISIONS.md 时必须覆盖）

- 为何五个类别对应关系是上表给出的字段映射（逐一引用 Dev Spec 原文
  与 schema 真实字段）。
- 为何不做可达性过滤（Dev Spec 未提及，不发明）。
- 为何 `ImageAsset` 条目本身不产生输出（只是被引用目标，不是需求）。
- 为何忽略 `schemaResult` 里 `failed`（校验失败）的条目。
- 为何输出去重排序（保证确定性）。

## 7. Definition of Done

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 入库；
`REPORT.md` 完成且 `INDEX.md` Status = `READY_FOR_REVIEW`；LEDGER
追加行与 NODE_REPORT 消息文件已写入工作区但未提交；工作区无残留
临时文件。

## 8. Exit Procedure

提交前用 `git status` 自查工作区是否干净，不得留下任何额外的
临时/草稿文件（DEV-061 的 MAJOR-01 先例）。

## 9. Non-Goals

不做可达性过滤；不做"已生产 vs 未生产"资产状态比对；不修改
`chapter-compiler`/`chapter-schema` 任何一行；不生成任何资产文件
本身，只生成"需要哪些 id"的清单。

## 10. Out of Scope (Future Nodes)

DEV-074（Audio Production Queue，可能消费本节点的 `bgm`/`voice`
输出）、DEV-075（Chapter Packager）。

## 11. Dependencies

依赖 DEV-002（Compiler，已 `DONE`，冻结）与 DEV-001（chapter-schema，
已 `DONE`，冻结）。与 DEV-071/072 平行，无直接代码依赖。

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含新包真正被 `tsc -b` 构建） | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | 对一个手写构造的最小 `SchemaValidationResult`（含至少一个 `VisualScene`、一个 `CharacterAsset`（`expressions` 至少两项、`microAnimations` 至少一项非空）、一个 `ImageAsset`、一个 `kind:'BGM'` 的 `AudioAsset`、一个 `kind:'SPEECH'` 的 `AudioAsset`），`extractAssetRequirements` 返回的五个数组内容与手写输入精确匹配（去重排序后） | 测试 |
| A08 | 对同一手写输入，`ImageAsset` 条目本身的 `id` 不出现在任何输出数组里（除非它恰好也被某个 `VisualLayer.assetId` 引用） | 测试 |
| A09 | 对 `schemaResult` 中某个集合含 `failed` 校验失败条目的情况，`extractAssetRequirements` 忽略它们，不抛错、不产生对应输出 | 测试 |
| A10 | 对 `chapter-compiler` 的 `valid-minimal` fixture，`generateAssetRequirements(rootDir)` 返回 `illustrations: ['img-forest']`、`bgm: ['bgm-main']`、`voice: ['amb-forest', 'voice-guide']`（真实调用 `loadChapterPack`+`runSchemaValidation`，断言与该 fixture 真实内容逐一匹配） | 测试 |
| A11 | 五个输出数组均无重复元素且按字典序排序 | 测试 |
| A12 | 唯一 workspace 依赖是 `@interactive-story/chapter-compiler` 与 `@interactive-story/chapter-schema`；未新增第三方 npm 依赖 | 文件检查 |
| A13 | 未实现任何可达性过滤逻辑、未实现任何"已生产/未生产"比对逻辑 | 代码检查 |
| A14 | 除本节点 Writable Scope 外任何既有文件均未被修改（`pnpm-lock.yaml` 自动新增 importer 条目除外） | git diff 比对 |
| A15 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A16 | `specs/dev/DEV-073/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A17 | `git log` 新增恰 1 条提交，首行 `DEV-073: asset requirement generator (real chapter pack extraction, 5 Dev Spec categories, no reachability filter)` | 命令 |
| A18 | 提交后 LEDGER 追加行（正确置于历史表格内，`当前待处理` 之前）与 NODE_REPORT 消息文件存在于工作区但**未提交**；工作区无任何额外残留文件 | 命令 + `git status` 检查 |
| A19 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
