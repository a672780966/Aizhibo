# TASK PACKAGE — DEV-012

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-012 |
| Node Name | Runtime API |
| Milestone | M1 — Story Machine Complete（**本节点是 M1 的最后一个节点**——PASS 后 M1 全部完成，`DAG.md` 第二施工组 M2 全部依赖本节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-011（DONE，`verdict_ref: "0092"`） |
| Commander | Claude |
| Executor | Codex（协议角色名 `OPENCODE`） |

### M1 收尾节点：冻结第三个、也是最后一个对外契约

`DAG.md` 明文："M1 结束时三个对外契约全部冻结：Runtime Event（DEV-008）、Public State 可见性
分区（DEV-009）、**Presentation Command（DEV-012）**。"本节点只做 CR-012 明确指派给它的
`PresentationCommand` 契约，**不做**"Runtime API"字面上听起来涵盖的 Operator/Platform 接口
——那些分别是 DEV-060A（M6）与 M4 平台节点各自的职责，此刻它们的消费方都不存在，提前建会是
纯粹的猜测。见第 10 节 Non-goals。

### 第四次追加式扩展已冻结的 `packages/runtime-kernel`

继 DEV-007、DEV-010、DEV-011 之后，本节点在同一个包上做第四次追加式扩展，另加**一次**对
`ports.ts` 的窄范围新增（第 2.2 节，先例见 DEV-002A 对 `hostPublic.ts` 的"唯一一次纯新增
字段"）。

---

## 2. 架构设计（Commander 已核对真实代码后做出的决策，Codex 按此实现）

### 2.1 关键认识：不改动任何已冻结的 action 代码，用装饰器包一层

已核对 `machine.ts`（Read-only）确认：所有 Presentation 命令目前都是在 `presLoading`/
`presReady`/`presFailover`/`onSceneEnter`/`onOpen`/`onResultPlaying` 这些已冻结 action 内部
直接调用 `context.ports.presentation.send({kind: '...', ...})`，命令内容目前是宽松的
`unknown`（DEV-009 明确留给 DEV-028/030 定义具体 schema）。

本节点**不修改这些 action 的任何一行**（改动内部字面量结构会破坏"仅追加"纪律，且不在本
节点的真正职责内——具体命令 kind/payload 的 schema 仍然是 DEV-028/030 的事）。正确做法：
在 `Ports.presentation` 与真正的 Renderer 之间加一层**装饰器**，拦截每一次
`send(command: unknown)` 调用，套上带 `commandSeq` 的信封再转发，同时在装饰器内部维护一个
"目前为止收到的命令流"折叠出的最新可推导状态。`machine.ts`/`presentationRegion.ts` 等文件
因此**零改动**。

```typescript
export interface PresentationCommand {
  commandSeq: number;
  command: unknown;   // 内层 kind/payload 的具体 schema仍是 DEV-028/030 的职责，本节点不定义
}

export interface PresentationState {
  phase: 'LOADING' | 'READY' | 'FAILOVER';
  currentSceneId?: string;
  lastResultText?: string;
}

export interface SequencedPresentationPort extends PresentationPort {
  getState(): PresentationState;
}

export function wrapPresentationPort(inner: PresentationPort): SequencedPresentationPort
```

`wrapPresentationPort` 返回的对象：
- `send(command)`：`commandSeq` 从 1 起严格自增（每次调用 +1，不重置，包括后面提到的
  RESYNC 命令本身），套上信封后转发给 `inner.send(envelope)`；同时用 `command` 里已有的
  `kind` 字段（`SCENE_ENTER`/`PRES_LOADING`/`PRES_READY`/`PRES_FAILOVER`/`RESULT_PLAYING`
  等——这些字符串已经在冻结代码里固定存在，本节点只读不改）折叠更新内部 `PresentationState`。
- `getState()`：返回当前折叠出的 `PresentationState`（"必须派生，不得另存"——整个状态都是
  从已发送命令流折算出来的只读投影，没有第二份独立维护的真相）。
- `onRendererHello`（见 2.2）：注册的回调触发时，用当前 `getState()` 的结果构造一条
  `{kind: 'PRESENTATION_RESYNC', state: ...}` 命令，通过同一个 `send` 路径发出（自然获得下一个
  `commandSeq`，不单独开一套编号）。

