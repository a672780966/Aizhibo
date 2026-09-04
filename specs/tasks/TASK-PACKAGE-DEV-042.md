# TASK PACKAGE — DEV-042

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-042 |
| Node Name | Chat Message Adapter |
| Milestone | M4 — Twitch Complete（第三个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-041（DONE，`verdict_ref: "0175"`）——本节点是 `TwitchChatNotification` 的第一个真实消费方 |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### 现实核对：`platform-core` 尚未创建，`NormalizedChatMessage` 从未被定义过

`DAG.md` 第 339 行"保留 17 包"清单把 `platform-core` 与 `platform-twitch`
列为**两个不同的包**；`ls packages/` 验证 `platform-core` 目前不存在。
`DAG.md` 第 242 行 CR-017 裁决把 `NormalizedChatMessage`
（`platform`/`viewerId`/`messageId`/`text`/`receivedAt`）定为"Runtime 核心
唯一认识的入站类型"，但全仓库 grep 这个名字零匹配——它只在这行产品性
文字里被提及过字段形状，从未被真正定义成 TypeScript 类型。Dev Spec 第
43 节的 `LivePlatformAdapter`（`connect/disconnect/onChat/sendChat/
getHealth`）与 `ChatHandler` 同样只存在于 spec 文字，没有任何代码。

### 关键架构发现：`NormalizedChatMessage` 与已冻结的 `Vote` 是两层不同的抽象，本节点不碰 `Vote`/`PlatformPort`

核对 `packages/runtime-kernel/src/ports.ts`（DEV-009/012 冻结）：已经存在
`PlatformPort { onVote(handler: (vote: Vote) => void): void; sendChat(msg): Promise<void> }`
与 `Vote { viewerId: string; choiceId: string }`。`Vote` 是**已经被解读
出的投票意图**（哪个观众投了哪个选项），不是原始聊天消息。`DAG.md` 第
240 行把"Interaction Aggregator（A/B/C/D）"列为独立的 **DEV-044**——把
聊天文本解析成 A/B/C/D 投票、调用 `PlatformPort.onVote` 是 DEV-044 的
职责，不是本节点的。**本节点只负责"Twitch 原始 notification → 平台无关
的 `NormalizedChatMessage`"这一层转换，完全不触碰 `runtime-kernel`、
`PlatformPort`、`Vote`——`NormalizedChatMessage` 是 Adapter 层产物，
`Vote` 是 Aggregator 层产物，两者由不同节点分别负责，中间还差一层
（DEV-044）尚未建。**

### 范围核对：只做"新建 platform-core 定义类型 + platform-twitch 里加一个转换函数"

不组装完整 `LivePlatformAdapter`（还缺 DEV-046 的 `sendChat`，第 43 节
接口需要多节点合作才能拼出）；不做去重（DEV-043，Dev Spec 明确"必须做"
但是独立节点，`TwitchChatNotification.messageId` 已经为它准备好了）；
不做投票解析/聚合（DEV-044）；不改 `eventSubClient.ts`/`twitchAuth.ts`
（均已冻结）。

---

## 2. 架构设计

### 2.1 `packages/platform-core`（新建包）——平台无关契约

```typescript
/** Dev Spec 第 43 节 + DAG.md CR-017 裁决的唯一入站契约。所有平台 Adapter
 * （Twitch/YouTube/Bilibili）最终都产出这个形状；Runtime 核心不认识任何
 * 平台特有字段。 */
export interface NormalizedChatMessage {
  platform: string;
  viewerId: string;
  messageId: string;
  text: string;
  receivedAt: number;
}

export type ChatHandler = (message: NormalizedChatMessage) => void;
```

- 纯类型包，零运行时逻辑、零依赖（同 `chapter-schema` 的定位，但连 zod
  校验都不需要——校验发生在各平台 Adapter 内部，见 2.2）。
- **不定义** `LivePlatformAdapter`（`connect/disconnect/onChat/sendChat/
  getHealth`）——本节点不需要它，提前定义是无消费方的投机接口，留给真正
  组装完整 Adapter 的节点（很可能是 DEV-046 之后）。

