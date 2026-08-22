# TASK PACKAGE — DEV-031

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-031 |
| Node Name | Master Audio Player |
| Milestone | M3 — Audio Complete（第二个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-030（DONE，`verdict_ref: "0140"`）——本节点是 DEV-030 `resolveAudioSource` 决策链的首个真实消费者 |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### 范围现实核对：Dev Spec 第 28 节 "Master Audio" 四类内容目前均无叙事发射点

已通读 `specs/baseline/DEV_SPEC_V1.0.md` 第 27/28/29 节与 `packages/runtime-kernel/src/machine.ts`
全文。第 28 节列出的 Master Audio 内容（Chapter Intro / 关键剧情 / NPC 关键对白 /
Boss 登场 / Boss 核心对白 / 情绪高潮 / Ending）**没有任何一类在当前冻结的
`machine.ts` 里有对应的叙事文本发射代码**——`onChapterEnd`（`storyRegion.ts` →
`machine.ts:277`）不发送任何 presentation 命令；Boss/Ending 的
`narrationBlockIds`（`chapter-schema/boss.ts`/`endings.ts`）目前从未被任何运行时
代码读取过。现在去"实现"这些类别的音频播放，必须先发明一套目前完全不存在、
Dev Spec 也未定义细节的"结局/Boss 叙事选择与发射"逻辑——这是为假设中的未来
需求设计，违反 Commander 章程。

真正已经端到端产出真实文本、并已经在下发 presentation 命令的叙事路径只有一条：
**Result 叙事**（Dev Spec 第 29 节 "Runtime Result Audio"：Rule Result → Narrative
Composer → Complete Text → \[signature\] → Audio Cache → PLAY/TTS），对应
`machine.ts` 的 `onResolve`（计算 `narrationText`）+ `onResultPlaying`（下发
`RESULT_PLAYING { text }`，`machine.ts:266`）。**本节点把 DEV-030 的
`resolveAudioSource` 接到这一条真实存在的路径上**——这同时是"把决策链接入
Runtime"这件事第一次真正发生，其余叙事发射点（Chapter Intro/Boss/Ending）等它们
自己的叙事选择逻辑出现时，各自重复本节点建立的同一种接入模式（读取
`ports.audioResolution` → 调 `resolveAudioSource` → 把结果放进对应 presentation
命令），不需要对 `resolveAudioSource` 本身发 CR。

---

## 2. 架构设计（Commander 已核对既有代码后做出的决策）

### 2.1 新增纯函数 `resolveResultAudio`（`packages/runtime-kernel/src/resultAudioResolution.ts`）

```typescript
import type { ResolveResult } from '@interactive-story/rule-engine';
import type { AudioResolutionPorts, AudioResolutionResult } from '@interactive-story/audio-engine';
import { resolveAudioSource } from '@interactive-story/audio-engine';

export function resolveResultAudio(
  resolved: ResolveResult[],
  text: string,
  ports: AudioResolutionPorts,
): AudioResolutionResult | undefined
```

- `resolved.length === 0` 或 `text === ''`（无叙事可读）→ 返回 `undefined`，不调用
  `resolveAudioSource`——没有文本时讨论"用什么声音念它"没有意义。
- 否则构造 `contentId = resolved.map(r => r.narrativeId).join('+')`：
  **保持 `resolved` 原有顺序，不排序**。理由：`composeResultSetNarration`
  按这个数组顺序拼接出最终文本，顺序不同文本就不同（例如 A+B 与 B+A 是两段不同的
  合成叙事），因此 `contentId` 必须反映"这个顺序的这个组合"，排序会把两个不同的
  合成文本错误地映射到同一个缓存 key。
- `voiceId` 固定传 `'narrator-default'`，`voiceSettings` 固定传 `{}`——见 2.2。
- 调用 `resolveAudioSource(request, ports)` 并原样返回其结果（不裁剪、不改写）。

### 2.2 `voiceId`/`voiceSettings` 是有意的占位符，不是遗漏

