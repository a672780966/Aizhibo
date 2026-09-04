# TASK PACKAGE — DEV-041

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-041 |
| Node Name | EventSub Client |
| Milestone | M4 — Twitch Complete（第二个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-040（DONE，`verdict_ref: "0168"`）——本节点是 `TwitchAuthPort` 的第一个真实消费方 |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### USER 已裁决：不绑定真实账号/密钥，占位实现即可（沿用标准指令）

与 DEV-040 相同：不强迫 USER 现在配置真实 Twitch 凭据/broadcaster ID。本节点
的 WebSocket/HTTP 调用全部走可注入的假实现测试，**测试全程零真实网络连接**；
真实凭据缺失时的行为已由 DEV-040 的 `createOptionalTwitchAuthProvider`
处理（返回 `noopTwitchAuthPort`，`getAccessToken()` 恒为
`{ok:false,reason:...}`），本节点在拿不到 access token 时必须诚实转
`ERROR`/`DEGRADED`，不得假装连接成功。

### 现实核对：仓库现状与本节点边界

`packages/platform-twitch/`（DEV-040 建立）目前只有 `twitchAuthPort` 相关
四个符号，没有任何 WebSocket/HTTP 客户端代码。全仓库 grep `NormalizedChatMessage`
零匹配——这个类型**从未被定义过**，只在 `DAG.md` 第 242 行的产品性文字
（"Runtime 核心只认 `NormalizedChatMessage`"）里提到过其字段形状
（platform/viewerId/messageId/text/receivedAt）。`DAG.md` 把它列为
**DEV-042（Chat Message Adapter）**的产出，不是本节点的。`DAG.md` CR-017
裁决明确"窄化核心消费面"——Twitch 的 structured fragments/badge/emote 等
一律在 Adapter 内消化，本节点属于"Adapter 内部"，尚不产出任何 Runtime 核心
认识的类型。

`DAG.md` 第 232-238 行把 M4 拆成 7 个节点，`DEV-043`（Message Deduplication，
"必须做"）与 `DEV-045`（Twitch Reconnect）是**独立于本节点的后续节点**——
Dev Spec 第 45 节"必须支持"列表里的 `Event dedupe`/`Exponential backoff`
分别是它们的职责，本节点只需要让状态机可以**进入**
`RECONNECTING`/`DEGRADED`（可达性，参照 DEV-009 VERDICT F-04 的教训——
状态存在但从未被真实代码路径进入是 BLOCKING 级缺陷），不需要实现真正的
指数退避重试算法或去重存储。

`packages/` 下没有 `ws`/`websocket` 之类的第三方库依赖（全仓库 grep 零
匹配）；根 `package.json` 声明 `"node": ">=22"`，Node ≥22 原生全局提供
`WebSocket`（基于 undici）与 `fetch`——两者都无需新增依赖。
`packages/runtime-kernel/package.json` 已经依赖 `xstate@^5.32.5`；本节点
沿用同一版本号，把 EventSub 连接生命周期建模为 XState 机器，与
`interactionRegion.ts`/`audioRegion.ts` 的既有工程风格一致（这不是"新增
未经审查的依赖"，是复用项目已经采用、已经审过的库）。

### 范围核对：只做"连上 WS + 建 Helix 订阅 + 收到 notification 原样转发"

Dev Spec 第 44 节：Twitch Adapter 首发使用 `EventSub WebSocket + Twitch API`；
Chat 走 `channel.chat.message` 订阅类型，回复走 Send Chat Message API（**本
节点不做回复，那是 DEV-046**）。第 45 节状态列表
`DISCONNECTED/CONNECTING/WELCOME/SUBSCRIBING/CONNECTED/RECONNECTING/
DEGRADED/ERROR` 是本节点唯一要落地的状态拓扑。**本节点不做**：
`NormalizedChatMessage` 转换（DEV-042）、去重存储（DEV-043）、真正的指数
退避重连算法（DEV-045）、发送消息 API（DEV-046）、`LivePlatformAdapter`
接口组装（第 43 节定义的完整 `connect/disconnect/onChat/sendChat/
getHealth`，是 041/042/046 多节点合起来才能拼出的东西，本节点只交付其中
"收"这一半的最底层原始实现）。

