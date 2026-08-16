## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含 `shared`/`chapter-schema`/`runtime-kernel` 三包） | 命令 |
| A03 | `pnpm lint` 退出码 0，0 error / 0 warning | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0，`packages/runtime-kernel/dist/index.d.ts` 存在 | 命令 + 文件检查 |
| A06 | `pnpm test` 退出码 0；`shared` 2 个测试文件、`chapter-schema` 18 个测试文件均无回归；`runtime-kernel` 新增 3 个测试文件全部通过 | 命令输出 |
| A07 | 根 `package.json` 无 `dependencies`；`packages/runtime-kernel/package.json` 的 `dependencies` 恰为 `{ zod }` | 文件检查 |
| A08 | `packages/*` 恰为 `shared`、`chapter-schema`、`runtime-kernel` 三个包 | 文件检查 |
| A09 | `apps/`、`chapters/`、`assets/`、`scripts/`、`tools/` 均不存在 | 文件检查 |
| A10 | `RuntimeEvent` 字段与第 16 节逐字对照一致（`id`/`sequence`/`timestamp`/`type`/`payload`/`chapterId`/`sessionId`），另含本节点新增的 `visibility` 字段（CR-008 授权，非规范原文，须在 REPORT 中如实标注为增补而非篡改） | 文本比对 |
| A11 | `sequence` 拒绝负数/非整数反例；`timestamp` 拒绝非法格式反例 | 测试检查 |
| A12 | `visibility` 为必填，`z.literal("PUBLIC")`/`z.literal("HIDDEN")` 而非宽松 `z.string()`；缺失被拒绝 | 代码 + 测试检查 |
| A13 | 三个 Dice 事件类型（`DICE.REQUESTED`/`DICE.ROLLED`/`DICE.PUBLISHED`）构成 `z.discriminatedUnion`；`type` 越界反例被拒绝 | 测试检查 |
| A14 | `ROLLED`/`PUBLISHED` 的 payload 含第 8 节六字段（`seed`/`rollIndex`/`diceType`/`rawValue`/`modifier`/`finalValue`）；反例覆盖缺任一字段 | 测试检查 |
| A15 | `DICE.ROLLED` 的 `visibility` 恰为 `"HIDDEN"`，`REQUESTED`/`PUBLISHED` 恰为 `"PUBLIC"`；反例覆盖把 `ROLLED` 误设为 `PUBLIC` 被拒绝 | 测试检查 |
| A16 | 包内不存在 `emit`/`dispatch`/`publish`/`append`/`replay`/`rollDice`/`generateSeed` 等函数名（grep，允许 Zod 内置方法调用） | grep 检查 |
| A17 | 包内不存在任何 `fs`/`node:fs` 导入；不存在 `xstate` 或任何数据库驱动依赖 | grep + 依赖检查 |
| A18 | 所有 id 字段类型为 `z.string()`，未从 `@interactive-story/shared` 导入 `Brand`；未导入 `@interactive-story/chapter-schema` | grep 检查 |
| A19 | `index.ts` 桶导出可访问 `RuntimeEventSchema`、`DiceEventSchema` 及三个具体事件 schema 与类型 | 代码检查 |
| A20 | `specs/dev/DEV-008/` 含 INDEX / REQUIREMENTS / ACCEPTANCE / REPORT 四份文档，`INDEX.md` 含原句 `OpenCode 禁止自行推进下一 DEV Node.`，T001–T006 全部勾选 | 文件 + 文本检查 |
| A21 | `git log` 新增恰 1 条提交，首行 `DEV-008: runtime event model`；**该提交时点** `git status --porcelain`（不计 LEDGER 追加与新消息文件）为空——须独立用 `git show <sha>:specs/dev/DEV-008/INDEX.md` 核实该提交内的 INDEX.md 已是终态，不得是骨架版本（DEV-001 FIX-01 教训） | 命令 |
| A22 | `specs/comms/LEDGER.md` 含一条 `OPENCODE → AUDITOR` 的 `NODE_REPORT-DEV-008` 记录，对应消息文件存在，信封 `git_head` 与提交 sha 一致 | LEDGER + 文件 + 命令比对 |
| A23 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**`、`packages/shared/**`、`packages/chapter-schema/**`、`specs/dev/DEV-000/**`、`specs/dev/DEV-001/**`、`.claude/**`、`tsconfig.base.json`、`eslint.config.js`、`.prettierrc.json`、`vitest.config.ts` 均未被修改 | git diff 比对（本次应可用干净 diff 证明，因 Commander 已在提交 `a5b0cd8` 完成治理文件独立提交） |

---
