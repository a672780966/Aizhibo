# DEV-025 REPORT

## Status

READY_FOR_REVIEW

## Implemented

- **CR #1（T002）**：对 `onLock`（INTERACTION region）追加纯信号 `DICE_INTRO`（`LOCKING`
  转移入口），无载荷——投票已锁定，具体摇几颗骰子由后续 `DICE_RESULT` 携带。
- **CR #2（T002）**：对 `onResolve`（INTERACTION region，真正掷骰与结算的地方）在
  `const outcome = resolveGroups(...)` 之后、`buildNarrativeInputs` 之前追加
  `DICE_RESULT` 下发，只下发展示相关字段（`diceType`/`rawValue`/`modifier`/
  `finalValue`/`quality`），丢弃 `seed`/`rollIndex`/`appliedModifiers`（重放/内部记账
  字段，与 DEV-024 丢弃 `Choice.actionType`/`ruleId` 同一原则——这些字段本来就是
  `DICE.PUBLISHED`（`visibility: 'PUBLIC'`）已承认对观众公开的数据，下发不构成新的
  信息泄露）。`machine.ts` 的 git diff 精确限定在 `onLock`/`onResolve` 两处；INTERACTION
  region 其余 action（`onAnnouncing`/`onOpen`/`onVote`/`onResolved`）与 STORY region 的
  `onSceneEnter`（含历次 CR 遗留代码）逐字节不变。
- **T003**：新增纯函数 `pickDiceState`（`apps/renderer/src/render/pickDiceState.ts`），
  比较最近一条 `DICE_INTRO` 与最近一条 `DICE_RESULT` 的 `commandSeq`：都不存在→
  `{phase:'IDLE', results:[], key:0}`；`DICE_RESULT` 更新→`{phase:'RESOLVE', results:
  <映射>, key:<其 seq>}`；`DICE_INTRO` 更新（或只有它）→`{phase:'INTRO', results:[],
  key:<其 seq>}`。`results` 非数组时视为空数组（与 `pickDialogueLines`/`pickInteractionOpen`
  同款防御）。渲染器只做展示数据挑选，不读任何章节文件（Dev Spec §35）。
- **T004**：`App.tsx` 仅追加——新增 `dice` 计算（`pickDiceState(commands)`）、本地
  `rolling` 状态，`phase==='INTRO'` 且 `key` 变化时置 true（CSS 循环动画"摇骰中…"），
  `phase==='RESOLVE'` 时置 false 并展示 `results`（"d20：14 + 2 = 16（SUCCESS）"格式）。
  LOOP 阶段**完全是本地视觉过渡，不是等待服务端**——真实节奏控制（DEV-037）不在本
  节点实现。DEV-020/021/022/023/024 既有场景层/角色/对话框/选项/倒计时/调试列表逻辑
  逐字保留（diff 纯新增，A11）。
- **没有实现真实节奏等待**（任务包第 1 节强约束）：当前 `onResolve` 掷骰计算同步瞬间
  完成，INTRO 与 RESULT 在实际命令流中相继到达；LOOP 动画是 Renderer 本地视觉状态，
  何时揭晓由真实计算结果（RESOLVE 信号）到达驱动，不引入任何人为延迟——把"摇骰子
  的观感时长"接入叙事节奏是 DEV-037 的职责。

## Changed Files

```text
packages/runtime-kernel/src/machine.ts               （仅 onLock/onResolve 两处新增，见 A07）
apps/renderer/src/render/pickDiceState.ts            （新增）
apps/renderer/src/render/pickDiceState.test.ts       （新增）
apps/renderer/src/App.tsx                            （仅追加，见 A11）
specs/dev/DEV-025/INDEX.md
specs/dev/DEV-025/REQUIREMENTS.md
specs/dev/DEV-025/ACCEPTANCE.md
specs/dev/DEV-025/REPORT.md
specs/dev/DEV-025/DECISIONS.md
specs/comms/LEDGER.md（0118 行状态 ISSUED→CLOSED：Codex 开工标志；0119 NODE_REPORT 追加）
specs/comms/0119-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-025.md
```

