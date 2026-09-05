# TASK PACKAGE — DEV-052

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-052 |
| Node Name | Host Persona |
| Milestone | M5 — AI Host Complete（第四个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-050A（DONE，`verdict_ref: "0223"`）——`packages/ai-host` 已存在 |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### 现实核对：Dev Spec 对 Host Persona 的定义极度稀薄，只是 Host Context 八项输入之一，没有任何具体字段/语气/人设内容的规范

Dev Spec 第 37 节（Host Context）第 1528-1548 行列出 Host Context 的
输入清单：`Host Persona + Host Mood + Public State + Current Phase +
Recent Chat + Selected Comment + Viewer Memory + Recent Host Lines`。
第 2676 行（第五施工组 DEV-052）只有一个标题"Host Persona"，全篇
`DEV_SPEC_V1.0.md` 再无任何地方定义过 Host Persona 的具体字段、
语气/性格描述、或"人设"该包含什么内容。核对第 36 节（AI Host）唯一
明确的是 Host 的职责列表（回复弹幕/主动评论/点名/吐槽行动组/评论
骰子/提醒互动/缓解冷场/建立直播间内部梗），这是"Host 该做什么"，
不是"Host 是什么性格/语气"。

**取舍**：不发明 Host 的具体性格特征（活泼/毒舌/温柔等——这些是
创作/产品决策，不是工程决策，Dev Spec 未定义就不能由施工方发明）。
本节点只产出 `HostPersona` 这个数据结构本身 + 一个返回诚实占位默认
值的访问器，占位默认值的文案内容直接引用第 36 节已经明确写出的
职责列表（不新增未经规范的性格形容词），并在文档里明确注明"真实
的人设文案是创作/产品决策，留给 USER 未来通过某种配置方式填入，
本节点只搭好类型与访问器基础设施"——同 DEV-056（Host LLM Provider，
"只需一个可替换 Provider API"）的取舍精神一致：本节点是基础设施，
不是内容创作。

### 范围核对：不接入 Host Scheduler/LLM Provider，不做任何 prompt 拼装，不做可配置的多套人设

第 37 节说 Host Persona 只是 Host Context 八项输入之一；把八项输入
拼装成真正喂给 LLM 的 prompt 是 DEV-055（Host Scheduler）+
DEV-056（Host LLM Provider）的职责，不是本节点的职责——本节点只
产出"人设是什么"这一项数据本身。同理，Dev Spec 没有任何地方要求
"同一场直播支持切换多套人设"或"人设可以按章节/场景变化"（那是
Host Mood——DEV-053——才处理的"随时间/事件变化"的维度），所以本
节点只提供一个全局唯一的静态人设，不做多套人设管理/热切换/持久化
配置系统。

---

## 2. 架构设计

### 2.1 `packages/ai-host/src/hostPersona.ts`（新文件）

```typescript
export interface HostPersona {
  /** Host 在直播间里使用的名字。 */
  name: string;
  /** 人设文案：Host 是谁、职责是什么，用于拼入未来的 LLM system prompt（由 DEV-055/056 消费，本节点不做拼装）。 */
  voiceDescription: string;
}

export function getHostPersona(): HostPersona;
```

- `getHostPersona()` 返回**唯一一个**硬编码的默认 `HostPersona`
  常量，不接受参数、不做任何可配置/可切换逻辑。
- `voiceDescription` 的默认文案内容**直接复述 Dev Spec 第 36 节
  已经写出的职责列表**（回复弹幕/主动评论/点名/吐槽行动组/评论
  骰子/提醒互动/缓解冷场/建立直播间内部梗），不新增任何未经规范
  的性格形容词（如"活泼""毒舌""温柔"等）。
- `name` 默认给一个中性占位名字（例如 `"Host"`），不发明具体
  IP/角色名。
- 零依赖：不 import `runtime-kernel`/`platform-core`/`egressGate.ts`/
  `commentPipeline.ts`，纯静态数据 + 访问器。
