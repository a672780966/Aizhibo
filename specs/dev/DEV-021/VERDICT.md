# DEV-021 VERDICT

> 本文件由 `AUDITOR`（`project-auditor` 角色）产出内容，经 `COMMANDER` 逐字转录套入本模板
> （依据 `COMMS-PROTOCOL-V1.md` 附录 B2/B3）。字段映射：`BLOCKER`/`MAJOR` → `BLOCKING`，
> `MINOR` → `DEVIATION`，`INFO` → `OBSERVATION`。

## Audit Basis

- Task Package: `specs/tasks/TASK-PACKAGE-DEV-021.md`
- Acceptance 权威副本: `specs/dev/DEV-021/ACCEPTANCE.md` A01–A20
- `git_head` 审核锚点（`NODE_REPORT` 消息 `0103` 申报）：`d797f02`（独立 `git rev-parse HEAD` 核对一致）
- 基线锚点：`8788347`（DEV-020 冻结提交）

## Scope Audit

PASS

- `git diff 8788347 HEAD --stat` 精确限定在 7 个声明的 Writable Scope 代码文件（`machine.ts`、`index.ts`、`visualResolution.ts`、`visualResolution.test.ts`、`composeLayers.ts`、`composeLayers.test.ts`、`App.tsx`）+ 5 个节点文档文件 + `LEDGER.md`。
- `git show --name-only HEAD`（DEV-021 单一提交 `d797f02`）恰列 13 个文件，与 REPORT.md 声明的 Changed Files 完全一致。
- 提交内未触碰 `packages/runtime-kernel`/`apps/renderer` 之外的任何文件；`specs/PROJECT_INDEX.md`、`DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 全部零 diff（全仓库 stat diff 与提交隔离比对双重核实）。
- DEV-020 冻结文件（`apps/renderer/src/ws/**`、`server/**`、`main.tsx`、`package.json`、`tsconfig.json`、`vite.config.ts`、`index.html`）与根配置文件（`tsconfig*.json`、`eslint.config.js`、根 `package.json`、`vitest.config.ts`）逐一 `git diff` 核实零改动。
- 无新增依赖：`pnpm-lock.yaml`/`package.json` 零 diff；独立重跑 `pnpm install` → "Already up to date"，零新增解析。

## Requirement Verification

| Requirement | Status | Evidence |
|---|---|---|
| `resolveVisualLayers` 两跳解析（`visualSceneId → VisualScene → layers → ImageAsset.file`） | VERIFIED | `visualResolution.ts:26-47`；针对真实 `valid-minimal` fixture 的单元测试产出精确预期形状 |
| 防御性处理：未知 `visualSceneId` → `[]` | VERIFIED | `visualResolution.ts:31-32`；测试 `visualResolution.test.ts:58-61` |
| 防御性处理：缺引用 `ImageAsset` → 跳过不抛异常 | VERIFIED | `visualResolution.ts:36-37`；测试 `visualResolution.test.ts:74-84`（手工构造含 `img-missing` 的编译结果，其余层仍正常解析） |
| `onSceneEnter` CR 严格限定在其 action 内部 + 1 行 import | VERIFIED | `git diff 8788347 HEAD -- machine.ts` 仅 1 行新增 import + `onSceneEnter` 代码块，其余全部 action/guard/类型逐字节相同 |
| `index.ts` diff 恰 2 行新增导出 | VERIFIED | `git diff 8788347 HEAD -- index.ts` 新增 2 行，删除 0 行，改动 0 行 |
| `composeLayers`：z 升序排序、zIndex 映射、parallax 透传 | VERIFIED | `composeLayers.ts:17-25`；测试覆盖升序、同 z 稳定排序、负数 z、有/无 parallax、不可变、空数组 |
| `App.tsx` 仅追加，既有 HELLO/调试列表逻辑未改 | VERIFIED | `git diff 8788347 HEAD -- App.tsx` 纯新增（2 个 import、`pickSceneLayers`、一个 `<section>` 块）；`WS_URL`/`browserSocket`/`appendCommand`/调试 `<pre>` JSON 逐字节相同 |
| Renderer 不自行读取章节内容（Dev Spec §35） | VERIFIED | 对 `apps/renderer/src` grep chapter/fs/character/subtitle/dice/choice 无命中；`pickSceneLayers` 只消费线上命令中已解析好的 `layers` 字段 |
| 既有测试向后兼容（断言仅查 `kind`/`storyPhase`，不查完整载荷） | VERIFIED | `machine.test.ts:166-167`（仅 `kind === 'SCENE_ENTER'`）、`presentationCommand.test.ts:17,41`（构造自己的字面量，与 machine 真实载荷无关）、`storyRegion.test.ts:82`（相位名字符串成员判定）、`snapshot.test.ts:31,45`（仅 `storyPhase` 字段）——均未检查 `visualSceneId`/`layers` |
| 未越权进入 DEV-022+（角色/字幕/选择/骰子渲染） | VERIFIED | diff 与 `apps/renderer/src` 中均未发现此类代码 |
| "图片暂时加载不出来"为如实披露、非隐瞒缺口 | VERIFIED | `DECISIONS.md` D3 与 `REPORT.md`「已知缺口」章节均明确说明并归属 DEV-075 |

## Acceptance Verification

| Acceptance Item | Result | Evidence |
|---|---|---|
| A01 `pnpm install` exit 0 | PASS | 独立重跑，exit 0，"Already up to date" |
| A02 `pnpm typecheck` exit 0 | PASS | 独立重跑，exit 0（`tsc -b` + `--noEmit` + renderer 自身 `tsc --noEmit`） |
| A03 `pnpm lint` exit 0 | PASS | 独立重跑，exit 0 |
| A04 `pnpm format:check` exit 0 | PASS | 独立重跑，exit 0 |
| A05 `pnpm build` exit 0 | PASS | 独立重跑，exit 0 |
| A06 `pnpm test` exit 0，零回归 | PASS | 独立重跑：87 Test Files / 448 Tests 全部通过，与申报数字一致 |
| A07 `resolveVisualLayers` 正确性 + 防御性跳过 | PASS | 直接阅读测试文件，逻辑与断言针对真实 fixture 与手工构造缺口用例均核实 |
| A08 `machine.ts` diff 限定在 `onSceneEnter` | PASS | 逐行核对 `git diff` |
| A09 端到端 `SCENE_ENTER` 载荷正确性 | PASS | `visualResolution.test.ts:121-158` 驱动真实 actor，断言 `visualSceneId`/`layers` 与 `resolveVisualLayers` 输出及真实 fixture 数据一致 |
| A10 `machine.test.ts` 未改动且全部通过 | PASS | `git diff` 该文件为空；包含在全绿的 448 条测试内 |
| A11 `composeLayers` 排序/parallax 正确性 | PASS | 阅读测试文件，全部用例存在且正确 |
| A12 `App.tsx` diff 仅追加 | PASS | 直接核对 `git diff` |
| A13 DEV-020 冻结的 renderer 文件未改动 | PASS | 逐一 `git diff` 为空 |
| A14 `packages/**`（除授权文件外）未改动 | PASS | 全仓库 stat diff 核实 |
| A15 无新增 npm 依赖 | PASS | lockfile/package.json 零 diff；`pnpm install` 幂等 |
| A16 `DECISIONS.md` 覆盖要求要点 | PASS | D1–D8 全部读取，所有必需议题均覆盖 |
| A17 节点文档齐全，Task Order 全部勾选 | PASS | `INDEX.md` T001–T007 全部 `[x]`；5 份文档均存在且已提交 |
| A18 恰 1 条提交，首行正确，提交时工作区干净 | PASS | `git log` 确认恰 1 条新提交 `d797f02`，首行 `DEV-021: scene renderer` |
| A19 LEDGER 含 NODE_REPORT 记录，git_head 一致 | PASS | LEDGER 0103 行，`git_head=d797f02` 与信封及 `git rev-parse HEAD` 一致 |
| A20 治理/规范文件未被修改 | PASS | 逐路径/glob `git diff` 均为空 |

`ACCEPTANCE.md` 与 Task Package 第 12 节比对：**IDENTICAL**（逐字一致）。

## Verification Commands

审核员独立重跑：

| Command | Result | Notes |
|---|---|---|
| `pnpm install` | 0 | "Already up to date"，lockfile 零 diff |
| `pnpm typecheck` | 0 | 独立重跑 |
| `pnpm lint` | 0 | 独立重跑 |
| `pnpm format:check` | 0 | 独立重跑 |
| `pnpm build` | 0 | 独立重跑 |
| `pnpm test` | 0 | 87 files / 448 tests，与申报一致 |

## Undeclared Changes

NONE

## Findings

| ID | 等级 | 内容 | 依据 |
|---|---|---|---|
| DEVIATION-01 | DEVIATION | `specs/dev/DEV-021/INDEX.md` 第 3 行 `Status:` 字段仍写 `IN_PROGRESS`，与文件内「Current Task」章节及 LEDGER/REPORT.md 均已明确的 `READY_FOR_REVIEW` 实际状态不一致；不影响任何 Acceptance 判定（A17 只要求 Task Order 全部勾选，已满足），也未向 Commander/Auditor 误传节点真实状态（LEDGER 与 REPORT.md 均正确），纯 OpenCode 可写文档内的表头字段维护疏漏 | `specs/dev/DEV-021/INDEX.md:3` |
| OBSERVATION-01 | OBSERVATION | `NODE_REPORT` 信封（消息 `0103`）声明 `changed_files_count: 15`，但 DEV-021 提交 `d797f02` 实际恰改动 13 个文件（`git show --name-only` 核实）；差异对任何 Acceptance 判定无影响，REPORT.md 中真实 Changed Files 列表准确且与提交完全一致，推测计入了随后按协议惯例落入治理提交的 2 个通信产物（LEDGER 追加行 + NODE_REPORT 消息文件本身） | `specs/comms/0103-...md` vs `git show --name-only d797f02` |
| OBSERVATION-02 | OBSERVATION | 审计开始时工作区已存在 `specs/comms/LEDGER.md`（已改动）与 `specs/comms/0103-...md`（未跟踪），均为审计前既有状态、非审核员引入；符合协议既定流程（OPENCODE 在冻结提交后追加自己的 NODE_REPORT 消息/LEDGER 行），不影响被审计提交 `d797f02` | 工作区状态观察 |

## Verdict

**PASS**（Blocker: 0，Major: 0，Minor: 1 → DEVIATION；Info: 2 → OBSERVATION，均不影响判定）

## Scope Discipline Check

- 是否实现了 Non-goals 中明确禁止的内容：否（未做真实图片加载、角色/字幕/选择/骰子渲染）
- 是否提前实现了后续节点的内容：否（DEV-022～026 均未被实现或触碰）
- 是否引入了禁止清单中的技术：否
- 是否修改了权限矩阵中不属于自己的文件：否
- 是否顺手重构了未要求改动的代码：否
- 是否严格按 Task Package 执行、未自行扩大范围：是（含对已冻结 `onSceneEnter` 的 CR，严格限定在 Task Package 第 2 节授权范围内）

## Architecture / Regression / Overengineering Audit

三项均 PASS：

- Architecture — 对已冻结 `onSceneEnter` 的修改经 Task Package 明确授权的窄范围 Change Request 完成，非未授权的冻结接口违规，是协议既定机制（`DAG.md` 全局约束 #4）；Dev Spec §35「Renderer 不维护剧情」得到遵守，章节内容解析全程留在 Runtime 侧，`apps/renderer` 只消费已解析好的线上数据；未引入禁止清单技术；`PresentationPort.send(command: unknown)` 保持既有（DEV-012）松散类型设计，本 CR 未改变该契约，只是通过既有宽松端口发送更丰富的对象。
- Regression — 四个既有测试文件（`machine.test.ts`/`presentationCommand.test.ts`/`storyRegion.test.ts`/`snapshot.test.ts`）零 diff 且全部通过；无冻结类型/导出签名改动，`index.ts` diff 纯追加；`SCENE_ENTER` 载荷只做丰富（向后兼容），未重构，且核实无下游消费方依赖旧的窄载荷为穷尽形状。
- Overengineering — `resolveVisualLayers`/`composeLayers` 均为精准满足需求的最小纯函数；`parallax` 作为惰性数据透传，未附加动画逻辑（正确留给 DEV-026）；无插件系统、无提前缓存、无未使用导出。

## Auditor Statement

我只针对当前授权 DEV-021 节点及其冻结 Task Package、Requirements 和 Acceptance 进行了独立审计。我逐行核对了 `machine.ts`/`index.ts`/`App.tsx` 相对 DEV-020 基线（commit `8788347`）的 git diff，独立重跑了全部六条验证命令（`pnpm install`/`typecheck`/`lint`/`format:check`/`build`/`test`，全部退出码 0，87 个测试文件、448 条测试全部通过），并逐一验证了四个既有测试文件（`machine.test.ts`/`presentationCommand.test.ts`/`storyRegion.test.ts`/`snapshot.test.ts`）的向后兼容性断言与零改动声明。我没有修改任何项目业务代码，也没有推进任何后续 DEV 节点。

---

审核方式：直调 `project-auditor` subagent。原始输出（AUDIT_PASS，Blocker 0 / Major 0 / Minor 1 /
Info 2）由 Commander 逐字转录、按附录 B2 字段映射表映射为上表，未改写、未删减、未解读其结论。
