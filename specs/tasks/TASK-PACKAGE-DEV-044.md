# TASK PACKAGE — DEV-044

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-044 |
| Node Name | Interaction Aggregator (A/B/C/D) |
| Milestone | M4 — Twitch Complete（第五个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-042（DONE，`verdict_ref: "0179"`）——`NormalizedChatMessage` 的第一个真实消费方 |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### 现实核对：`Choice.id` 冻结为 `"A"\|"B"\|"C"\|"D"`，`Vote`/`PlatformPort.onVote` 已冻结但从未被真实驱动过

Dev Spec 第 989 行 `Choice` 类型冻结：`id: "A" | "B" | "C" | "D"`；第 50
行"观众 A/B/C/D"是本节点要解析的用户输入形态。`packages/runtime-kernel/src/ports.ts`
（DEV-009/012 冻结）已有 `Vote{viewerId,choiceId}` 与
`PlatformPort.onVote(handler)`，但 `noopPlatformPort.onVote` 是空实现，
全仓库从未有真实代码调用过注册的 handler——本节点是第一个产出"真的会调用
onVote handler 的东西"的节点，但**不直接修改/接入 `runtime-kernel`**
（那需要把 `Ports.platform` 换成真实实现，是留给 M4 收尾或未来编排节点
的工作，本节点只交付独立可测试的聚合器本身）。

### 范围核对：只做"解析 NormalizedChatMessage.text 里的 A/B/C/D → Vote"，不碰 runtime-kernel，不重新定义 Vote 类型

`Vote` 已经在 `runtime-kernel` 冻结，但 `platform-core` 不应该反向依赖
`runtime-kernel`（`platform-core` 是给包括 `runtime-kernel` 在内的下游
消费的中立层，依赖方向不能倒转）——本节点在 `platform-core` 内部本地
镜像一个结构相同的 `Vote` 类型（与 DEV-035/037/040 对 `Health`/`Clock`
的处理方式一致），不 import `runtime-kernel`。解析规则明确、窄化：
`text.trim().toUpperCase()` 精确等于 `'A'`/`'B'`/`'C'`/`'D'` 之一才算
有效投票，其余一律忽略（不做模糊匹配/自然语言理解——那是过度设计，
Dev Spec 也没有要求任何更复杂的解析）。

---

## 2. 架构设计

### 2.1 `packages/platform-core/src/interactionAggregator.ts`（新文件）

```typescript
/** 本地镜像 runtime-kernel 冻结的 Vote 形状（viewerId/choiceId）。
 * platform-core 是被 runtime-kernel 消费的中立层，不能反向依赖它，
 * 与 DEV-035/037/040 对 Health/Clock 的处理方式一致。 */
export interface Vote {
  viewerId: string;
  choiceId: string;
}

export interface InteractionAggregator {
  /** 与 runtime-kernel 冻结的 PlatformPort.onVote 同形状，供未来编排节点
   *  直接复用；本节点不接入 runtime-kernel，只保证签名兼容。 */
  onVote(handler: (vote: Vote) => void): void;
  /** 喂入一条已归一化的聊天消息；若 text 精确匹配 A/B/C/D（trim+大写）
   *  则合成 Vote 并调用已注册的 handler，否则静默忽略。 */
  ingest(message: NormalizedChatMessage): void;
}

export function createInteractionAggregator(): InteractionAggregator
```

- `onVote(handler)`：存一个 handler（单一注册，覆盖式，与冻结的
  `PlatformPort.onVote` 签名/语义一致——`noopPlatformPort` 同样是单一
  handler 风格）。
- `ingest(message)`：`const choiceId = message.text.trim().toUpperCase()`；
  若 `choiceId` 是 `'A'`/`'B'`/`'C'`/`'D'` 之一，且已注册了 handler，
  调用 `handler({viewerId: message.viewerId, choiceId})`；否则什么都不做
  （未注册 handler 时也是静默忽略，不抛异常）。
- **零新增 npm 依赖**：纯字符串比较，不需要任何解析库。
- **不做去重**（DEV-043 已经在更上游的 notification 层做过一次，
  `ingest` 假设传入的消息已经是去重后的）、**不做多次投票限制/频率
  限制**（Dev Spec 未要求，属于未来可能的扩展，不在本节点范围）。

---

## 3. Scope

### Writable Scope

```
packages/platform-core/src/interactionAggregator.ts        （新增）
packages/platform-core/src/interactionAggregator.test.ts   （新增）
packages/platform-core/src/index.ts                        （追加导出）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-044/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交，同 Constraint 8）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/platform-core/src/index.ts（DEV-042 冻结部分，只读取 NormalizedChatMessage 类型）
packages/runtime-kernel/src/ports.ts（Read-only，仅用于核对 Vote/PlatformPort.onVote 形状一致，不得 import）
其余同既有节点惯例
```

### Forbidden Scope

```
修改 packages/runtime-kernel/**（含 ports.ts/machine.ts）
import 或依赖 @interactive-story/runtime-kernel（Vote 必须本地镜像，不反向依赖）
实现多次投票限制/频率限制/模糊匹配解析（均为未来可能的扩展，非本节点范围）
实现去重（DEV-043 职责，已在更上游完成）
把聚合器接入任何真实 Twitch 数据流或 runtime-kernel 调用点
新增任何 npm 依赖
创建 packages/ai-host
```

---

## 4. Required Skills

### Required

- 简单字符串归一化（trim/toUpperCase）与精确匹配

### Forbidden / Unnecessary