`composeResultSetNarration`（DEV-033，已冻结）把一次交互里所有命中的
`ResultNarrative` 拼接成**一段**文本，本身就已经不区分"这句话是谁说的"。在
没有逐句拆分/多角色配音这套机制之前，给整段合成文本指定单一 `voiceId`
是当前架构下唯一自洽的做法——引入逐句配音需要先重新设计
`composeResultSetNarration` 的输出形状（多段而非单一字符串），这是一次独立的、
更大的架构变更，不属于本节点范围。`narrator-default` 只是一个占位符
`voiceId`（当前没有任何真实语音配置消费它），供未来 DEV-034（TTS Provider
Interface）或语音选角相关节点替换成真实值。**这个占位符将来若要变成"每个角色
一个声音"，需要对本节点的 `onResolve`/`resultAudioResolution.ts` 重新发 CR
——这是预期中的、诚实记录的未来重开，不是本节点的设计缺陷**（记入
`DECISIONS.md` Future Consideration，不写"以后不用改"这种不实的话）。

### 2.3 `Ports` 新增字段 `audioResolution`（追加式，向后兼容）

`packages/runtime-kernel/src/ports.ts` 追加：

```typescript
import type { AudioResolutionPorts } from '@interactive-story/audio-engine';
import { noopAudioResolutionPorts } from '@interactive-story/audio-engine';

export interface Ports {
  clock: ClockPort;
  platform: PlatformPort;
  presentation: PresentationPort;
  audio: AudioPort;
  audioResolution: AudioResolutionPorts;   // 新增
}

export const defaultPorts: Ports = {
  clock: systemClockPort,
  platform: noopPlatformPort,
  presentation: noopPresentationPort,
  audio: noopAudioPort,
  audioResolution: noopAudioResolutionPorts,   // 新增
};
```

`createRuntimeMachine`/`createSimulatorMachine` 现有的
`{ ...defaultPorts, ...(input.ports ?? {}) }` 合并逻辑（`machine.ts:147`/`476`）
不需要改动——`input.ports` 类型是 `Partial<Ports>`，不传 `audioResolution` 时
自动落到 `defaultPorts.audioResolution`（即 `noopAudioResolutionPorts`，如实反映
"现在没有任何真实 Port 组合"）。`virtualPorts.ts`（DEV-007/011 用）同理不受影响
——它从未构造完整 `Ports` 字面量，只提供 `clock`/`platform` 两个覆盖项。

**明确不动**：`AudioPort`/`noopAudioPort`/`ports.ts` 里已有的 `audio` 字段——那是
DEV-027 刻意留空、留给 DEV-032（声道仲裁）接管的独立通道，与本节点的
`audioResolution`（Result 叙事的音频来源决策）是两回事，互不影响。

### 2.4 两处 CR：`onResolve` 计算 + `onResultPlaying` 下发（precedent: DEV-025 两处 CR）

`context` 类型（`machine.ts:39` 附近）追加 `resultAudio: AudioResolutionResult | undefined;`；
初始 context（`machine.ts:170` 附近）追加 `resultAudio: undefined,`。

`onResolve`（`machine.ts:321-369`）在算出 `narrationText` 之后追加一行：

```typescript
const resultAudio = resolveResultAudio(outcome.resolved, narrationText, context.ports.audioResolution);
```

并把 `resultAudio` 一并放进该 action 返回的对象里（与 `narrationText` 同级）。

`onResultPlaying`（`machine.ts:266`）：

```typescript
// 改前
context.ports.presentation.send({ kind: 'RESULT_PLAYING', text: context.narrationText });
// 改后
context.ports.presentation.send({
  kind: 'RESULT_PLAYING',
  text: context.narrationText,
  audio: context.resultAudio,
});
```

其余全部 action（STORY 的其它转移、PRESENTATION/AUDIO/INTERACTION 骨架 action、
`onSceneEnter`、`onOpen`、`onLock` 等历次 CR 遗留代码）**逐字节不动**。

### 2.5 `presentationCommand.ts` 的 `foldState` 不需要改

`SCENE_ENTER` 历次 CR（`layers`/`characters`/`narration`/`cameraPreset`/`audio`）
与 `RESULT_PLAYING` 现有的 `text` 字段均未被 `foldState`（`presentationCommand.ts`）
纳入 RESYNC 快照——`foldState` 只关心 `currentSceneId`/`lastResultText` 这类
"我在哪个阶段"的最小状态，不缓存完整演出载荷（断线重连后由新的
`SCENE_ENTER`/`RESULT_PLAYING` 重新下发）。新增的 `audio` 字段遵循同一先例，
**不修改 `presentationCommand.ts`**。

