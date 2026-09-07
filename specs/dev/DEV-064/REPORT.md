# DEV-064 REPORT

## 1. Status

READY_FOR_REVIEW

## 2. Implemented

T001–T003 全部完成（本节点为 M6 第五个节点，OBS Control）。Dev
Spec 第 64 节本身只有标题零正文（唯一权威范围来自第 48-49 节：
OBS 只做执行不做业务逻辑 + BOOT/LIVE/RECONNECTING/MAINTENANCE/
ERROR/ENDING 六个封闭场景 + "Runtime 通过 OBS WebSocket 控制
failover"）；DAG.md 第 403 行（DEV-065 备注）把 failover 决策权
明确划给未来 SAFETY region（CR-020），DEV-064 只做"控制"。USER
2026-09-08 已裁决：OBS WebSocket 是具体、稳定、公开文档的外部协议
（同 DEV-040/041 先例），建**真实客户端**而非接口 + noop。
T001 四份节点文档由 Commander 的 dispatch 提交（5970739）建立，
本次按 T003 更新 INDEX.md 勾选与 Status、填写 REPORT.md、新建
DECISIONS.md。

**T002 — `obsControlPort.ts`（类型 + noop）+ 包骨架**（已在工作区，
本次一并提交）：

- `package.json`：name `@interactive-story/platform-obs`，**省略
  `dependencies` 字段**（零依赖惯例，同 error-registry/audio-engine/
  watchdog）；`devDependencies` 含 `ws@^8.21.3` 与
  `@types/ws@^8.18.1`（版本对齐 `apps/renderer` 已有用法，只用于
  测试起假 OBS server）。
- `tsconfig.json`：与 packages/watchdog 逐字一致（extends 根
  tsconfig.base，outDir dist / rootDir src）。
- `src/obsControlPort.ts`：本地 `Health` 镜像（不 import
  packages/shared，同 DEV-035/040/041 先例）+ `ObsScene`（第 49 节
  封闭六值，抄录原文）+ `ObsSwitchResult` + `ObsControlPort` 接口 +
  `noopObsControlPort` 诚实占位单例。
- `src/obsControlPort.test.ts`：3 个测试（六值恒定诚实失败 /
  getHealth 恒定 DOWN / 手写对象字面量实现接口可用的类型契约）。

**T003 — `obsWebSocketClient.ts`（真实 OBS WebSocket v5 客户端）+
假 OBS server 测试（本次提交主体）：**

- `src/obsWebSocketClient.ts`：生产代码只 import `node:crypto`
  （`createHash`/`randomUUID`）与同包 `obsControlPort.js`，零第三方
  /workspace 依赖；用 Node ≥22 原生全局 `WebSocket`（`webSocketImpl`
  注入字段默认它，同 DEV-041 `eventSubClient.ts` 风格）：
  - 模块私有 `computeAuthenticationString(password, salt,
    challenge)`：官方双重 SHA256 算法
    `base64(sha256(base64(sha256(password + salt)) + challenge))`
    （两次 `createHash('sha256')` 链式 update + digest('base64')）。
  - 模块私有 `errorMessage(error)`：`Error` 取 `.message` 否则
    `String(error)`（同 elevenLabsTtsProvider/twitchAuth 既有模式）。
  - 模块私有 `connectAndIdentify(config)`：Promise 构造器内完成
    连接 + Hello(op0)/Identify(op1)/Identified(op2) 握手——op 0
    携带 authentication 且配置了密码时按官方算法计算并附加到
    Identify；要求鉴权但未配置密码时**立即失败、不发送任何猜测值**；
    op 2 解析出携带 `sendRequest` 的连接对象；op 6/op 7 经
    requestId 关联的 pendingRequests Map 配对（每个 entry 的
    resolve/reject 包装先清各自超时）；op 0/2/7 之外的 op 忽略；
    无法解析的帧静默忽略。连接超时（connectTimeoutMs 默认 5000）、
    error/close 处理器都以 settled 标志保证恰一次 settle。
  - `ObsConnection.sendRequest(requestType, requestData)`：生成
    `randomUUID()` requestId，发 `{op:6, d:{requestType, requestId,
    requestData}}`，独立 `requestTimeoutMs`（默认 5000）超时清理。
  - `createObsControlProvider(config)`：调用时 eager 发起**恰好一
    次**共享 `readyPromise`（失败后永久 rejected，零重连——D2）；
    返回 `ObsControlPort`：`switchScene` await readyPromise 后发
    `SetCurrentProgramScene`，op 7 `result:true` → `{ok:true}`，
    `result:false` → `{ok:false, reason: comment ?? 'OBS request
    failed'}`，异常 → `{ok:false, reason: errorMessage}`；`getHealth`
    握手成功 → `{status:'OK', lastSuccessAt, latencyMs}`、失败 →
    `{status:'DOWN', latencyMs, error}`。
  - `createOptionalObsControlProvider(env)`：`OBS_WEBSOCKET_URL`
    未设/空 → **按引用返回 noopObsControlPort 单例**；否则装配
    config（`OBS_WEBSOCKET_PASSWORD` 非空时带上 password）走真实
    路径。