### 2.2 `packages/platform-twitch/src/chatMessageAdapter.ts`（新文件）——转换 + 包装

```typescript
export function normalizeTwitchChatMessage(
  notification: TwitchChatNotification,
): NormalizedChatMessage | undefined

export function createTwitchChatOnNotification(
  handler: ChatHandler,
): (notification: TwitchChatNotification) => void
```

- `normalizeTwitchChatMessage`：
  - `notification.subscriptionType !== 'channel.chat.message'` → 返回
    `undefined`（本节点只认这一种订阅类型，其余原样忽略，诚实返回
    "不适用"而非抛异常）。
  - 从 `notification.event`（DEV-041 冻结为 `unknown`，原样保留的 Twitch
    原始 payload）里取 `chatter_user_id`（string）与 `message.text`
    （string，嵌套对象）；任一字段缺失/类型不对 → 返回 `undefined`（诚实
    失败，不猜测/不填充默认值）。
  - 成功 → 返回
    `{ platform: 'twitch', viewerId: chatter_user_id, messageId: notification.messageId, text: message.text, receivedAt: notification.receivedAt }`。
    `messageId` 复用 DEV-041 已经保留的 EventSub envelope `message_id`
    （供 DEV-043 去重的同一个 key，不重新发明一个）。
- `createTwitchChatOnNotification(handler)`：返回一个函数，形状与
  `EventSubClientConfig.onNotification` 完全兼容（可以直接传给
  `createEventSubClient({ ...config, onNotification: createTwitchChatOnNotification(myHandler) })`），
  内部调用 `normalizeTwitchChatMessage`，结果非 `undefined` 时才调用
  `handler`。**不修改 `eventSubClient.ts`**——这是纯粹的外部包装函数，
  DEV-041 的 `onNotification` 签名本身完全够用，不需要改冻结代码。
- `packages/platform-twitch/package.json` 新增依赖
  `@interactive-story/platform-core: workspace:*`。

---

## 3. Scope

### Writable Scope

```
packages/platform-core/                                    （新增包）
packages/platform-core/package.json
packages/platform-core/tsconfig.json
packages/platform-core/src/index.ts
packages/platform-core/src/index.test.ts（如需要，形状极简，测试可选但建议至少一个烟雾测试）
packages/platform-twitch/src/chatMessageAdapter.ts          （新增）
packages/platform-twitch/src/chatMessageAdapter.test.ts     （新增）
packages/platform-twitch/src/index.ts                       （追加导出）
packages/platform-twitch/package.json                       （追加 platform-core 依赖）
pnpm-lock.yaml
tsconfig.json                                                （追加 1 条 references：platform-core）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-042/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交，同 Constraint 8）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/platform-twitch/src/eventSubClient.ts（DEV-041 冻结，只读取 TwitchChatNotification 类型）
packages/platform-twitch/src/twitchAuth.ts（DEV-040 冻结）
packages/runtime-kernel/src/ports.ts（Read-only，仅用于理解 Vote/PlatformPort 与本节点的边界，不得修改）
其余同既有节点惯例
```

### Forbidden Scope

```
修改 packages/runtime-kernel/**（PlatformPort/Vote 是 DEV-044 的消费边界，不是本节点的）
修改 packages/platform-twitch/src/eventSubClient.ts / twitchAuth.ts（均已冻结）
实现去重存储（DEV-043 职责）
实现投票解析/聚合逻辑（A/B/C/D → Vote，DEV-044 职责）
实现发送消息 API（DEV-046 职责）
在 platform-core 里定义 LivePlatformAdapter 接口（无消费方，投机性）
新增任何 npm 依赖（除 workspace 内部的 platform-core ↔ platform-twitch 依赖）
创建 packages/ai-host
```

---

## 4. Required Skills

### Required

- TypeScript 严格模式下的可辨识返回值设计（`T | undefined`，不抛异常）
- 新建 pnpm workspace 包的标准结构（参照 `chapter-schema`/`platform-twitch`）

### Forbidden / Unnecessary

