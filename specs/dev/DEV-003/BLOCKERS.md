# DEV-003 BLOCKERS

## BLK-003 — PASS3 接入后，冻结的 `valid-minimal` 无法保持 `passed: true`（A06 无回归 与 T007 passed 判定互斥）

Status: **CLOSED**（SCOPE_RULING 消息 `0038`，技术性 FIX）
Raised at: 2026-08-18
Closed at: 2026-08-18
Closed by: COMMANDER（裁决）+ OPENCODE（执行）
Referenced by: 消息 `0037`（EXECUTOR_QUERY，blocking: true）→ `0038`（SCOPE_RULING）

### 受影响 Task

T007（compile() 编排扩展，其 Acceptance 含"A06 遗留断言零回归"）与 T009（全量验证）。
T001–T006、T008 已完成且不受阻塞。

### 事实

1. **Task Package T007 #3 明文要求**：`passed` 判定追加 `&& graphIssues.length === 0 && stateIssues.length === 0`（A15 同）。
2. **DEV-002 遗留断言不变**（T007：不得删除或修改；A06：无回归）：`compile('valid-minimal')` 必须返回 `passed: true`。
3. 本节点按 T002 规则构建的图模型中，**`valid-minimal` 的 `boss-tyrant` 不可达**（已独立复现）：

   - `scene-start` 的出边：`next → ending-end`、`guards[0].goto → ending-end`、`interactionId → interaction-01.nextScene → ending-end`；
   - `boss-tyrant` 的唯一入边是 `interaction-boss.nextScene → boss-tyrant`——那是 Boss 相位内部交互的自回边，只有身处 Boss 之后才存在；
   - 结论：入口可达集合 = {scene-start, ending-end}，`boss-tyrant` 属于 `unreachableBosses` → `graphIssues` 至少含 1 条 `UNREACHABLE_BOSS` → `passed` 按 T007 规则应当为 `false`。

4. 独立实跑（本会话，接入 PASS3 后）：`pnpm test` 218/219 通过，唯一失败即 DEV-002 遗留断言
   `returns passed: true for the valid fixture`（`expected false to be true`），
   `compile(valid-minimal).graphIssues` 输出为：

   ```
   [
     { category: 'UNREACHABLE_NODE', severity: 'BLOCKING', message: 'node "boss-tyrant" is not reachable from the entry node', file: 'boss/boss-tyrant.json' },
     { category: 'UNREACHABLE_BOSS', severity: 'BLOCKING', message: 'boss "boss-tyrant" is not reachable from the entry node', file: 'boss/boss-tyrant.json' }
   ]
   ```

5. 另注：消息 `0036` 修订 3 对 `graph-clean` 的指引假定 `valid-minimal` 自身已满足"无死路、无不可达、
   Ending/Boss 均可达"。该前提经核对为**不成立**（见第 3 点逐边分析）——因此按 `0036` 自身的条件
   （"若不满足则新建"），已另建 `graph-clean` fixture 作为正例，其 `compile()` 返回 `passed: true`、
   图/状态 issue 均为空（已实跑确认）。

### 约束

- `valid-minimal/**` 属本节点 Read-only Scope（git diff 必须为空），OPENCODE 不得自行修改；
- T007 禁止删除或修改 DEV-002 既有断言；
- 本 blocker 之外的一切验收项（A01–A05、A07–A24，除 A06 的该条断言外）均不受影响。

### OPENCODE 倾向方案（唯一最小改动路径）

**方案 A：SCOPE_RULING 解除 `valid-minimal/scenes/scene-start.json` 的只读约束，允许追加一条
guard 边**：在 `scene-start.guards` 数组追加
`{ when: { path: { container: 'flags', key: 'bossStart' }, op: 'EXISTS' }, goto: 'boss-tyrant', priority: 2 }`
（或等价的 `next` 之外的任何一条 `scene-start → boss-tyrant` 边）。效果：

- 入口可达集合扩为 {scene-start, boss-tyrant, ending-end}，`graphIssues` 为空，`passed` 恢复 `true`；
- PASS1/PASS2 结果完全不变（`guard.goto` 指向已注册节点，不产生任何 schema/引用错误）；
- DEV-002 全部既有断言逐字通过，零回归，测试文件零改动；
- 对既有 PASS1/2 的行为零影响（本条 guard 仅增加一条图边）。

该改动是唯一能同时满足"A06 无回归"与"T007 passed 判定"的路径。**不推荐**替代方案：放宽
`passed` 对 graphIssues 的判定（违反 T007 #3/A15，属 Acceptance 变更，且 `0036` 已声明
A01–A24 不变）；或将 valid-minimal 的回归豁免写进测试（违反 A06"全部断言无回归"，且测试文件
禁改）；或把 `unreachableBoss` 降级为 ADVISORY 不进 `passed`（同样违反 T007 #3 的字面要求）。

### 解除条件

收到 `SCOPE_RULING` 后：若批准方案 A，按裁决修改唯一文件，重跑六条命令（预期全绿），继续
T009（INDEX/REPORT/NODE_REPORT/commit）。若裁决为其它路径，按裁决执行。

### 结案（2026-08-18，消息 `0038`）

Commander 裁决采纳方案 A：认定 `boss-tyrant` 不可达是**先于 DEV-003 存在的 fixture 图设计缺陷**
（PASS3 使其可见，非判定逻辑问题），解除 `valid-minimal/scenes/scene-start.json` 单文件只读
限制，授权在 `guards` 追加一条 `scene-start → boss-tyrant` 边；不改动任何 Acceptance 语义。
OPENCODE 按裁决执行：唯一改动为该文件 `guards` 数组追加一条 guard（`flags.bossStart EXISTS`，
`priority: 2`）。清空构建产物后严格顺序六条命令全部退出码 0，`pnpm test` 219/219 全绿
（DEV-002 遗留断言零回归）。BLK-003 结案。

## 历史

- BLK-001（CLOSED）、BLK-002（CLOSED）：见 `specs/BLOCKERS.md`（Commander 维护）。