- `src/obsWebSocketClient.test.ts`：9 个测试，用 `ws` 的
  `WebSocketServer({port:0})` 起假 OBS server（随机端口，`.address()
  .port` 取址，同 apps/renderer `wsServer.test.ts` 先例），每个测试
  在 connection handler 内直接脚本化协议帧交换，`afterEach` 终止
  server 侧 socket + 关闭 server（不泄漏端口/句柄）——覆盖见第 5
  节 A09–A15 逐条。
- `src/index.ts`：两行 barrel：`export * from './obsControlPort.js'`
  + `export * from './obsWebSocketClient.js'`。
- 根 `tsconfig.json`：references 末尾（watchdog 之后）追加
  `{ "path": "./packages/platform-obs" }`。
- `pnpm-lock.yaml`：新增 `packages/platform-obs` importer（T002 的
  pnpm install 已写入）。

**未做（按 Task Package 明示）：** 零自动重连逻辑（D2）；零"何时
切场景"判断逻辑、`switchScene` 纯请求转发（D3）；零真实 SAFETY
region 状态机；不 import error-registry/health-registry/watchdog/
platform-twitch/runtime-kernel/operator-api/renderer 任何一个
（A18）；不新建 HTTP 端点、不接入 operator-api；生产代码零第三方
/workspace 依赖（D4/D5）。

## 3. Changed Files

新增：
- `packages/platform-obs/package.json`
- `packages/platform-obs/tsconfig.json`
- `packages/platform-obs/src/index.ts`
- `packages/platform-obs/src/obsControlPort.ts`
- `packages/platform-obs/src/obsControlPort.test.ts`
- `packages/platform-obs/src/obsWebSocketClient.ts`
- `packages/platform-obs/src/obsWebSocketClient.test.ts`
- `specs/dev/DEV-064/DECISIONS.md`

修改：
- `tsconfig.json`（根，references 末尾追加 platform-obs 一条）
- `pnpm-lock.yaml`（platform-obs importer）
- `specs/dev/DEV-064/INDEX.md`（T001–T003 勾选，Status →
  READY_FOR_REVIEW）
- `specs/dev/DEV-064/REPORT.md`（本文）

T001 四份节点文档（INDEX/REQUIREMENTS/ACCEPTANCE/REPORT）来自
Commander dispatch 提交（5970739），本次仅更新 INDEX.md 与填写
REPORT.md；REQUIREMENTS.md / ACCEPTANCE.md 内容与 Task Package 核
对一致，无需改动。T002 与 T003 的全部文件按指令合并为**恰 1 条**
提交（T002 是检查点不是提交点）。

## 4. Tests Executed

