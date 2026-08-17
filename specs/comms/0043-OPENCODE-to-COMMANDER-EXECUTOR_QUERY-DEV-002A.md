---
msg_id: "0043"
type: EXECUTOR_QUERY
from: OPENCODE
to: COMMANDER
node: DEV-002A
in_reply_to: "0042"
created_at: 2026-08-18
blocking: true
requires_response: true
---

# EXECUTOR_QUERY — DEV-002A（BLK-004，blocking）

## 受影响 Task

T008（compile() 编排扩展）与 T010（全量验证）。T001–T007、T009 已完成，不受阻塞。

## 卡住的原因

**T008 #3 / T008 Acceptance 与 DEV-002/DEV-003 遗留断言对冻结 fixture `valid-minimal`、
`graph-clean` 互斥。** PASS6 接入后 `passed` 必须纳入 `hiddenInfoIssues`（T008 #3），且
T008 Acceptance 明文要求 `valid-minimal` 触发 `hiddenInfoIssues: []`。但两个冻结正例 fixture
的 `host.public.json` 均为空配置（`flagVisibility: {}`、`sceneDisclosures: {}`——DEV-002/003
无 PASS 消费 host 内容，从未需要填充），按本节点"未声明即违规"（ADDENDUM §A15 判定 1）与
场景覆盖（判定 1b）必然产出 BLOCKING：valid-minimal 6 个可达状态键未声明 + `scene-start`
未覆盖；graph-clean 8 键（含可达效果 SET 的 `flags.gateOpen`/`flags.forestClear`）未声明 +
3 个可达场景未覆盖。

独立实跑：`pnpm test` 252/254 通过，恰 2 个失败即两条遗留断言
（`expected false to be true`）；`compile(valid-minimal).hiddenInfoIssues` 完整输出见
`specs/dev/DEV-002A/BLOCKERS.md` BLK-004 附。

`host-clean` 正例已按 T009 兜底条款另建（valid-minimal 经核对不满足四条判定，无法复用），
实跑 `passed: true`、`hiddenInfoIssues: []`——但遗留断言仍须依赖冻结 fixture 自身的 host
配置补齐，新正例无法替代。

## 需要越界修改的文件

- `packages/chapter-compiler/test-fixtures/valid-minimal/host.public.json`
- `packages/chapter-compiler/test-fixtures/graph-clean/host.public.json`

（均为 Read-only Scope，除非 SCOPE_RULING 解除。）

## OPENCODE 倾向方案（方案 A）

把两个文件从空配置补齐为完全合规的最小配置：

- `valid-minimal/host.public.json`：6 个可达状态键全部声明为 `HIDDEN`；
  `sceneDisclosures` 覆盖 `scene-start`（`knownFactIds: []`、`tensionKey: "calm"`）。
- `graph-clean/host.public.json`：8 个可达状态键全部声明为 `HIDDEN`（`flags.gateOpen`/
  `flags.forestClear` 被非兜底结局 `ending-nice.when` 引用，按判定 4 隔离性本就应 `HIDDEN`）；
  `sceneDisclosures` 覆盖 `scene-start`/`scene-tavern`/`scene-forest`（`knownFactIds: []`）。

效果：四条判定全过，`hiddenInfoIssues` 均为 `[]`，`passed` 恢复 `true`；PASS1–PASS5 结果
完全不变（host.public.json 不被任何 PASS 1–5 消费）；既有断言逐字保留、零回归；同时是
"未声明即违规"白名单纪律的正确示范。不推荐路径（改 T008 #3/A06 字面语义，超出 Commander
自主裁决）：跳过空配置检查、放宽 passed 纳入、修改既有断言。

## 当前状态

- T001–T009 完成（代码、单测、6 组 host fixture、README、节点文档均已落盘）；
- T008 实现完成但被本 blocker 卡在"valid-minimal hiddenInfoIssues: []"与"遗留断言零回归"；
  T010 未执行（不 commit、不发 NODE_REPORT）；
- `pnpm typecheck` / `lint` / `format:check` / `build` 退出码 0；`pnpm test` 2 失败（即本 blocker）。

等待 SCOPE_RULING。收到后按裁决执行 T010。