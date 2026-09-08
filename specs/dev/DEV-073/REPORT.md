# DEV-073 REPORT

## 1. Status

DONE — DEV-073（Asset Requirement Generator，M7 第四个节点）T001–
T002 施工完成，六条验证命令全部退出码 0，恰 1 条提交，AUDITOR
审计 `AUDIT_PASS`（0 BLOCKER/MAJOR/MINOR/INFO，`verdict_ref: "0321"`），
Commander `NODE_RULING: PASS`（消息 `0322`）。

## 2. Implemented

新建 `packages/asset-requirement-generator`——**不涉及任何 AI/LLM
调用**的纯确定性数据提取节点（与 DEV-070/071/072 的本质区别），
真实调用既有 DEV-002 Compiler 冻结导出的
`loadChapterPack`/`runSchemaValidation`，把已校验 Chapter Pack 的
`visuals`/`audio` 集合内容映射为 Dev Spec 五类资产需求。`package.json`
`dependencies` **恰两项**：`@interactive-story/chapter-compiler` 与
`@interactive-story/chapter-schema`（均 `workspace:*`），无第三方
依赖；`tsconfig.json` 与 ai-compiler-repair-loop 逐字一致（extends
../../tsconfig.base.json，outDir dist / rootDir src）。

- `src/assetRequirements.ts`：`AssetRequirements` 接口——五个字段
  `illustrations`/`expressions`/`frameSequences`/`bgm`/`voice`，均
  为 `string[]`（去重 + 字典序排序的语义由实现层保证）。
- `src/extractAssetRequirements.ts`：纯函数 `extractAssetRequirements
  (schemaResult: SchemaValidationResult): AssetRequirements`。只读
  `visuals.passed` 与 `audio.passed`（每项 `{file, value}`，只用
  `value`）：
  - `visuals.passed` 按字段存在性窄化混合联合
    `VisualScene | CharacterAsset | ImageAsset`：`'layers' in value`
    → `VisualScene`，把每个 `layer.assetId` 推入 `illustrations`
    （场景图层引用的图片 = 需要的插画）；`'expressions' in value`
    → `CharacterAsset`，把 `Object.values(value.expressions)`（键是
    表情名、值是图片 asset id）推入 `expressions`、把
    `value.microAnimations ?? []` 全部元素推入 `frameSequences`；
    其余为裸 `ImageAsset`——只是被引用的目标，不产生输出（D3）。
  - `audio.passed`：`value.kind === 'BGM'` → `bgm` 收 `value.id`；
    其余（`SPEECH`/`SFX`/`AMBIENCE`）→ `voice` 收 `value.id`。
  - `visuals.failed`/`audio.failed` 完全不触碰：不抛错、不产生对应
    输出（D4）。
  - 返回前五个数组各自 `Array.from(new Set(...)).sort()`（D5）。
- `src/generateAssetRequirements.ts`：薄封装
  `generateAssetRequirements(rootDir)`——真实调用
  `loadChapterPack(rootDir)` 拿 `{ raw }`（`issues` 按 Task Package
  第 2.3 节指示忽略，不读不解构），`runSchemaValidation(raw)` 拿
  `schemaResult`，委托 `extractAssetRequirements` 返回。
- `src/index.ts`：三行 barrel（assetRequirements /
  extractAssetRequirements / generateAssetRequirements）。
- `src/extractAssetRequirements.test.ts`（3 测试）：手写构造最小
  `SchemaValidationResult`（其余 17 个分节用 `{passed:null|[],
  failed:[]}` 空占位满足类型，`visuals`/`audio` 真实填充）——
  `visuals.passed` 含两个 VisualScene（图层跨场景重复引用
  `img-forest` 以证去重）、一个 CharacterAsset（`expressions` 两项 +
  `microAnimations` 含重复元素 `['anim-wave','anim-idle','anim-wave']`
  以证去重）、一个**裸** `ImageAsset`（`img-logo`，无任何图层引用，
  证 A08）；`audio.passed` 含两个 `kind:'BGM'`（同 id `bgm-main` 去重）
  + 一个 SPEECH + 一个 AMBIENCE；`visuals.failed`/`audio.failed` 各含
  一条空 `ValidationFailure`（证 A09 不抛错、无对应输出）。断言五个
  返回数组与去重排序后的期望**精确**相等（A07）。
- `src/generateAssetRequirements.test.ts`（2 测试）：沿用
  `packages/chapter-compiler/src/compile.test.ts` 的
  `fileURLToPath(new URL(...))` fixture 解析模式（自本包
  `src/` 上溯两级到 `packages/` 再进 chapter-compiler），对
  `valid-minimal` 真实 fixture 调用 `generateAssetRequirements`——
  真实走 `loadChapterPack` + `runSchemaValidation`（A10）：
  `illustrations: ['img-forest']`、`bgm: ['bgm-main']`、
  `voice: ['amb-forest','voice-guide']`（另断言真实 fixture 的
  `expressions: ['img-guide-neutral','img-guide-smile']` 与
  `frameSequences: []`）；对五个数组逐一断言无重复且字典序排序
  （A11）。
