# TASK PACKAGE — DEV-057

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-057 |
| Node Name | Host TTS |
| Milestone | M5 — AI Host Complete（第九个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | 无新增依赖，`ai-host` 包已存在；`packages/audio-engine`（DEV-034/035/036，DONE，Read-only 参照） |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### 现实核对：Dev Spec 第 30 节明确要求 Host TTS 走 WebSocket 流式协议，与 DEV-034 已冻结的 `TtsProviderPort`（文件返回式）是两种不同形状，不能直接复用

`specs/baseline/DEV_SPEC_V1.0.md` 第 1313-1333 行（第 30 节 TTS
协议）原文：

> 对于 Result：文本已经完整存在。ElevenLabs 官方明确建议这种情况
> 使用 HTTP Streaming；WebSocket 更适合文本本身正在逐步产生的
> LLM → Voice 场景……因此：Story Result → HTTP Streaming TTS；
> AI Host：LLM Streaming → WebSocket TTS。

核对现状：`packages/audio-engine/src/ttsProvider.ts`（DEV-034 冻结）
的 `TtsProviderPort.synthesize(request): Promise<{ok:true,
file:string}|{ok:false,reason:string}>` 是"给完整文本，等一段时间，
拿到一个音频文件"的请求-响应式设计，明确针对 Story Result"文本已
完整存在"的场景（第 30 节原文依据）。Host 场景的"文本正在逐步产生"
决定了它需要一个**流式**接口形状，不是"等文件"的形状——两者是 Dev
Spec 明确区分的两种不同协议，不是同一个接口的两种实现，本节点
**不修改、不复用 `TtsProviderPort`**，在 `ai-host` 包内新建一个
独立的流式接口。

### 现实核对：`specs/dev/DAG.md` 第 332 行 CR-010 附加约束——不得暴露绕过 Egress Gate 的出站接口

`DAG.md` 第 335-344 行（DEV-050A 章节）画出的管线：`Host LLM 输出
→【DEV-050A Egress Gate】→ DEV-057 Host TTS`（另一支路 →DEV-046
Send Chat）。本节点只提供"把一段已经通过 Gate 的文本合成语音"这个
动作的可替换接口本身，不做任何"决定何时该说话/直接说话"的编排
逻辑——不接入 Egress Gate/Host Scheduler/真实 Runtime 组合层，
避免出现第二条绕过 Gate 的发声路径。

### 现实核对：同 DEV-056 的现实核对——Dev Spec 未指定任何具体 TTS 厂商/WebSocket 协议细节，本节点只定义接口 + noop 占位，不实现真实网络连接

第 30 节只给出"应该用 WebSocket 而不是 HTTP Streaming"这一层
**协议类别**层面的架构判断，没有指定任何具体厂商（ElevenLabs 只是
作为"官方建议"的引用来源，不代表本节点必须对接 ElevenLabs）、
消息帧格式、鉴权方式。同 DEV-056（Host LLM Provider）的现实核对与
USER 2026-09-07 已确立的裁决方向一致：只定义反映"流式"这一架构
特征的接口形状 + 一个诚实的 `noopHostTtsProvider` 占位实现，不
实现任何真实 WebSocket 连接/HTTP 客户端/第三方 TTS SDK。等真实
账号/厂商选定后再通过 FIX/CR 补齐真实实现。

### 范围核对：不重新打开 DEV-038（Audio Ducking，BLOCKED）

`DEV-038` 从 M3 起 `BLOCKED`（暂缓非施工失败），原因是
`PLAYING_HOST` 音频状态自 DEV-009 起从未被任何真实代码路径进入。
本节点只交付"流式合成接口 + noop 占位"，**不接入
`runtime-kernel`/`audioRegion` 状态机**，不会让 `PLAYING_HOST`
真正可达——`DEV-038` 的重开条件（真实 Host 音频信号存在）在真实
TTS 实现 + Runtime 组合层落地之前仍不满足，本节点不改变
`DEV-038` 的 `BLOCKED` 状态。

---

## 2. 架构设计

