# DEV-026 REPORT

## Status

READY_FOR_REVIEW

## Implemented

- **CR（T003）**：第四次对 `onSceneEnter`（STORY region）发窄范围 CR——`SCENE_ENTER`
  命令载荷追加 `cameraPreset` 一行（含 `context.compiled !== null && scene !== undefined`
  条件表达式），既有 `scene`/`layers`/`characters`/`narration` 计算与其余全部 action
  （含历次 CR 遗留代码）逐字节不变。
- **T002**：新增纯函数 `resolveCameraPreset`（`packages/runtime-kernel/src/cameraResolution.ts`）：
  在 `compiled.schemaResult.visuals.passed` 里找 `id === visualSceneId && 'layers' in
  value`（`VisualScene`），返回其 `cameraPreset`（optional，可能 `undefined`）；不存在
  的 `visualSceneId` 返回 `undefined` 不抛异常。**不修改 `resolveVisualLayers`**
  （DEV-021 冻结，DECISIONS D1）。
- **T004**：`index.ts` 仅追加导出 `resolveCameraPreset`。
- **T005**：新增 `cameraPreset.ts`（`resolveCameraPresetStyle`——内置 `closeup:
  scale(1.15)`/`wide: scale(0.9)` 小映射表，`undefined` 或任何未收录字符串一律回退
  `{transform: 'scale(1)'}`）与 `pickSceneMeta.ts`（`pickCameraPreset` 取最近一条
  `SCENE_ENTER` 的 `cameraPreset`；`pickSceneEnterKey` 取最近一条 `SCENE_ENTER` 的
  `commandSeq`，无则 `0`）。
- **T006**：`App.tsx` 仅追加——场景层容器追加 `key={pickSceneEnterKey(commands)}`
  （场景切换时 React 重挂载，天然重放 `fadeIn` 过渡）、内联 `transform`（
  `resolveCameraPresetStyle(pickCameraPreset(commands))`）、`fadeIn` CSS 动画。
  不删除既有场景层/角色/对话框/选项/骰子/调试列表逻辑。
- **转场不新增 schema 字段**（任务包第 1 节关键发现）：`chapter-schema` 无转场预设
  字段，转场是 Renderer 每次收到新场景时统一套用的内置淡入效果（DECISIONS D2）。

## Changed Files

```text
packages/runtime-kernel/src/machine.ts               （仅 onSceneEnter send 内一行新增，见 A08）
packages/runtime-kernel/src/cameraResolution.ts      （新增）
packages/runtime-kernel/src/cameraResolution.test.ts （新增）
packages/runtime-kernel/src/index.ts                 （仅追加导出 1 行，见 A15）
apps/renderer/src/render/cameraPreset.ts             （新增）
apps/renderer/src/render/cameraPreset.test.ts        （新增）
apps/renderer/src/render/pickSceneMeta.ts            （新增）
apps/renderer/src/render/pickSceneMeta.test.ts       （新增）
apps/renderer/src/App.tsx                            （仅追加，见 A13）
specs/dev/DEV-026/INDEX.md
specs/dev/DEV-026/REQUIREMENTS.md
specs/dev/DEV-026/ACCEPTANCE.md
specs/dev/DEV-026/REPORT.md
specs/dev/DEV-026/DECISIONS.md
specs/comms/LEDGER.md（0126 行状态 ISSUED→CLOSED：Codex 开工标志；NODE_REPORT 行追加）
specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-026.md
```

`pnpm-lock.yaml` 无 diff（`pnpm install` 提示 Already up to date，零新增依赖）；
`machine.test.ts`、`visualResolution.*`、`characterResolution.*`、`choiceResolution.*`、
`interactionRegion.*`、`pickDiceState.*` 及 DEV-020～025 冻结文件（`ws/`、`server/`、
`main.tsx`、`composeLayers.*`、`composeCharacters.*`、`pickDialogueLines.*`、
`lineIndex.*`、`pickInteractionOpen.*`、`package.json`/`tsconfig.json`/`vite.config.ts`/
`index.html`）、根配置、治理/规范文件全部零改动。

## Tests Executed

六条命令严格按要求顺序执行（T007 填写实际输出）：

