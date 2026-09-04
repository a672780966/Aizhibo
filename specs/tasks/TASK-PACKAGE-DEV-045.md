# TASK PACKAGE — DEV-045

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-045 |
| Node Name | Twitch Reconnect |
| Milestone | M4 — Twitch Complete（第六个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-041（DONE，`verdict_ref: "0175"`）——`RECONNECTING` 状态本节点唯一实现方 |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### 现实核对：`eventSubClient.ts` 的 `RECONNECTING` 是已冻结拓扑里唯一被显式留空的状态

`packages/platform-twitch/src/eventSubClient.ts`（DEV-041 冻结，`verdict_ref:
"0175"`）第 158-163 行：`RECONNECTING` 只有 `DISCONNECT` 一条边，注释原文
"只转状态，不实现真正重连到 `payload.session.reconnect_url`（DEV-045 职责）"；
第 234-235 行 `createSubscription()` 注释"不重试（DEV-045 职责）"。第 335-337
行 `session_reconnect` 帧处理只 `actor.send({type:'RECONNECT_SIGNAL'})`，
不解析 `payload.session.reconnect_url`。Dev Spec 第 45 节"必须支持"列出
五项：`Keepalive watchdog`（DEV-041 已做）、`Twitch requested reconnect`
（本节点）、`OAuth refresh`（`TwitchAuthPort.getAccessToken()` 每次
`connect()` 内部调用即天然覆盖，见下方范围核对）、`Event dedupe`
（DEV-043 已做）、`Exponential backoff`（本节点）。第 2070 行"Platform
reconnect count"是 M6 指标节点的职责，不在本节点范围。

### 范围核对：只实现 `RECONNECTING` 状态自身的真实重连行为，不触碰已审计通过的 `WS_ERROR→ERROR` 路径

`eventSubClient.test.ts` 已有大量断言依赖现有拓扑（`WS_ERROR` 从
`CONNECTING`/`WELCOME`/`SUBSCRIBING`/`CONNECTED`/`DEGRADED` 一律转
`ERROR`，`SUBSCRIBE_FAIL` 转 `ERROR`），这些是 DEV-041 两轮审计
（`AUDIT_FAIL`→`FIX-01`→`AUDIT_PASS`）逐条验证过的行为，**本节点不得
改动**（零回归红线）。本节点只扩展 `RECONNECTING` 自己的 `on:` 转移表
（新增 `WELCOME_RECEIVED`/`WS_ERROR` 两条边，均是"进入 RECONNECTING 之后
才生效"的新分支，不影响其余七个状态各自的转移表——XState 的 `on:` 是
按状态各自作用域生效，不存在全局覆盖风险）。真正的重连尝试复用既有
`openSocket()`/`handleFrame()` 机制打一个新 WebSocket，成功收到
`session_welcome` 走 `RECONNECTING→WELCOME`（新边）→ 之后完全复用既有
`WELCOME→SUBSCRIBING→CONNECTED` 逻辑（不用改）；尝试失败（新 socket 的
`error`/非本地 `close`）在 `RECONNECTING` 自己的 `on:WS_ERROR` 分支里
处理为"停留原状态 + 安排下一次退避重试"，不发生到 `ERROR` 的转移
（`ERROR` 状态本身的语义/边完全不改）。`SUBSCRIBE_FAIL`（重连后走到
`SUBSCRIBING` 又订阅失败）仍然按既有边转 `ERROR`、不重试——订阅失败
更可能是权限/参数错误而非网络抖动，重试掩盖真实配置问题，属于本节点
明确排除项。

`OAuth refresh` 在真实 Twitch `session_reconnect` 语义里不需要重新
获取 token（同一 WebSocket 会话身份延续，只是换一个连接地址），本节点
重连尝试**不**重新调用 `authPort.getAccessToken()`（复用 `connect()`
首次建连时已经拿到并存在闭包里的 `accessToken`）——这与真实协议行为
一致，`OAuth refresh` 需求已经被"每次全新 `connect()` 都会取一次 token"
覆盖，不是本节点要新增的职责。

---

## 2. 架构设计

### 2.1 `packages/platform-twitch/src/eventSubClient.ts`（修改，不改导出签名）

