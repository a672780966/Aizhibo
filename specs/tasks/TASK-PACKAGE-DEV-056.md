# TASK PACKAGE — DEV-056

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-056 |
| Node Name | Host LLM Provider |
| Milestone | M5 — AI Host Complete（第八个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | 无新增依赖，`ai-host` 包已存在 |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### 现实核对：Dev Spec 对 Host LLM Provider 的定义只有一句话——"只需一个可替换 Provider API"，没有指定任何具体厂商/协议

`specs/baseline/DEV_SPEC_V1.0.md` 第 2696-2698 行（第五施工组
DEV-056）全文只有"只需一个可替换 Provider API"这一句话，没有指定
任何具体 LLM 厂商、API 协议、认证方式。核对全篇 Dev Spec，再无
任何其他地方定义过 Host LLM Provider 的具体调用协议。

**取舍**（USER 2026-09-07 已就此现实核对裁决）：本节点只定义
`HostLLMProvider` 接口（"可替换 Provider API"这句话字面要求的
抽象层本身）+ 一个诚实的 `noopHostLLMProvider` 占位实现，**不
实现任何真实的网络调用**——因为 Dev Spec 未指定任何具体厂商/
协议，此刻编写真实 HTTP 客户端等于自己发明一套接线协议约定
（比如假设 OpenAI 兼容格式），一旦未来真实选定的厂商不兼容这套
假设，就是白白浪费的猜测性代码。等真实账号/厂商选定后再通过
FIX/CR 补齐真实实现——同项目里 `platform-twitch` 的
`TwitchAuthPort`/`noopTwitchAuthPort`（DEV-040）"先定义可替换
接口 + 诚实占位默认值，真实凭证到位后再补真实实现"的既有取舍
先例完全一致。

### 范围核对：不组装 Host Context 八项输入拼成真正的 prompt，本节点只提供"调用 LLM 生成一段回复文本"这个动作的可替换接口本身

同 DEV-052/053/054/055："把 Host Context 拼成真正喂给 LLM 的
prompt"是未来某个尚未建造的 Runtime 组合层的职责，不是本节点的
职责。`generateReply(prompt: string)` 的 `prompt` 参数由调用方
自己拼好传入，本节点不关心 prompt 里装的是什么内容。

---

## 2. 架构设计

### 2.1 `packages/ai-host/src/hostLLMProvider.ts`（新文件）

```typescript
// Health 形状与 packages/shared/src/health.ts 的契约逐字段一致（status/
// lastSuccessAt/latencyMs/error）。同 platform-twitch/twitchAuth.ts（DEV-040）
// 先例：本地类型镜像而非引入 workspace 依赖，保持 ai-host 现有五个模块
// （egressGate/commentPipeline/hostPersona/hostMood/hostScheduler）
// 零 `@interactive-story/shared` 依赖的既有边界不变。
type Health = {
  status: 'OK' | 'DEGRADED' | 'DOWN';
  lastSuccessAt?: number;
  latencyMs?: number;
  error?: string;
};

export type HostLLMResult = { ok: true; text: string } | { ok: false; reason: string };

export interface HostLLMProvider {
  generateReply(prompt: string): Promise<HostLLMResult>;
  getHealth(): Promise<Health>;
}

export const noopHostLLMProvider: HostLLMProvider = {
  generateReply: async () => ({ ok: false, reason: 'no Host LLM provider configured' }),
  getHealth: async () => ({ status: 'DOWN', error: 'no Host LLM provider configured' }),
};
```

- **不实现任何真实网络调用/HTTP 客户端/第三方 SDK**——`noopHostLLMProvider`
  是本节点唯一的落地实现，永远诚实返回"未配置"，不伪造成功结果。
- **零依赖**：不 import `runtime-kernel`/`platform-core`/
  `egressGate.ts`/`commentPipeline.ts`/`hostPersona.ts`/
  `hostMood.ts`/`hostScheduler.ts`。
