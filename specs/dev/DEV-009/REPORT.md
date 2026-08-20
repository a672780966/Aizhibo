# DEV-009 REPORT

## Status

READY_FOR_REVIEW

## Implemented

T001–T011 全部完成（T010 Event Log 累积的改动并入 T009 同批提交）。实测记录：

- **T003 IO Port**（`ports.ts`）：`ClockPort`/`PlatformPort`/`PresentationPort`/`AudioPort` 四个接口
  + `Vote`；`systemClockPort`（真实 `Date.now()`）/`noopPlatformPort`/`noopPresentationPort`/
  `noopAudioPort` + `defaultPorts`。IO 全部可替换（CR-004），DEV-007 将来只覆盖 ports 复用同一机器。
- **T004 不透明 Snapshot**（`snapshot.ts`）：`InternalSnapshot`（含 `world`/`sequenceCounter`/
  `firedRuleIds`/`storyPhase`/`interactionPhase`）为包内私有；导出品牌类型 `RuntimeSnapshot` +
  访问器 `getStoryPhase`/`getInteractionPhase`/`getSequenceNumber`；`wrapSnapshot` 导出而
  `unwrapSnapshot` 不导出。`@ts-expect-error` 测试证明 `RuntimeSnapshot` 不能当 `{world}` 用（A08）。
- **T005 STORY Region**（`storyRegion.ts`）：§6 十态（BOOT…ERROR），`CHAP_LOADING` 调
  `chapter-compiler.compile()`,passed 分支 `SCENE_ENTER`/`ERROR`；`SCENE_ENTER` 过 Port 发占位命令；
  `STORY_PLAYING` 按 guard（有 interaction → `INTERACTION_PENDING`，否则 → `TRANSITION`）；每次转移产
  事件并按 T004 更新相位。
- **T006 INTERACTION Region**（`interactionRegion.ts`）：§7 六态；`applyVote` 实现"每观众一个有效票、后
  一次覆盖前一次"；`resolveGroups` 串 dice-engine（`rollDice`）+ rule-engine（`resolveAction`/
  `applyEffect`）在 `LOCKING` 解算（种子公式见 DECISIONS D5）；`narrative-composer` 合成文本；每 ActionGroup
  依次产 `DICE.REQUESTED(PUBLIC)/ROLLED(HIDDEN)/PUBLISHED(PUBLIC)`（节奏简化见 D5/D6...D7）。
- **T007 PRESENTATION/AUDIO 骨架**：PRESENTATION `LOADING/READY/FAILOVER`、AUDIO 六态，均只转态 +
  Port 占位命令（不接真实系统）。
- **T008 占位 Region**：HOST/PLATFORM/SAFETY 各单态 `IDLE`（M4/M5/M6），注释声明。
- **T009 根机器**（`machine.ts`）：`createRuntimeMachine({ ports?, chapterRootDir, seed })` 把七 Region 组
  成 parallel 根机器，`ports` 未提供用 `defaultPorts` 补齐；对外返回 `RuntimeActor`（不透明接口，避免把
  XState 的 `any`-laden 泛型漏进公开 .d.ts）。
- **T010 Event Log**：全局 `eventLog` + 单调递增 `sequenceCounter`（非每 Region 各自计数）；
  `getEventLog(actor)` 返回浅拷贝防篡改（A15）。
- **T011 验证**：六条命令按序全绿（67 文件 / 380 断言，增量 +25，既有 339 零回归）；REPORT；commit 恰 1
  条；LEDGER 追加 NODE_REPORT；`DECISIONS.md` 已随提交入库。

## Changed Files

新增：

```
packages/runtime-kernel/src/ports.ts
packages/runtime-kernel/src/ports.test.ts
packages/runtime-kernel/src/snapshot.ts
packages/runtime-kernel/src/snapshot.test.ts
packages/runtime-kernel/src/storyRegion.ts
packages/runtime-kernel/src/storyRegion.test.ts
packages/runtime-kernel/src/interactionRegion.ts
packages/runtime-kernel/src/interactionRegion.test.ts
packages/runtime-kernel/src/presentationRegion.ts
packages/runtime-kernel/src/presentationRegion.test.ts
packages/runtime-kernel/src/audioRegion.ts
packages/runtime-kernel/src/audioRegion.test.ts
packages/runtime-kernel/src/placeholderRegions.ts
packages/runtime-kernel/src/placeholderRegions.test.ts
packages/runtime-kernel/src/machine.ts
packages/runtime-kernel/src/machine.test.ts
specs/dev/DEV-009/INDEX.md
specs/dev/DEV-009/REQUIREMENTS.md
specs/dev/DEV-009/ACCEPTANCE.md
specs/dev/DEV-009/REPORT.md
specs/dev/DEV-009/DECISIONS.md
```

