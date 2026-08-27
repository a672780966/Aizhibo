# TASK PACKAGE — DEV-035

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-035 |
| Node Name | Result TTS |
| Milestone | M3 — Audio Complete（第五个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-034（DONE，`verdict_ref: "0152"`）——本节点是 `TtsProviderPort` 契约的首个真实实现 |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### USER 已裁决：真实厂商接入方式

本节点是全项目第一次引入真实外部网络依赖（付费第三方 TTS API）。已征询 USER
意见，裁决：**按 ElevenLabs HTTP Streaming 实现，密钥可选**——写真实的
ElevenLabs 客户端代码，通过环境变量读取 API key；未配置 key 时自动退化为
DEV-034 的 `noopTtsProviderPort`（不发任何请求），配置了 key 才真正调用。不
强迫 USER 现在就有账号，代码本身完整、随时可通电。

### 范围核对：只建"真正会打 HTTP 的 Provider"，不接入 Runtime 编排

`DAG.md` 第 187 行："DEV-035 | Result TTS | 按兜底形态建造，非主路径（CR-018）。
HTTP Streaming（第 30 节）"。已核对 Dev Spec 第 31 节 Dice Buffer 流程：
`DICE_LOOP → AUDIO_READY? → DICE_RESOLVE`，`minDiceMs/targetDiceMs/maxDiceMs`
的等待与降级判断（"MAX 到达后不继续等待，降级到字幕+BGM+SFX"）是 **DEV-037
（Dice Buffer Controller）** 的职责，DEV-037 还没建。`resolveResultAudio`
（DEV-031，已冻结）与 `onResolve`/`onResultPlaying`（`machine.ts`，已冻结）
现在是完全同步的 XState action——把真实的、可能耗时数百毫秒到数秒的网络调用
接进这条同步链路，会阻塞整个 STORY 状态机推进，这在直播场景下不可接受，也是
DEV-031 `DECISIONS.md` D2 明确记录的"未来重开边界"（届时需要对 `onResolve`
重新发 CR）。**本节点不做那次重开**——本节点只交付一个独立、可测试、真正能打
HTTP 请求的 `TtsProviderPort` 实现，何时/如何异步调用它、如何配合
`AUDIO.READY` 与 dice 计时器，留给 DEV-037（或未来专门的编排节点）决定。

---

## 2. 架构设计

### 2.1 `packages/audio-engine/src/elevenLabsTtsProvider.ts`——真实实现

```typescript
export interface ElevenLabsTtsProviderConfig {
  apiKey: string;
  outputDir: string;             // 调用方决定写到哪，本节点不预设缓存目录（DEV-036 的职责）
  baseUrl?: string;               // 测试注入，默认 https://api.elevenlabs.io
  modelId?: string;               // 默认 'eleven_multilingual_v2'
  fetchImpl?: typeof fetch;       // 测试注入
}

export function createElevenLabsTtsProvider(config: ElevenLabsTtsProviderConfig): TtsProviderPort
```

- `synthesize(request)`：POST 到
  `${baseUrl}/v1/text-to-speech/{encodeURIComponent(request.voiceId)}/stream`，
  header 带 `xi-api-key`，body 为 `{text, model_id, voice_settings}`。
- 非 200 或响应体为空 → `{ok:false, reason: string}`（不抛异常，与 DEV-034
  `TtsSynthesisResult` 的可辨识联合风格一致）。
- 网络异常（`fetch` 抛错）→ 同样捕获为 `{ok:false, reason}`，不让异常冒出接口
  之外。
- 成功 → 用 Node 原生 `stream/promises.pipeline` 把响应体流式写入
  `outputDir` 下一个按 `sha256(voiceId:text)` 命名的 `.mp3` 文件，返回
  `{ok:true, file}`。文件名用内容哈希而非时间戳/随机数——同一段文本+音色再次
  合成会得到同一个文件名，天然具备幂等性，也符合项目一贯的确定性纪律（唯一
  的非确定性来源是"网络响应内容本身"，不是本节点自己引入的）。
- **零新增 npm 依赖**：Node ≥22（本仓库最低要求）原生提供 `fetch`、
  `ReadableStream`、`stream/promises`，不需要任何 HTTP 客户端库或 SDK。

