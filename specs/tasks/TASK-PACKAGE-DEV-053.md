# TASK PACKAGE — DEV-053

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-053 |
| Node Name | Host Mood |
| Milestone | M5 — AI Host Complete（第五个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-052（DONE，`verdict_ref: "0241"`）——`packages/ai-host` 内已有 `hostPersona.ts` 同类先例 |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### 现实核对：Dev Spec 对 Host Mood 的定义同样极度稀薄，只是 Host Context 八项输入之一，没有情绪分类/触发规则的任何规范

Dev Spec 第 37 节（Host Context）第 1528-1548 行把 `Host Mood` 列为
八项输入之一；第 2681 行（第五施工组 DEV-053）只有一个标题
"Host Mood"，全篇 `DEV_SPEC_V1.0.md` 再无任何地方定义过 Host Mood
的具体分类（例如"开心/无聊/兴奋"这类枚举）、数值范围、或"什么事件
会让 Mood 如何变化"的触发规则。核对 `SPEC-ADDENDUM-002.md` 定义的
`DangerState`（`danger.level`/`danger.tensionKey`）与第 39 节 Host
Permission——两者都是**已有的、别的节点负责计算**的运行时信号，
Dev Spec 没有任何地方说"Host Mood = 由 danger/tension 自动推导"，
这是可能的未来设计方向但不是本节点被授权发明的规则。

**取舍**：不发明具体情绪分类枚举、不发明"什么信号触发什么情绪
变化"的算法（这两者都是 Dev Spec 未定义的创作/算法设计决策）。本
节点只产出 `HostMood` 这个数据结构 + 一个可读可写的存储原语
（`createHostMoodStore()`），跟 DEV-052（Host Persona，"只搭基础
设施不发明内容"）同一取舍精神，区别只在于：Persona 是不可变的
唯一静态值，Mood 是**可变**的（因为"缓解冷场"这类职责暗示 Host
的状态会随直播过程变化），但"什么时候该变成什么"是 Host Scheduler
（DEV-055）未来读取 Public State/Danger/Selected Comment 等信号后
才能定义的逻辑，不是本节点的职责。

### 范围核对：不接入 Public State/Danger/Host Scheduler/LLM Provider，不做任何自动推导，不发明情绪分类枚举

同 DEV-052 的边界推理：把 Host Mood 拼进真正喂给 LLM 的 prompt 是
DEV-055（Host Scheduler）+ DEV-056（Host LLM Provider）的职责。本
节点甚至不负责"根据什么信号计算 Mood"，只提供"当前 Mood 是什么、
如何读取、如何被外部设置"的存储原语本身——`label` 字段用自由文本
（同 `HostPersona.voiceDescription` 的自由文本取舍精神），不用
枚举，因为 Dev Spec 没有定义过合法的情绪取值集合，发明一个封闭
枚举等于发明规则。

---

## 2. 架构设计

### 2.1 `packages/ai-host/src/hostMood.ts`（新文件）

```typescript
export interface HostMood {
  /** 当前 Mood 的自由文本标签（Dev Spec 未定义分类枚举，不发明封闭取值集合）。 */
  label: string;
}

export interface HostMoodStore {
  /** 只读地返回当前 Mood。 */
  getMood(): HostMood;
  /** 设置新的 Mood（覆盖式，不做历史记录/队列）。 */
  setMood(mood: HostMood): void;
}

export function createHostMoodStore(initial?: HostMood): HostMoodStore;
```

- `createHostMoodStore(initial?)`：闭包持有当前 `HostMood`；不传
  `initial` 时使用唯一默认值 `{ label: 'neutral' }`（中性占位标签，
  不发明具体情绪词——同 DEV-052 `name: 'Host'` 的占位取舍精神）。
- `getMood()`：只读返回当前值，不做任何副作用。
- `setMood(mood)`：整体覆盖当前值，不做合并/校验/历史记录（调用方
  负责传入合法的 `HostMood`）。