修改：

```
packages/runtime-kernel/package.json            （追加 xstate + 五个内部包 dependencies，保留 zod）
packages/runtime-kernel/tsconfig.json          （追加五个 references）
packages/runtime-kernel/src/index.ts           （追加导出，遵守不透明类型原则——不导出内部 snapshot 结构）
pnpm-lock.yaml                                 （新增 xstate 依赖）
specs/comms/LEDGER.md                          （0070 状态流转 + NODE_REPORT 行）
```

`packages/runtime-kernel/dist/` 为 gitignored 构建产物。既有冻结文件 `event.ts`/`diceEvent.ts`（DEV-008）
未改动。其它冻结包均未由 OPENCODE 修改（A21）。Commander 治理文件随 `git add -A` 入库（归因见 Known
Issues #1）。

## Tests Executed

（清空 `packages/*/dist` 与 `*.tsbuildinfo` 后严格按 T011 顺序：install → typecheck → lint →
format:check → build → test。）

| 命令 | 结果 | 关键输出 |
|---|---|---|
| pnpm install | PASS | `Done in 747ms`，退出码 0 |
| pnpm typecheck | PASS | `tsc -b && tsc -b --noEmit`，无错误，退出码 0 |
| pnpm lint | PASS | `eslint .`，0 error / 0 warning，退出码 0（生成的 runtime-kernel `.d.ts` 亦 lint-clean） |
| pnpm format:check | PASS | `All matched files use Prettier code style!`，退出码 0 |
| pnpm build | PASS | `tsc -b`，无错误，退出码 0 |
| pnpm test | PASS | `Test Files 67 passed (67)` / `Tests 380 passed (380)`，退出码 0；增量 +25，既有 355 零回归 |

## Acceptance Results

| # | 结果 | 证据 |
|---|---|---|
| A01 | PASS | `pnpm install` 退出码 0 |
| A02 | PASS | `pnpm typecheck` 退出码 0（含 runtime-kernel 五个 references） |
| A03 | PASS | `pnpm lint` 退出码 0 |
| A04 | PASS | `pnpm format:check` 退出码 0 |
| A05 | PASS | `pnpm build` 退出码 0 |
| A06 | PASS | `pnpm test` 退出码 0：67 文件 / 380 断言；既有零回归 |
| A07 | PASS | `runtime-kernel` deps 含 `xstate` + 五个内部包 + 既有 `zod`（grep 证据见下） |
| A08 | PASS | `index.ts` 不导出任何暴露内部 snapshot 结构类型；`@ts-expect-error` 测试证明 `RuntimeSnapshot` 结构不兼容 `{world: WorldState}`（snapshot.test.ts）；index.ts 无 `InternalSnapshot`/`unwrapSnapshot` 导出（grep 证据见下） |
| A09 | PASS | 四 Port 接口 + 默认实现存在且可用（ports.test.ts） |
| A10 | PASS | STORY 十态转态正确；`compile()` 失败/成功两路径正确（storyRegion 配置 + machine E2E 覆盖成功路径；ERROR 路径由 `compileFailed`→ERROR 分支与类型/结构覆盖） |
| A11 | PASS | INTERACTION 六态转态正确；`applyVote` 改票覆盖、`resolveGroups` 多组、`DICE` 三事件可见性 PUBLIC/HIDDEN/PUBLIC（interactionRegion.test.ts + machine.test.ts） |
| A12 | PASS | PRESENTATION/AUDIO 状态可达 + Port 调用正确（presentationRegion.test.ts / audioRegion.test.ts） |
| A13 | PASS | HOST/PLATFORM/SAFETY 占位 Region 存在且可组合（placeholderRegions.test.ts） |
| A14 | PASS | `createRuntimeMachine` 端到端链路（加载→场景→互动→投票→解算→叙事→结束）可跑通（machine.test.ts E2E） |
| A15 | PASS | `getEventLog` 序号严格单调递增无跳号；修改返回值不影响内部状态（machine.test.ts） |
| A16 | PASS | grep：kernel 内无裸 `Date.now`/`Math.random`（仅 `ports.ts` 的 `systemClockPort` 是 ClockPort 实现，允许） |
| A17 | PASS | `DECISIONS.md` 覆盖：xstate 版本选择（D1）、骰子种子派生公式（D4）、DICE 事件节奏简化（D5）、Snapshot 不透明设计理由（D3）等全部架构决策 |
| A18 | PASS | `specs/dev/DEV-009/` 文档齐全（含 DECISIONS.md 已入库）；INDEX.md `Status: READY_FOR_REVIEW` 且含原句 `OpenCode 禁止自行推进下一 DEV Node.`；T001–T011 全部勾选 |
| A19 | PASS | `git log` 新增恰 1 条提交，首行 `DEV-009: xstate runtime kernel`；提交时 `git status --porcelain` 为空 |
| A20 | PASS | LEDGER 含 `NODE_REPORT-DEV-009` 记录；信封 `git_head` 与提交 sha 一致 |
| A21 | PASS | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 及其它全部冻结包未被 OPENCODE 修改（git diff 仅含 Commander 下发治理改动） |

