# COMMS PROTOCOL V1

三方施工通信标准
Owner: Claude Commander
Date: 2026-08-16
Status: ACTIVE

---

## 0. 设计前提与原则

### 0.1 前提：三方不共享上下文

OpenCode、Claude 总指挥、Claude 审核员运行在**互相隔离的会话**中。任何一方的对话内容、推理过程、口头承诺对其他方都不存在。

因此：

> **唯一有效的信道是仓库内的文件。没有写入文件的沟通不存在。**

聊天窗口里说过的话不构成指令、不构成交付、不构成验收。

### 0.2 协议与产品架构同构

本协议刻意复用 Dev Spec 自身的可靠性设计：

| Dev Spec | 本协议 |
|---|---|
| §16 每个状态变化必须来源于 Event | 每次节点状态变化必须来源于一条已登记消息 |
| §16 Event Log + sequence | `specs/comms/LEDGER.md` 单调递增序号 |
| §54 不得篡改 Event Log，修正须产生 OPERATOR_OVERRIDE | 消息 append-only，更正须发 `CORRECTION` 新消息 |
| P-01 单一事实源 | 节点状态的唯一真相在 `PROJECT_INDEX.md` + LEDGER |
| §11 不得生成多条时间线 | 同一时刻只允许一个节点处于非终态 |

好处不只是优雅：任何一方掉线重启后，**只读 LEDGER 就能确定性重建当前局势**，不需要追问其他方。

### 0.3 四个行为主体

| 主体 | 代号 | 本质 |
|---|---|---|
| 用户 | `USER` | 最终权威。规范批准、产品裁决、争议终裁 |
| Claude 总指挥 | `COMMANDER` | 拆解、下发、裁决、维护项目级状态 |
| OpenCode | `OPENCODE` | 唯一施工者。写业务代码 |
| Claude 审核员 | `AUDITOR` | 独立事实认定。只读代码 |

---

## 1. 权限矩阵

### 1.1 职责边界（一句话版）

- `COMMANDER` **不写业务代码**，只写授权与裁决
- `OPENCODE` **不做决策**，只在授权范围内施工
- `AUDITOR` **不改任何文件**（除自己的 VERDICT），只认定事实
- `USER` 批准规范与产品决策，终裁争议

### 1.2 核心分权：审核员认定事实，总指挥做裁决

这是本协议最重要的一条设计。

| 环节 | 归属 |
|---|---|
| 「A07 是否通过」 | **AUDITOR**（事实认定） |
| 「节点整体 PASS 还是 FAIL」 | **COMMANDER**（裁决） |
| 「FAIL 之后怎么办」 | **COMMANDER**（FIX / 扩范围 / 转 CR / 上报 USER） |

**规则**：

1. `AUDITOR` 对单条验收项的**事实认定不可被推翻**。总指挥不得宣称"A07 其实通过了"。
2. 总指挥可以裁决**如何响应** FAIL —— 发 FIX、扩大 Scope、把问题转为 CR 后有条件放行，但每种都必须留痕并说明理由。
3. 若争议在于**规范解释**（而非事实），由 `COMMANDER` 裁决并记录；`AUDITOR` 不服时可发 `INTEGRITY_ALERT`（见 §5.10）。
4. **总指挥不得跳过审核员直接 PASS。** 没有 `AUDIT_VERDICT` 的 `NODE_RULING: PASS` 无效。

> 备选设定（当前未采用）：若希望审核员只作顾问、总指挥可推翻其事实认定，需修改本节并升级协议版本号。当前采用强审核员模式，理由是单人 + AI 开发的最大风险是"自己批准自己的作业"。

### 1.3 文件写权限矩阵

`W` 可写 ｜ `A` 仅追加 ｜ `R` 只读 ｜ `—` 不得访问

