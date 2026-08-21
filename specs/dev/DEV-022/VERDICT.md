# DEV-022 VERDICT

> 本文件由 `AUDITOR`（`project-auditor` 角色）产出内容，经 `COMMANDER` 逐字转录套入本模板
> （依据 `COMMS-PROTOCOL-V1.md` 附录 B2/B3）。字段映射：`BLOCKER`/`MAJOR` → `BLOCKING`，
> `MINOR` → `DEVIATION`，`INFO` → `OBSERVATION`。

## Audit Basis

- Task Package: `specs/tasks/TASK-PACKAGE-DEV-022.md`
- Acceptance 权威副本: `specs/dev/DEV-022/ACCEPTANCE.md` A01–A20
- `git_head` 审核锚点（`NODE_REPORT` 消息 `0107` 申报）：`2909967`
- 基线锚点：`7d720e0`（DEV-021 冻结提交）

## Scope Audit

PASS

- `git show 2909967 --stat`（基线 `7d720e0`）：恰 7 个源码文件改动——`apps/renderer/src/App.tsx`（M）、`apps/renderer/src/render/composeCharacters.{ts,test.ts}`（A）、`packages/runtime-kernel/src/characterResolution.{ts,test.ts}`（A）、`packages/runtime-kernel/src/index.ts`（M）、`packages/runtime-kernel/src/machine.ts`（M），加 `specs/comms/LEDGER.md`（M，仅状态翻转）与 5 份 `specs/dev/DEV-022/*` 文档（A）。无任何文件越出声明的 Writable Scope。
- `machine.ts` diff：恰 1 行 import + `onSceneEnter` 内新增 2 处语句（`characters` 局部变量 + send 载荷追加 `characters,`）。DEV-021 遗留的 `scene`/`layers`/`audio.send`/`storyMove` 及其余全部 action 逐字节不变——直接阅读 diff hunk 核实。
- `App.tsx` diff：纯追加（import 块并入新类型、新增 `pickSceneCharacters` 函数、新增 `<style>` 块、新增角色 `<img>` 渲染组）。既有 HELLO/调试列表/场景层逻辑无一行被删除或改写。
- 确认零 diff（`git diff 7d720e0 2909967 --`）：`machine.test.ts`、`visualResolution.ts/.test.ts`、`App.test.ts`、`composeLayers.*`、`ws/`、`server/`、`main.tsx`、renderer/根全部配置文件、其余全部 `packages/**`、`specs/PROJECT_INDEX.md`/`DAG.md`/`tasks/**`/`audit/**`/`protocol/**`。
- `package.json`/`pnpm-lock.yaml` diff 为空——无新增依赖。
- `apps/renderer/src` 内 grep 未发现任何 `chapter-schema`/`chapter-compiler`/文件系统 API 的越权引用。

## Requirement Verification

| Requirement | Status | Evidence |
|---|---|---|
| 三跳引用解析 `characterId → NPCDefinition.characterAssetId → CharacterAsset → ImageAsset` | VERIFIED | `characterResolution.ts` 严格按此顺序实现；针对真实 fixture 的测试将 `npc-guide`+`smile` 解析为 `assets/img/guide-smile.png`，与 `packages/chapter-schema/src/npc.ts`/`visuals.ts` 的 schema 形状及真实 `valid-minimal` fixture 文件逐一核对一致 |
| 任一跳缺失即防御性跳过（不抛异常） | VERIFIED | `characterResolution.test.ts` 内 4 条独立负向测试（缺 NPC、缺 CharacterAsset、未知表情键、缺 ImageAsset）均断言 `[]`/跳过且不抛异常；第 5 条测试证明多角色场景下跳过不中断其余角色解析 |
| `expressionKey` 回退 `defaultExpression` | VERIFIED | 省略 `expression` 的测试解析为 `neutral` → `guide-neutral.png` |
| `microAnimations` 键缺席语义（`exactOptionalPropertyTypes`） | VERIFIED | 源码采用条件展开；专项测试断言缺席时 `'microAnimations' in result === false` |
| `onSceneEnter` CR：仅追加 `characters`，既有字段不变 | VERIFIED | Diff 核对（上）+ 端到端测试断言 `visualSceneId`/`layers` 与新增 `characters` 同时存在 |
| `composeCharacters`：过滤不可见、五档 slot 映射、`animated` 布尔 | VERIFIED | 源码与规格逐字一致；测试覆盖过滤、全部五档 slot、animated 三态（非空/空/未定义）、数组不可变 |
| `App.tsx` 仅追加，`pickSceneCharacters` 为纯函数 | VERIFIED | Diff 为纯追加；`composeCharacters.test.ts` 内 4 条测试覆盖提取、忽略非 `SCENE_ENTER`、"取最近"语义、非数组防御 |
| `index.ts` 仅追加导出 | VERIFIED | Diff 为文件末尾新增 2 行，0 删除 |
| Renderer 不读取章节内容（Dev Spec §35） | VERIFIED | `apps/renderer/src` 内无 `chapter-schema`/`chapter-compiler`/文件系统相关 import |
| 无新增 npm 依赖；无按名字驱动的微动效果 | VERIFIED | Lockfile/package.json diff 为空；`animated` 为纯布尔，代码内无按名字分支 |