---

## 2. 架构设计

### 2.1 `packages/platform-twitch/src/eventSubClient.ts`——连接生命周期 XState 机器

```typescript
export type EventSubClientState =
  | 'DISCONNECTED' | 'CONNECTING' | 'WELCOME' | 'SUBSCRIBING'
  | 'CONNECTED' | 'RECONNECTING' | 'DEGRADED' | 'ERROR';

export interface TwitchChatNotification {
  subscriptionType: string;   // 原样保留 payload.subscription.type，本节点只处理 'channel.chat.message'
  event: unknown;              // 原样保留 payload.event，不做任何字段映射（DEV-042 职责）
  messageId: string;           // 原样保留 metadata.message_id（供 DEV-043 去重使用，本节点不去重）
  receivedAt: number;
}

export interface EventSubClientConfig {
  authPort: TwitchAuthPort;       // 复用 DEV-040 冻结接口
  clientId: string;
  broadcasterUserId: string;
  userId: string;                 // channel.chat.message 的 condition.user_id（bot 自己的 user id）
  wsUrl?: string;                 // 测试注入，默认 wss://eventsub.wss.twitch.tv/ws
  helixBaseUrl?: string;          // 测试注入，默认 https://api.twitch.tv
  webSocketImpl?: typeof WebSocket; // 测试注入
  fetchImpl?: typeof fetch;         // 测试注入
  clock?: Clock;                    // 测试注入，复用 DEV-037 冻结的 Clock 接口（runtime-kernel 导出）
  onNotification?: (n: TwitchChatNotification) => void;
}

export interface EventSubClient {
  connect(): void;
  disconnect(): void;
  getState(): EventSubClientState;
  getHealth(): Health;   // CR-019：CONNECTED→OK，其余→DOWN
}

export function createEventSubClient(config: EventSubClientConfig): EventSubClient
```

- 状态转移（对应 Dev Spec 第 45 节八态，本节点唯一权威拓扑）：
  - `DISCONNECTED` --`connect()`--> `CONNECTING`：先调用
    `authPort.getAccessToken()`；`ok:false` → 直接转 `ERROR`（诚实失败，
    不打开 WebSocket）；`ok:true` → 用 `webSocketImpl`（默认全局
    `WebSocket`）打开到 `wsUrl` 的连接。
  - `CONNECTING` 收到 `session_welcome` → `WELCOME`，记录
    `payload.session.id`。
  - `WELCOME` 自动（同一逻辑步骤内）转 `SUBSCRIBING`：用
    `fetchImpl` POST `${helixBaseUrl}/helix/eventsub/subscriptions`
    （header `Authorization: Bearer <access_token>` + `Client-Id`，body
    `{type:'channel.chat.message', version:'1', condition:{broadcaster_user_id,user_id}, transport:{method:'websocket',session_id}}`）。
    202 → `CONNECTED`；非 202 或网络异常 → `ERROR`（不重试，重试是
    DEV-045 的职责）。
  - `CONNECTED` 收到 `notification`（`metadata.message_type ===
    'notification'`）→ 保持 `CONNECTED`，原样构造
    `TwitchChatNotification` 并调用 `config.onNotification`（若提供）；
    **不做任何去重、不做字段转换**。
  - `CONNECTED` 收到 `session_keepalive` → 保持 `CONNECTED`，重置一个
    用 `config.clock`（默认真实时钟）驱动的 watchdog 定时器
    （`keepalive_timeout_seconds` 来自 welcome payload，超时未收到任何
    消息 → 转 `DEGRADED`）。
  - `CONNECTED`/`WELCOME`/`SUBSCRIBING` 收到 `session_reconnect` → 转
    `RECONNECTING`（**只转状态，不实现真正重连到
    `payload.session.reconnect_url` 的逻辑**——那是 DEV-045 的职责）。
  - WebSocket 层 `error`/意外 `close` 事件（非本地调用
    `disconnect()` 触发）→ 转 `ERROR`。
  - `disconnect()`：任意状态下主动调用 → 关闭 WebSocket（若有）→
    `DISCONNECTED`。
  - `getHealth()`：`CONNECTED` → `OK`；其余七态 → `DOWN`（`error` 字段
    说明当前状态），复用 `packages/shared/src/health.ts` 的 `Health`
    契约（本地镜像，与 DEV-035/040 先例一致，不引入 workspace 依赖）。