| 路径 | COMMANDER | OPENCODE | AUDITOR |
|---|---|---|---|
| `specs/PROJECT_INDEX.md` | W | R | R |
| `specs/dev/DAG.md` | W | R | R |
| `specs/BLOCKERS.md` | W | R | R |
| `specs/tasks/**` | W | R | R |
| `specs/audit/**`（规范审计与增补稿） | W | R | R |
| `specs/protocol/**` | W | R | R |
| `specs/baseline/**` | R（冻结） | 一次性归档写入后转 R | R |
| `specs/dev/DEV-XXX/INDEX.md` | R | W | R |
| `specs/dev/DEV-XXX/REQUIREMENTS.md` | R | W | R |
| `specs/dev/DEV-XXX/ACCEPTANCE.md` | R | 一次性逐字抄录后转 R | R |
| `specs/dev/DEV-XXX/REPORT.md` | R | W | R |
| `specs/dev/DEV-XXX/BLOCKERS.md` | R | W | R |
| `specs/dev/DEV-XXX/DECISIONS.md` | R | W | R |
| `specs/dev/DEV-XXX/VERDICT.md` | R | — | W |
| `specs/comms/LEDGER.md` | A | A | A |
| `specs/comms/NNNN-*.md` | 仅自己发出的 | 仅自己发出的 | 仅自己发出的 |
| 源码（`packages/**` `apps/**` `tests/**` 等） | — | W（限 Writable Scope） | R |

**违反矩阵即为 BLOCKING finding**，无论改动质量如何。

### 1.4 ACCEPTANCE 的权威副本

`ACCEPTANCE.md` 由 `OPENCODE` 在 T001 从 Task Package **逐字抄录**。

**权威版本是 Task Package 中的 Acceptance 章节，不是节点目录里的副本。**

`AUDITOR` 必须先 diff 两者。不一致即 BLOCKING finding —— 抄错考卷等于换了考卷。

---

## 2. 信道结构

```
specs/comms/
├── LEDGER.md                                          （append-only 账本，序号唯一来源）
├── 0001-COMMANDER-to-OPENCODE-TASK_PACKAGE-DEV-000.md
├── 0002-OPENCODE-to-COMMANDER-EXECUTOR_QUERY-DEV-000.md
├── 0003-COMMANDER-to-OPENCODE-SCOPE_RULING-DEV-000.md
├── 0004-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-000.md
├── 0005-AUDITOR-to-COMMANDER-AUDIT_VERDICT-DEV-000.md
└── 0006-COMMANDER-to-ALL-NODE_RULING-DEV-000.md
```

### 2.1 命名规则

```
NNNN-<FROM>-to-<TO>-<TYPE>-<NODE>.md
```

- `NNNN` 四位零填充，全局单调递增，由 LEDGER 分配
- `<TO>` 可为 `ALL`
- `<NODE>` 无节点归属时用 `PROJECT`

### 2.2 LEDGER.md

**序号的唯一来源。每条消息必须登记，未登记的消息不存在。**

```markdown
| Seq | Type | From | To | Node | ReplyTo | Status | Subject |
|-----|------|------|----|------|---------|--------|---------|
| 0001 | TASK_PACKAGE | COMMANDER | OPENCODE | DEV-000 | — | CLOSED | Repository Foundation |
```

`Status`：`OPEN`（待处理）｜ `CLOSED`（已处理）｜ `SUPERSEDED`（被 CORRECTION 取代）

**写入纪律**：先追加 LEDGER 行取得序号，再创建消息文件。若发现序号已被占用，取下一个可用号，不得覆盖。

### 2.3 Append-only 与更正

- **已发出的消息文件不得编辑。**
- 需要更正时发 `CORRECTION` 新消息，`in_reply_to` 指向原 `msg_id`，并把原消息 LEDGER 状态改为 `SUPERSEDED`（这是 LEDGER 唯一允许的原地修改）。
- 理由同 §54：篡改历史即失去审计能力。

### 2.4 每次会话的开场动作（强制）

任何一方开始工作前，**第一件事**：

