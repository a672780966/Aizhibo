# TASK PACKAGE — DEV-043

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-043 |
| Node Name | Message Deduplication |
| Milestone | M4 — Twitch Complete（第四个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-041（DONE，`verdict_ref: "0175"`）——`TwitchChatNotification.messageId` 已经为本节点保留好 |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### 现实核对：Dev Spec 明确"必须做"，`messageId` 字段已就位，尚无任何去重代码

Dev Spec 第 44 节第 1728 行原文："EventSub 是至少一次投递，相同通知可能
重复，因此 Adapter 必须基于 `message_id` 做去重"；`DAG.md` 第 243 行把
本节点标注为"必须做"，是 M4 唯一一个被产品文档直接点名强制要求的节点。
全仓库 grep `dedup`/`Dedup` 零命中真正的去重实现。DEV-041 冻结的
`TwitchChatNotification.messageId` 注释原文已写明"供 DEV-043 去重使用，
本节点不去重"——字段已经就位，等的就是本节点。

### 范围核对：去重适用于全部 notification（不只 chat），是通用 Adapter 层能力，不是 DEV-042 专属

Dev Spec 原文"相同通知可能重复"针对的是 EventSub **全部**订阅类型的
`notification` 帧（本项目目前只订阅了 `channel.chat.message`，但去重
机制本身不应该假设只有这一种订阅类型，否则未来新增订阅类型时又要重新做
一次）。因此本节点包装的是 DEV-041 的 `onNotification` 回调本身
（`TwitchChatNotification` 层），**不是**包装 DEV-042 的
`ChatHandler`/`NormalizedChatMessage`（那样会把去重能力绑死在 chat
这一种消息类型上）。两者可以组合使用：
`createEventSubClient({ onNotification: createDedupingOnNotification(createTwitchChatOnNotification(handler)) })`。

去重策略：**有界内存去重**（不引入数据库/持久化——EventSub 的重复投递
是短时间窗口内的网络层重试，不需要跨进程重启持久化；`packages/persistence`
是给别的东西用的，不是给这个瞬时去重窗口用的）。用一个固定大小的先进
先出集合记录最近见过的 `messageId`，超过容量后淘汰最旧的。

---

## 2. 架构设计

### 2.1 `packages/platform-twitch/src/messageDedup.ts`（新文件）

```typescript
export interface MessageDeduplicator {
  /** 返回 true 表示这个 messageId 之前见过（重复，应丢弃）；
   *  返回 false 表示第一次见到（同时记录下来）。 */
  seen(messageId: string): boolean;
}

export interface MessageDeduplicatorConfig {
  /** 最多记住多少个近期 messageId，超过后按先进先出淘汰最旧的。 */
  maxSize?: number; // 默认 1000
}

export function createMessageDeduplicator(
  config?: MessageDeduplicatorConfig,
): MessageDeduplicator

export function createDedupingOnNotification(
  handler: (notification: TwitchChatNotification) => void,
  deduplicator?: MessageDeduplicator,
): (notification: TwitchChatNotification) => void
```

- `createMessageDeduplicator`：内部用一个 `Set<string>`（O(1) 查找）+
  一个数组记录插入顺序（FIFO 淘汰）。`seen(id)`：若 `Set` 已含 `id` →
  返回 `true`（不重新插入，不影响其淘汰顺序——重复消息不算"最近"，这是
  合理的确定性行为，避免同一个 id 被反复"续命"占用位置）；否则插入
  `Set` + 插入顺序数组，若数组长度超过 `maxSize` 则淘汰数组头部最旧的
  一个 id（同步从 `Set` 删除），返回 `false`。
- `createDedupingOnNotification(handler, deduplicator?)`：不传
  `deduplicator` 时内部创建一个新的（默认 `maxSize=1000`）。返回一个
  包装函数：`deduplicator.seen(notification.messageId)` 为 `true` →
  直接丢弃，不调用 `handler`；为 `false` → 调用 `handler(notification)`。
