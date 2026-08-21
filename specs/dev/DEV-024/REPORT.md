# DEV-024 REPORT

## Status

READY_FOR_REVIEW

## Implemented

- T001–T006 completed.
- **CR（T003）**：对 DEV-009 已冻结的 `onOpen` action（INTERACTION region）发第一次窄范围
  Change Request——`INTERACTION_OPEN` 命令载荷追加 `choices`（已按 `visibleIf` 过滤为
  `DisplayChoice[]`）与 `openDurationMs`。`machine.ts` 的 git diff 精确限定在 `onOpen` 一处：
  `scene`/`interaction`/`choices` 三段计算 + `send` 参数追加两个字段 + 1 行必需 import
  （`resolveVisibleChoices`）。INTERACTION region 其余全部 action（`onAnnouncing`/`onVote`/
  `onLock`/`onResolve`/`onResolved`）与 STORY region 的 `onSceneEnter`（含 DEV-021/022/023
  三次 CR 遗留代码）逐字节不变。`choices` 过滤发生在 Runtime 侧（`onOpen` 内读
  `context.snapshot.world` 调 `resolveVisibleChoices`），Renderer 不接触 `WorldState`
  （CR-008 纪律，与 DEV-021/022"Renderer 不维护剧情"同源）。
- **T002**：新增纯函数 `resolveVisibleChoices`（`packages/runtime-kernel/src/choiceResolution.ts`，
  挂入 `index.ts` 追加导出 + `DisplayChoice` 类型）。对 `interaction.choices` 逐个判断：
  `visibleIf` 未定义 → 可见；否则用 `rule-engine` 已冻结的 `evaluateCondition` 对数组内每个
  `Condition` 做 AND（`every`，全部满足才可见——与 `SceneGuard`/其它多条件字段既有语义一致，
  不发明新组合规则）。可见的映射成 `{id, label}`，`actionType`/`ruleId`/`visibleIf` 不下发。
- **T005**：新增纯函数 `pickInteractionOpen`（`apps/renderer/src/render/pickInteractionOpen.ts`），
  返回 `{ choices, openDurationMs?, key }`：取命令流中最近一条 `kind === 'INTERACTION_OPEN'`
  的信封，`key` 为其 `commandSeq`（检测"新一轮开始"）；没有则返回 `undefined`。`App.tsx`
  仅追加——新增 `interaction` 计算、`countdownMs` 本地状态、`useEffect([interaction?.key])`
  在新一轮选项到来时从 `openDurationMs` 重开本地倒计时（`setInterval` + 裸 `Date.now()`），
  顶部渲染 `"[A] 跟随向导"` 字母+文案选项列表与"剩余 N 秒"；DEV-020/021/022/023 既有
  场景层/角色/对话框/HELLO/调试列表逻辑逐字保留（diff 纯新增，A12）。
- **正式不做可点击按钮**（任务包 2.1/2.4 节产品事实，D1）：Choice UI 是被 OBS Browser Source
  采集进直播画面的展示，观众不能点击；真实投票来自 Twitch 聊天（M4 未建）。选项渲染为 `<p>`
  文本行而非 `<button>`。**不做实时票数展示**（无批量/限流机制设计，明确延后，D4）。
- **已知简化，如实记录**（任务包 2.5 节，D3/D6）：本地倒计时只是 UI 反馈，可能与 Runtime 侧
  真实互动关闭时刻有毫秒级漂移（Renderer 不知道 `INTERACTION_OPEN` 命令实际发出的服务器
  时刻）；互动关闭后命令流没有关闭类信号（DEV-012 既有缺口），选项视图保留至下一次互动开启、
  倒计时停在 0——均不影响任何判定，真正决定互动何时关闭的是 Runtime 侧 `LOCK` 事件。
- CR 的端到端验证（A09，T003）：执行期驱动真实 actor 到 `INTERACTION.OPEN`，捕获的命令含
  `choices: [{id:'A', label:'跟随向导'}]`、`openDurationMs: 15000`，与 `interaction-01.json`
  一致（原始输出见 Tests Executed 下方 A09 / D5 证据），不改动 Read-only 的 `machine.test.ts`
  （D5，新增 runtime-kernel 测试文件即越界，与 DEV-023 同一先例）。

## Changed Files

