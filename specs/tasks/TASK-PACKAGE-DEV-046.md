# TASK PACKAGE — DEV-046

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-046 |
| Node Name | Twitch Send Chat |
| Milestone | M4 — Twitch Complete（第七个/最后一个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-040（DONE，`verdict_ref: "0168"`）——复用 `TwitchAuthPort` |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### 现实核对：`PlatformPort.sendChat` 已冻结但从未被真实实现驱动过；CR-010 明确禁止本节点暴露 Host 可直接调用的出站接口

`packages/runtime-kernel/src/ports.ts`（DEV-009/012 冻结）：
`PlatformPort.sendChat(msg: string): Promise<void>`，`noopPlatformPort.sendChat`
是空实现，全仓库从未有真实代码调用发送聊天消息的 Twitch API。Dev Spec
第 44 节"回复：使用 Twitch Send Chat Message API"，未给出更多字段级
细节，属训练知识里的稳定公开 API 事实：`POST
https://api.twitch.tv/helix/chat/messages`，header
`Authorization: Bearer <token>` + `Client-Id`，body
`{broadcaster_id, sender_id, message}`，200 响应体
`{data: [{message_id, is_sent, drop_reason?: {code, message}}]}`——
`is_sent: false` 表示消息被 Twitch 侧过滤（如 AutoMod）丢弃，不算网络
层失败但也不算真正发出。`DAG.md` 第 264 行 **DEV-046 附加约束（CR-010）**：
"不得暴露可被 Host 直接调用的出站接口。Host 发言必须经 DEV-050A Egress
Gate"——DEV-050A（M5，Host Egress Gate）尚未创建，所以本节点只能交付
一个独立、可测试的底层 Twitch 发送能力，**不接入 `runtime-kernel`/
`PlatformPort`，不创建任何 Host 可达的调用路径**。

### 范围核对：只做"给一段文本 → 真实调用 Twitch Send Chat Message API"，不做健康探测（会产生真实副作用）、不做本地校验/截断、不接入 runtime-kernel

架构上复用 DEV-040 `twitchAuth.ts` 的"诚实结果类型"模式
（`{ok:true,...} | {ok:false,reason}`）与 DEV-041 `eventSubClient.ts`
调用 Helix API 时的 `fetchImpl` 注入测试模式（零真实网络请求）。与
`twitchAuth.ts` 的一个关键差异：**不提供 `getXxxHealth()` 主动探测
函数**——`twitchAuth.ts` 的健康探测之所以安全，是因为"取一次 access
token"本身无副作用；而"发一条聊天消息"是有真实、公开可见副作用的
操作（会真的在频道里发一条消息），用它做健康探测会向真实观众刷屏，
这是不可接受的设计（记录于 `DECISIONS.md`）。不做消息长度本地校验/
截断（Twitch API 自己会用响应体拒绝非法输入，本节点不重复发明业务
规则）；不做重试（与 DEV-041 Helix 订阅创建"不重试"先例一致）。

---

## 2. 架构设计

### 2.1 `packages/platform-twitch/src/sendChat.ts`（新文件）

```typescript
export type TwitchSendChatResult =
  | { ok: true; messageId: string }
  | { ok: false; reason: string };

export interface TwitchSendChatConfig {
  /** 复用 DEV-040 冻结接口，本节点唯一的凭据来源。 */
  authPort: TwitchAuthPort;
  clientId: string;
  /** Helix body 的 broadcaster_id。 */
  broadcasterUserId: string;
  /** Helix body 的 sender_id（bot 自己的 user id）。 */
  userId: string;
  /** 测试注入；默认 https://api.twitch.tv。 */
  helixBaseUrl?: string;
  /** 测试注入；默认全局 fetch（Node ≥22 原生）。 */
  fetchImpl?: typeof fetch;
}

export interface TwitchSendChat {
  sendChat(message: string): Promise<TwitchSendChatResult>;
}

export const noopTwitchSendChat: TwitchSendChat;

export function createTwitchSendChat(config: TwitchSendChatConfig): TwitchSendChat;
```

- `sendChat(message)`：先 `authPort.getAccessToken()`；`ok:false` →
  直接返回 `{ok:false, reason: result.reason}`，**不发起任何 HTTP
  请求**（与 `eventSubClient.connect()` 凭据不可用时的诚实失败模式
  一致）。凭据可用则 `POST
  ${helixBaseUrl}/helix/chat/messages`，header
  `Authorization: Bearer <token>` + `Client-Id: config.clientId` +
  `Content-Type: application/json`，body
  `{broadcaster_id: config.broadcasterUserId, sender_id: config.userId,
  message}`。