- **零新增 npm 依赖**：原生 `Set`/`Array` 足够，不需要任何 LRU 库。
- **纯内存、不持久化**：进程重启后去重窗口重置，这是 Dev Spec 描述的
  "网络层短时间重复投递"场景的合理边界（不是跨会话去重需求）。

---

## 3. Scope

### Writable Scope

```
packages/platform-twitch/src/messageDedup.ts        （新增）
packages/platform-twitch/src/messageDedup.test.ts   （新增）
packages/platform-twitch/src/index.ts               （追加导出）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-043/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交，同 Constraint 8）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/platform-twitch/src/eventSubClient.ts（DEV-041 冻结，只读取 TwitchChatNotification 类型）
packages/platform-twitch/src/chatMessageAdapter.ts（DEV-042 冻结，只用于理解组合方式，不修改）
其余同既有节点惯例
```

### Forbidden Scope

```
修改 eventSubClient.ts / twitchAuth.ts / chatMessageAdapter.ts（均已冻结）
引入数据库/持久化去重存储（本节点是有界内存去重，不是 packages/persistence 的职责）
把去重能力绑死在 ChatHandler/NormalizedChatMessage 层（必须包装 TwitchChatNotification 层，通用于全部订阅类型）
新增任何 npm 依赖
修改 packages/runtime-kernel/**、apps/renderer/**、packages/audio-engine/**
创建 packages/ai-host
```

---

## 4. Required Skills

### Required

- 有界 FIFO 集合的确定性实现（`Set` + 数组，O(1) 查找/插入/淘汰）

### Forbidden / Unnecessary

- 任何 LRU/缓存第三方库
- 任何数据库/持久化存储
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/baseline/DEV_SPEC_V1.0.md` 第 44 节第 1728 行 | 去重必须做的产品依据 |
| `packages/platform-twitch/src/eventSubClient.ts`（Read-only，DEV-041 冻结） | `TwitchChatNotification.messageId` 契约 |
| `packages/platform-twitch/src/chatMessageAdapter.ts`（Read-only，DEV-042 冻结） | 理解组合方式（本节点独立，不依赖它） |

---

## 6. Outputs

1. `MessageDeduplicator`/`MessageDeduplicatorConfig`/`createMessageDeduplicator`/`createDedupingOnNotification`（`messageDedup.ts`）
2. `specs/dev/DEV-043/DECISIONS.md`，至少覆盖：为何是有界内存去重而非
   持久化存储、为何包装 `TwitchChatNotification` 层而不是
   `ChatHandler`/`NormalizedChatMessage` 层、`maxSize` 默认值 1000 的
   理由、重复 id 不重新插入（不"续命"）的确定性理由

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-043/{INDEX,REQUIREMENTS,ACCEPTANCE,REPORT}.md`
- **Acceptance**：四份节点文档存在；`INDEX.md` 含 Task Order T001–T002。

---

### T002 — `messageDedup.ts` + 测试 + `index.ts` 导出 + 全量验证、REPORT 与 commit

- **Allowed Files**：`packages/platform-twitch/src/messageDedup.ts`、`.test.ts`、`index.ts`、`specs/dev/DEV-043/{INDEX,REPORT,DECISIONS}.md`
- **Requirements**：按第 2.1 节实现。
- **Acceptance（测试部分）**：
  - 同一 `messageId` 第二次调用 `seen()` 返回 `true`，第一次返回
    `false`。
  - 超过 `maxSize` 后最旧的 id 被淘汰——淘汰后再次传入被淘汰的 id，
    `seen()` 应返回 `false`（视为"没见过"）。
  - `createDedupingOnNotification`：同一 `messageId` 的两个 notification
    只有第一个触发 `handler`，第二个被丢弃；不同 `messageId` 的
    notification 都触发 `handler`。
  - 重复 id 不重新插入到淘汰顺序末尾（用一个刚好等于 `maxSize` 的场景
    验证：见过 id A，再见 id A（重复），再连续见 `maxSize` 个新 id——
    A 应该在这批新 id 填满之前就被淘汰，证明 A 没有因为"重复被看到"而
    续命）。