`EventSubClientConfig`/`EventSubClient`/`EventSubClientState`/
`TwitchChatNotification` 等公开类型/接口签名**全部不变**——本节点只改
内部实现与状态机的 `RECONNECTING` 转移表，`createEventSubClient` 的
输入输出契约保持冻结。

- **状态机改动**（仅 `RECONNECTING` 块）：

  ```typescript
  RECONNECTING: {
    on: {
      WELCOME_RECEIVED: { target: 'WELCOME' },
      WS_ERROR: { actions: [] }, // 停留原状态，由 action 安排下一次退避重试
      DISCONNECT: { target: 'DISCONNECTED' },
    },
  },
  ```

  其余七个状态的 `on:` 转移表**逐字节不改动**。

- **`session_reconnect` 帧处理**（`handleFrame` 内，替换现有分支）：
  解析 `payload.session.reconnect_url`（`typeof === 'string'` 才采用，
  否则回退到 `config.wsUrl ?? 默认值`），存入闭包变量
  `reconnectTargetUrl`；`actor.send({type:'RECONNECT_SIGNAL'})`（边不变，
  仍是 `WELCOME`/`SUBSCRIBING`/`CONNECTED` → `RECONNECTING`）；紧接着
  调用新函数 `beginReconnectAttempt()` 启动第一次重连尝试（退避延迟
  初值，见下）。

- **重连退避引擎**（新增闭包状态与函数，均为模块内私有实现细节）：
  - `reconnectDelayMs`：当前待用的退避延迟，初值 `1000`（1 秒）。
  - `reconnectTimerId`：当前挂起的退避定时器句柄（复用现有
    `schedule()`/`cancel()`，即注入的 `config.clock` 或真实
    `setTimeout`/`clearTimeout`）。
  - `beginReconnectAttempt()`：`schedule(() => attemptReconnect(),
    reconnectDelayMs)` 存入 `reconnectTimerId`；下次调用前
    `reconnectDelayMs = Math.min(reconnectDelayMs * 2, 30000)`（指数
    退避，倍数 2，上限 30 秒——Dev Spec 未给出具体数值，属工程默认值，
    记录于 `DECISIONS.md`）。
  - `attemptReconnect()`：若 `actor.getSnapshot().value !== 'RECONNECTING'`
    直接返回（已被 `disconnect()` 或其他事件打断）；否则关闭旧 socket
    （`locallyClosed = true; socket?.close(); socket = null`，与现有
    `disconnect()` 的关闭方式一致，避免旧 socket 的 `close`/`error`
    触发多余的 `WS_ERROR`），随后 `socket = new
    WebSocketImpl(reconnectTargetUrl ?? wsUrl)`，重新挂
    `message`/`error`/`close` 三个监听器（与 `openSocket()` 完全相同的
    监听器逻辑，可直接复用 `openSocket()` 本体，只是构造用的 URL 换成
    `reconnectTargetUrl ?? wsUrl`——重构 `openSocket(url?: string)` 接受
    可选 URL 参数，默认 `wsUrl`，两处调用点都改为传参数）。
  - 重连尝试的新 socket 收到 `session_welcome` → 走既有 `handleFrame`
    的 `session_welcome` 分支（`actor.send({type:'WELCOME_RECEIVED'})`
    → `RECONNECTING` 新边 → `WELCOME`），此时**重置**
    `reconnectDelayMs = 1000`（为下一次可能发生的重连episode 重新计时）
    与清空 `reconnectTargetUrl = undefined`。
  - 新 socket 在收到 `welcome` 之前 `error`/非本地 `close` → 现有
    `openSocket()` 监听器 `actor.send({type:'WS_ERROR'})` → 命中
    `RECONNECTING` 新边（停留原状态）→ 该边的 action 调用
    `beginReconnectAttempt()` 安排下一次尝试（`reconnectDelayMs` 已经
    翻倍）。
  - `disconnect()` 扩展：额外 `if (reconnectTimerId !== undefined) {
    cancel(reconnectTimerId); reconnectTimerId = undefined; }`，并重置
    `reconnectDelayMs = 1000; reconnectTargetUrl = undefined`——确保
    主动断开后不会再有迟到的重连尝试或残留的退避倍数。