### 2.2 `createOptionalElevenLabsTtsProvider(env, outputDir)`——密钥可选的组合入口

```typescript
export function createOptionalElevenLabsTtsProvider(
  env: NodeJS.ProcessEnv,
  outputDir: string,
): TtsProviderPort {
  const apiKey = env.ELEVENLABS_API_KEY;
  if (apiKey === undefined || apiKey === '') return noopTtsProviderPort; // DEV-034 冻结实现，原样复用
  return createElevenLabsTtsProvider({ apiKey, outputDir });
}
```

未配置 `ELEVENLABS_API_KEY` 时**直接返回 DEV-034 的 `noopTtsProviderPort`
本体**（不是行为相同的另一份实现）——诚实反映"现在没有可用的真实 Provider"，
不发送任何请求，零副作用。这是 USER 裁决"密钥可选"的具体落地方式。

### 2.3 `getElevenLabsHealth`——CR-019 首次真正适用

本节点是 `audio-engine` 包第一次引入真实网络 IO（此前 DEV-030/031/032/034 均
判定 CR-019 不适用，理由是零真实 IO）。参照 `packages/persistence/src/health.ts`
（DEV-010 先例）的风格：

```typescript
export async function getElevenLabsHealth(config: { apiKey: string; baseUrl?: string; fetchImpl?: typeof fetch }): Promise<Health>
```

- 无 `apiKey`（调用方在拿到 `undefined` 时不应调用本函数——但函数本身不假设
  调用方守规矩，见下）：本函数签名要求 `apiKey: string`，由调用方在
  "已经确认走真实 Provider"的分支才调用；`getOptionalElevenLabsHealth(env,...)`
  包一层，无 key 时直接返回 `{status:'DOWN', error:'no ELEVENLABS_API_KEY configured'}`，
  不发请求。
- 有 `apiKey`：对 `${baseUrl}/v1/user`（ElevenLabs 官方用于校验密钥的只读
  端点，不消耗合成配额）发一次 GET，2xx → `OK`（含 `latencyMs`），非 2xx 或
  网络异常 → `DOWN`（含 `error`）。
- 不在每次 `synthesize` 调用后被动更新健康状态——按需主动探测，与
  `persistence.getHealth`（DEV-010）"调用时才探测"的先例一致，不引入额外的
  模块级可变状态。

---

## 3. Scope

### Writable Scope

```
packages/audio-engine/src/elevenLabsTtsProvider.ts        （新增）
packages/audio-engine/src/elevenLabsTtsProvider.test.ts   （新增）
packages/audio-engine/src/index.ts                        （追加导出）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-035/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/audio-engine/src/ttsProvider.ts（DEV-034 冻结，只读取 noopTtsProviderPort/类型）
packages/audio-engine/src/resolveAudioSource.ts（DEV-030 冻结）
packages/runtime-kernel/**、apps/renderer/**（本节点不接入任何调用点）
其余同既有节点惯例
```

### Forbidden Scope

```
把本节点的 Provider 接入 packages/runtime-kernel 任何 action（DEV-037 或未来编排节点的职责）
实现真实缓存/去重存储（DEV-036 的职责，本节点的文件名哈希只是幂等命名，不是缓存系统）
实现 dice 计时/AUDIO_READY 编排逻辑（DEV-037 的职责）
新增任何 npm 依赖（Node 原生 fetch/stream 已足够）
修改 ttsProvider.ts / resolveAudioSource.ts
硬编码/预设产物输出目录（outputDir 必须是调用方传入的必填参数）
```

---

## 4. Required Skills

### Required

- Node 原生 `fetch`/`ReadableStream`/`stream/promises` 的流式写文件
- 外部服务调用的错误处理（区分 HTTP 错误、网络错误、空响应体，全部转为可辨识联合，不抛异常）

### Forbidden / Unnecessary