- **Requirements（验证部分）**：
  1. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  2. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  3. **`DECISIONS.md` 必须已提交**。
  4. 更新 `INDEX.md`：T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW`。
  5. `git add`（仅本节点 Writable Scope 内文件）`&& git commit`，首行：`DEV-043: message deduplication (bounded fifo)`，**恰 1 条提交**。
  6. **不要**再单独提交 LEDGER 追加行或自己的 NODE_REPORT 消息文件——写入工作区留给 Commander 收尾（同 DEV-041/042 Constraint 8）。
  7. 自行核实：`git log -1` 只看到这一条新提交、NODE_REPORT 消息文件与 LEDGER 追加行存在于工作区但未提交。
  8. **STOP**。
- **Acceptance（命令部分）**：六条命令全部退出码 0；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-043 INDEX

Status: IN_PROGRESS

## Current Node

DEV-043 — Message Deduplication

## Objective

新增 `packages/platform-twitch/src/messageDedup.ts`：有界内存去重
（`createMessageDeduplicator`，`Set`+FIFO 淘汰，默认 `maxSize=1000`）+
`createDedupingOnNotification`（包装 DEV-041 的 `TwitchChatNotification`
层 `onNotification` 回调，重复 `messageId` 直接丢弃）。Dev Spec 第 44
节明确要求（EventSub 至少一次投递）。不持久化、不绑死在
`ChatHandler`/`NormalizedChatMessage` 层。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 messageDedup.ts + 测试 + index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

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

1. **不修改 `eventSubClient.ts`/`twitchAuth.ts`/`chatMessageAdapter.ts`**（均已冻结）。
2. **不引入持久化存储**（有界内存去重，进程重启重置窗口是合理边界）。
3. **不把去重绑死在 `ChatHandler`/`NormalizedChatMessage` 层**——必须包装通用的 `TwitchChatNotification` 层。
4. **不新增任何第三方 npm 依赖**。
5. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
6. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。
7. **T002 提交后，LEDGER 追加行与自己的 NODE_REPORT 消息文件一律不要再提交**——写入工作区即可，留给 Commander 收尾统一提交。

---

## 10. Non-goals / Out-of-scope

- 不实现持久化/跨进程去重（进程内有界内存即可）。
- 不实现投票解析/聚合（DEV-044）。
- 不实现真正的重连算法（DEV-045）。
- 不实现发送消息 API（DEV-046）。
- 不把去重接入 `chatMessageAdapter.ts` 内部（组合方式留给未来真正装配
  完整 Adapter 的节点决定，本节点只交付独立、可组合的去重原语）。

---

## 11. Tests

### Unit tests

T002：重复 id 检测、FIFO 淘汰边界、淘汰后视为未见过、重复 id 不续命、
`createDedupingOnNotification` 的调用/丢弃两条路径。

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
| A07 | 同一 messageId 第二次 seen() 返回 true，第一次返回 false | 测试检查 |
| A08 | 超过 maxSize 后最旧 id 被淘汰，淘汰后再传入视为未见过 | 测试检查 |
| A09 | 重复 id 不重新插入淘汰顺序末尾（不续命） | 测试检查 |
| A10 | createDedupingOnNotification：重复 messageId 丢弃，不同 messageId 都触发 handler | 测试检查 |
| A11 | 未新增第三方 npm 依赖 | 文件检查 |
| A12 | `eventSubClient.ts`/`twitchAuth.ts`/`chatMessageAdapter.ts`/`runtime-kernel/**`/`apps/renderer/**` 未被修改 | git diff 比对 |
| A13 | 未引入任何数据库/持久化依赖；未创建 packages/ai-host | 文件检查 |
| A14 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A15 | `specs/dev/DEV-043/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A16 | `git log` 新增恰 1 条提交，首行 `DEV-043: message deduplication (bounded fifo)` | 命令 |
| A17 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A18 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT → 仅
commit 代码+节点文档（一条提交）→ 写入但不提交 LEDGER/NODE_REPORT → 自行
核实完成三要素 → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A18。