**已知诚实缺口**：现有冻结的 action 集合里没有任何"互动关闭"的命令（`onOpen` 发
`INTERACTION_OPEN`，但没有对应的关闭事件流向 Presentation），因此 `PresentationState` 不
追踪 `interactionOpen`——追踪一个只会变 `true` 不会变回 `false` 的字段没有意义，如实记入
`DECISIONS.md`，不假装解决了这个问题（修它需要改冻结的 action 代码，超出本节点授权）。

### 2.2 `ports.ts` 的唯一一次纯新增字段——`PresentationPort.onRendererHello?`

`CR-012` 要求的 `RENDERER_HELLO`/`REQUEST_RESYNC` 是**入站**信号（渲染器→Runtime，"我刚连上/
重连了，请把我同步到最新"），但已冻结的 `PresentationPort` 接口只有 `send`（出站）一个方法，
没有任何入站回调注册点。这与 DEV-002A 起草时发现 `HostPublicSpec.SceneDisclosure` 缺"事实→
flag"映射是同一类缺口——处置方式沿用同一先例：对冻结文件做**唯一一次纯新增、可选字段**的
扩展：

```typescript
// packages/runtime-kernel/src/ports.ts 追加（不改动任何既有行）
export interface PresentationPort {
  send(command: unknown): void;
  onRendererHello?(handler: () => void): void;
}
```

**因为是可选方法**（`?:`），已冻结的 `noopPresentationPort` 常量字面量**不需要任何修改**就
仍然结构兼容——这是选它做可选而不是必选字段的原因，把改动面压到真正的最小。`CR-012`
"首次连接与重连走同一条路径"的原则直接体现在只有**一个**入站回调（不分别做
`onHello`/`onResyncRequest` 两个方法）：无论渲染器是第一次连接还是重连后发信号，都走同一个
`handler`，触发同一次全量 RESYNC。

`wrapPresentationPort` 内部会调用 `inner.onRendererHello?.(...)`——若某个具体 `PresentationPort`
实现（比如未来 DEV-028 的真实 WebSocket 版本）提供了这个方法，装饰器就把它接上；`noopPresentationPort`
没提供也不会报错（可选方法未定义时安全跳过，测试里改用一个提供了该方法的测试替身即可驱动断言）。

---

## 3. Scope

### Writable Scope — 新增文件（全部在既有包 `packages/runtime-kernel` 下）

```
packages/runtime-kernel/src/presentationCommand.ts
packages/runtime-kernel/src/presentationCommand.test.ts
```

### Writable Scope — 既有文件，仅追加

```
packages/runtime-kernel/src/ports.ts     （唯一一次纯新增：PresentationPort.onRendererHello?，
                                            不改动任何既有行）
packages/runtime-kernel/src/index.ts     （追加导出，不改动任何既有行）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-012/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/runtime-kernel/src/ 下除 ports.ts（唯一新增字段）/index.ts（仅追加）外的全部既有文件
  （含 machine.ts、storyRegion.ts、interactionRegion.ts、presentationRegion.ts、
  audioRegion.ts、placeholderRegions.ts、snapshot.ts、event.ts、diceEvent.ts、
  virtualPorts.ts、simulatorVotes.ts、simulator.ts、voteExtraction.ts、replay.ts、
  replayCompare.ts，及各自 .test.ts）——本节点一律不修改
packages/runtime-kernel/package.json、tsconfig.json——本节点不需要新依赖，不动
packages/persistence/**——本节点不需要，不动
packages/chapter-schema/**、packages/chapter-compiler/**、packages/rule-engine/**、
  packages/dice-engine/**、packages/narrative-composer/**、packages/shared/**
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
eslint.config.js、.prettierrc.json、vitest.config.ts
```

### Forbidden Scope

```
packages/* 除 runtime-kernel（唯二两文件）外的任何目录
apps/**、chapters/**、assets/**、scripts/**、tools/**
对 machine.ts/presentationRegion.ts/audioRegion.ts 任何 action 内部逻辑的修改
定义具体的 Presentation/Audio 命令 kind/payload schema（DEV-028/030 的职责）
Operator API（DEV-060A 的职责）、任何平台（Twitch/YouTube/Bilibili）专用接口（M4 的职责）
`ports.ts` 中 `PresentationPort.onRendererHello` 以外的任何改动
真实的 WebSocket/网络传输实现（DEV-020/028 的职责，本节点纯内存/纯函数）
新增任何 npm 依赖
```

---

## 4. Required Skills

### Required

- TypeScript 接口的向后兼容扩展（可选字段模式）
- 装饰器/中间件模式（包装一个接口实现，拦截调用）
- 事件溯源式的"折叠命令流得到当前状态"模式