- 响应处理：`!response.ok` → `{ok:false, reason: 'Twitch send chat
  request failed: <status> <statusText>'}`；响应体形状不符预期 →
  `{ok:false, reason:'Twitch send chat response has an unexpected
  shape'}`；`data[0].is_sent === false` → `{ok:false, reason:
  data[0].drop_reason?.message ?? 'message was dropped by Twitch'}`；
  否则 `{ok:true, messageId: data[0].message_id}`。
- `fetch` 本身抛异常 → `catch` 包成 `{ok:false, reason: <error message>}`
  （与 `twitchAuth.ts` 的 `errorMessage(error)` 辅助函数同款处理）。
- `noopTwitchSendChat`：`sendChat` 恒定返回
  `{ok:false, reason:'no Twitch send-chat configured'}`（与
  `noopTwitchAuthPort` 同款占位退化）。
- **不提供健康探测函数**（`getTwitchAuthHealth` 式的主动探测在这里会
  真实发消息，不安全，见上方范围核对与 `DECISIONS.md`）。
- **零新增 npm 依赖**；**不重试**；**不做消息内容本地校验/截断**。

---

## 3. Scope

### Writable Scope

```
packages/platform-twitch/src/sendChat.ts        （新增）
packages/platform-twitch/src/sendChat.test.ts   （新增）
packages/platform-twitch/src/index.ts           （追加导出）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-046/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交，同 Constraint 7）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/platform-twitch/src/twitchAuth.ts（DEV-040 冻结，TwitchAuthPort 形状与"诚实结果类型"模式参照）
packages/runtime-kernel/src/ports.ts（Read-only，仅用于核对 PlatformPort.sendChat 形状，不得 import）
其余同既有节点惯例
```

### Forbidden Scope

```
修改 packages/runtime-kernel/**（含 ports.ts/machine.ts）
import 或依赖 @interactive-story/runtime-kernel
把 createTwitchSendChat 接入 PlatformPort/runtime-kernel 的任何调用点
创建任何 Host 可直接调用的出站接口（CR-010——Host 发言必须经未来的 DEV-050A Egress Gate）
提供会真实发送聊天消息的健康探测函数（副作用不可接受）
实现消息内容本地校验/截断/重试
新增任何 npm 依赖
创建 packages/ai-host 或 packages/platform-core 之外的新包
```

---

## 4. Required Skills

### Required

- 复用既有 `fetchImpl`/`authPort` 注入测试模式（同 DEV-040/041）
- Helix REST 请求构造与响应体判别（`is_sent`/`drop_reason`）

### Forbidden / Unnecessary

- 任何真实网络请求（测试须 100% 注入 `fetchImpl`）
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/baseline/DEV_SPEC_V1.0.md` 第 1740 行（第 44 节） | "使用 Twitch Send Chat Message API" |
| `specs/dev/DAG.md` 第 264 行 | CR-010 附加约束：不得暴露 Host 可直接调用的出站接口 |
| `packages/platform-twitch/src/twitchAuth.ts`（Read-only，DEV-040 冻结） | `TwitchAuthPort`/诚实结果类型模式参照 |
| `packages/runtime-kernel/src/ports.ts`（Read-only） | `PlatformPort.sendChat` 形状参照（不 import） |

---

## 6. Outputs

1. `TwitchSendChatResult`/`TwitchSendChatConfig`/`TwitchSendChat`/
   `noopTwitchSendChat`/`createTwitchSendChat`（`sendChat.ts`）
2. `specs/dev/DEV-046/DECISIONS.md`，至少覆盖：为何不提供健康探测
   函数（副作用不可接受）、为何不做本地消息校验/截断/重试、为何不
   接入 `runtime-kernel`（CR-010，留给 DEV-050A）

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-046/{INDEX,REQUIREMENTS,ACCEPTANCE,REPORT}.md`
- **Acceptance**：四份节点文档存在；`INDEX.md` 含 Task Order T001–T002。

---

### T002 — `sendChat.ts` + 测试 + `index.ts` 导出 + 全量验证、REPORT 与 commit

- **Allowed Files**：`packages/platform-twitch/src/sendChat.ts`、`.test.ts`、`index.ts`、`specs/dev/DEV-046/{INDEX,REPORT,DECISIONS}.md`
- **Requirements**：按第 2.1 节实现。全部 HTTP 行为必须通过
  `fetchImpl` 注入测试，**测试不得发出任何真实网络连接或请求**。
