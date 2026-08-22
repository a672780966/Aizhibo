# DEV-027 REPORT

## Status

READY_FOR_REVIEW

## Implemented

- **CR（T003）**：第五次对 `onSceneEnter`（STORY region）发窄范围 CR——`SCENE_ENTER`
  **Presentation** 命令载荷追加 `audio` 一行（含 `context.compiled !== null && scene
  !== undefined` 条件表达式），既有六个字段（`sceneId`/`visualSceneId`/`layers`/
  `characters`/`narration`/`cameraPreset`）计算与紧随其后的
  `context.ports.audio.send({kind:'SCENE_ENTER', sceneId})`（独立的、本节点不碰的一
  行）逐字节不变。
- **T002**：新增纯函数 `resolveSceneAudio`（`packages/runtime-kernel/src/audioResolution.ts`）：
  对 `scene.bgm`（若存在）与 `scene.ambience` 数组的每个 id，在
  `compiled.schemaResult.audio.passed` 里找 `AudioAsset`；找不到条目或
  `source==='RUNTIME_TTS'`（无 `file`，DEV-034+ TTS 管线资产，本节点不处理语音）
  一律跳过，不抛异常；`loop`/`gain` 原样透传（可能是 `undefined`）。
- **T004**：`index.ts` 仅追加导出 `resolveSceneAudio` 与类型 `ResolvedAudio`。
- **T005**：新增 `pickSceneAudio`（`apps/renderer/src/render/pickSceneAudio.ts`）：取
  最近一条 `SCENE_ENTER` 命令的 `audio` 字段，没有则返回 `{ambience: []}`。
- **T006**：`App.tsx` 仅追加——为 `bgm`（若存在）与每条 `ambience` 渲染 `<audio
  autoPlay>` 元素，`key={resolved.id}`（同一 `id` 跨场景不重启、不同 `id` 触发浏览器
  挂载新元素从头播放）、`loop={resolved.loop ?? true}`（BGM/环境音默认循环，作者显式
  `loop:false` 仍被尊重）、`volume={clamp(resolved.gain ?? 1, 0, 1)}`。不删除既有
  场景层/角色/对话框/选项/骰子/镜头转场/调试列表逻辑。
- **BGM/SFX 走 Presentation 通道，不新建 Audio 传输**（任务包第 1 节关键架构决策）：
  `Ports.audio`/`audioRegion.ts`/`ports.ts` 均未触碰——真正需要声道仲裁的传输留给
  DEV-032（M3），本节点不抢建可能被推翻的基础设施（DECISIONS D1）。
- **已知边界，如实记录**：不处理事件触发型 SFX（骰子音效、UI 反馈音等——目前无任何
  信号携带"现在该放哪个 SFX"，本节点只做场景级 BGM/环境音，DECISIONS D4）。

## Changed Files

```text
packages/runtime-kernel/src/machine.ts               （仅 onSceneEnter 的 presentation send
                                                         内 audio 一行新增，见 A08）
packages/runtime-kernel/src/audioResolution.ts       （新增）
packages/runtime-kernel/src/audioResolution.test.ts  （新增）
packages/runtime-kernel/src/index.ts                 （仅追加导出 2 行，见 A15）
apps/renderer/src/render/pickSceneAudio.ts           （新增）
apps/renderer/src/render/pickSceneAudio.test.ts      （新增）
apps/renderer/src/App.tsx                            （仅追加，见 A12）
specs/dev/DEV-027/INDEX.md
specs/dev/DEV-027/REQUIREMENTS.md
specs/dev/DEV-027/ACCEPTANCE.md
specs/dev/DEV-027/REPORT.md
specs/dev/DEV-027/DECISIONS.md
specs/comms/LEDGER.md（0130 行状态 ISSUED→CLOSED：Codex 开工标志；NODE_REPORT 行追加）
specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-027.md
```

`pnpm-lock.yaml` 无 diff（`pnpm install` 提示 Already up to date，零新增依赖）；
`machine.test.ts`、`ports.ts`、`audioRegion.*`、`visualResolution.*`、
`characterResolution.*`、`choiceResolution.*`、`cameraResolution.*`、
`interactionRegion.*`、`pickDiceState.*`、`cameraPreset.*`、`pickSceneMeta.*` 及
DEV-020～026 冻结文件（`ws/`、`server/`、`main.tsx`、`composeLayers.*`、
`composeCharacters.*`、`pickDialogueLines.*`、`lineIndex.*`、`pickInteractionOpen.*`、
`package.json`/`tsconfig.json`/`vite.config.ts`/`index.html`）、根配置、治理/规范文件
全部零改动。

