# TASK PACKAGE — DEV-051

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-051 |
| Node Name | Comment Pipeline |
| Milestone | M5 — AI Host Complete（第三个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-050A（DONE，`verdict_ref: "0223"`）——`packages/ai-host` 已存在；DEV-042（DONE，`verdict_ref: "0179"`）——`NormalizedChatMessage` 冻结形状 |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### 现实核对：Dev Spec 第 40 节流水线里"Deduplicate"/"Normalize"两步已在 M4 完成，本节点只负责 Safety→Priority→Topic Cluster→Select Candidate

Dev Spec 第 1624-1648 行（第 40 节 Comment Intelligence）定义流水线：
`Chat Stream → Deduplicate → Normalize → Safety → Priority → Topic
Cluster → Select Candidate → Host`。核对现状：`Deduplicate`
已由 DEV-043（`messageDedup.ts`，在 `TwitchChatNotification` 层）完成；
`Normalize` 已由 DEV-042（`chatMessageAdapter.ts` 产出
`NormalizedChatMessage`）完成。本节点收到的输入已经是"去重且归一化"
的 `NormalizedChatMessage`，`DAG.md` 第 295 行给本节点的唯一注记是
"入站 Safety"——确认本节点的真实新增范围从 `Safety` 开始，只做
`Safety`/`Priority`/`Topic Cluster`/`Select Candidate` 四步，不重做
已完成的前两步。第 37 节"Host Context"输入列表里的"Selected
Comment"就是本节点最终产出。

### 范围核对：不使用任何 LLM/第三方 npm 包，Rules-first 最简实现；Topic Cluster 用归一化文本精确匹配，不做语义聚类

第 1626/1628 行"不要所有 Chat 都交给 LLM"/"rules-first"——本节点全部
确定性实现，零 LLM 依赖。第 1628 行提到 AITuber OnAir 的
`comment-intelligence` 模块"可以借用其设计或直接使用其独立 npm
包"——本仓库全程未引入过任何未经审查的第三方业务逻辑包（除
`zod`/`xstate` 等基础设施），且该 npm 包未经过安全/许可证/API 稳定性
审查，不满足新增依赖门槛，本节点选择"借用其设计"而非"直接使用其
包"：自行实现同等流水线阶段。`Topic Cluster` 若做真正的语义聚类需要
embedding/向量模型，超出"rules-first"范围；本节点将其简化为"归一化
文本精确匹配聚类"（同一条评论的不同大小写/前后空白算同一簇），聚类
数即该簇的"热度"，作为 `Priority` 的唯一确定性依据（次要排序键用
最近收到时间）——不做模糊匹配/情感分析/关键词权重等更复杂的优先级
公式，Dev Spec 未定义具体权重公式，不发明。`Safety` 复用与 DEV-050A
C3 相同的"注入正则黑名单"模式（数据/规则由调用方配置，本节点不
发明真实的反垃圾/反辱骂规则库）。

---

## 2. 架构设计

### 2.1 `packages/ai-host/src/commentPipeline.ts`（新文件）

```typescript
import type { NormalizedChatMessage } from '@interactive-story/platform-core';

export interface CommentPipelineConfig {
  /** 注入式黑名单（同 DEV-050A C3 模式），命中即在 Safety 阶段丢弃，不参与聚类。 */
  denylist?: RegExp[];
  /** 单条评论长度上限，超过视为垃圾信息丢弃。缺省 500。 */
  maxLength?: number;
  /** 同时保留的最大簇数，超过时淘汰"当前优先级最低"的簇。缺省 100。 */
  maxPending?: number;
}

export interface SelectedComment {
  message: NormalizedChatMessage;
  clusterSize: number;
}

export interface CommentPipeline {
  /** Safety 检查 + 归一化聚类；不安全或超限的评论直接丢弃，不产生任何簇。 */
  ingest(message: NormalizedChatMessage): void;
  /** 只读地返回当前优先级最高的候选（簇最大；并列按最近收到时间）；无任何待选簇时返回 undefined。不改变内部状态。 */
  selectCandidate(): SelectedComment | undefined;
  /** 清空全部待选簇（供未来 Host Scheduler 在消费一次候选后调用）。 */
  clear(): void;
}

export function createCommentPipeline(config?: CommentPipelineConfig): CommentPipeline;
```

- **Safety**（对应流水线第 3 步）：`text.length > maxLength` 或命中
  `denylist` 任一正则（同 DEV-050A 的 `pattern.lastIndex = 0` 无条件
  重置手法，防止同一坑）→ 直接丢弃，`ingest` 静默返回，不产生/更新
  任何簇。
- **Topic Cluster**（对应流水线第 5 步）：内部维护
  `Map<归一化文本, {count, latest: NormalizedChatMessage}>`；
  `normalize = text.trim().toLowerCase()`；命中已有簇 →
  `count+1`，`latest` 更新为这条新消息（保留最新一条的
  `viewerId`/`messageId`/`receivedAt`，代表整簇发言）；否则新建
  `count=1` 的簇。
