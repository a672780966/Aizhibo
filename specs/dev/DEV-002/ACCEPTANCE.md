## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含全部三包） | 命令 |
| A03 | `pnpm lint` 退出码 0，0 error / 0 warning | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0，`packages/chapter-compiler/dist/index.d.ts` 存在 | 命令 + 文件检查 |
| A06 | `pnpm test` 退出码 0；`chapter-schema`/`runtime-kernel` 既有测试无回归；`chapter-compiler` 新增全部测试通过 | 命令输出 |
| A07 | `packages/chapter-compiler` 的 `dependencies` 恰为 `{ @interactive-story/chapter-schema, zod }`；`zod` 版本与 `chapter-schema` 一致 | 文件检查 |
| A08 | `packages/*` 恰为 `shared`/`chapter-schema`/`runtime-kernel`/`chapter-compiler` 四包 | 文件检查 |
| A09 | `apps/`、`chapters/`、`assets/`、`scripts/`、`tools/` 均不存在 | 文件检查 |
| A10 | `loadChapterPack` 对含 1 个 JSON 语法错误的 fixture 不抛异常，`issues` 恰含该 1 条 | 测试检查 |
| A11 | PASS1：19 个内容分类的正例全部 PASS，反例全部 FAIL 且 `issues` 非空 | 测试检查 |
| A12 | PASS1：集合内 id 重复被拒绝；`story.graph.json` 跨 scene/boss/ending 的全局 id 冲突被拒绝（且不与"集合内唯一"逻辑混淆） | 测试检查 |
| A13 | PASS2：T007 八项故事图引用检查每项都有正反例 | 测试检查 |
| A14 | PASS2：T008 六项 Action/Dice/Result 链路检查每项都有正反例；`mapsTo` 链式指向被拒绝 | 测试检查 |
| A15 | PASS2：T009 三项 NPC/Visuals 检查每项都有正反例；两跳 `expression` 校验在根因已报错时不重复报错 | 测试检查 |
| A16 | PASS2：T010 两项 Boss 引用检查都有正反例 | 测试检查 |
| A17 | `compile()` 对合法 fixture 返回 `passed: true`，对综合损坏 fixture 返回 `passed: false` 且四类 issue 均非空 | 测试检查 |
| A18 | PASS2 不对 PASS1 失败条目产生级联引用错误 | 测试检查 |
| A19 | 包内不存在任何 `fs.existsSync`/文件存在性检查用于图片、音频等资产实体文件（允许存在于 Loader 读取 Chapter Pack 自身 JSON 文件的逻辑中） | grep + 代码审查 |
| A20 | 包内不存在图可达性/环检测/仿真循环相关函数名（`isReachable`/`detectCycle`/`simulate` 等） | grep 检查 |
| A21 | 包内不存在对 `packages/runtime-kernel` 或 `packages/shared` 的 import | grep 检查 |
| A22 | 未引入 `fast-glob`/`globby` 等第三方 glob 依赖 | 文件检查 |
| A23 | `test-fixtures/` 不在 `chapters/` 目录下，且未被误认作真实产品内容（`README` 或目录命名自解释） | 文件检查 |
| A24 | `specs/dev/DEV-002/` 四份节点文档齐全，`INDEX.md` 含原句且 T001–T013 全部勾选 | 文件 + 文本检查 |
| A25 | `git log` 新增恰 1 条提交，首行 `DEV-002: chapter compiler core (PASS 1+2)`；`git status --porcelain` 在该提交时为空 | 命令 |
| A26 | LEDGER 含 `OPENCODE → AUDITOR` 的 `NODE_REPORT-DEV-002` 记录，信封 `git_head` 与提交 sha 一致 | LEDGER + 命令比对 |
| A27 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**`、`packages/chapter-schema/**`、`packages/runtime-kernel/**`、`packages/shared/**` 均未被修改 | git diff 比对 |
