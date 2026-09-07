---
msg_id: "0286"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-060A
in_reply_to: "0285"
created_at: 2026-09-07
requires_response: true
git_head: c076b44
changed_files_count: 21
commands_run: [pnpm install --frozen-lockfile, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-060A

DEV-060A（Operator API，M6 第一个/优先节点，CR-013 拆分）T001–T003
施工完成，`READY_FOR_REVIEW`。

交付全文见 `specs/dev/DEV-060A/REPORT.md`；决策记录见
`specs/dev/DEV-060A/DECISIONS.md`（D1–D7）；验收权威副本为
`specs/tasks/TASK-PACKAGE-DEV-060A.md` 第 12 节（A01–A22，节点
`ACCEPTANCE.md` 逐行一致）。

## 交付快照

- `git_head`: c076b44
- Changed Files（21，与实现提交一致）：
  - `packages/ai-host/src/hostPermission.ts`（新增：两值
    `HostPermissionState = 'ALLOWED' | 'MUTED'` +
    `createHostPermissionStore()` 默认 ALLOWED；不复用 egressGate
    三值 HostPermission，LIMITED 不在任何 action 语义内）
  - `packages/ai-host/src/hostPermission.test.ts`（新增，3 测试）
  - `packages/ai-host/src/index.ts`（追加一行 export hostPermission）
  - `packages/operator-api/package.json` + `tsconfig.json` + `src/index.ts`
    （5 行 barrel）+ `src/operator{Actions,Auth,OverrideLog,Dispatch,
    HttpServer}.ts` 与对应 `.test.ts`（共 16 个包内文件）
  - 根 `tsconfig.json`（追加 operator-api references）、`pnpm-lock.yaml`
  - `specs/dev/DEV-060A/{INDEX,REPORT,DECISIONS}.md`（INDEX T001–T003
    勾选 + Status → READY_FOR_REVIEW）

## 功能要点

- 11 个 action 中只有 MUTE_HOST / UNMUTE_HOST / RESTORE_LKG 三个有
  真实可调用目标：前两者经本地 `HostPermissionPort` 结构类型
  （**不 import** @interactive-story/ai-host）调 `setPermission`；
  RESTORE_LKG 先 `loadLatestSnapshot` 确认再 `restoreSession`（无快照
  → ok:false 'no persisted snapshot found for this session'）。
- 其余 8 个 action 目标子系统不存在（runtime-kernel 冻结、RootEvent
  无对应变体；OBS/SAFETY 占位或零代码），按 USER 2026-09-07 裁决诚实
  占位：`NOT_WIRED_REASON` 类型写成 `Record<Exclude<OperatorAction,
  'MUTE_HOST'|'UNMUTE_HOST'|'RESTORE_LKG'>, string>`（TS 强制恰好 8 键），
  逐条点名原因——6 个注明 "requires a new <ACTION> RootEvent on the
  frozen runtime-kernel machine; deferred pending future CR"，
  SWITCH_OBS_FAILOVER 注明 "OBS integration not yet built (planned
  DEV-064/DEV-065)"，EMERGENCY_STOP 注明 "SAFETY region not yet built
  beyond placeholder (planned DEV-063/DEV-067)"。不发 CR、无真实副作用。
- **关键不变式**：`dispatchOperatorAction` 无论 runAction 返回 ok:true
  /false 都无条件追加一条 OPERATOR_OVERRIDE 审计事件——审计覆盖"尝试
  执行"本身（A13 对全部 11 个 action 逐一验证恰好一条新事件 +
  sequence 严格递增）。
- `operatorHttpServer.ts`：node:http 原生、单路由 POST /operator/action、
  Bearer 精确比较、未配置 token 默认**拒绝**（401 不退化为放行）；
  404（方法/路径）/401（鉴权）/400（非法 JSON、未知 action）/200
  （响应体 ok 真假在 body 不在状态码）。
- 测试新增 6 文件 34 测试（724 → 758）：hostPermission 3 /
  operatorActions 3 / operatorAuth 7 / operatorOverrideLog 3 /
  operatorDispatch 10 / operatorHttpServer 8（真实 port:0 server +
  fetch 全路径 200/401×3/400×2/404 + stub action 到 dispatch 200
  ok:false）。

六条命令全部退出码 0：`pnpm install --frozen-lockfile`、`pnpm
typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm
test`（130 files / 758 tests 全部通过，零回归）。

Forbidden Scope 核实：`platform-core/**`、`platform-twitch/**`、
`runtime-kernel/**`、`renderer/**`、ai-host 既有八个模块
（egressGate/commentPipeline/hostPersona/hostMood/hostScheduler/
hostLLMProvider/hostTtsProvider/hostAvatar）均零改动；persistence /
runtime-kernel 只按既有导出 import 未修改。commit 前工作区三个 ai-host
既有文件的 CRLF 幻影 M 标记核实为 `.git/index` 损坏所致，`git
read-tree HEAD` 重建 index 后消失，三文件内容与 HEAD 完全一致，未进入
提交（同 DEV-058 审计 Info 先例）。

DECISIONS.md（D1–D7）已随实现提交入库，覆盖 Task Package 第 6 节
全部 7 个"为何"要点。
