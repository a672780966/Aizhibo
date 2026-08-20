# DEV-009 VERDICT

> 本文件由 `AUDITOR`（`project-auditor` 角色）产出内容，经 `COMMANDER` 逐字转录套入本模板
> （依据 `COMMS-PROTOCOL-V1.md` 附录 B2/B3）。字段映射：`BLOCKER`/`MAJOR` → `BLOCKING`，
> `MINOR` → `DEVIATION`，`INFO` → `OBSERVATION`。

## Audit Basis

- Task Package: `specs/tasks/TASK-PACKAGE-DEV-009.md`
- Acceptance 权威副本: Task Package 第 12 节
- 节点 `ACCEPTANCE.md` 与权威副本逐字比对：**IDENTICAL**（已核对，无篡改）
- `git_head` 审核锚点（`NODE_REPORT` 消息 `0071` 申报）：`cc4036006ef5edeb6d4b0aba9bf988a8de03a751`（独立 `git rev-parse HEAD` 核对一致）

## Independent Verification

审核员**自己重跑**的命令与原始结果（不采信 REPORT 摘要）：

| 命令 | 退出码 | 与 REPORT/NODE_REPORT 声明一致 |
|---|---|---|
| `pnpm install` | 0 | 一致 |
| `pnpm typecheck`（`tsc -b && tsc -b --noEmit`） | 0 | 一致 |
| `pnpm lint`（`eslint .`） | 0（0 error/0 warning） | 一致 |
| `pnpm format:check`（`prettier --check .`） | 0 | 一致 |
| `pnpm build`（`tsc -b`） | 0 | 一致 |
| `pnpm test`（`vitest run`） | 0，`Test Files 67 passed / Tests 380 passed` | 一致（增量 +25，既有 355 零回归） |

注：审核员未按 REPORT 所述"清空 dist/tsbuildinfo 后重跑"（工具权限边界限制了删除操作），而是在现有构建缓存基础上重跑；六条命令结果与增量/回归数字仍与 REPORT 完全一致，不影响下方判定。

## Scope Audit

PASS（Scope 纪律本身无问题，问题在实现内容完整性，见 Findings）

- `git show --stat cc40360`：26 个文件变更，与 NODE_REPORT 信封 `changed_files_count: 26` 及 REPORT.md 的 Changed Files 清单逐项吻合，无未声明改动。
- `git diff 6c35f89 cc40360 -- packages/runtime-kernel/src/event.ts packages/runtime-kernel/src/diceEvent.ts`：零输出——DEV-008 冻结文件确认未被触碰。
- `git diff 6c35f89 cc40360 -- specs/PROJECT_INDEX.md specs/dev/DAG.md specs/tasks/** specs/audit/** specs/protocol/**`：零输出——治理冻结包确认未被 OpenCode 修改（A21 VERIFIED）。
- 当前 `git status --porcelain` 显示 `LEDGER.md` 有未提交追加（NODE_REPORT 行）与 `0071` 消息文件未跟踪——系 T011 步骤时序（先 commit 再追加 LEDGER/发消息）设计导致，不违反 A19，与既往节点（如 DEV-033）同一模式。

## Requirement Verification

