# DEV-063 REPORT

## 1. Status

READY_FOR_REVIEW

## 2. Implemented

T001–T002 全部完成（本节点为 M6 第四个节点，Watchdog）。Dev Spec
第 63 节本身零正文（第 2731-2732 行只有标题），DAG.md 第 401 行备
注为空——唯一权威范围来自第 56 节 L3"Runtime 可恢复"（Renderer
crash / Twitch disconnect / Runtime process restart → 自动恢复），
USER 2026-09-08 已裁决：L3 这三个场景当作**封闭集合**处理、写真实
判断分支（不像 DEV-062 error-registry 的 `category` 那样开放）。
T001 的四份节点文档由 Commander 的 dispatch 提交（1970da7）建立，
内容与 Task Package 一致，本次逐字核对确认，未改动（仅按 T002 更
新 INDEX.md 勾选与 Status、填写 REPORT.md）。

**T002 — `packages/watchdog`（新包，本次提交主体）：**

- `package.json`：以 `packages/error-registry/package.json` 为结
  构模板，name 为 `@interactive-story/watchdog`，**零依赖**：
  `dependencies` 字段整体省略——仓库里零依赖包的既有惯例是省略
  字段而非空对象（error-registry/audio-engine/shared/
  platform-core 均无 dependencies 字段），Task Package 明示新包
  同 error-registry 的零依赖惯例。
- `tsconfig.json`：与 error-registry 逐字一致（extends
  `../../tsconfig.base.json`，outDir dist / rootDir src，include
  `src/**/*`）。
- `src/watchdog.ts`（**零 import**，不依赖任何 workspace 包）：
  - `WatchdogTrigger = 'RENDERER_CRASH' | 'TWITCH_DISCONNECT' |
    'RUNTIME_PROCESS_RESTART'`——第 56 节 L3 明确点名的封闭三值
    集合，抄录规范原文（D1）。
  - `WatchdogActionKind = 'ALREADY_HANDLED' | 'NOT_YET_WIRED'`——
    只有两个取值，**没有第三个"真的执行了恢复动作"的取值**：本
    节点不实现任何真实恢复动作本身（D3）。
  - `WatchdogDecision`（`trigger`/`action`/`detail` 三必填字段）。
  - `decideWatchdogAction(trigger): WatchdogDecision`：纯函数，
    `switch` 恰好三个 `case` 分支覆盖全部字面量，无 `default`
    （三个 case 已穷尽联合类型，返回值类型 +
    `noFallthroughCasesInSwitch` 保证分支完整性）：
    - `TWITCH_DISCONNECT` → `ALREADY_HANDLED`，detail 点名
      `platform-twitch` 的 DEV-045 指数退避自动重连（不重新实现，
      D2）；
    - `RENDERER_CRASH` → `NOT_YET_WIRED`，detail 点名"无
      Renderer 崩溃检测/重启机制"；
    - `RUNTIME_PROCESS_RESTART` → `NOT_YET_WIRED`，detail 点名
      "无可重启的生产进程"（两条 detail 各自点名不同事实，D3）。
- `src/index.ts`：一行 barrel：`export * from './watchdog.js'`。
- `src/watchdog.test.ts`：5 个独立测试用例（见第 4 节测试计数与
  A07–A11 逐条）。
- 根 `tsconfig.json`：references 数组末尾（error-registry 之后）
  追加 `{ "path": "./packages/watchdog" }`，使 `tsc -b` 真正构建
  新包。
- `pnpm-lock.yaml`：新增 `packages/watchdog: {}` importer（零依赖
  包仅追加空 importer 条目）。

**未做（按 Task Package 明示）：** 不实现任何真实 Renderer 崩溃检
测/重启机制、任何真实进程管理/重启机制、不重新实现 Twitch 重连
（D2/D3）；不 import error-registry/health-registry/
platform-twitch/runtime-kernel/operator-api/renderer 任何一个
（D4）；不新建任何 HTTP 端点、不接入 operator-api；L1/L2/L4 处理
逻辑不做（分别属既有 DEV-023 与未来 DEV-065/066/067）；零第三方
npm 依赖、零其他包改动。

## 3. Changed Files

新增：
- `packages/watchdog/package.json`
- `packages/watchdog/tsconfig.json`
- `packages/watchdog/src/index.ts`
- `packages/watchdog/src/watchdog.ts`
- `packages/watchdog/src/watchdog.test.ts`
- `specs/dev/DEV-063/DECISIONS.md`

修改：
- `tsconfig.json`（根，references 末尾追加 watchdog 一条）
- `pnpm-lock.yaml`（watchdog importer）
- `specs/dev/DEV-063/INDEX.md`（T001–T002 勾选，Status →
  READY_FOR_REVIEW）
- `specs/dev/DEV-063/REPORT.md`（本文）

T001 四份节点文档（INDEX/REQUIREMENTS/ACCEPTANCE/REPORT）来自
Commander dispatch 提交，本次仅更新 INDEX.md 与填写 REPORT.md；
REQUIREMENTS.md / ACCEPTANCE.md 内容与 Task Package 核对一致，
无需改动。

## 4. Tests Executed

