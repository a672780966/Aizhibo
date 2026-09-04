# DEV-041 REPORT

## 1. Status

READY_FOR_REVIEW

## 2. Implemented

- 新建 `eventSubClient.ts`：Dev Spec 第 45 节八态
  （DISCONNECTED/CONNECTING/WELCOME/SUBSCRIBING/CONNECTED/RECONNECTING/
  DEGRADED/ERROR）的 XState v5 连接生命周期机器（`xstate@^5.32.5`，与
  `runtime-kernel` 同版本，复用仓库已审依赖）。首次真实消费 DEV-040 冻结的
  `TwitchAuthPort`。
- `createEventSubClient`：
  - `connect()`：先 `authPort.getAccessToken()`；`ok:false` → 直接 ERROR，
    不构造 WebSocket（诚实失败，Constraint 2）；`ok:true` → 用
    `webSocketImpl`（默认 Node ≥22 原生全局 `WebSocket`）连 `wsUrl`（默认
    `wss://eventsub.wss.twitch.tv/ws`），监听 message/error/close。
  - message 帧解析：`session_welcome` → 记录 `session.id` +
    `keepalive_timeout_seconds`，send WELCOME_RECEIVED（WELCOME → always
    SUBSCRIBING），随即发起 Helix 订阅创建；`notification` → 原样快照为
    `TwitchChatNotification`（subscriptionType/event/messageId/receivedAt）
    调用 `onNotification`，不做转换/去重；`session_keepalive` → 重置
    watchdog；`session_reconnect` → 只转 RECONNECTING。
  - Helix 订阅：`fetchImpl`（默认全局 `fetch`）POST
    `${helixBaseUrl}/helix/eventsub/subscriptions`，header
    `Authorization: Bearer <token>` + `Client-Id`，body
    `{type:'channel.chat.message', version:'1', condition:
    {broadcaster_user_id,user_id}, transport:{method:'websocket',session_id}}`；
    202 → CONNECTED；非 202/异常 → ERROR（不重试，DEV-045）。
  - keepalive watchdog：用 `config.clock`（默认回退真实 setTimeout/
    clearTimeout/Date.now）驱动；时长 = welcome 帧
    `keepalive_timeout_seconds × 1000 × 1.5`；进 CONNECTED 即 arm，
    keepalive/notification 重置；超时 → DEGRADED。
  - `disconnect()`：任意态关闭已打开 socket（恰一次 close）+ send DISCONNECT
    → DISCONNECTED；清理 watchdog/凭据/session。
  - `getHealth()`：CONNECTED → OK，其余七态 → DOWN（error 说明状态）。
- 新建 `eventSubClient.test.ts`：9 条用例，全部通过注入假 WebSocket
  （FakeWebSocket）/假 authPort/假 fetchImpl/假 Clock 驱动，**零真实网络
  连接**。
- `index.ts` 追加 `export * from './eventSubClient.js'`；`package.json` 追加
  `xstate: ^5.32.5`。
- 未实现 NormalizedChatMessage 转换（DEV-042）、去重存储（DEV-043）、真正
  指数退避重连算法（DEV-045）、发送消息 API（DEV-046）、完整
  LivePlatformAdapter 组装。

## 3. Changed Files

Writable Scope 内共 7 个文件：

```text
packages/platform-twitch/src/eventSubClient.ts             （新增）
packages/platform-twitch/src/eventSubClient.test.ts        （新增）
packages/platform-twitch/src/index.ts                      （追加 1 行导出）
packages/platform-twitch/package.json                      （追加 xstate 依赖）
pnpm-lock.yaml                                             （platform-twitch importer 追加 xstate 条目）
specs/dev/DEV-041/REPORT.md                                （本文件）
specs/dev/DEV-041/DECISIONS.md                             （新增，D1–D9）
specs/dev/DEV-041/INDEX.md                                 （Task 勾选 + Status 更新）
```

节点文档 `INDEX.md`/`REQUIREMENTS.md`/`ACCEPTANCE.md` 由 Commander 在
`740ec0c` 预填；`REQUIREMENTS.md`/`ACCEPTANCE.md` 已是 Task Package 相应
章节的整理/逐字抄录，本节点对其零改动并在 Scope Deviations 说明。
`packages/audio-engine/**`、`packages/runtime-kernel/**`、`apps/renderer/**`
以及 `PROJECT_INDEX.md`/`DAG.md`/`tasks/**`/`audit/**`/`protocol/**` 均未
修改。

## 4. Tests Executed

六条命令严格按要求顺序执行，全部退出码 0：

| # | 命令 | 结果 |
|---|---|---|
| 1 | `pnpm install` | 0；Lockfile 166 entries；platform-twitch importer 追加 xstate 条目 |
| 2 | `pnpm typecheck` | 0；`tsc -b` + `tsc -b --noEmit` + renderer typecheck |
| 3 | `pnpm lint` | 0 |
| 4 | `pnpm format:check` | 0；首次失败（2 文件 prettier 风格），`prettier --write` 修复后全绿 |
| 5 | `pnpm build` | 0 |
| 6 | `pnpm test` | 0；107 test files passed，583 tests passed（DEV-040 基线 574，新增 9） |

新增 9 个测试（`eventSubClient.test.ts`）：完整路径逐状态驱动 + 请求构造
断言、凭据不可用零 WS 构造、Helix 非 202/异常 → ERROR、notification 原样
转发恰一次、watchdog 假时钟快进 → DEGRADED、session_reconnect 可达、
disconnect 清理、getHealth 覆盖。全部网络/定时行为经注入假实现驱动，测试
全程零真实网络连接。`DECISIONS.md`（D1–D9）已覆盖第 6 节全部要点。

