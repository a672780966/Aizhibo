# TASK PACKAGE — DEV-036

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-036 |
| Node Name | Audio Cache |
| Milestone | M3 — Audio Complete（第六个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-030（DONE，`verdict_ref: "0140"`）——本节点是 `AudioResolutionPorts.findCached` 的首个真实实现方向；DEV-035（DONE，`verdict_ref: "0156"`）——本节点补上 DEV-035 自身命名方案缺失的正确 key 语义 |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`，`--provider commandcode --model deepseek/deepseek-v4-flash`） |

### 现实核对：Dev Spec 第 51 节的 key 公式暴露了 DEV-035 命名方案的一个已知缺口

第 51 节原文：

```text
Key = hash(voiceModelVersion + voiceId + resultText + voiceSettings)
不能只用 resultId，否则换声音以后会错误复用。
```

DEV-035 的 `createElevenLabsTtsProvider` 为了幂等命名，自己算了一个
`sha256(voiceId:text)` 文件名——**这个哈希不含 `voiceModelVersion`，也不含
完整 `voiceSettings`**，只是"同一次调用重复请求不用真的发两次网络请求"的
局部幂等手段，从未打算充当真正的缓存 key（DEV-035 `DECISIONS.md` D4 已明确
"不实现缓存/去重存储，DEV-036 职责"）。本节点是第一次实现规范要求的**完整、
正确**的缓存 key 算法，两者不是一回事，不要混淆或复用 DEV-035 的哈希函数。

### 范围核对：`voiceModelVersion` 不进 `AudioResolutionRequest`

`AudioResolutionRequest`（DEV-030 冻结：`contentId/text/voiceId/voiceSettings`）
没有 `voiceModelVersion` 字段。本节点**不修改**这个已冻结类型——`voiceModelVersion`
在实践中是"当前部署用的是哪个语音模型版本"，是**单次部署级别的常量**，不是
每次请求变化的字段，因此设计为 `createAudioCache` 的**构造参数**，不是
`findCached`/`store` 方法调用参数的一部分。这样 `AudioCache.findCached` 的方法
签名可以直接匹配 `AudioResolutionPorts.findCached(request) => string | undefined`
的形状（`voiceId`/`text`/`voiceSettings` 齐全，`contentId` 不参与 key 计算，
符合规范"不能只用 resultId"的告诫）——但**本节点不做那次实际接线**，只保证
形状兼容，接线是未来节点的职责。

---

## 2. 架构设计

### 2.1 `packages/audio-engine/src/audioCache.ts`

```typescript
export interface AudioCacheLookupInput {
  voiceId: string;
  text: string;
  voiceSettings: Record<string, number | string>;
}

export interface AudioCacheConfig {
  cacheDir: string;
  voiceModelVersion: string;   // 部署级常量，不随请求变化
}

export interface AudioCache {
  findCached(input: AudioCacheLookupInput): string | undefined;
  store(input: AudioCacheLookupInput, sourceFile: string): string;  // 返回缓存后的最终路径
}

export function computeAudioCacheKey(
  input: AudioCacheLookupInput & { voiceModelVersion: string },
): string

export function createAudioCache(config: AudioCacheConfig): AudioCache

