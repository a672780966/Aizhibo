# DEV-045 DECISIONS

本文件记录 DEV-045（Twitch Reconnect）实现中的工程决策。Task Package
第 6 节要求至少覆盖：为何退避参数选 1000ms/×2/封顶 30000ms、为何无限
重试不设上限转 ERROR、为何重连不重新取 token、为何不改动
WS_ERROR→ERROR 既有路径。

## D1 — 退避参数 1000ms 起 / ×2 / 封顶 30000ms

Dev Spec 第 45 节只列出"Exponential backoff"为必须支持项，未给具体
数值，属工程默认值。选 1000ms 起：对单机聊天客户端足够保守，不会在
Twitch 服务端要求重连时立刻以亚秒级频率冲击新端点；×2 指数增长保证
短暂网络抖动时快速恢复（第二次尝试仅 2s）；封顶 30000ms 保证长期不可
用时重试间隔不会无限拉长到分钟级，客户端仍能在可接受频率内探测恢复。

## D2 — 无限重试不设上限转 ERROR

采用"无限重试 + 封顶退避"，不实现固定次数上限后转 ERROR 的"放弃"
逻辑。理由：EventSub `session_reconnect` 是 Twitch 服务端主动发起的
会话迁移信号，属于预期内控制面事件，而非配置/权限错误；对这类信号
重试直至成功是协议内的正常行为，过早"放弃"反而会中断本可自愈的
聊天投递。真正的不可恢复错误（凭据缺失、Helix 订阅被拒）仍由既有
`WS_ERROR→ERROR`（凭据路径）与 `SUBSCRIBE_FAIL→ERROR`（订阅路径）
诚实上报，不依赖重连引擎兜底。`disconnect()` 主动断开是唯一的
"停止重试"出口（取消挂起定时器），用户意图始终可立即生效。

## D3 — 重连不重新取 token

真实 Twitch `session_reconnect` 语义：同一 WebSocket 会话身份延续，
只是更换连接地址，不需要重新获取 access token。本节点重连尝试直接
复用 `connect()` 首次建连时已取得并存于闭包的 `accessToken`（缓存），
不调用 `authPort.getAccessToken()`。"OAuth refresh"需求已被"每次全新
`connect()` 都会取一次 token"覆盖，不是本节点的职责。这同时避免重连
期间向 auth 服务发起不必要的请求（A16 测试断言调用次数不因重连增加）。

## D4 — 不改动 WS_ERROR→ERROR / SUBSCRIBE_FAIL→ERROR 既有路径

DEV-041 两轮审计（AUDIT_FAIL→FIX-01→AUDIT_PASS）逐条验证过：
`WS_ERROR` 从 `CONNECTING`/`WELCOME`/`SUBSCRIBING`/`CONNECTED`/
`DEGRADED` 一律转 `ERROR`，`SUBSCRIBE_FAIL` 转 `ERROR` 且不重试。这些
是冻结拓扑语义（零回归红线），本节点不触碰。本节点只扩展
`RECONNECTING` 自己的 `on:` 表：新增 `WELCOME_RECEIVED→WELCOME` 与
`WS_ERROR`（停留原状态、由 action 安排下一次退避重试）两条边——XState
的 `on:` 按状态各自作用域生效，不存在全局覆盖风险。订阅失败（重连后
走到 SUBSCRIBING 又失败）更可能是权限/参数错误而非网络抖动，重试会
掩盖真实配置问题，故 `SUBSCRIBE_FAIL` 在 SUBSCRIBING 内仍转 ERROR 不
重试。

## D5 — 重连动作注入方式：模块级机器 + `provide` 命名 action