- 任何 NLP/模糊匹配/正则以外的解析库
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/baseline/DEV_SPEC_V1.0.md` 第 989 行 | `Choice.id: "A"\|"B"\|"C"\|"D"` 冻结形状 |
| `packages/platform-core/src/index.ts`（Read-only，DEV-042 冻结） | `NormalizedChatMessage` 契约 |
| `packages/runtime-kernel/src/ports.ts`（Read-only） | `Vote`/`PlatformPort.onVote` 形状参照（本地镜像，不 import） |

---

## 6. Outputs

1. `Vote`/`InteractionAggregator`/`createInteractionAggregator`（`interactionAggregator.ts`）
2. `specs/dev/DEV-044/DECISIONS.md`，至少覆盖：为何本地镜像 `Vote`
   而不依赖 `runtime-kernel`（依赖方向）、解析规则窄化为精确单字母匹配
   的理由、为何不做去重/频率限制（分属其他层/未来节点）

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-044/{INDEX,REQUIREMENTS,ACCEPTANCE,REPORT}.md`
- **Acceptance**：四份节点文档存在；`INDEX.md` 含 Task Order T001–T002。

---

### T002 — `interactionAggregator.ts` + 测试 + `index.ts` 导出 + 全量验证、REPORT 与 commit

- **Allowed Files**：`packages/platform-core/src/interactionAggregator.ts`、`.test.ts`、`index.ts`、`specs/dev/DEV-044/{INDEX,REPORT,DECISIONS}.md`
- **Requirements**：按第 2.1 节实现。
- **Acceptance（功能部分）**：
  - `text` 精确为 `'a'`/`'A'`/`' A '`（大小写/前后空白均可）→ 触发
    handler，`choiceId` 为大写 `'A'`。B/C/D 同理各至少一例。
  - `text` 是其他内容（如 `'hello'`、`'AB'`、空字符串）→ 不触发
    handler。
  - 未调用 `onVote` 注册 handler 时 `ingest` 任意消息不抛异常。
  - `onVote` 二次调用覆盖第一个 handler（新消息只触发最后注册的
    handler）。
  - `viewerId`/其余字段与传入的 `NormalizedChatMessage` 一致传递到
    `Vote`。
- **Requirements（验证部分）**：
  1. `index.ts` 追加导出 T002 全部公开符号。
  2. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  3. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  4. **`DECISIONS.md` 必须已提交**。
  5. 更新 `INDEX.md`：T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW`。
  6. `git add`（仅本节点 Writable Scope 内文件）`&& git commit`，首行：`DEV-044: interaction aggregator (a/b/c/d vote parsing)`，**恰 1 条提交**。
  7. **不要**再单独提交 LEDGER 追加行或自己的 NODE_REPORT 消息文件——写入工作区留给 Commander 收尾（同 DEV-041/042/043 Constraint 8）。
  8. 自行核实：`git log -1` 只看到这一条新提交、NODE_REPORT 消息文件与 LEDGER 追加行存在于工作区但未提交。
  9. **STOP**。
- **Acceptance（命令部分）**：六条命令全部退出码 0；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-044 INDEX

Status: IN_PROGRESS

## Current Node

DEV-044 — Interaction Aggregator (A/B/C/D)

## Objective

新增 `packages/platform-core/src/interactionAggregator.ts`：把
`NormalizedChatMessage.text` 解析为 A/B/C/D 投票（trim+大写精确匹配），
合成本地镜像的 `Vote{viewerId,choiceId}` 并调用注册的 handler（签名与
`runtime-kernel` 冻结的 `PlatformPort.onVote` 一致，但不 import/依赖
`runtime-kernel`）。不做去重（DEV-043 已完成）、不做频率限制、不接入
真实数据流或 runtime-kernel。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 interactionAggregator.ts + 测试 + index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

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

1. **不修改 `packages/runtime-kernel/**`，不 import/依赖它**——`Vote` 必须本地镜像。
2. **解析规则窄化为精确单字母匹配**（trim+大写），不做模糊匹配/NLP。
3. **不实现去重/频率限制**（分属其他层/未来节点）。
4. **不新增任何第三方 npm 依赖**。
5. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
6. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。
7. **T002 提交后，LEDGER 追加行与自己的 NODE_REPORT 消息文件一律不要再提交**——写入工作区即可，留给 Commander 收尾统一提交。

---

## 10. Non-goals / Out-of-scope

- 不实现多次投票限制/频率限制。
- 不实现模糊匹配/自然语言投票解析。
- 不接入 `runtime-kernel`/真实 Twitch 数据流（留给未来编排节点）。
- 不实现真正的重连算法（DEV-045）、发送消息（DEV-046）。

---

## 11. Tests

### Unit tests

T002：A/B/C/D 各自的大小写/空白容错、非法输入忽略、未注册 handler 不
抛异常、handler 覆盖式注册、字段透传正确性。

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
| A07 | A/B/C/D 大小写+前后空白容错，各至少一例触发 handler | 测试检查 |
| A08 | 非法/无关文本不触发 handler | 测试检查 |
| A09 | 未注册 handler 时 ingest 不抛异常 | 测试检查 |
| A10 | 二次 onVote 注册覆盖第一个 handler | 测试检查 |
| A11 | viewerId 等字段正确透传到 Vote | 测试检查 |
| A12 | 未新增第三方 npm 依赖 | 文件检查 |
| A13 | `runtime-kernel/**` 未被修改，且未被 import/依赖 | git diff + 源码检查 |
| A14 | 未创建 packages/ai-host | 文件检查 |
| A15 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A16 | `specs/dev/DEV-044/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A17 | `git log` 新增恰 1 条提交，首行 `DEV-044: interaction aggregator (a/b/c/d vote parsing)` | 命令 |
| A18 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A19 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT → 仅
commit 代码+节点文档（一条提交）→ 写入但不提交 LEDGER/NODE_REPORT → 自行
核实完成三要素 → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A19。