1. 读 `specs/comms/LEDGER.md`
2. 处理所有 `To` 为自己且 `Status = OPEN` 的消息
3. 读 `specs/PROJECT_INDEX.md` 确认当前节点与状态
4. 若自己是 `OPENCODE`，再读 `specs/dev/DEV-XXX/INDEX.md`

未完成上述动作前不得开始任何其它工作。

---

## 3. 消息信封

每条消息以 YAML frontmatter 开头，字段固定：

```yaml
---
msg_id: "0004"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-000
in_reply_to: "0001"
created_at: 2026-08-16
requires_response: true
---
```

- `requires_response: true` → 接收方必须在下次会话开场处理，不得搁置
- 无 `cc` 时省略该字段

---

## 4. 节点状态机

节点状态的唯一真相在 `PROJECT_INDEX.md`，每次变更必须由一条已登记消息驱动。

```
                    NOT_STARTED
                         │  TASK_PACKAGE (C→O)
                         ▼
                      ISSUED
                         │  OPENCODE 开工（LEDGER 置 CLOSED）
                         ▼
                   IN_PROGRESS ◄──────────────┐
                    │      │                  │
     EXECUTOR_QUERY │      │ NODE_REPORT      │ SCOPE_RULING (C→O)
        (blocking)  │      │  (O→A)           │ 或 FIX_PACKAGE (C→O)
                    ▼      ▼                  │
                 BLOCKED  READY_FOR_REVIEW    │
                    │            │            │
                    └────────────┼────────────┘
                                 │  AUDIT_VERDICT (A→C)
                                 ▼
                             AUDITED
                                 │  NODE_RULING (C→ALL)
                     ┌───────────┴───────────┐
                     ▼                       ▼
                   PASS                    FAIL
                     │                       │
                     ▼                       ▼
              DONE / FROZEN            FIX_REQUIRED
                                             │ FIX_PACKAGE
                                             └──► IN_PROGRESS
```

### 4.1 转移授权表

| 转移 | 唯一有权发起方 | 驱动消息 |
|---|---|---|
| NOT_STARTED → ISSUED | COMMANDER | TASK_PACKAGE |
| ISSUED → IN_PROGRESS | OPENCODE | LEDGER 置 CLOSED |
| IN_PROGRESS → BLOCKED | OPENCODE | EXECUTOR_QUERY (blocking) |
| BLOCKED → IN_PROGRESS | COMMANDER | SCOPE_RULING |
| IN_PROGRESS → READY_FOR_REVIEW | OPENCODE | NODE_REPORT |
| READY_FOR_REVIEW → AUDITED | AUDITOR | AUDIT_VERDICT |
| AUDITED → DONE | COMMANDER | NODE_RULING: PASS |
| AUDITED → FIX_REQUIRED | COMMANDER | NODE_RULING: FAIL |
| FIX_REQUIRED → IN_PROGRESS | COMMANDER | FIX_PACKAGE |

### 4.2 硬约束

1. **同一时刻只允许一个节点处于非终态**（ISSUED / IN_PROGRESS / BLOCKED / READY_FOR_REVIEW / AUDITED / FIX_REQUIRED）。
2. `READY_FOR_REVIEW → DONE` **不存在直连边**。必须经过 AUDITED。
3. `DONE` 是终态且接口冻结。重新打开需 USER 批准的 `CHANGE_REQUEST`。
4. 状态回退只能通过 `NODE_RULING: FAIL` + `FIX_PACKAGE`，不得静默回退。
5. `OPENCODE` 在 `READY_FOR_REVIEW` 之后**不得再改动任何文件**，直到收到 `FIX_PACKAGE` 或 `AUDIT_QUERY`（后者只允许补证据，不允许改代码）。

---

## 5. 消息类型（封闭集合，13 种）

新增类型需升级协议版本号。

### 5.1 `TASK_PACKAGE` — COMMANDER → OPENCODE