```text
packages/runtime-kernel/src/machine.ts               （仅 onOpen 一处 + 1 行 import，见 A08）
packages/runtime-kernel/src/choiceResolution.ts      （新增）
packages/runtime-kernel/src/choiceResolution.test.ts （新增，6 条）
packages/runtime-kernel/src/index.ts                 （仅追加 2 行导出，见 A14）
apps/renderer/src/render/pickInteractionOpen.ts      （新增）
apps/renderer/src/render/pickInteractionOpen.test.ts （新增，4 条）
apps/renderer/src/App.tsx                            （仅追加，见 A12）
specs/dev/DEV-024/INDEX.md
specs/dev/DEV-024/REQUIREMENTS.md
specs/dev/DEV-024/ACCEPTANCE.md
specs/dev/DEV-024/REPORT.md
specs/dev/DEV-024/DECISIONS.md
specs/comms/LEDGER.md（仅 0114 行状态 ISSUED→CLOSED：Codex 开工标志）
```

`pnpm-lock.yaml` 无 diff（`pnpm install` 提示 Already up to date，零新增依赖）；`machine.test.ts`、
`interactionRegion.*`、`visualResolution.*`/`characterResolution.*`、`apps/renderer/src/App.test.tsx`
及 DEV-020/021/022/023 冻结文件（`ws/`、`server/`、`main.tsx`、`composeLayers.*`、
`composeCharacters.*`、`pickDialogueLines.*`、`lineIndex.*`、`package.json`/`tsconfig.json`/
`vite.config.ts`/`index.html`）、根配置、治理/规范文件全部零改动。

## Tests Executed

六条命令严格按要求顺序执行：

| Command | Exit code | Result |
|---|---:|---|
| `pnpm install` | 0 | PASS; Already up to date（零新增依赖，`pnpm-lock.yaml` 无 diff） |
| `pnpm typecheck` | 0 | PASS; `tsc -b && tsc -b --noEmit` + renderer 独立 `tsc --noEmit` |
| `pnpm lint` | 0 | PASS; `eslint .`，含新增 `.tsx`/测试文件 |
| `pnpm format:check` | 0 | PASS; All matched files use Prettier code style（`specs/` 在 `.prettierignore`） |
| `pnpm build` | 0 | PASS; `tsc -b` |
| `pnpm test` | 0 | PASS; 93 Test Files / 487 Tests（DEV-023 基线 91/477，新增 2 文件/10 条，既有零回归） |

**端到端验证（A09，执行期运行时校验，非提交测试）**：临时脚本驱动 `createRuntimeMachine` +
`chapterRootDir: …/test-fixtures/valid-minimal` + 捕获型 `presentation` port，按 simulator 同款
相位序 `BOOT → STORY.DONE → INTERACTION.OPEN` 推送事件后取 `kind === 'INTERACTION_OPEN'` 命令：

```text
INTERACTION_OPEN found: true
choices: [{"id":"A","label":"跟随向导"}]
openDurationMs: 15000
expected choices: [{"id":"A","label":"跟随向导"}]
expected openDurationMs: 15000
MATCH choices: true
MATCH openDurationMs: true
E2E PASS
```

脚本运行后即删除，不进入仓库（D5：runtime-kernel 无新授权 machine 级测试文件，新增即越界；
`machine.test.ts` 保持零改动）。

新增测试明细：`choiceResolution.test.ts` 6 条（无 `visibleIf` 始终可见保持顺序 / 混合过滤 /
单条件满足与不满足 / 多条件 AND 任一不满足即隐藏 / 返回值只含 `id`/`label` 不泄漏内部字段 /
空 `choices` 返回空数组）；`pickInteractionOpen.test.ts` 4 条（无命令返回 `undefined` 含非法
命令防御 / 取最近一条 / `choices` 非法视为空数组 / `openDurationMs` 缺省或非法时省略）。

## Acceptance Results

