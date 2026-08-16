# DEV-002 REPORT

## Status

READY_FOR_REVIEW

## Implemented

T001–T013 全部完成。实际完成内容：

- `packages/chapter-compiler`：纯函数批处理库，`dependencies` 恰为
  `{ @interactive-story/chapter-schema: workspace:*, zod: ^4.4.3 }`（zod 与 chapter-schema 完全一致，D1）。
- **Loader（T003）**：`loadChapterPack(rootDir)` 同步读取第 19 节固定目录结构（5 根文件 + 14 子目录），
  单个文件 JSON 语法错误/读取失败/根文件缺失一律转为 `LoadIssue[]`，不 throw；子目录条目
  仅收录 `*.json`（`FileEntry{file, content}`），`file` 标识符归一化为正斜杠（D6）。
- **PASS 1 Schema（T004）**：`runSchemaValidation(raw)` 对 19 个内容分类逐项跑 chapter-schema 的
  Zod schema；失败条目保留原始 `ZodIssue[]`（path/message/code）；`narrative/` 双 schema 判别（D3）、
  `visuals/` 三 schema 判别（D4）。
- **PASS 1 唯一性（T005）**：`checkIdUniqueness(schemaResult)` 仅统计 PASS1 通过的条目；
  15 个集合内检查 + `storyGraph.nodes` 注册表重复 + `storyGraph.crossKind` 跨类文件 id 冲突（D8）。
- **引用索引（T006）**：`buildReferenceIndex(schemaResult)` 为每类内容建 `Set<string>`，
  `characterAssets: Map<id, Set<expressionKey>>` 供两跳校验，`nodeFileToId` 供故事图文件一致性检查。
- **PASS 2（T007–T010）**：四个校验函数共 19 类 `ReferenceIssue`：
  storyGraph 8 项（entryNodeId 且须为 SCENE / 节点文件存在且 id 一致 / 无孤儿 / next / guard.goto /
  interactionId / nextScene / boss onDefeat·onFailure）、actionChain 6 项（ruleId / diceProfileId /
  resultSetId / narrativeId / mapsTo 链式拒绝 / recovery actionId）、npcVisuals 3 项
  （characterAssetId / characterId / 两跳 expression，根因已报错时不级联）、boss 2 项
  （phase interactionId / interaction nextScene 回指约定，后者 `severity: ADVISORY`，D7）。
- **compile()（T011）**：`loadChapterPack → runPass1 → runPass2` 串联，`passed` 仅当四类问题全空；
  `runPass2(raw, pass1)` 按 Outputs 签名保留 `raw` 参数（D5）；compile 及其子函数零文件写入。
- **测试（T012）**：10 个 `.test.ts`（T003–T011 每模块正反例，174 条断言全绿）；
  `test-fixtures/` 9 个目录：`valid-minimal`（覆盖全部 19 分类的最小合法 Pack，compile → passed: true）
  + 8 个 `broken-*` 针对性损坏 fixture（含 README 自解释，A23）。
- 节点文档五份（INDEX / REQUIREMENTS / ACCEPTANCE / REPORT / DECISIONS）。

## Changed Files

新增：

```
packages/chapter-compiler/package.json
packages/chapter-compiler/tsconfig.json
packages/chapter-compiler/src/index.ts
packages/chapter-compiler/src/types.ts
packages/chapter-compiler/src/types.test.ts
packages/chapter-compiler/src/loader.ts
packages/chapter-compiler/src/loader.test.ts
packages/chapter-compiler/src/pass1Schema.ts
packages/chapter-compiler/src/pass1Schema.test.ts
packages/chapter-compiler/src/pass1Uniqueness.ts
packages/chapter-compiler/src/pass1Uniqueness.test.ts
packages/chapter-compiler/src/referenceIndex.ts
packages/chapter-compiler/src/referenceIndex.test.ts
packages/chapter-compiler/src/pass2StoryGraph.ts
packages/chapter-compiler/src/pass2StoryGraph.test.ts
packages/chapter-compiler/src/pass2ActionChain.ts
packages/chapter-compiler/src/pass2ActionChain.test.ts
packages/chapter-compiler/src/pass2NpcVisuals.ts
packages/chapter-compiler/src/pass2NpcVisuals.test.ts
packages/chapter-compiler/src/pass2BossRecovery.ts
packages/chapter-compiler/src/pass2BossRecovery.test.ts
packages/chapter-compiler/src/compile.ts
packages/chapter-compiler/src/compile.test.ts
packages/chapter-compiler/test-fixtures/**   （9 个 fixture 目录 + README）
specs/dev/DEV-002/INDEX.md
specs/dev/DEV-002/REQUIREMENTS.md
specs/dev/DEV-002/ACCEPTANCE.md
specs/dev/DEV-002/REPORT.md
specs/dev/DEV-002/DECISIONS.md
```

