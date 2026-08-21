# DEV-021 REPORT

## Status

READY_FOR_REVIEW

## Implemented

- T001–T007 completed.
- **CR（T003）**：对 DEV-009 已冻结的 `onSceneEnter` action 发窄范围 Change Request——
  `SCENE_ENTER` 命令载荷从占位 `{ kind, sceneId }` 丰富为 `{ kind, sceneId,
  visualSceneId, layers }`。Runtime 侧（`onSceneEnter`，持有 `context.compiled`）是解析
  `visualSceneId → VisualScene → layers → ImageAsset.file` 这条链的唯一正确位置（Dev
  Spec §35「Renderer 不维护剧情」），`apps/renderer` 不读任何章节文件。
- **T002**：新增纯函数 `resolveVisualLayers`（`visualResolution.ts`），在
  `schemaResult.visuals.passed` 里以 `'layers' in value` / `'file' in value` 判别
  `VisualScene`/`ImageAsset`（两者与 `CharacterAsset` 同集合），两跳引用解析组装
  `ResolvedVisualLayer`；防御性处理：未知 `visualSceneId` 返回 `[]`，某层缺对应
  `ImageAsset` 时跳过该层不抛异常（D5）。
- **T004**：`index.ts` 仅追加 2 行导出（`resolveVisualLayers` +
  `ResolvedVisualLayer` 类型），符号可从包外导入。
- **T005**：新增 `composeLayers`（`apps/renderer/src/render/composeLayers.ts`），按 `z`
  升序排序（底层先渲染）、映射 `zIndex`、`parallax` 原样透传（未提供时结果对象不含该键，
  `exactOptionalPropertyTypes` 一致），不修改输入数组。
- **T006**：`App.tsx` 仅追加——新增纯函数 `pickSceneLayers(commands)`（取最近一条
  `SCENE_ENTER` 命令的 `layers` 跑 `composeLayers`，场景切换替换图层栈）+ 场景层
  `<section>` 渲染一组按 `zIndex` 定位的 `<img src={file}>`；DEV-020 既有
  HELLO/调试列表逻辑原样保留（diff 纯新增，A12）。测试落在唯一被授权的测试文件
  `composeLayers.test.ts`（Task Package 第 3 节 Writable Scope 不含 `App.test.ts`，
  D7）。
- CR 后的端到端验证（A09）落在新增 `visualResolution.test.ts` 内：驱动 `valid-minimal`
  到 `SCENE_ENTER`，断言命令含 `visualSceneId: 'vs-start'`、`layers ===
  resolveVisualLayers(...)`，且 `audio` 端口仍只发占位载荷（CR 未改 `audio.send` 行）。

## Changed Files

```text
packages/runtime-kernel/src/visualResolution.ts          （新增）
packages/runtime-kernel/src/visualResolution.test.ts     （新增）
packages/runtime-kernel/src/machine.ts                   （仅 onSceneEnter 一处 + 其所需
                                                            1 行 import，见 A08）
packages/runtime-kernel/src/index.ts                     （仅追加 2 行导出）
apps/renderer/src/render/composeLayers.ts                （新增）
apps/renderer/src/render/composeLayers.test.ts           （新增）
apps/renderer/src/App.tsx                                （仅追加）
specs/dev/DEV-021/INDEX.md
specs/dev/DEV-021/REQUIREMENTS.md
specs/dev/DEV-021/ACCEPTANCE.md
specs/dev/DEV-021/REPORT.md
specs/dev/DEV-021/DECISIONS.md
specs/comms/LEDGER.md（仅 0102 行状态 ISSUED→CLOSED：Codex 开工标志，消息 0102 节点状态指令）
```

`specs/comms/0103-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-021.md` 与 LEDGER 的 0103 行是本
节点的 NODE_REPORT 消息信道，已写入工作区（git_head 指向本提交），按仓库先例（DEV-007/
DEV-010/DEV-011/DEV-012/DEV-020 的 NODE_REPORT 消息文件均随 Commander 后续治理提交入库）
由下一个治理提交捕获。`pnpm-lock.yaml` 无 diff（`pnpm install` 提示 Already up to date，
零新增依赖）；`apps/renderer/src/App.test.ts` 全程零内容改动（工作树 CRLF 归一化不影响
blob，已核实 blob 哈希与 HEAD 一致，提交不含该文件）；根 `tsconfig.json`、
`packages/**`（除上列 runtime-kernel 四文件）、治理/规范文件全部零改动。

## Tests Executed

六条命令严格按要求顺序执行：

| Command | Exit code | Result |
|---|---:|---|
| `pnpm install` | 0 | PASS; Already up to date（零新增依赖，`pnpm-lock.yaml` 无 diff） |
| `pnpm typecheck` | 0 | PASS; `tsc -b && tsc -b --noEmit` + renderer 独立 `tsc --noEmit` |
| `pnpm lint` | 0 | PASS; `eslint .`，含新增 `.tsx` |
| `pnpm format:check` | 0 | PASS; All matched files use Prettier code style |
| `pnpm build` | 0 | PASS; `tsc -b` |
| `pnpm test` | 0 | PASS; 87 Test Files / 448 Tests（DEV-020 基线 85/432，新增 2 文件/16 条，既有零回归） |

新增测试明细：`visualResolution.test.ts` 11 条（真实 fixture 两跳链解析 / 未知
visualSceneId 空数组 / 缺引用层跳过不抛异常 / parallax 透传与键缺席 / CharacterAsset
不误判 / CR 端到端两路端口断言），`composeLayers.test.ts` 9 条（z 升序 / 稳定排序 /
负数 / parallax 语义 / 输入不改 / 空数组）+ `pickSceneLayers` 5 条（T006 纯逻辑）。

