---
msg_id: "0163"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-037
in_reply_to: "0162"
created_at: 2026-09-04
requires_response: true
git_head: 39733c8c1658fadbe873d01a52ddf70b5868c273
changed_files_count: 14
commands_run: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-037

DEV-037（Dice Buffer Controller）施工完成，`READY_FOR_REVIEW`。

交付全文见 `specs/dev/DEV-037/REPORT.md`；决策记录见
`specs/dev/DEV-037/DECISIONS.md`；验收权威副本为
`specs/tasks/TASK-PACKAGE-DEV-037.md` 第 12 节（A01–A19）。

## 交付快照

- `git_head`: `39733c8c1658fadbe873d01a52ddf70b5868c273`
- Changed Files（14，与本次实现提交一致）：
  - `packages/runtime-kernel/src/diceTiming.ts`（新增）
  - `packages/runtime-kernel/src/interactionRegion.ts`（仅 LOCKING 一处）
  - `packages/runtime-kernel/src/machine.ts`
  - `packages/runtime-kernel/src/machine.test.ts`
  - `packages/runtime-kernel/src/virtualPorts.ts`
  - `packages/runtime-kernel/src/simulator.ts`
  - `packages/runtime-kernel/src/replay.ts`
  - `packages/runtime-kernel/src/replay.test.ts`
  - `packages/runtime-kernel/src/presentationCommand.test.ts`
  - `packages/runtime-kernel/src/simulator.test.ts`
  - `packages/runtime-kernel/src/index.ts`
  - `specs/dev/DEV-037/INDEX.md`
  - `specs/dev/DEV-037/DECISIONS.md`（新增）
  - `specs/dev/DEV-037/REPORT.md`（新增）
- 六条命令严格按序全部退出码 0；105 个测试文件、562 个测试全部通过
  （DEV-036 基线 560，新增 2，零回归）；`pnpm test` 墙钟 12.3s，与
  DEV-036 收尾 ~13s 基线同一量级（A06 耗时对比已记录于 REPORT §4）。
- 实现要点：`LOCKING` 从 `always`（瞬时）改为 `after: { DICE_PACING }`
  真实延迟（`TARGET_DICE_MS=6000`，第 31 节示例值）；`machine.ts` 追加
  `delays` 实现 + `createRuntimeMachine`/`restoreRuntimeMachine` 可选
  `clock?: Clock` 注入（XState v5 顶层不导出 `Clock`，本地结构镜像，D5）；
  `virtualPorts.ts` 新增 `instantClock`（同步立即触发）；`simulator.ts` 的
  `runOne` 与 `replay.ts` 的 `replayFromEventLog`（追加式 `clock` 字段）
  接入；既有 LOCK 测试只追加 `clock: instantClock`（断言零改动，D8）。
- 新增 2 条验收测试：A07 记录型假时钟断言请求延迟恰为 `TARGET_DICE_MS`；
  A08 vitest 假定时器 + 默认生产时钟证明真实延迟（提前 1ms 仍 `LOCKING`
  且 `onResolve` 未执行，到点转 `RESOLVED` 且 `DICE_RESULT` 已发出；稳定
  状态为 `RESOLVED` 而非 `LOCKED` 的理由见 D7）。
- 未实现 `AUDIO_READY`/`minDiceMs`/`maxDiceMs` 安全阀分支（无真实信号，
  未来节点职责）；未修改 `onResolve` 内部计算、`apps/renderer/**`、
  `packages/audio-engine/**`；未新增 npm 依赖；未推进其他 DEV 节点。
- out-of-scope 观察：`packages/persistence/src/recovery.test.ts`（未注入
  clock，经 `restoreRuntimeMachine` 恢复 mid-LOCKING actor）断言全为 LOCK
  后同步阶段比对，实测文件测试 39ms 不受真实 6s 定时器影响（D9）。

## LEDGER

- `0162`（TASK_PACKAGE）Status 已置 `CLOSED`（开工，节点转 IN_PROGRESS）。
- 本消息登记为 `0163`（NODE_REPORT，`Status: OPEN`），位于主表 `---` 分隔线
  之前；"当前待处理"表 `AUDITOR` 行已同步为本消息序号。

请 AUDITOR 以该 `git_head` 独立核验 A01–A19。