- 根 `tsconfig.json`：`references` 数组 `ai-compiler-repair-loop`
  之后追加 `{ "path": "./packages/asset-requirement-generator" }`。
- `pnpm-lock.yaml`：新增 asset-requirement-generator importer 条目
  （含对 chapter-compiler 与 chapter-schema 两个 workspace 依赖的
  解析）——新增包被授权后 pnpm 工具链的强制副作用，Task Package
  第 3 节已明确授权。

未实现（超出本节点范围，见 Task Package §9/§10）：无任何可达性
（reachability）过滤——不消费 storyGraph/图遍历结果，Chapter Pack
里出现的引用一律计入需求（D2）；无任何"资产已生产/未生产"比对
逻辑——本节点只报告"需要哪些 id"，不报告生产状态（那是未来节点
或运维流程的职责）；不修改 `packages/chapter-compiler/` 与
`packages/chapter-schema/` 任何一行；除两个授权既有包外不 import/
依赖任何其他包；不生成任何资产文件本身。

## 3. Changed Files

提交内共 13 个文件：

- `packages/asset-requirement-generator/package.json`（新增：name
  `@interactive-story/asset-requirement-generator`，结构对齐
  ai-compiler-repair-loop；`dependencies` 恰两项
  `@interactive-story/chapter-compiler` +
  `@interactive-story/chapter-schema`，均 `workspace:*`，无第三方
  依赖）
- `packages/asset-requirement-generator/tsconfig.json`（新增：与
  ai-compiler-repair-loop 逐字一致）
- `packages/asset-requirement-generator/src/index.ts`（新增：三行
  barrel）
- `packages/asset-requirement-generator/src/assetRequirements.ts`
  （新增）
- `packages/asset-requirement-generator/src/extractAssetRequirements.ts`
  （新增）
- `packages/asset-requirement-generator/src/extractAssetRequirements.test.ts`
  （新增，3 测试）
- `packages/asset-requirement-generator/src/generateAssetRequirements.ts`
  （新增）
- `packages/asset-requirement-generator/src/generateAssetRequirements.test.ts`
  （新增，2 测试）
- `tsconfig.json`（根，references 末尾 ai-compiler-repair-loop 之后
  追加一条）
- `pnpm-lock.yaml`（新增 asset-requirement-generator importer 条目）
- `specs/dev/DEV-073/DECISIONS.md`（新增，D1–D5）、
  `specs/dev/DEV-073/REPORT.md`（本文件）、
  `specs/dev/DEV-073/INDEX.md`（T001–T002 勾选 + Status →
  READY_FOR_REVIEW）

（`specs/comms/LEDGER.md` 追加行与 NODE_REPORT 消息文件已写入工作区，
**未提交**——留待 Commander 收尾，同 DEV-070/071/072 交接方式。）

## 4. Tests Executed

按序执行六条命令，全部退出码 0：

| 命令 | 退出码 |
|---|---|
| `pnpm install --frozen-lockfile` | 0（lockfile 已含新包 importer；先以普通 `pnpm install` 落盘该 importer 条目后复跑仍 0） |
| `pnpm typecheck` | 0（`tsc -b` 含新包真正构建 + `tsc -b --noEmit` + renderer 子包） |
| `pnpm lint` | 0 |
| `pnpm format:check` | 0（首跑报新包两个 json 格式告警，`prettier --write` 就地格式化后复跑 0） |
| `pnpm build` | 0（tsc -b 全量，新包 dist 产出） |
| `pnpm test` | 0（143 files / 816 tests 全部通过；既有 811 + 新增 5，零回归） |

## 5. Acceptance Results

A01–A19 逐项：

| # | 判定 | 结果 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | VERIFIED（0） |
| A02 | `pnpm typecheck` 退出码 0 | VERIFIED（0，`tsc -b` 含新包） |
| A03 | `pnpm lint` 退出码 0 | VERIFIED（0） |
| A04 | `pnpm format:check` 退出码 0 | VERIFIED（0） |
| A05 | `pnpm build` 退出码 0 | VERIFIED（0） |
| A06 | `pnpm test` 退出码 0，零回归 | VERIFIED（143 files / 816 tests，
  811 → 816 = +5 新增） |
| A07 | 手写最小 `SchemaValidationResult` → 五数组与输入精确匹配
  （去重排序后） | VERIFIED（`extractAssetRequirements.test.ts` 测试 1：
  含 ≥2 layers 的 VisualScene ×2（跨场景重复 `img-forest`）、
  `expressions` 两项 + `microAnimations` 非空含重复的 CharacterAsset、
  裸 ImageAsset、BGM ×2（同 id 去重）+ SPEECH + AMBIENCE，断言
  `toEqual` 五数组精确期望值） |
| A08 | 同一手写输入下裸 `ImageAsset` 的 `id` 不出现在任何输出数组 |
  VERIFIED（测试 2：`img-logo` 未被任何 layer 引用，对五数组逐一
  `not.toContain('img-logo')`） |