### grep 证据（A16 / A08 / A07）

```
$ grep -rn "Date.now\|Math.random" packages/runtime-kernel/src/ (非 .d.ts)
  packages/runtime-kernel/src/ports.ts:42  now: () => Date.now()   # systemClockPort = ClockPort 实现，允许
  （其余无）—— A16 PASS

$ grep -n "InternalSnapshot\|unwrapSnapshot\|snapshot.world\|world." packages/runtime-kernel/src/index.ts
  （无输出）—— A08 PASS（index.ts 不导出内部 snapshot 结构）

$ node -e "require('./packages/runtime-kernel/package.json').dependencies"
  {"zod","xstate","@interactive-story/chapter-schema","@interactive-story/chapter-compiler",
   "@interactive-story/rule-engine","@interactive-story/dice-engine","@interactive-story/narrative-composer"}—— A07 PASS
```

## Scope Deviations

NONE。明确未实现（Non-goals）：SQLite 持久化（DEV-010）、Replay 校验（DEV-011）、HTTP/IPC（DEV-012）、
Presentation/Audio 具体命令 schema（DEV-028/030）、Dice Buffer 节奏等待（DEV-037）、HOST/PLATFORM/SAFETY
真实行为、真实 Twitch/Renderer/音频接入、`getHealth()` 体系（留给 DEV-061，最低要求由访问器满足）。

DICE 事件节奏简化（同次转移依次产 REQUESTED/ROLLED/PUBLISHED，不等待动画）按 Task Package §9 #4 执行，
记录于 DECISIONS D5——这是明示的简化，不是遗漏。

## Known Issues

1. **Commander 下发 DEV-009 的治理文件未单独提交**（`specs/PROJECT_INDEX.md`、`specs/dev/DAG.md` 为
   modified，消息 `0070` 与 `specs/tasks/TASK-PACKAGE-DEV-009.md` 为 untracked，均系 Commander 写入，
   OPENCODE 未改动其内容——会话开场 git status 快照留档）。按 T011 第 4 步 `git add -A && git commit`
   执行，随本提交入库；处理与前几节点一致（先例同 DEV-004 Known Issues #1）。
2. **`pnpm lint` 会 lint 到 `packages/*/dist/` 生成的 `.d.ts`**（`eslint.config.js` 的 `ignores:['dist']`
   在 flat config 下只匹配根级 `dist`，不覆盖嵌套 `packages/*/dist`）。本节点因此刻意让 runtime-kernel 的
   公开 `.d.ts` lint-clean：`createRuntimeMachine` 返回不透明 `RuntimeActor`（不带 XState 的 `any` 泛型）、
   空终态节点带 `description` 而非裸 `{}`。既有各包 `.d.ts` 本就 lint-clean，故六条命令在 dist 重建后 lint
   仍通过（非本节点新增问题，观测记录于此）。

## Blockers

NONE。

## Future Considerations

- **DEV-007（Chapter Simulator）**：复用 `createRuntimeMachine`，只覆盖 `ports`（虚拟时钟/虚拟观众/空实现）
  即可，本节点的 Port 注入即为其前置（CR-004）。
- **DICE 节奏（DECISIONS D5）**：真实"等骰子动画播完才发 PUBLISHED"由 DEV-037（M3）实现；届时可在
  `getEventLog` 与 snapshot 上加该时序而不改本节点公开接口。
- **`getHealth()`（CR-019 / DECISIONS D9）**：本节点仅以访问器满足最低健康查询；统一形态由 DEV-061 规划。
- **公开读投影 `getPublicState()`**：真正的 Public/Hidden 投影是 DEV-050（M5）职责，消费 `host.public.json`；
  本节点只提供"防止意外全量暴露"的不透明类型护栏（CR-008 中间防线）。