- **零新增 npm 依赖**：Node ≥22 原生 `WebSocket`/`fetch`；`xstate` 已是
  仓库既有依赖（`runtime-kernel` 同版本 `^5.32.5`），本节点是
  `platform-twitch` 第一次依赖它，属于"复用已审查库"而非新引入未审查
  第三方库。
- 所有网络行为（WebSocket 消息收发、Helix HTTP 调用、定时器）必须可通过
  `webSocketImpl`/`fetchImpl`/`clock` 完全注入假实现测试，**测试全程零
  真实网络连接**。

---

## 3. Scope

### Writable Scope

```
packages/platform-twitch/src/eventSubClient.ts        （新增）
packages/platform-twitch/src/eventSubClient.test.ts   （新增）
packages/platform-twitch/src/index.ts                 （追加导出）
packages/platform-twitch/package.json                 （追加 xstate 依赖，版本与 runtime-kernel 一致）
pnpm-lock.yaml                                         （因新增依赖必然变化——本节点显式声明，弥补 DEV-040 的疏漏）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-041/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，且**追加后不要再单独提交**——见第 9 节 Constraint 8）
```

### Read-only Scope

```
packages/platform-twitch/src/twitchAuth.ts（DEV-040 冻结，只读取 TwitchAuthPort 类型与 noopTwitchAuthPort）
packages/runtime-kernel/src/virtualPorts.ts（DEV-037 冻结，只读取 Clock 类型定义参照，不得 import 跨包——本节点在自己包内本地镜像 Clock 接口，与 Health 类型的处理方式一致）
packages/shared/src/health.ts（Read-only）
其余同既有节点惯例
```

### Forbidden Scope

```
定义或改动 NormalizedChatMessage（DEV-042 的职责）
实现去重存储（DEV-043 的职责）
实现真正的指数退避重连算法（DEV-045 的职责，本节点只需转 RECONNECTING 状态）
实现发送消息 API（DEV-046 的职责）
组装完整 LivePlatformAdapter（connect/disconnect/onChat/sendChat/getHealth 拼接，多节点合作产物）
新增 ws/websocket 等第三方 WebSocket 库（Node 原生 WebSocket 已足够）
修改 packages/audio-engine/**、packages/runtime-kernel/**、apps/renderer/**
修改 packages/platform-twitch/src/twitchAuth.ts（DEV-040 冻结）
创建 packages/ai-host
```

---

## 4. Required Skills

### Required

- Node 原生 `WebSocket`/`fetch` 客户端编程，含事件监听（`message`/`open`/`close`/`error`）
- XState v5（`createMachine`/`createActor`/`assign`），复用项目既有风格（`runtime-kernel` 的 region 写法）
- 可注入时钟/WebSocket 构造器/fetch 的测试设计（复用 DEV-037/DEV-035/040 的注入模式）

### Forbidden / Unnecessary