- **Acceptance（功能部分）**：
  - `authPort.getAccessToken()` 返回 `ok:false` → `sendChat()` 直接
    返回 `{ok:false, reason}`，**断言 `fetchImpl` 从未被调用**。
  - 凭据可用、Helix 返回 200 + `data:[{message_id:'m1', is_sent:true}]`
    → `{ok:true, messageId:'m1'}`；断言请求 URL/method/header
    （`Authorization`/`Client-Id`）/body 字段
    （`broadcaster_id`/`sender_id`/`message`）与配置和入参一致。
  - Helix 返回 200 但 `is_sent:false`（附 `drop_reason`）→
    `{ok:false, reason}`，`reason` 取自 `drop_reason.message`。
  - Helix 返回非 200 → `{ok:false, reason}` 包含状态码信息。
  - Helix 响应体形状不符预期（缺字段/`data` 非数组等）→ `{ok:false, reason}`。
  - `fetchImpl` 抛异常 → `{ok:false, reason}` 包含异常信息，`sendChat`
    本身不抛异常（`Promise` 正常 resolve 到 `ok:false`）。
  - `noopTwitchSendChat.sendChat(...)` 恒定返回 `{ok:false, reason}`，
    不发起任何 `fetch`。
  - 不重试：非 200/异常场景下 `fetchImpl` 只被调用一次。
- **Requirements（验证部分）**：
  1. `index.ts` 追加导出 T002 全部公开符号。
  2. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  3. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  4. **`DECISIONS.md` 必须已提交**。
  5. 更新 `INDEX.md`：T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW`。
  6. `git add`（仅本节点 Writable Scope 内文件）`&& git commit`，首行：`DEV-046: twitch send chat`，**恰 1 条提交**。
  7. **不要**再单独提交 LEDGER 追加行或自己的 NODE_REPORT 消息文件——写入工作区留给 Commander 收尾。
  8. 自行核实：`git log -1` 只看到这一条新提交、NODE_REPORT 消息文件与 LEDGER 追加行存在于工作区但未提交。
  9. **STOP**。
- **Acceptance（命令部分）**：六条命令全部退出码 0；测试过程零真实网络连接；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-046 INDEX

Status: IN_PROGRESS

## Current Node

DEV-046 — Twitch Send Chat

## Objective

新增 `packages/platform-twitch/src/sendChat.ts`：`createTwitchSendChat`
调用真实 Twitch Send Chat Message API（`POST
/helix/chat/messages`），复用 DEV-040 `TwitchAuthPort` 与其"诚实结果
类型"模式（`{ok:true,messageId}|{ok:false,reason}`）。不提供健康探测
函数（会产生真实发消息副作用）、不做本地校验/截断/重试、不接入
`runtime-kernel`/`PlatformPort`（CR-010，留给未来的 DEV-050A Egress
Gate）。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 sendChat.ts + 测试 + index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

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

1. **不修改 `packages/runtime-kernel/**`，不 import/依赖它**。
2. **不提供会真实发消息的健康探测函数**。
3. **不做消息内容本地校验/截断/重试**。
4. **不新增任何第三方 npm 依赖**。
5. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
6. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。
7. **T002 提交后，LEDGER 追加行与自己的 NODE_REPORT 消息文件一律不要再提交**——写入工作区即可，留给 Commander 收尾统一提交。

---

## 10. Non-goals / Out-of-scope

- 不接入 `runtime-kernel`/`PlatformPort`（CR-010，留给未来的 DEV-050A Egress Gate）。
- 不提供健康探测函数。
- 不做消息内容本地校验/截断/重试。
- 不组装 `LivePlatformAdapter`（第 43 节，未来编排节点职责）。

---

## 11. Tests

### Unit tests

T002：凭据不可用直接失败不发请求、成功路径请求构造正确性、
`is_sent:false` 视为失败、非 200 失败、响应体形状异常失败、`fetch`
异常被捕获、`noopTwitchSendChat` 恒定失败不发请求、不重试。

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
| A07 | 凭据不可用 → 直接失败，`fetchImpl` 从未被调用 | 测试检查 |
| A08 | 成功路径：请求 URL/method/header/body 字段正确，返回 `{ok:true,messageId}` | 测试检查 |
| A09 | `is_sent:false` → `{ok:false,reason}`（取自 `drop_reason.message`） | 测试检查 |
| A10 | 非 200 → `{ok:false,reason}` | 测试检查 |
| A11 | 响应体形状异常 → `{ok:false,reason}` | 测试检查 |
| A12 | `fetch` 抛异常 → `{ok:false,reason}`，不抛出未捕获异常 | 测试检查 |
| A13 | `noopTwitchSendChat` 恒定 `{ok:false,reason}`，不发起 `fetch` | 测试检查 |
| A14 | 失败场景下 `fetchImpl` 只被调用一次（不重试） | 测试检查 |
| A15 | 未新增第三方 npm 依赖 | 文件检查 |
| A16 | `runtime-kernel/**` 未被修改，且未被 import/依赖 | git diff + 源码检查 |
| A17 | 未创建 `packages/ai-host` 或额外新包 | 文件检查 |
| A18 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A19 | `specs/dev/DEV-046/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A20 | `git log` 新增恰 1 条提交，首行 `DEV-046: twitch send chat` | 命令 |
| A21 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A22 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT → 仅
commit 代码+节点文档（一条提交）→ 写入但不提交 LEDGER/NODE_REPORT → 自行
核实完成三要素 → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A22。