全部为 `pnpm <cmd>`，退出码逐一记录（首轮 format:check 报 1：我的
2 个新源文件各有一处折行不合规，`prettier --write` 就地修正后复
跑 0；首轮全量 test 报 1：`packages/runtime-kernel` 的
`simulator.test.ts`「runs 50 valid-minimal chapters」在冷启动高负载
（首跑 import/transform 阶段耗时 >200s）下超了该测试自身的 5000ms
预算——该文件本次零改动，单独复跑 2 次全过、热跑全量 135/788 全
过，确认为负载性偶发而非回归）：

| # | 命令 | 退出码 |
|---|---|---|
| 1 | `pnpm install --frozen-lockfile` | 0 |
| 2 | `pnpm typecheck` | 0 |
| 3 | `pnpm lint` | 0 |
| 4 | `pnpm format:check` | 0（首跑 1，prettier --write 修正本节点 2 个新文件后复跑 0） |
| 5 | `pnpm build` | 0 |
| 6 | `pnpm test` | 0（热跑 135 files / 788 tests 全过，零回归） |

`pnpm test`：135 test files / 788 tests 全部通过（DEV-063 基线 133
files / 776 tests → +2 files / +12 tests，恰为新包两个测试文件）。
新增 `obsControlPort.test.ts`（3，T002）与
`obsWebSocketClient.test.ts`（9，T003）。平台内独立跑
`packages/platform-obs`：2 files / 12 tests 全过（379ms，无悬挂）；
`runtime-kernel/simulator.test.ts` 单独复跑 2 次均 4/4 通过。

## 5. Acceptance Results

