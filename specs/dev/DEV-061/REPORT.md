# DEV-061 REPORT

## 1. Status

READY_FOR_REVIEW

## 2. Implemented

T001–T002 全部完成（本节点为 M6 第二个节点，Health System）。Dev
Spec 第 61 节本身零正文，唯一权威范围来自 `specs/dev/DAG.md` 第
399 行"采集聚合"四字：把已分散在各冻结模块里的 `Health` 结果收
拢成一个统一的聚合视图。T001 的四份节点文档由 Commander 的
dispatch 提交（8604865）建立，内容与 Task Package 一致，本次逐字
核对确认，未改动。

**T002 — `packages/health-registry`（新包，本次提交主体）：**

- `package.json`：以 `packages/host-memory/package.json` 为模板，
  name 为 `@interactive-story/health-registry`，**单一**依赖
  `@interactive-story/shared: workspace:*`（只消费 DEV-000 冻结的
  `Health` 类型）。
- `tsconfig.json`：以 host-memory 为模板（extends
  `../../tsconfig.base.json`，outDir dist / rootDir src，include
  `src/**/*`）。
- `src/healthRegistry.ts`：
  - `HealthSource`（`name: string` + `getHealth(): Health |
    Promise<Health>`）——同一接口同时容纳仓库里真实的同步实现
    （persistence / host-memory / platform-twitch EventSubClient）
    与异步实现（ai-host HostLLMProvider / HostTtsProvider），不改
    任何已冻结模块（D3）。
  - `AggregateStatus`（`'OK' | 'DEGRADED' | 'DOWN'`，与 `Health`
    的 status 字段同值）、`AggregateHealth`（`overall` +
    `sources: Record<string, Health>`）、`HealthRegistry`
    （`register` / `getAggregateHealth`）。
  - 内部 `STATUS_RANK` 查找表：OK=0 / DEGRADED=1 / DOWN=2（未导
    出）。
  - `createHealthRegistry()`：闭包内私有 `Map<string, HealthSource>`
    （不暴露）；`register` 按 name 覆盖式登记（同名二次 register
    后者整体替换前者，无历史）；`getAggregateHealth()` async：逐
    个 `await source.getHealth()`（同步/异步统一），把返回值原样存
    进 `sources`（字段透传，不裁剪不改写），用 STATUS_RANK 比较更
    新 `worst`，返回 `{ overall: worst, sources }`；空 registry 循
    环不执行，返回 `{ overall: 'OK', sources: {} }`。
- `src/index.ts`：一行 barrel：`export * from
  './healthRegistry.js'`。
- `src/healthRegistry.test.ts`：7 个独立测试用例（见第 4 节测试
  计数与 A07–A12 逐条）。
- 根 `tsconfig.json`：references 数组末尾（operator-api 之后）追加
  `{ "path": "./packages/health-registry" }`，使 `tsc -b` 真正构建
  新包。
- `pnpm-lock.yaml`：新增 health-registry importer（首次
  `--frozen-lockfile` 因 lockfile 未含新包 specifier 失败，按任务
  指令跑一次普通 `pnpm install` 更新后复跑 frozen 通过）。

**未做（按 Task Package 明示）：** 不硬编码接入 6 个真实
getHealth 来源（D1）、不新建任何 HTTP 端点（D4）、零第三方依赖、
零其他包改动。

## 3. Changed Files

新增：
- `packages/health-registry/package.json`
- `packages/health-registry/tsconfig.json`
- `packages/health-registry/src/index.ts`
- `packages/health-registry/src/healthRegistry.ts`
- `packages/health-registry/src/healthRegistry.test.ts`
- `specs/dev/DEV-061/DECISIONS.md`

修改：
- `tsconfig.json`（根，references 追加 health-registry 一条）
- `pnpm-lock.yaml`（health-registry importer）
- `specs/dev/DEV-061/INDEX.md`（T001–T002 勾选，Status →
  READY_FOR_REVIEW）
- `specs/dev/DEV-061/REPORT.md`（本文）

T001 四份节点文档（INDEX/REQUIREMENTS/ACCEPTANCE/REPORT）来自
Commander dispatch 提交，本次仅更新 INDEX.md 与填写 REPORT.md；
REQUIREMENTS.md / ACCEPTANCE.md 内容与 Task Package 核对一致，
无需改动。