---

## 3. Scope

### Writable Scope

```
packages/platform-twitch/src/eventSubClient.ts        （修改，签名不变）
packages/platform-twitch/src/eventSubClient.test.ts   （新增测试，既有测试不得删改）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-045/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交，同 Constraint 7）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/platform-twitch/src/twitchAuth.ts（DEV-040 冻结，TwitchAuthPort 形状参照）
packages/platform-core/**（DEV-042/044 冻结，本节点不消费）
其余同既有节点惯例
```

### Forbidden Scope

```
修改 EventSubClientConfig/EventSubClient/EventSubClientState/TwitchChatNotification 的公开签名
修改/删除 eventSubClient.test.ts 中 DEV-041 既有的任何断言（只能新增）
改动 CONNECTING/WELCOME/SUBSCRIBING/CONNECTED/DEGRADED/ERROR 六个状态各自的 on: 转移表
让 SUBSCRIBE_FAIL 具备重试行为（保持转 ERROR，不重试）
重连尝试时重新调用 authPort.getAccessToken()（复用已缓存的 accessToken）
引入固定重试次数上限后转 ERROR（本节点采用无限重试+封顶退避，不做"放弃"逻辑）
新增任何第三方 npm 依赖
创建 packages/ai-host
```

---

## 4. Required Skills

### Required

- XState v5 状态机内单个状态转移表的局部扩展（不改变其余状态）
- 指数退避定时器模式（复用既有 `schedule()`/`cancel()`/注入 `Clock`）

### Forbidden / Unnecessary