- 任何第三方 WebSocket 客户端库（`ws`/`socket.io` 等）
- 任何 Twitch 官方/第三方 SDK
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/baseline/DEV_SPEC_V1.0.md` 第 43/44/45 节 | EventSub 协议方向、八态拓扑、必须支持能力清单的产品依据 |
| `packages/platform-twitch/src/twitchAuth.ts`（Read-only，DEV-040 冻结） | `TwitchAuthPort`/`noopTwitchAuthPort` 契约，本节点唯一的凭据来源 |
| `packages/runtime-kernel/src/virtualPorts.ts`（Read-only） | `Clock`/`instantClock` 接口形状参照（本地镜像，不跨包 import） |
| `packages/shared/src/health.ts`（Read-only） | `Health` 类型契约 |
| `packages/runtime-kernel/package.json`（Read-only） | `xstate` 版本号参照，保持 monorepo 内版本一致 |
| USER 裁决记录（本文件第 1 节） | 不绑定真实账号，占位/可选凭据处理方式沿用 DEV-040 |

---

## 6. Outputs

1. `EventSubClientState`/`TwitchChatNotification`/`EventSubClientConfig`/`EventSubClient`/`createEventSubClient`（`eventSubClient.ts`）
2. `packages/platform-twitch/package.json` 新增 `xstate` 依赖（与 `runtime-kernel` 同版本）
3. `specs/dev/DEV-041/DECISIONS.md`，至少覆盖：为何用 XState 建模连接生命周期
   （复用项目既有工程风格，而非新造一套状态机制）、为何 Clock/Health 本地
   镜像而不跨包 import（与 DEV-035/037/040 先例一致）、为何不实现真正重连/
   去重/发送（各自留给 DEV-045/043/046）、`keepalive_timeout_seconds` 从
   welcome payload 读取而非硬编码的理由、Helix 订阅创建请求的构造依据

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-041/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Acceptance**：四文件存在；`INDEX.md` 含 Task Order T001–T003。

---

### T002 — `eventSubClient.ts` + 测试

- **Allowed Files**：`packages/platform-twitch/src/eventSubClient.ts`、`.test.ts`、`packages/platform-twitch/package.json`
- **Requirements**：按第 2.1 节实现八态机器。全部 WebSocket/HTTP/定时器
  行为必须通过 `webSocketImpl`/`fetchImpl`/`clock` 注入测试，**测试不得
  发出任何真实网络连接或请求**。
- **Acceptance**：
  - 用假 `webSocketImpl`（可控制何时触发 `open`/`message`/`close`/`error`
    事件）+ 假 `fetchImpl`（可控制 Helix 订阅调用的响应）驱动出完整路径：
    `DISCONNECTED→CONNECTING→WELCOME→SUBSCRIBING→CONNECTED`，逐状态断言。
  - `authPort.getAccessToken()` 返回 `ok:false`（如 `noopTwitchAuthPort`）
    → `connect()` 后直接转 `ERROR`，**断言 `webSocketImpl` 从未被构造**
    （不发起任何连接尝试）。
  - Helix 订阅调用非 202 或抛异常 → 转 `ERROR`。
  - 收到 `notification` 帧 → `onNotification` 被调用恰一次，参数字段
    （`subscriptionType`/`event`/`messageId`）与注入的假消息一致；状态
    仍为 `CONNECTED`。
  - 收到 `session_keepalive` 帧 → 重置 watchdog；用注入的 `Clock` 快进
    超过 `keepalive_timeout_seconds` 且期间未收到任何消息 → 转
    `DEGRADED`（`Clock` 快进证明逻辑正确，不依赖真实墙钟等待）。
  - 收到 `session_reconnect` 帧 → 转 `RECONNECTING`（可达性测试，不测试
    真正重连行为）。
  - 非本地调用触发的 WebSocket `close`/`error` → 转 `ERROR`。
  - `disconnect()` → 任意状态回到 `DISCONNECTED`，且已打开的 WebSocket
    的 `close()` 被调用恰一次。
  - `getHealth()`：`CONNECTED` → `OK`；其余状态各至少一个用例 → `DOWN`。
  - 请求构造正确性：断言 Helix 请求 URL/method/header
    （`Authorization`/`Client-Id`）/body 字段（`type`/`version`/
    `condition`/`transport.session_id`）。

---

### T003 — `index.ts` 导出 + 全量验证、REPORT 与 commit

- **Allowed Files**：`packages/platform-twitch/src/index.ts`、`pnpm-lock.yaml`、`specs/dev/DEV-041/INDEX.md`、`REPORT.md`、`DECISIONS.md`
- **Requirements**：
  1. `index.ts` 追加导出 T002 全部公开符号。
  2. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  3. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  4. **`DECISIONS.md` 必须已提交**，覆盖第 6 节列出的全部要点。
  5. 更新 `INDEX.md`：T001–T003 全部勾选，`Status:` 从 `IN_PROGRESS` 改为 `READY_FOR_REVIEW`。
  6. `git add`（仅本节点 Writable Scope 内文件，不要用 `git add -A`）
     `&& git commit`，提交信息首行：`DEV-041: eventsub client (websocket state machine)`。
  7. **不要**在这次提交之后再单独提交 LEDGER 追加或自己的 NODE_REPORT
     消息文件——把这两项的文件写好、留在工作区未提交状态即可，由
     Commander 在收尾时统一提交（DEV-040 曾因额外多提交一次被审计记录
     为 Major，本节点必须避免重演）。
  8. 追加 LEDGER 行、写好 `NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-041.md`
     消息文件——**都不要提交**，只是写入工作区。
  9. **在结束前自行核实**：`git log -1` 能看到步骤 6 的那一条提交（且
     只有那一条，不多不少）、NODE_REPORT 消息文件已存在于工作区（未
     提交）、LEDGER 已追加对应行（未提交）。
  10. **STOP**。
- **Acceptance**：六条命令全部退出码 0；测试过程零真实网络连接；`git log`
    新增恰 1 条提交；提交之后 `git status --porcelain` 仍显示
    LEDGER.md 与新 comms 消息文件为未提交改动。

---

## 8. Node INDEX Requirements

```markdown
# DEV-041 INDEX