| # | 判定 | 结果 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | PASS（0；`--frozen-lockfile`，T002 已记 importer，复跑亦 0） |
| A02 | `pnpm typecheck` 退出码 0（含新包 platform-obs 真正被 tsc -b 构建） | PASS（0；`tsc -b` 已含 platform-obs，dist 产物生成，格式化后复跑亦 0） |
| A03 | `pnpm lint` 退出码 0 | PASS（0） |
| A04 | `pnpm format:check` 退出码 0 | PASS（0；首跑 1，`prettier --write` 修正 obsWebSocketClient.ts/.test.ts 后复跑 0） |
| A05 | `pnpm build` 退出码 0 | PASS（0） |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | PASS（0；热跑 135 files / 788 tests 全过；首轮 simulator 冷启动超时经单独复跑 2 次 + 热跑确认系负载性偶发，该文件零改动） |
| A07 | `noopObsControlPort` 的 `switchScene`/`getHealth` 恒定诚实失败 | PASS（obsControlPort.test.ts 测试 1-2：六值逐一 `toEqual({ok:false, reason:'no OBS WebSocket connection configured'})`；getHealth 恒定 `{status:'DOWN', ...}`） |
| A08 | `ObsScene` 六个字面量值均可用 | PASS（obsControlPort.test.ts 测试 3：手写对象字面量实现接口 + 测试 1 六值遍历均通过类型检查与运行） |
| A09 | 无鉴权真实握手成功，`switchScene` 成功场景 `result:true` → `{ok:true}` | PASS（测试 1：假 server 断言收到 op6 且 `requestType==='SetCurrentProgramScene'`、`requestData.sceneName==='LIVE'`，回 op7 result:true → `switchScene('LIVE')` resolves `{ok:true}`） |
| A10 | 正确密码鉴权握手成功；客户端计算的鉴权值与官方算法独立计算值一致 | PASS（测试 2：测试内用 node:crypto 独立实现官方双重 SHA256 公式算出期望值，假 server 校验通过回 Identified；断言 Identify 帧 `d.authentication === 期望值`、`rpcVersion===1`；`switchScene('MAINTENANCE')` → `{ok:true}`） |
| A11 | 错误密码/需要鉴权但未配置密码，均诚实失败不悬挂 | PASS（测试 3：错误密码 → server 不回 Identified 并关连接，短 connectTimeoutMs 200 → `result.ok===false` 快速收尾；测试 4：server 要求鉴权、客户端无 password → `result.ok===false` 且断言**未收到任何 op1 Identify 帧**——证明未猜测/未发送任何鉴权值） |
| A12 | 请求超时诚实失败不悬挂；`requestStatus:{result:false,comment}` 透传为失败原因 | PASS（测试 5：握手成功后 server 对 op6 故意不回复，requestTimeoutMs 50 → `result.ok===false` 不悬挂；测试 6：op7 `{result:false, comment:'scene not found'}` → `switchScene` 精确 resolves `{ok:false, reason:'scene not found'}`，comment 原样透传非通用文案） |
| A13 | 连接超时/失败诚实失败不悬挂 | PASS（测试 7：先起后关的假 server 释放的端口上无监听，connectTimeoutMs 200 → `result.ok===false` 快速收尾） |
| A14 | `getHealth()` 握手成功→OK、失败→DOWN 且 error 含原因 | PASS（测试 8：成功假 server → `status==='OK'` 且 lastSuccessAt 为 number；死端口 → `status==='DOWN'` 且 error 为非空 string） |
| A15 | `createOptionalObsControlProvider` 未配置返回与 `noopObsControlPort` 同一引用；配置后走真实路径 | PASS（测试 9：`{}` 与 `{OBS_WEBSOCKET_URL:''}` 均 `toBe(noopObsControlPort)` 严格引用相等；配置指向假 server → `not.toBe(noop)` 且 `switchScene('BOOT')` 端到端 `{ok:true}`） |
| A16 | 生产代码零第三方/workspace 依赖；`ws`/`@types/ws` 只在 devDependencies | PASS（package.json **无 dependencies 字段**；ws/@types/ws 仅 devDependencies；obsWebSocketClient.ts 只 import node:crypto 与同包文件） |
| A17 | 未实现任何重连逻辑；未实现任何"何时切场景"判断；未实现真实 SAFETY region | PASS（D2/D3：readyPromise 单次 eager、失败永久 rejected 无重试；switchScene 纯转发无状态判断；无 SAFETY 状态机——见 DECISIONS.md） |
| A18 | error-registry/health-registry/watchdog/platform-twitch/runtime-kernel/operator-api/renderer 均未被修改/import | PASS（git add 显式清单不含上述任何路径；obsWebSocketClient.ts/.test.ts 无任何上述包 import；git diff HEAD 仅第 3 节列出的新增/修改） |
| A19 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | PASS（D1–D6：建真实客户端而非接口+noop / 零重连 / 零切场决策 / 生产零依赖 / ws 仅测试依赖 / 全路径显式超时） |
| A20 | `specs/dev/DEV-064/` 节点文档齐全，INDEX.md T001–T003 全部勾选，Status 改为 READY_FOR_REVIEW | PASS（INDEX 勾选三行 + Status → READY_FOR_REVIEW；五份文档齐全） |
| A21 | git log 新增恰 1 条提交，首行 `DEV-064: obs control (real OBS WebSocket v5 client, no reconnect, no failover decision logic)` | PASS（见第 7 节） |
| A22 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但未提交；工作区无额外残留 | PASS（见第 8 节；另已清除 dispatch 遗留的 `.tmp_dev064_t003_prompt.txt`——DEV-061 MAJOR-01 同类残留曾致 audit FAIL） |
| A23 | PROJECT_INDEX / DAG / tasks / audit / protocol 均未被修改 | PASS（git add 显式文件清单不含上述任何路径） |

## 6. Scope Check

- Writable Scope：T002+T003 全部文件真实改动（新增 8 + 修改 4：根
  tsconfig.json / pnpm-lock.yaml / INDEX.md / REPORT.md，见第 3
  节）。
- Read-only Scope：`specs/baseline/DEV_SPEC_V1.0.md` 第 48-49 节
  （1789-1817 行）作为 ObsScene 与"OBS 只做执行"的范围依据；
  `packages/platform-twitch/src/eventSubClient.ts`（webSocketImpl
  注入字段与原生 WebSocket 默认的既有先例）、`twitchAuth.ts` 与
  `packages/audio-engine/src/elevenLabsTtsProvider.ts`（errorMessage
  模式、Health 本地镜像先例）仅风格参照，零改动零 import；
  `apps/renderer/src/server/wsServer.test.ts`（port 0 + address() 取
  端口 + afterEach 关闭的测试模式）与 `apps/renderer/package.json`
  （ws/@types/ws 版本对齐）仅参照。
