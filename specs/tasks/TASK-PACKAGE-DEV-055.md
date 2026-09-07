# TASK PACKAGE — DEV-055

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-055 |
| Node Name | Host Scheduler |
| Milestone | M5 — AI Host Complete（第七个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-051（DONE，`verdict_ref: "0238"`）——`SelectedComment.clusterSize` 可作为 `selectedCommentImportance` 的现实取值来源参照 |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### 现实核对：Dev Spec 第 41 节六个调度因子里，只有"Story Audio > Host Audio"一条给出了明确规则，其余五个因子没有阈值/方向/组合公式

Dev Spec 第 41 节（Host Scheduler）第 1652-1673 行原文：

> Host 不能收到一句评论就说一句。调度策略需要考虑：Current Story
> Phase / Chat Velocity / Last Host Speech Time / Selected Comment
> Importance / Conversation Continuity / Audio Channel Busy。核心：
> Story Audio > Host Audio——任何正式故事声音拥有抢占优先权。

六个因子中，只有 `Audio Channel Busy` 被"核心"段落赋予了**明确、
无歧义的强规则**：故事音频播放时 Host 音频必须让路。其余五个
因子——`Chat Velocity`（是聊天越快越该说话、还是越快越该让聊天
继续、方向未定义）、`Last Host Speech Time`（暗示某种冷却机制，
但冷却时长未定义）、`Selected Comment Importance`（暗示重要性
门槛，但门槛值未定义）、`Conversation Continuity`（暗示对话连续性
如何影响决策，但具体逻辑未定义）、`Current Story Phase`（暗示
不同故事阶段应有不同调度行为，但具体差异未定义）——Dev Spec 只是
把它们列为"调度策略需要考虑"的输入，从未给出任何阈值、方向或
组合公式。USER 已就此现实核对给出裁决（2026-09-07）：**只实现
"Story Audio > Host Audio"这一条明确规则**，其余五个因子只在
类型签名里保留位置（供未来产品/创作决策定义具体算法时按同一
接口扩展），不发明任何具体的组合逻辑/阈值/方向——同 DEV-051
"Dev Spec 未定义就不发明"的取舍先例一致。

### 范围核对：纯决策函数，零 `runtime-kernel` 依赖，不读取任何真实的 Audio Channel/Story Phase 状态

同 DEV-052/053/054：本节点产出的是"调度策略这个决策函数本身"，
不是"接入真实运行时状态"。`HostSchedulingFactors` 的六个字段全部
由调用方（未来某个尚未建造的 Runtime 组合层）计算好后传入，本
节点不 import `runtime-kernel`、不读取 `audioRegion` 状态机、不
调用 `getPublicState()`——这条件跟 `ai-host` 现有四个模块
（`egressGate`/`commentPipeline`/`hostPersona`/`hostMood`）均不
依赖 `runtime-kernel`/`platform-core`（除 `commentPipeline` 依赖
`platform-core` 的类型）的既有边界完全一致。

---

## 2. 架构设计

### 2.1 `packages/ai-host/src/hostScheduler.ts`（新文件）

```typescript
export interface HostSchedulingFactors {
  /** 当前故事阶段（调用方计算好传入，本节点不解释具体取值）。 */
  currentStoryPhase: string;
  /** 聊天速度（调用方定义单位，比如条/分钟，本节点不解释）。 */
  chatVelocity: number;
  /** 上次 Host 说话的时间戳（毫秒），从未说过则为 undefined。 */
  lastHostSpeechTimeMs?: number;
  /** 当前被选中评论的重要性（比如 DEV-051 SelectedComment.clusterSize），无候选则为 undefined。 */
  selectedCommentImportance?: number;
  /** 当前是否处于连续对话中（调用方判定）。 */
  conversationContinuity: boolean;
  /** 音频通道当前是否被正式故事音频占用——唯一有明确规则的因子。 */
  audioChannelBusy: boolean;
}

export interface HostSchedulingDecision {
  canSpeak: boolean;
  reason: string;
}

export function decideHostScheduling(factors: HostSchedulingFactors): HostSchedulingDecision;
```

- `decideHostScheduling`：**唯一实现的规则**是 Dev Spec 第 41 节
  "核心"段落——`factors.audioChannelBusy === true` 时返回
  `{ canSpeak: false, reason: 'audioChannelBusy' }`（Story Audio
  抢占优先权，Host 必须让路）；否则返回
  `{ canSpeak: true, reason: 'clear' }`。
