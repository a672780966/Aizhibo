# DEV-060A REPORT

## 1. Status

READY_FOR_REVIEW

## 2. Implemented

T001–T003 全部完成（INDEX.md 勾选见第 6 节；本节点为 M6 第一个/
优先节点，CR-013 已把 DEV-060 拆为本节点 Operator API 与 DEV-060B
Console UI）。

**T002 — 基础原语（前序 dispatch 已建，本次随 T003 一并提交）：**

- `packages/ai-host/src/hostPermission.ts`（新增）：两值
  `HostPermissionState = 'ALLOWED' | 'MUTED'` +
  `createHostPermissionStore()`（默认 `'ALLOWED'`）。零依赖、无自动
  推导；不复用 egressGate.ts 三值 `HostPermission`（LIMITED 不在任何
  action 语义内，见 DECISIONS.md D4）。
- `packages/ai-host/src/index.ts`（追加一行 export
  `'./hostPermission.js'`，未改动既有行）。
- `packages/operator-api`（新包）：`operatorActions.ts`
  （`OperatorAction` 11 值 + `ALL_OPERATOR_ACTIONS` +
  `isOperatorAction`）、`operatorAuth.ts`（`OperatorAuthPort` +
  `noopOperatorAuthPort` + `createOperatorAuthProvider` +
  `createOptionalOperatorAuthProvider`，未配置默认**拒绝**）、
  `operatorOverrideLog.ts`（`appendOperatorOverrideEvent`，直接构造
  `RuntimeEvent` + `appendEvents` 旁路落库）。
- 根 `tsconfig.json` 追加一条 references；`pnpm-lock.yaml` 增加
  operator-api importer。

**T003 — dispatch + HTTP 端点 + 全量验证（本 dispatch 主体）：**

- `packages/operator-api/src/operatorDispatch.ts`（新增）：本地
  `HostPermissionPort` 结构类型（**不 import**
  `@interactive-story/ai-host`）、`OperatorDispatchDeps`、
  `NOT_WIRED_REASON`（类型为 `Record<Exclude<OperatorAction,
  'MUTE_HOST'|'UNMUTE_HOST'|'RESTORE_LKG'>, string>`，恰好 8 键，由
  TS 强制不多不少）、`dispatchOperatorAction`。
  - `MUTE_HOST`/`UNMUTE_HOST` → `hostPermission.setPermission`，
    `ok:true`；`RESTORE_LKG` → 先 `loadLatestSnapshot` 确认（无快照 →
    `ok:false` + 'no persisted snapshot found for this session'）再
    `restoreSession`；其余 8 个 → `ok:false` + `NOT_WIRED_REASON` 各自
    点名原因（见 DECISIONS.md D1）。
  - **关键不变式**：无论 `runAction` 返回 ok:true/false 都无条件追加
    一条 `OPERATOR_OVERRIDE` 事件（D2）。
- `packages/operator-api/src/operatorHttpServer.ts`（新增）：`node:http`
  原生实现 `createOperatorHttpServer`，单一路由 `POST /operator/action`；
  方法/路径错 → 404 → 鉴权 401 → 非法 JSON 400 → 未知 action 400 →
  200（响应体为 dispatch 返回值，ok 真假在 body 不在状态码，D5）。
- `packages/operator-api/src/index.ts`：5 行 barrel 导出（actions /
  auth / overrideLog / dispatch / httpServer）。
- `specs/dev/DEV-060A/DECISIONS.md`（新增，D1–D7）、`REPORT.md`
  （本文）、`INDEX.md`（T001–T003 勾选，Status → READY_FOR_REVIEW）。

## 3. Changed Files

新增：
- `packages/ai-host/src/hostPermission.ts`
- `packages/ai-host/src/hostPermission.test.ts`
- `packages/operator-api/package.json`
- `packages/operator-api/tsconfig.json`
- `packages/operator-api/src/index.ts`
- `packages/operator-api/src/operatorActions.ts`
- `packages/operator-api/src/operatorActions.test.ts`
- `packages/operator-api/src/operatorAuth.ts`
- `packages/operator-api/src/operatorAuth.test.ts`
- `packages/operator-api/src/operatorOverrideLog.ts`
- `packages/operator-api/src/operatorOverrideLog.test.ts`
- `packages/operator-api/src/operatorDispatch.ts`
- `packages/operator-api/src/operatorDispatch.test.ts`
- `packages/operator-api/src/operatorHttpServer.ts`
- `packages/operator-api/src/operatorHttpServer.test.ts`
- `specs/dev/DEV-060A/DECISIONS.md`