export function getAudioCacheHealth(cacheDir: string): Health
```

- **`computeAudioCacheKey`**：对 `{voiceModelVersion, voiceId, text,
  voiceSettings}` 做**确定性序列化**（`voiceSettings` 的键必须先排序再
  `JSON.stringify`，保证同一组设置无论对象字面量写入顺序如何都得到同一个
  key）后 `sha256` 十六进制摘要。**必须**验证：只改 `voiceModelVersion`
  （其余字段不变）会得到不同的 key——这是本节点存在的核心原因，也是唯一
  真正区别于 DEV-035 自身哈希命名的地方。
- **`createAudioCache(config).findCached(input)`**：`cacheDir` 不存在（从未
  写入过任何缓存）时返回 `undefined`，不抛异常。存在时按 `computeAudioCacheKey`
  算出 key，**用目录前缀扫描**（`fs.readdirSync(cacheDir).find(name =>
  name.startsWith(key))`）查找匹配文件——**不假设固定扩展名**，因为
  `store()` 保留源文件的真实扩展名（见下）。
- **`createAudioCache(config).store(input, sourceFile)`**：把 `sourceFile`
  复制（`fs.copyFileSync`，不是 move——不改变调用方对 `sourceFile` 的所有权
  假设）到 `cacheDir/<key><ext>`（`ext = path.extname(sourceFile)`，保留源
  文件真实格式，不硬编码 `.mp3`），`cacheDir` 不存在则先
  `fs.mkdirSync(cacheDir, {recursive:true})`。返回缓存后的绝对/相对路径
  （与传入 `sourceFile` 的路径风格一致）。
- **`getAudioCacheHealth(cacheDir)`**：CR-019 本模块首次真正适用（真实文件系统
  IO）。参照 `packages/persistence/src/health.ts`（DEV-010 先例）风格：写一个
  临时探测文件到 `cacheDir` 再删除，成功 → `OK`（含 `latencyMs`），任何异常
  （目录不可写、路径非法等）→ `DOWN`（含 `error`）。同步实现，不引入额外
  模块级可变状态。

### 2.2 本节点不接入任何调用点

`AudioResolutionPorts`/`resolveAudioSource.ts`（DEV-030 冻结）、
`elevenLabsTtsProvider.ts`（DEV-035 冻结）、`packages/runtime-kernel/**`
一律不修改——本节点只交付一个独立、可测试的缓存实现，形状上可以直接满足
`AudioResolutionPorts.findCached` 的签名，但何时/由谁真正把它接进
`resolveAudioSource` 或 Result TTS 的调用链，留给未来节点决定。

---

## 3. Scope

### Writable Scope

```
packages/audio-engine/src/audioCache.ts        （新增）
packages/audio-engine/src/audioCache.test.ts   （新增）
packages/audio-engine/src/index.ts             （追加导出）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-036/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/audio-engine/src/{resolveAudioSource.ts,ttsProvider.ts,elevenLabsTtsProvider.ts}（均已冻结）
packages/persistence/src/health.ts（Read-only 参照）
packages/runtime-kernel/**、apps/renderer/**
其余同既有节点惯例
```

### Forbidden Scope

```
修改 AudioResolutionRequest（不得新增 voiceModelVersion 字段，见第 1 节理由）
修改 resolveAudioSource.ts / ttsProvider.ts / elevenLabsTtsProvider.ts
把 AudioCache 接入 runtime-kernel 任何调用点
复用/修改 DEV-035 内部的幂等命名哈希（两套哈希用途不同，不要合并）
新增任何 npm 依赖（Node 原生 fs/crypto/path 已足够）
```

---

## 4. Required Skills

### Required

- 确定性序列化（对象键排序后再哈希）
- Node 原生文件系统操作（`fs`/`path`/`node:crypto`）

### Forbidden / Unnecessary

- 任何数据库/ORM（不需要，目录+文件名前缀扫描已足够）
- 任何第三方哈希/序列化库
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/baseline/DEV_SPEC_V1.0.md` 第 51 节 | 缓存 key 公式的权威定义 |
| `packages/audio-engine/src/resolveAudioSource.ts`（Read-only） | 确认 `AudioResolutionPorts.findCached` 的目标签名形状 |
| `packages/persistence/src/health.ts`（Read-only，DEV-010 先例） | `getHealth` 实现风格参照 |

---

## 6. Outputs

1. `computeAudioCacheKey`/`createAudioCache`/`AudioCache`/`AudioCacheConfig`/
   `AudioCacheLookupInput`/`getAudioCacheHealth`（`audioCache.ts`）
2. `specs/dev/DEV-036/DECISIONS.md`，至少覆盖：为何 `voiceModelVersion` 是
   构造参数而不是每请求字段（1 节）、为何不与 DEV-035 的幂等哈希合并（1 节）、
   为何用目录前缀扫描而非固定扩展名假设（2.1）、`store` 用复制而非移动的理由、
   `getHealth` 探测方式设计、为何不接入任何调用点

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-036/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Acceptance**：四文件存在；`INDEX.md` 含 Task Order T001–T003。

---

### T002 — `audioCache.ts` + 测试

- **Allowed Files**：`packages/audio-engine/src/audioCache.ts`、`.test.ts`
- **Requirements**：按第 2.1 节实现。
- **Acceptance**：
  - `computeAudioCacheKey`：相同输入 → 相同 key；仅 `voiceModelVersion` 不同
    → 不同 key（核心验证）；`voiceSettings` 键顺序不同但内容相同 → 相同 key；
    `voiceSettings` 值不同 → 不同 key。
  - `findCached`：`cacheDir` 不存在 → `undefined`，不抛异常。
  - `store` 后 `findCached`（同一 input）→ 返回缓存文件路径，读取内容与源文件
    一致；缓存文件扩展名与源文件一致（用非 `.mp3` 扩展名的源文件测试，验证不是
    硬编码 `.mp3`）。
  - 两个不同 `voiceModelVersion` 的 `AudioCache`（共享同一个 `cacheDir`）对
    相同 `voiceId/text/voiceSettings` 各自 `store` 后互不覆盖、`findCached`
    互不串扰（这是本节点存在的核心场景，必须用真实临时目录端到端验证，不能
    只测 `computeAudioCacheKey` 层面）。
  - `getAudioCacheHealth`：可写目录 → `OK`（含 `latencyMs`）；不可写/非法路径
    → `DOWN`（含 `error`），不抛异常冒出接口之外。

---

### T003 — `index.ts` 导出 + 全量验证、REPORT 与 commit

- **Allowed Files**：`packages/audio-engine/src/index.ts`、`specs/dev/DEV-036/INDEX.md`、`REPORT.md`、`DECISIONS.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-036.md`
- **Requirements**：
  1. `index.ts` 追加导出 T002 全部公开符号。
  2. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  3. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  4. **`DECISIONS.md` 必须已提交**，覆盖第 6 节列出的全部要点。
  5. 更新 `INDEX.md`：T001–T003 全部勾选，`Status:` 从 `IN_PROGRESS` 改为 `READY_FOR_REVIEW`。
  6. `git add -A && git commit`，提交信息首行：`DEV-036: audio cache`。
  7. 追加 LEDGER 行，发 `NODE_REPORT`。
  8. **在结束前自行核实**：`git log -1` 能看到你的提交、NODE_REPORT 消息文件
     已存在于 `specs/comms/` 下、`specs/comms/LEDGER.md` 已在主表（`---`
     分隔线之前）追加对应行且"当前待处理"表已同步更新。三者缺一都不算完成，
     不要提前停止。
  9. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-036 INDEX

Status: IN_PROGRESS

## Current Node

DEV-036 — Audio Cache

## Objective

实现 Dev Spec 第 51 节要求的完整缓存 key 算法（`hash(voiceModelVersion +
voiceId + text + voiceSettings)`）与对应的文件缓存存取（`findCached`/
`store`），修正 DEV-035 自身幂等命名哈希缺少 `voiceModelVersion`/完整
`voiceSettings` 的已知缺口。`voiceModelVersion` 作为部署级常量放在
`createAudioCache` 的构造参数里，不进入已冻结的 `AudioResolutionRequest`。
不接入 `AudioResolutionPorts`/`resolveAudioSource`/`runtime-kernel` 任何
调用点，接线是未来节点的职责。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 audioCache.ts + 测试
- [ ] T003 index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；`computeAudioCacheKey` 的 `voiceModelVersion` 敏感性
测试通过；跨模型版本互不串扰的端到端测试通过；`DECISIONS.md` 已入库；
REPORT.md 完成且 Status = READY_FOR_REVIEW；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **不修改 `AudioResolutionRequest`**（第 1 节已说明理由）。
2. **不复用/修改 DEV-035 内部的幂等命名哈希**——两套哈希用途不同。
3. **不接入任何调用点**（`AudioResolutionPorts`/`resolveAudioSource`/
   `runtime-kernel` 一律不改）。
4. **不新增任何 npm 依赖**。
5. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
6. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不把 `AudioCache` 接入 `AudioResolutionPorts.findCached`（未来节点职责）。
- 不实现缓存淘汰/过期策略（规范未要求，属未来可能的优化，非本节点范围）。
- 不实现 Host TTS 的真实消费路径（DEV-057，M5 未建；本节点只保证缓存本身
  "服务兜底 TTS 与 Host TTS 两者共用"这件事在设计上是通用的，不特化任何一方）。

---

## 11. Tests

### Unit tests

T002：`computeAudioCacheKey` 确定性与敏感性；`findCached`/`store` 基本读写；
`getAudioCacheHealth` 正常/异常路径。

### Integration tests

T002：跨 `voiceModelVersion` 互不串扰的端到端场景（真实临时目录）。

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
| A07 | `computeAudioCacheKey` 相同输入→相同 key，仅 `voiceModelVersion` 不同→不同 key | 测试检查 |
| A08 | `voiceSettings` 键顺序不同但内容相同→相同 key | 测试检查 |
| A09 | `findCached`：`cacheDir` 不存在→`undefined`，不抛异常 | 测试检查 |
| A10 | `store`→`findCached` 往返：路径可读、内容一致、扩展名与源文件一致 | 测试检查 |
| A11 | 两个不同 `voiceModelVersion` 共享 `cacheDir` 互不串扰（端到端真实临时目录） | 测试检查 |
| A12 | `getAudioCacheHealth` 可写目录→`OK`；不可写/非法路径→`DOWN`，不抛异常 | 测试检查 |
| A13 | `AudioResolutionRequest` 未新增 `voiceModelVersion` 字段（未被修改） | git diff 比对 |
| A14 | `resolveAudioSource.ts`/`ttsProvider.ts`/`elevenLabsTtsProvider.ts` 逐字节未变 | git diff 比对 |
| A15 | `packages/runtime-kernel/**`、`apps/renderer/**` 未被修改 | git diff 比对 |
| A16 | 未新增任何 npm 依赖 | 文件检查 |
| A17 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A18 | `specs/dev/DEV-036/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T003 全部勾选，`Status:` 表头改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A19 | `git log` 新增恰 1 条提交，首行 `DEV-036: audio cache`；提交时 `git status --porcelain` 为空 | 命令 |
| A20 | LEDGER 含 `NODE_REPORT-DEV-036` 记录（位于主表分隔线之前，待处理表已同步），`git_head` 一致 | LEDGER + 命令比对 |
| A21 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT（含确认
`DECISIONS.md` 已提交）→ commit → 发 NODE_REPORT（含 LEDGER 主表位置正确、
待处理表同步）→ 自行核实完成三要素 → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A21。