### Forbidden / Unnecessary

- 任何网络/WebSocket 框架
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `PresentationPort`（DEV-009 冻结，本节点追加一个可选方法） | 装饰器包装的目标接口 |
| `noopPresentationPort`（DEV-009 冻结） | 测试里作为 `inner` 的默认/对照实现 |
| `createRuntimeMachine`（DEV-009/007 冻结） | 端到端测试：真实驱动一个 actor，验证命令流被正确捕获、折叠、重放 |

---

## 6. Outputs

1. `PresentationCommand`/`PresentationState`/`SequencedPresentationPort`/`wrapPresentationPort`（`presentationCommand.ts`）
2. `PresentationPort.onRendererHello?`（追加进 `ports.ts`）
3. `specs/dev/DEV-012/DECISIONS.md`，记录：装饰器设计理由（为何不改 action 代码）、
   `onRendererHello?` 可选字段扩展理由（对齐 DEV-002A 先例）、"互动关闭无信号"已知缺口、
   与 DEV-028/030/060A/M4 的范围边界

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-012/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Acceptance**：四文件存在；`INDEX.md` 含 Task Order T001–T005。

---

### T002 — `ports.ts` 追加 `onRendererHello?`

- **Allowed Files**：`packages/runtime-kernel/src/ports.ts`（**仅追加**）
- **Requirements**：按第 2.2 节，在 `PresentationPort` 接口内追加一行可选方法签名。
- **Acceptance**：`noopPresentationPort` 无需任何修改仍类型检查通过；`git diff` 显示该文件只新增一行接口成员，无任何其它改动。

---

### T003 — `presentationCommand.ts`：信封 + 折叠状态 + 装饰器

- **Allowed Files**：`src/presentationCommand.ts`、`src/presentationCommand.test.ts`
- **Requirements**：按第 2.1 节实现 `wrapPresentationPort`。
- **Acceptance**：
  - `send` 调用产生的 `commandSeq` 从 1 严格自增，多次调用不重复不跳号。
  - `getState()` 对 `SCENE_ENTER`/`PRES_LOADING`/`PRES_READY`/`PRES_FAILOVER`/
    `RESULT_PLAYING` 五类命令分别正确更新对应字段，未知/无关 `kind` 不影响已有状态
    （防御性：忽略不认识的 kind，而不是抛异常）。
  - 一个提供了 `onRendererHello` 的测试替身 `inner` 端口：手动触发注册的 handler 后，
    `inner.send` 收到一条 `command.kind === 'PRESENTATION_RESYNC'` 且
    `command.state` 深等于当前 `getState()` 的命令，其 `commandSeq` 是此前最后一次
    `commandSeq` 之后连续的下一个号（不重置为 1）。
  - 端到端：真实驱动一个 `createRuntimeMachine` actor（复用 `valid-minimal` fixture，
    注入 `wrapPresentationPort(testSpyPort)` 作为 `ports.presentation`）跑若干步，
    `getState().currentSceneId` 与场景推进一致。

---

### T004 — Public exports

- **Allowed Files**：`packages/runtime-kernel/src/index.ts`（**仅追加**）
- **Requirements**：追加导出 `wrapPresentationPort`，类型 `PresentationCommand`/`PresentationState`/`SequencedPresentationPort`。
- **Acceptance**：全部新符号可从包外正常导入；`git diff` 对 `index.ts` 只有新增行。

---

### T005 — 全量验证、REPORT 与 commit

- **Allowed Files**：`specs/dev/DEV-012/INDEX.md`、`REPORT.md`、`DECISIONS.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-012.md`
- **Requirements**：
  1. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  2. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  3. **`DECISIONS.md` 必须已提交**，覆盖第 6 节列出的全部要点。
  4. 更新 `INDEX.md`：T001–T005 全部勾选。
  5. `git add -A && git commit`，提交信息首行：`DEV-012: runtime api`。
  6. 追加 LEDGER 行，发 `NODE_REPORT`。
  7. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`REPORT.md` 引用的全部文档已入库；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-012 INDEX

Status: IN_PROGRESS

## Current Node

DEV-012 — Runtime API

## Objective

冻结 M1 的第三个、也是最后一个对外契约：Presentation Command。用装饰器包装已冻结的
`PresentationPort`，加上带 `commandSeq` 的信封 + 从命令流折叠得到的 `PresentationState`
投影 + 统一的首连/重连（`onRendererHello`）RESYNC 路径，不改动任何既有 action 代码。