- 任何真实网络请求（测试仍须 100% 注入 `webSocketImpl`/`fetchImpl`/`clock`）
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/baseline/DEV_SPEC_V1.0.md` 第 1744-1764 行（第 45 节） | 八态拓扑权威列表 + "必须支持"五项 |
| `packages/platform-twitch/src/eventSubClient.ts`（DEV-041 冻结主体，本节点在其基础上做局部扩展） | 现有 `RECONNECTING`/`openSocket`/`handleFrame`/`disconnect` 实现 |
| `packages/platform-twitch/src/eventSubClient.test.ts`（DEV-041 冻结，只能新增不能改） | 既有断言基线，零回归红线 |

---

## 6. Outputs

1. `eventSubClient.ts` 的 `RECONNECTING` 真实重连行为（Twitch 主动
   `session_reconnect` 触发，指数退避重试，成功后无缝回到既有
   `WELCOME→SUBSCRIBING→CONNECTED` 流程）
2. `specs/dev/DEV-045/DECISIONS.md`，至少覆盖：为何退避参数选
   1000ms/×2/封顶 30000ms、为何无限重试不设上限转 ERROR、为何重连
   不重新取 token、为何不改动 WS_ERROR→ERROR 既有路径

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-045/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Acceptance**：四文件存在；`INDEX.md` 含 Task Order T001–T003。

---

### T002 — `eventSubClient.ts` 重连实现 + 测试

- **Allowed Files**：`packages/platform-twitch/src/eventSubClient.ts`、`.test.ts`
- **Requirements**：按第 2.1 节实现。全部 WebSocket/定时器行为必须通过
  `webSocketImpl`/`clock` 注入测试，**测试不得发出任何真实网络连接**。
  既有测试文件里 DEV-041 的断言逐条保留，不得修改/删除，只能新增。
- **Acceptance**：
  - `session_reconnect` 帧（`payload.session.reconnect_url` 为某字符串）
    → 转 `RECONNECTING` → 用假 `webSocketImpl` 断言新构造的 socket 使用
    的 URL 就是该 `reconnect_url`（不是默认 `wsUrl`）。
  - `session_reconnect` 帧缺失 `reconnect_url` → 新连接回退使用默认
    `wsUrl`。
  - 新 socket 成功收到 `session_welcome` → 依次转
    `RECONNECTING→WELCOME→SUBSCRIBING→CONNECTED`（用假 `fetchImpl`
    驱动订阅 202），且旧 socket 的 `close()` 被调用恰一次（重连开始时
    关闭旧连接）。
  - 新 socket 在收到 welcome 之前触发 `error` → 保持 `RECONNECTING`
    （`getState()` 断言未跳到 `ERROR`），用注入 `Clock` 快进
    `1000ms` → 断言发起了第二次重连尝试（第二个新 socket 被构造）。
  - 连续两次尝试失败 → 用 `Clock` 观测两次退避延迟分别为
    `1000ms`/`2000ms`（指数增长，倍数 2）。
  - 人为制造多次连续失败使延迟增长超过 `30000ms` → 断言延迟被封顶在
    `30000ms`，不再继续增长。
  - `RECONNECTING` 期间（挂起退避定时器等待中，或某次尝试的 socket 已
    打开但未收到 welcome）调用 `disconnect()` → 转 `DISCONNECTED`；用
    `Clock` 快进任意时长后断言**不再**发起任何新的重连尝试（定时器已被
    取消）。
  - 一次完整重连成功（走到 `CONNECTED`）后，**再次**触发
    `session_reconnect` → 断言这次的第一次尝试延迟重新从 `1000ms` 起算
    （不是延续上一 episode 结束时的封顶值）。
  - `SUBSCRIBE_FAIL`（重连后的 Helix 订阅失败）仍然转 `ERROR`，不触发
    任何重连尝试（回归既有语义，无重试）。
  - 既有 `WS_ERROR→ERROR`（从 `CONNECTING`/`WELCOME`/`SUBSCRIBING`/
    `CONNECTED`/`DEGRADED` 五个状态各自的路径）全部保持不变——运行既有
    测试零改动即可验证，不需要新增用例。

---

### T003 — 全量验证、REPORT 与 commit

- **Allowed Files**：`specs/dev/DEV-045/INDEX.md`、`REPORT.md`、`DECISIONS.md`
- **Requirements**：
  1. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  2. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  3. **`DECISIONS.md` 必须已提交**，覆盖第 6 节列出的全部要点。
  4. 更新 `INDEX.md`：T001–T003 全部勾选，`Status:` 从 `IN_PROGRESS` 改为 `READY_FOR_REVIEW`。
  5. `git add`（仅本节点 Writable Scope 内文件，不要用 `git add -A`）
     `&& git commit`，提交信息首行：`DEV-045: twitch reconnect (exponential backoff)`。
  6. **不要**在这次提交之后再单独提交 LEDGER 追加或自己的 NODE_REPORT
     消息文件——写好留在工作区未提交状态即可，由 Commander 收尾统一
     提交。
  7. 追加 LEDGER 行、写好 `NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-045.md`
     消息文件——**都不要提交**，只是写入工作区。
  8. **在结束前自行核实**：`git log -1` 只看到步骤 5 那一条提交、
     NODE_REPORT 消息文件已存在于工作区（未提交）、LEDGER 已追加对应行
     （未提交）。
  9. **STOP**。
- **Acceptance**：六条命令全部退出码 0；测试过程零真实网络连接；`git log`
  新增恰 1 条提交；提交之后 `git status --porcelain` 仍显示 LEDGER.md
  与新 comms 消息文件为未提交改动。

---

## 8. Node INDEX Requirements

```markdown
# DEV-045 INDEX

Status: IN_PROGRESS

## Current Node

DEV-045 — Twitch Reconnect

## Objective