## 4. Tests Executed

全部为 `pnpm <cmd>`，退出码逐一记录：

| # | 命令 | 退出码 |
|---|---|---|
| 1 | `pnpm install --frozen-lockfile` | 0（首次因 lockfile 未含新包失败，跑一次 `pnpm install` 更新后复跑通过） |
| 2 | `pnpm typecheck` | 0 |
| 3 | `pnpm lint` | 0 |
| 4 | `pnpm format:check` | 0 |
| 5 | `pnpm build` | 0 |
| 6 | `pnpm test` | 0 |

`pnpm test`：131 test files / 765 tests 全部通过（零回归；DEV-060A
基线 130 files / 758 tests）。新增 1 个测试文件 7 个测试
（758 → 765）：`healthRegistry.test.ts`（7），用例清单：
（1）空 registry → `{ overall: 'OK', sources: {} }`；
（2）单同步 OK 来源 → overall 'OK' + sources 单条；
（3）单同步 DOWN 来源（带 error）→ overall 'DOWN' + error 字段原
样保留（透传证明）；
（4）三来源 OK+DEGRADED+DOWN → overall 'DOWN'，三者都在 sources
各自名下；
（5）两来源 OK+DEGRADED → overall 'DEGRADED'；
（6）同名 'db' 二次 register（第二个返回不同 Health）→ 只反映第
二次的 Health（完整替换，无合并无历史）；
（7）同一 registry 同步来源 + async 来源混用 → 一次
getAggregateHealth() 调用两者都被正确聚合进 sources。

## 5. Acceptance Results

| # | 判定 | 结果 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | PASS（0；首次 frozen 失败后按任务指令以普通 `pnpm install` 更新 lockfile，复跑 frozen 通过） |
| A02 | `pnpm typecheck` 退出码 0（含新包 health-registry 真正被 tsc -b 构建） | PASS（0；tsc -b 输出包含 health-registry，dist/ 已生成） |
| A03 | `pnpm lint` 退出码 0 | PASS（0） |
| A04 | `pnpm format:check` 退出码 0 | PASS（0） |
| A05 | `pnpm build` 退出码 0 | PASS（0） |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | PASS（0，131 files / 765 tests） |
| A07 | 空 registry `getAggregateHealth()` 返回 `{overall:'OK', sources:{}}` | PASS（测试 1：`resolves.toEqual({ overall: 'OK', sources: {} })`） |
| A08 | 单来源 OK/DOWN 两种场景 overall 分别正确 | PASS（测试 2 单 OK → 'OK'；测试 3 单 DOWN → 'DOWN'） |
| A09 | 混合三来源（OK+DEGRADED+DOWN）overall 为 DOWN；混合两来源（OK+DEGRADED）overall 为 DEGRADED | PASS（测试 4 → 'DOWN'；测试 5 → 'DEGRADED'） |
| A10 | 同名二次 register 覆盖旧来源 | PASS（测试 6：同名 'db' 二次 register 返回不同 Health，聚合只反映第二个——first 的 OK 不参与，无历史） |
| A11 | 同步与异步 getHealth() 可在同一 registry 内混用并都被正确聚合 | PASS（测试 7：同步普通函数来源 + async 来源同一 registry，一次调用两者都进 sources） |
| A12 | sources 字段 key/value 与登记时的 name/getHealth()原始返回值一致 | PASS（各测试均用 `toEqual` 全等断言 key=name；测试 3 的 `error: 'something broke'` 原样保留证明字段透传无裁剪/改写） |
| A13 | 未新增第三方 npm 依赖，只 import type { Health } from @interactive-story/shared | PASS（package.json 唯一依赖 `@interactive-story/shared: workspace:*`；healthRegistry.ts 仅 `import type { Health }`） |
| A14 | shared/persistence/host-memory/platform-twitch/ai-host/operator-api/platform-core/runtime-kernel/renderer 均未被修改 | PASS（git add 显式文件清单不含上述任何路径；git diff 无这些包的内容改动） |
| A15 | 未新建任何 HTTP 端点，未接入 operator-api | PASS（healthRegistry.ts 零网络代码、零 operator-api import，纯内存聚合原语） |
| A16 | DECISIONS.md 存在，覆盖第 6 节列出的全部要点 | PASS（D1–D5 逐一对应五个"为何"：不硬编码接入 6 来源 / 最差优先规则 / 同步异步双形态 / 不建 HTTP 端点 / 空 registry 默认 OK） |
| A17 | 节点文档齐全，INDEX.md T001–T002 全部勾选，Status 改为 READY_FOR_REVIEW | PASS（见第 6 节 INDEX 勾选） |
| A18 | git log 新增恰 1 条提交，首行 `DEV-061: health registry (aggregate getHealth sources, worst-status-wins, no real sources wired yet)` | PASS（见第 7 节） |
| A19 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但未提交 | PASS（0290 NODE_REPORT 与 LEDGER 追加行已写入工作区未提交；见第 8 节） |
| A20 | PROJECT_INDEX / DAG / tasks / audit / protocol 均未被修改 | PASS（git add 显式文件清单不含上述任何路径） |