### 2.6 Renderer：新增 `pickResultAudio` + `<audio>` 一次性播放元素

`apps/renderer/src/render/pickResultAudio.ts`（仿 `pickSceneAudio.ts` 写法）：
从命令流里取最近一条 `RESULT_PLAYING` 的 `audio` 字段，防御性校验后返回
`{ source: string; file？: string } | undefined`（字段非法/缺失一律返回
`undefined`，不抛异常）。

`App.tsx` 追加（不改动任何既有行）：当 `pickResultAudio(commands)` 返回的
`source` 是 `'PREGENERATED'` 或 `'CACHE'` 且 `file` 是字符串时，渲染一个
`<audio autoPlay src={file} key={...} />`（**不 loop**——这是一次性叙事播报，
不是 BGM）；`key` 复用已有的 `dialogue.key`（`pickDialogueLines` 已经把"新
`RESULT_PLAYING` 到达"这件事编码进这个 key，不需要发明新的 key 机制）拼接
`file` 本身，保证同一 key 值变化时 React 重新挂载元素、重新播放。
`RUNTIME_TTS`/`SUBTITLE_ONLY`/`undefined` 三种情况**不渲染任何音频元素**——字幕
已经由 DEV-023 的对话框渲染，`RUNTIME_TTS` 的实际播放调用是 DEV-034/035 的职责。

`apps/renderer` 不需要新增任何 workspace 依赖——`AudioResolutionResult` 类型
经由 `packages/runtime-kernel/src/index.ts` 追加导出（透传自
`@interactive-story/audio-engine`），Renderer 继续只依赖
`@interactive-story/runtime-kernel`。

---

## 3. Scope

### Writable Scope

```
packages/runtime-kernel/package.json                         （追加一行 dependency）
packages/runtime-kernel/tsconfig.json                        （追加一行 reference）
packages/runtime-kernel/src/ports.ts                         （追加 audioResolution 字段 + import + defaultPorts 一行）
packages/runtime-kernel/src/ports.test.ts                    （追加/更新 defaultPorts 断言）
packages/runtime-kernel/src/resultAudioResolution.ts         （新增）
packages/runtime-kernel/src/resultAudioResolution.test.ts    （新增）
packages/runtime-kernel/src/machine.ts                       （仅 onResolve + onResultPlaying 两处 + context 类型/初始值）
packages/runtime-kernel/src/machine.test.ts                  （追加集成测试用例，不改既有用例断言）
packages/runtime-kernel/src/index.ts                         （追加导出）
apps/renderer/src/render/pickResultAudio.ts                  （新增）
apps/renderer/src/render/pickResultAudio.test.ts             （新增）
apps/renderer/src/App.tsx                                    （仅追加渲染 RESULT audio 元素，不改既有 JSX）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-031/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/audio-engine/**（已冻结，DEV-030 交付物，不得改动 resolveAudioSource 本身）
packages/chapter-schema/**、packages/chapter-compiler/**、packages/rule-engine/**、
  packages/dice-engine/**、packages/narrative-composer/**、packages/persistence/**、
  packages/shared/**
packages/runtime-kernel/src 内除上面列出文件外的一切（含 audioRegion.ts、
  audioResolution.ts、presentationCommand.ts、visualResolution.ts、
  characterResolution.ts、choiceResolution.ts、cameraResolution.ts、
  interactionRegion.ts、storyRegion.ts、virtualPorts.ts、simulator.ts、replay.ts 等）
apps/renderer/src 内除 pickResultAudio.ts(.test.ts)/App.tsx 外的一切
eslint.config.js、.prettierrc.json、vitest.config.ts、根 package.json、tsconfig.base.json、根 tsconfig.json
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
```

### Forbidden Scope

