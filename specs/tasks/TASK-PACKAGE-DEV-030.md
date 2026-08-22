# TASK PACKAGE — DEV-030

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-030 |
| Node Name | Audio Manifest |
| Milestone | M3 — Audio Complete（**第一个节点**） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-012（DONE，`verdict_ref: "0096"`）——M3 只依赖 DEV-012，不依赖 M2 任何节点 |
| Commander | Claude |
| Executor | Codex（协议角色名 `OPENCODE`） |

### 首次创建 `packages/audio-engine`

Rev 2 冻结 17 包列表之一，此前从未创建。

### 本节点只"定义解析链"，不接入任何真实 TTS/缓存/预生成——那些都是后续节点的职责

`DAG.md`："定义全系统统一音频解析链（CR-018）：`PREGENERATED → CACHE →
RUNTIME_TTS → SUBTITLE_ONLY`。"已核对 M3 组内后续节点分工：`DEV-034`（TTS Provider
Interface）、`DEV-035`（Result TTS，兜底路径）、`DEV-036`（Audio Cache）都**还没有
建**，`DEV-074`（Audio Production Queue，批量生成 PREGENERATED 块音频）属于 M7，
更远。本节点只能定义**决策算法本身**——一个纯函数，接受"当前四个来源各自能不能命中"
的注入判定（Ports 模式，DEV-009 已确立的先例），本节点交付的默认实现**全部返回
"不可用"**（如实反映现状：没有预生成目录、没有缓存表、没有 TTS Provider），因此
在本节点单独运行时，任何请求都会一路 fallthrough 到 `SUBTITLE_ONLY`——这是**正确
的**当前行为，不是偷懒。DEV-034/035/036 未来各自提供真正的 Port 实现替换默认值，
**不需要对本节点的决策函数发 CR**（这是特意如此设计的，见第 2.2 节）。

### 关键澄清：本节点的解析链只对"叙事旁白/结算叙事"（SPEECH）有意义，BGM/SFX 已经在 DEV-027 解决

已核对 `chapter-schema/audio.ts` 的 `AudioAsset` 判别联合：`kind` 为
`BGM`/`SFX`/`AMBIENCE` 时，`source` 只能是 `PREPRODUCED`/`PREGENERATED`（作者在
`visuals`/`audio` 目录里直接声明一个固定文件），DEV-027 的 `resolveSceneAudio` 已
经完整处理——这些资产**不需要**运行时四级 fallback，作者声明的就是唯一来源。
只有 `kind==='SPEECH'`（叙事文本转语音）在编译期不知道会不会有预生成文件（那要
等 M7 的 `DEV-074` 跑完），才需要本节点定义的运行时决策链。本节点的
`AudioResolutionRequest`/`resolveAudioSource` **只服务于 SPEECH 场景**，不改动、
不接管 DEV-027 已经解决的 BGM/SFX/AMBIENCE 路径。

---

## 2. 架构设计（Commander 已核对既有代码与 Dev Spec 相关章节后做出的决策）

### 2.1 四级决策链——纯函数 + 可注入判定端口

```typescript
export type AudioResolutionSource = 'PREGENERATED' | 'CACHE' | 'RUNTIME_TTS' | 'SUBTITLE_ONLY';

export interface AudioResolutionRequest {
  contentId: string;    // 通常是 NarrativeBlock id
  text: string;         // 待发声的叙事文本（CACHE key 与 TTS 输入都需要）
  voiceId: string;
  voiceSettings: Record<string, number | string>;
}

export interface AudioResolutionResult {
  source: AudioResolutionSource;
  file?: string;   // PREGENERATED/CACHE 命中时的文件路径
}

export interface AudioResolutionPorts {
  findPregenerated(request: AudioResolutionRequest): string | undefined;
  findCached(request: AudioResolutionRequest): string | undefined;
  hasTtsProvider(request: AudioResolutionRequest): boolean;
}

