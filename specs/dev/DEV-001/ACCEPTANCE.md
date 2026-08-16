## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含 `packages/shared` 与 `packages/chapter-schema` 两包） | 命令 |
| A03 | `pnpm lint` 退出码 0，0 error / 0 warning | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0，`packages/chapter-schema/dist/index.d.ts` 存在 | 命令 + 文件检查 |
| A06 | `pnpm test` 退出码 0，`packages/shared` 原有 2 个测试文件仍全部通过（无回归），`packages/chapter-schema` 新增 17 个测试文件（T003–T019）全部通过 | 命令输出 |
| A07 | 根 `package.json` 与 `packages/chapter-schema/package.json` 的 `dependencies` 恰为 `{ zod }`；根 `package.json` 无 `dependencies` | 文件检查 |
| A08 | `packages/*` 恰为 `shared` 与 `chapter-schema` 两个包，无其它包目录 | 文件检查 |
| A09 | `apps/`、`chapters/`、`assets/`、`scripts/`、`tools/` 均不存在 | 文件检查 |
| A10 | 19 个内容分类（manifest / storyGraph / worldRules / worldState-npcState-dangerState / stateRules / scene / interaction-choice / action-dice / result / narrative / npc / visuals / audio / boss / endings / recovery / hostPublic / metadata / chapterPack）均有对应 `.ts` 模块与 `.test.ts` | 文件检查 |
| A11 | `Quality` 类型全包只在 `result.ts` 定义一次，`dice.ts` 通过 import 引用 | grep 检查 |
| A12 | `WorldState` 字段与 Dev Spec 第 14 节逐字对照一致 | 文本比对 |
| A13 | `DangerState`、`HostPolicy`、`ResultEntry`/`ResultDictionary` 与 `ADDENDUM-002 §B2/B3/B4` 逐字对照一致 | 文本比对 |
| A14 | `NoParticipationPolicy` 必填于 `InteractionNode`；`HOLD.thenFallback` 的类型层面不允许 `kind: "HOLD"`（`@ts-expect-error` 测试存在且通过） | 代码 + 测试检查 |
| A15 | `CharacterPlacement.slot` 为五档字面量联合，反例被拒绝 | 测试检查 |
| A16 | `BossNode`/`BossPhase` 不含 `hp`/`health`/`damage`/`attack` 等字段名 | grep 检查 |
| A17 | `AudioAsset` 的 `source`/`file`/`ttsSpec` 互斥必填关系有测试覆盖两种非法组合 | 测试检查 |
| A18 | `EndingNode` 的 `isFallback`/`when` 一致性由 `.refine()` 强制且有反例测试 | 测试检查 |
| A19 | `ResultEntry` 三分支互斥，反例覆盖"同时含 resultId 与 mapsTo" | 测试检查 |
| A20 | 包内不存在 `evaluate`/`apply`/`resolve`/`compile`/`parseChapterPack`/`loadChapter` 等函数名（grep，允许 Zod 内置的 `.parse`/`.safeParse` 方法调用，不含独立同名函数定义） | grep 检查 |
| A21 | 包内不存在任何 `fs`/`node:fs` 导入 | grep 检查 |
| A22 | 所有 id 字段类型为 `z.string()`，未从 `@interactive-story/shared` 导入 `Brand` | grep 检查 |
| A23 | `chapterPack.ts` 的聚合映射覆盖 Dev Spec 第 19 节列出的全部 5 根文件角色与 14 子目录条目类型 | 代码检查 |
| A24 | `metadata.ts` 顶部含"不参与 PASS 2–8"注释；所有字段 `.optional()` | 文本 + 代码检查 |
| A25 | `specs/dev/DEV-001/` 含 INDEX / REQUIREMENTS / ACCEPTANCE / REPORT 四份文档，`INDEX.md` 含原句 `OpenCode 禁止自行推进下一 DEV Node.`，T001–T020 全部勾选 | 文件 + 文本检查 |
| A26 | `git log` 新增恰 1 条提交，首行 `DEV-001: chapter schema`；`git status --porcelain` 在该提交时为空 | 命令 |
| A27 | `specs/comms/LEDGER.md` 含一条 `OPENCODE → AUDITOR` 的 `NODE_REPORT-DEV-001` 记录，对应消息文件存在，信封 `git_head` 与提交 sha 一致 | LEDGER + 文件 + 命令比对 |
| A28 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**`、`packages/shared/**`、`tsconfig.base.json`、`eslint.config.js`、`.prettierrc.json`、`vitest.config.ts` 均未被修改 | git diff 比对 |

---