- **不接入** Host Scheduler/Host LLM Provider（均为未来节点职责，
  Dev Spec 未定义拼装规则，不发明）。

---

## 3. Scope

### Writable Scope

```
packages/ai-host/src/hostPersona.ts        （新增）
packages/ai-host/src/hostPersona.test.ts   （新增）
packages/ai-host/src/index.ts              （追加导出）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-052/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交，同 Constraint 6）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/ai-host/src/egressGate.ts（Read-only，不 import）
packages/ai-host/src/commentPipeline.ts（Read-only，不 import）
其余同既有节点惯例
```

### Forbidden Scope

```
修改 packages/platform-core/**、packages/platform-twitch/**、packages/runtime-kernel/**、packages/ai-host/src/egressGate.ts、packages/ai-host/src/commentPipeline.ts
发明具体性格形容词/语气风格描述（活泼/毒舌/温柔等 Dev Spec 未写出的人设内容）
实现多套人设/可配置切换/持久化存储
接入 Host Scheduler/Host LLM Provider/prompt 拼装（未来节点职责）
新增第三方 npm 依赖
创建除 ai-host 内文件外的任何新包
```

---

## 4. Required Skills

### Required

- 纯静态数据结构 + 简单访问器（比 DEV-051/DEV-050A 更简单，无状态、无逻辑分支）

### Forbidden / Unnecessary

- 任何 LLM/配置文件解析/持久化依赖
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/baseline/DEV_SPEC_V1.0.md` 第 1511-1525 行（第 36 节 AI Host 职责列表） | `voiceDescription` 默认文案的唯一权威来源，不发明列表之外的内容 |
| `specs/baseline/DEV_SPEC_V1.0.md` 第 1528-1548 行（第 37 节 Host Context 输入清单） | 确认 Host Persona 是八项输入之一，边界到此为止 |

---

## 6. Outputs

1. `HostPersona`/`getHostPersona`（`hostPersona.ts`）
2. `specs/dev/DEV-052/DECISIONS.md`，至少覆盖：为何不发明具体性格
   形容词而是直接复述第 36 节职责列表、为何只提供唯一静态默认值
   不做可配置系统、为何不接入 Host Scheduler/LLM Provider、`name`
   占位值选择理由

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-052/{INDEX,REQUIREMENTS,ACCEPTANCE,REPORT}.md`
- **Acceptance**：四份节点文档存在；`INDEX.md` 含 Task Order T001–T002。

---

### T002 — `hostPersona.ts` + 测试 + `index.ts` 导出 + 全量验证、REPORT 与 commit

- **Allowed Files**：`packages/ai-host/src/hostPersona.ts`、`.test.ts`、`index.ts`、`specs/dev/DEV-052/{INDEX,REPORT,DECISIONS}.md`
- **Requirements**：按第 2.1 节实现。
- **Acceptance（功能部分）**：
  - `getHostPersona()` 返回的 `HostPersona` 含非空 `name` 与非空
    `voiceDescription` 字符串。
  - 连续两次调用 `getHostPersona()` 返回的 `name`/`voiceDescription`
    内容完全一致（验证是静态常量，不是随机/时间相关生成）。
  - `voiceDescription` 文案内容与第 36 节职责列表逐条对应（测试里
    断言包含"回复弹幕""主动评论""点名""吐槽行动组""评论骰子"
    "提醒互动""缓解冷场""建立直播间内部梗"这八个关键词/短语，
    证明文案确实取自 Dev Spec 而不是自由发挥）。
- **Requirements（回归部分）**：`pnpm test` 全量跑通，既有全部包
  测试零改动通过。