```
修改 packages/audio-engine/** 任何文件（含 resolveAudioSource.ts 本身）
修改 machine.ts 中 onResolve / onResultPlaying 之外的任何 action
接入 AUDIO region（audioRegion.ts）/ Ports.audio（DEV-032 的职责）
实现 Chapter Intro / Boss / Ending 类 Master Audio 的叙事选择与发射逻辑（第 1 节
  已说明：无现成叙事发射点，需要发明新逻辑，超出范围）
实现真实 TTS 调用、真实缓存查找、真实预生成目录扫描（DEV-034/035/036/074 的职责）
实现"逐句/多角色配音"（第 2.2 节已说明：需要重新设计 narrative-composer 输出形状，
  独立的更大变更）
新增除 audio-engine 外的任何 npm 依赖
新建 getHealth()
```

---

## 4. Required Skills

### Required

- 纯函数扩展设计（在已冻结函数之外新增一层，不修改被依赖的冻结函数）
- 依赖注入模式（`Ports`，DEV-009 已确立的项目惯例）
- XState v5 两处窄范围 action 修改（precedent: DEV-025）

### Forbidden / Unnecessary

- 任何 TTS SDK/HTTP 客户端库
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `packages/audio-engine/src/resolveAudioSource.ts`（Read-only，DEV-030 冻结） | 本节点唯一调用、不修改的决策函数 |
| `packages/runtime-kernel/src/machine.ts:262-369` | `onResolve`/`onResultPlaying` 两处 CR 的精确锚点 |
| `packages/runtime-kernel/src/ports.ts` | `Ports`/`defaultPorts` 追加字段的锚点 |
| `packages/rule-engine/src/actionResolve.ts`（`ResolveResult` 类型，Read-only） | `resolveResultAudio` 的输入类型 |
| `apps/renderer/src/render/pickSceneAudio.ts`、`pickDialogueLines.ts`（Read-only参考写法） | `pickResultAudio.ts` 与 `<audio>` key 复用的样式参照 |
| Dev Spec 第 27/28/29 节 | Master Audio 分类定义与范围现实核对（第 1 节） |

---

## 6. Outputs

1. `packages/runtime-kernel/src/resultAudioResolution.ts` 导出 `resolveResultAudio`
2. `Ports.audioResolution: AudioResolutionPorts`（追加字段），`defaultPorts.audioResolution = noopAudioResolutionPorts`
3. `machine.ts`：`RESULT_PLAYING` presentation 命令新增 `audio?: AudioResolutionResult` 字段
4. `packages/runtime-kernel/src/index.ts` 追加导出 `resolveResultAudio` 与透传的
   `AudioResolutionResult`/`AudioResolutionSource` 类型
5. `apps/renderer/src/render/pickResultAudio.ts` 导出 `pickResultAudio`
6. `specs/dev/DEV-031/DECISIONS.md`，至少覆盖：contentId 保序不排序的理由（2.1）、
   `voiceId`/`voiceSettings` 占位符定位与未来重开边界（2.2）、`Ports.audioResolution`
   与既有 `Ports.audio` 的区别（2.3）、两处 CR 的必要性（2.4）、为何不实现 Master
   Audio 四类内容（第 1 节）、`CR-019` 不适用的理由

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-031/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Acceptance**：四文件存在；`INDEX.md` 含 Task Order T001–T006。

---

### T002 — `runtime-kernel` 依赖声明 + `Ports` 追加字段

- **Allowed Files**：`packages/runtime-kernel/package.json`、`tsconfig.json`、`src/ports.ts`、`src/ports.test.ts`
- **Requirements**：
  1. `package.json` 追加 `"@interactive-story/audio-engine": "workspace:*"`。
  2. `tsconfig.json` 的 `references` 追加 `{ "path": "../audio-engine" }`，不改动既有 5 条。
  3. `ports.ts` 按第 2.3 节追加 `audioResolution` 字段与 `defaultPorts` 对应值，`AudioPort`/`noopAudioPort` 不动。
  4. `ports.test.ts` 的"defaultPorts bundles all four ports"用例更新为覆盖五个端口。
- **Acceptance**：`pnpm install` 成功；`pnpm typecheck` 通过（确认新依赖被正确解析）。

---

### T003 — `resolveResultAudio`

