# TASK PACKAGE — DEV-028

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-028 |
| Node Name | Presentation Command Bus |
| Milestone | M2 — Presentation Complete（**第九个、也是最后一个节点**——PASS 后 M2 全部完成） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-027（DONE，`verdict_ref: "0132"`） |
| Commander | Claude |
| Executor | Codex（协议角色名 `OPENCODE`） |

### 本节点与前八个节点性质不同：不新增生产代码，只补齐 CR-012 明确要求、此前从未测过的两个属性

`DAG.md` 对本节点的要求是"序号分配与分发；**RESYNC 幂等性测试**（CR-012）。信封契约
已在 DEV-012 冻结"。已核对真实代码：

- **"序号分配"**——`wrapPresentationPort`（DEV-012 冻结）的 `commandSeq` 自增逻辑早已
  实现并测试。
- **"分发"**——`createWebSocketPresentationPort`（DEV-020 冻结）的 `send()` 已经在
  向 `wss.clients` 全体广播。
- **"RESYNC 幂等性测试"**——这才是真正**没有**被测过的部分。已核对
  `wsServer.test.ts`/`presentationCommand.test.ts` 全部既有用例：只测过"连接一次→
  收到一次 RESYNC"，**从未测过**：①真实断线重连（`close()` 后一个全新连接）走的是
  否真的是同一条代码路径；②同一个连接不重连、连续两次发 `RENDERER_HELLO` 是否产出
  一致、不腐化状态的结果（幂等性的字面含义）；③多个客户端同时在线时的广播是否一致。

`DAG.md` 原文正是为此立的规矩："首次连接与重连走同一条路径——不为两者设计两套
逻辑，重连路径若只在崩溃时才走，永远得不到测试覆盖。"本节点就是去补上这句话要求的
测试覆盖，**不是**去写新功能。核对下来现有实现的设计（单一共享的 `helloHandler`，
`send()` 无条件广播给 `wss.clients`）在结构上已经天然满足"同一路径"，本节点预期
不需要改任何生产代码——除非测试真的揭示了一个此前没发现的 bug（那种情况下发
`EXECUTOR_QUERY`，不要自行決定怎么修）。

---

## 2. 架构设计（Commander 已核对真实代码与既有测试覆盖后做出的决策）

### 2.1 真实断线重连测试（此前完全没有覆盖）

已核对 `wsServer.ts`：`wss.on('connection', (socket) => {...})` 给**每一个新连接**
独立挂 `message` 监听；`helloHandler` 是跨连接共享的单一回调（`wrapPresentationPort`
只注册一次）。真实断线重连场景下，新连接触发新的 `connection` 事件、新 socket 发
`RENDERER_HELLO`、同一个 `helloHandler` 被调用、`send()` 广播给当前 `wss.clients`
（此刻只有新连接）——结构上应该正确工作，但**从未用真实的 `client.close()` + 新建
连接验证过**。

新增测试：`client1.close()` → 等待关闭完成 → `connect()` 建立 `client2` → `client2`
发 `RENDERER_HELLO` → 断言 `client2` 收到正确的 RESYNC（`commandSeq` 延续此前的
计数，不重置；`state` 反映断线前的最新状态）。

### 2.2 同连接连续两次 RESYNC 的幂等性测试（字面意义的"幂等性"）

新增测试：同一个已连接的 client，连续发送两次 `RENDERER_HELLO`（中间不发生任何新的
`port.send(...)`）。断言：两次都收到 `kind==='PRESENTATION_RESYNC'` 的命令，
`commandSeq` 各自递增（不重复、不跳号），但两条命令的 `state` 内容**完全相同**
（因为折叠状态在两次请求之间没有变化）——这是"幂等性"的字面验证：重复请求不改变
系统状态，只是重新宣告当前状态。

### 2.3 多客户端同时在线的分发一致性测试

新增测试：两个客户端同时连接（`client1`/`client2`），`port.send({kind:'PRES_READY'})`
一次，断言两个客户端都收到**内容相同**（`commandSeq`/`command` 均一致）的那一条
命令——验证"分发"确实是广播给全部在线连接，不是只发给最后连接的那个。

### 2.4 如果测试过程中发现真实 bug