## Allowed Scope（新增文件）
（抄录 Task Package 第 3 节实际条目）

## Allowed Scope（既有文件，仅追加）
（抄录 Task Package 第 3 节实际条目——ports.ts 的唯一新增字段 + index.ts，逐行核对不得删改既有内容）

## Read-only Scope
（抄录 Task Package 第 3 节实际条目）

## Forbidden Scope
（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 ports.ts 追加 onRendererHello?
- [ ] T003 presentationCommand.ts：信封 + 折叠状态 + 装饰器
- [ ] T004 Public exports
- [ ] T005 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001（每完成一个 Task 立即勾选并更新本字段）

## Exit Criteria

六条命令全部退出码 0；`commandSeq` 严格单调；`getState()` 正确折叠；RESYNC 路径验证通过；
`ports.ts`/`index.ts` 的 git diff 均只有新增；`DECISIONS.md` 已入库；REPORT.md 完成且
Status = READY_FOR_REVIEW；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定——**PASS 即代表 M1 全部完成**，下一步是
评估 M2（DEV-020 系列）的下发条件。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **不得修改任何已冻结的 action/state 代码**——`machine.ts`/`presentationRegion.ts` 等一律 Read-only。
2. **`ports.ts` 只能新增第 2.2 节指定的那一个可选方法**，不得动任何既有行。
3. **`index.ts` 仅追加**。
4. **不定义具体命令 kind/payload schema**——那是 DEV-028/030 的职责。
5. **不新增任何 npm 依赖**。
6. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
7. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现 Operator API（DEV-060A，M6）。
- 不实现任何平台（Twitch/YouTube/Bilibili）专用接口（M4）。
- 不实现真实网络传输（WebSocket 等）——DEV-020/028 的职责，本节点纯内存/纯函数。
- 不修复"互动关闭无信号流向 Presentation"的既有缺口（需要改冻结的 action 代码，超出本节点授权；如实记入 DECISIONS.md）。
- 不对 `AudioPort` 做类似的信封/装饰器扩展（CR-012 只指派了 Presentation Command，Audio 的声道仲裁契约是 DEV-032 的职责）。
- 不实现 `commandSeq` 跳空检测（那是接收端/DEV-020 Renderer Shell 的职责，本节点只保证发送端严格单调不跳号）。

---

## 11. Tests

### Unit tests

T002–T003 各自 `.test.ts`：覆盖第 7 节各任务描述的具体行为。

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
| A07 | `ports.ts` 只新增 `PresentationPort.onRendererHello?` 一行，`noopPresentationPort` 未被修改仍类型检查通过 | git diff + 测试检查 |
| A08 | `commandSeq` 从 1 严格自增、不重复不跳号（含 RESYNC 命令本身也占用编号） | 测试检查 |
| A09 | `getState()` 对五类已知 `kind` 正确折叠，未知 `kind` 不抛异常也不破坏已有状态 | 测试检查 |
| A10 | `onRendererHello` 触发后正确发出 `PRESENTATION_RESYNC` 命令，内容与 `getState()` 一致 | 测试检查 |
| A11 | `noopPresentationPort`（未提供 `onRendererHello`）包装后 `send`/装饰逻辑仍正常工作，不因缺少可选方法而抛异常 | 测试检查 |
| A12 | 端到端：真实 `createRuntimeMachine` + `valid-minimal` 驱动下 `getState().currentSceneId` 随场景推进正确更新 | 测试检查 |
| A13 | `index.ts` 的 `git diff` 只包含新增行 | git diff 比对 |
| A14 | `packages/runtime-kernel` 除 `ports.ts`/`index.ts` 外的既有文件 git diff 为空 | git diff 比对 |
| A15 | `packages/persistence`、`chapter-schema`、`chapter-compiler`、`rule-engine`、`dice-engine`、`narrative-composer` 全部未被修改 | git diff 比对 |
| A16 | 未新增任何 npm 依赖 | 文件检查 |
| A17 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点，含"互动关闭无信号"已知缺口的如实记录 | 文件检查 |
| A18 | `specs/dev/DEV-012/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T005 全部勾选 | 文件 + 文本检查 |
| A19 | `git log` 新增恰 1 条提交，首行 `DEV-012: runtime api`；提交时 `git status --porcelain` 为空 | 命令 |
| A20 | LEDGER 含 `NODE_REPORT-DEV-012` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A21 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT（含确认 `DECISIONS.md` 已提交）→ commit → 发 NODE_REPORT → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A21。