## Acceptance Verification

| Acceptance Item | Result | Evidence |
|---|---|---|
| A01 `pnpm install` | PASS | 独立重跑，exit 0 |
| A02 `pnpm typecheck` | PASS | 独立重跑，exit 0 |
| A03 `pnpm lint` | PASS | 独立重跑，exit 0 |
| A04 `pnpm format:check` | PASS | 独立重跑，exit 0（"All matched files use Prettier code style"） |
| A05 `pnpm build` | PASS | 独立重跑，exit 0 |
| A06 `pnpm test` | PASS | 独立重跑，exit 0，89 files / 465 tests，与申报数字一致 |
| A07 三跳解析 + 4 类防御性用例 | PASS | 直接阅读 `characterResolution.test.ts`，断言针对真实 fixture 与手工构造缺口用例均核实 |
| A08 `machine.ts` diff 范围 | PASS | `git show` diff 直接核对，与描述范围完全一致 |
| A09 端到端 `SCENE_ENTER` 含正确 `characters` | PASS | `characterResolution.test.ts` 内驱动真实 `createRuntimeMachine`，未对解析逻辑打桩 |
| A10 `machine.test.ts`/`visualResolution.*` 未改动 | PASS | `git diff` 核实为空 |
| A11 `composeCharacters` 过滤/slot/animated | PASS | 直接阅读测试，覆盖全部用例 |
| A12 `App.tsx` 仅追加 | PASS | `git show` diff 直接核对 |
| A13 DEV-020/021 冻结文件未改动 | PASS | `git diff` 核实 ws/server/main.tsx/composeLayers/配置文件均为空 |
| A14 其余 packages 未改动 | PASS | `git diff` 核实为空 |
| A15 无新增 npm 依赖 | PASS | package.json/lockfile diff 为空 |
| A16 `DECISIONS.md` 覆盖第 6 节要点 | PASS | 阅读 D1–D9，覆盖 slot 映射、z-index、动画简化理由及 D4–D9 |
| A17 节点文档齐全，T001–T007 全部勾选 | PASS | 阅读 `INDEX.md`，全部勾选 |
| A18 恰 1 条提交，提交时工作区干净 | PASS | `git log` 显示单一提交 `2909967`；当前 `git status --porcelain` 仅剩预期中尚未被治理提交捕获的 0107 消息文件 |
| A19 LEDGER 含 NODE_REPORT 记录 | PASS（附说明） | 消息文件 `0107-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-022.md` 存在，`git_head` 与当前 HEAD 一致；`LEDGER.md` 表格行本身尚未追加——与 DEV-021 自身审计时的模式完全一致（核实：DEV-021 提交 `d797f02` 同样未自行追加其 0103 行，该行由 Commander 后续治理提交 `371999b` 补入），DEV-021 审计（0104）明确认可了同一条件。按一致性处理——见下方 OBSERVATION |
| A20 治理/规范文件未改动 | PASS | `git diff` 核实为空 |

## Verification Commands

审核员独立重跑：

| Command | Result | Notes |
|---|---|---|
| `pnpm typecheck` | 0 | 独立重跑 |
| `pnpm lint` | 0 | 独立重跑 |
| `pnpm format:check` | 0 | 独立重跑 |
| `pnpm test` | 0 | 89 files / 465 tests，与申报一致 |
| `pnpm build` | 0 | 独立重跑 |