- **零依赖**：不 import `runtime-kernel`/`platform-core`/
  `egressGate.ts`/`commentPipeline.ts`/`hostPersona.ts`。
- **不做任何自动推导**：不读取 `danger`/`tensionKey`/Public
  State/Selected Comment 等任何运行时信号来计算 Mood——`setMood`
  完全由调用方（未来的 Host Scheduler）决定何时调用、传什么值。
- **不接入** Host Scheduler/Host LLM Provider（均为未来节点职责）。

---

## 3. Scope

### Writable Scope

```
packages/ai-host/src/hostMood.ts        （新增）
packages/ai-host/src/hostMood.test.ts   （新增）
packages/ai-host/src/index.ts           （追加导出）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-053/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交，同 Constraint 6）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/ai-host/src/egressGate.ts（Read-only，不 import）
packages/ai-host/src/commentPipeline.ts（Read-only，不 import）
packages/ai-host/src/hostPersona.ts（Read-only，不 import——两者独立，不互相依赖）
其余同既有节点惯例
```

### Forbidden Scope

```
修改 packages/platform-core/**、packages/platform-twitch/**、packages/runtime-kernel/**、packages/ai-host/src/egressGate.ts、packages/ai-host/src/commentPipeline.ts、packages/ai-host/src/hostPersona.ts
发明情绪分类枚举/封闭取值集合
实现"根据 danger/tension/Public State 等信号自动推导 Mood"的任何算法
接入 Host Scheduler/Host LLM Provider/Public State Gateway/prompt 拼装（未来节点职责）
新增第三方 npm 依赖
创建除 ai-host 内文件外的任何新包
```

---

## 4. Required Skills

### Required

- 简单闭包状态存储（读/写两个方法，比 DEV-051/DEV-050A 更简单，无容量/淘汰/短路逻辑）

### Forbidden / Unnecessary

- 任何 LLM/情绪分析/规则引擎依赖
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/baseline/DEV_SPEC_V1.0.md` 第 1528-1548 行（第 37 节 Host Context 输入清单） | 确认 Host Mood 是八项输入之一，边界到此为止 |
| `packages/ai-host/src/hostPersona.ts`（Read-only，DEV-052 冻结） | 同类"静态占位 + 不发明内容"取舍先例参照，不 import |

---

## 6. Outputs

1. `HostMood`/`HostMoodStore`/`createHostMoodStore`（`hostMood.ts`）
2. `specs/dev/DEV-053/DECISIONS.md`，至少覆盖：为何 `label` 用自由
   文本不用枚举、为何默认值是中性占位 `'neutral'`、为何不做任何
   自动推导逻辑、为何设计成可变存储而不是像 Persona 一样的不可变
   静态值（区分 Mood 与 Persona 的本质差异）

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-053/{INDEX,REQUIREMENTS,ACCEPTANCE,REPORT}.md`
- **Acceptance**：四份节点文档存在；`INDEX.md` 含 Task Order T001–T002。

---

### T002 — `hostMood.ts` + 测试 + `index.ts` 导出 + 全量验证、REPORT 与 commit

- **Allowed Files**：`packages/ai-host/src/hostMood.ts`、`.test.ts`、`index.ts`、`specs/dev/DEV-053/{INDEX,REPORT,DECISIONS}.md`
- **Requirements**：按第 2.1 节实现。
- **Acceptance（功能部分）**：
  - 不传 `initial` 时，`createHostMoodStore().getMood()` 返回
    `{ label: 'neutral' }`。
  - 传入 `initial` 时，`createHostMoodStore(initial).getMood()`
    返回该 `initial`（验证初始值可覆盖默认值）。
  - `setMood(newMood)` 后 `getMood()` 返回 `newMood`（验证写入
    生效）。
  - 连续两次 `setMood` 后 `getMood()` 只反映最后一次设置的值
    （验证是覆盖式，不是队列/历史累积）。
  - 两个独立的 `createHostMoodStore()` 实例互不影响（各自闭包
    独立状态，不共享模块级单例）。
- **Requirements（回归部分）**：`pnpm test` 全量跑通，既有全部包
  测试零改动通过。