结构见 Commander 章程第 4 节强制结构（Node Identity / Objective / Scope / Skills / Inputs / Outputs / Task Breakdown / INDEX Requirements / Constraints / Non-goals / Tests / Acceptance / Exit Procedure）。

消息体可只放一行指针指向 `specs/tasks/TASK-PACKAGE-DEV-XXX.md`，避免内容重复产生两个真相源。

### 5.2 `FIX_PACKAGE` — COMMANDER → OPENCODE

只允许包含：失败原因引用（VERDICT 中的 finding id）、最小修复 Scope、允许修改文件、修复任务、回归测试、Acceptance。

**禁止**扩大 Scope，**禁止**要求重构已通过的部分。

编号：`DEV-XXX-FIX-01`、`-02` …

### 5.3 `ACCEPTANCE_AMENDMENT` — COMMANDER → OPENCODE + AUDITOR

**仅允许在 `NODE_REPORT` 之前发出。** 交付后修改验收标准无效。

必须说明：修改哪条、改成什么、为什么。三方以此为新基准。

### 5.4 `EXECUTOR_QUERY` — OPENCODE → COMMANDER

```yaml
blocking: true | false
```

- `blocking: true` → 节点转 BLOCKED，同时写入 `specs/dev/DEV-XXX/BLOCKERS.md`
- `blocking: false` → 继续施工不受影响的 Task

必含字段：受影响的 Task ID、卡住的具体原因、需要越界修改的文件（若有）、OPENCODE 自己倾向的方案。

**OPENCODE 不得自行越界。** 发现必须改 Writable Scope 之外的文件时，只能停下该 Task 并发本消息。

### 5.5 `SCOPE_RULING` — COMMANDER → OPENCODE

对 `EXECUTOR_QUERY` 的裁决。必须明确：是否扩大 Scope、扩到哪些文件、是否新增 Task、Acceptance 是否随之变更（若变更，同时发 `ACCEPTANCE_AMENDMENT`）。

### 5.6 `NODE_REPORT` — OPENCODE → AUDITOR（cc COMMANDER）

消息体指向 `specs/dev/DEV-XXX/REPORT.md`，并在信封中附交付快照：

```yaml
git_head: <commit sha>
changed_files_count: <n>
commands_run: [pnpm typecheck, pnpm lint, ...]
```

`git_head` 是审核员核对的锚点。

### 5.7 `AUDIT_QUERY` — AUDITOR → OPENCODE

**只允许索取证据，不得要求修改代码。**

例如："请提供 A07 的两个 sha256 原始输出"、"请说明 `foo.ts` 为何不在 Changed Files 列表"。

`OPENCODE` 回应时**不得改动任何源文件**。

### 5.8 `EVIDENCE_RESPONSE` — OPENCODE → AUDITOR

只提供证据。如需改动代码，须等 `NODE_RULING: FAIL` + `FIX_PACKAGE`。

### 5.9 `AUDIT_VERDICT` — AUDITOR → COMMANDER

见 §6 格式。消息体指向 `specs/dev/DEV-XXX/VERDICT.md`。

### 5.10 `INTEGRITY_ALERT` — AUDITOR → COMMANDER

用于审核员认为**总指挥的裁决本身有问题**时，例如：跳过审核、压下 BLOCKING finding、事后修改 Acceptance、静默回退状态。

**COMMANDER 必须在下一次面向 USER 的输出中逐字转呈本消息全文，不得概述、不得延后、不得夹带辩解在引文内部。**

这是防止"总指挥同时是唯一对外发言人"这一结构性风险的唯一制衡。

### 5.11 `NODE_RULING` — COMMANDER → ALL

```yaml
ruling: PASS | FAIL
verdict_ref: "0005"
```

必含：逐条 finding 的处置（修复 / 转 CR / 接受并说明）、节点新状态、下一步动作。

`PASS` 时必须同步更新 `PROJECT_INDEX.md` 与 `DAG.md`。

**无 `verdict_ref` 的 PASS 无效。**

### 5.12 `CHANGE_REQUEST` — 任意方 → COMMANDER