### 2.1 `packages/ai-host/src/hostTtsProvider.ts`（新文件）

```typescript
// Health 形状与 packages/shared/src/health.ts 的契约逐字段一致。同
// platform-twitch/twitchAuth.ts（DEV-040）与 hostLLMProvider.ts（DEV-056）
// 先例：本地类型镜像而非引入 workspace 依赖，保持 ai-host 零
// @interactive-story/shared 依赖的既有边界不变。
type Health = {
  status: 'OK' | 'DEGRADED' | 'DOWN';
  lastSuccessAt?: number;
  latencyMs?: number;
  error?: string;
};

export type HostTtsResult =
  { ok: true; audioChunks: AsyncIterable<Uint8Array> } | { ok: false; reason: string };

export interface HostTtsProvider {
  synthesizeSpeech(text: string): Promise<HostTtsResult>;
  getHealth(): Promise<Health>;
}

export const noopHostTtsProvider: HostTtsProvider = {
  synthesizeSpeech: async () => ({ ok: false, reason: 'no Host TTS provider configured' }),
  getHealth: async () => ({ status: 'DOWN', error: 'no Host TTS provider configured' }),
};
```

- `HostTtsResult` 的 `ok: true` 分支用 `audioChunks:
  AsyncIterable<Uint8Array>` 表达"流式产出音频数据"这一架构特征
  （第 30 节要求），不是"等一个完整文件路径"（那是 DEV-034
  `TtsProviderPort` 的形状，本节点不复用）。`AsyncIterable` 只是
  一种传输无关的流式抽象，不绑定具体是 WebSocket 还是别的传输层，
  满足"可替换"要求。
- **不实现任何真实 WebSocket 连接/HTTP 客户端/第三方 TTS SDK**——
  `noopHostTtsProvider` 是本节点唯一落地实现，永远诚实返回"未
  配置"，不伪造成功结果。
- **零依赖**：不 import `runtime-kernel`/`platform-core`/
  `audio-engine`/`egressGate.ts`/`commentPipeline.ts`/
  `hostPersona.ts`/`hostMood.ts`/`hostScheduler.ts`/
  `hostLLMProvider.ts`。
- **不接入** Egress Gate/Host Scheduler/真实 Runtime 组合层
  （均为未来节点或未来 Runtime 组合层职责，也是 CR-010"不得暴露
  绕过 Gate 的出站接口"约束的直接体现——本节点只提供合成这个
  动作本身）。

---

## 3. Scope

### Writable Scope

```
packages/ai-host/src/hostTtsProvider.ts        （新增）
packages/ai-host/src/hostTtsProvider.test.ts   （新增）
packages/ai-host/src/index.ts                  （追加导出）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-057/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交，同 Constraint 6）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/ai-host/src/egressGate.ts、commentPipeline.ts、hostPersona.ts、hostMood.ts、hostScheduler.ts、hostLLMProvider.ts（Read-only，不 import）
packages/audio-engine/src/ttsProvider.ts（Read-only，对照参照两种协议形状的差异，不 import）
packages/platform-twitch/src/twitchAuth.ts（Read-only，Port/noop 范式参照，不 import）
其余同既有节点惯例
```

### Forbidden Scope

```
修改 packages/platform-core/**、packages/platform-twitch/**、packages/runtime-kernel/**、packages/audio-engine/**、packages/ai-host/src/egressGate.ts、commentPipeline.ts、hostPersona.ts、hostMood.ts、hostScheduler.ts、hostLLMProvider.ts
修改/复用 DEV-034 冻结的 TtsProviderPort（本节点新建独立的流式接口，不改动那个文件）
实现任何真实的网络调用/WebSocket 连接/HTTP 客户端/TTS API 协议对接
引入任何第三方 TTS SDK 依赖
接入 Egress Gate/Host Scheduler/真实 Runtime 组合层
重新打开 DEV-038（Audio Ducking，BLOCKED）
新增第三方 npm 依赖
创建除 ai-host 内文件外的任何新包
```

---

## 4. Required Skills

### Required

