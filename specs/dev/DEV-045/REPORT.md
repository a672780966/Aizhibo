# DEV-045 REPORT

## 1. Status

READY_FOR_REVIEW

## 2. Implemented

- 修改 `packages/platform-twitch/src/eventSubClient.ts`（仅改内部实现与
  `RECONNECTING` 转移表，公开签名不变）：
  - 状态机 `RECONNECTING` 块：新增 `WELCOME_RECEIVED: { target:
    'WELCOME' }` 与 `WS_ERROR: { actions: 'scheduleNextReconnect' }`
    两条边（后者停留原状态、由 action 安排下一次退避重试）；
    `DISCONNECT: { target: 'DISCONNECTED' }` 保持。其余七态 `on:` 表
    逐字节未改。
  - `session_reconnect` 帧处理：解析 `payload.session.reconnect_url`
    （`typeof === 'string'` 才采用，否则回退默认 `wsUrl`）存入闭包
    `reconnectTargetUrl`；`actor.send({type:'RECONNECT_SIGNAL'})`；
    紧接着 `beginReconnectAttempt()` 排定第一次退避尝试。
  - 重连退避引擎（新增闭包状态与函数）：`reconnectDelayMs`（初值
    1000，×2，封顶 30000）、`reconnectTimerId`、`beginReconnectAttempt()`
    （schedule 后翻倍延迟）、`attemptReconnect()`（非 RECONNECTING 直返；
    否则本地关旧 socket 再开新 socket）。
  - `openSocket(url?: string)`：接受可选 URL 参数（缺省 `wsUrl`），并加
    `thisSocket` 身份守卫，被替换/关闭的旧 socket 的迟到 error/close
    不触发多余 WS_ERROR。
  - `session_welcome` 分支：重置 `reconnectDelayMs = 1000` 与
    `reconnectTargetUrl = undefined`（每次成功 welcome 让下一 episode
    从基础退避起算）。
  - `disconnect()`：取消挂起的 `reconnectTimerId` 并重置退避状态，确保
    主动断开后不再有迟到重连尝试。
  - 命名 action `scheduleNextReconnect` 经 `eventSubMachine.provide({...})`
    按实例注入（机器在模块级、闭包函数不可见；`provide()` 必须在
    `createActor` 之前，见 D5）。
- `eventSubClient.test.ts`：新增 8 条测试（覆盖 A07–A16），既有
  DEV-041 断言零改动（diff 仅 244 行纯新增，无一行删除）。
- 新建 `specs/dev/DEV-045/DECISIONS.md`（D1–D7，见 §3/§5 A19）。
- 未实现：固定次数上限后转 ERROR、重连时重新取 token、双 socket 并存
  握手（简化先关后开，D6）、真实网络。

## 3. Changed Files

Writable Scope 内共 6 个文件（实现提交 6，含 INDEX.md 状态更新）：

```text
packages/platform-twitch/src/eventSubClient.ts       （修改，+64/−9，签名不变）
packages/platform-twitch/src/eventSubClient.test.ts  （修改，+244 纯新增测试）
specs/dev/DEV-045/DECISIONS.md                       （新增，D1–D7）
specs/dev/DEV-045/REPORT.md                          （本文件，T001 模板 → T002 回填）
specs/dev/DEV-045/INDEX.md                           （T001–T003 勾选 + Status=READY_FOR_REVIEW）
```

节点文档 `REQUIREMENTS.md`/`ACCEPTANCE.md` 由 Commander 在 `40c81b1`
dispatch 时预填，本节点零改动；`packages/platform-twitch/src/twitchAuth.ts`
（DEV-040 冻结）、`packages/runtime-kernel/**`、`packages/audio-engine/**`、
`apps/renderer/**` 及 `PROJECT_INDEX.md`/`DAG.md`/`tasks/**`/`audit/**`/
`protocol/**` 均未修改（见 §6 Scope Check 的空 diff 佐证）。

## 4. Tests Executed

六条命令严格按要求顺序执行，全部退出码 0：

| # | 命令 | 结果 |
|---|---|---|
| 1 | `pnpm install` | 0 |
| 2 | `pnpm typecheck` | 0；`tsc -b` + `tsc -b --noEmit` + renderer typecheck |
| 3 | `pnpm lint` | 0；`eslint .` |
| 4 | `pnpm format:check` | 0；Prettier 全绿 |
| 5 | `pnpm build` | 0；`tsc -b` |
| 6 | `pnpm test` | 0；111 test files passed，621 tests passed（DEV-044 基线 613，新增 8） |

新增 8 条测试（`eventSubClient.test.ts`）：A07 reconnect_url 使用、
A08 缺省回退 wsUrl、A09/A11 失败退避重试后全链路到 CONNECTED、A12 退避
封顶 30000ms、A13 disconnect 取消挂起重连、A14 成功重连后延迟重置
1000ms、A15 重连后 SUBSCRIBE_FAIL 仍转 ERROR 不重试、A16 重连不重新调
authPort.getAccessToken()。既有 DEV-041/FIX-01 全部断言逐条保留零改动，
全部包测试零回归。

## 5. Acceptance Results