| Command | Exit code | Result |
|---|---:|---|
| `pnpm install` | 0 | PASS; Already up to date（零新增依赖，`pnpm-lock.yaml` 无 diff） |
| `pnpm typecheck` | 0 | PASS; `tsc -b && tsc -b --noEmit` + renderer 独立 `tsc --noEmit` |
| `pnpm lint` | 0 | PASS; `eslint .`，含新增测试文件 |
| `pnpm format:check` | 0 | PASS; All matched files use Prettier code style（六个新增文件经 `prettier --write` 修正注释排版后零警告） |
| `pnpm build` | 0 | PASS; `tsc -b` |
| `pnpm test` | 0 | PASS; 97 Test Files / 505 Tests（DEV-025 基线 94/494，新增 3 文件/11 条，既有零回归） |

**端到端验证（A09，执行期运行时校验，非提交测试）**：临时测试文件（`packages/runtime-kernel/src/dev026E2E.tmp.test.ts`，运行后即删除，不进入仓库——runtime-kernel 无新授权 machine 级测试文件，沿用多节点先例）驱动 `createRuntimeMachine` + `chapterRootDir: …/test-fixtures/valid-minimal` + 捕获型 `presentation` port，`BOOT` 后取 `SCENE_ENTER` 命令。原始输出：

```text
SCENE_ENTER found: true
SCENE_ENTER payload: {"kind":"SCENE_ENTER","sceneId":"scene-start","visualSceneId":"vs-start","layers":[{"assetId":"img-forest","file":"assets/img/forest.png","z":0}],"characters":[{"characterId":"npc-guide","slot":"CENTER","visible":true,"file":"assets/img/guide-smile.png","microAnimations":[]}],"narration":["你站在森林入口。"]}
E2E PASS
```

`'cameraPreset' in payload === true` 且 `payload.cameraPreset === undefined`（`vs-start`
未设置该字段，如实反映；JSON.stringify 省略 undefined 字段属正常）。既有四字段
（`layers`/`characters`/`narration`/`visualSceneId`）原样保留。

新增测试明细：`cameraResolution.test.ts` 4 条（`vs-start` 无 `cameraPreset` 返回
`undefined` / 不存在的 `visualSceneId` 返回 `undefined` / 手写带 `closeup` 的
`VisualScene` 返回正确值 / `CharacterAsset` 不会被误判为 `VisualScene`）；
`cameraPreset.test.ts` 3 条（已收录 `closeup`/`wide` / 未收录与空串回退 `scale(1)` /
`undefined` 回退 `scale(1)`）；`pickSceneMeta.test.ts` 4 条（无命令或无关命令 /
有命令取最近一条含多场景 /
最新 `SCENE_ENTER` 未设置 preset 时复位 `undefined`（不残留旧场景）/
`cameraPreset` 非字符串视为未设置）。

## Acceptance Results

