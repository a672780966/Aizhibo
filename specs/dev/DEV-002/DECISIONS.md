# DEV-002 DECISIONS

记录 T001–T013 施工过程中的决策。无业务语义变更。

> **FIX-T01 追加记录**：D1–D9 均为施工期决策，未受 FIX 影响；D10 历史现象保留，
> 其顺序依赖已由 D11 记录的方式消除，不再适用于当前交付态（消息 `0031`）。

## D1 — zod 版本对齐（T002）

`packages/chapter-compiler` 的 `dependencies` 恰为
`{ "@interactive-story/chapter-schema": "workspace:*", "zod": "^4.4.3" }`。
`zod` 版本字符串与 `chapter-schema/package.json` 完全一致（`^4.4.3`，第 9 节第 5 条），
避免两个 Zod 实例的 schema 互操作问题（Task Package T002 Requirement #2）。

## D2 — `Choice.ruleId` 命名澄清（T008）

Dev Spec 第 21 节 `Choice.ruleId` 字面上是 "Rule"，但语义（Task Package T008 Requirement #1）
是引用 `actions/` 中的 `ActionDefinition.id`（"命名沿用规范原文，实际指向 Action"）。
本包按此实现：`actionChain.choiceRuleId` 检查对照 `ReferenceIndex.actions`。

## D3 — `narrative/` 双 schema 判别（T004/T006）

`narrative/` 目录下同一文件夹混装 `ResultNarrative` 与 `NarrativeBlock` 两类文件
（`ChapterPackSchemas.narrative.result` / `.block`）。判别顺序：先试 `ResultNarrative`
（含必填 `focus`/`primaryBlockId`），失败再试 `NarrativeBlock`（含必填 `slot`/`text`）。
两者都失败时，`ValidationFailure.issues` 合并两次尝试的 `ZodIssue[]`（原结构保留），
供 AI Repair 一次性看到两类错误。

## D4 — `visuals/` 三 schema 判别（T004/T006）

`visuals/` 目录混装 `VisualScene` / `CharacterAsset` / `ImageAsset` 三类文件
（ADDENDUM-001 §A9；`ChapterPackSchemas.visuals` 只登记了 `VisualSceneSchema` 一个入口，
故额外从包导出导入 `CharacterAssetSchema` / `ImageAssetSchema`）。
判别顺序：`VisualScene`（`layers`）→ `CharacterAsset`（`expressions`）→ `ImageAsset`（`file`）。
三者都失败时同样合并全部 `ZodIssue[]`。PASS 1 后三类分别进入
`referenceIndex` 的 `visualScenes` / `characterAssets` / `imageAssets` 集合。

## D5 — `runPass2` 的 `raw` 参数（T011）

Task Package 第 6 节 Outputs #4 规定的签名为 `runPass2(raw, pass1)`，但 PASS 2 的全部
检查（T007–T010）只消费 PASS1 结果与引用索引，`raw` 参数实际未被使用。为遵守 Outputs
签名原样保留该参数（ESLint `no-unused-vars` 的 `after-used` 规则不报错），并在
`REPORT.md` 说明。

## D6 — Loader 的目录缺失与路径归一化（T003）

- 子目录缺失（`readdirSync` ENOENT）记为 `FILE_READ_ERROR`（与根文件缺失同一处理），
  与 Task Package T003 Requirement #6 的根文件缺失规则一致。
- `FileEntry.file` 与 `LoadIssue.path` 统一用 `path.join` 拼接后**归一化为正斜杠**
  （`join(...).split(path.sep).join('/')`）——故事图节点 `file` 引用（如
  `"scenes/scene-start.json"`）以正斜杠书写（T007 检查 #2 依赖），且约束第 9 条要求
  Windows 上不得手写 `/` 拼接，故在构建标识符时做归一化。

## D7 — T010 #2 的严重度与 `passed` 语义（T010/T011）

`boss.interactionNextScene`（Boss 相位 Interaction 的 `nextScene` 应指回本 Boss 或其
`onDefeat`/`onFailure`）是内容设计约定而非纯粹存在性检查，产出 `severity: "ADVISORY"`
的 `ReferenceIssue`（Task Package T010 Requirement #2 原文"非 BLOCKING 级的强制中断"）。
`compile().passed` 按 T011 Requirement #2 的字面规则实现：**任何** `referenceIssues`
非空（含 ADVISORY）即 `passed: false`——不区分严重度。