## Tests Executed

六条命令严格按要求顺序执行（T007 填写实际输出）：

| Command | Exit code | Result |
|---|---:|---|
| `pnpm install` | 0 | PASS; Already up to date（零新增依赖，`pnpm-lock.yaml` 无 diff） |
| `pnpm typecheck` | 0 | PASS; `tsc -b && tsc -b --noEmit` + renderer 独立 `tsc --noEmit`（修复：`volume` 非 JSX prop，改 ref callback 设置；闭包内 `sceneBgm` 先取出窄化） |
| `pnpm lint` | 0 | PASS; `eslint .`，含新增测试文件 |
| `pnpm format:check` | 0 | PASS; All matched files use Prettier code style（四个新增文件经 `prettier --write` 后零警告） |
| `pnpm build` | 0 | PASS; `tsc -b` |
| `pnpm test` | 0 | PASS; 99 Test Files / 515 Tests（DEV-026 基线 97/505，新增 2 文件/10 条，既有零回归） |

**端到端验证（A09，执行期运行时校验，非提交测试）**：临时测试文件（`packages/runtime-kernel/src/dev027E2E.tmp.test.ts`，运行后即删除，不进入仓库，沿用多节点先例）驱动 `createRuntimeMachine` + `chapterRootDir: …/test-fixtures/valid-minimal` + 捕获型 `presentation` port，`BOOT` 后取 `SCENE_ENTER` 命令。原始输出：

```text
SCENE_ENTER found: true
audio: {"bgm":{"id":"bgm-main","file":"assets/audio/bgm-main.mp3"},"ambience":[{"id":"amb-forest","file":"assets/audio/amb-forest.mp3"}]}
E2E PASS
```

`SCENE_ENTER`（presentation）命令含正确 `audio.bgm`/`audio.ambience`，与
`scene-start.json` 的 `bgm: 'bgm-main'`/`ambience: ['amb-forest']` 解析一致。

新增测试明细：`audioResolution.test.ts` 5 条（真实 `valid-minimal` 的 `scene-start`
返回 `bgm-main`/`amb-forest` / 手写 `RUNTIME_TTS` 引用防御性跳过 / `scene.bgm` 未定义
时结果不含 `bgm` 字段 / 找不到的 id 跳过 / `loop`/`gain` 原样透传含 exactOptional
键）；`pickSceneAudio.test.ts` 5 条（无命令或无关命令 / 有命令含 bgm+ambience /
多 SCENE_ENTER 取最近 / 最新无 audio 复位 `{ambience: []}` / 非对象/非数组/缺 file
等防御降级）。

## Acceptance Results

