# DEV-028 DECISIONS

## D1 — 本节点不需要新增任何生产代码（"序号分配"与"分发"已由 DEV-012/020 实现）

DAG 对本节点的要求是"序号分配与分发；**RESYNC 幂等性测试**（CR-012）。信封契约已在
DEV-012 冻结"。逐项核对既有实现与测试后确认：

- **"序号分配"**——`wrapPresentationPort`（DEV-012 冻结）的 `commandSeq` 自增逻辑
  早已实现并被 `presentationCommand.test.ts` 既有 4 个用例覆盖（含 RESYNC 占用连续
  编号、无内层回调不抛异常、真实 actor 折叠状态）。
- **"分发"**——`createWebSocketPresentationPort`（DEV-020 冻结）的 `send()` 向
  `wss.clients` 全体广播（带 `readyState === OPEN` 守卫），既有 `wsServer.test.ts`
  2 个用例已覆盖"连接→RESYNC→send 连续编号"。

因此本节点的增量**只有测试**——把 CR-012"首次连接与重连走同一条路径"明确要求、但
既有用例从未真实测过的三个属性补上（见 D2/D3/D4）。任何生产代码改动都不在授权范围
内；若测试揭示真实 bug，按协议发 `EXECUTOR_QUERY` 等 `SCOPE_RULING`，不自行修。

## D2 — 真实断线重连测试验证的属性（T002）

既有实现结构上天然满足"同一路径"：`wss.on('connection', ...)` 给**每一个**新连接
独立挂 `message` 监听，`helloHandler` 是跨连接共享的单一回调（`wrapPresentationPort`
只注册一次）。但"重连若只在崩溃时才走，永远得不到测试覆盖"——从未用真实的
`client.close()` + 新建连接验证过。T002 用真实 `ws` client 验证：

- `client1.close()` 并等待关闭完成（`close` 事件）后，`connect()` 建立全新 `client2`，
  重发 `RENDERER_HELLO`。
- 新连接触发新的 `connection` 事件、同一个 `helloHandler` 被调用、`send()` 广播给
  当前 `wss.clients`（此刻只有新连接）。
- 断言：`client2` 收到 `PRESENTATION_RESYNC`，`commandSeq` **延续**断线前计数
  （此前 1、2，重连后 3，不重置为 1），`state` 反映断线前最新折叠状态（`PRES_READY`
  后为 `{phase:'READY'}`）。这就是"断线重连走同一条代码路径"的直接证据。

## D3 — 同连接连续两次 RESYNC 的幂等性验证的属性（T003）

"幂等性"的字面含义：重复请求不改变系统状态，只是重新宣告当前状态。T003 对同一
`wrapPresentationPort` 实例（同一"连接"），在两次 `send`（`SCENE_ENTER`/`PRES_READY`）
之后连续两次调用 `hello?.()`（中间**无任何**新的 `send`）：

- 两次都产出 `kind==='PRESENTATION_RESYNC'` 命令。
- `commandSeq` 各自递增（3、4），**不重复、不跳号**——每次 RESYNC 都占用一个连续
  编号，与 `send` 共用同一条信封管道。
- 两条命令的 `state` 内容**完全相同**（`{phase:'READY', currentSceneId:'scene-start'}`）
  ——因为折叠状态在两次请求之间没有变化。这就是"重复请求只是重新宣告当前状态、
  不腐化状态"的直接证据。

## D4 — 多客户端分发一致性验证的属性（T004）

`send()` 的实现语义是"广播给 `wss.clients` 全部在线连接"。T004 用两个真实 `ws`
client 同时在线验证：先挂好两个客户端的等待器，再 `port.send({kind:'PRES_READY'})`
**一次**，断言两个客户端都收到**内容相同**的那一条命令（`commandSeq`/`command`
均一致，均为 `{commandSeq:1, command:{kind:'PRES_READY'}}`）。验证分发确实是广播给
全部在线连接，而非只发给最后连接的客户端。先挂等待器再发送，避免发送与监听注册的
竞态。本节点只验证广播机制本身，不代表产品支持多个真实渲染器同时工作（Non-goals）。