按协议流程处理：**不要自行修**。发 `EXECUTOR_QUERY`，描述复现步骤与现象，等
`SCOPE_RULING`。Commander 会判断是否属于本节点自主裁决范围内的最小修复，或需要
上报。

---

## 3. Scope

### Writable Scope — 仅测试文件，无生产代码新增

```
apps/renderer/src/server/wsServer.test.ts         （仅追加新的 it(...) 用例，不改动
                                                     既有两个用例）
packages/runtime-kernel/src/presentationCommand.test.ts  （仅追加新的 it(...) 用例，
                                                     不改动既有四个用例）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-028/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/runtime-kernel/src/**（除 presentationCommand.test.ts 仅追加外，含
  presentationCommand.ts 本体、machine.ts、ports.ts、index.ts 等全部既有文件）
apps/renderer/src/**（除 wsServer.test.ts 仅追加外，含 wsServer.ts 本体、App.tsx、
  client.ts、全部 render/*.ts 等既有文件）
packages/chapter-schema/**、packages/chapter-compiler/**（含 test-fixtures/**）、
  packages/rule-engine/**、packages/dice-engine/**、packages/narrative-composer/**、
  packages/persistence/**、packages/shared/**
根 tsconfig.json、tsconfig.base.json、vitest.config.ts、eslint.config.js、根 package.json
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
```

### Forbidden Scope

```
对任何生产代码文件的修改（`wsServer.ts`/`presentationCommand.ts`/`machine.ts`/
  `App.tsx`/`ports.ts`/`index.ts` 等）——发现 bug 时走 EXECUTOR_QUERY，不擅自修
对既有测试用例（`wsServer.test.ts` 现有 2 个、`presentationCommand.test.ts` 现有
  4 个 it 块）的任何修改
packages/* 下任何目录的修改
新增任何 npm 依赖
新建任何生产代码文件
```

---

## 4. Required Skills

### Required

- 真实 WebSocket 客户端/服务端集成测试（连接生命周期：连接、关闭、重连）
- 幂等性测试设计思路（同一操作重复执行，断言系统状态不变、只是重新宣告）

### Forbidden / Unnecessary

- 任何生产代码实现能力（本节点不写生产代码）
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `createWebSocketPresentationPort`（DEV-020 冻结） | 被测传输实现 |
| `wrapPresentationPort`（DEV-012 冻结） | 被测信封/折叠状态实现 |
| 既有 `wsServer.test.ts`/`presentationCommand.test.ts` | 测试手法先例（`startServer`/`connect`/`waitForMessage` 等既有 helper 函数直接复用，不重新发明） |

---

## 6. Outputs

1. `wsServer.test.ts` 新增：断线重连测试、多客户端分发测试
2. `presentationCommand.test.ts` 新增：同连接连续两次 RESYNC 幂等性测试
3. `specs/dev/DEV-028/DECISIONS.md`，记录：为何本节点不需要新增生产代码（"序号分配"/
   "分发"已由 DEV-012/020 实现）、三个新增测试场景分别验证的具体属性

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-028/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Acceptance**：四文件存在；`INDEX.md` 含 Task Order T001–T005。

---

### T002 — 真实断线重连测试

- **Allowed Files**：`apps/renderer/src/server/wsServer.test.ts`（**仅追加新 it 块**）
- **Requirements**：按第 2.1 节实现。
- **Acceptance**：真实 `client.close()` + 新建连接，新客户端收到的 RESYNC
  `commandSeq` 延续（不重置为 1）、`state` 反映断线前最新折叠状态。

---

### T003 — 同连接幂等性测试

- **Allowed Files**：`packages/runtime-kernel/src/presentationCommand.test.ts`（**仅追加新 it 块**）
- **Requirements**：按第 2.2 节实现。
- **Acceptance**：连续两次 `hello?.()`（中间无 `send`）产出两条 `commandSeq` 不同
  但 `state` 内容相同的 RESYNC 命令。

---

### T004 — 多客户端分发一致性测试

- **Allowed Files**：`apps/renderer/src/server/wsServer.test.ts`（**仅追加新 it 块**，与 T002 同文件不同用例）
- **Requirements**：按第 2.3 节实现。
- **Acceptance**：两个同时在线客户端收到内容一致的广播命令。