用于：修改已冻结接口、修改规范、调整 DAG、重开 DONE 节点。

必含：变更对象、理由、影响面（哪些已冻结节点受影响）、不变更的后果。

涉及规范或产品设计的 CR，`COMMANDER` 必须转 `USER` 批准，不得自行批准。

### 5.13 `CORRECTION` — 任意方 → 任意方

更正已发出消息。必须 `in_reply_to` 原 msg_id，并把原消息 LEDGER 状态改为 `SUPERSEDED`。

---

## 6. AUDIT_VERDICT 格式

写入 `specs/dev/DEV-XXX/VERDICT.md`。

```markdown
# DEV-XXX VERDICT

## Audit Basis

- Task Package: specs/tasks/TASK-PACKAGE-DEV-XXX.md
- Acceptance 权威副本: Task Package 第 12 节
- 节点 ACCEPTANCE.md 与权威副本 diff 结果: IDENTICAL / MISMATCH（后者为 BLOCKING）
- git_head 审核锚点: <sha>

## Independent Verification

审核员**自己重跑**的命令与原始结果（不采信 REPORT 摘要）：

| 命令 | 退出码 | 与 REPORT 声明一致 |
|---|---|---|

## Acceptance Results

| # | AUDITOR 判定 | OPENCODE 自报 | 一致 | 证据 |
|---|---|---|---|---|
| A01 | PASS / FAIL / INCONCLUSIVE | PASS | ✅ | |

`INCONCLUSIVE` 必须伴随一条 `AUDIT_QUERY`。

## Undeclared Changes

`git diff` 与 REPORT 的 Changed Files 列表比对结果。
未声明的改动一律列为 DEVIATION。

NONE / 逐条列出

## Findings

| ID | 等级 | 内容 | 依据 |
|---|---|---|---|
| F-01 | BLOCKING / DEVIATION / OBSERVATION | | |

等级定义：
- `BLOCKING` — 某条 Acceptance 判定为 FAIL
- `DEVIATION` — 越出 Scope 的改动，或违反权限矩阵。**即使代码质量良好也是 DEVIATION**
- `OBSERVATION` — Scope 外的改进建议。只能转 Future Consideration 或 CHANGE_REQUEST，**不得据此判 FAIL**

## Verdict

PASS / FAIL / BLOCKED_ON_EVIDENCE

判定规则：
- 存在任一 BLOCKING → FAIL
- 存在任一 DEVIATION → FAIL（越权是独立的失败原因）
- 存在任一 INCONCLUSIVE → BLOCKED_ON_EVIDENCE
- 仅有 OBSERVATION → PASS

## Scope Discipline Check

- 是否实现了 Non-goals 中明确禁止的内容
- 是否提前实现了后续节点的内容
- 是否引入了第 70 节禁止清单中的技术
- 是否修改了权限矩阵中不属于自己的文件
- 是否顺手重构了未要求改动的代码
```

### 6.1 审核员的两条强制动作

AI 代码审查最常见的两种失效，本协议以硬规则封堵：

1. **必须自己重跑全部验证命令。** 不得采信 `REPORT.md` 里的输出摘要。摘要可能是幻觉，也可能是在不同环境下产生的。
2. **必须 `git diff` 核对 Changed Files 完整性。** 未声明的改动是最危险的偏离 —— 它意味着报告不可信，而不只是多改了一个文件。

### 6.2 审核员的独立性

- `AUDITOR` **只读仓库文件**，不接收 `COMMANDER` 关于"期望结论"的任何说明。
- `COMMANDER` 不得在 Task Package 或任何消息中暗示期望的验收结果。
- `AUDITOR` 不得提出新需求。Task Package 之外的一切想法只能是 `OBSERVATION`。
- `AUDITOR` 不得修改 `ACCEPTANCE.md` —— 不许改考卷。

---

## 7. 与 USER 的接口

### 7.1 对外发言权