export function resolveAudioSource(
  request: AudioResolutionRequest,
  ports: AudioResolutionPorts,
): AudioResolutionResult
```

依次尝试 `findPregenerated` → `findCached` → `hasTtsProvider`（真则
`source:'RUNTIME_TTS'`，无 `file`，实际调用 TTS 是 DEV-034/035 的职责，本节点
只做决策不做调用）→ 都不行则 `source:'SUBTITLE_ONLY'`。纯函数，无 IO，无副作用。

### 2.2 默认 Ports——如实反映"现在什么都没有"

```typescript
export const noopAudioResolutionPorts: AudioResolutionPorts = {
  findPregenerated: () => undefined,
  findCached: () => undefined,
  hasTtsProvider: () => false,
};
```

DEV-034（TTS Provider）落地后，未来节点只需要构造一个新的
`AudioResolutionPorts`（`hasTtsProvider` 返回 `true`）传给 `resolveAudioSource`
——**不需要修改 `resolveAudioSource` 本身**，也不需要对它发 CR。这是本节点选择
"决策逻辑 + 注入判定"而不是"决策逻辑硬编码當前系统状态"的原因：让后续节点通过
组合新 Port 实现自然接入，而不是回来改这个函数。

### 2.3 CR-019（`getHealth`）在本节点不适用

`audio-engine` 本节点交付的是纯决策函数 + 全部返回"不可用"的默认 Port，没有任何
真实 IO（不连数据库、不发网络请求）——跟 `chapter-schema`（DEV-001 已确立）、
`dice-engine`（DEV-005 已确立）同一类"纯函数库无运行时服务"，`CR-019` 不适用。
等 DEV-034/036 真正接入 TTS/缓存 IO 时，`getHealth()` 才有意义，记入
`DECISIONS.md`，不在本节点新建。

### 2.4 不依赖 `chapter-schema`

`AudioResolutionRequest` 故意用通用字段（`contentId`/`text`/`voiceId`/
`voiceSettings`），不直接 import `chapter-schema` 的 `NarrativeBlock`/`AudioAsset`
类型——本节点的决策链是"任何需要发声的文本"这一层通用逻辑，不应该反过来依赖章节
数据的具体形状。未来接入点（DEV-035 等）自己负责把 `NarrativeBlock` 映射成
`AudioResolutionRequest`。这个决策记入 `DECISIONS.md`。

### 2.5 拼接听感验证——本节点不做，不是遗漏

`DAG.md`："DEV-030/033 阶段必须做一次块拼接听感原型（十余条真实块试听）。"这需要
真实的 TTS 输出音频，而 DEV-034（TTS Provider Interface）**还没有建**，此刻没有
任何真实语音可供试听。这项验证的执行时机实际上是"DEV-034/035 把 RUNTIME_TTS
真正接上之后"，本节点只是把决策链定义好，不代表试听工作现在就能做。如实记入
`DECISIONS.md` 的 Non-goals，不假装完成了一项目前不可能完成的验证。

---

## 3. Scope

### Writable Scope — 新建包

```
packages/audio-engine/package.json
packages/audio-engine/tsconfig.json
packages/audio-engine/src/resolveAudioSource.ts
packages/audio-engine/src/resolveAudioSource.test.ts
packages/audio-engine/src/index.ts
```

### Writable Scope — 根配置（追加式）

```
根 tsconfig.json（追加 packages/audio-engine 的 solution 级 reference，不改动既有条目）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-030/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/chapter-schema/**、packages/chapter-compiler/**、packages/rule-engine/**、
  packages/dice-engine/**、packages/narrative-composer/**、packages/runtime-kernel/**、
  packages/persistence/**、packages/shared/**
apps/renderer/**（本节点不涉及 Renderer，全部只读）
eslint.config.js、.prettierrc.json、vitest.config.ts、根 package.json、tsconfig.base.json
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
```

### Forbidden Scope

```
packages/* 除新建的 audio-engine 外的任何目录
apps/**（本节点不改 Renderer）
接入任何真实 TTS Provider/HTTP 调用（DEV-034/035 的职责）
接入任何真实缓存/数据库（DEV-036/持久化 的职责）
实现 PREGENERATED 目录扫描/预生成产物读取（DEV-074，M7）
把 `resolveAudioSource` 接入 `runtime-kernel` 的任何 action（本节点是纯定义，接入
  是未来 M3 节点的职责，未定具体是哪一个）
新增任何 npm 依赖
新建 `getHealth()`（第 2.3 节已说明理由）
```

---

## 4. Required Skills

### Required

- 纯函数式的多级 fallback 决策逻辑设计
- 依赖注入模式（Ports，DEV-009 已确立的项目惯例）

### Forbidden / Unnecessary

- 任何 TTS SDK/HTTP 客户端库
- 任何缓存/数据库库
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| Dev Spec 第 30 节（TTS Streaming）、第 51 节（Audio Cache Key 组成） | 理解 CACHE/RUNTIME_TTS 两级未来实现方向（本节点不实现，仅设计决策链形状） |
| `DAG.md` CR-018 | 四级解析链权威定义 |
| `packages/chapter-schema/src/audio.ts`（Read-only 引用） | 确认 BGM/SFX/AMBIENCE 已由 DEV-027 完整处理，不在本节点范围 |

---

## 6. Outputs

1. `resolveAudioSource`/`AudioResolutionRequest`/`AudioResolutionResult`/
   `AudioResolutionPorts`/`AudioResolutionSource`（`resolveAudioSource.ts`）
2. `noopAudioResolutionPorts`
3. `specs/dev/DEV-030/DECISIONS.md`，记录：为何不依赖 `chapter-schema`、为何本节点
   不适用 `CR-019`、拼接听感验证为何不在本节点做、未来节点如何接入（组合新 Port，
   不需要 CR）

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-030/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Acceptance**：四文件存在；`INDEX.md` 含 Task Order T001–T004。

---

### T002 — 新包脚手架

- **Allowed Files**：`packages/audio-engine/package.json`、`tsconfig.json`、根 `tsconfig.json`（仅追加 reference）
- **Requirements**：
  1. `package.json`：`name: "@interactive-story/audio-engine"`，`dependencies` 为空
     （第 2.4 节已说明理由，不依赖 `chapter-schema`）。
  2. `tsconfig.json`：沿用其余纯函数包（如 `dice-engine`）一致的 `composite`
     结构。
- **Acceptance**：`pnpm install` 成功；新包被 workspace 正确识别。

---

### T003 — `resolveAudioSource`

- **Allowed Files**：`packages/audio-engine/src/resolveAudioSource.ts`、`.test.ts`
- **Requirements**：按第 2.1/2.2 节实现。
- **Acceptance**：
  - 全部默认 Port（`noopAudioResolutionPorts`）下任意请求都得到
    `{source:'SUBTITLE_ONLY'}`。
  - 手写四种注入组合分别验证：`findPregenerated` 命中 → `PREGENERATED`+`file`；
    未命中但 `findCached` 命中 → `CACHE`+`file`；两者未命中但
    `hasTtsProvider` 为真 → `RUNTIME_TTS`（无 `file`）；三者皆否 →
    `SUBTITLE_ONLY`。
  - 验证优先级顺序：`findPregenerated` 命中时即使 `findCached`/`hasTtsProvider`
    也会命中，仍然优先选 `PREGENERATED`（顺着链条第一个命中就停，不做"最优选择"）。

---

### T004 — `index.ts` 导出 + 全量验证、REPORT 与 commit

- **Allowed Files**：`packages/audio-engine/src/index.ts`、`specs/dev/DEV-030/INDEX.md`、`REPORT.md`、`DECISIONS.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-030.md`
- **Requirements**：
  1. `index.ts` 导出 T003 全部公开符号。
  2. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  3. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  4. **`DECISIONS.md` 必须已提交**，覆盖第 6 节列出的全部要点。
  5. 更新 `INDEX.md`：T001–T004 全部勾选，**且把文件顶部的 `Status:` 一行从
     `IN_PROGRESS` 改为 `READY_FOR_REVIEW`**。
  6. `git add -A && git commit`，提交信息首行：`DEV-030: audio manifest`。
  7. 追加 LEDGER 行，发 `NODE_REPORT`。
  8. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`REPORT.md` 引用的全部文档已入库；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-030 INDEX

Status: IN_PROGRESS

## Current Node

DEV-030 — Audio Manifest

## Objective

首次创建 `packages/audio-engine`，定义全系统统一音频解析链（`PREGENERATED → CACHE
→ RUNTIME_TTS → SUBTITLE_ONLY`，CR-018）：纯函数 + 可注入判定端口，默认端口全部
返回"不可用"（如实反映当前无预生成/无缓存/无 TTS Provider），未来节点通过注入真实
Port 实现接入，不需要对本函数发 CR。只服务于 SPEECH（叙事旁白），BGM/SFX/AMBIENCE
已由 DEV-027 完整处理。

## Allowed Scope（新建包 + 根配置追加）
（抄录 Task Package 第 3 节实际条目）

## Read-only Scope
（抄录 Task Package 第 3 节实际条目）

## Forbidden Scope
（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 新包脚手架
- [ ] T003 resolveAudioSource
- [ ] T004 index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001（每完成一个 Task 立即勾选并更新本字段）

## Exit Criteria

六条命令全部退出码 0；四级 fallback 全部路径与优先级顺序测试通过；`DECISIONS.md`
已入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **不接入任何真实 TTS/缓存/预生成读取**——全部走注入的默认"不可用"Port。
2. **不依赖 `chapter-schema`**（第 2.4 节已说明理由）。
3. **不新建 `getHealth()`**（第 2.3 节已说明理由）。
4. **不把 `resolveAudioSource` 接入 `runtime-kernel`**——本节点只定义，不接线。
5. **不新增任何 npm 依赖**。
6. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
7. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现 TTS Provider 调用（DEV-034）。
- 不实现 Result TTS 兜底路径的真实 HTTP Streaming（DEV-035）。
- 不实现 Audio Cache 的真实存储（DEV-036）。
- 不实现 PREGENERATED 音频目录扫描（DEV-074，M7）。
- 不做拼接听感原型验证（第 2.5 节已说明理由，需要真实 TTS 输出，现在没有）。
- 不把决策链接入 `runtime-kernel` 的任何 action。
- 不处理 BGM/SFX/AMBIENCE（DEV-027 已完整处理，不重复）。

---

## 11. Tests

### Unit tests

T003：覆盖第 7 节描述的全部 fallback 路径与优先级顺序。

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
| A07 | 全默认 Port 时任意请求得到 `SUBTITLE_ONLY` | 测试检查 |
| A08 | 四种注入组合分别得到正确的 `source`/`file` | 测试检查 |
| A09 | 优先级顺序正确（先命中先用，不做"最优选择"） | 测试检查 |
| A10 | `packages/audio-engine` 无 `chapter-schema` 依赖 | 文件检查 |
| A11 | 未新建 `getHealth()` | 文件检查 |
| A12 | 未接入任何真实 IO（TTS/缓存/文件系统扫描） | 代码检查 |
| A13 | `packages/**`（除新建 `audio-engine` 外）全部未被修改 | git diff 比对 |
| A14 | `apps/renderer/**` 未被修改 | git diff 比对 |
| A15 | 未新增任何 npm 依赖 | 文件检查 |
| A16 | 根 `tsconfig.json` 仅新增一条 reference | git diff 比对 |
| A17 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A18 | `specs/dev/DEV-030/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T004 全部勾选，`Status:` 表头改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A19 | `git log` 新增恰 1 条提交，首行 `DEV-030: audio manifest`；提交时 `git status --porcelain` 为空 | 命令 |
| A20 | LEDGER 含 `NODE_REPORT-DEV-030` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A21 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT（含确认 `DECISIONS.md` 已提交）→ commit → 发 NODE_REPORT → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A21。