- **容量控制**：簇总数超过 `maxPending` 时，淘汰当前"优先级最低"的
  一簇（`count` 最小，并列淘汰 `latest.receivedAt` 最早的）——与
  DEV-043/DEV-050A 的"有界结构，超限淘汰"先例一致。
- **Priority / Select Candidate**（对应流水线第 4/6 步）：
  `selectCandidate()` 遍历全部簇，按 `count` 降序、并列按
  `latest.receivedAt` 降序取第一名，返回
  `{message: 簇.latest, clusterSize: 簇.count}`；无任何簇 → `undefined`。
  该方法是**只读查询**，不清空/不修改任何内部状态——重复调用返回
  同一结果，直到有新的 `ingest`/`clear` 调用。
- **零新增 npm 依赖**；**不做语义聚类/情感分析/关键词权重**；**不
  接入 `runtime-kernel`/Host LLM Provider/Host Scheduler**（均为未来
  节点职责，本节点只产出 `SelectedComment` 这个数据结构本身）。

---

## 3. Scope

### Writable Scope

```
packages/ai-host/src/commentPipeline.ts        （新增）
packages/ai-host/src/commentPipeline.test.ts   （新增）
packages/ai-host/src/index.ts                  （追加导出）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-051/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交，同 Constraint 7）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/platform-core/src/index.ts（DEV-042 冻结，只读取 NormalizedChatMessage 类型）
packages/ai-host/src/egressGate.ts（Read-only，同类"注入黑名单+lastIndex 重置"模式参照，不 import）
其余同既有节点惯例
```

### Forbidden Scope

```
修改 packages/platform-core/**、packages/platform-twitch/**、packages/runtime-kernel/**、packages/ai-host/src/egressGate.ts
实现真正的语义聚类（embedding/向量相似度）、情感分析、关键词权重公式
接入 runtime-kernel/Host LLM Provider/Host Scheduler（未来节点职责）
新增第三方 npm 依赖（含 AITuber OnAir 的 comment-intelligence 包）
创建除 ai-host 内文件外的任何新包
```

---

## 4. Required Skills

### Required

- 纯函数式确定性文本归一化/聚类计数/有界容量淘汰（与 DEV-043/050A 同类手法）

### Forbidden / Unnecessary

- 任何 LLM/embedding/向量数据库依赖
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/baseline/DEV_SPEC_V1.0.md` 第 1624-1648 行（第 40 节） | Comment Intelligence 流水线权威定义 |
| `packages/platform-core/src/index.ts`（Read-only，DEV-042 冻结） | `NormalizedChatMessage` 契约 |
| `packages/ai-host/src/egressGate.ts`（Read-only，DEV-050A 冻结） | 注入黑名单 + 正则 `lastIndex` 重置的既有手法参照 |

---

## 6. Outputs

1. `createCommentPipeline`/`CommentPipeline`/`CommentPipelineConfig`/
   `SelectedComment`（`commentPipeline.ts`）
2. `specs/dev/DEV-051/DECISIONS.md`，至少覆盖：为何不使用 AITuber
   OnAir 的 `comment-intelligence` npm 包而是自行实现、Topic Cluster
   简化为归一化文本精确匹配的理由、Priority 只用簇大小+最近时间
   两个确定性维度的理由、`maxPending`/`maxLength` 缺省值选择、为何
   `selectCandidate()` 是只读查询而不是"取出即清空"

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-051/{INDEX,REQUIREMENTS,ACCEPTANCE,REPORT}.md`
- **Acceptance**：四份节点文档存在；`INDEX.md` 含 Task Order T001–T002。

---

### T002 — `commentPipeline.ts` + 测试 + `index.ts` 导出 + 全量验证、REPORT 与 commit

- **Allowed Files**：`packages/ai-host/src/commentPipeline.ts`、`.test.ts`、`index.ts`、`specs/dev/DEV-051/{INDEX,REPORT,DECISIONS}.md`
- **Requirements**：按第 2.1 节实现。
- **Acceptance（功能部分）**：
  - 命中 `denylist` 正则的评论 → 不产生任何簇（用另一条正常评论
    验证 `selectCandidate()` 不会返回被丢弃的那条）。
  - 超过 `maxLength` 的评论 → 同样丢弃。
  - 归一化后完全相同的文本（大小写/前后空白差异）→ 聚为同一簇，
    `count` 正确累加，`latest` 更新为最新一条的 `NormalizedChatMessage`
    （含其 `viewerId`/`messageId`/`receivedAt`）。
  - 不同文本 → 各自独立成簇，`count` 均为 1。
  - `selectCandidate()`：多个簇里 `count` 最大的胜出；`count` 并列时
    `latest.receivedAt` 最近的胜出；无任何簇时返回 `undefined`；连续
    调用两次（中间不 `ingest`/`clear`）返回完全相同结果（验证只读，
    不清空）。
  - 簇数超过 `maxPending` → 淘汰 `count` 最小（并列淘汰
    `latest.receivedAt` 最早）的一簇，其余簇不受影响。
  - `clear()` 后 `selectCandidate()` 返回 `undefined`；`clear()` 后
    重新 `ingest` 能正常建立新簇。
  - 缺省 `maxLength`（500）/`maxPending`（100）符合第 2.1 节所写。