修改：
- `packages/ai-host/src/index.ts`（追加一行 export）
- `tsconfig.json`（根，追加 operator-api references）
- `pnpm-lock.yaml`（operator-api importer）
- `specs/dev/DEV-060A/INDEX.md`（T001–T003 勾选，Status →
  READY_FOR_REVIEW）
- `specs/dev/DEV-060A/REPORT.md`（本文）

## 4. Tests Executed

全部为 `pnpm <cmd>`，退出码逐一记录：

| # | 命令 | 退出码 |
|---|---|---|
| 1 | `pnpm install --frozen-lockfile` | 0 |
| 2 | `pnpm typecheck` | 0 |
| 3 | `pnpm lint` | 0 |
| 4 | `pnpm format:check` | 0 |
| 5 | `pnpm build` | 0 |
| 6 | `pnpm test` | 0 |

`pnpm test`：130 test files / 758 tests 全部通过（零回归；DEV-058
基线 124 files / 724 tests）。新增 6 个测试文件共 34 个测试
（724 → 758）：
`hostPermission.test.ts`（3）、`operatorActions.test.ts`（3）、
`operatorAuth.test.ts`（7）、`operatorOverrideLog.test.ts`（3）、
`operatorDispatch.test.ts`（10）、`operatorHttpServer.test.ts`（8）。

## 5. Acceptance Results

| # | 判定 | 结果 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | PASS（0） |
| A02 | `pnpm typecheck` 退出码 0（含新包 operator-api 真正被 tsc -b 构建） | PASS（0） |
| A03 | `pnpm lint` 退出码 0 | PASS（0） |
| A04 | `pnpm format:check` 退出码 0 | PASS（0） |
| A05 | `pnpm build` 退出码 0 | PASS（0） |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | PASS（0，130 files / 758 tests） |
| A07 | `createHostPermissionStore()` 默认 ALLOWED，setPermission 读写往返正确 | PASS（hostPermission.test.ts：默认 ALLOWED；set MUTED 后读回 MUTED；可切回 ALLOWED） |
| A08 | ALL_OPERATOR_ACTIONS 与第 53 节 11 action 集合相等；isOperatorAction 类型守卫正确 | PASS（operatorActions.test.ts：11 个全部为真、非法值拒绝、ALL 列表集合） |
| A09 | createOptionalOperatorAuthProvider 四种鉴权场景正确，未配置默认拒绝 | PASS（operatorAuth.test.ts：未配置→任意 token 拒绝；正确/错误/缺失 token 三态） |
| A10 | appendOperatorOverrideEvent 写 type/visibility/payload/sequence 递增正确，可被 loadEvents 读回 | PASS（operatorOverrideLog.test.ts：首条 sequence:1、HIDDEN、payload 含 action/detail、连续调用严格递增、loadEvents 读回） |
| A11 | dispatchOperatorAction 对 MUTE/UNMUTE/RESTORE_LKG（有快照与无快照）行为正确 | PASS（operatorDispatch.test.ts：MUTE/UNMUTE 经 fake port 记录状态；RESTORE_LKG 有快照 ok:true、无快照 ok:false + 'no persisted snapshot'） |
| A12 | dispatchOperatorAction 对其余 8 个 action 均 ok:false + 各自具体原因，不抛异常，无真实副作用 | PASS（operatorDispatch.test.ts：8 个逐一断言 ok:false + 各自点名 detail（6 个含 'RootEvent'、OBS/SAFETY 各自专属），8 条 detail 两两不同） |
| A13 | 对全部 11 个 action 逐一调用，每次产生恰好一条新 OPERATOR_OVERRIDE，sequence 跨 11 次严格递增无重复 | PASS（operatorDispatch.test.ts：ALL_OPERATOR_ACTIONS 逐一 dispatch，loadEvents 核实恰 1 条新增 + 严格递增） |
| A14 | createOperatorHttpServer 的 200/400/401/404 全路径（含鉴权未配置默认 401）均正确 | PASS（operatorHttpServer.test.ts：真实 port:0 server + fetch：200 正确 token / 401 缺失 / 401 错误 / 401 未配置默认拒绝 / 400 未知 action / 400 非法 JSON / 404 GET；另加 stub action 仍到 dispatch → 200 ok:false） |
| A15 | 未新增第三方 npm 依赖 | PASS（只用 node:http + 既有 workspace 包 persistence/runtime-kernel；package.json 无新第三方） |
| A16 | platform-core / platform-twitch / runtime-kernel / renderer / ai-host 既有 8 模块均未被修改 | PASS（git add 范围不含上述任何路径；runtime-kernel/persistence 只 import 未修改） |
| A17 | 未实现真实 SAFETY/OBS 逻辑；未新增 RootEvent 变体；未实现热替换进程机制 | PASS（8 个占位 action 无副作用；无 runtime-kernel 改动；RESTORE_LKG 止于重建+报告，见 DECISIONS.md D1/D7） |
| A18 | DECISIONS.md 存在，覆盖第 6 节全部要点 | PASS（D1–D7 对应第 6 节 7 个"为何"：不发 CR / 无条件记录 / 旁路非 RootEvent / 两值非三值 / node:http / Bearer 精确比较默认拒绝 / 重建非热替换） |
| A19 | 节点文档齐全，INDEX T001–T003 勾选，Status = READY_FOR_REVIEW | PASS |
| A20 | git log 新增恰 1 条提交，首行 `DEV-060A: operator API (11-action endpoint + auth + OPERATOR_OVERRIDE audit, honest stubs for 8 unbuilt targets)` | PASS |
| A21 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但未提交 | PASS（0286 NODE_REPORT 与 LEDGER 追加行已写入工作区未提交；见第 8 节） |
| A22 | PROJECT_INDEX / DAG / tasks / audit / protocol 均未被修改 | PASS（git add 范围不含上述任何路径） |