`eventSubMachine` 定义在模块级（无每客户端闭包可见性），而重连动作
（`beginReconnectAttempt`/`attemptReconnect`）依赖每客户端闭包状态
（`reconnectDelayMs`/`reconnectTimerId`/`reconnectTargetUrl`/socket）。
因此：机器 `RECONNECTING` 块的 `WS_ERROR` 边声明**命名 action**
`scheduleNextReconnect`（声明式、可序列化、机器本身保持纯净）；
`createEventSubClient` 内先 `eventSubMachine.provide({ actions: {
scheduleNextReconnect: () => beginReconnectAttempt() } })` 再
`createActor(...)`——XState v5 的 `provide()` 返回带实例实现的机器
克隆，`createActor` 会急切求初始快照，故 `provide()` 必须在
`createActor` 之前完成。不采用未解析的字符串 action（XState v5 对
未实现 action 静默 no-op，半接线会无声失败）。

## D6 — 简化握手：先关旧连接再开新连接

不实现 Twitch 官方"双 socket 并存直至新 socket welcome 后再关旧连接"
的完全协议合规握手，简化为"重连尝试开始时先本地关闭旧 socket
（`locallyClosed = true`，抑制 close→WS_ERROR）再打开新 socket"。对
聊天消息处理的实际影响是重连窗口期内可能短暂丢失部分消息，可接受：
已有 DEV-043 去重与整体"至少一次投递"容错设计，该窗口期丢失不是
新增风险。工程简化换来 `openSocket` 单 socket 不变式（事件监听器可
用 `thisSocket` 身份守卫过滤迟到事件），无需管理双连接生命周期。

## D7 — 成功 welcome 重置退避状态

每次收到 `session_welcome`（无论首次连接还是重连成功）都重置
`reconnectDelayMs = 1000` 并清空 `reconnectTargetUrl = undefined`，使
每次重连 episode 独立从基础退避起算（A14：一次成功重连后，下次
`session_reconnect` 的首次延迟重新从 1000ms 起，而非延续上一 episode
末尾的封顶值）。

## D8 — FIX-01：同一失败的 error+close 连发只排定一次重试

**背景（F-01，MAJOR）**：`beginReconnectAttempt()` 只在排定新定时器时
赋值 `reconnectTimerId`，从未在挂起定时器**真正触发时**把它清空回
`undefined`——与 `armWatchdog()` 的既有模式不一致（`armWatchdog` 的
回调第一行就是 `watchdogId = undefined;`）。某次重连尝试的 socket 若
依次触发 `error`（→ `WS_ERROR` → `beginReconnectAttempt()`，此时
`reconnectTimerId` 仍是上一轮已触发但未清空的值）再触发 `close`
（→ 又一次 `WS_ERROR` → 又一次 `beginReconnectAttempt()`），会排定
**两个**独立的退避定时器，下一次重连会被尝试两次，违反"每次失败
恰好一次下一次重试"语义。

**修复（FIX-1）**：仿照 `armWatchdog()` 模式，把清空动作移进定时器
回调内部（触发那一刻 `reconnectTimerId = undefined`），并在入口加
守卫：

```typescript
function beginReconnectAttempt(): void {
  if (reconnectTimerId !== undefined) return; // 已有挂起的重试，同一次失败的重复 WS_ERROR 不再排第二个
  reconnectTimerId = schedule(() => {
    reconnectTimerId = undefined;
    attemptReconnect();
  }, reconnectDelayMs);
  reconnectDelayMs = Math.min(reconnectDelayMs * 2, 30000);
}
```

**逐条核对不引入新回归**：

- 正常连续失败序列（每次失败只 emit 一个事件）：定时器触发时先清空
  `reconnectTimerId`，再执行 `attemptReconnect()`；新尝试若再失败，
  `beginReconnectAttempt()` 此时看到 `reconnectTimerId === undefined`
  （已被清空），正常排定下一次——不影响既有 A11/A12/A14 已通过测试
  的退避递增/封顶/重置行为。
- `disconnect()` 中"取消挂起定时器"逻辑不变：`reconnectTimerId !==
  undefined` 时 `cancel()` 并清空，与新守卫的判断条件一致，无需改动
  `disconnect()`。
- 验证：新增回归测试"schedules only one retry when a single failed
  reconnect attempt fires both error and close"（FIX-3）在修复前失败
  （`expected 8000 to be 4000`，连发被计两次翻倍两次），修复后通过。