| # | Result | Evidence |
|---|---|---|
| A01 | PASS | `pnpm install` exit code 0（Already up to date） |
| A02 | PASS | `pnpm typecheck` exit code 0：三步全过 |
| A03 | PASS | `pnpm lint` exit code 0 |
| A04 | PASS | `pnpm format:check` exit code 0：六个新增文件经 `prettier --write` 后 All matched files use Prettier code style |
| A05 | PASS | `pnpm build` exit code 0（`tsc -b`） |
| A06 | PASS | `pnpm test` exit code 0：97 files / 505 tests；既有全部测试零回归（含未改动的 `machine.test.ts`） |
| A07 | PASS | `cameraResolution.test.ts`：带 `cameraPreset` 的 `VisualScene` 返回正确值；`valid-minimal` 的 `vs-start`（无字段）返回 `undefined`；不存在的 `visualSceneId` 返回 `undefined` 不抛异常；`CharacterAsset` 不误判 |
| A08 | PASS | `git diff machine.ts`：恰 1 行 import（`resolveCameraPreset`）+ `onSceneEnter` 的 `send` 调用内 `cameraPreset` 字段新增；既有 `scene`/`layers`/`characters`/`narration` 计算与其余全部 action（含历次 CR 遗留）逐字节不变 |
| A09 | PASS | 端到端执行期校验：`SCENE_ENTER` 含 `cameraPreset: undefined`（`vs-start` 未设置，如实反映），既有四字段原样保留（原始输出见 Tests Executed） |
| A10 | PASS | `git diff machine.test.ts` 为空（未修改）；`pnpm test` 全部通过含其既有断言 |
| A11 | PASS | `cameraPreset.test.ts`：`closeup`→`scale(1.15)`、`wide`→`scale(0.9)`、未收录/空串/`undefined`→`scale(1)` 均返回安全值 |
| A12 | PASS | `pickSceneMeta.test.ts`：无命令 / 有命令取最近一条（含多场景）/ 最新 `SCENE_ENTER` 无 preset 复位 `undefined` / 非字符串视为未设置，均正确返回 |
| A13 | PASS | `git diff App.tsx`：+18/-1。删除的恰好是被改写为多行的原 `<section aria-label="scene layers">` 开标签本身（T006 要求给该元素加 `key`/`transform`/`animation` props），非删除任何既有逻辑；DEV-020～025 既有场景层/角色/对话框/选项/骰子/调试列表逻辑全部保留 |
| A14 | PASS | `apps/renderer` 的 DEV-020～025 冻结文件（`ws/`、`server/`、`main.tsx`、`composeLayers.*`、`composeCharacters.*`、`pickDialogueLines.*`、`lineIndex.*`、`pickInteractionOpen.*`、`pickDiceState.*`、`package.json`/`tsconfig.json`/`vite.config.ts`/`index.html`）及 `App.test.tsx` 零 diff |
| A15 | PASS | `git diff`：`packages/**` 仅 runtime-kernel 的 `machine.ts`（2 处新增）/`index.ts`（1 行追加）+ 新增 `cameraResolution.*` 入 diff；其余包全部零改动；`resolveVisualLayers` 未触碰 |
| A16 | PASS | `pnpm install` 零新增；`pnpm-lock.yaml`、根/包 `package.json` 均无 diff |
| A17 | PASS | `DECISIONS.md` 存在，覆盖第 6 节全部要点（D1 不修改 `resolveVisualLayers`、D2 转场不新增 schema 字段、D3 preset→CSS 映射表内容与未收录安全回退）及 D4/D5/D6 技术决策 |
| A18 | PASS | `specs/dev/DEV-026/` 六份文档齐全且已入库，`INDEX.md` T001–T007 全部勾选且 `Status:` 表头为 `READY_FOR_REVIEW` |
| A19 | PASS | `git log` 新增恰 1 条提交，首行 `DEV-026: camera transition`；提交时 `git status --porcelain` 为空 |
| A20 | PASS | LEDGER `NODE_REPORT-DEV-026` 记录 `git_head` 与提交一致 |
| A21 | PASS | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均零 diff |

## Scope Deviations

NONE。本节点 Writable Scope 内每个 Allowed File 均有真实非空改动：`machine.ts`（1 行 import + `onSceneEnter` 内 `cameraPreset` 新增）、`cameraResolution.ts`/`cameraResolution.test.ts`（新增）、`index.ts`（+1 行导出）、`cameraPreset.ts`/`cameraPreset.test.ts`/`pickSceneMeta.ts`/`pickSceneMeta.test.ts`（新增）、`App.tsx`（追加 + 场景容器开标签改写）、六份节点文档（`INDEX.md`/`REQUIREMENTS.md`/`ACCEPTANCE.md`/`REPORT.md`/`DECISIONS.md`）、`LEDGER.md`（0126 行开工标记 + NODE_REPORT 行追加）、`NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-026.md`。临时 e2e 测试文件运行后即删除，不进入仓库。无越权改动、无顺手重构、无新依赖。

## Known Issues

NONE。

## Blockers

NONE。

## Future Considerations

- 更多 preset 条目（如 `dolly-in`/`blackout`）与不同的转场效果类型：本节点只内置
  `closeup`/`wide` 两个镜头预设与一种淡入转场；若未来章节需要更多，是 `cameraPreset.ts`
  映射表的纯增量扩展，不改任何接口。
- `cameraPreset` 随 `SCENE_ENTER` 下发但 `vs-start` 等未设置：preset 未设置时回退
  `scale(1)`，无行为差异，无需预处理。
- BGM/SFX（DEV-027）、Presentation Command Bus（DEV-028）为后续节点内容，本节点未
  提前实现。

## Decisions

见 `specs/dev/DEV-026/DECISIONS.md`。已随最终提交一并入库。