## 6. Scope Check

- Writable Scope：T002/T003 全部文件真实改动（新增 16 + 修改 5，
  见第 3 节）；`specs/dev/DEV-060A/` 下 INDEX / REPORT / DECISIONS
  更新或创建（REQUIREMENTS.md、ACCEPTANCE.md 由 T001 在 Commander
  dispatch 提交 dc45f50 中已存在，内容与 Task Package 一致，本次无
  需改动）。
- Read-only Scope：egressGate / commentPipeline / hostPersona /
  hostMood / hostScheduler / hostLLMProvider / hostTtsProvider /
  hostAvatar 八个 ai-host 模块零改动（本次甚至未触碰）；persistence
  与 runtime-kernel 只按既有导出 import（`loadLatestSnapshot` /
  `restoreSession` / `appendEvents` / `loadEvents` /
  `createRuntimeMachine` 等），未修改任何文件。
- Forbidden Scope：未修改 `platform-core/**`、`platform-twitch/**`、
  `runtime-kernel/**`、`renderer/**`；未实现任何真实 SAFETY/OBS
  逻辑；未新增 RootEvent 变体；未实现热替换机制；未新增第三方 npm
  依赖。commit 前工作区曾出现 ai-host 三个既有文件（commentPipeline/
  egressGate/hostScheduler）的 CRLF 幻影 M 标记——核实为 `.git/index`
  损坏（index 头声明 1565 条目但字节流在中途截断/错位）所致，`git
  read-tree HEAD` 重建 index 后幻影消失，三个文件内容与 HEAD 完全
  一致（blob hash 相同），**未**进入本次提交（同 DEV-058 审计
  Minor/Info 先例，CRLF/工作区标记非本次改动）。

## 7. Commit

恰 1 条提交，首行：`DEV-060A: operator API (11-action endpoint + auth + OPERATOR_OVERRIDE audit, honest stubs for 8 unbuilt targets)`

`git add` 仅含：`packages/ai-host/src/hostPermission.ts`、
`packages/ai-host/src/hostPermission.test.ts`、
`packages/ai-host/src/index.ts`、
`packages/operator-api/`（16 个文件：package.json / tsconfig.json /
src/index.ts / src/operator{Actions,Auth,OverrideLog,Dispatch,
HttpServer}.ts 与对应 .test.ts，不含 dist / node_modules /
tsconfig.tsbuildinfo）、根 `tsconfig.json`、`pnpm-lock.yaml`、
`specs/dev/DEV-060A/{INDEX,REPORT,DECISIONS}.md`（不使用 `git add -A`
/ `git add .`）。

## 8. Handoff

- 节点产出：两值 HostPermissionStore + 新包 operator-api（11 个
  action 的 dispatch 入口 + 单路由 HTTP 端点 + Bearer 鉴权 +
  OPERATOR_OVERRIDE 无条件审计落库；8 个目标不存在的 action 诚实
  占位）+ 34 项单测，已随恰 1 条提交入库。
- 按任务指令，本次实现提交本身**不含** `specs/comms/LEDGER.md` 或
  `specs/comms/NNNN-OPENCODE-to-*.md` 消息文件的提交；对应 `0286`
  NODE_REPORT 与 LEDGER 追加行已写入工作区但未提交（msg_id 取当前
  LEDGER 最大序号 0285 + 1）。
- 验证六条命令全部退出码 0；`git log` 新增恰 1 条提交。
- 未推进到任何下一 DEV Node（M6 后续节点由 Commander 裁决）。