Status: IN_PROGRESS

## Current Node

DEV-041 — EventSub Client

## Objective

在 `packages/platform-twitch` 新增 `createEventSubClient`：Dev Spec 第 45
节八态（DISCONNECTED/CONNECTING/WELCOME/SUBSCRIBING/CONNECTED/
RECONNECTING/DEGRADED/ERROR）的 XState 连接生命周期机器，真实调用 Twitch
EventSub WebSocket + Helix 订阅创建 API（原生 fetch/WebSocket，零新增第三方
依赖，`xstate` 复用仓库既有版本）。首次真实消费 DEV-040 的 `TwitchAuthPort`。
不做 NormalizedChatMessage 转换（DEV-042）、去重（DEV-043）、真正重连算法
（DEV-045）、发送消息（DEV-046）。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 eventSubClient.ts + 测试
- [ ] T003 index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；测试全程零真实网络连接；`git log` 新增恰 1 条提交；
`DECISIONS.md` 已入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；
LEDGER 追加行与 NODE_REPORT 消息文件已写入工作区但**未提交**。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **测试全程不得发出任何真实网络连接/请求**——全部通过 `webSocketImpl`/`fetchImpl`/`clock` 注入假实现。
2. **凭据不可用（`getAccessToken()` 返回 `ok:false`）时必须直接转 `ERROR`，不得构造 WebSocket 连接。**
3. **不实现 `NormalizedChatMessage` 转换、去重、真正重连算法、发送消息**（第 1 节已说明理由，分属 DEV-042/043/045/046）。
4. **不新增 `ws`/`websocket` 等第三方库**；`xstate` 版本必须与 `runtime-kernel` 一致。
5. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
6. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。
7. `Clock`/`Health` 接口在本包内本地镜像，不跨包 `import`（与 DEV-035/037/040 先例一致）。
8. **T003 提交后，LEDGER 追加与自己的 NODE_REPORT 消息文件一律不要再提交**——写入工作区即可，留给 Commander 收尾统一提交（DEV-040 因违反这条被审计记录为 Major，本节点必须遵守）。