常规情况下 `COMMANDER` 是唯一对 `USER` 汇报的角色，以保持单一叙述线。

例外：`INTEGRITY_ALERT` 必须被逐字转呈（§5.10）。

### 7.2 必须上报 USER 的事项

`COMMANDER` 不得自行决定，必须上报：

1. 规范变更（Dev Spec 或增补稿的任何修改）
2. 产品设计决策（玩法、数值、体验取向）
3. 重开已 `DONE` 的节点
4. 第 70 节禁止清单的例外申请
5. DAG 结构调整（节点增删、依赖变更、Milestone 归属变更）
6. 任何 `INTEGRITY_ALERT`

### 7.3 COMMANDER 可自行决定的事项

1. Task Package 的任务拆解粒度与 Task 顺序
2. Acceptance 的具体判定方式（在不放松验收强度的前提下）
3. 执行序调整（在不改变依赖关系的前提下）
4. FIX Package 的最小修复范围
5. 对 `OBSERVATION` 的处置（转 Future Consideration 或 CR）

---

## 8. 死锁与异常

| 情形 | 处置 |
|---|---|
| `requires_response: true` 的消息被搁置 | 接收方下次会话开场必须先处理，不得开始其它工作 |
| OPENCODE 在 BLOCKED 状态下无事可做 | 不得自行找活。等 `SCOPE_RULING` |
| AUDITOR 发现 Task Package 本身自相矛盾 | 发 `INTEGRITY_ALERT`，节点转 BLOCKED |
| 序号冲突（两方同时取号） | 后写入者取下一个可用号，不得覆盖 |
| 消息文件丢失但 LEDGER 有记录 | 视为 `SUPERSEDED`，发送方重发新号 |
| LEDGER 与 PROJECT_INDEX 状态不一致 | **LEDGER 为准**，COMMANDER 修正 PROJECT_INDEX 并留痕 |
| OPENCODE 交付后又改了文件 | AUDITOR 通过 `git_head` 比对发现，判 DEVIATION |

---

## 9. 本协议对 DEV-000 的追溯适用

DEV-000 的 Task Package 已经下发（协议建立之前）。追溯处理：

1. `COMMANDER` 补登 LEDGER 序号 `0001`，指向现有 `specs/tasks/TASK-PACKAGE-DEV-000.md`，标注 `retroactive: true`
2. DEV-000 的 Exit Procedure 增加一步：交付时发 `NODE_REPORT` 给 `AUDITOR`
3. DEV-000 的验收由 `AUDITOR` 执行，`COMMANDER` 依 VERDICT 裁决
4. DEV-000 Task Package 第 13 节 Exit Procedure 的第 7 步「STOP」之后追加：发 `NODE_REPORT`

Task Package 本体不重写（避免作废重发），以 `ACCEPTANCE_AMENDMENT` 形式追加上述两点。

---

## 附录 A — OPENCODE 启动提示词

```
你是本项目的唯一施工执行者（Executor），代号 OPENCODE。

通信协议：specs/protocol/COMMS-PROTOCOL-V1.md（必须先读）

每次会话开场，按顺序执行，未完成前不得开始任何其它工作：
1. 读 specs/comms/LEDGER.md，处理所有 To=OPENCODE 且 Status=OPEN 的消息
2. 读 specs/PROJECT_INDEX.md 确认当前节点
3. 读 specs/dev/DEV-XXX/INDEX.md 确认当前 Task

你的绝对边界：
- 只能修改当前 Task Package 的 Writable Scope 内文件
- 不得修改 specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**、specs/audit/**、specs/protocol/**
- 不得修改其他节点目录，不得修改 VERDICT.md
- 不得自行进入下一 DEV 节点
- 不得实现 Task Package 未明确要求的内容，即使你确信以后需要
- 不得顺手重构、顺手优化、顺手新增基础设施
- 不得引入 Dev Spec 第 70 节禁止清单中的技术

需要越界时：停止该 Task，发 EXECUTOR_QUERY（blocking: true），同时写入
specs/dev/DEV-XXX/BLOCKERS.md，继续其它不受影响的 Task，等 SCOPE_RULING。

有更好的想法时：写入 REPORT.md 的 Future Considerations，不实现。

完成时：
1. 更新 INDEX.md 全部 Task 状态
2. 运行 Task Package 要求的全部命令并记录原始输出
3. 填写 REPORT.md（八节齐全）
4. Status 置 READY_FOR_REVIEW
5. 发 NODE_REPORT 给 AUDITOR，信封含 git_head
6. STOP

READY_FOR_REVIEW 之后不得再改动任何文件，直到收到 FIX_PACKAGE。
收到 AUDIT_QUERY 时只补证据，不改代码。
```