- **不接入** Host Scheduler/prompt 拼装/真实 Host Context 组装
  （均为未来节点或未来 Runtime 组合层职责）。

---

## 3. Scope

### Writable Scope

```
packages/ai-host/src/hostLLMProvider.ts        （新增）
packages/ai-host/src/hostLLMProvider.test.ts   （新增）
packages/ai-host/src/index.ts                  （追加导出）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-056/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交，同 Constraint 6）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/ai-host/src/egressGate.ts、commentPipeline.ts、hostPersona.ts、hostMood.ts、hostScheduler.ts（Read-only，不 import）
packages/platform-twitch/src/twitchAuth.ts（Read-only，Port/noop 范式参照，不 import）
其余同既有节点惯例
```

### Forbidden Scope

```
修改 packages/platform-core/**、packages/platform-twitch/**、packages/runtime-kernel/**、packages/ai-host/src/egressGate.ts、commentPipeline.ts、hostPersona.ts、hostMood.ts、hostScheduler.ts
实现任何真实的网络调用/HTTP 客户端/LLM API 协议对接
引入任何第三方 LLM SDK 依赖
接入 Host Scheduler/prompt 拼装/真实 Host Context 组装（未来节点职责）
新增第三方 npm 依赖
创建除 ai-host 内文件外的任何新包
```

---

## 4. Required Skills

### Required

- 纯接口定义 + 诚实占位默认值（比 DEV-052/053 更简单，无状态、无逻辑分支，同 `noopTwitchAuthPort` 范式）

### Forbidden / Unnecessary

- 任何 HTTP 客户端/网络请求/第三方 LLM SDK 依赖
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/baseline/DEV_SPEC_V1.0.md` 第 2696-2698 行（第五施工组 DEV-056） | 唯一权威来源："只需一个可替换 Provider API" |
| `packages/platform-twitch/src/twitchAuth.ts`（Read-only，DEV-040 冻结） | `Port`/`noop`/本地 `Health` 类型镜像范式参照 |
| USER 2026-09-07 裁决 | 确认只定义接口 + noop 占位，不实现真实网络调用 |

---

## 6. Outputs

1. `HostLLMResult`/`HostLLMProvider`/`noopHostLLMProvider`
   （`hostLLMProvider.ts`）
2. `specs/dev/DEV-056/DECISIONS.md`，至少覆盖：为何不实现任何真实
   网络调用（Dev Spec 未指定厂商/协议，现在写死协议等于发明猜测性
   接线约定）、为何 `Health` 用本地类型镜像而非引入 `shared` 依赖
   （同 `twitchAuth.ts` 先例）、为何 `generateReply` 只接收
   `prompt: string` 不组装 Host Context（拼装是未来 Runtime 组合层
   职责）

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-056/{INDEX,REQUIREMENTS,ACCEPTANCE,REPORT}.md`
- **Acceptance**：四份节点文档存在；`INDEX.md` 含 Task Order T001–T002。

---

### T002 — `hostLLMProvider.ts` + 测试 + `index.ts` 导出 + 全量验证、REPORT 与 commit

- **Allowed Files**：`packages/ai-host/src/hostLLMProvider.ts`、`.test.ts`、`index.ts`、`specs/dev/DEV-056/{INDEX,REPORT,DECISIONS}.md`
- **Requirements**：按第 2.1 节实现。
- **Acceptance（功能部分）**：
  - `noopHostLLMProvider.generateReply(prompt)` 对任意 `prompt`
    输入都返回 `{ ok: false, reason: 'no Host LLM provider
    configured' }`，不抛错、不发起任何网络请求。
  - `noopHostLLMProvider.getHealth()` 返回
    `{ status: 'DOWN', error: 'no Host LLM provider configured' }`。
  - `HostLLMResult` 类型在 `ok: true` 分支正确携带 `text: string`
    字段（类型层面的形状验证，可通过一个手写满足接口的 mock
    实现来测试类型契约本身是否可用）。
- **Requirements（回归部分）**：`pnpm test` 全量跑通，既有全部包
  测试零改动通过。