- 任何 JSON Schema/校验库（`zod` 等）——本节点的校验只是几个字段的
  `typeof` 检查，不需要引入库
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/baseline/DEV_SPEC_V1.0.md` 第 43/44 节 | `LivePlatformAdapter`/`ChatHandler`/Twitch chat 字段的产品依据 |
| `specs/dev/DAG.md` 第 242 行（CR-017） | `NormalizedChatMessage` 字段形状的唯一权威来源 |
| `packages/platform-twitch/src/eventSubClient.ts`（Read-only，DEV-041 冻结） | `TwitchChatNotification` 类型，本节点唯一的输入形状 |
| `packages/runtime-kernel/src/ports.ts`（Read-only） | 确认 `Vote`/`PlatformPort` 与本节点的边界（不碰） |
| `packages/chapter-schema/package.json`（Read-only） | 新建纯类型包的结构参照 |

---

## 6. Outputs

1. 新包 `packages/platform-core`（`NormalizedChatMessage`/`ChatHandler`）
2. `packages/platform-twitch/src/chatMessageAdapter.ts`：
   `normalizeTwitchChatMessage`/`createTwitchChatOnNotification`
3. `specs/dev/DEV-042/DECISIONS.md`，至少覆盖：为何新建 `platform-core`
   而不是把类型直接放进 `platform-twitch`（跨平台契约不该绑死在单一平台
   包里，未来 DEV-080/081 YouTube/Bilibili 也要产出同一个类型）、为何不
   定义 `LivePlatformAdapter`（无消费方）、为何不碰 `Vote`/`PlatformPort`
   （分层边界，DEV-044 职责）、`messageId` 复用 DEV-041 envelope
   message_id 而不重新发明的理由

---

## 7. Task Breakdown

### T001 — 节点文档 + `platform-core` 包骨架

- **Allowed Files**：`specs/dev/DEV-042/{INDEX,REQUIREMENTS,ACCEPTANCE,REPORT}.md`、`packages/platform-core/package.json`、`tsconfig.json`、根 `tsconfig.json`（追加 1 条 references）
- **Acceptance**：四份节点文档存在；`platform-core` 包骨架可被 `pnpm install` 识别。

---

### T002 — `platform-core` 类型定义 + `chatMessageAdapter.ts` + 测试

- **Allowed Files**：`packages/platform-core/src/index.ts`、`.test.ts`（可选烟雾测试）、`packages/platform-twitch/src/chatMessageAdapter.ts`、`.test.ts`、`packages/platform-twitch/package.json`
- **Requirements**：按第 2.1/2.2 节实现。
- **Acceptance**：
  - `normalizeTwitchChatMessage` 对合法 `channel.chat.message` notification
    （含 `event.chatter_user_id`/`event.message.text`）返回正确映射的
    `NormalizedChatMessage`，`platform` 恒为 `'twitch'`，`messageId`/
    `receivedAt` 与输入的 `notification.messageId`/`notification.receivedAt`
    相等。
  - `subscriptionType` 不是 `'channel.chat.message'` → 返回 `undefined`。
  - `event.chatter_user_id` 缺失或非字符串 → 返回 `undefined`。
  - `event.message.text` 缺失或非字符串 → 返回 `undefined`。
  - `createTwitchChatOnNotification(handler)` 对能成功转换的 notification
    恰调用 `handler` 一次，参数即转换结果；对转换失败（返回 `undefined`）
    的 notification 不调用 `handler`。

---

### T003 — `index.ts` 导出 + 全量验证、REPORT 与 commit

- **Allowed Files**：`packages/platform-twitch/src/index.ts`、`pnpm-lock.yaml`、`specs/dev/DEV-042/{INDEX,REPORT,DECISIONS}.md`
- **Requirements**：
  1. `platform-twitch/src/index.ts` 追加导出 T002 全部公开符号。
  2. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  3. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  4. **`DECISIONS.md` 必须已提交**。
  5. 更新 `INDEX.md`：T001–T003 全部勾选，`Status:` 改为 `READY_FOR_REVIEW`。
  6. `git add`（仅本节点 Writable Scope 内文件）`&& git commit`，首行：`DEV-042: chat message adapter (platform-core + twitch normalizer)`，**恰 1 条提交**。
  7. **不要**再单独提交 LEDGER 追加行或自己的 NODE_REPORT 消息文件——写入工作区留给 Commander 收尾（同 DEV-041 Constraint 8）。
  8. 自行核实：`git log -1` 只看到这一条新提交、NODE_REPORT 消息文件与 LEDGER 追加行存在于工作区但未提交。
  9. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-042 INDEX

Status: IN_PROGRESS

## Current Node

DEV-042 — Chat Message Adapter

## Objective

新建 `packages/platform-core`（`NormalizedChatMessage`/`ChatHandler`，
Dev Spec 第 43 节 + DAG.md CR-017 的平台无关入站契约）+
`packages/platform-twitch/src/chatMessageAdapter.ts`
（`normalizeTwitchChatMessage`/`createTwitchChatOnNotification`，把
DEV-041 的 `TwitchChatNotification` 转换成 `NormalizedChatMessage`）。
不碰 `runtime-kernel`/`PlatformPort`/`Vote`（DEV-044 Interaction
Aggregator 的边界）；不做去重（DEV-043）；不组装完整
`LivePlatformAdapter`（DEV-046 之后）。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档 + platform-core 包骨架
- [ ] T002 platform-core 类型定义 + chatMessageAdapter.ts + 测试
- [ ] T003 index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

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

1. **不修改 `packages/runtime-kernel/**`**（`Vote`/`PlatformPort` 是 DEV-044 的边界）。
2. **不修改 `eventSubClient.ts`/`twitchAuth.ts`**（均已冻结）。
3. **不实现去重/投票解析/发送消息**（分属 DEV-043/044/046）。
4. **`platform-core` 不定义 `LivePlatformAdapter`**（无消费方，投机性接口）。
5. **不新增任何第三方 npm 依赖**（校验用 `typeof`，不需要 zod）。
6. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
7. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。
8. **T003 提交后，LEDGER 追加行与自己的 NODE_REPORT 消息文件一律不要再提交**——写入工作区即可，留给 Commander 收尾统一提交。

---

## 10. Non-goals / Out-of-scope

- 不实现去重存储（DEV-043）。
- 不实现投票解析/聚合（A/B/C/D → Vote，DEV-044）。
- 不实现发送消息 API（DEV-046）。
- 不组装完整 `LivePlatformAdapter`。
- 不把 `NormalizedChatMessage` 接入 `runtime-kernel` 任何调用点。

---

## 11. Tests

### Unit tests

T002：`normalizeTwitchChatMessage` 的成功映射、订阅类型不匹配、字段缺失
两种失败模式；`createTwitchChatOnNotification` 的调用/不调用两种路径。

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
| A07 | 合法 channel.chat.message notification 正确映射为 NormalizedChatMessage | 测试检查 |
| A08 | subscriptionType 不匹配 → undefined | 测试检查 |
| A09 | chatter_user_id 缺失/非字符串 → undefined | 测试检查 |
| A10 | message.text 缺失/非字符串 → undefined | 测试检查 |
| A11 | createTwitchChatOnNotification 成功时调用 handler 恰一次，失败时不调用 | 测试检查 |
| A12 | 未新增第三方 npm 依赖 | 文件检查 |
| A13 | `runtime-kernel/**`、`eventSubClient.ts`、`twitchAuth.ts`、`audio-engine/**`、`apps/renderer/**` 未被修改 | git diff 比对 |
| A14 | `platform-core` 未定义 LivePlatformAdapter；未创建 ai-host | 文件检查 |
| A15 | 根 tsconfig 恰新增 1 条 platform-core 的 references | git diff 比对 |
| A16 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A17 | `specs/dev/DEV-042/` 节点文档齐全，`INDEX.md` T001–T003 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A18 | `git log` 新增恰 1 条提交，首行 `DEV-042: chat message adapter (platform-core + twitch normalizer)` | 命令 |
| A19 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A20 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT → 仅
commit 代码+节点文档（一条提交）→ 写入但不提交 LEDGER/NODE_REPORT → 自行
核实完成三要素 → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A20。