| # | 判定 | 结果 | 依据 |
|---|---|---|---|
| A01 | `pnpm install` 退出码 0 | PASS | Tests Executed #1 |
| A02 | `pnpm typecheck` 退出码 0 | PASS | Tests Executed #2 |
| A03 | `pnpm lint` 退出码 0 | PASS | Tests Executed #3 |
| A04 | `pnpm format:check` 退出码 0 | PASS | Tests Executed #4 |
| A05 | `pnpm build` 退出码 0 | PASS | Tests Executed #5 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | PASS | 111 files / 621 tests；DEV-044 基线 613 全绿 + 新增 8 |
| A07 | `session_reconnect` 帧带 `reconnect_url` → 重连新 socket 用该 URL | PASS | 测试：`FakeWebSocket.instances[1]?.url === 'wss://reconnect.example/ws'` |
| A08 | 帧缺失 `reconnect_url` → 回退默认 `wsUrl` | PASS | 测试：`payload.session` 为空对象 → 新 socket 用 `config.wsUrl` |
| A09 | 重连成功全链路 RECONNECTING→WELCOME→SUBSCRIBING→CONNECTED，旧 socket close 恰一次 | PASS | 测试：三 socket 序列 + fetch 202 驱动到 CONNECTED |
| A10 | 重连尝试失败（welcome 前 error/close）→ 停留 RECONNECTING 不跳 ERROR | PASS | 测试：error 后 `getState()==='RECONNECTING'`，未到 ERROR |
| A11 | 退避延迟指数增长（1000→2000…）用注入 Clock 验证 | PASS | 测试：`clock.timeouts` 末尾项 1000 → 2000 |
| A12 | 退避延迟封顶 30000ms | PASS | 测试：连续 6 次失败后 `clock.timeouts` 末尾项 = 30000 |
| A13 | `disconnect()` 取消挂起重连定时器，不再发起新尝试 | PASS | 测试：disconnect 后 `clearTimeout` 被调用，runTimer no-op，instances 不增 |
| A14 | 成功重连后下次 `session_reconnect` 首次延迟重新 1000ms | PASS | 测试：第二 episode 首次尝试延迟 = 1000 |
| A15 | `SUBSCRIBE_FAIL`（重连后）仍转 ERROR 不重试 | PASS | 测试：第二次订阅 400 → ERROR，fetch 恰 2 次 |
| A16 | 重连尝试不调用 `authPort.getAccessToken()` | PASS | 测试：全程 `getAccessToken` 恰 1 次（初始 connect） |
| A17 | 公开签名（Config/Client/State/Notification）未变 | PASS | 源码 diff 仅内部实现；typecheck 全绿 |
| A18 | 未新增第三方 npm 依赖 | PASS | 零新增；`package.json`/`pnpm-lock.yaml` 无 diff |
| A19 | `DECISIONS.md` 存在，覆盖第 6 节全部要点 | PASS | D1（退避参数）/D2（无限重试）/D3（不重取 token）/D4（不改既有路径） |
| A20 | `specs/dev/DEV-045/` 文档齐全，INDEX T001–T003 全勾，Status=READY_FOR_REVIEW | PASS | 五份齐全；INDEX Task 全勾 + Status 更新（§7） |
| A21 | `git log` 新增恰 1 条提交，首行 `DEV-045: twitch reconnect (exponential backoff)` | PASS | 本次交付 commit 核验（§7） |
| A22 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在工作区但未提交 | PASS | commit 后 `git status --porcelain`（见 §8） |
| A23 | `PROJECT_INDEX.md`/`DAG.md`/`tasks/**`/`audit/**`/`protocol/**` 未修改 | PASS | 交付 diff 为空（见 §6 Scope Check） |

## 6. Scope Check

只施工 DEV-045。没有推进任何其他 DEV 节点；没有改动
`CONNECTING`/`WELCOME`/`SUBSCRIBING`/`CONNECTED`/`DEGRADED`/`ERROR`
六个状态的 `on:` 转移表（只扩展 RECONNECTING 自身，D4）；没有让
`SUBSCRIBE_FAIL` 具备重试行为（保持转 ERROR）；重连不重新调用
`authPort.getAccessToken()`（D3，复用缓存 token，A16）；未实现固定
重试次数上限转 ERROR（D2 无限重试+封顶）；未新增第三方 npm 依赖
（A18）；未创建 `packages/ai-host`；未改任何公开签名（A17）。
`packages/platform-twitch/src/twitchAuth.ts`（DEV-040 冻结）、
`packages/runtime-kernel/**`、`packages/audio-engine/**`、`apps/renderer/**`
以及 `PROJECT_INDEX.md`/`DAG.md`/`tasks/**`/`audit/**`/`protocol/**`
均未修改。Constraints 1–8 全部遵守。

**Scope Deviations（申报，非越界）**：Writable Scope 列出的节点文档
`REQUIREMENTS.md` 与 `ACCEPTANCE.md` 由 Commander 预填于 `40c81b1`，本
节点未再改动（同 DEV-041/042/043/044 先例）；REPORT.md 为 T001 新建
模板 → T002 回填。T002 实施期间修复了一处自加测试的类型问题（A16 的
`vi.fn` 直构 authPort 破坏 `ok:true` 判别联合，改为 `vi.fn(fakeAuthPort
(true).getAccessToken)` 包装，保留联合类型同时可计数），属测试自修复、
不触既有断言。无其他申报。此申报与 DEV-035/036/040/041/042/043/044 对
Commander 预填文件的处理先例一致。

## 7. Commit

提交信息首行：`DEV-045: twitch reconnect (exponential backoff)`。

`DECISIONS.md` 已包含在该提交中。LEDGER 追加行与 NODE_REPORT 消息文件
（`specs/comms/`）已写入工作区但**未提交**，留给 Commander 收尾统一提交
（Constraint 7 / A22）。

## 8. Handoff

NODE_REPORT 发往 `AUDITOR`，抄送 `COMMANDER`；审核锚点与交付快照见
`specs/comms/0194-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-045.md`。