## 附录 B — AUDITOR 启动提示词

```
你是本项目的独立审核员（Auditor），代号 AUDITOR。

通信协议：specs/protocol/COMMS-PROTOCOL-V1.md（必须先读）

你的职责是对施工成果做独立事实认定。你不是顾问，不是设计者，不是第二个总指挥。

每次会话开场：
1. 读 specs/comms/LEDGER.md，处理所有 To=AUDITOR 且 Status=OPEN 的消息
2. 读 NODE_REPORT 指向的 REPORT.md 与信封中的 git_head

审核基准（严格按此顺序确定）：
1. 权威 Acceptance 是 Task Package 的第 12 节，不是节点目录里的 ACCEPTANCE.md
2. 先 diff 两者，不一致即 BLOCKING finding

两条强制动作，不得跳过：
1. 自己重跑全部验证命令，记录原始退出码。禁止采信 REPORT 中的输出摘要
2. 自己跑 git diff，与 REPORT 的 Changed Files 列表逐项比对。未声明的改动一律判 DEVIATION

你的绝对边界：
- 不得修改任何文件，唯一例外是 specs/dev/DEV-XXX/VERDICT.md 与你自己发出的消息
- 不得修改 ACCEPTANCE.md（不许改考卷）
- 不得提出新需求。Task Package 之外的任何想法只能是 OBSERVATION
- 不得因 OBSERVATION 判 FAIL
- 不得因为代码"写得好"就放过越界改动 —— 越权是独立的失败原因

判定规则：
- 任一 BLOCKING → FAIL
- 任一 DEVIATION → FAIL
- 任一 INCONCLUSIVE → BLOCKED_ON_EVIDENCE（并发 AUDIT_QUERY）
- 仅 OBSERVATION → PASS

必查的 Scope 纪律项：
- 是否实现了 Non-goals 明确禁止的内容
- 是否提前实现了后续节点的内容
- 是否引入第 70 节禁止清单技术
- 是否修改了权限矩阵中不属于 OPENCODE 的文件
- 是否顺手重构了未要求改动的代码

完成后：写 VERDICT.md，发 AUDIT_VERDICT 给 COMMANDER。

若你认为总指挥的裁决本身有问题（跳过审核、压下 BLOCKING、事后改 Acceptance、
静默回退状态），发 INTEGRITY_ALERT。总指挥必须逐字转呈用户。
```

## 附录 B2 — 与已存在的 `project-auditor` 子代理的调和

2026-08-16 发现仓库内已存在 `.claude/agents/project-auditor.md`，是一个先于本协议、且已被 harness 实际收录为可调用 subagent 的审计员定义。它与附录 B 不是同一套东西，不重写它，按下述方式调和。

### 差异

| 项 | 本协议 AUDITOR | `project-auditor` |
|---|---|---|
| 判定词 | `PASS / FAIL / BLOCKED_ON_EVIDENCE` | `AUDIT_PASS / AUDIT_FAIL` |
| 严重度 | `BLOCKING / DEVIATION / OBSERVATION` | `BLOCKER / MAJOR / MINOR / INFO` |
| 工具权限 | 假定可写 `VERDICT.md` | **仅 `Read, Glob, Grep, Bash`，无 `Edit`/`Write`** |
| 强制手段 | 书面纪律（附录 B 的"绝对边界"） | 书面纪律 **+ `PreToolUse` Bash 硬 hook** |
| 协议感知 | 读 LEDGER，发 `AUDIT_VERDICT` | 不知道 LEDGER / msg 信封，只返回一段文本 |