## 6. Scope Check

- Writable Scope：T002 全部文件真实改动（新增 6 + 修改 3：根
  tsconfig.json / pnpm-lock.yaml / REPORT.md + INDEX.md 更新，见第
  3 节）；`specs/dev/DEV-061/` 下 INDEX / REPORT / DECISIONS 更新或
  创建（REQUIREMENTS.md、ACCEPTANCE.md 由 T001 在 Commander
  dispatch 提交 8604865 中已存在，内容与 Task Package 核对一致，
  本次无需改动）。
- Read-only Scope：`packages/shared/src/health.ts` 只读（仅
  import type Health，未修改）；persistence / host-memory /
  platform-twitch / ai-host / operator-api 只作背景参考，零改动。
- Forbidden Scope：未修改 shared/persistence/host-memory/
  platform-twitch/ai-host/operator-api/platform-core/runtime-kernel/
  renderer 任何文件；未硬编码接入任何真实 getHealth 来源；未新建
  任何 HTTP 端点；未新增任何第三方 npm 依赖。
- 本节点 Writable Scope 之外不需要任何改动即可推进，无越权操作，
  未触发 EXECUTOR_QUERY。

## 7. Commit

恰 1 条提交，首行：`DEV-061: health registry (aggregate getHealth sources, worst-status-wins, no real sources wired yet)`

`git add` 仅含显式文件清单（不使用 `git add -A` / `git add .`）：
`packages/health-registry/package.json`、
`packages/health-registry/tsconfig.json`、
`packages/health-registry/src/index.ts`、
`packages/health-registry/src/healthRegistry.ts`、
`packages/health-registry/src/healthRegistry.test.ts`、根
`tsconfig.json`、`pnpm-lock.yaml`、
`specs/dev/DEV-061/{INDEX,REPORT,DECISIONS}.md`（不含 dist /
node_modules / tsconfig.tsbuildinfo）。

**未包含**在本次提交中：`specs/comms/LEDGER.md` 追加行与
`specs/comms/0290-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-061.md` 消息
文件——两者已写入工作区，保持未提交，留给 Commander 收尾统一处
理。

## 8. Handoff

- 节点产出：新包 `packages/health-registry`（通用 `HealthSource`/
  `AggregateStatus`/`AggregateHealth`/`HealthRegistry`/
  `createHealthRegistry` 聚合原语：Map 私有存储、同名覆盖式
  register、async getAggregateHealth 同步/异步来源透明混用、最差
  状态优先、空 registry 默认 OK）+ 7 项单测，已随恰 1 条提交入库。
- DECISIONS.md（D1–D5）已随实现提交入库，覆盖 Task Package 第 6
  节全部五个"为何"要点。
- 按任务指令，本次实现提交本身**不含** `specs/comms/LEDGER.md` 或
  NODE_REPORT 消息文件；对应 `0290` NODE_REPORT 与 LEDGER 追加行已
  写入工作区但未提交（msg_id 取当前 LEDGER 最大序号 0289 + 1）。
- 验证六条命令全部退出码 0；`git log -1` 只看到这一条新提交；git
  status 确认 LEDGER 改动与 NODE_REPORT 消息文件仍存在但未提交。
- 未推进到任何下一 DEV Node（M6 后续节点由 Commander 裁决）。