| Requirement | Status | Evidence |
|---|---|---|
| CR-004 四个 IO Port 接口 + 默认空实现，构造时可覆盖 | VERIFIED | `ports.ts`；`machine.ts:140` |
| CR-005 Region 深度分层（STORY/INTERACTION 完整，PRESENTATION/AUDIO 骨架，HOST/PLATFORM/SAFETY 占位） | VERIFIED | 七个 Region 文件与 `machine.ts` 组装一致 |
| CR-008 Snapshot 不透明类型 + 具名访问器，`index.ts` 不导出内部结构 | **MISSING**（见 F-01） | `index.ts` 经由 `RuntimeContext`/`RuntimeActor.getSnapshot()` 结构性泄漏内部快照 |
| 确定性：机器内部无裸 `Date.now`/`Math.random` | VERIFIED | grep 仅 `ports.ts:42` 的 `systemClockPort` 命中 |
| 骰子种子派生公式 | VERIFIED | `interactionRegion.ts:72`；`DECISIONS.md` D4 |
| DICE 事件节奏简化（同次转移依次产 REQUESTED/ROLLED/PUBLISHED） | VERIFIED，且确系 Task Package §9 #4 明示简化，非遗漏 | `machine.ts:287-292`；`DECISIONS.md` D5 |
| STORY 十态 + 真实转移逻辑（含 compile 成败分支、guard/next 分支） | **PARTIAL**（见 F-02） | `resolveGuard` 从未被调用，`scene.guards` 被忽略；compile 失败→ERROR 路径零行为测试 |
| INTERACTION 六态 + 投票覆盖 + 多 ActionGroup + DICE 三事件 | **PARTIAL**（见 F-03） | 多 ActionGroup 并存的正例测试全仓库不存在 |
| PRESENTATION/AUDIO 骨架，状态可达 | **PARTIAL**（见 F-04） | AUDIO 的 `PLAYING_HOST`/`ERROR` 两态从未被测试进入 |
| HOST/PLATFORM/SAFETY 占位 | VERIFIED | `placeholderRegions.ts` + 测试 |
| `createRuntimeMachine` 端到端链路 | VERIFIED | `machine.test.ts` E2E |
| `getEventLog` 单调递增 + 防篡改 | VERIFIED | `machine.test.ts` |
| `DECISIONS.md` 覆盖架构决策 | VERIFIED | D1/D3/D4/D5 内容详实 |
| `Allowed Files` 逐一真实改动 | VERIFIED | `git show --stat` 全部文件均有真实非零 diff |

## Acceptance Results

| # | AUDITOR 判定 | OPENCODE 自报 | 一致 | 证据 |
|---|---|---|---|---|
| A01 | PASS | PASS | ✅ | 独立重跑退出码 0 |
| A02 | PASS | PASS | ✅ | 独立重跑退出码 0 |
| A03 | PASS | PASS | ✅ | 独立重跑退出码 0 |
| A04 | PASS | PASS | ✅ | 独立重跑退出码 0 |
| A05 | PASS | PASS | ✅ | 独立重跑退出码 0 |
| A06 | PASS | PASS | ✅ | 67 files / 380 tests |
| A07 | PASS | PASS | ✅ | `package.json` 核实 xstate + 五内部包 + zod |
| A08 | **FAIL** | PASS | ❌ | F-01：`RuntimeContext`/`getSnapshot()` 结构性泄漏内部快照，`tsc --strict` 独立验证可编译通过对内部字段的直接访问 |
| A09 | PASS | PASS | ✅ | `ports.test.ts` |
| A10 | **FAIL** | PASS | ❌ | F-02：`resolveGuard` 未使用；ERROR 路径无行为测试 |
| A11 | **FAIL** | PASS | ❌ | F-03：无"多 ActionGroup 并存"测试（实现本身经独立脚本验证可行，纯测试缺口） |
| A12 | **FAIL** | PASS | ❌ | F-04：AUDIO 的 `PLAYING_HOST`/`ERROR` 两态从未被测试进入 |
| A13 | PASS | PASS | ✅ | `placeholderRegions.test.ts` |
| A14 | PASS | PASS | ✅ | `machine.test.ts` E2E |
| A15 | PASS | PASS | ✅ | 单调性 + 防篡改断言 |
| A16 | PASS | PASS | ✅ | 独立 grep 复核 |
| A17 | PASS | PASS | ✅ | `DECISIONS.md` D1–D10 内容详实 |
| A18 | PASS | PASS | ✅ | 五份节点文档齐全，T001–T011 全勾 |
| A19 | PASS | PASS | ✅ | `git log` 恰 1 条提交 `cc40360`，首行匹配 |
| A20 | PASS | PASS | ✅ | LEDGER `0071` 行 `git_head` 一致 |
| A21 | PASS | PASS | ✅ | 治理冻结包与 DEV-008 冻结文件均未改动 |

`INCONCLUSIVE` 项：无。

## Undeclared Changes

NONE。`git diff` 与 REPORT Changed Files 列表逐项比对一致；`pnpm-lock.yaml`、`LEDGER.md` 的改动已在 REPORT 中如实披露。

## Findings