- Forbidden Scope：未修改任何既有文件（除 Writable Scope 内）；未
  import error-registry/health-registry/watchdog/platform-twitch/
  runtime-kernel/operator-api/renderer 任何一个；package.json 无
  dependencies 字段、未新增任何生产第三方依赖；未实现任何重连/
  切场决策/真实 SAFETY region；未新建 HTTP 端点、未接入
  operator-api。
- 本节点 Writable Scope 之外不需要任何改动即可推进，无越权操作，
  未触发 EXECUTOR_QUERY。

## 7. Commit

恰 1 条提交，首行：`DEV-064: obs control (real OBS WebSocket v5 client, no reconnect, no failover decision logic)`

`git add` 仅含显式文件清单（不使用 `git add -A` / `git add .`）：
`packages/platform-obs/package.json`、
`packages/platform-obs/tsconfig.json`、
`packages/platform-obs/src/index.ts`、
`packages/platform-obs/src/obsControlPort.ts`、
`packages/platform-obs/src/obsControlPort.test.ts`、
`packages/platform-obs/src/obsWebSocketClient.ts`、
`packages/platform-obs/src/obsWebSocketClient.test.ts`、根
`tsconfig.json`、`pnpm-lock.yaml`、`specs/dev/DEV-064/DECISIONS.md`、
`specs/dev/DEV-064/REPORT.md`、`specs/dev/DEV-064/INDEX.md`（不含
dist / node_modules / *.tsbuildinfo——均在 .gitignore 内）。

**未包含**在本次提交中：`specs/comms/LEDGER.md` 追加行与
`specs/comms/0304-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-064.md` 消息
文件——两者已写入工作区，保持未提交，留给 Commander 收尾统一处
理。

## 8. Handoff

- 节点产出：新包 `packages/platform-obs`——`ObsScene`（第 49 节封
  闭六值）/`ObsSwitchResult`/`ObsControlPort`/
  `noopObsControlPort`（T002）+ 真实 OBS WebSocket v5 客户端
  `createObsControlProvider`/`createOptionalObsControlProvider`：
  Hello/Identify/Identified 握手、可选官方双重 SHA256 挑战鉴权
  （node:crypto，零第三方）、op6/op7 requestId 关联切场景、
  `connectTimeoutMs`/`requestTimeoutMs` 全路径显式超时、eager 共享
  readyPromise 失败永久 rejected 零重连、未配置退化 noop 单例
  （T003）+ 12 项单测（3 noop/类型 + 9 假 OBS server 集成），已随
  恰 1 条提交入库。
- DECISIONS.md（D1–D6）已随实现提交入库，覆盖 Task Package 第 6
  节全部五个"为何"要点（D1 真实客户端 / D2 零重连 / D3 零切场决
  策 / D4 生产零依赖 / D5 ws 仅测试依赖；附 D6 全路径超时理由）。
- 按任务指令，本次实现提交本身**不含** `specs/comms/LEDGER.md` 或
  NODE_REPORT 消息文件；对应 `0304` NODE_REPORT 与 LEDGER 追加行已
  写入工作区但未提交（msg_id 取当前 LEDGER 最大序号 0303 + 1）。
- 验证六条命令全部退出码 0（首轮 format:check 与首轮全量 test 的
  失败均定位并修复/复跑确认，非本节点代码缺陷）；`git log -1` 只
  看到这一条新提交；git status 确认 LEDGER 改动与 NODE_REPORT 消息
  文件仍存在但未提交、工作区无任何残留临时文件（dispatch 遗留的
  `.tmp_dev064_t003_prompt.txt` 已清除）。
- 未推进到任何下一 DEV Node（M6 后续节点由 Commander 裁决）。