- 纯接口定义 + 诚实占位默认值（同 DEV-056 `noopHostLLMProvider` 范式，`AsyncIterable` 类型签名）

### Forbidden / Unnecessary

- 任何 WebSocket 客户端/HTTP 客户端/第三方 TTS SDK 依赖
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/baseline/DEV_SPEC_V1.0.md` 第 1313-1333 行（第 30 节 TTS 协议） | Host TTS 必须是流式（WebSocket 类）协议，与 Story Result 的 HTTP Streaming 不同形状的权威依据 |
| `specs/dev/DAG.md` 第 332、335-344 行（CR-010 Host TTS 附加约束） | "不得暴露绕过 Egress Gate 的出站接口"的权威依据 |
| `packages/audio-engine/src/ttsProvider.ts`（Read-only，DEV-034 冻结） | 对照参照：确认其文件返回式形状不适合本节点直接复用 |
| `packages/ai-host/src/hostLLMProvider.ts`（Read-only，DEV-056 冻结） | "接口 + noop 占位，不实现真实网络调用"取舍先例参照 |

---

## 6. Outputs

1. `HostTtsResult`/`HostTtsProvider`/`noopHostTtsProvider`
   （`hostTtsProvider.ts`）
2. `specs/dev/DEV-057/DECISIONS.md`，至少覆盖：为何新建独立流式
   接口而不复用/修改 DEV-034 的 `TtsProviderPort`（第 30 节两种
   协议形状的依据）、为何用 `AsyncIterable<Uint8Array>` 表达流式
   而不绑定具体 WebSocket 实现、为何不实现任何真实网络调用（同
   DEV-056 先例）、为何不重新打开 DEV-038

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-057/{INDEX,REQUIREMENTS,ACCEPTANCE,REPORT}.md`
- **Acceptance**：四份节点文档存在；`INDEX.md` 含 Task Order T001–T002。

---

### T002 — `hostTtsProvider.ts` + 测试 + `index.ts` 导出 + 全量验证、REPORT 与 commit

- **Allowed Files**：`packages/ai-host/src/hostTtsProvider.ts`、`.test.ts`、`index.ts`、`specs/dev/DEV-057/{INDEX,REPORT,DECISIONS}.md`
- **Requirements**：按第 2.1 节实现。
- **Acceptance（功能部分）**：
  - `noopHostTtsProvider.synthesizeSpeech(text)` 对任意 `text`
    输入都返回 `{ ok: false, reason: 'no Host TTS provider
    configured' }`，不抛错、不发起任何网络请求。
  - `noopHostTtsProvider.getHealth()` 返回
    `{ status: 'DOWN', error: 'no Host TTS provider configured' }`。
  - `HostTtsResult` 类型在 `ok: true` 分支正确携带
    `audioChunks: AsyncIterable<Uint8Array>` 字段（类型层面的形状
    验证，可通过一个手写满足接口的 mock 实现——比如返回一个产出
    一两个 `Uint8Array` 块的 async generator——测试类型契约本身
    是否可用，并验证能真正 `for await` 遍历出预期的数据块）。
- **Requirements（回归部分）**：`pnpm test` 全量跑通，既有全部包
  测试零改动通过。
