# TASK PACKAGE — DEV-034

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-034 |
| Node Name | TTS Provider Interface |
| Milestone | M3 — Audio Complete（第四个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-030（DONE，`verdict_ref: "0140"`）——同住 `packages/audio-engine`，概念上互补但类型独立 |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### 范围核对：本节点只定义"TTS 提供方长什么样"，不实现任何真实调用

`specs/dev/DAG.md` 第 186/187 行明确把"HTTP Streaming（第 30 节）"的真实实现记在
**DEV-035（Result TTS）**名下，DEV-034 只有"TTS Provider Interface"一行、无备注
——与 DEV-030（"定义解析链，不接入真实 TTS/缓存"）同一种"先定义契约、下一节点
才真正实现"分工。已核对 Rev 2 冻结的 17 包列表（`DAG.md` 第 317 行区块）里**没有
独立的 tts/provider 包**——音频相关的全部内容都收在 `packages/audio-engine`
一个包里，因此本节点的交付物是 `packages/audio-engine` 内新增的一个文件，不是
新建包。

本节点**不**接任何真实 HTTP 客户端/TTS SDK（ElevenLabs 等仅是 Dev Spec 第 30 节
举例的产品方向，不是本节点或 DEV-035 被要求绑定的具体厂商——真正选型、密钥管理、
成本控制等属于 DEV-035 施工时才需要面对的问题，明确超出本节点范围）。

---

## 2. 架构设计（Commander 已核对既有代码后做出的决策）

### 2.1 新文件 `packages/audio-engine/src/ttsProvider.ts`

```typescript
export interface TtsSynthesisRequest {
  text: string;
  voiceId: string;
  voiceSettings: Record<string, number | string>;
}

export type TtsSynthesisResult =
  | { ok: true; file: string }
  | { ok: false; reason: string };

export interface TtsProviderPort {
  synthesize(request: TtsSynthesisRequest): Promise<TtsSynthesisResult>;
}

export const noopTtsProviderPort: TtsProviderPort = {
  synthesize: async () => ({ ok: false, reason: 'no TTS provider configured' }),
};
```

- **接口不暴露任何流式/HTTP 细节**：调用方只关心"给了文本，最终有没有产出一个
  可播放的文件"。第 30 节说的 HTTP Streaming 是 DEV-035 未来实现
  `TtsProviderPort` 时的**内部**手段（把边到达边写的音频流写成完整文件后再把
  路径返回），不是这个接口本身要暴露的形状——如果把流原语塞进接口签名，
  `resolveAudioSource`（DEV-030）与其余消费方就要提前理解"流"是什么，这是在
  没有真实实现之前替未来节点做技术选型，属于过度设计。
- **返回可辨识联合而非抛异常**：与项目里其余决策类型（`AudioResolutionResult`
  等）的风格一致——失败是一等公民，不是异常路径。
- **`TtsSynthesisRequest` 故意不复用 `AudioResolutionRequest`**：后者多一个
  `contentId`（服务于缓存 key/去重，是"决策"层的字段），本接口只关心真正驱动一次
  合成调用所需的字段。两者概念不同（一个是"决定用哪个来源"，一个是"真的去合成"），
  刻意保持独立类型，避免因为字段凑巧相同就耦合出错误的依赖关系。记入
  `DECISIONS.md`。

### 2.2 默认实现 `noopTtsProviderPort`——如实反映"现在没有任何真实 Provider"

与 DEV-030 的 `noopAudioResolutionPorts` 同一先例：本节点交付的默认实现总是
诚实报告失败，不假装有一个能用的 TTS 后端。DEV-035 落地时提供真实实现替换它，
**不需要对本接口发 CR**。

### 2.3 本节点不接入任何调用点

`resolveAudioSource`/`resultAudioResolution`/`machine.ts`/`Ports`
**一律不修改**——`TtsProviderPort` 现在没有任何消费者，这是刻意的（DEV-030 当初
交付 `resolveAudioSource` 时也是同样"先定义、下一节点才接线"的节奏，`AudioPort`/
`AudioResolutionPorts` 都是先例）。`AudioResolutionPorts.hasTtsProvider(request):
boolean`（DEV-030 冻结）**不改动、不与本接口关联**——它是"是否存在 Provider"的
布尔判断，属于 `resolveAudioSource` 决策链自己的字段，与"Provider 具体长什么样"
是两个独立关注点。

### 2.4 CR-019（`getHealth`）不适用

零真实 IO（`noopTtsProviderPort.synthesize` 只是一个立即 resolve 的字面量），
同 DEV-001/005/030 先例。

---

## 3. Scope

### Writable Scope

```
packages/audio-engine/src/ttsProvider.ts        （新增）
packages/audio-engine/src/ttsProvider.test.ts   （新增）
packages/audio-engine/src/index.ts              （追加导出）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-034/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/audio-engine/src/resolveAudioSource.ts（DEV-030 冻结，不得改动）
packages/runtime-kernel/**（不接入任何调用点，全部只读）
apps/renderer/**（本节点与 Renderer 无关）
其余同既有节点惯例（chapter-schema 等其他包、根配置、specs/baseline、audit、
  protocol、specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**）
```

### Forbidden Scope

```
修改 resolveAudioSource.ts / AudioResolutionPorts.hasTtsProvider
把 TtsProviderPort 接入 runtime-kernel 任何 action 或 Ports
实现任何真实 HTTP/网络调用（DEV-035 的职责）
在接口里暴露具体的流式原语（第 2.1 节已说明理由）
新增任何 npm 依赖（含任何 HTTP 客户端库）
新建 getHealth()
```

---

## 4. Required Skills

### Required

- 纯类型/接口设计（无实现细节泄漏）

### Forbidden / Unnecessary