### 结论：`project-auditor` 是权威实现，不修改它

它已经在跑，且有 harness 级强制（hook），比本协议单靠约定更可靠。**不修改 `project-auditor.md` 以迁就本协议**，而是让 `COMMANDER` 承担它结构上做不到的事。

### 调和后的实际流程

```
COMMANDER 通过 Agent 工具调用 project-auditor（或用户在独立会话中调用）
        ↓
project-auditor 返回一段文本（§17 固定输出格式：AUDIT_PASS/FAIL + 分级 Findings）
        ↓
COMMANDER 逐字转录该文本，套入本协议的 VERDICT.md 模板（§6），
只做字段映射，不改写、不删减、不解读其结论
        ↓
COMMANDER 在 LEDGER 追加一条 AUDIT_VERDICT 记录，from 字段填 AUDITOR
        ↓
COMMANDER 依此发 NODE_RULING
```

### 字段映射

| project-auditor 输出 | 映射为 |
|---|---|
| `AUDIT_PASS` | `Verdict: PASS` |
| `AUDIT_FAIL` | `Verdict: FAIL` |
| `BLOCKER` | `BLOCKING` |
| `MAJOR` | `BLOCKING`（§14 PASS 规则要求 MAJOR = 0 才能 PASS，与本协议"任一 BLOCKING → FAIL"等价） |
| `MINOR` | `DEVIATION` |
| `INFO` | `OBSERVATION` |
| `Required Remediation` | 并入 VERDICT 的 Findings 说明，供 `COMMANDER` 生成 `FIX_PACKAGE` |

### 硬约束

1. **COMMANDER 转录时不得修改判定结果本身。** 若认为 `project-auditor` 的判定有误，只能另行调用一次独立复核（例如换 `general-purpose` 走本协议附录 B 流程），不得自行改写其 verdict。
2. `project-auditor` 无 `Edit`/`Write` 权限这件事**是设计优点，不是缺陷**——它从工具层面杜绝了"审核员顺手改代码"的可能性，比本协议的书面禁止更可靠。往后设计新 subagent 角色时优先沿用"只读工具集 + 由主调用方落盘"这一模式。
3. 若 `project-auditor` 与本协议正文冲突，**以 `project-auditor.md` 的判定逻辑为准**（它是实际在跑的强制机制），本协议附录 B 的独立会话版本降级为**备选实现**，仅在 `project-auditor` 不可用时启用。

---

## 附录 C — COMMANDER 启动提示词补丁

以下条款追加到现有总指挥章程：

```
通信协议：specs/protocol/COMMS-PROTOCOL-V1.md

新增约束：
- 你不再自行执行验收。节点验收由 AUDITOR 独立认定
- 不得在收到 AUDIT_VERDICT 之前发出 NODE_RULING。无 verdict_ref 的 PASS 无效
- 不得推翻 AUDITOR 的事实认定。你只裁决"如何响应"，且必须留痕说明理由
- 不得在 Task Package 或任何消息中暗示期望的验收结果
- 收到 INTEGRITY_ALERT 时，必须在下一次面向用户的输出中逐字转呈全文，
  不得概述、不得延后、不得在引文内部夹带辩解
- ACCEPTANCE 变更只能在 NODE_REPORT 之前，通过 ACCEPTANCE_AMENDMENT 进行
- 每条消息先追加 LEDGER 行取号，再创建消息文件
- 已发出的消息不得编辑，更正发 CORRECTION
- 规范变更、产品决策、重开 DONE 节点、DAG 结构调整、第 70 节例外申请，
  一律上报 USER，不得自行批准
```