修改：

```
tsconfig.json                    （references 追加 packages/chapter-compiler）
pnpm-lock.yaml                   （新增 workspace 包）
specs/comms/LEDGER.md            （消息 0023 OPEN → CLOSED；追加 0024 行）
```

构建产物 `packages/chapter-compiler/dist/` 与 `node_modules/` 为 gitignored 产物。

## Tests Executed

| 命令 | 结果 | 关键输出 |
|---|---|---|
| pnpm install | PASS | `Already up to date` / `Done in 775ms using pnpm v11.5.3`，退出码 0 |
| pnpm typecheck | PASS | 无错误输出，退出码 0（全部四包通过） |
| pnpm lint | PASS | 无错误无警告输出，退出码 0（0 error / 0 warning） |
| pnpm format:check | PASS | `All matched files use Prettier code style!`，退出码 0 |
| pnpm build | PASS | 无错误输出，退出码 0；`packages/chapter-compiler/dist/index.d.ts` 存在（Test-Path = True） |
| pnpm test | PASS | `Test Files 33 passed (33)` / `Tests 174 passed (174)`，退出码 0（shared 2 + chapter-schema 18 + runtime-kernel 3 无回归 + chapter-compiler 10 文件全部通过） |

## Acceptance Results

| # | 结果 | 证据 |
|---|---|---|
| A01 | PASS | `pnpm install` 退出码 0（见 Tests Executed） |
| A02 | PASS | `pnpm typecheck` 退出码 0，全部四包通过；前置条件说明见 DECISIONS D10 |
| A03 | PASS | `pnpm lint` 退出码 0，0 error / 0 warning |
| A04 | PASS | `pnpm format:check` 退出码 0；语法错误 fixture 以 JSONC 形态兼容（D9） |
| A05 | PASS | `pnpm build` 退出码 0；`packages/chapter-compiler/dist/index.d.ts` 存在 |
| A06 | PASS | `pnpm test` 退出码 0：33 文件 / 174 断言，chapter-schema（18 文件）与 runtime-kernel（3 文件）既有测试无回归，chapter-compiler 10 个测试文件全部通过 |
| A07 | PASS | `dependencies` 恰为 `{ @interactive-story/chapter-schema, zod }`；zod 版本字符串与 chapter-schema 同为 `^4.4.3` |
| A08 | PASS | `packages/*` 恰为 shared / chapter-schema / runtime-kernel / chapter-compiler 四包（Test-Path 枚举） |
| A09 | PASS | `apps/`、`chapters/`、`assets/`、`scripts/`、`tools/` 均不存在（Test-Path = False） |
| A10 | PASS | `loadChapterPack` 对 `broken-json-syntax` 不抛异常，`issues` 恰含 1 条 `JSON_SYNTAX_ERROR`（loader.test.ts） |
| A11 | PASS | 19 个分类正例全部 PASS（valid-minimal，零失败）；14 子目录分类反例各 1 条 FAIL 且 issues 非空（broken-schema）；5 根文件反例各 1 条 FAIL（broken-roots）——pass1Schema.test.ts |
| A12 | PASS | 集合内 id 重复被拒绝（broken-id-duplicate → `scenes`）；`story.graph.json` 注册表重复（`storyGraph.nodes`）与跨类文件 id 冲突（`storyGraph.crossKind`）分别被拒绝，与集合内唯一互不混淆（broken-id-cross-kind + 分类断言）——pass1Uniqueness.test.ts |
| A13 | PASS | T007 八项检查每项 ≥1 正例（valid-minimal 零问题）+ ≥1 反例（broken-dangling-refs 逐类断言）——pass2StoryGraph.test.ts（11 用例） |
| A14 | PASS | T008 六项检查每项 ≥1 正反例；`mapsTo` 链式指向被拒绝（broken-dangling-refs）——pass2ActionChain.test.ts |
| A15 | PASS | T009 三项检查正反例；两跳 expression 校验在 characterId/characterAssetId 根因已报错时不重复报错（错误数量 + file 归属断言）——pass2NpcVisuals.test.ts |
| A16 | PASS | T010 两项检查正反例；interaction 缺失时 nextScene 约定检查跳过（不级联）——pass2BossRecovery.test.ts |
| A17 | PASS | `compile()` 对 valid-minimal 返回 `passed: true`；对 broken-composite 返回 `passed: false` 且四类 issue 数组均非空（loadIssues 恰 1 条 JSON_SYNTAX_ERROR）——compile.test.ts |
| A18 | PASS | PASS1 失败条目不产生级联引用错误：corrupt 的 recovery 条目（含悬空 actionId）失败后 `actionChain.recoveryActionId` 无输出；broken-schema 的失败文件不在任何引用 issue 的 file 中（A18 测试 + A17 测试） |
| A19 | PASS | grep：包内无 `existsSync`（loader 仅用 readFileSync/readdirSync 读 Chapter Pack 自身 JSON，属允许范围） |
| A20 | PASS | grep：包内无 `isReachable`/`detectCycle`/`simulate` 等图分析/仿真函数名 |
| A21 | PASS | grep：包内无 `runtime-kernel`/`@interactive-story/shared` 导入 |
| A22 | PASS | `package.json` 无 fast-glob/globby 等第三方 glob 依赖（grep + 文件检查） |
| A23 | PASS | `test-fixtures/` 位于 `packages/chapter-compiler/` 下而非 `chapters/`；含 README.md 自解释为纯测试数据 |
| A24 | PASS | `specs/dev/DEV-002/` 含 INDEX / REQUIREMENTS / ACCEPTANCE / REPORT（另含 DECISIONS）；INDEX.md 含原句 `OpenCode 禁止自行推进下一 DEV Node.`；T001–T013 全部勾选 |
| A25 | PASS | `git log` 新增恰 1 条提交，首行 `DEV-002: chapter compiler core (PASS 1+2)`；提交后 `git status --porcelain` 为空（详见下节 Known Issues #1 的 Commander 未提交治理文件说明，处理与 DEV-008 先例一致） |
| A26 | PASS | LEDGER 含 `OPENCODE → AUDITOR` 的 `NODE_REPORT-DEV-002` 记录（0024 行）；信封 `git_head` 与提交 sha 一致 |
| A27 | PASS | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**`、`packages/chapter-schema/**`、`packages/runtime-kernel/**`、`packages/shared/**` 未被 OPENCODE 修改：git diff 仅含 Commander 下发 DEV-002 时未单独提交的治理改动（会话开场 git status 快照留档，归因见 Known Issues #1），与 DEV-001/DEV-008 先例一致（消息 `0012`/`0020`） |

## Scope Deviations

NONE（实现范围严格限定 T001–T013；PASS 2 检查项与 Task Package T007–T010 逐条对应，
未实现 ADDENDUM 中未随 Task Package 下发的检查项——如 A9 assetId→ImageAsset、
A6/A7 StatePath 与 blockId 引用等，属后续节点职责）。

## Known Issues

1. **Commander 下发 DEV-002 时的治理文件未单独提交**（`specs/PROJECT_INDEX.md`、
   `specs/dev/DAG.md` 为 modified，`specs/tasks/TASK-PACKAGE-DEV-002.md` 与消息 `0023` 文件为
   untracked，均系 Commander 写入，OPENCODE 未改动——会话开场 git status 快照留档）。
   T013 按 `git add -A && git commit` 执行（Task Package T013 Requirement #4），Commander
   治理改动随本次提交入库，处理方式与 DEV-001（消息 `0012`）/DEV-008（消息 `0020`）先例一致，
   归因在提交 diff 中可见。
2. **`pnpm typecheck` 的前置依赖**：仓库首个跨包 project reference 使全新环境需先
   `pnpm build` 再 `pnpm typecheck`（TS 5.9 `tsc -b --noEmit` 行为，DECISIONS D10）；
   交付态工作区含完整构建产物，命令序列全部退出码 0。
3. 语法错误 fixture 以 JSONC（注释）形态提交以兼容 `format:check`（DECISIONS D9）——
   对 `JSON.parse` 仍为语法错误，Loader 用例语义不变。

## Blockers

NONE

## Future Considerations

- `runPass2` 的 `raw` 参数为 Outputs 签名兼容保留（D5），后续节点若需要基于 raw 的
  文件路径级检查可直接使用。
- `boss.interactionNextScene` 以 `ADVISORY` 级别报告（D7）；`compile().passed` 按 T011
  字面规则不区分严重度，下游若需"仅 BLOCKING 阻断"语义可在组装阶段自行过滤。
- 跨包 project reference 后 `tsc -b --noEmit` 在全新 clone 环境需先 build（D10）；
  未来若引入 CI，可在 CI 中调整命令顺序或改用 `tsc --noEmit -p` 逐包检查。
- 本节点不组装最终 Validated Runtime Bundle（Task Package 第 2 节跨节点开放问题）；
  `compile()` 返回的内存结果已含四类 issue 与 `passed`，供 DEV-072 等下游按需组合。