- 任何 HTTP 客户端库、TTS SDK
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/baseline/DEV_SPEC_V1.0.md` 第 30 节 | TTS 协议的产品方向（HTTP Streaming vs WebSocket），确认本节点不实现，只为将来的实现留出契约位置 |
| `packages/audio-engine/src/resolveAudioSource.ts`（Read-only） | 确认 `hasTtsProvider` 与本节点新接口的边界划分 |
| `specs/dev/DAG.md` 第 186/187 行 | 确认 HTTP Streaming 归属 DEV-035，本节点只做接口 |

---

## 6. Outputs

1. `TtsProviderPort`/`TtsSynthesisRequest`/`TtsSynthesisResult`/`noopTtsProviderPort`（`ttsProvider.ts`）
2. `specs/dev/DEV-034/DECISIONS.md`，至少覆盖：为何接口不暴露流式原语（2.1）、
   为何 `TtsSynthesisRequest` 不复用 `AudioResolutionRequest`（2.1）、为何不接入
   任何调用点（2.3）、`CR-019` 不适用的理由（2.4）

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-034/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Acceptance**：四文件存在；`INDEX.md` 含 Task Order T001–T003。

---

### T002 — `ttsProvider.ts` + 测试

- **Allowed Files**：`packages/audio-engine/src/ttsProvider.ts`、`.test.ts`
- **Requirements**：按第 2.1/2.2 节实现。
- **Acceptance**：
  - `noopTtsProviderPort.synthesize(...)` 对任意合法输入都 resolve 为
    `{ok:false, reason: string}`，不抛异常。
  - 类型检查：`TtsSynthesisResult` 是可辨识联合（`ok:true`分支要求 `file:
    string`，`ok:false`分支要求 `reason: string`）——写一个使用两个分支的测试
    用例分别构造字面量并通过 `pnpm typecheck` 验证类型收窄正确。

---

### T003 — `index.ts` 导出 + 全量验证、REPORT 与 commit

- **Allowed Files**：`packages/audio-engine/src/index.ts`、`specs/dev/DEV-034/INDEX.md`、`REPORT.md`、`DECISIONS.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-034.md`
- **Requirements**：
  1. `index.ts` 追加导出 T002 全部公开符号。
  2. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  3. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  4. **`DECISIONS.md` 必须已提交**，覆盖第 6 节列出的全部要点。
  5. 更新 `INDEX.md`：T001–T003 全部勾选，`Status:` 从 `IN_PROGRESS` 改为 `READY_FOR_REVIEW`。
  6. `git add -A && git commit`，提交信息首行：`DEV-034: tts provider interface`。
  7. 追加 LEDGER 行，发 `NODE_REPORT`。
  8. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-034 INDEX

Status: IN_PROGRESS

## Current Node

DEV-034 — TTS Provider Interface

## Objective

在 `packages/audio-engine` 新增 `TtsProviderPort`/`TtsSynthesisRequest`/
`TtsSynthesisResult`/`noopTtsProviderPort`——只定义"TTS 提供方长什么样"的契约，
不实现任何真实 HTTP/流式调用（DEV-035 的职责），不接入任何调用点（`resolveAudioSource`/
`runtime-kernel` 均不改动）。

## Allowed Scope / Read-only Scope / Forbidden Scope
（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 ttsProvider.ts + 测试
- [ ] T003 index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001（每完成一个 Task 立即勾选并更新本字段）

## Exit Criteria

六条命令全部退出码 0；`noopTtsProviderPort` 诚实失败路径测试通过；可辨识联合
类型检查通过；`DECISIONS.md` 已入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；
已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **不实现任何真实网络调用**——`synthesize` 的唯一实现是诚实失败的 noop。
2. **不接入任何调用点**（`resolveAudioSource`/`runtime-kernel`/`Ports` 一律不改）。
3. **不在接口里暴露流式原语**（第 2.1 节已说明理由）。
4. **不新建 `getHealth()`**（第 2.4 节已说明理由）。
5. **不新增任何 npm 依赖**。
6. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
7. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现真实 TTS 厂商调用（ElevenLabs 等，DEV-035 的职责，含厂商选型/密钥管理/成本控制）。
- 不实现 HTTP Streaming（第 30 节，DEV-035 的职责）。
- 不实现 WebSocket TTS（AI Host 用，DEV-057 的职责，M5）。
- 不把 `TtsProviderPort` 接入任何调用点。
- 不修改 `AudioResolutionPorts.hasTtsProvider`。

---

## 11. Tests

### Unit tests

T002：`noopTtsProviderPort` 诚实失败路径 + 可辨识联合类型收窄验证。

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
| A07 | `noopTtsProviderPort.synthesize(...)` 恒定 resolve 为 `{ok:false, reason:string}`，不抛异常 | 测试检查 |
| A08 | `TtsSynthesisResult` 可辨识联合的两个分支类型收窄正确 | 测试 + typecheck |
| A09 | `resolveAudioSource.ts`/`AudioResolutionPorts.hasTtsProvider` 逐字节未变 | git diff 比对 |
| A10 | `packages/runtime-kernel/**`、`apps/renderer/**` 未被修改（本节点零接线） | git diff 比对 |
| A11 | 未新增任何 npm 依赖 | 文件检查 |
| A12 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A13 | `specs/dev/DEV-034/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T003 全部勾选，`Status:` 表头改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A14 | `git log` 新增恰 1 条提交，首行 `DEV-034: tts provider interface`；提交时 `git status --porcelain` 为空 | 命令 |
| A15 | LEDGER 含 `NODE_REPORT-DEV-034` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A16 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT（含确认
`DECISIONS.md` 已提交）→ commit → 发 NODE_REPORT → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A16。
