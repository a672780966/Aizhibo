---
msg_id: "0197"
type: FIX_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-045
in_reply_to: "0196"
created_at: 2026-09-05
requires_response: true
---

# FIX_PACKAGE — DEV-045-FIX-01

## 背景

`AUDIT_VERDICT`（消息 `0195`）：AUDIT_FAIL。F-01（MAJOR，采纳）：
`attemptReconnect()` 打开的重连尝试 socket 若依次触发 `error` 后
`close`，两次 `WS_ERROR` 都会调用 `beginReconnectAttempt()`，排定两个
独立的退避定时器，违反"每次失败恰好一次下一次重试"语义。F-02（LEDGER
非追加改动）已由 Commander 接受并说明，不需要修复。

## 修复范围

### FIX-1（对应 F-01，MAJOR）—— 去重：一次失败最多排定一次下一次重试

`packages/platform-twitch/src/eventSubClient.ts` 的 `beginReconnectAttempt()`
当前实现：

```typescript
function beginReconnectAttempt(): void {
  reconnectTimerId = schedule(() => attemptReconnect(), reconnectDelayMs);
  reconnectDelayMs = Math.min(reconnectDelayMs * 2, 30000);
}
```

问题：`reconnectTimerId` 只在这里被赋值，从未在挂起定时器**真正触发
时**被清空为 `undefined`——与 `armWatchdog()`/`watchdogId` 的既有模式
不一致（`armWatchdog` 的回调第一行就是 `watchdogId = undefined;`）。
若某次重连尝试的 socket 依次触发 `error`（→`WS_ERROR`→
`beginReconnectAttempt()`，此时 `reconnectTimerId` 仍是上一轮的挂起
值）再触发 `close`（→ 又一次 `WS_ERROR`→ 又一次
`beginReconnectAttempt()`），会排定两个定时器。

**修复**：仿照 `armWatchdog()` 的模式，把"清空 `reconnectTimerId`"
移到定时器真正触发的那一刻，并在 `beginReconnectAttempt()` 入口加
"已有挂起重试则不重复排定"的守卫：

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

逐条核对不引入新回归：

- 正常连续失败序列（每次失败只 emit 一个事件）：定时器触发时先清空
  `reconnectTimerId`，再执行 `attemptReconnect()`；新尝试若再失败，
  `beginReconnectAttempt()` 此时看到 `reconnectTimerId === undefined`
  （已被清空），正常排定下一次——不影响既有 A11/A12/A14 等已通过测试
  的退避递增/封顶/重置行为。
- `disconnect()` 中"取消挂起定时器"逻辑不变：`reconnectTimerId !==
  undefined` 时 `cancel()` 并清空，与新守卫的判断条件一致，无需改动
  `disconnect()`。

### FIX-2（对应 A09 缺失断言）

在 T002 新增的 A09/A11 相关测试（"retries with exponential backoff...
(A09/A11)"）里，重连成功走到 `CONNECTED` 之后，补一条断言：原始 socket
（`connectToConnected()` 返回的 `socket`，即 `FakeWebSocket.instances[0]`）
的 `closeCalls === 1`（第一次 `attemptReconnect()` 关闭它开新的重连
尝试时触发，此后不应再被关闭第二次）。

### FIX-3（新增测试，对应 F-01 修复的直接验证）

新增一条测试：驱动到 `RECONNECTING`（走 `session_reconnect` 帧），
运行第一次退避定时器打开重连尝试 socket，然后**依次**在该 socket 上
`emit('error', new Event('error'))` 再 `emit('close', new
CloseEvent('close'))`（模拟真实 WebSocket 常见的 error→close 连发）。
断言：

- 状态仍是 `RECONNECTING`（不跳 `ERROR`）。
- 只排定了**一个**新的退避定时器，不是两个——即 `clock.timers` 数组
  中"当前存活（未被消费）的定时器数量"为 1，且 `reconnectDelayMs`
  只翻倍了一次（下一次 `clock.timeouts` 末尾项应为
  `4000`，即从这次失败前的 `2000` 翻倍一次到 `4000`，不是被计两次
  变成 `8000`）——测试需要先驱动一次"正常失败"（emit 一次 `error`）
  把延迟从 `1000` 推到 `2000`，再在**下一次**尝试上做 error→close
  连发测试，观察延迟是 `4000` 而非 `8000`。
- 用 `FakeWebSocket.instances.length` 在整个 error→close 连发之后
  只增加了 0（还没有到下一次定时器触发，不会立刻开新 socket）——即
  连发本身不应该立刻多开一个 socket。

### FIX-4（对应 Minor）

`specs/dev/DEV-045/REPORT.md` 第 3 节"Changed Files"标题行"共 6 个
文件（实现提交 6...)"改为与实际列出的 5 个文件一致的文字。

## Scope

### Writable Scope

```
packages/platform-twitch/src/eventSubClient.ts        （仅 beginReconnectAttempt，其余不动）
packages/platform-twitch/src/eventSubClient.test.ts   （仅新增/修改 FIX 涉及的断言与新测试，不改其余既有测试）
specs/dev/DEV-045/REPORT.md、DECISIONS.md、INDEX.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Forbidden Scope

同原 Task Package 第 3 节 Forbidden Scope 全部条目，追加：不得改动
`disconnect()`/`armWatchdog()`/`attemptReconnect()` 除本 FIX 明确要求
之外的任何其他部分。

## Task Breakdown

### FIX-T001 — 修复 + 测试 + 全量验证 + REPORT/DECISIONS 更新 + commit

- 按上方 FIX-1~FIX-4 实施。
- 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、
  `pnpm format:check`、`pnpm build`、`pnpm test`，全部退出码 0，既有
  全部测试零回归。
- `DECISIONS.md` 追加一条 D8，说明 F-01 根因（`reconnectTimerId` 未在
  定时器触发时清空，导致同一失败的 error+close 连发被计两次）与修复
  方式（仿 `armWatchdog` 模式 + 入口守卫）。
- 更新 `REPORT.md`：修正文件计数文字，追加 FIX 轮次的 Acceptance
  Results（A09/A11 由 FAIL 改 PASS 并给出新证据）。
- `git add`（仅本 FIX Writable Scope 内文件）`&& git commit`，提交
  信息首行：`DEV-045-FIX-01: dedupe reconnect retry on error+close double-fire`。
  **恰 1 条提交**。
- 追加 LEDGER 行、写好 NODE_REPORT 消息文件——都不要提交，只写入
  工作区。
- **STOP**。

## Acceptance

| # | 判定 |
|---|---|
| FIX-A01 | 六条命令全部退出码 0，既有全部测试零回归 |
| FIX-A02 | 新增"error 后 close 连发只排定一次重试"测试，通过 |
| FIX-A03 | A09/A11 相关测试补上"原 socket close() 恰一次"断言，通过 |
| FIX-A04 | `REPORT.md` 文件计数文字与实际一致 |
| FIX-A05 | `git log` 新增恰 1 条提交，首行 `DEV-045-FIX-01: dedupe reconnect retry on error+close double-fire` |
| FIX-A06 | 原 A01–A08/A10/A12–A23 无回归 |