- 任何第三方 HTTP 客户端库（axios/node-fetch/undici 等——原生已够用）
- 任何 ElevenLabs 官方 SDK
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/baseline/DEV_SPEC_V1.0.md` 第 30 节 | HTTP Streaming 的产品方向依据 |
| `packages/audio-engine/src/ttsProvider.ts`（Read-only，DEV-034 冻结） | 本节点唯一实现的接口 |
| `packages/persistence/src/health.ts`（Read-only，DEV-010 先例） | `getHealth` 实现风格参照 |
| `packages/shared/src/health.ts`（Read-only） | `Health` 类型契约 |
| USER 裁决记录（本文件第 1 节） | 密钥可选的具体处理方式 |

---

## 6. Outputs

1. `createElevenLabsTtsProvider`/`ElevenLabsTtsProviderConfig`（`elevenLabsTtsProvider.ts`）
2. `createOptionalElevenLabsTtsProvider`
3. `getElevenLabsHealth`/`getOptionalElevenLabsHealth`
4. `specs/dev/DEV-035/DECISIONS.md`，至少覆盖：为何零新增依赖（原生 fetch）、
   文件命名用内容哈希而非时间戳的确定性理由、为何不接入 runtime-kernel（编排
   是 DEV-037 职责）、为何不做缓存（DEV-036 职责）、`getHealth` 主动探测而非
   被动更新的设计、`/v1/user` 端点选择的假设与理由

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-035/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Acceptance**：四文件存在；`INDEX.md` 含 Task Order T001–T003。

---

### T002 — `elevenLabsTtsProvider.ts` + 测试

- **Allowed Files**：`packages/audio-engine/src/elevenLabsTtsProvider.ts`、`.test.ts`
- **Requirements**：按第 2.1/2.2/2.3 节实现。全部网络调用必须通过可注入的
  `fetchImpl` 测试，**测试不得发出任何真实网络请求**。
- **Acceptance**：
  - `createOptionalElevenLabsTtsProvider(env 无 key, outputDir)` 返回值
    **严格等于**（`===`）DEV-034 的 `noopTtsProviderPort`（身份比较，不是行为
    相同的另一份实现）。
  - 注入返回 200 + 真实可读流 body 的假 `fetch` → `synthesize` 真正把内容
    写入 `outputDir` 下的文件（用临时目录验证文件确实存在、内容匹配），返回
    `{ok:true, file}`；文件名对同一 `(voiceId, text)` 输入保持不变（幂等性
    验证：调用两次得到同一文件名）。
  - 注入返回非 200 的假 `fetch` → `{ok:false, reason}`，不抛异常。
  - 注入抛异常的假 `fetch` → `{ok:false, reason}`，不抛异常冒出接口之外。
  - 请求构造正确性：断言假 `fetch` 收到的 URL 含正确编码后的 `voiceId`、
    header 含 `xi-api-key`、body JSON 含 `text`/`voice_settings`。
  - `getOptionalElevenLabsHealth(env 无 key, ...)` → `{status:'DOWN',
    error: string}`，零网络请求（断言假 `fetch` 未被调用）。
  - `getElevenLabsHealth` 对注入的 200/非 200/异常假 `fetch` 分别返回
    `OK`/`DOWN`/`DOWN`。

---

### T003 — `index.ts` 导出 + 全量验证、REPORT 与 commit

- **Allowed Files**：`packages/audio-engine/src/index.ts`、`specs/dev/DEV-035/INDEX.md`、`REPORT.md`、`DECISIONS.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-035.md`
- **Requirements**：
  1. `index.ts` 追加导出 T002 全部公开符号。
  2. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  3. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  4. **`DECISIONS.md` 必须已提交**，覆盖第 6 节列出的全部要点。
  5. 更新 `INDEX.md`：T001–T003 全部勾选，`Status:` 从 `IN_PROGRESS` 改为 `READY_FOR_REVIEW`。
  6. `git add -A && git commit`，提交信息首行：`DEV-035: result tts (elevenlabs provider)`。
  7. 追加 LEDGER 行，发 `NODE_REPORT`。
  8. **在结束前自行核实**：`git log -1` 能看到你的提交、NODE_REPORT 消息文件
     已存在、LEDGER 已追加对应行。三者缺一都不算完成，不要提前停止。
  9. **STOP**。
- **Acceptance**：六条命令全部退出码 0；测试过程零真实网络请求；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-035 INDEX

Status: IN_PROGRESS

## Current Node

DEV-035 — Result TTS

## Objective

首次实现 DEV-034 定义的 `TtsProviderPort` 契约的真实版本：`createElevenLabsTtsProvider`
（原生 fetch 流式 HTTP 调用 ElevenLabs Streaming API，零新增依赖）+
`createOptionalElevenLabsTtsProvider`（未配置 `ELEVENLABS_API_KEY` 时退化为
DEV-034 的 `noopTtsProviderPort` 本体）+ `getElevenLabsHealth`（CR-019 首次真正
适用）。不接入 runtime-kernel 任何调用点——真正的调用时机与 dice 计时编排是
DEV-037 的职责。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 elevenLabsTtsProvider.ts + 测试
- [ ] T003 index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；测试全程零真实网络请求；`noopTtsProviderPort` 身份等价
测试通过；`DECISIONS.md` 已入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；
已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **测试全程不得发出任何真实网络请求**——全部通过 `fetchImpl` 注入假实现。
2. **未配置密钥时必须原样返回 `noopTtsProviderPort` 本体**，不是另一份行为相同的实现。
3. **不接入 `runtime-kernel` 任何调用点**（第 1 节已说明理由）。
4. **不实现缓存/去重存储**（DEV-036 职责，内容哈希只用于幂等命名）。
5. **不新增任何 npm 依赖**。
6. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
7. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现真实缓存/去重存储（DEV-036）。
- 不实现 dice 计时器与 `AUDIO_READY` 编排（DEV-037）。
- 不把 Provider 接入 `runtime-kernel` 任何 action（架构上需要先把 `onResolve`
  从同步改成能等待异步结果，这是一次独立的、更大的 CR，明确留给未来节点）。
- 不实现 Host TTS（WebSocket 路径，DEV-057，M5）。
- 不做真实 ElevenLabs 账号下的端到端手工验证（USER 是否配置真实密钥、是否
  实际试听，由 USER 自行决定，不在本节点验收范围内）。

---

## 11. Tests

### Unit tests

T002：请求构造正确性、成功流式写文件、HTTP 错误、网络异常、幂等命名、密钥
可选退化、`getHealth` 主动探测的四种结果，全部通过注入假 `fetch` 验证，零真实
网络请求。

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
| A06 | `pnpm test` 退出码 0；既有全部测试零回归；测试全程零真实网络请求 | 命令输出 + 代码检查 |
| A07 | 无 key 时 `createOptionalElevenLabsTtsProvider` 返回值 `===` `noopTtsProviderPort` | 测试检查（身份比较） |
| A08 | 有 key + 200 响应 → 文件真实写入、内容匹配、返回 `{ok:true,file}` | 测试检查 |
| A09 | 同一 `(voiceId,text)` 两次调用得到同一文件名（幂等） | 测试检查 |
| A10 | 非 200 / 网络异常 → `{ok:false,reason}`，不抛异常 | 测试检查 |
| A11 | 请求 URL/header/body 构造正确 | 测试检查 |
| A12 | 无 key 时 `getOptionalElevenLabsHealth` 返回 `DOWN`，零网络请求 | 测试检查 |
| A13 | `getElevenLabsHealth` 对 200/非200/异常分别返回 `OK`/`DOWN`/`DOWN` | 测试检查 |
| A14 | 未新增任何 npm 依赖 | 文件检查 |
| A15 | `ttsProvider.ts`/`resolveAudioSource.ts` 逐字节未变 | git diff 比对 |
| A16 | `packages/runtime-kernel/**`、`apps/renderer/**` 未被修改 | git diff 比对 |
| A17 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A18 | `specs/dev/DEV-035/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T003 全部勾选，`Status:` 表头改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A19 | `git log` 新增恰 1 条提交，首行 `DEV-035: result tts (elevenlabs provider)`；提交时 `git status --porcelain` 为空 | 命令 |
| A20 | LEDGER 含 `NODE_REPORT-DEV-035` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A21 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT（含确认
`DECISIONS.md` 已提交）→ commit → 发 NODE_REPORT → 自行核实完成三要素 → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A21。