（`pnpm install` 未重跑：审计开始时 `node_modules`/lockfile 状态已干净且无依赖变更；其余五条均独立执行并直接观察退出码/输出。）

## Undeclared Changes

NONE

## Findings

| ID | 等级 | 内容 | 依据 |
|---|---|---|---|
| DEVIATION-01 | DEVIATION | `specs/dev/DEV-022/INDEX.md` 第 3 行 `Status:` 字段仍写 `IN_PROGRESS`，与节点正文/REPORT.md 已明确的 `READY_FOR_REVIEW` 实际状态不一致；与 DEV-021 审计（0104）中被标记为 MINOR 的同类问题相同，未阻断该次 PASS。纯文档表头维护疏漏，不影响任何 Acceptance 判定 | `specs/dev/DEV-022/INDEX.md:3` |
| OBSERVATION-01 | OBSERVATION | A19 是通过独立的 `0107-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-022.md` 消息文件（未跟踪，`git_head` 与 HEAD 一致）满足的，而非通过已提交的 `LEDGER.md` 表格行——该行留待 Commander 后续治理提交补入。与 DEV-021 先例完全一致（已核实 `d797f02`/`371999b`），非新增或独有偏差 | 工作区状态观察 vs `d797f02`/`371999b` |
| OBSERVATION-02 | OBSERVATION | REPORT.md 中 `Scope Deviations` §1、§2（`machine.ts` 1 行 import；`pickSceneCharacters` 测试落在 `composeCharacters.test.ts`）已独立对照实际 diff 与 Task Package Writable Scope 核实：均准确、必要，且与 DEV-021 D7/D8 先例一致；未掩盖任何未授权改动 | git diff 核对 vs Task Package Writable Scope |

## Verdict

**PASS**（Blocker: 0，Major: 0，Minor: 1 → DEVIATION；Info: 2 → OBSERVATION，均不影响判定）

## Scope Discipline Check

- 是否实现了 Non-goals 中明确禁止的内容：否（未做按名字驱动的微动效果，未提前实现字幕/选择/骰子/镜头渲染）
- 是否提前实现了后续节点的内容：否（DEV-023～026 均未被实现或触碰）
- 是否引入了禁止清单中的技术：否
- 是否修改了权限矩阵中不属于自己的文件：否
- 是否顺手重构了未要求改动的代码：否
- 是否严格按 Task Package 执行、未自行扩大范围：是（含对已冻结 `onSceneEnter` 的第二次 CR，严格限定在 Task Package 授权范围内）

## Architecture / Regression / Overengineering Audit

三项均 PASS：

- Architecture — 三跳引用解析正确落在 Runtime 侧（非 Renderer），符合 Dev Spec §35；`apps/renderer` 仅做布局合成（`composeCharacters`），不读取章节内容；未引入未授权的 RAG/向量库/多智能体运行时/LLM 逻辑；未实现按名字驱动的动画分发（按 D3 正确推迟，与 Non-goals 一致）；严格遵循固定五档 slot 模型，未新增自由坐标定位。
- Regression — `machine.test.ts`、`visualResolution.ts/.test.ts` 独立 diff 核实逐字节不变（非仅采信自评）；`PresentationCommand` 载荷向后兼容——端到端测试断言既有 `visualSceneId`/`layers` 字段与新增 `characters` 同时存在；`index.ts` 导出纯追加，无既有导出签名改动；全量回归套件（465 条测试）全过，较 DEV-021 基线（448 条）新增 17 条，与两个新测试文件声明的 9+8 条吻合。
- Overengineering — `SLOT_LEFT_PERCENT` 为单一扁平查找表，无投机性扩展点；无插件系统、无提前缓存、无未使用抽象；动画处理刻意保持纯布尔（`animated`），正确避免了在无真实资产支撑前构建按名字驱动的基础设施——这是正确的最小化选择，而非另一方向的过度设计。

## Auditor Statement

我只针对当前授权 DEV 节点及其冻结 Task Package、Requirements 和 Acceptance 进行了独立审计。

我没有修改任何项目业务代码，也没有推进任何后续 DEV 节点。

---

审核方式：直调 `project-auditor` subagent。原始输出（AUDIT_PASS，Blocker 0 / Major 0 / Minor 1 /
Info 2）由 Commander 逐字转录、按附录 B2 字段映射表映射为上表，未改写、未删减、未解读其结论。