- **Requirements（验证部分）**：
  1. `index.ts` 追加导出 T002 全部公开符号。
  2. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  3. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  4. **`DECISIONS.md` 必须已提交**。
  5. 更新 `INDEX.md`：T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW`。
  6. **写入（不提交）** `specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-056.md` 消息文件与 `specs/comms/LEDGER.md` 追加行（msg_id 取当前最大序号 + 1）。
  7. `git add`（仅本节点 Writable Scope 内文件，**不包含** LEDGER.md 与刚写的 NODE_REPORT 消息文件）`&& git commit`，首行：`DEV-056: host llm provider (replaceable interface + honest noop placeholder)`，**恰 1 条提交**。
  8. 自行核实：`git log -1` 只看到这一条新提交、NODE_REPORT 消息文件与 LEDGER 追加行存在于工作区但未提交。
  9. **STOP**。
- **Acceptance（命令部分）**：六条命令全部退出码 0；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-056 INDEX

Status: IN_PROGRESS

## Current Node

DEV-056 — Host LLM Provider

## Objective

新增 `packages/ai-host/src/hostLLMProvider.ts`：`HostLLMProvider`
可替换接口（`generateReply`/`getHealth`）+ `noopHostLLMProvider`
诚实占位实现。Dev Spec 只要求"一个可替换 Provider API"，未指定
任何厂商/协议，不实现任何真实网络调用/HTTP 客户端/第三方 SDK
（USER 2026-09-07 已就此裁决）。零依赖。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 hostLLMProvider.ts + 测试 + index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

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

1. **不实现任何真实网络调用/HTTP 客户端/第三方 LLM SDK**——
   `noopHostLLMProvider` 是本节点唯一落地实现（USER 2026-09-07
   裁决）。
2. **`Health` 用本地类型镜像**，不引入 `@interactive-story/shared`
   依赖（同 `twitchAuth.ts` 先例）。
3. **不新增任何第三方 npm 依赖**。
4. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
5. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发
   `EXECUTOR_QUERY`，等 `SCOPE_RULING`。
6. **T002 提交后，LEDGER 追加行与自己的 NODE_REPORT 消息文件一律不
   要再提交**——写入工作区即可，留给 Commander 收尾统一提交。

---

## 10. Non-goals / Out-of-scope

- 不实现任何真实的 LLM API 网络调用/HTTP 客户端/认证逻辑。
- 不引入任何第三方 LLM SDK 依赖。
- 不组装 Host Context 八项输入拼成真正的 prompt（未来 Runtime
  组合层职责）。
- 不接入 Host Scheduler（未来集成职责）。

---

## 11. Tests

### Unit tests

T002：`noopHostLLMProvider.generateReply` 对任意输入返回诚实的
`ok:false` 结果、`getHealth` 返回 `status:'DOWN'`、类型契约验证
（手写一个满足 `HostLLMProvider` 接口的 mock 实现，验证类型可用）。

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
| A07 | `noopHostLLMProvider.generateReply(prompt)` 对任意输入返回 `{ ok:false, reason:'no Host LLM provider configured' }` | 测试检查 |
| A08 | `noopHostLLMProvider.getHealth()` 返回 `{ status:'DOWN', error:'no Host LLM provider configured' }` | 测试检查 |
| A09 | `noopHostLLMProvider` 不发起任何网络请求（源码不 import `fetch`/HTTP 相关模块） | 文件/文本检查 |
| A10 | 未新增第三方 npm 依赖 | 文件检查 |
| A11 | `platform-core/**`、`platform-twitch/**`、`runtime-kernel/**`、`egressGate.ts`、`commentPipeline.ts`、`hostPersona.ts`、`hostMood.ts`、`hostScheduler.ts` 均未被修改 | git diff 比对 |
| A12 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A13 | `specs/dev/DEV-056/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A14 | `git log` 新增恰 1 条提交，首行 `DEV-056: host llm provider (replaceable interface + honest noop placeholder)` | 命令 |
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