- **Allowed Files**：`packages/runtime-kernel/src/resultAudioResolution.ts`、`.test.ts`
- **Requirements**：按第 2.1/2.2 节实现。
- **Acceptance**：
  - 空 `resolved` 数组 → `undefined`。
  - 非空 `resolved` 但 `text === ''` → `undefined`。
  - 非空 `resolved` + `text` 非空 + 全默认（noop）Ports → `{source:'SUBTITLE_ONLY'}`。
  - `contentId` 按 `resolved` 原有顺序拼接、不排序：用能感知 `contentId` 具体值的自定义
    Port（例如 `findPregenerated` 只在 `request.contentId === 'a+b'` 时命中）证明
    `resolved = [{narrativeId:'a',...}, {narrativeId:'b',...}]` 产出的 `contentId`
    是 `'a+b'` 而非 `'b+a'` 或排序后的结果。
  - 自定义 Port 命中 `findPregenerated` 时，返回值透传 `resolveAudioSource` 的原始结果
    （`source`/`file` 均正确）。

---

### T004 — `machine.ts` 两处 CR + 集成测试

- **Allowed Files**：`packages/runtime-kernel/src/machine.ts`、`machine.test.ts`
- **Requirements**：按第 2.4 节精确实现两处改动，context 类型与初始值同步追加。
- **Acceptance**：
  - 复用/参照既有 `runs the full chain` 用例风格，新增用例验证：默认 Ports 跑完整条
    链路后，`RESULT_PLAYING` 命令携带 `audio: {source:'SUBTITLE_ONLY'}`（当且仅当
    该场景的 `narrationText` 非空——先确认 fixture 是否产出非空叙事文本，如实记录）。
  - 新增用例：注入自定义 `ports.audioResolution`（例如 `findPregenerated` 恒定命中
    某文件）跑完整条链路，验证 `RESULT_PLAYING` 命令的 `audio` 字段确实反映注入的
    Port 结果（证明接线是真实生效的，不是死代码）。
  - 既有全部用例（含 `runs the full chain`、`DICE.*` 相关用例等）零回归。

---

### T005 — `index.ts` 追加导出 + Renderer `pickResultAudio` + `App.tsx`

- **Allowed Files**：`packages/runtime-kernel/src/index.ts`、`apps/renderer/src/render/pickResultAudio.ts`、`.test.ts`、`apps/renderer/src/App.tsx`
- **Requirements**：按第 2.4/2.6 节实现。
- **Acceptance**：
  - `pickResultAudio` 单测覆盖：无 `RESULT_PLAYING` 命令 → `undefined`；有但无
    `audio` 字段 → `undefined`；`audio` 字段非法形状（如 `source` 非字符串）→
    `undefined`（防御性，不抛异常）；合法 `PREGENERATED`/`CACHE`（带 `file`）与
    `RUNTIME_TTS`/`SUBTITLE_ONLY`（不带 `file`）均正确透传。
  - `App.tsx` 改动通过 `pnpm typecheck`/`pnpm build`/`pnpm lint`；不改动任何既有 JSX 行。

---

### T006 — 全量验证、REPORT 与 commit

- **Allowed Files**：`specs/dev/DEV-031/INDEX.md`、`REPORT.md`、`DECISIONS.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-031.md`
- **Requirements**：
  1. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  2. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  3. **`DECISIONS.md` 必须已提交**，覆盖第 6 节列出的全部要点。
  4. 更新 `INDEX.md`：T001–T006 全部勾选，`Status:` 从 `IN_PROGRESS` 改为 `READY_FOR_REVIEW`。
  5. `git add -A && git commit`，提交信息首行：`DEV-031: master audio player`。
  6. 追加 LEDGER 行，发 `NODE_REPORT`。
  7. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-031 INDEX

Status: IN_PROGRESS

## Current Node

DEV-031 — Master Audio Player

## Objective

把 DEV-030 冻结的 `resolveAudioSource` 四级解析链接入 Runtime 中唯一已经端到端
产出真实叙事文本的路径——Result 叙事（`onResolve` 计算 + `onResultPlaying` 下发）。
新增 `Ports.audioResolution`（追加式）、`resolveResultAudio` 纯函数、Renderer 端
`pickResultAudio` 与一次性播放的 `<audio>` 元素。当前默认 Port 仍全部"不可用"，
如实产出 `SUBTITLE_ONLY`——这是正确的当前行为。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 runtime-kernel 依赖声明 + Ports 追加字段
- [ ] T003 resolveResultAudio
- [ ] T004 machine.ts 两处 CR + 集成测试
- [ ] T005 index.ts 导出 + Renderer pickResultAudio + App.tsx
- [ ] T006 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001（每完成一个 Task 立即勾选并更新本字段）