## Acceptance Results

| # | Result | Evidence |
|---|---|---|
| A01 | PASS | `pnpm install` exit code 0（Already up to date） |
| A02 | PASS | `pnpm typecheck` exit code 0：三步全过 |
| A03 | PASS | `pnpm lint` exit code 0 |
| A04 | PASS | `pnpm format:check` exit code 0 |
| A05 | PASS | `pnpm build` exit code 0 |
| A06 | PASS | `pnpm test` exit code 0：87 files / 448 tests；既有全部测试零回归 |
| A07 | PASS | `visualResolution.test.ts`：真实 `valid-minimal` 的 `vs-start` 解析出 `[{assetId:'img-forest', file:'assets/img/forest.png', z:0}]`；未知 id 返回 `[]`；手写缺引用 `ImageAsset` 的层被跳过且不抛异常、其余层正常解析 |
| A08 | PASS | `git diff machine.ts`：仅 `onSceneEnter` 内部（新增 `scene`/`layers` 两个局部变量 + `presentation.send` 调用参数变化）+ 实现该 CR 所必需的 1 行 import（`resolveVisualLayers`），其余全部内容逐字节不变（原因与必要性见 DECISIONS D1/D8） |
| A09 | PASS | 端到端：`createRuntimeMachine` 驱动 `valid-minimal` 至 `SCENE_ENTER`，presentation 命令 `kind === 'SCENE_ENTER'`、`sceneId: 'scene-start'`、`visualSceneId: 'vs-start'`、`layers` 与 `resolveVisualLayers` 返回值逐字一致；`audio` 端口仍为占位载荷（CR 未触 `audio.send` 行） |
| A10 | PASS | `git diff machine.test.ts` 为空（未修改）；全部测试通过含其既有断言 |
| A11 | PASS | `composeLayers.test.ts`：z 升序（含 z 相同稳定保持输入序、负数）、`parallax` 透传且未提供时结果对象无该键、输入数组不被修改 |
| A12 | PASS | `git diff App.tsx` 纯新增（imports / `pickSceneLayers` / 场景层 `<section>`），既有 `WS_URL`/`browserSocket`/`appendCommand`/HELLO/`<pre>` 调试列表逻辑逐字保留 |
| A13 | PASS | `apps/renderer` 的 DEV-020 冻结文件（`ws/`、`server/`、`main.tsx`、`package.json`/`tsconfig.json`/`vite.config.ts`/`index.html`）零 diff；`App.test.ts` blob 哈希与 HEAD 一致（工作树仅 CRLF 归一化，不属内容改动） |
| A14 | PASS | `git status`/`git diff`：`packages/**` 仅 runtime-kernel 的 `machine.ts`/`index.ts`/`visualResolution.ts`/`visualResolution.test.ts` 四个文件入 diff，其余包全部零改动 |
| A15 | PASS | `pnpm install` 零新增；`pnpm-lock.yaml`、根/包 `package.json` 均无 diff |
| A16 | PASS | `DECISIONS.md` 存在，覆盖 D1–D8（CR 理由、向后兼容核实结果、图片加载不出已知缺口、parallax 透传理由、防御性处理、排序语义、端到端测试落点、machine.ts import 行说明） |
| A17 | PASS | `specs/dev/DEV-021/` 五份文档齐全且已入库，`INDEX.md` T001–T007 全部勾选 |
| A18 | PASS | `git log` 新增恰 1 条提交，首行 `DEV-021: scene renderer`；提交时 `git status --porcelain` 为空 |
| A19 | PASS | LEDGER 0103 `NODE_REPORT-DEV-021` 记录 `git_head` 与提交一致 |
| A20 | PASS | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均零 diff |

## Scope Deviations

NONE（两条已在 REPORT/DECISIONS 内说明、均属 Task Package 既定内容的必要组成部分）：

1. `machine.ts` 新增 1 行 `import { resolveVisualLayers }`——实现第 2.2 节授权改动的
   必要条件（调用新文件函数必须导入），不在 `onSceneEnter` action 内部但为 CR 的
   直接附属，diff 仅此 1 行 import + action 内部改动（A08 已逐行核对）。
2. T006 的 `pickSceneLayers` 测试放在 `composeLayers.test.ts`（Writable Scope 内唯一
   授权的测试文件）：Task Package 第 3 节 Writable Scope 未列 `App.test.ts`，为遵守
   范围纪律将测试落在授权文件内，`App.test.ts` 保持零改动（D7）。

## Known Issues

NONE。

图片加载不出来是本节点**预期的诚实缺口**而非缺陷：`ResolvedVisualLayer.file` 是 Chapter
Pack 内相对路径（如 `assets/img/forest.png`），尚无任何静态资源服务器把它变成可加载
URL——那是 DEV-075 Chapter Packager / 部署管线的职责。本节点验证的是布局与命令数据的
正确性（D3）。

## Blockers

NONE。

## Future Considerations

- 真实图片加载：待 DEV-075 Chapter Packager / 部署管线提供静态资源服务后，
  `<img src={file}>` 可直接消费；当前阶段页面保持调试列表 + 空图层区。
- 镜头/视差动画（DEV-026）：`parallax` 数值已随 `RenderableLayer` 原样透传，下游直接
  消费，本节点不做任何动画计算。
- 角色渲染（DEV-022）、字幕（DEV-023）、选择 UI（DEV-024）、骰子 UI（DEV-025）均为
  后续节点内容，本节点未提前实现。

## Decisions

见 `specs/dev/DEV-021/DECISIONS.md`。已随最终提交一并入库。