- **Requirements（验证部分）**：
  1. `index.ts` 追加导出 T002 全部公开符号。
  2. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  3. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  4. **`DECISIONS.md` 必须已提交**。
  5. 更新 `INDEX.md`：T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW`。
  6. **写入（不提交）** `specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-052.md` 消息文件与 `specs/comms/LEDGER.md` 追加行（格式参照既有节点先例，msg_id 取 LEDGER 当前最大序号 + 1）。
  7. `git add`（仅本节点 Writable Scope 内文件，**不包含** LEDGER.md 与刚写的 NODE_REPORT 消息文件）`&& git commit`，首行：`DEV-052: host persona (static identity data for Host Context)`，**恰 1 条提交**。
  8. 自行核实：`git log -1` 只看到这一条新提交、NODE_REPORT 消息文件与 LEDGER 追加行存在于工作区但未提交。
  9. **STOP**。
- **Acceptance（命令部分）**：六条命令全部退出码 0；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-052 INDEX

Status: IN_PROGRESS

## Current Node

DEV-052 — Host Persona

## Objective

新增 `packages/ai-host/src/hostPersona.ts`：`HostPersona` 静态数据
结构（`name` + `voiceDescription`）+ `getHostPersona()` 访问器。
Dev Spec 未定义具体人设文案，`voiceDescription` 默认值直接复述第
36 节职责列表，不发明性格形容词。不接入 Host Scheduler/LLM
Provider，不做可配置多人设系统。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 hostPersona.ts + 测试 + index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与
NODE_REPORT 消息文件已写入工作区但**未提交**。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **不发明具体性格形容词/语气风格**——`voiceDescription` 默认文案
   只能取自第 36 节已写出的职责列表，逐条复述，不额外添加。
2. **只提供唯一静态默认值**，不做多人设/可配置/持久化系统。
3. **不新增任何第三方 npm 依赖**。
4. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
5. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发
   `EXECUTOR_QUERY`，等 `SCOPE_RULING`。
6. **T002 提交后，LEDGER 追加行与自己的 NODE_REPORT 消息文件一律不
   要再提交**——写入工作区即可，留给 Commander 收尾统一提交。

---

## 10. Non-goals / Out-of-scope

- 不实现真实的、有创作内容的人设文案（性格/口癖/背景故事等）——
  这是产品/创作决策，留给 USER 未来填入，本节点只搭基础设施。
- 不实现多套人设/人设切换/人设持久化配置。
- 不接入 Host Scheduler/Host LLM Provider/prompt 拼装（未来节点
  职责）。
- 不引入任何第三方业务逻辑依赖。

---

## 11. Tests

### Unit tests

T002：`getHostPersona()` 返回值形状（非空 `name`/`voiceDescription`）、
调用幂等性（多次调用内容一致）、`voiceDescription` 内容覆盖第 36
节全部八项职责关键词。

### Regression tests

`pnpm test` 覆盖全 workspace；既有全部包测试零回归（新增独立文件，
不修改任何既有文件除 `index.ts` 追加导出）。

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
| A07 | `getHostPersona()` 返回非空 `name` | 测试检查 |
| A08 | `getHostPersona()` 返回非空 `voiceDescription` | 测试检查 |
| A09 | 连续两次调用返回内容完全一致（静态常量，非随机/时间相关） | 测试检查 |
| A10 | `voiceDescription` 包含第 36 节全部八项职责关键词 | 测试检查 |
| A11 | 未新增第三方 npm 依赖 | 文件检查 |
| A12 | `platform-core/**`、`platform-twitch/**`、`runtime-kernel/**`、`egressGate.ts`、`commentPipeline.ts` 均未被修改 | git diff 比对 |
| A13 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A14 | `specs/dev/DEV-052/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A15 | `git log` 新增恰 1 条提交，首行 `DEV-052: host persona (static identity data for Host Context)` | 命令 |
| A16 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A17 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT → 仅
commit 代码+节点文档（一条提交）→ 写入但不提交 LEDGER/NODE_REPORT →
自行核实完成三要素 → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A17。