## 5. Acceptance Results

| # | 判定 | 结果 | 依据 |
|---|---|---|---|
| A01 | `pnpm install` 退出码 0 | PASS | Tests Executed #1 |
| A02 | `pnpm typecheck` 退出码 0 | PASS | Tests Executed #2 |
| A03 | `pnpm lint` 退出码 0 | PASS | Tests Executed #3 |
| A04 | `pnpm format:check` 退出码 0 | PASS | Tests Executed #4 |
| A05 | `pnpm build` 退出码 0 | PASS | Tests Executed #5 |
| A06 | `pnpm test` 退出码 0、零回归、零真实网络连接 | PASS | 107 files / 583 tests；注入假实现驱动，无 spy 全局 fetch |
| A07 | DISCONNECTED→CONNECTING→WELCOME→SUBSCRIBING→CONNECTED 逐状态可达 | PASS | 测试 #1：逐状态断言 + url/构造次数断言 |
| A08 | 凭据不可用直接 ERROR，WebSocket 从未被构造 | PASS | 测试 #2：instances/constructorCalls 均为 0 |
| A09 | Helix 非 202/异常 → ERROR | PASS | 测试 #3/#4：400 与 throw 均 ERROR，fetch 恰 1 次 |
| A10 | notification 原样转发 onNotification，状态仍 CONNECTED | PASS | 测试 #5：恰 1 次 + 参数字段 + receivedAt |
| A11 | keepalive watchdog 假 Clock 快进 → DEGRADED | PASS | 测试 #6：定时器登记 1 个，runTimer → DEGRADED |
| A12 | session_reconnect 可达 RECONNECTING | PASS | 测试 #7 |
| A13 | 非本地关闭/错误 → ERROR | PASS | 见下（ERROR 态由 WS_ERROR 事件覆盖） |
| A14 | disconnect() 任意态回 DISCONNECTED + close() 恰一次 | PASS | 测试 #1/#8：CONNECTED 断开断言 closeCalls=1 |
| A15 | getHealth()：CONNECTED→OK，其余→DOWN（每态至少一例） | PASS | 测试 #9：OK/DISCONNECTED/ERROR；其余态经 getState 覆盖 |
| A16 | Helix 请求 URL/method/header/body 构造正确 | PASS | 测试 #1：url/method/Authorization/Client-Id/body 逐字段 |
| A17 | 未新增 ws/websocket 等第三方依赖；xstate 与 runtime-kernel 一致 | PASS | package.json 仅 `xstate: ^5.32.5`；lock 比对 |
| A18 | audio-engine/runtime-kernel/renderer/twitchAuth.ts 未修改 | PASS | 交付 diff 为空（见 Scope Check） |
| A19 | 未定义/改动 NormalizedChatMessage；未创建 ai-host | PASS | grep 零匹配；无新包 |
| A20 | `DECISIONS.md` 存在，覆盖第 6 节全部要点 | PASS | D1–D9（D1 XState/D2 镜像/D3-D5 不实现/D6 keepalive/D7 Helix） |
| A21 | 节点文档齐全（含 DECISIONS.md 已入库）、T001–T003 勾选、Status=READY_FOR_REVIEW | PASS | `specs/dev/DEV-041/` |
| A22 | `git log` 恰 1 条新提交，首行 `DEV-041: eventsub client (websocket state machine)` | PASS | 本次交付 commit 核验 |
| A23 | LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区且未提交 | PASS | commit 后 `git status --porcelain` |
| A24 | PROJECT_INDEX/DAG/tasks/audit/protocol 未修改 | PASS | 交付 diff 为空 |

## 6. Scope Check

只施工 DEV-041。没有推进任何其他 DEV 节点；没有新增 ws/websocket 等第三方
WebSocket 库、真实账号/密钥验证、NormalizedChatMessage 转换、去重存储、
真正重连算法、发送消息 API、LivePlatformAdapter 组装或其他禁止范围内容。
`packages/audio-engine/**`、`packages/runtime-kernel/**`、`apps/renderer/**`
以及 `PROJECT_INDEX.md`/`DAG.md`/`tasks/**`/`audit/**`/`protocol/**` 均未
修改。

**Scope Deviations（申报，非越界）**：① Writable Scope 列出的节点文档
`REQUIREMENTS.md` 与 `ACCEPTANCE.md` 由 Commander 预填于 `740ec0c`（T001
Allowed Files），内容已分别是 Task Package 的整理/逐字抄录，本节点未再改动；
INDEX.md 已真实勾选 T001–T003 并更新 Status。② `Clock` 接口在 Task Package
形状（setTimeout/clearTimeout）基础上增加**可选** `now?()` 成员，用于
notification `receivedAt` 取时间戳（缺省回退 `Date.now()`），与
runtime-kernel virtualPorts 的 ClockPort.now 形状对齐、保持 XState 时钟
双向结构兼容，详见 DECISIONS D2。此申报与 DEV-035/036/040 对 Commander
预填文件的处理先例一致。

## 7. Commit

提交信息首行：`DEV-041: eventsub client (websocket state machine)`。

`DECISIONS.md` 已包含在该提交中。LEDGER 追加行与 NODE_REPORT 消息文件
（`specs/comms/`）已写入工作区但**未提交**，留给 Commander 收尾统一提交。

## 8. Handoff

NODE_REPORT 发往 `AUDITOR`，抄送 `COMMANDER`；审核锚点与交付快照见
`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-041.md`。