- **Requirements（验证部分）**：
  1. `index.ts` 追加导出 T002 全部公开符号。
  2. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  3. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  4. **`DECISIONS.md` 必须已提交**。
  5. 更新 `INDEX.md`：T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW`。
  6. **写入（不提交）** `specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-053.md` 消息文件与 `specs/comms/LEDGER.md` 追加行（msg_id 取当前最大序号 + 1）。
  7. `git add`（仅本节点 Writable Scope 内文件，**不包含** LEDGER.md 与刚写的 NODE_REPORT 消息文件）`&& git commit`，首行：`DEV-053: host mood (mutable mood store for Host Context)`，**恰 1 条提交**。
  8. 自行核实：`git log -1` 只看到这一条新提交、NODE_REPORT 消息文件与 LEDGER 追加行存在于工作区但未提交。
  9. **STOP**。
- **Acceptance（命令部分）**：六条命令全部退出码 0；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-053 INDEX

Status: IN_PROGRESS

## Current Node

DEV-053 — Host Mood

## Objective

新增 `packages/ai-host/src/hostMood.ts`：`HostMood`（`label` 自由
文本）+ 可变的 `HostMoodStore`（`getMood`/`setMood`）+
`createHostMoodStore(initial?)` 工厂，默认值 `{ label: 'neutral' }`。
Dev Spec 未定义情绪分类枚举/推导规则，不发明封闭取值集合，不做
任何自动推导，不接入 Host Scheduler/LLM Provider。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 hostMood.ts + 测试 + index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

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

1. **不发明情绪分类枚举**——`label` 必须是自由文本 `string`，不能
   改成封闭枚举/联合类型。
2. **不做任何自动推导逻辑**——不读取 `danger`/`tensionKey`/Public
   State/Selected Comment 等任何运行时信号，`setMood` 完全由调用方
   决定何时调用、传什么值。
3. **不新增任何第三方 npm 依赖**。
4. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
5. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发
   `EXECUTOR_QUERY`，等 `SCOPE_RULING`。
6. **T002 提交后，LEDGER 追加行与自己的 NODE_REPORT 消息文件一律不
   要再提交**——写入工作区即可，留给 Commander 收尾统一提交。

---

## 10. Non-goals / Out-of-scope

- 不实现情绪分类枚举/封闭取值集合。
- 不实现"根据 danger/tension/Public State 等信号自动推导 Mood"的
  任何算法。
- 不接入 Host Scheduler/Host LLM Provider/Public State
  Gateway/prompt 拼装（未来节点职责）。
- 不引入任何第三方业务逻辑依赖。

---

## 11. Tests

### Unit tests

T002：默认值 `{ label: 'neutral' }`、`initial` 覆盖默认值、
`setMood` 写入生效、连续 `setMood` 只反映最后一次（覆盖式非
队列）、多实例互不影响。

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
| A07 | 不传 `initial` 时默认值为 `{ label: 'neutral' }` | 测试检查 |
| A08 | 传入 `initial` 时以其为初始值 | 测试检查 |
| A09 | `setMood` 后 `getMood` 反映新值 | 测试检查 |
| A10 | 连续两次 `setMood` 后只反映最后一次（覆盖式非队列） | 测试检查 |
| A11 | 两个独立 store 实例互不影响 | 测试检查 |
| A12 | 未新增第三方 npm 依赖 | 文件检查 |
| A13 | `platform-core/**`、`platform-twitch/**`、`runtime-kernel/**`、`egressGate.ts`、`commentPipeline.ts`、`hostPersona.ts` 均未被修改 | git diff 比对 |
| A14 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A15 | `specs/dev/DEV-053/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A16 | `git log` 新增恰 1 条提交，首行 `DEV-053: host mood (mutable mood store for Host Context)` | 命令 |
| A17 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A18 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT → 仅
commit 代码+节点文档（一条提交）→ 写入但不提交 LEDGER/NODE_REPORT →
自行核实完成三要素 → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A18。
