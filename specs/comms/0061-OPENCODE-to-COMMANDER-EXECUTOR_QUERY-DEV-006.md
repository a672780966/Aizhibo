---
msg_id: "0061"
type: EXECUTOR_QUERY
from: OPENCODE
to: COMMANDER
node: DEV-006
in_reply_to: "0060"
created_at: 2026-08-20
requires_response: true
blocking: true
---

# EXECUTOR_QUERY — DEV-006（blocking）

## 概要

本节点施工中遇**两个**独立的结构性矛盾，均无法在 Writable Scope 内自行处置（Constraint 8），
需 `SCOPE_RULING`。rule-engine 侧 T001–T004 代码已写好且单包测试全绿，compiler 侧 T005–T007
未实现。详细记录见 `specs/dev/DEV-006/BLOCKERS.md`。

## BLK-005 — PASS4 使既有 clean fixture 判为非清洁（compiler 侧，影响 T005–T007）

`valid-minimal`/`graph-clean`/`host-clean` 三套 clean fixture 共用同一结构：入口 `scene-start`
的 `interaction-01` Choice A 引用 `action-follow`（可达 Action），其 `dice-standard` 能摸到
`SPECIAL`（阈值 20-20），但 `result-fight`/`result-follow` 把 `SPECIAL` 标 `unreachable: true`。
按 T005 #2 字面规则这是 `UNREACHABLE_BUT_ROLLABLE` 覆盖缺口。一旦按 T006 #2 把 `ruleCoverageIssues`
纳入 `passed`，这三套 fixture 的 `passed` 变 `false`，断裂 `compile.test.ts` 既有三条
`expect(passed).toBe(true)`——同时违反 T006 #3「既有断言逐字保留」与 A06「零回归」。fixtures 属
Read-only Scope + Constraint 5，OPENCODE 无权改其 dice/result；仅新建 coverage-clean 也绕不开
这三条既有断言。

**倾向方案①**：SCOPE_RULING 解锁这三套 clean fixture 的 `dice`/`results` 单文件内容，把
"能摸到但标 unreachable"修掉（移除 SPECAL 阈值 或 给它完整结果条目），使其真正 PASS4-clean；
T007 coverage-gap 从修正后 fixture 复制改一处。（同 BLK-003 `0038` / BLK-004 `0044` 先例。）

## BLK-006 — rule-engine 引入 dice-engine 引用形成项目引用环（rule-engine 侧，T002–T004）

`pnpm build` 报 `TS6202: Project references may not form a circular graph`：
`root → rule-engine → dice-engine → rule-engine`。两条边都"字面必需"：
- `dice-engine → rule-engine`：DEV-005 冻结（`modifiers.ts` 运行时 import `evaluateCondition`，
  `0058` AUDIT_PASS 认可），dice-engine Read-only 不能改；
- `rule-engine → dice-engine`：DEV-006 T002 #2 字面要求加 reference（因 T004 #1 要求
  `import type { DiceRollResult } from '@interactive-story/dice-engine'`）。

TS 项目引用图禁环；任一方向缺一都报 TS6307/TS2307。两包均已冻结部分内容，OPENCODE 无法不越界
断开任一方向。

**倾向方案 B**：仿 DEV-005「不 import runtime-kernel、独立定义与 payload 对齐类型」的先例
（DECISIONS D5）——rule-engine 本地定义与 `DiceRollResult` 字段形状一致的 `ResolveRollResult`
结构类型，不 import dice-engine，从而**不加** dice-engine reference，环消失、零改动冻结包。
需 SCOPE_RULING 豁免 T002 #2 reference 与 T004 #1「import DiceRollResult」字面要求（改字面
re-define，DECISIONS 记录）。方案 A（备选）：把 `DiceRollResult` 形状迁入 shared/chapter-schema，
两包从中取（改动面大，需解锁冻结包）。

## 已完成的无关部分（供参考，不阻塞裁决）

- `specs/dev/DEV-006/` 四份文档已建（INDEX/REQUIREMENTS/ACCEPTANCE/REPORT 占位）；
- `packages/rule-engine`：`actionScale.ts`+test、`actionResolve.ts`+test、`index.ts` 追加导出、
  `package.json`/`tsconfig.json` 加 dice-engine 依赖/BLK-006 前 —— 单包 vitest 7 文件 / 39 断言全绿，
  但 `pnpm build`/typecheck 被 BLK-006 环阻断。

## 待裁决项

1. BLK-005：是否采纳方案①（解锁三套 clean fixture 内容，授权 OpenCode 修正其 dice/result 使
   PASS4-clean）？
2. BLK-006：是否采纳方案 B（豁免 T002 #2 / T004 #1 字面，rule-engine 本地 re-define
   `ResolveRollResult`，不 import dice-engine、不加 reference 破环）？