---

## 10. Non-goals / Out-of-scope

- 不实现 `NormalizedChatMessage`/Chat Message Adapter（DEV-042）。
- 不实现事件去重存储（DEV-043，Dev Spec 明确"必须做"，但是独立节点）。
- 不实现真正的指数退避重连算法，只需状态可达 `RECONNECTING`（DEV-045）。
- 不实现发送消息 API（DEV-046）。
- 不组装完整 `LivePlatformAdapter`（connect/disconnect/onChat/sendChat/getHealth，多节点合作产物）。
- 不做真实 Twitch 开发者账号/broadcaster 下的端到端手工验证（USER 是否配置真实凭据，由 USER 自行决定，不在本节点验收范围内）。

---

## 11. Tests

### Unit tests

T002：完整状态路径驱动、凭据不可用诚实失败、Helix 订阅失败处理、
notification 转发、keepalive watchdog（假时钟快进）、reconnect/error 可
达性、disconnect 清理、健康检查八态覆盖、请求构造正确性——全部通过注入
假实现验证，零真实网络连接。

### Regression tests

`pnpm test` 覆盖全 workspace；既有全部包测试零回归。

---

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归；测试全程零真实网络连接 | 命令输出 + 代码检查 |
| A07 | 完整路径 DISCONNECTED→CONNECTING→WELCOME→SUBSCRIBING→CONNECTED 逐状态可达且断言正确 | 测试检查 |
| A08 | 凭据不可用时直接转 ERROR，WebSocket 从未被构造 | 测试检查 |
| A09 | Helix 订阅调用非 202/异常 → 转 ERROR | 测试检查 |
| A10 | notification 帧被原样转发给 onNotification，状态仍 CONNECTED | 测试检查 |
| A11 | keepalive watchdog 用假 Clock 快进证明超时转 DEGRADED | 测试检查 |
| A12 | session_reconnect 帧可达 RECONNECTING | 测试检查 |
| A13 | 非本地关闭/错误事件转 ERROR | 测试检查 |
| A14 | disconnect() 从任意状态回到 DISCONNECTED，且调用了 WebSocket.close() | 测试检查 |
| A15 | getHealth() 对 CONNECTED 返回 OK，其余状态返回 DOWN（每态至少一例） | 测试检查 |
| A16 | Helix 请求 URL/method/header/body 构造正确 | 测试检查 |
| A17 | 未新增 ws/websocket 等第三方依赖；xstate 版本与 runtime-kernel 一致 | 文件检查 |
| A18 | `packages/audio-engine/**`、`packages/runtime-kernel/**`、`apps/renderer/**`、`twitchAuth.ts` 未被修改 | git diff 比对 |
| A19 | 未定义/改动 NormalizedChatMessage；未创建 packages/ai-host | 文件检查 |
| A20 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A21 | `specs/dev/DEV-041/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T003 全部勾选，`Status:` 表头改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A22 | `git log` 新增恰 1 条提交，首行 `DEV-041: eventsub client (websocket state machine)`；提交内容恰为 Writable Scope 声明的文件 | 命令 |
| A23 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但处于**未提交**状态（`git status --porcelain` 能看到它们） | 命令 |
| A24 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例，但注意第 9 节 Constraint 8 的提交边界变化：更新 INDEX →
按序验证 → 确认零回归 → 填 REPORT（含确认 `DECISIONS.md` 已提交）→ 仅
commit 代码+节点文档（一条提交）→ **写入但不提交** LEDGER 追加与
NODE_REPORT 消息文件 → 自行核实完成三要素 → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A24。