- `chatVelocity`/`lastHostSpeechTimeMs`/`selectedCommentImportance`/
  `conversationContinuity`/`currentStoryPhase` 这五个字段**只出现
  在类型签名里，不参与 `decideHostScheduling` 的判定逻辑**——
  为未来节点/产品决策定义具体组合算法时保留统一的输入接口，本
  节点不发明任何阈值/方向/权重。
- **零依赖**：不 import `runtime-kernel`/`platform-core`/
  `egressGate.ts`/`commentPipeline.ts`/`hostPersona.ts`/
  `hostMood.ts`。
- **不接入** Host LLM Provider/prompt 拼装/真实音频状态查询
  （均为未来节点或未来 Runtime 组合层职责）。

---

## 3. Scope

### Writable Scope

```
packages/ai-host/src/hostScheduler.ts        （新增）
packages/ai-host/src/hostScheduler.test.ts   （新增）
packages/ai-host/src/index.ts                （追加导出）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-055/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交，同 Constraint 6）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/ai-host/src/egressGate.ts、commentPipeline.ts、hostPersona.ts、hostMood.ts（Read-only，不 import）
其余同既有节点惯例
```

### Forbidden Scope

```
修改 packages/platform-core/**、packages/platform-twitch/**、packages/runtime-kernel/**、packages/ai-host/src/egressGate.ts、commentPipeline.ts、hostPersona.ts、hostMood.ts
实现除"Story Audio > Host Audio"外任何其他因子的组合/阈值/权重逻辑
读取任何真实的 runtime-kernel Audio Channel/Story Phase 状态
接入 Host LLM Provider/prompt 拼装（未来节点职责）
新增第三方 npm 依赖
创建除 ai-host 内文件外的任何新包
```

---

## 4. Required Skills

### Required

- 纯函数式决策逻辑（比 DEV-052/053 略复杂，但仍是无状态、无副作用的单一判定函数）

### Forbidden / Unnecessary

- 任何调度算法/优先队列/加权评分依赖
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/baseline/DEV_SPEC_V1.0.md` 第 1652-1673 行（第 41 节 Host Scheduler） | 六个调度因子清单 + 唯一明确规则"Story Audio > Host Audio"的权威来源 |
| USER 2026-09-07 裁决 | 确认只实现明确规则，其余因子只保留类型位置不发明算法 |

---

## 6. Outputs

1. `HostSchedulingFactors`/`HostSchedulingDecision`/
   `decideHostScheduling`（`hostScheduler.ts`）
2. `specs/dev/DEV-055/DECISIONS.md`，至少覆盖：为何只实现"Story
   Audio > Host Audio"一条规则、为何其余五个因子只保留类型签名
   不实现组合逻辑（逐一说明每个因子为何存在方向/阈值/公式歧义）、
   为何不读取真实 runtime-kernel 状态（调用方注入模式的理由）

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-055/{INDEX,REQUIREMENTS,ACCEPTANCE,REPORT}.md`
- **Acceptance**：四份节点文档存在；`INDEX.md` 含 Task Order T001–T002。

---

### T002 — `hostScheduler.ts` + 测试 + `index.ts` 导出 + 全量验证、REPORT 与 commit

- **Allowed Files**：`packages/ai-host/src/hostScheduler.ts`、`.test.ts`、`index.ts`、`specs/dev/DEV-055/{INDEX,REPORT,DECISIONS}.md`
- **Requirements**：按第 2.1 节实现。
- **Acceptance（功能部分）**：
  - `factors.audioChannelBusy === true` 时，`decideHostScheduling`
    返回 `{ canSpeak: false, reason: 'audioChannelBusy' }`，无论
    其余五个因子取任何值（包括"看起来应该让 Host 说话"的组合，
    比如高 `selectedCommentImportance`、`chatVelocity` 很高等）。
  - `factors.audioChannelBusy === false` 时，`decideHostScheduling`
    返回 `{ canSpeak: true, reason: 'clear' }`，无论其余五个因子
    取任何值（包括"看起来不应该让 Host 说话"的极端组合，比如
    `lastHostSpeechTimeMs` 是几毫秒前、`chatVelocity` 是 0 等）
    ——证明这些因子确实不参与判定。
  - `lastHostSpeechTimeMs`/`selectedCommentImportance` 未提供
    （`undefined`）时，`decideHostScheduling` 仍能正常返回结果，
    不抛错。
