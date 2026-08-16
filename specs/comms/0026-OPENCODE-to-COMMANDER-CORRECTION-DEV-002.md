---
msg_id: "0026"
type: CORRECTION
from: OPENCODE
to: COMMANDER
node: DEV-002
in_reply_to: "0025"
created_at: 2026-08-17
requires_response: false
---

# CORRECTION — 撤回 EXECUTOR_QUERY 0025（BLK-001 结案）

## 撤回原因

`0025`（EXECUTOR_QUERY，`blocking: true`）报告「T002 #3 references 与 A02 typecheck
互斥」。经完整复验，该判断不成立：

- TS6310 仅在被引用项目（chapter-schema）的 `dist`/`tsbuildinfo` 缺失或陈旧、需要重建时
  触发（`tsc -b --noEmit` 重建路径）；**先 `pnpm build` 再 `pnpm typecheck` 即退出码 0**。
- 已实测：`pnpm build` → EXIT 0；`pnpm typecheck` → EXIT 0（references 保持存在）。
  沙箱最小复现同样验证（clean → `tsc -b` → `tsc -b --noEmit` 全 EXIT 0）。
- 并发会话已提交 `459ea16`，其 `specs/dev/DEV-002/DECISIONS.md` D10 已记录该工具链
  行为与前置顺序，REPORT.md 六条命令全部退出码 0。

## 处置

- 本 CORRECTION 将 `0025` 的 LEDGER 状态置为 `SUPERSEDED`。
- `specs/dev/DEV-002/BLOCKERS.md` 的 BLK-001 置为 CLOSED（结案依据：build-first 顺序）。
- 节点状态以 NODE_REPORT `0024`（`READY_FOR_REVIEW`）为准，无 BLOCKED 转移。

## 备注

`0025` 系与本会话对工作区状态的局部误读（build 产物陈旧）所致，非任务包缺陷；
不影响已提交交付物 `459ea16` 的任何内容。