| ID | 等级 | 内容 | 依据 |
|---|---|---|---|
| F-01 | **BLOCKING**（BLOCKER） | **A08 不透明 Snapshot 边界被绕过**：`packages/runtime-kernel/src/index.ts` 未导出字面量 `InternalSnapshot`/`unwrapSnapshot`（字符串级 grep 查不到），但 `index.ts` 导出的 `RuntimeContext` 接口内含 `snapshot: InternalSnapshot` 字段，`RuntimeActor.getSnapshot(): { value: unknown; context: RuntimeContext }` 经由 `createRuntimeMachine` 返回值间接公开。外部消费者只需 `import type { RuntimeContext }` 即可写出 `actor.getSnapshot().context.snapshot.world.flags.xxx` 这种被 Task Package 第 2.3 节明文禁止的直接字段访问路径。审核员独立编译验证：对**编译产物** `packages/runtime-kernel/dist/index.d.ts` 用 `tsc --strict --noEmit` 编译一段只 `import type { RuntimeContext }` 并访问 `ctx.snapshot.world.chapterId`/`ctx.snapshot.world.flags`/`ctx.snapshot.sequenceCounter` 的脚本，**零类型错误**，证实泄漏真实可用。直接违反 Task Package Forbidden Scope 条目"`index.ts` 导出内部 snapshot 结构类型（违反不透明类型原则）"及 A08 本身。 | `packages/runtime-kernel/src/index.ts:12`；`packages/runtime-kernel/src/machine.ts:22-34,130-133`；`dist/machine.d.ts` |
| F-02 | **BLOCKING**（BLOCKER） | **A10 STORY Region"真实转移逻辑"不完整，验收要求的失败路径测试缺失**：(a) Task Package T005 明文要求 STORY_PLAYING 无 interaction 分支须用 `rule-engine.resolveGuard` 按 `scene.guards` 决定下一场景；`grep -rn resolveGuard packages/runtime-kernel/src` 零命中，`storyRegion.ts` 的 `resolveNextScene` 只读 `scene.next`，完全忽略 `scene.guards`。(b) Task Package T005 Acceptance 明文要求 `compile()` 失败路径有测试；全仓库搜索未发现任何用例构造 `compile().passed === false` 并断言状态机进入 `ERROR`。REPORT.md 对 A10 的自述"ERROR 路径由 compileFailed→ERROR 分支与类型/结构覆盖"是模糊表述，不构成行为测试。 | `packages/runtime-kernel/src/storyRegion.ts:27-45`；`packages/rule-engine/src/guard.ts`；`packages/chapter-schema/src/scene.ts:24`；`storyRegion.test.ts`（无 guard/ERROR 路径测试） |
| F-03 | **BLOCKING**（MAJOR） | **A11"多个 ActionGroup 并存"验收测试缺失**：Task Package T006 Acceptance 明文要求多 ActionGroup 并存正例。复用的 `valid-minimal` fixture 中相关 interaction 均只有一个 choice，现有测试从未真正产生第二个 ActionGroup。审核员独立编写脚本手工构造含两个 choices 的 `InteractionNode`，调用编译产物 `resolveGroups`：结果为 `diceRecords.length === 2`，证明实现本身正确，问题纯属测试覆盖缺失——按 Acceptance"测试检查"要求，该验收点当前仍判 FAIL。 | `packages/chapter-compiler/test-fixtures/valid-minimal/interactions/interaction-01.json`（单 choice）；`interactionRegion.test.ts`；独立脚本验证记录 |
| F-04 | **BLOCKING**（MAJOR） | **A12 AUDIO Region 状态可达性验收未满足**：Task Package T007 明文要求两 Region 每个态均可进入。PRESENTATION 三态全部被测试进入；AUDIO 六态中 `PLAYING_HOST`、`ERROR` 从未被任何测试实际进入（无 `AUDIO.PLAY_HOST`/`AUDIO.FAIL` 事件驱动）。 | `packages/runtime-kernel/src/audioRegion.ts:21-32`；`audioRegion.test.ts`（止步于 IDLE→PREPARING→PLAYING_STORY→DUCKED） |
| OBS-1 | OBSERVATION（INFO） | `pnpm lint` 会 lint 到 `packages/*/dist/**` 生成的 `.d.ts`（`eslint.config.js` 的 `ignores:['dist']` 不覆盖嵌套 dist）是仓库既有配置缺口，非 DEV-009 引入。但为使公开 `.d.ts` lint-clean，`RuntimeActor` 被设计为脱离 XState 原生泛型的独立接口——这一设计选择正是 F-01 泄漏的直接成因之一。Commander 拟 FIX 时须注意：修复 F-01 仍需保持 `.d.ts` lint-clean，不得以重新引入 `any` 泛型的方式简单回退。 | `eslint.config.js`；REPORT Known Issues #2 |
| OBS-2 | OBSERVATION（INFO） | 测试整体质量总体扎实（抽查 `storyRegion.test.ts`、`interactionRegion.test.ts`、`machine.test.ts`、`snapshot.test.ts`、`ports.test.ts` 均为真实调用+真实断言），F-02/F-03/F-04 性质是"遗漏 Task Package 明文要求的特定分支/状态覆盖"，非测试方法论系统性缺陷。 | 抽查记录 |
| OBS-3 | OBSERVATION（INFO） | `LEDGER.md` 当前存在未提交追加（`0071` 行）与 `0071` 消息文件未跟踪，系 T011 步骤时序设计导致，与既往节点（如 DEV-033）同一模式，不构成 A19/A21 违规。 | `git status --porcelain` |