实现 `eventSubClient.ts` 的 `RECONNECTING` 状态真实行为：Twitch
`session_reconnect` 帧触发后，用指数退避（1000ms 起，×2，封顶 30000ms，
无限重试不设上限）反复尝试连接到 `payload.session.reconnect_url`（缺失
时回退默认 `wsUrl`），成功收到新的 `session_welcome` 后无缝回到既有
`WELCOME→SUBSCRIBING→CONNECTED` 流程。不改动 `WS_ERROR→ERROR`/
`SUBSCRIBE_FAIL→ERROR` 既有语义，不重新获取 OAuth token。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 eventSubClient.ts 重连实现 + 测试
- [ ] T003 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已入库；
REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与 NODE_REPORT
消息文件已写入工作区但**未提交**。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **不改变 `EventSubClientConfig`/`EventSubClient`/`EventSubClientState`/`TwitchChatNotification` 的公开签名**。
2. **不修改/删除 `eventSubClient.test.ts` 中 DEV-041 既有的任何断言**，只能新增。
3. **不改动 `CONNECTING`/`WELCOME`/`SUBSCRIBING`/`CONNECTED`/`DEGRADED`/`ERROR` 六个状态各自的 `on:` 转移表**，只扩展 `RECONNECTING` 自己的转移表。
4. **`SUBSCRIBE_FAIL` 保持转 `ERROR`、不重试**。
5. **重连尝试不重新调用 `authPort.getAccessToken()`**，复用已缓存的 `accessToken`。
6. **不新增任何第三方 npm 依赖**。
7. **T003 提交后，LEDGER 追加行与自己的 NODE_REPORT 消息文件一律不要再提交**——写入工作区即可，留给 Commander 收尾统一提交。
8. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现固定次数上限后转 `ERROR`（放弃重连）的逻辑。
- 不实现重连时重新获取/刷新 OAuth token。
- 不改动 `WS_ERROR→ERROR`/`SUBSCRIBE_FAIL→ERROR` 既有语义。
- 不实现 Twitch 官方"双 socket 并存直至新 socket welcome 后再关旧连接"
  的完全协议合规握手（简化为"先关旧连接再开新连接"，工程简化，记录
  于 `DECISIONS.md`；对聊天消息处理的实际影响是重连窗口期内可能短暂
  丢失部分消息，可接受，因为已有 DEV-043 去重与整体"至少一次投递"
  容错设计，此窗口期消息丢失不是新增风险）。
- 不实现真正的发送消息（DEV-046）。

---

## 11. Tests

### Unit tests

T002：`reconnect_url` 使用/回退、重连成功全链路、失败退避重试、退避
延迟指数增长与封顶、`disconnect()` 取消挂起重连、重连成功后延迟重置、
`SUBSCRIBE_FAIL` 不重试。

### Regression tests

`pnpm test` 覆盖全 workspace；`eventSubClient.test.ts` 既有 DEV-041/
FIX-01 全部断言零改动通过；既有全部包测试零回归。

---

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归（含 DEV-041/FIX-01 断言逐条保留） | 命令输出 + diff 比对 |
| A07 | `session_reconnect` 帧携带 `reconnect_url` → 重连尝试的新 socket 使用该 URL | 测试检查 |
| A08 | `session_reconnect` 帧缺失 `reconnect_url` → 回退使用默认 `wsUrl` | 测试检查 |
| A09 | 重连成功全链路：`RECONNECTING→WELCOME→SUBSCRIBING→CONNECTED`，旧 socket `close()` 恰一次 | 测试检查 |
| A10 | 重连尝试失败（welcome 前 error/close）→ 停留 `RECONNECTING`，不跳 `ERROR` | 测试检查 |
| A11 | 退避延迟指数增长（1000→2000...），用注入 `Clock` 验证具体数值 | 测试检查 |
| A12 | 退避延迟封顶 `30000ms`，不无限增长 | 测试检查 |
| A13 | `disconnect()` 取消挂起的重连定时器，之后不再发起新尝试 | 测试检查 |
| A14 | 一次成功重连后，下次 `session_reconnect` 的首次延迟重新从 `1000ms` 起算 | 测试检查 |
| A15 | `SUBSCRIBE_FAIL`（重连后）仍转 `ERROR`，不重试 | 测试检查 |
| A16 | 重连尝试不调用 `authPort.getAccessToken()`（断言调用次数不因重连增加） | 测试检查 |
| A17 | `EventSubClientConfig`/`EventSubClient`/`EventSubClientState`/`TwitchChatNotification` 公开签名未变 | 源码/类型检查 |
| A18 | 未新增第三方 npm 依赖 | 文件检查 |
| A19 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A20 | `specs/dev/DEV-045/` 节点文档齐全，`INDEX.md` T001–T003 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A21 | `git log` 新增恰 1 条提交，首行 `DEV-045: twitch reconnect (exponential backoff)` | 命令 |
| A22 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A23 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归（尤其 DEV-041 既有
断言逐条保留）→ 填 REPORT → 仅 commit 代码+节点文档（一条提交）→ 写入
但不提交 LEDGER/NODE_REPORT → 自行核实完成三要素 → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A23。