- **Requirements（回归部分）**：`pnpm test` 全量跑通，既有全部包
  测试零改动通过。
- **Requirements（验证部分）**：
  1. `index.ts` 追加导出 T002 全部公开符号。
  2. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  3. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  4. **`DECISIONS.md` 必须已提交**。
  5. 更新 `INDEX.md`：T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW`。
  6. **写入（不提交）** `specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-055.md` 消息文件与 `specs/comms/LEDGER.md` 追加行（msg_id 取当前最大序号 + 1）。
  7. `git add`（仅本节点 Writable Scope 内文件，**不包含** LEDGER.md 与刚写的 NODE_REPORT 消息文件）`&& git commit`，首行：`DEV-055: host scheduler (audio-channel preemption rule only)`，**恰 1 条提交**。
  8. 自行核实：`git log -1` 只看到这一条新提交、NODE_REPORT 消息文件与 LEDGER 追加行存在于工作区但未提交。
  9. **STOP**。
- **Acceptance（命令部分）**：六条命令全部退出码 0；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-055 INDEX

Status: IN_PROGRESS

## Current Node

DEV-055 — Host Scheduler

## Objective

新增 `packages/ai-host/src/hostScheduler.ts`：`decideHostScheduling(factors)`
只实现 Dev Spec 第 41 节唯一明确的调度规则"Story Audio > Host
Audio"（`audioChannelBusy` 为真时禁止 Host 说话），其余五个调度
因子（Chat Velocity/Last Host Speech Time/Selected Comment
Importance/Conversation Continuity/Current Story Phase）只保留
类型签名，不实现任何组合/阈值/权重逻辑（Dev Spec 未定义，USER 已
裁决不发明）。零依赖，不读取真实 runtime-kernel 状态。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 hostScheduler.ts + 测试 + index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

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

1. **只实现"Story Audio > Host Audio"一条规则**——不得为其余五个
   因子发明任何阈值/方向/组合公式（USER 2026-09-07 裁决）。
2. **不读取任何真实 runtime-kernel 状态**——`HostSchedulingFactors`
   全部字段由调用方计算好传入。
3. **不新增任何第三方 npm 依赖**。
4. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
5. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发
   `EXECUTOR_QUERY`，等 `SCOPE_RULING`。
6. **T002 提交后，LEDGER 追加行与自己的 NODE_REPORT 消息文件一律不
   要再提交**——写入工作区即可，留给 Commander 收尾统一提交。

---

## 10. Non-goals / Out-of-scope

- 不实现 Chat Velocity/Last Host Speech Time/Selected Comment
  Importance/Conversation Continuity/Current Story Phase 的任何
  组合/阈值/权重算法。
- 不接入 runtime-kernel 读取真实 Audio Channel/Story Phase 状态。
- 不接入 Host LLM Provider/prompt 拼装（未来节点职责）。
- 不引入任何第三方业务逻辑依赖。

---

## 11. Tests

### Unit tests

T002：`audioChannelBusy=true` 时无论其余因子如何组合都返回
`canSpeak:false`；`audioChannelBusy=false` 时无论其余因子如何
组合都返回 `canSpeak:true`；可选字段缺省时不抛错。

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
| A07 | `audioChannelBusy=true` 时返回 `canSpeak:false, reason:'audioChannelBusy'`，且与其余因子取值无关 | 测试检查 |
| A08 | `audioChannelBusy=false` 时返回 `canSpeak:true, reason:'clear'`，且与其余因子取值无关（含"看起来不该说话"的极端组合） | 测试检查 |
| A09 | 可选字段（`lastHostSpeechTimeMs`/`selectedCommentImportance`）缺省时不抛错 | 测试检查 |
| A10 | 未新增第三方 npm 依赖 | 文件检查 |
| A11 | `platform-core/**`、`platform-twitch/**`、`runtime-kernel/**`、`egressGate.ts`、`commentPipeline.ts`、`hostPersona.ts`、`hostMood.ts` 均未被修改 | git diff 比对 |
| A12 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A13 | `specs/dev/DEV-055/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A14 | `git log` 新增恰 1 条提交，首行 `DEV-055: host scheduler (audio-channel preemption rule only)` | 命令 |
| A15 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A16 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT → 仅
commit 代码+节点文档（一条提交）→ 写入但不提交 LEDGER/NODE_REPORT →
自行核实完成三要素 → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A16。
