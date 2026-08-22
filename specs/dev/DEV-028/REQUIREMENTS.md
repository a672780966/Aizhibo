# DEV-028 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-028.md` 抄录并整理，权威版本为
Task Package 原文。**第 1/2 节务必先读**：本节点与前八个节点性质不同，**不新增任何
生产代码**。核对下来"序号分配"（DEV-012）与"分发"（DEV-020）都已实现，本节点只补齐
CR-012 明确要求、此前从未测过的三个属性。

## 架构

- **关键架构决策（第 1 节）**：本节点是纯测试节点。"序号分配"`wrapPresentationPort`
  （DEV-012 冻结）的 `commandSeq` 自增逻辑、"分发"`createWebSocketPresentationPort`
  （DEV-020 冻结）的 `send()` 向 `wss.clients` 全体广播，均已实现并测过。真正没测过
  的是 **RESYNC 幂等性**三属性：①真实断线重连（`close()` 后全新连接）走的是否真的
  是同一条代码路径；②同一连接连续两次 `RENDERER_HELLO` 是否产出一致、不腐化状态的
  结果（幂等性字面含义）；③多个客户端同时在线时广播是否一致。
- **被测实现（第 2.1/2.2/2.3 节）**：`wss.on('connection', ...)` 给每个新连接独立挂
  `message` 监听；`helloHandler` 是跨连接共享的单一回调（`wrapPresentationPort` 只
  注册一次）；`send()` 无条件广播给 `wss.clients`（带 `readyState === OPEN` 守卫）。
  结构上天然满足"首次连接与重连走同一路径"（CR-012），本节点用真实 `client.close()`
  + 新建连接验证。
- **三个新增测试场景（第 2 节）**：
  1. **真实断线重连**：`client1.close()` → 等待关闭完成 → `connect()` 建 `client2` →
     `client2` 发 `RENDERER_HELLO` → 断言 `client2` 收到正确 RESYNC（`commandSeq`
     延续此前计数不重置；`state` 反映断线前最新状态）。
  2. **同连接幂等性**：同一个已连接 client 连续两次 `RENDERER_HELLO`（中间无任何
     `port.send(...)`）。断言：两次都收到 `kind==='PRESENTATION_RESYNC'`，
     `commandSeq` 各自递增（不重复、不跳号），两条命令 `state` 内容**完全相同**。
  3. **多客户端分发一致性**：`client1`/`client2` 同时连接，`port.send({kind:
     'PRES_READY'})` 一次，断言两个客户端都收到内容相同（`commandSeq`/`command`
     均一致）的命令——验证广播给全部在线连接而非只给最后连接的。
- **发现真实 bug 的处置（第 2.4 节）**：**不自行修**。发 `EXECUTOR_QUERY`
  （blocking: true），写 `BLOCKERS.md`，描述复现步骤与现象，等 `SCOPE_RULING`。

## Requirements

- `wsServer.test.ts` 仅**追加**两个新 `it` 块（断线重连、多客户端分发），不改动既有
  两个用例；复用文件内既有 `startServer`/`connect`/`waitForMessage` 等 helper。
- `presentationCommand.test.ts` 仅**追加**一个新 `it` 块（同连接幂等性），不改动既有
  四个用例；复用既有 `sent`/`hello` 捕获模式。
- 断线重连：真实 `client.close()` + 新建连接；新客户端 RESYNC `commandSeq` 延续（不
  重置为 1）、`state` 反映断线前最新折叠状态。
- 幂等性：连续两次 `hello?.()`（中间无 `send`）产出两条 `commandSeq` 不同但 `state`
  内容相同的 RESYNC 命令。
- 多客户端：两个同时在线客户端收到内容一致的广播命令。

## Non-goals

不新增任何生产代码（"序号分配与分发"已由 DEV-012/020 完成）；不实现真正的多
Renderer 客户端产品功能（本节点的"多客户端"测试只是验证广播机制本身，不代表产品
支持多个真实渲染器同时工作）；不修复本节点范围外发现的任何既有问题（走
EXECUTOR_QUERY 上报）；不修改既有测试用例；不新增任何 npm 依赖。

## Task Order

T001 节点文档；T002 真实断线重连测试；T003 同连接幂等性测试；T004 多客户端分发一致
性测试；T005 全量验证、REPORT、DECISIONS、commit 与 NODE_REPORT。
