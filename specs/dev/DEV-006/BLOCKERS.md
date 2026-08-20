# DEV-006 BLOCKERS

本节点当前两个 BLOCKING 结构性矛盾，均已独立验证，待 `SCOPE_RULING` 裁决。

## BLK-005 — PASS4 使既有 clean fixture 判为非清洁（compiler 侧）

- **受影响的 Task**：T005 / T007（T006 的 `passed` 接线配合不进去）
- **卡住的具体原因**：`packages/chapter-compiler/test-fixtures/valid-minimal/**`、`graph-clean/**`、
  `host-clean/**` 三套"clean" fixture 共用同一结构：入口 `scene-start` 的 `interaction-01` 的
  Choice A 引用 `action-follow`（可达 Action），其 `dice-standard` 的 `qualityThresholds` 明确含
  `SPECIAL (min 20 max 20)`（d20 能摸到 20），但 `result-fight`/`result-follow` 把 `SPECIAL`
  标为 `unreachable: true`。按 T005 #2 的字面规则（骰子能摸到 + 结果标 unreachable = 覆盖缺口），
  这三个 fixture 都会产出 `UNREACHABLE_BUT_ROLLABLE` 问题。
- **越界冲突**：一旦按 T006 #2 把 `ruleCoverageIssues.length === 0` 纳入 `passed`，这三套 fixture
  的 `passed` 变 `false`，`compile.test.ts` 中既有 `expect(result.passed).toBe(true)`（valid-minimal、
  graph-clean、host-clean 三条）全部断裂——同时违反 T006 #3「既有断言逐字保留」与 A06「既有测试
  零回归」。而这三套 fixture 属 Read-only Scope（Task Package §3 Read-only 明确列出
  `test-fixtures/valid-minimal/**`、`graph-*/**`、`host-*/**`），且 Constraint 5「既有文件仅追加」，
  OPENCODE 无权修改其 dice/result 内容。仅靠新建 coverage-clean fixture 无法解决——既有 compile()
  断言仍然会断。
- **历史先例**：与 BLK-003（`SCOPE_RULING 0038`）、BLK-004（`SCOPE_RULING 0044`）同类——新增 PASS
  暴露既有 fixture 内容缺陷，需 Commander 解除只读限制后修正 fixture 内容。
- **OPENCODE 倾向方案**：方案①（推荐）——SCOPE_RULING 解锁这三套 clean fixture 的 `dice` 与
  `results` 单文件内容，把"能摸到但标 unreachable"的自相矛盾修掉（二选一：移除 `dice-standard`
  的 SPECIAL 阈值，或把结果里 SPECIAL 的 `unreachable` 改为完整结果条目），使其真正 PASS4-clean；
  随后 T007 的 coverage-gap 从修正后的 fixture 复制改一处。方案②（不推荐）——解除 T006 #3「既有
  断言逐字保留」禁令并接受这三套 fixture 处于 coverage 失败态，仅新建 coverage-clean 作正例；会让
  "clean" fixture 名不副实。

## BLK-006 — rule-engine 引入 dice-engine 引用形成项目引用环（rule-engine 侧）

- **受影响的 Task**：T002 / T003 / T004（代码已写，`pnpm build`/`typecheck` 全环）
- **卡住的具体原因**：`pnpm build` 报 `TS6202: Project references may not form a circular graph`，
  环为 `tsconfig.json → packages/rule-engine → packages/dice-engine → packages/rule-engine`。
- **越界冲突**：两条边都是"字面必需"——DEV-005 已冻结 `dice-engine → rule-engine`（`modifiers.ts`
  运行时 import `evaluateCondition`，DEV-005 `0058` AUDIT_PASS 认可，dice-engine 为 Read-only 不能
  改）；DEV-006 T002 #2 又按字面要求 rule-engine references 追加 `../dice-engine`（因 T004 #1 要求
  `import type { DiceRollResult } from '@interactive-story/dice-engine'`）。TS 项目引用图不允许环，
  任何方向缺一都会报 TS6307/TS2307（跨项目未声明引用）。**两包均已冻结部分内容，OPENCODE 无法在
  不越界的前提下断开任一条边。**
- **OPENCODE 倾向方案**：方案 B（推荐）——仿 DEV-005「不 import runtime-kernel、独立定义与 payload
  对齐的类型」的既有纪律：rule-engine 不 import dice-engine，在本地定义一个与 `DiceRollResult`
  字段形状一致的 `ResolveRollResult` 结构类型（同 DEV-005 D5 的"对齐是约定而非类型复用"），从而
  **不需要**在 rule-engine 加 dice-engine reference，环消失、零改动冻结包。需 Commander 以
  SCOPE_RULING 豁免 T002 #2 的 reference 与 T004 #1 的"import DiceRollResult"字面要求（改为字面
  re-define + DECISIONS 记录，与 DEV-005 先例一致）。方案 A（备选）——把 `DiceRollResult` 形状迁入
  `packages/shared` 或 `chapter-schema`，dice-engine 与 rule-engine 都从该中性位置取（需解锁这两个
  冻结包并改 dice-engine 导出，改动面更大）。

## 状态

**BLK-005 / BLK-006 均已 `CLOSED`**，结案依据 `SCOPE_RULING 0062`：

- **BLK-005 → 方案①**：6 个 `results/result-*.json` 的 `SPECIAL` 条目自 `unreachable: true` 修正为完整
  结果条目（镜像各文件 GREAT_SUCCESS，resultId 新起，narrativeId 复用既有 `narr-follow-success`，理由见
  DECISIONS D6/D7）；三套 clean fixture 名副其实 PASS4-clean；`coverage-clean` 复用 `graph-clean`，
  `coverage-gap` 从 `graph-clean` 复制改 `result-follow` 的 SPECIAL 为 unreachable。
- **BLK-006 → 方案 B**：rule-engine 本地定义 `ResolveRollResult`，不 import dice-engine、不加 reference，
  两包均为零改动冻结包；`pnpm build`/typecheck 环消除（见 DECISIONS D5）。

节点已从 `BLOCKED` 转回 `IN_PROGRESS` 并按 T005–T008 继续施工。