`pnpm-lock.yaml` 无 diff（`pnpm install` 提示 Already up to date，零新增依赖）；
`machine.test.ts`、`interactionRegion.*`、`index.ts`、`choiceResolution.*`、
`visualResolution.*`/`characterResolution.*`、`apps/renderer/src/App.test.tsx` 及
DEV-020/021/022/023/024 冻结文件（`ws/`、`server/`、`main.tsx`、`composeLayers.*`、
`composeCharacters.*`、`pickDialogueLines.*`、`lineIndex.*`、`pickInteractionOpen.*`、
`package.json`/`tsconfig.json`/`vite.config.ts`/`index.html`）、根配置、治理/规范文件
全部零改动。

## Tests Executed

六条命令严格按要求顺序执行（T005 填写实际输出）：

| Command | Exit code | Result |
|---|---:|---|
| `pnpm install` | 0 | PASS; Already up to date（零新增依赖，`pnpm-lock.yaml` 无 diff） |
| `pnpm typecheck` | 0 | PASS; `tsc -b && tsc -b --noEmit` + renderer 独立 `tsc --noEmit` |
| `pnpm lint` | 0 | PASS; `eslint .`，含新增 `.tsx`/测试文件 |
| `pnpm format:check` | 0 | PASS; All matched files use Prettier code style（`specs/` 在 `.prettierignore`；`App.tsx`/两个新增文件经 `prettier --write` 修正后零警告） |
| `pnpm build` | 0 | PASS; `tsc -b` |
| `pnpm test` | 0 | PASS; 94 Test Files / 494 Tests（DEV-024 基线 93/487，新增 1 文件/7 条，既有零回归） |

**端到端验证（A08，执行期运行时校验，非提交测试）**：临时测试文件（`packages/runtime-kernel/src/dev025E2E.tmp.test.ts`，运行后即删除，不进入仓库——runtime-kernel 无新授权 machine 级测试文件，与 DEV-024 D5 同一先例）驱动 `createRuntimeMachine` + `chapterRootDir: …/test-fixtures/valid-minimal` + 捕获型 `presentation` port，按 `BOOT → STORY.DONE → INTERACTION.OPEN → VOTE(u1,A) → VOTE(u2,A) → LOCK` 推到 `LOCKED` 结算。原始输出：

```text
DICE_INTRO found: true
DICE_RESULT found: true
intro before result: true
DICE_RESULT payload: {"kind":"DICE_RESULT","results":[{"diceType":"d20","rawValue":8,"modifier":0,"finalValue":8,"quality":"FAILURE"}]}
result[0] keys: ["diceType","finalValue","modifier","quality","rawValue"]
E2E PASS
```

`DICE_INTRO` 在 `LOCK` 后、`DICE_RESULT` 在 `LOCKED` 后依次捕获，`results[0]` 字段恰为
`diceType`/`rawValue`/`modifier`/`finalValue`/`quality` 五个展示字段，不含 `seed`/
`rollIndex`/`appliedModifiers`；且 `finalValue === rawValue + modifier`（8 = 8 + 0）。

新增测试明细：`pickDiceState.test.ts` 7 条（无命令 IDLE 含非法信封防御 / 只有 `DICE_INTRO`
含多条取最近 / 只有 `DICE_RESULT` / 两者都有 RESULT 更新 RESOLVE / 两者都有 INTRO 更新
新一轮 INTRO 重建 / 载荷含内部记账字段时只保留五个展示字段 / `results` 非数组或元素缺
字段防御降级）。

## Acceptance Results