全部为 `pnpm <cmd>`，退出码逐一记录：

| # | 命令 | 退出码 |
|---|---|---|
| 1 | `pnpm install --frozen-lockfile` | 0（首次即通过，pnpm 将新包空 importer 记入 pnpm-lock.yaml，复跑 frozen 亦 0） |
| 2 | `pnpm typecheck` | 0 |
| 3 | `pnpm lint` | 0 |
| 4 | `pnpm format:check` | 0（首跑报我的 2 个新文件不合规——watchdog.ts / watchdog.test.ts 各一处折行——`prettier --write` 就地修正后复跑 0） |
| 5 | `pnpm build` | 0 |
| 6 | `pnpm test` | 0 |

`pnpm test`：133 test files / 776 tests 全部通过（零回归；DEV-062
基线 132 files / 771 tests）。新增 1 个测试文件 5 个测试
（771 → 776）：`watchdog.test.ts`（5），用例清单：
（1）`decideWatchdogAction('TWITCH_DISCONNECT')` → `action` 为
`'ALREADY_HANDLED'`，`detail` 含子串 `'reconnect'`（证明引用既有
自动重连机制而非通用文案）；
（2）`decideWatchdogAction('RENDERER_CRASH')` → `action` 为
`'NOT_YET_WIRED'`，`detail`（小写化后）含子串 `'renderer crash'`
（点名 Renderer 崩溃检测机制缺失，实现文案为 'no renderer crash
detection/restart mechanism exists yet'）；
（3）`decideWatchdogAction('RUNTIME_PROCESS_RESTART')` → `action`
为 `'NOT_YET_WIRED'`，且该 `detail` 与测试 2 的 RENDERER_CRASH
`detail` **不相等**（两条 NOT_YET_WIRED 非复制粘贴的同一句占位）；
（4）对三个 trigger 值各调用一次 → 每次返回值的 `trigger` 字段与
传入值逐一 `toBe` 相等；
（5）`decideWatchdogAction('TWITCH_DISCONNECT')` 连续调用两次 →
两次返回值 `toEqual` 深度相等（纯函数、无隐藏状态/副作用）。

## 5. Acceptance Results

| # | 判定 | 结果 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | PASS（0；首次 `--frozen-lockfile` 即通过，lockfile 已含 `packages/watchdog: {}` importer，复跑 frozen 亦 0） |
| A02 | `pnpm typecheck` 退出码 0（含新包 watchdog 真正被 tsc -b 构建） | PASS（0；`tsc -b` 输出含 watchdog，`packages/watchdog/dist/` 已生成 index.js/watchdog.js/.d.ts） |
| A03 | `pnpm lint` 退出码 0 | PASS（0） |
| A04 | `pnpm format:check` 退出码 0 | PASS（0；首跑 1，`prettier --write` 修正本节点 2 个新文件后复跑 0） |
| A05 | `pnpm build` 退出码 0 | PASS（0） |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | PASS（0，133 files / 776 tests，771 → 776 恰为新包 5 测试） |
| A07 | `TWITCH_DISCONNECT` 返回 `ALREADY_HANDLED`，detail 提及既有自动重连机制 | PASS（测试 1：`action` `toBe('ALREADY_HANDLED')`；`detail` 含 `'reconnect'`，完整文案点名 'platform-twitch already implements exponential-backoff reconnect (DEV-045)'） |
| A08 | `RENDERER_CRASH` 返回 `NOT_YET_WIRED`，detail 具体点名 | PASS（测试 2：`action` `toBe('NOT_YET_WIRED')`；`detail` 点名 'no renderer crash detection/restart mechanism exists yet'，非通用文案） |
| A09 | `RUNTIME_PROCESS_RESTART` 返回 `NOT_YET_WIRED`，detail 具体点名且与 RENDERER_CRASH 的 detail 不同 | PASS（测试 3：`action` `toBe('NOT_YET_WIRED')`；`detail` 点名 'no production process exists yet that could be restarted'，且与 RENDERER_CRASH 的 detail `not.toBe` 不相等） |
| A10 | 三个 trigger 的返回值 trigger 字段与传入值逐一对应 | PASS（测试 4：三个值各调用一次，返回值 `trigger` 逐一 `toBe` 相等） |
| A11 | 同一 trigger 连续两次调用结果深度相等（纯函数） | PASS（测试 5：`TWITCH_DISCONNECT` 两次调用 `toEqual` 深度相等） |
| A12 | 未新增第三方 npm 依赖，package.json 无 workspace 依赖 | PASS（watchdog/package.json **无 `dependencies` 字段**（整体省略，同 error-registry 零依赖惯例）；源码零 import） |
| A13 | 未 import error-registry/health-registry/platform-twitch/runtime-kernel/operator-api/renderer 任何一个 | PASS（watchdog.ts / index.ts / watchdog.test.ts 零 import 或仅 import vitest；无任何 workspace 包引用） |
| A14 | 除本节点 Writable Scope 外任何既有文件均未被修改 | PASS（git add 显式文件清单仅含第 3 节列出的新增/修改；`git diff HEAD` 无其他内容改动） |
| A15 | 未实现任何真实 Renderer 崩溃检测/进程重启/Twitch 重连逻辑 | PASS（watchdog.ts 仅纯函数 switch 返回字面量对象，零进程/零网络/零检测逻辑；watchdog 包无任何可执行副作用） |
| A16 | DECISIONS.md 存在，覆盖第 6 节列出的全部要点 | PASS（D1–D4 逐一对应四个"为何"：L3 封闭集合 vs error-registry category 开放、TWITCH_DISCONNECT 为何 ALREADY_HANDLED、两个场景为何诚实 NOT_YET_WIRED、为何零依赖） |
| A17 | 节点文档齐全，INDEX.md T001–T002 全部勾选，Status 改为 READY_FOR_REVIEW | PASS（见第 6 节 INDEX 勾选） |
| A18 | git log 新增恰 1 条提交，首行 `DEV-063: watchdog (closed 3-trigger L3 recovery decision, honest already-handled/not-yet-wired outcomes)` | PASS（见第 7 节） |
| A19 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但未提交 | PASS（0300 NODE_REPORT 与 LEDGER 追加行已写入工作区未提交；见第 8 节） |
| A20 | PROJECT_INDEX / DAG / tasks / audit / protocol 均未被修改 | PASS（git add 显式文件清单不含上述任何路径） |