- **Requirements（回归部分）**：`pnpm test` 全量跑通，既有全部包
  测试零改动通过。
- **Requirements（验证部分）**：
  1. `index.ts` 追加导出 T002 全部公开符号。
  2. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  3. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  4. **`DECISIONS.md` 必须已提交**。
  5. 更新 `INDEX.md`：T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW`。
  6. `git add`（仅本节点 Writable Scope 内文件）`&& git commit`，首行：`DEV-051: comment pipeline (safety, priority, topic cluster, select candidate)`，**恰 1 条提交**。
  7. **不要**再单独提交 LEDGER 追加行或自己的 NODE_REPORT 消息文件——写入工作区留给 Commander 收尾。
  8. 自行核实：`git log -1` 只看到这一条新提交、NODE_REPORT 消息文件与 LEDGER 追加行存在于工作区但未提交。
  9. **STOP**。
- **Acceptance（命令部分）**：六条命令全部退出码 0；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-051 INDEX

Status: IN_PROGRESS

## Current Node

DEV-051 — Comment Pipeline

## Objective

新增 `packages/ai-host/src/commentPipeline.ts`：Dev Spec 第 40 节
流水线的 Safety→Priority→Topic Cluster→Select Candidate 四步
（Deduplicate/Normalize 已在 M4 完成）。`ingest()` 做黑名单/长度
Safety 检查 + 归一化文本精确匹配聚类；`selectCandidate()` 按簇大小+
最近时间只读选出候选；`clear()` 清空。零 LLM、零第三方依赖、不做
语义聚类。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 commentPipeline.ts + 测试 + index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

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

1. **不做语义聚类/情感分析/关键词权重公式**——Topic Cluster 只用
   归一化文本精确匹配。
2. **`selectCandidate()` 是只读查询**，不得在调用内部清空/修改任何
   簇状态。
3. **不新增任何第三方 npm 依赖**（含 AITuber OnAir 的
   `comment-intelligence` 包）。
4. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
5. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发
   `EXECUTOR_QUERY`，等 `SCOPE_RULING`。
6. **T002 提交后，LEDGER 追加行与自己的 NODE_REPORT 消息文件一律不
   要再提交**——写入工作区即可，留给 Commander 收尾统一提交。

---

## 10. Non-goals / Out-of-scope

- 不实现真正的语义/embedding 聚类。
- 不实现情感分析/关键词权重优先级公式。
- 不接入 `runtime-kernel`/Host LLM Provider/Host Scheduler（未来
  节点职责）。
- 不引入 AITuber OnAir 的 `comment-intelligence` npm 包或任何其他
  第三方业务逻辑依赖。

---

## 11. Tests

### Unit tests

T002：Safety 丢弃（黑名单/超长）、归一化聚类（大小写/空白容错、
不同文本独立成簇）、Priority 排序（簇大小优先，时间戳次要）、只读
`selectCandidate()`、容量淘汰、`clear()`、缺省值验证。

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
| A07 | 命中黑名单的评论被丢弃，不产生簇 | 测试检查 |
| A08 | 超过 `maxLength` 的评论被丢弃 | 测试检查 |
| A09 | 归一化后相同文本聚为同一簇，`count` 正确累加，`latest` 正确更新 | 测试检查 |
| A10 | 不同文本各自独立成簇 | 测试检查 |
| A11 | `selectCandidate()` 按簇大小降序、并列按最近时间降序选出候选 | 测试检查 |
| A12 | 无任何簇时 `selectCandidate()` 返回 `undefined` | 测试检查 |
| A13 | `selectCandidate()` 连续调用（不 ingest/clear）结果一致，验证只读不清空 | 测试检查 |
| A14 | 簇数超过 `maxPending` 时正确淘汰优先级最低的簇 | 测试检查 |
| A15 | `clear()` 清空全部簇，之后可重新正常 `ingest` | 测试检查 |
| A16 | 缺省 `maxLength`（500）/`maxPending`（100）符合文档 | 测试检查 |
| A17 | 未新增第三方 npm 依赖 | 文件检查 |
| A18 | `platform-core/**`、`platform-twitch/**`、`runtime-kernel/**`、`egressGate.ts` 均未被修改 | git diff 比对 |
| A19 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A20 | `specs/dev/DEV-051/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A21 | `git log` 新增恰 1 条提交，首行 `DEV-051: comment pipeline (safety, priority, topic cluster, select candidate)` | 命令 |
| A22 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A23 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT → 仅
commit 代码+节点文档（一条提交）→ 写入但不提交 LEDGER/NODE_REPORT →
自行核实完成三要素 → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A23。
