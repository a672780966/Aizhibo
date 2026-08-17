# test-fixtures

本目录是 `packages/chapter-compiler` 的单元测试数据，**不是真实产品内容**。

- `valid-minimal/` — 最小但覆盖全部 19 个内容分类的合法 Chapter Pack（供正例与 `compile()`
  `passed: true` 断言使用）。
- `broken-*/` — 针对性损坏 fixture，每个目录对应一类主要失败模式：
  - `broken-json-syntax/` — `manifest.json` 含 JSON 语法错误（Loader 测试）
  - `broken-missing-root/` — 缺少 `manifest.json` 根文件（Loader 测试）
  - `broken-roots/` — 五个根文件各自 schema 非法（PASS 1 测试）
  - `broken-schema/` — 14 个子目录各含一条非法条目（PASS 1 测试）
  - `broken-id-duplicate/` — 同分类 id 重复（PASS 1 唯一性测试）
  - `broken-id-cross-kind/` — scene/boss 跨类 id 冲突 + 故事图注册表 id 重复（PASS 1 唯一性测试）
  - `broken-dangling-refs/` — PASS 2 全部引用检查的反例（T007–T010 测试）
  - `broken-composite/` — 四类 issue 同时存在（compile() 综合断言）

任何内容均不代表真实章节产品数据，纯测试用途。

- `graph-clean/` — PASS 3/5 正例：入口 → 酒馆 → 森林的循环带两条逃逸边（守卫 goto），Boss 与
  两个 Ending（一兜底一条件，`flags.gateOpen EQ true` 由可达效果 SET 产生）均可达，
  `compile()` 期望 `passed: true`，`graphIssues`/`stateIssues` 均为空（DEV-003 T007/T008）。
- `graph-dead-end/` — 一个可达的非 Ending 场景没有任何出边（无 `next`/`guards`/`interactionId`），
  其余节点均可达 ⇒ 仅 `DEAD_END`（T003）。
- `graph-unreachable-scene/` — `story.graph.json` 注册的 `scene-lost` 无任何入边 ⇒ 仅
  `UNREACHABLE_NODE`（T003）。
- `graph-unreachable-ending/` — 非兜底 Ending `ending-lost` 无任何入边 ⇒ 仅
  `UNREACHABLE_ENDING`（T003，ADDENDUM §A12 所有 Ending 必须可达）。
- `graph-unreachable-boss/` — Boss `boss-lost` 无任何入边 ⇒ 仅 `UNREACHABLE_BOSS`（T003）。
- `graph-trap-cycle/` — 场景 A ↔ B 互指、无任何出循环的边（入口可到达）⇒ `TRAP_CYCLE`（T004）。
- `state-unsatisfiable-ending/` — 非兜底 Ending `ending-unsat` 的 `when` 引用 `flags.macguffin`，
  该键从未被任何可达 effect 或 `initial.state.json` 声明 ⇒ `UNSATISFIABLE_ENDING`（T006）。
- `state-unsatisfiable-recovery/` — `world.rules.json` 的 `downedPolicy = REQUIRE_RECOVERY`，
  唯一的 recovery 规则（scope ALL_DOWNED）是 STATE 触发器且引用从未声明的键 ⇒
  `UNSATISFIABLE_RECOVERY`（T006，ADDENDUM §A13）。

新增目录均由 `valid-minimal` 复制后做针对性编辑（DEV-003 消息 `0036` 修订 3），与既有
`broken-*`/`valid-minimal` 命名前缀区分，且各自通过 PASS1+PASS2（无 schema/引用错误混入）。
