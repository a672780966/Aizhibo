# DEV-023 REPORT

## Status

READY_FOR_REVIEW

## Implemented

- T001–T006 completed.
- **CR #3（T002）**：对 DEV-009 已冻结、DEV-021/022 已 CR 过两次的 `onSceneEnter` action 再发
  窄范围 Change Request——`SCENE_ENTER` 命令载荷追加 `narration` 字段（场景旁白）。只新增一行
  `narration: scene?.narration ?? []`，`scene`/`layers`/`characters` 的既有计算（DEV-021/022 遗留）
  逐字节不变，`audio.send`/`storyMove` 返回及全部其它 action 不变。`narration` 是纯字符串数组，
  不需要任何跨文件引用解析（不像 `layers`/`characters` 需要查 `visuals`/`npc` 集合），本节点不新增
  任何 `resolveX` 纯函数、不动 `index.ts`（无新增导出）。`onResultPlaying` 未改动——已有的
  `RESULT_PLAYING`/`text`（DEV-009 起冻结）直接复用为结算叙事来源。
- **T003**：新增纯函数 `pickDialogueLines`（`apps/renderer/src/render/pickDialogueLines.ts`），
  返回 `{ lines, key }`：分别取最近一条 `SCENE_ENTER`（取其 `narration`）与最近一条
  `RESULT_PLAYING`（取其 `text` 包成单元素数组）两者的 `commandSeq`，谁的 `commandSeq` 更大就用
  谁（D2）——新场景覆盖旧结算文本，新结算文本覆盖旧场景旁白。都不存在返回 `{lines: [], key: 0}`；
  `SCENE_ENTER` 未携带 `narration` 字段时视为空数组（防御，D3）。
- **T004**：新增 `clampLineIndex`/`nextLineIndex`（`apps/renderer/src/render/lineIndex.ts`）——
  把下标夹到 `[0, lines.length-1]`（空数组返回 `0`），`nextLineIndex` 在最后一行不再前进（D6）。
- **T005**：`App.tsx` 仅追加——新增 `pickDialogueLines`/`clampLineIndex`/`nextLineIndex` 三个 import、
  本地 `lineIndex` 状态、`useEffect(..., [dialogue.key])` 在对话内容换新时重置 `lineIndex=0`（D3）、
  底部点击推进对话框（渲染 `lines[clampLineIndex(...)]` + "第 N/M 行"提示，点击调 `nextLineIndex`
  推进）；DEV-020/021/022 既有场景层/角色/HELLO/调试列表逻辑逐字保留（diff 纯新增，A12）。
- **正式不做"读完旁白才能继续"的门控**（任务包 2.2 节已知边界，D4）：Renderer 无向 Runtime 回传
  通道，真正的节奏门控需要新增 `RootEvent` 的架构决策，不在本节点范围。
- CR #3 的端到端验证（A08，T002）：执行期驱动真实 actor 到 `SCENE_ENTER`，捕获命令含
  `narration: ["你站在森林入口。"]` 与 `scene-start.json` 一致（原始输出见 Tests Executed 下方
  D5 / A08 证据），不改动 Read-only 的 `machine.test.ts`（D5，新增 runtime-kernel 测试文件即越界）。

## Changed Files

```text
packages/runtime-kernel/src/machine.ts                    （仅 onSceneEnter 内新增 1 行，见 A07）
apps/renderer/src/render/pickDialogueLines.ts             （新增）
apps/renderer/src/render/pickDialogueLines.test.ts        （新增）
apps/renderer/src/render/lineIndex.ts                     （新增）
apps/renderer/src/render/lineIndex.test.ts                （新增）
apps/renderer/src/App.tsx                                 （仅追加，见 A12）
specs/dev/DEV-023/INDEX.md
specs/dev/DEV-023/REQUIREMENTS.md
specs/dev/DEV-023/ACCEPTANCE.md
specs/dev/DEV-023/REPORT.md
specs/dev/DEV-023/DECISIONS.md
specs/comms/LEDGER.md（仅 0110 行状态 ISSUED→CLOSED：Codex 开工标志 + 0111 NODE_REPORT 行占号）
specs/comms/0111-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-023.md（NODE_REPORT 消息，按先例随治理提交入库）
```