## Exit Criteria

六条命令全部退出码 0；`resolveResultAudio` 全部路径测试通过；机器级集成测试证明
默认与注入两种场景均正确；`DECISIONS.md` 已入库；REPORT.md 完成且 Status =
READY_FOR_REVIEW；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **不改动 `packages/audio-engine/**` 任何文件**——`resolveAudioSource` 是已冻结
   的消费对象，不是修改对象。
2. **`machine.ts` 只改 `onResolve` 与 `onResultPlaying` 两处**，其余 action 逐字节不动。
3. **不接入 AUDIO region / `Ports.audio`**（DEV-032 的职责，二者刻意保持独立）。
4. **不实现 Chapter Intro/Boss/Ending 类内容**（第 1 节已说明理由）。
5. **不新增除 `audio-engine` 外的任何 npm 依赖**。
6. **不新建 `getHealth()`**（纯函数扩展，无新增真实 IO，`CR-019` 不适用，同 DEV-030 先例）。
7. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
8. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现 Chapter Intro / Boss 登场 / Boss 核心对白 / 情绪高潮 / Ending 的音频播放
  （无现成叙事发射点，见第 1 节）。
- 不实现真实 TTS 调用（DEV-034/035）、真实缓存查找（DEV-036）、真实预生成目录扫描
  （DEV-074，M7）。
- 不实现逐句/多角色配音（第 2.2 节；需要重新设计 `narrative-composer` 输出形状）。
- 不接入 AUDIO region 声道仲裁（DEV-032）。
- 不做拼接听感原型验证（同 DEV-030 D3 理由，仍然没有真实 TTS 输出）。

---

## 11. Tests

### Unit tests

T003（`resolveResultAudio` 全部路径）、T005（`pickResultAudio` 防御性映射全部路径）。

### Integration tests

T004（机器级：默认 Ports 与注入 Ports 两种场景下 `RESULT_PLAYING.audio` 的真实值）。

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
| A07 | `resolveResultAudio([], anyText, noop)` → `undefined` | 测试检查 |
| A08 | `resolveResultAudio(nonEmpty, '', noop)` → `undefined` | 测试检查 |
| A09 | `resolveResultAudio(nonEmpty, text, noop)` → `{source:'SUBTITLE_ONLY'}` | 测试检查 |
| A10 | `contentId` 按 `resolved` 原顺序拼接、不排序 | 测试检查（自定义 Port 感知具体 contentId 值） |
| A11 | `Ports.audioResolution` 为追加字段，`defaultPorts.audioResolution === noopAudioResolutionPorts` | 代码检查 + `ports.test.ts` |
| A12 | 端到端默认 Ports：`RESULT_PLAYING` 携带 `audio` 字段且值为诚实的 `SUBTITLE_ONLY`（或 `undefined`，取决于 fixture 是否产出非空叙事） | 集成测试 |
| A13 | 端到端注入 `ports.audioResolution`：`RESULT_PLAYING.audio` 正确反映注入结果 | 集成测试 |
| A14 | `machine.ts` 中 `onResolve`/`onResultPlaying` 之外的全部 action 逐字节未变 | git diff 比对 |
| A15 | `Ports.audio`/`noopAudioPort`/`audioRegion.ts`/`packages/audio-engine/**`（DEV-027/DEV-030 冻结）未被修改 | git diff 比对 |
| A16 | `pickResultAudio` 对缺失/非法 `audio` 字段防御性返回 `undefined`，不抛异常 | 测试检查 |
| A17 | `apps/renderer` 未新增任何 workspace 依赖 | 文件检查（`package.json` 无 diff） |
| A18 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A19 | `specs/dev/DEV-031/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T006 全部勾选，`Status:` 表头改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A20 | `git log` 新增恰 1 条提交，首行 `DEV-031: master audio player`；提交时 `git status --porcelain` 为空 | 命令 |
| A21 | LEDGER 含 `NODE_REPORT-DEV-031` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A22 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT（含确认
`DECISIONS.md` 已提交）→ commit → 发 NODE_REPORT → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A22。
