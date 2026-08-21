# DEV-022 REPORT

## Status

READY_FOR_REVIEW

## Implemented

- T001–T007 completed.
- **CR #2（T003）**：对 DEV-009 已冻结、DEV-021 已 CR 过一次的 `onSceneEnter` action 再发
  窄范围 Change Request——`SCENE_ENTER` 命令载荷追加 `characters` 字段（角色站位解析结果）。
  Runtime 侧（`onSceneEnter`，持有 `context.compiled`）是解析 `characterId` 三跳引用
  （`NPCDefinition→CharacterAsset→ImageAsset`）的唯一正确位置（Dev Spec §35「Renderer 不
  维护剧情」），`apps/renderer` 不读任何章节文件，只做 slot 定位布局。
- **T002**：新增纯函数 `resolveCharacterPlacements`（`characterResolution.ts`），严格按任务包
  2.3 节解析顺序实现三跳引用：第一跳查 `schemaResult.npc.passed`（`characterId → NPCDefinition`，
  这是本节点最易踩坑处——`characterId` 不在 `visuals.passed` 里是正常的），第二跳查
  `schemaResult.visuals.passed`（`characterAssetId → CharacterAsset`，`'expressions' in value`
  判别），第三跳 `expressions[expressionKey] → ImageAsset.file`（`'file' in value` 判别）；
  `expressionKey = placement.expression ?? characterAsset.defaultExpression`。防御性处理
  （D5）：任何一跳找不到即跳过该角色，不抛异常不中断其余解析；`visible` 原样保留（绘制与否交
  Renderer）。`microAnimations` 存在则原样透传、缺席则结果对象不含该键（D6，
  `exactOptionalPropertyTypes`）。
- **T004**：`index.ts` 仅追加 2 行导出（`resolveCharacterPlacements` + `ResolvedCharacterPlacement`
  类型），符号可从包外导入。
- **T005**：新增 `composeCharacters`（`apps/renderer/src/render/composeCharacters.ts`），过滤
  `visible === false`，五档 slot → `leftPercent` 固定映射
  `LEFT:10, CENTER_LEFT:30, CENTER:50, CENTER_RIGHT:70, RIGHT:90`（D1），
  `animated = (microAnimations?.length ?? 0) > 0`。不修改输入数组。
- **T006**：`App.tsx` 仅追加——新增纯函数 `pickSceneCharacters(commands)`（沿用
  `pickSceneLayers` 风格，取最近一条 `SCENE_ENTER` 的 `characters` 跑 `composeCharacters`，
  场景切换替换角色栈）+ 角色 `<img>` 渲染组（`left:{leftPercent}%` 定位、`zIndex:1000` 固定
  高于所有背景层 D2、`animated` 为真加 `character-animated` class 触发通用 `@keyframes breathe`
  呼吸动画 D3）；DEV-020/021 既有 HELLO/调试列表/场景层逻辑原样保留（diff 纯新增，A12）。
  测试落在唯一被授权的测试文件 `composeCharacters.test.ts`（D9）。**已知简化如实记录**：不按
  具体动画名区分微动效果，`animated` 一律套用同一种通用 CSS 呼吸/缩放脉动，真正按名字驱动
  留到有真实动画资产定义时（D3，Task Package §10 Non-goals）。
- CR #2 后的端到端验证（A09）落在新增 `characterResolution.test.ts` 内：驱动 `valid-minimal`
  到 `SCENE_ENTER`，断言命令含 `characters` 与 `resolveCharacterPlacements` 返回值逐字一致，且
  DEV-021 遗留的 `visualSceneId`/`layers` 仍在命令中（CR 只追加、不改既有字段）。

## Changed Files

```text
packages/runtime-kernel/src/characterResolution.ts      （新增）
packages/runtime-kernel/src/characterResolution.test.ts （新增）
packages/runtime-kernel/src/machine.ts                  （仅 onSceneEnter 内新增两处 +
                                                            实现该 CR 必需的 1 行 import，见 A08）
packages/runtime-kernel/src/index.ts                    （仅追加 2 行导出）
apps/renderer/src/render/composeCharacters.ts           （新增）
apps/renderer/src/render/composeCharacters.test.ts      （新增）
apps/renderer/src/App.tsx                               （仅追加，49+/1-，见 A12）
specs/dev/DEV-022/INDEX.md
specs/dev/DEV-022/REQUIREMENTS.md
specs/dev/DEV-022/ACCEPTANCE.md
specs/dev/DEV-022/REPORT.md
specs/dev/DEV-022/DECISIONS.md
specs/comms/LEDGER.md（仅 0106 行状态 ISSUED→CLOSED：Codex 开工标志 + 0107 NODE_REPORT 行占号）
```