- **Requirements（验证部分）**：
  1. `index.ts` 追加导出 T002 全部公开符号。
  2. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  3. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  4. **`DECISIONS.md` 必须已提交**。
  5. 更新 `INDEX.md`：T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW`。
  6. **写入（不提交）** `specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-057.md` 消息文件与 `specs/comms/LEDGER.md` 追加行（msg_id 取当前最大序号 + 1）。
  7. `git add`（仅本节点 Writable Scope 内文件，**不包含** LEDGER.md 与刚写的 NODE_REPORT 消息文件）`&& git commit`，首行：`DEV-057: host tts (streaming-shaped interface + honest noop placeholder)`，**恰 1 条提交**。
  8. 自行核实：`git log -1` 只看到这一条新提交、NODE_REPORT 消息文件与 LEDGER 追加行存在于工作区但未提交。
  9. **STOP**。
- **Acceptance（命令部分）**：六条命令全部退出码 0；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-057 INDEX

Status: IN_PROGRESS

## Current Node

DEV-057 — Host TTS

## Objective

新增 `packages/ai-host/src/hostTtsProvider.ts`：`HostTtsProvider`
流式合成接口（`synthesizeSpeech` 返回 `AsyncIterable<Uint8Array>`
音频块）+ `noopHostTtsProvider` 诚实占位实现。Dev Spec 第 30 节
明确 Host TTS 应为流式（WebSocket 类）协议，与 DEV-034 冻结的
文件返回式 `TtsProviderPort` 是两种不同形状，本节点新建独立接口，
不复用/修改 `TtsProviderPort`。不指定任何具体厂商/协议细节，不
实现任何真实网络调用（同 DEV-056 先例）。不重新打开 DEV-038。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 hostTtsProvider.ts + 测试 + index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

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

1. **不复用/修改 DEV-034 的 `TtsProviderPort`**——新建独立的流式
   接口，两种协议形状不能混用（第 30 节依据）。
2. **不实现任何真实网络调用/WebSocket 连接/第三方 TTS SDK**——
   `noopHostTtsProvider` 是本节点唯一落地实现（同 DEV-056 先例）。
3. **不重新打开 DEV-038（Audio Ducking）**——本节点不接入
   `runtime-kernel`/`audioRegion`。
4. **不新增任何第三方 npm 依赖**。
5. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
6. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发
   `EXECUTOR_QUERY`，等 `SCOPE_RULING`。
7. **T002 提交后，LEDGER 追加行与自己的 NODE_REPORT 消息文件一律不
   要再提交**——写入工作区即可，留给 Commander 收尾统一提交。

---

## 10. Non-goals / Out-of-scope

- 不实现任何真实的 WebSocket/HTTP 网络调用/认证逻辑。
- 不引入任何第三方 TTS SDK 依赖。
- 不复用/修改 DEV-034 `TtsProviderPort`。
- 不接入 Egress Gate/Host Scheduler/真实 Runtime 组合层（未来
  集成职责）。
- 不重新打开 DEV-038（Audio Ducking，BLOCKED）。

---

## 11. Tests

### Unit tests

T002：`noopHostTtsProvider.synthesizeSpeech` 对任意输入返回诚实的
`ok:false` 结果、`getHealth` 返回 `status:'DOWN'`、类型契约验证
（手写一个产出真实 `Uint8Array` 数据块的 mock async generator
实现，验证类型可用且能被 `for await` 正确遍历）。

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
| A07 | `noopHostTtsProvider.synthesizeSpeech(text)` 对任意输入返回 `{ ok:false, reason:'no Host TTS provider configured' }` | 测试检查 |
| A08 | `noopHostTtsProvider.getHealth()` 返回 `{ status:'DOWN', error:'no Host TTS provider configured' }` | 测试检查 |
| A09 | `noopHostTtsProvider` 不发起任何网络请求（源码不 import `fetch`/WebSocket/HTTP 相关模块） | 文件/文本检查 |
| A10 | `HostTtsResult` 的 `ok:true` 分支类型契约可用，手写 mock async generator 实现能被正确 `for await` 遍历出预期数据块 | 测试检查 |
| A11 | 未新增第三方 npm 依赖 | 文件检查 |
| A12 | `platform-core/**`、`platform-twitch/**`、`runtime-kernel/**`、`audio-engine/**`、`egressGate.ts`、`commentPipeline.ts`、`hostPersona.ts`、`hostMood.ts`、`hostScheduler.ts`、`hostLLMProvider.ts` 均未被修改 | git diff 比对 |
| A13 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A14 | `specs/dev/DEV-057/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A15 | `git log` 新增恰 1 条提交，首行 `DEV-057: host tts (streaming-shaped interface + honest noop placeholder)` | 命令 |
| A16 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A17 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改（DEV-038 状态不受影响） | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT → 仅
commit 代码+节点文档（一条提交）→ 写入但不提交 LEDGER/NODE_REPORT →
自行核实完成三要素 → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A17。