| # | Result | Evidence |
|---|---|---|
| A01 | PASS | `pnpm install` exit code 0（Already up to date） |
| A02 | PASS | `pnpm typecheck` exit code 0：三步全过 |
| A03 | PASS | `pnpm lint` exit code 0 |
| A04 | PASS | `pnpm format:check` exit code 0：三个改动文件经 `prettier --write` 修正后 All matched files use Prettier code style |
| A05 | PASS | `pnpm build` exit code 0（`tsc -b`） |
| A06 | PASS | `pnpm test` exit code 0：94 files / 494 tests；既有全部测试零回归（含未改动的 `machine.test.ts`） |
| A07 | PASS | `git diff machine.ts`：恰 `onLock`（`DICE_INTRO` 发送 + 返回三行化）与 `onResolve`（`outcome` 后、`buildNarrativeInputs` 前新增 `DICE_RESULT` 发送）两处新增；INTERACTION 其余 action（`onAnnouncing`/`onOpen`/`onVote`/`onResolved`）与 STORY `onSceneEnter`（含历次 CR 遗留）逐字节不变 |
| A08 | PASS | 端到端执行期校验：`DICE_INTRO` 在 `LOCK` 后、`DICE_RESULT` 在 `LOCKED` 后依次捕获；`results[0]` 恰为五个展示字段且 `finalValue = rawValue + modifier`，不含 `seed`/`rollIndex`/`appliedModifiers`（原始输出见 Tests Executed） |
| A09 | PASS | `git diff machine.test.ts`/`interactionRegion.*` 为空（未修改）；`pnpm test` 全部通过含其既有断言 |
| A10 | PASS | `pickDiceState.test.ts` 7 条覆盖四种命令组合（无命令/仅 `DICE_INTRO`/仅 `DICE_RESULT`/两者按 `commandSeq` 取较大两种方向）+ 内部字段裁剪 + 非数组防御，均正确返回 |
| A11 | PASS | `git diff App.tsx` 纯新增（1 行 import + `dice` 计算 + `rolling` 状态与 `useEffect` + `@keyframes dice-spin`/`.dice-rolling` 样式 + 骰子 `<section>`；`git diff | grep '^-'` 零删除行），DEV-020～024 既有逻辑逐字保留 |
| A12 | PASS | `apps/renderer` 的 DEV-020～024 冻结文件（`ws/`、`server/`、`main.tsx`、`composeLayers.*`、`composeCharacters.*`、`pickDialogueLines.*`、`lineIndex.*`、`pickInteractionOpen.*`、`package.json`/`tsconfig.json`/`vite.config.ts`/`index.html`）及 `App.test.tsx` 零 diff |
| A13 | PASS | `git diff`：`packages/**` 仅 runtime-kernel 的 `machine.ts` 一处入 diff，其余（含 `index.ts`、`machine.test.ts`）全部零改动 |
| A14 | PASS | `pnpm install` 零新增；`pnpm-lock.yaml`、根/包 `package.json` 均无 diff |
| A15 | PASS | `DECISIONS.md` 存在，覆盖第 6 节全部要点（D1 LOOP 本地视觉过渡、D2 `DICE_RESULT` 字段裁剪理由、D5 与 DEV-037 的边界）及 D3/D4/D6 技术决策 |
| A16 | PASS | `specs/dev/DEV-025/` 五份文档齐全且已入库，`INDEX.md` T001–T005 全部勾选且 `Status:` 表头为 `READY_FOR_REVIEW` |
| A17 | PASS | `git log` 新增恰 1 条提交，首行 `DEV-025: dice ui`；提交时 `git status --porcelain` 为空 |
| A18 | PASS | LEDGER 0119 `NODE_REPORT-DEV-025` 记录 `git_head` 与提交一致 |
| A19 | PASS | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均零 diff |

## Scope Deviations

NONE。本节点 Writable Scope 内每个 Allowed File 均有真实非空改动：`machine.ts`（`onLock`/`onResolve` 两处新增）、`pickDiceState.ts`/`pickDiceState.test.ts`（新增实现/测试）、`App.tsx`（追加）、五份节点文档（`INDEX.md`/`REQUIREMENTS.md`/`ACCEPTANCE.md`/`REPORT.md`/`DECISIONS.md`）、`LEDGER.md`（0118 行开工标记 + 0119 行追加）、`0119-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-025.md`（NODE_REPORT 消息）。临时 e2e 测试文件运行后即删除，不进入仓库。无越权改动、无顺手重构、无新依赖。

## Known Issues

NONE。

**预期的诚实边界**：当前 INTRO 与 RESULT 命令在实际命令流中相继到达，LOOP 摇骰动画
可能只闪现极短时间——这是同步结算的固有表现，不是缺陷；真正把"摇骰子观感时长"接入
叙事节奏是 DEV-037（Dice Buffer Controller，M3）的职责，本节点不越权实现
（DECISIONS D1/D4 如实记录）。

## Blockers

NONE。

## Future Considerations

- 摇骰子观感时长/节奏控制与延迟安全阀（`targetDiceMs`）：DEV-037（M3）的职责，
  LOOP 届时由本地固定动画升级为对接真实缓冲节奏。
- 互动关闭的 Presentation 信号（"选项区域收起"，DEV-024 Future Considerations 已
  记录）与骰子 UI 的收起信号是同类缺口，需另一次 CR。
- 镜头/视差动画（DEV-026）、BGM/SFX（DEV-027）均为后续节点内容，本节点未提前实现。

## Decisions

见 `specs/dev/DEV-025/DECISIONS.md`。已随最终提交一并入库。