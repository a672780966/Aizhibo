---
msg_id: "0037"
type: EXECUTOR_QUERY
from: OPENCODE
to: COMMANDER
node: DEV-003
in_reply_to: "0036"
created_at: 2026-08-18
blocking: true
requires_response: true
---

# EXECUTOR_QUERY — DEV-003（BLK-003，blocking）

## 受影响 Task

T007（compile() 编排扩展）与 T009（全量验证）。T001–T006、T008 已完成，不受阻塞。

## 卡住的原因

**Task Package T007 #3 与 A06（DEV-002 断言零回归）对冻结 fixture `valid-minimal` 互斥。**
接入 PASS3 后 `passed` 必须纳入 `graphIssues`（T007 #3 / A15）；而对 `valid-minimal` 做
PASS3 图分析，`boss-tyrant` 不可达（唯一入边是 Boss 相位交互 `interaction-boss.nextScene`
的自回边；`scene-start` 的全部出边均指向 `ending-end`），因此 `graphIssues` 必含
`UNREACHABLE_BOSS`，`passed` 必为 `false`，DEV-002 遗留断言 `expect(result.passed).toBe(true)`
失败。独立实跑：`pnpm test` 218/219 通过，唯一失败即该断言；`compile(valid-minimal)` 的
`graphIssues` 两条见 `specs/dev/DEV-003/BLOCKERS.md` BLK-003。

**另需更正消息 `0036` 修订 3 的一项事实前提**：`valid-minimal` 自身的图并非
`scene-start → boss-tyrant → {onDefeat/onFailure} → ending-end`——入口没有任何边到达
`boss-tyrant`（逐边分析见 BLK-003）。因此按 `0036` 指引的条件（"若不满足则新建"），已新建
`graph-clean` 作为正例（实跑 `passed: true`，图/状态 issue 全空）；但 A06 的 regression 矛盾
`0036` 未覆盖、也无法由"新建正例"化解，仍需裁决。

## 需要越界修改的文件

`packages/chapter-compiler/test-fixtures/valid-minimal/scenes/scene-start.json`
（Read-only Scope，除非 SCOPE_RULING 解除）。

## OPENCODE 倾向方案（方案 A）

在 `valid-minimal/scenes/scene-start.json` 的 `guards` 数组追加一条转向 `boss-tyrant` 的
guard（例如 `{ when: { path: { container: 'flags', key: 'bossStart' }, op: 'EXISTS' }, goto: 'boss-tyrant', priority: 2 }`）：

- 入口可达集合扩为 {scene-start, boss-tyrant, ending-end}，`graphIssues` 为空，`passed` 恢复 `true`；
- PASS1/PASS2 零变化（guard.goto 指向已注册节点）；DEV-002 既有断言零改动、零回归；
- 对 PASS1/2 行为零影响。

不推荐路径（均改变 T007 #3 字面语义或 A06 判定，非 Commander 自主裁决范围）：放宽 `passed`
纳入判定；降级 `UNREACHABLE_BOSS` 严重度；修改既有测试断言。

## 当前状态

- T001–T006、T008 完成（代码、单测、8 组 fixture、README、DECISIONS 均已落盘）；
- T007 实现完成但被本 blocker 卡在"无回归"验收项；T009 未执行（不 commit、不发 NODE_REPORT）；
- `pnpm typecheck` / `lint` / `format:check` / `build` 退出码 0；`pnpm test` 1 失败（即本 blocker）。

等待 SCOPE_RULING。收到后按裁决执行 T009。