`pnpm-lock.yaml` 无 diff（`pnpm install` 提示 Already up to date，零新增依赖）；`index.ts`、
`machine.test.ts`、`apps/renderer/src/App.test.ts` 全程零内容改动；`packages/**`（除 `machine.ts`
一处）、DEV-020/021/022 冻结文件（`ws/`、`server/`、`main.tsx`、`composeLayers.*`、
`composeCharacters.*`、`package.json`/`tsconfig.json`/`vite.config.ts`/`index.html`）、根配置、治理/
规范文件全部零改动。

## Tests Executed

六条命令严格按要求顺序执行：

| Command | Exit code | Result |
|---|---:|---|
| `pnpm install` | 0 | PASS; Already up to date（零新增依赖，`pnpm-lock.yaml` 无 diff） |
| `pnpm typecheck` | 0 | PASS; `tsc -b && tsc -b --noEmit` + renderer 独立 `tsc --noEmit` |
| `pnpm lint` | 0 | PASS; `eslint .`，含新增 `.tsx` |
| `pnpm format:check` | 0 | PASS; All matched files use Prettier code style（新增文件经 prettier 归一化后全过） |
| `pnpm build` | 0 | PASS; `tsc -b` |
| `pnpm test` | 0 | PASS; 91 Test Files / 477 Tests（DEV-022 基线 89/465，新增 2 文件/12 条，既有零回归） |

**端到端验证（A08，执行期运行时校验，非提交测试）**：临时脚本驱动 `createRuntimeMachine` +
`chapterRootDir: …/test-fixtures/valid-minimal` + `ports.presentation` 捕获，`actor.send({type:'BOOT'})`
后取 `kind === 'SCENE_ENTER'` 命令：

```text
SCENE_ENTER found: true
narration: ["你站在森林入口。"]
expected : ["你站在森林入口。"]
MATCH: true
```

脚本运行后即删除，不进入仓库（D5：runtime-kernel 无新授权测试文件，新增即越界；`machine.test.ts`
保持零改动）。

新增测试明细：`pickDialogueLines.test.ts` 5 条（仅场景取 narration / 仅结算取 `[text]` / 两者都存
在按 `commandSeq` 取较大 / `SCENE_ENTER` 缺 `narration` 或非法视为空数组 / 都不存在返回
`{lines:[],key:0}` 与非法命令防御）、`lineIndex.test.ts` 7 条（`clampLineIndex` 空数组/负下标/越界
正下标/合法下标四态 + `nextLineIndex` 空数组/顺序推进/最后一行不再前进三态）。

## Acceptance Results