## Verdict

**FAIL**（Blocker: 2 → BLOCKING(F-01, F-02)，Major: 2 → BLOCKING(F-03, F-04)，Minor: 0，Info: 3 → OBSERVATION；任一 BLOCKING 即为 FAIL）

## Scope Discipline Check

- 是否实现了 Non-goals 中明确禁止的内容：否
- 是否提前实现了后续节点的内容：否
- 是否引入了第 70 节禁止清单中的技术：否
- 是否修改了权限矩阵中不属于自己的文件：否
- 是否顺手重构了未要求改动的代码：否
- 是否违反了本节点 Forbidden Scope 明文列出的技术限制：**是**——`index.ts` 导出内部 snapshot 结构类型，INDEX.md Forbidden Scope 逐字列出的禁止项（见 F-01）

## Required Remediation

最小修复范围（供 `FIX_PACKAGE` 使用，不得借此扩大 Scope 或重构已通过部分）：

1. **修复 F-01（A08）**：收窄 `index.ts` 对外暴露的类型面，使任何公开类型/方法都不能结构性暴露 `InternalSnapshot`。将 `RuntimeActor.getSnapshot()` 返回类型改为不含 `InternalSnapshot`（或结构等价类型）的公开安全形态，停止从 `index.ts` 导出 `RuntimeContext`；对外读取统一收敛到既有具名访问器。补一条测试证明公开 API 表面无法结构性访问内部字段。修复须保持公开 `.d.ts` 继续 lint-clean，不得重新引入 `any` 泛型。
2. **修复 F-02（A10）**：STORY_PLAYING 无 interaction 分支中，先用当前场景 `guards`（若存在）调用 `resolveGuard(scene.guards, world)`，命中用其 `goto`，未命中/无 `guards` 回退 `scene.next`。补充 guard 命中分支测试与 `compile().passed === false` 触发 `ERROR` 态的测试。
3. **修复 F-03（A11）**：补充至少一条测试，验证同一轮 INTERACTION 中存在 2 个以上并存 `ActionGroup`（可手写含多 `choices` 的 `InteractionNode`，无需修改只读 fixture）。
4. **修复 F-04（A12）**：补充测试分别驱动 AUDIO Region 进入 `PLAYING_HOST` 与 `ERROR` 两态。

不涉及以上四点的其余交付物（Ports、Snapshot 访问器主体设计、HOST/PLATFORM/SAFETY 占位、Event Log、DECISIONS.md、六条命令绿灯、Scope 纪律、DEV-008 冻结边界）均已独立核验通过，FIX 阶段不得借机重构或扩大范围。

## Auditor Statement

我只针对当前授权 DEV-009 节点及其冻结 Task Package、Requirements 和 Acceptance 进行了独立审计。

我没有修改任何项目业务代码，也没有推进任何后续 DEV 节点。