`specs/comms/0107-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-022.md` 与 LEDGER 的 0107 行是本
节点的 NODE_REPORT 消息信道，已写入工作区（git_head 指向本提交），按仓库先例（DEV-007/010/
011/012/020/021 的 NODE_REPORT 消息文件均随 Commander 后续治理提交入库）由下一个治理提交
捕获。`pnpm-lock.yaml` 无 diff（`pnpm install` 提示 Already up to date，零新增依赖）；
`apps/renderer/src/App.test.ts` 全程零内容改动；根 `tsconfig.json`、`packages/**`（除上列
runtime-kernel 四文件）、DEV-020/021 冻结文件（含 `composeLayers.*`）、治理/规范文件全部
零改动。

## Tests Executed

六条命令严格按要求顺序执行：

| Command | Exit code | Result |
|---|---:|---|
| `pnpm install` | 0 | PASS; Already up to date（零新增依赖，`pnpm-lock.yaml` 无 diff） |
| `pnpm typecheck` | 0 | PASS; `tsc -b && tsc -b --noEmit` + renderer 独立 `tsc --noEmit` |
| `pnpm lint` | 0 | PASS; `eslint .`，含新增 `.tsx` |
| `pnpm format:check` | 0 | PASS; All matched files use Prettier code style（3 个新增文件经 prettier 归一化后全过） |
| `pnpm build` | 0 | PASS; `tsc -b` |
| `pnpm test` | 0 | PASS; 89 Test Files / 465 Tests（DEV-021 基线 87/448，新增 2 文件/17 条，既有零回归） |

新增测试明细：`characterResolution.test.ts` 9 条（真实 fixture 三跳链解析含
`expression:'smile'` / 省略 expression 回退 defaultExpression / 四类缺失引用
`NPCDefinition`/`CharacterAsset`/表情不在 expressions/`ImageAsset` 防御性跳过 / 多角色跳过
不中断 / microAnimations 键缺席 / CR #2 端到端两字段断言），`composeCharacters.test.ts` 8 条
（过滤不可见角色 / 五档 slot 映射 / microAnimations 非空空缺席三态 animated 判定 / 空数组不
改输入）+ `pickSceneCharacters` 4 条（T006 纯逻辑：取 characters / 忽略非 SCENE_ENTER /
累积取最近 / characters 非数组防御）。

## Acceptance Results