| # | Result | Evidence |
|---|---|---|
| A01 | PASS | `pnpm install` exit code 0（Already up to date） |
| A02 | PASS | `pnpm typecheck` exit code 0：三步全过 |
| A03 | PASS | `pnpm lint` exit code 0 |
| A04 | PASS | `pnpm format:check` exit code 0 |
| A05 | PASS | `pnpm build` exit code 0 |
| A06 | PASS | `pnpm test` exit code 0：91 files / 477 tests；既有全部测试零回归（含未改动的 `machine.test.ts`） |
| A07 | PASS | `git diff machine.ts`：恰 1 行新增 `narration: scene?.narration ?? []`，位于 `onSceneEnter` 的 `presentation.send` 调用内；DEV-021/022 遗留的 `scene`/`layers`/`characters` 计算、`audio.send`、`storyMove` 返回及其余全部 action 逐字节不变 |
| A08 | PASS | 端到端执行期校验：`SCENE_ENTER` 命令含 `narration: ["你站在森林入口。"]`，与 `scene-start.json` 的 `narration` 字段一致（原始输出见 Tests Executed）；`onResultPlaying` 的 `RESULT_PLAYING.text` 未改动 |
| A09 | PASS | `git diff machine.test.ts` 为空（未修改）；`pnpm test` 全部通过含其既有断言 |
| A10 | PASS | `pickDialogueLines.test.ts`：仅场景/仅结算/两者都有按 `commandSeq` 取较大/都无 四种组合均正确 |
| A11 | PASS | `lineIndex.test.ts`：`clampLineIndex` 空数组/负下标/越界正下标/合法下标、`nextLineIndex` 空数组/顺序推进/最后一行不再前进均正确夹取 |
| A12 | PASS | `git diff App.tsx` 纯新增（3 行 import + `dialogue` 计算 + `lineIndex` 状态 + `useEffect` 重置 + 底部点击对话框），DEV-020/021/022 既有 `WS_URL`/`browserSocket`/`appendCommand`/HELLO/`pickSceneLayers`/`pickSceneCharacters`/场景层/角色/`<pre>` 调试列表逻辑逐字保留 |
| A13 | PASS | `apps/renderer` 的 DEV-020/021/022 冻结文件（`ws/`、`server/`、`main.tsx`、`composeLayers.*`、`composeCharacters.*`、`App.test.ts`、`package.json`/`tsconfig.json`/`vite.config.ts`/`index.html`）零 diff |
| A14 | PASS | `git status`/`git diff`：`packages/**` 仅 runtime-kernel 的 `machine.ts` 一文件入 diff（1 行），`index.ts` 及其余包全部零改动 |
| A15 | PASS | `pnpm install` 零新增；`pnpm-lock.yaml`、根/包 `package.json` 均无 diff |
| A16 | PASS | `DECISIONS.md` 存在，覆盖第 6 节全部要点（D1 为何不新开命令类型、D2 `commandSeq` 比较决定显示来源的理由、D3 `key` 语义、D4 不做读完门控的已知边界）及 D5/D6 技术决策 |
| A17 | PASS | `specs/dev/DEV-023/` 五份文档齐全且已入库，`INDEX.md` T001–T006 全部勾选且 `Status:` 表头为 `READY_FOR_REVIEW`（本次已主动做对，不复刻 DEV-021/022 漏改疏漏） |
| A18 | PASS | `git log` 新增恰 1 条提交，首行 `DEV-023: subtitle dialogue`；提交时 `git status --porcelain` 为空 |
| A19 | PASS | LEDGER 0111 `NODE_REPORT-DEV-023` 记录 `git_head` 与提交一致 |
| A20 | PASS | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均零 diff |

## Scope Deviations

NONE。本节点 Writable Scope 内每个 Allowed File 均有真实非空改动：`machine.ts`（+1 行）、
`pickDialogueLines.ts`/`lineIndex.ts`（新增实现）、两个 `.test.ts`（新增测试）、`App.tsx`（追加）、
五份节点文档（`INDEX.md`/`REQUIREMENTS.md`/`ACCEPTANCE.md`/`REPORT.md`/`DECISIONS.md` 新增）。
无越权改动、无顺手重构、无新依赖。

## Known Issues

NONE。

对话框仅展示与点击推进，不把"读完"信号回传 Runtime——这是**预期的诚实边界**而非缺陷：Renderer
无回传通道（唯一入站 hook `onRendererHello` 语义是重握手/请求 RESYNC），真正节奏门控留给未来需要
新增 `RootEvent` 的架构决策（D4，任务包 2.2 节 Non-goals）。本节点验证的是展示 / `commandSeq`
来源判定 / 点击推进这三条逻辑的正确性。

## Blockers

NONE。

## Future Considerations

- 真正的节奏门控（"读完对白才能继续"）：需要新增 `RootEvent` 与 Runtime 入站通道，属另一次架构
  决策，由 Commander 在合适节点或 `CHANGE_REQUEST` 中另行设计；本节点不做预言。
- 打字机逐字效果：任务包明确不做（分页显示整行），若产品需要可后续在 `App.tsx` 的对话框内平滑加
  入，不动 `lines[]` 数据形状。
- 选择 UI（DEV-024）、骰子 UI（DEV-025）、镜头/视差动画（DEV-026）均为后续节点内容，本节点未提前
  实现。

## Decisions

见 `specs/dev/DEV-023/DECISIONS.md`。已随最终提交一并入库。