| A09 | 含 `failed` 校验失败条目的 `schemaResult` 被忽略：不抛错、
  不产生对应输出 | VERIFIED（测试 3：`visuals.failed`/`audio.failed`
  各含一条失败条目，断言不抛错且结果与 A07 期望精确相等） |
| A10 | 对 `valid-minimal` 真实 fixture，`generateAssetRequirements`
  返回 `illustrations:['img-forest']`、`bgm:['bgm-main']`、
  `voice:['amb-forest','voice-guide']` | VERIFIED
  （`generateAssetRequirements.test.ts` 测试 1：真实走
  `loadChapterPack`+`runSchemaValidation`，另断言真实
  `expressions:['img-guide-neutral','img-guide-smile']`、
  `frameSequences:[]`） |
| A11 | 五输出数组均无重复且字典序排序 | VERIFIED（测试 2：逐数组
  `Set` 大小 == 长度 且 `toEqual([...arr].sort())`） |
| A12 | 唯一 workspace 依赖是 chapter-compiler 与 chapter-schema；无
  第三方依赖 | VERIFIED（package.json `dependencies` 恰两项
  `workspace:*`；lockfile importer 逐项核对） |
| A13 | 无可达性过滤、无已生产/未生产比对逻辑 | VERIFIED（代码检查：
  仅遍历 `visuals.passed`/`audio.passed`，无 storyGraph/图遍历、无
  任何生产状态输入） |
| A14 | Writable Scope 外既有文件未被修改 | VERIFIED（git diff：仅根
  tsconfig.json + pnpm-lock.yaml——均为新增包的必需联动，Task Package
  第 3 节已明确授权，同 DEV-063/070/071/072 先例） |
| A15 | `DECISIONS.md` 存在，覆盖第 6 节全部要点 | VERIFIED（D1–D5：
  五类别字段映射逐一核对之因 / 不做可达性过滤之因 / 裸 ImageAsset
  无输出之因 / 忽略 failed 之因 / 去重排序之因） |
| A16 | 节点文档齐全，INDEX T001–T002 勾选，Status READY_FOR_REVIEW |
  VERIFIED |
| A17 | `git log` 恰 1 条提交，首行符合 | VERIFIED（提交后核实） |
| A18 | LEDGER 追加行（正确置于历史表格内、`当前待处理` 之前）与
  NODE_REPORT 存在于工作区未提交；无残留文件 | VERIFIED（提交后写入
  comms 两处未提交改动；`git status` 无任何额外残留——含 Commander
  dispatch 遗留的 `.tmp_dev073_prompt.txt` 已清除，同 DEV-070/071/072
  先例） |
| A19 | PROJECT_INDEX / DAG / tasks / audit / protocol 未修改 |
  VERIFIED（git diff 比对） |

## 6. Scope Check

- Writable Scope 内文件逐一真实改动：新包 8 个文件、根 tsconfig.json、
  INDEX / REPORT / DECISIONS（REQUIREMENTS / ACCEPTANCE 由 Commander
  预置，T001 已满足未改动）。
- Read-only Scope（`chapter-compiler/src/loader.ts`/`pass1Schema.ts`
  的冻结导出被真实消费、`chapter-schema/src/visuals.ts`/`audio.ts`
  的真实字段名被逐一核对、`test-fixtures/valid-minimal/**` 供真实
  集成测试只读使用）零改动；fixture 目录不写入。
- Forbidden Scope 全部遵守：未 import/依赖 chapter-compiler 与
  chapter-schema 以外的任何包（无第三方依赖）；未实现任何可达性
  过滤逻辑（无 storyGraph/图遍历代码）；未实现任何"已生产/未生产"
  比对逻辑；`packages/chapter-compiler/` 与 `packages/chapter-schema/`
  下无任何改动；Writable Scope 外无改动。
- 说明：`pnpm-lock.yaml` 因新包加入 workspace 产生 importer 条目，
  随实现一并提交——同 DEV-063/070/071/072 先例（新增包被授权后
  pnpm 工具链的强制副作用，Task Package 第 3 节已明确授权）。

## 7. Commit

单条提交，消息首行：

```
DEV-073: asset requirement generator (real chapter pack extraction, 5 Dev Spec categories, no reachability filter)
```

`git log -1` 核实恰 1 条新提交。LEDGER 追加行（msg_id 0320）与
`specs/comms/0320-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-073.md` 已写入
工作区，**未纳入本次提交**。

## 8. Handoff

交付给 AUDITOR/COMMANDER 验收，验收权威副本为
`specs/tasks/TASK-PACKAGE-DEV-073.md` 第 12 节（A01–A19，节点
`ACCEPTANCE.md` 逐行一致）。重点核对项：A12/A13（恰两项授权依赖 +
零可达性/生产状态逻辑）、A14（Writable Scope 外仅 tsconfig/lockfile
联动）、A17（恰 1 条提交）、A18（工作区无残留，
`.tmp_dev073_prompt.txt` 已清除；LEDGER 追加行正确置于历史表格内
`当前待处理` 之前 + NODE_REPORT 消息文件未提交）。OpenCode 禁止自行
推进下一 DEV Node。