## D8 — 跨类 id 唯一性的两条实现路径（T005）

`story.graph.json` 节点 id 全局唯一（ADDENDUM-001 §A2）落地为两条互不混淆的检查：

1. `storyGraph.nodes` — `story.graph.json` 注册表内 `StoryGraphNode.id` 重复（含跨
   scene/boss/ending 的注册冲突），`conflictingFiles` 为 `['story.graph.json', ...]`；
2. `storyGraph.crossKind` — `scenes/` ∪ `boss/` ∪ `endings/` **文件内容 id** 跨类重复
   （同一 id 出现在 ≥2 个不同 kind 的文件中），`conflictingFiles` 列出实际文件路径。

两者都独立于"同分类去重"（`scenes` 等 15 个集合内检查），A12 的"不与集合内唯一逻辑
混淆"由此保证。PASS1 失败的条目不参与任何去重（只统计已通过条目）。

## D9 — 语法错误 fixture 的 JSONC 形态（T012/A04 冲突解决）

`broken-json-syntax/manifest.json` 与 `broken-composite/metadata/meta-broken.json` 需要
是 `JSON.parse` 失败的文件（Loader `JSON_SYNTAX_ERROR` 用例），但仓库级
`prettier --check .`（A04）会直接报解析错误。根 `.prettierignore` 不在本节点 Writable
Scope，无法追加忽略规则。解决：两个文件以 **JSONC 形态**提交（含 `//` 注释）——

- `JSON.parse` 对注释必抛 `SyntaxError`（Loader 按预期记录 `JSON_SYNTAX_ERROR`）；
- Prettier 3.9 对含注释的 `.json` 自动回退 `jsonc` 解析器（实测），且文件按 Prettier
  规范排版，`format:check` 通过。

诚实性说明：该用例依旧验证"文件无法被 JSON 解析 → 结构化 LoadIssue"，只是损坏形态
从"截断"改为"含注释"（真实创作管线最常见的 JSON 错误形态）。

## D10 — `pnpm typecheck` 与构建产物的前置依赖（T013）

`pnpm typecheck`（`tsc -b --noEmit`）在本包引入**仓库首个跨包 project reference**
（chapter-compiler → chapter-schema）后，存在 TS 5.9 构建模式的既有行为：
当被引用项目（chapter-schema）的 `dist` 声明产物缺失（如全新 clone 后未经 `pnpm build`）
时，`tsc -b --noEmit` 报 `TS6310: Referenced project may not disable emit`。
交付态工作区含完整构建产物（T013 命令序列以 `pnpm build` 收尾），六条命令全部退出码 0；
全新环境需先 `pnpm build` 再 `pnpm typecheck`。此为 TS 工具链行为，非本包缺陷，
记录备审（REPORT Future Considerations 亦留痕）。

## D11 — FIX-T01：typecheck 顺序依赖在脚本层面消除（T013 第二轮）

`FIX_PACKAGE 0029`（`DEV-002-FIX-01`）移除 chapter-compiler 包级 `references` 后，
全新工作区 + T013 §1 严格顺序下 `pnpm typecheck` 仍失败（`TS2307`，消息 `0030`，
BLK-002）：`tsc -b --noEmit` 不会发射任何项目产物，被依赖包 `chapter-schema` 的
`dist/index.d.ts` 未物化时类型解析必然失败——该失败与 references 存在与否无关，只改变
失败形态（带 references 为 `TS6310`，移除后为 `TS2307`）。

`SCOPE_RULING 0031` 采纳方案 A'（USER 已批准，CR 性质留痕）：根 `package.json` 的
`typecheck` 脚本由 `tsc -b --noEmit` 改为 `tsc -b && tsc -b --noEmit`，把「依赖产物
必须先物化」这一真实前置显式化到脚本内，不再依赖外部调用者手动排序。该文件超出本节点
Writable Scope，由 `Commander` 自行改动并独立验证（本节点不越权）。

**结论**：D10 记录的「typecheck 依赖先行 build」顺序现象（历史真实）在脚本层面被消除——
全新工作区 + 严格顺序 + 无额外命令下，六条命令在新脚本下全部退出码 0（本节点第二轮
独立重跑，见 REPORT Tests Executed）。验收字面语义（A02）不变。
