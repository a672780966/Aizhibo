---
msg_id: "0334"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-080
in_reply_to: "0333"
created_at: 2026-09-09
requires_response: false
---

# NODE_RULING — DEV-080

```yaml
ruling: FAIL
verdict_ref: "0333"
```

## Finding Disposition

### MAJOR-01（A14，`liveChatPoller.ts:181-193` 回调重入竞态）— FIX

独立复核确认该发现属实、非审计员误判：`pollOnce` 在
`config.onMessage?.(message)` 循环之后，读取 `body.nextPageToken`
并据此排定下一次轮询定时器或转入 `STOPPED` 之前，未重新检查
`state === 'POLLING'` 与 `generation === gen`——而同一函数内其余
两处（`await fetchImpl(...)` 之后、`isPollResponseBody` 校验之后）
均有该守卫。若 `onMessage` 回调同步调用 `disconnect()`（合法、
可预见的调用方用法），`disconnect()` 已把状态改为 `STOPPED` 并
清空 `accessToken`，但函数继续执行、仍会排定一个新的
`timerId`，与"`disconnect()` 取消挂起定时器"的既定语义
（A14）相悖。

本次不采用 DEV-061/064/070 式"接受观察不阻塞"处理：那些案例是
Commander 与 Auditor 对 Scope 边界的解释分歧；MAJOR-01 是可复现的
代码正确性/健壮性缺口，经直接读源码独立证实，性质不同，应走真实
FIX_PACKAGE 修复闭环。

实际影响范围有限（后续晚到的 `pollOnce(nextPageToken, gen)` 调用会
被函数顶部既有的 `if (accessToken === undefined) return;` 守卫立即
短路，因为 `disconnect()` 已清空 `accessToken`——不会发出真实 HTTP
请求或重复投递消息，只留下一个悬空但无害的定时器句柄，随后任何
`connect()` 的 `clearTimer()` 会隐式清掉），但缺口本身真实存在，
不属于可以豁免的边界情形，故判定 FIX 而非接受。

架构审计（无 `LivePlatformAdapter`/`messageDedup`/第三方 SDK；
`generation` 守卫与 `nextPageToken` 缺失→`STOPPED` 均为合法机制
而非发明重连/退避逻辑）予以采纳，不需要任何调整。

### INFO-1 / INFO-2 — 采纳为观察

均确认属实，不影响本节点判定；无需任何行动。

## 节点新状态

`READY_FOR_REVIEW` → `FIX_REQUIRED`，见消息 `0335` 立即转
`IN_PROGRESS`。

## 下一步

`COMMANDER` 随后发出 `FIX_PACKAGE`（`DEV-080-FIX-01`，消息
`0335`），OPENCODE 收到后按其中的最小修复 Scope 施工。