| # | Result | Evidence |
|---|---|---|
| A01 | PASS | `pnpm install` exit code 0（Already up to date） |
| A02 | PASS | `pnpm typecheck` exit code 0：三步全过（含 `volume` 改 ref callback、`sceneBgm` 窄化两处修复） |
| A03 | PASS | `pnpm lint` exit code 0 |
| A04 | PASS | `pnpm format:check` exit code 0：四个新增文件经 `prettier --write` 后 All matched files use Prettier code style |
| A05 | PASS | `pnpm build` exit code 0（`tsc -b`） |
| A06 | PASS | `pnpm test` exit code 0：99 files / 515 tests；既有全部测试零回归（含未改动的 `machine.test.ts`） |
| A07 | PASS | `audioResolution.test.ts`：真实 `scene-start` 返回 `bgm-main`/`amb-forest`；`RUNTIME_TTS` 引用防御性跳过；`scene.bgm` 未定义时结果不含 `bgm` 字段；找不到的 id 跳过；`loop`/`gain` 透传 |
| A08 | PASS | `git diff machine.ts`：恰 1 行 import（`resolveSceneAudio`）+ `onSceneEnter` 的 presentation `send` 内 `audio` 字段新增；紧随其后的 `context.ports.audio.send(...)` 与既有六个字段计算、其余 action（含历次 CR 遗留）逐字节不变 |
| A09 | PASS | 端到端执行期校验：`SCENE_ENTER`（presentation）命令含正确 `audio.bgm`/`audio.ambience`（原始输出见 Tests Executed） |
| A10 | PASS | `git diff machine.test.ts` 为空（未修改）；`pnpm test` 全部通过含其既有断言 |
| A11 | PASS | `pickSceneAudio.test.ts`：无命令 / 有命令含 bgm+ambience / 多 SCENE_ENTER 取最近 / 最新无 audio 复位 / 防御降级，均正确返回 |
| A12 | PASS | `git diff App.tsx`：纯新增（`clampVolume` helper + import + `sceneAudio` 计算 + `<audio>` 渲染；`grep '^-'` 零真实删除行），DEV-020～026 既有逻辑逐字保留 |
| A13 | PASS | `apps/renderer` 的 DEV-020～026 冻结文件（`ws/`、`server/`、`main.tsx`、`composeLayers.*`、`composeCharacters.*`、`pickDialogueLines.*`、`lineIndex.*`、`pickInteractionOpen.*`、`pickDiceState.*`、`cameraPreset.*`、`pickSceneMeta.*`、`package.json`/`tsconfig.json`/`vite.config.ts`/`index.html`）及 `App.test.tsx` 零 diff |
| A14 | PASS | `git diff ports.ts`/`audioRegion.ts` 为空（未修改，不给 `Ports.audio` 建传输） |
| A15 | PASS | `git diff`：`packages/**` 仅 runtime-kernel 的 `machine.ts`（2 处新增）/`index.ts`（2 行追加）+ 新增 `audioResolution.*` 入 diff；其余包全部零改动 |
| A16 | PASS | `pnpm install` 零新增；`pnpm-lock.yaml`、根/包 `package.json` 均无 diff |
| A17 | PASS | `DECISIONS.md` 存在，覆盖第 6 节全部要点（D1 走 Presentation 通道不给 `Ports.audio` 建传输、D2 `loop` 默认循环的产品默认值、D4 SFX 已知边界）及 D3/D5/D6 技术决策 |
| A18 | PASS | `specs/dev/DEV-027/` 六份文档齐全且已入库，`INDEX.md` T001–T007 全部勾选且 `Status:` 表头为 `READY_FOR_REVIEW` |
| A19 | PASS | `git log` 新增恰 1 条提交，首行 `DEV-027: bgm sfx`；提交时 `git status --porcelain` 为空 |
| A20 | PASS | LEDGER `NODE_REPORT-DEV-027` 记录 `git_head` 与提交一致 |
| A21 | PASS | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均零 diff |

## Scope Deviations

NONE。本节点 Writable Scope 内每个 Allowed File 均有真实非空改动：`machine.ts`（1 行 import + `onSceneEnter` 的 presentation send 内 `audio` 新增）、`audioResolution.ts`/`audioResolution.test.ts`（新增）、`index.ts`（+2 行导出）、`pickSceneAudio.ts`/`pickSceneAudio.test.ts`（新增）、`App.tsx`（纯追加含 `clampVolume` helper）、六份节点文档（`INDEX.md`/`REQUIREMENTS.md`/`ACCEPTANCE.md`/`REPORT.md`/`DECISIONS.md`）、`LEDGER.md`（0130 行开工标记 + NODE_REPORT 行追加）、`NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-027.md`。临时 e2e 测试文件运行后即删除，不进入仓库。无越权改动、无顺手重构、无新依赖。

## Known Issues

NONE。

## Blockers

NONE。

## Future Considerations

- 事件触发型 SFX（骰子音效、UI 反馈音）：目前无信号携带"现在该放哪个 SFX"，未来
  大概率是另一次 CR（例如给 `DICE_INTRO`/`DICE_RESULT` 或 `INTERACTION_OPEN` 等既有
  命令附加音效 id）。
- `Ports.audio` 独立传输与声道占用仲裁（CR-005）：DEV-032（M3）的职责，届时再决定
  怎么建。
- TTS/语音朗读（`RUNTIME_TTS` 资产）：DEV-034+ 的职责，本节点明确跳过。

## Decisions

见 `specs/dev/DEV-027/DECISIONS.md`。已随最终提交一并入库。