| # | Result | Evidence |
|---|---|---|
| A01 | PASS | `pnpm install` exit code 0（Already up to date） |
| A02 | PASS | `pnpm typecheck` exit code 0：三步全过 |
| A03 | PASS | `pnpm lint` exit code 0 |
| A04 | PASS | `pnpm format:check` exit code 0 |
| A05 | PASS | `pnpm build` exit code 0 |
| A06 | PASS | `pnpm test` exit code 0：89 files / 465 tests；既有全部测试零回归（含未改动的 `machine.test.ts`/`visualResolution.test.ts`） |
| A07 | PASS | `characterResolution.test.ts`：真实 `valid-minimal` 三跳链解析 `npc-guide`+`smile` → `file:'assets/img/guide-smile.png'`；省略 expression 回退 `neutral` → `assets/img/guide-neutral.png`；四类缺失引用（`characterId` 无 `NPCDefinition` / `characterAssetId` 无 `CharacterAsset` / 表情名不在 `expressions` / 资产文件缺失）各自防御性跳过，多角色跳过不中断 |
| A08 | PASS | `git diff machine.ts`：仅 `onSceneEnter` 内新增两处（`characters` 局部变量 + `send` 参数追加 `characters,`）+ 实现该 CR 必需的 1 行 import（`resolveCharacterPlacements`），DEV-021 遗留的 `scene`/`layers` 计算、`audio.send`、`storyMove` 返回及其余全部 action 逐字节不变（原因与必要性见 DECISIONS D8） |
| A09 | PASS | 端到端：`createRuntimeMachine` 驱动 `valid-minimal` 至 `SCENE_ENTER`，presentation 命令 `kind === 'SCENE_ENTER'`、`sceneId:'scene-start'`、`characters` 与 `resolveCharacterPlacements` 返回值逐字一致（`[{characterId:'npc-guide', slot:'CENTER', visible:true, file:'assets/img/guide-smile.png', microAnimations:[]}]`）；DEV-021 遗留 `visualSceneId:'vs-start'`/`layers` 仍在命令中（CR 只追加） |
| A10 | PASS | `git diff machine.test.ts` / `visualResolution.ts` / `visualResolution.test.ts` 为空（未修改）；`pnpm test` 全部通过含其既有断言 |
| A11 | PASS | `composeCharacters.test.ts`：`visible:false` 过滤；五档 slot → leftPercent `[10,30,50,70,90]` 正确；`microAnimations` 非空 → `animated true`、空/未定义 → `false` |
| A12 | PASS | `git diff App.tsx` 纯新增（import 块并入新类型、`pickSceneCharacters`、角色 `<img>` 组 + 内联 `@keyframes breathe`），DEV-020/021 既有 `WS_URL`/`browserSocket`/`appendCommand`/HELLO/`pickSceneLayers`/场景层/`<pre>` 调试列表逻辑逐字保留（49+ / 1-，唯一 1- 为 import 行改写） |
| A13 | PASS | `apps/renderer` 的 DEV-020/021 冻结文件（`ws/`、`server/`、`main.tsx`、`composeLayers.*`、`package.json`/`tsconfig.json`/`vite.config.ts`/`index.html`、`App.test.ts`）零 diff |
| A14 | PASS | `git status`/`git diff`：`packages/**` 仅 runtime-kernel 的 `machine.ts`/`index.ts`/`characterResolution.ts`/`characterResolution.test.ts` 四文件入 diff，其余包全部零改动 |
| A15 | PASS | `pnpm install` 零新增；`pnpm-lock.yaml`、根/包 `package.json` 均无 diff |
| A16 | PASS | `DECISIONS.md` 存在，覆盖第 6 节全部要点（D1 五档 slot 百分比映射、D2 角色 z-index 固定高于背景层理由、D3 微动效果只做通用呼吸不按名字区分的简化理由）及 D4–D9 治理/技术决策 |
| A17 | PASS | `specs/dev/DEV-022/` 六份文档齐全且已入库，`INDEX.md` T001–T007 全部勾选 |
| A18 | PASS | `git log` 新增恰 1 条提交，首行 `DEV-022: character renderer`；提交时 `git status --porcelain` 为空 |
| A19 | PASS | LEDGER 0107 `NODE_REPORT-DEV-022` 记录 `git_head` 与提交一致 |
| A20 | PASS | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均零 diff |

## Scope Deviations

NONE（两条已在 REPORT/DECISIONS 内说明、均属 Task Package 既定内容的必要组成部分）：

1. `machine.ts` 新增 1 行 `import { resolveCharacterPlacements }`——实现第 2.2 节授权改动的
   必要条件（调用新文件函数必须导入），不在 `onSceneEnter` action 内部但为 CR #2 的直接附属，
   diff 仅此 1 行 import + 2 处 action 内部改动（A08 已逐行核对，与 DEV-021 D8 先例一致）。
2. T006 的 `pickSceneCharacters` 测试放在 `composeCharacters.test.ts`（Writable Scope 内唯一
   授权的测试文件）：Task Package 第 3 节 Writable Scope 未列 `App.test.ts`，为遵守范围纪律将
   测试落在授权文件内，`App.test.ts` 保持零改动（D9，DEV-021 D7 同款先例）。

## Known Issues

NONE。

角色图片加载不出来是本节点**预期的诚实缺口**而非缺陷：`ResolvedCharacterPlacement.file` 是
Chapter Pack 内相对路径（如 `assets/img/guide-smile.png`），尚无任何静态资源服务器把它变成可
加载 URL——那是 DEV-075 Chapter Packager / 部署管线的职责（DEV-021 D3 已记录同款缺口，本节点
沿用不重复修复）。微动效果只做通用呼吸、不按具体动画名区分，同样是无真实动画资产支撑的诚实
简化（D3）。

## Blockers

NONE。

## Future Considerations

- 真实图片加载：待 DEV-075 Chapter Packager / 部署管线提供静态资源服务后，
  `<img src={file}>` 可直接消费；当前阶段页面保持调试列表 + 空图层/角色区。
- Name-driven 微动画：`microAnimations` 现有真实动画资产定义（M7 内容工厂产出）后，再按每个
  动画名映射具体效果；当下 `animated` 统一套用通用呼吸类 CSS 是正确的底层铺垫（`leftPercent`/
  `animated` 已随 `RenderableCharacter` 输出，下游可直接消费）。
- 字幕/对话框（DEV-023）、选择 UI（DEV-024）、骰子 UI（DEV-025）、镜头/视差动画（DEV-026）
  均为后续节点内容，本节点未提前实现。

## Decisions

见 `specs/dev/DEV-022/DECISIONS.md`。已随最终提交一并入库。