| # | Result | Evidence |
|---|---|---|
| A01 | PASS | `pnpm install` exit code 0（Already up to date） |
| A02 | PASS | `pnpm typecheck` exit code 0：三步全过 |
| A03 | PASS | `pnpm lint` exit code 0 |
| A04 | PASS | `pnpm format:check` exit code 0 |
| A05 | PASS | `pnpm build` exit code 0 |
| A06 | PASS | `pnpm test` exit code 0：93 files / 487 tests；既有全部测试零回归（含未改动的 `machine.test.ts`） |
| A07 | PASS | `choiceResolution.test.ts` 覆盖无/单/多 `visibleIf` 条件六种子情形，均正确过滤；`Object.keys(result[0])` 断言恰为 `['id','label']`，无 `actionType`/`ruleId` 泄漏 |
| A08 | PASS | `git diff machine.ts`：恰 1 行新增 import + `onOpen` action 内 `scene`/`interaction`/`choices` 三段计算与 `send` 两字段追加；INTERACTION 其余 action（含 `onVote`/`onResolve` 等）与 STORY `onSceneEnter`（含历次 CR 遗留）逐字节不变 |
| A09 | PASS | 端到端执行期校验：`INTERACTION_OPEN` 命令含 `choices: [{id:'A', label:'跟随向导'}]`、`openDurationMs: 15000`，与 `interaction-01.json` 的 `choices[0]`/`openDurationMs` 一致（原始输出见 Tests Executed） |
| A10 | PASS | `git diff machine.test.ts`/`interactionRegion.*` 为空（未修改）；`pnpm test` 全部通过含其既有断言 |
| A11 | PASS | `pickInteractionOpen.test.ts`：无命令 `undefined` / 取最近一条 / `choices` 非法 / `openDurationMs` 缺省 均正确 |
| A12 | PASS | `git diff App.tsx` 纯新增（1 行 import + `interaction` 计算 + `countdownMs` 状态 + 倒计时 `useEffect` + 选项/倒计时 `<section>`），DEV-020/021/022/023 既有逻辑逐字保留 |
| A13 | PASS | `apps/renderer` 的 DEV-020/021/022/023 冻结文件及 `App.test.tsx` 零 diff |
| A14 | PASS | `git diff`：`packages/**` 仅 runtime-kernel 的 `machine.ts`/`index.ts` + 新增 `choiceResolution.*` 入 diff，其余包全部零改动；`index.ts` 仅 2 行追加 |
| A15 | PASS | `pnpm install` 零新增；`pnpm-lock.yaml`、根/包 `package.json` 均无 diff |
| A16 | PASS | `DECISIONS.md` 存在，覆盖第 6 节全部要点（D1 展示非交互产品事实、D2 `visibleIf` 多条件 AND 语义、D3 倒计时允许用 `Date.now()` 的理由、D4 不做实时票数的已知边界）及 D5/D6 技术决策 |
| A17 | PASS | `specs/dev/DEV-024/` 五份文档齐全且已入库，`INDEX.md` T001–T006 全部勾选且 `Status:` 表头为 `READY_FOR_REVIEW`（本次已主动做对，不复刻 DEV-021/022 漏改疏漏） |
| A18 | PASS | `git log` 新增恰 1 条提交，首行 `DEV-024: choice ui`；提交时 `git status --porcelain` 为空 |
| A19 | PASS | LEDGER 0115 `NODE_REPORT-DEV-024` 记录 `git_head` 与提交一致 |
| A20 | PASS | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均零 diff |

## Scope Deviations

NONE。本节点 Writable Scope 内每个 Allowed File 均有真实非空改动：`machine.ts`（`onOpen` 一处 +
1 行 import）、`choiceResolution.ts`/`pickInteractionOpen.ts`（新增实现）、两个 `.test.ts`
（新增测试）、`index.ts`（+2 行导出）、`App.tsx`（追加）、五份节点文档（`INDEX.md`/
`REQUIREMENTS.md`/`ACCEPTANCE.md`/`REPORT.md`/`DECISIONS.md` 新增）。无越权改动、无顺手重构、
无新依赖。

## Known Issues

NONE。

本地倒计时是纯 UI 反馈，可能与 Runtime 侧真实互动关闭时刻有毫秒级漂移；且互动关闭后命令流
无关闭类信号（DEV-012 已如实记录的既有缺口），选项视图保留至下一次互动开启、倒计时停在 0。
这是**预期的诚实边界**而非缺陷：真正决定互动何时关闭的是 Runtime 侧 `LOCK` 事件，倒计时不
参与任何判定（项目包 2.5 节已知简化，D3/D6 如实记录）。

## Blockers

NONE。

## Future Considerations

- 实时票数/计票展示：需要额外的批量/限流机制设计（Twitch 聊天流速 × 票数下发节流 × 计票
  一致性），是独立的架构决策，任务包明确延后；未来若做很可能是另一次 CR。
- 互动关闭的 Presentation 信号（"选项区域收起"）：DEV-012 既有缺口"互动关闭无信号流向
  Presentation"，需另一次 CR 补 `INTERACTION_CLOSED` 类命令；本节点不做预言。
- 骰子 UI（DEV-025）、镜头/视差动画（DEV-026）、BGM/SFX（DEV-027）均为后续节点内容，本节点
  未提前实现。

## Decisions

见 `specs/dev/DEV-024/DECISIONS.md`。已随最终提交一并入库。