## 6. Scope Check

- Writable Scope：T002 全部文件真实改动（新增 6 + 修改 4：根
  tsconfig.json / pnpm-lock.yaml / REPORT.md / INDEX.md，见第 3
  节）；`specs/dev/DEV-063/` 下 INDEX / REPORT / DECISIONS 更新或
  创建（REQUIREMENTS.md、ACCEPTANCE.md 由 T001 在 Commander
  dispatch 提交 1970da7 中已存在，内容与 Task Package 核对一致，
  本次无需改动）。
- Read-only Scope：`specs/baseline/DEV_SPEC_V1.0.md` 第 56 节 L3
  （2001-2014 行）只读作为范围依据；`specs/dev/DAG.md` 第 193 行
  （DEV-045 摘要）作 TWITCH_DISCONNECT 已处理背景参考；error-
  registry 的 package.json/tsconfig.json 仅作结构模板参照，零改
  动；未读取任何包源码作为实现依据。
- Forbidden Scope：未修改任何既有文件（除本节点 Writable Scope
  内）；未 import 上述六个包任何一个；未新建 HTTP 端点、未接入
  operator-api；未实现任何真实崩溃检测/进程重启/重连逻辑；L3 三
  场景按封闭集合写真实分支（D1）；未新增第三方 npm 依赖。
- 本节点 Writable Scope 之外不需要任何改动即可推进，无越权操作，
  未触发 EXECUTOR_QUERY。

## 7. Commit

恰 1 条提交，首行：`DEV-063: watchdog (closed 3-trigger L3 recovery decision, honest already-handled/not-yet-wired outcomes)`

`git add` 仅含显式文件清单（不使用 `git add -A` / `git add .`）：
`packages/watchdog/package.json`、
`packages/watchdog/tsconfig.json`、
`packages/watchdog/src/index.ts`、
`packages/watchdog/src/watchdog.ts`、
`packages/watchdog/src/watchdog.test.ts`、根 `tsconfig.json`、
`pnpm-lock.yaml`、`specs/dev/DEV-063/{INDEX,REPORT,DECISIONS}.md`
（不含 dist / node_modules / *.tsbuildinfo）。

**未包含**在本次提交中：`specs/comms/LEDGER.md` 追加行与
`specs/comms/0300-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-063.md` 消息
文件——两者已写入工作区，保持未提交，留给 Commander 收尾统一处
理。

## 8. Handoff

- 节点产出：新包 `packages/watchdog`（`WatchdogTrigger` 第 56 节
  L3 封闭三值 + `WatchdogActionKind` 两值 + `WatchdogDecision` +
  `decideWatchdogAction` 纯函数三路 switch：TWITCH_DISCONNECT →
  ALREADY_HANDLED、RENDERER_CRASH / RUNTIME_PROCESS_RESTART →
  NOT_YET_WIRED 各自点名不同缺位）+ 5 项单测，已随恰 1 条提交入
  库。
- DECISIONS.md（D1–D4）已随实现提交入库，覆盖 Task Package 第 6
  节全部四个"为何"要点。
- 按任务指令，本次实现提交本身**不含** `specs/comms/LEDGER.md` 或
  NODE_REPORT 消息文件；对应 `0300` NODE_REPORT 与 LEDGER 追加行已
  写入工作区但未提交（msg_id 取当前 LEDGER 最大序号 0299 + 1）。
- 验证六条命令全部退出码 0；`git log -1` 只看到这一条新提交；git
  status 确认 LEDGER 改动与 NODE_REPORT 消息文件仍存在但未提交、
  工作区无任何残留临时文件（Commander dispatch 遗留的
  `.tmp_dev063_prompt.txt` 已清除——DEV-061 MAJOR-01 同类残留曾致
  audit FAIL）。
- 未推进到任何下一 DEV Node（M6 后续节点由 Commander 裁决）。