---

### T005 — 全量验证、REPORT 与 commit

- **Allowed Files**：`specs/dev/DEV-028/INDEX.md`、`REPORT.md`、`DECISIONS.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-028.md`
- **Requirements**：
  1. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  2. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  3. **`DECISIONS.md` 必须已提交**，覆盖第 6 节列出的全部要点。
  4. 更新 `INDEX.md`：T001–T005 全部勾选，**且把文件顶部的 `Status:` 一行从
     `IN_PROGRESS` 改为 `READY_FOR_REVIEW`**。
  5. `git add -A && git commit`，提交信息首行：`DEV-028: presentation command bus`。
  6. 追加 LEDGER 行，发 `NODE_REPORT`。
  7. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`REPORT.md` 引用的全部文档已入库；`git log` 新增恰 1 条提交；`git diff` 除节点文档/LEDGER 外只涉及两个测试文件的**追加**内容。

---

## 8. Node INDEX Requirements

```markdown
# DEV-028 INDEX

Status: IN_PROGRESS

## Current Node

DEV-028 — Presentation Command Bus

## Objective

补齐 CR-012 明确要求、此前从未被测过的三个属性：真实断线重连走同一条代码路径、
同连接连续 RESYNC 请求的幂等性、多客户端广播分发一致性。序号分配（DEV-012）与
传输分发本身（DEV-020）均已实现，本节点**不新增任何生产代码**，只补测试。

## Allowed Scope（仅测试文件）
（抄录 Task Package 第 3 节实际条目）

## Read-only Scope
（抄录 Task Package 第 3 节实际条目）

## Forbidden Scope
（抄录 Task Package 第 3 节实际条目——含"发现 bug 也不擅自修，走 EXECUTOR_QUERY"）

## Task Order

- [ ] T001 节点文档
- [ ] T002 真实断线重连测试
- [ ] T003 同连接幂等性测试
- [ ] T004 多客户端分发一致性测试
- [ ] T005 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001（每完成一个 Task 立即勾选并更新本字段）

## Exit Criteria

六条命令全部退出码 0；三个新场景测试全部通过；既有全部测试零回归；未新增任何生产
代码；`DECISIONS.md` 已入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；已向
AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定——**PASS 即代表 M2 全部完成**。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **不修改任何生产代码文件**——本节点只追加测试。
2. **不修改既有测试用例**，只新增。
3. **发现生产代码 bug 时发 `EXECUTOR_QUERY`，不擅自修复**。
4. **不新增任何 npm 依赖**。
5. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
6. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不新增任何生产代码（"序号分配与分发"已由 DEV-012/020 完成）。
- 不实现真正的多 Renderer 客户端产品功能（第 67 节多 Worker 并行暂不启用；本节点的
  "多客户端"测试只是验证广播机制本身，不代表产品支持多个真实渲染器同时工作）。
- 不修复本节点范围外发现的任何既有问题（走 EXECUTOR_QUERY 上报）。

---

## 11. Tests

### Integration tests

T002/T003/T004：三个新场景，覆盖第 7 节描述的具体行为。

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
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | 真实断线重连测试通过，`commandSeq` 延续、`state` 正确 | 测试检查 |
| A08 | 同连接连续两次 RESYNC 幂等性测试通过（`state` 内容相同，`commandSeq` 各自递增） | 测试检查 |
| A09 | 多客户端分发一致性测试通过 | 测试检查 |
| A10 | 未修改任何生产代码文件 | git diff 比对 |
| A11 | 未修改既有测试用例（仅新增 it 块） | git diff 比对 |
| A12 | 未新增任何 npm 依赖 | 文件检查 |
| A13 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A14 | `specs/dev/DEV-028/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T005 全部勾选，`Status:` 表头改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A15 | `git log` 新增恰 1 条提交，首行 `DEV-028: presentation command bus`；提交时 `git status --porcelain` 为空 | 命令 |
| A16 | LEDGER 含 `NODE_REPORT-DEV-028` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A17 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT（含确认 `DECISIONS.md` 已提交）→ commit → 发 NODE_REPORT → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A17。
