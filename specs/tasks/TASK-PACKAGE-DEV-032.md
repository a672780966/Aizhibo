# TASK PACKAGE — DEV-032

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-032 |
| Node Name | Audio State Region |
| Milestone | M3 — Audio Complete（第三个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-031（DONE，`verdict_ref: "0144"`）——本节点消费 DEV-031 在 `context.resultAudio` 里计算好的值 |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### 现状核对：AUDIO region 自 DEV-009 起一直是"只能手动驱动"的骨架

`packages/runtime-kernel/src/audioRegion.ts`（CR-005 六态：`IDLE/PREPARING/
PLAYING_STORY/PLAYING_HOST/DUCKED/ERROR`）自 DEV-009 冻结以来，`AUDIO.PREPARE`/
`AUDIO.READY`/`AUDIO.STOP` 等事件**只在测试里被手动 `actor.send(...)` 触发**——
STORY/INTERACTION 等其余 region 从未真正驱动过它，`DAG.md` CR-005 表格里写的
"声道占用仲裁"从未真的发生过。`DEV-027`（BGM/SFX）明确决定 BGM/环境音走
Presentation 通道、不碰 `Ports.audio`；`DEV-031`（Result 叙事音频决策）也明确
不碰 AUDIO region。本节点是 DAG.md 里第一个、也是唯一被点名"按声道占用建模"的
节点——把 AUDIO region 接上第一个真实触发源。

### 范围现实核对：唯一现存的真实触发源是 Result 叙事（DEV-031 的 `resultAudio`）

`PLAYING_HOST`/`DUCKED` 由 AI Host（M5，`DEV-057` Host TTS / `DEV-038` Audio
Ducking）触发，Host 目前完全不存在（`ai-host` 包尚未创建），这两个状态**没有任何
现实触发源**，继续保持"只能手动到达"（`audioRegion.test.ts` 既有用例已覆盖）。
BGM/环境音（DEV-027）走的是 Presentation 通道、播放不需要互斥仲裁（背景音乐是
常驻环境音，不像"叙事人声 vs Host 人声"那样互斥），从不属于本 region 的职责——
`Ports.audio`/`audioRegion.ts` 建模的"声道"专指**人声播报通道**。因此本节点唯一
能接上的真实信号是 Result 叙事是否产出了需要播放的音频（`context.resultAudio`，
DEV-031 交付），这也是当前系统里唯一一条走到"人声播报"这个概念的真实数据流。

---

## 2. 架构设计（Commander 已核对既有代码后做出的决策）

### 2.1 触发点：STORY region 的两处 `always`/`on` 转移追加第二个 action

`packages/runtime-kernel/src/storyRegion.ts` 现状（不改状态拓扑，只在既有转移的
`actions` 数组里追加一个新 action 名）：

```typescript
// 进入 RESULT_PLAYING 时（RESOLUTION_PENDING 的 always 转移）
RESOLUTION_PENDING: {
  always: { target: 'RESULT_PLAYING', actions: ['onResultPlaying', 'onAudioChannelForResult'] },
},

// 离开 RESULT_PLAYING 时（NARRATIVE.DONE 的两个分支）
RESULT_PLAYING: {
  on: {
    'NARRATIVE.DONE': [
      { guard: 'hasNextScene', target: 'TRANSITION', actions: ['onNextScene', 'onAudioChannelStop'] },
      { target: 'CHAPTER_END', actions: ['onChapterEnd', 'onAudioChannelStop'] },
    ],
  },
},
```

`STORY_PLAYING` 状态自己那条不经过 RESULT_PLAYING 的 `STORY.DONE → CHAPTER_END`
分支（无互动场景直接结束）**不追加任何东西**——那条路径从未产生过 `resultAudio`，
AUDIO region 本来就还在 IDLE，没有什么需要停止。

### 2.2 两个新 action：用 `enqueueActions`/`raise` 跨 region 触发（machine.ts）

```typescript
import { enqueueActions, raise } from 'xstate'; // 追加到既有 xstate import

// 放在 "---- AUDIO (skeleton) ----" 区块，紧跟既有 audioPreparing/audioPlayStory/audioError 之后
onAudioChannelForResult: enqueueActions(({ context, enqueue }) => {
  const audio = context.resultAudio;
  const needsChannel = audio !== undefined && audio.source !== 'SUBTITLE_ONLY';
  if (!needsChannel) return;
  enqueue.raise({ type: 'AUDIO.PREPARE' });
  enqueue.raise({ type: 'AUDIO.READY' });
}),
onAudioChannelStop: enqueueActions(({ enqueue }) => {
  enqueue.raise({ type: 'AUDIO.STOP' });
}),
```

- **门槛条件** `audio.source !== 'SUBTITLE_ONLY'`：`SUBTITLE_ONLY` 意味着根本没有
  音频可播（只有字幕），这种情况下"人声通道"没有被占用，AUDIO region 应保持
  `IDLE`——这不是遗漏，是正确的诚实行为（当前默认 `noopAudioResolutionPorts` 下
  任意请求都是 `SUBTITLE_ONLY`，因此在没有真实 TTS/预生成接入之前，本节点接上的
  这条真实触发路径在生产环境里**观察不到 AUDIO region 离开过 IDLE**——这与
  DEV-030/031 一路建立的"诚实反映现状"先例一致，必须在 `DECISIONS.md` 里明确
  记录，不能被误读为接线失败）。
- **`AUDIO.PREPARE` 后立即 `AUDIO.READY`**：当前没有任何真实异步 TTS/流式调用
  （DEV-034/035 还没建），"准备"这一步没有真实耗时，两个事件在同一次
  `send()` 内被同步处理完（XState 的 raise 队列会在同一个微步批次里耗尽），
  `PREPARING` 状态因此只是一个真实但零耗时的过渡态。**这是有意的、诚实的当前
  行为**：DEV-034/035 真正接入异步 TTS 后，未来节点只需要把 `AUDIO.READY` 的
  raise 挪到真实异步操作 resolve 之后（`AUDIO.FAIL` 同理挪到 reject 之后）——
  这需要对本节点重新发 CR，是预期中的、诚实记录的未来重开（记入
  `DECISIONS.md` Future Consideration，不是本节点的设计缺陷）。
- **`AUDIO.STOP` 无条件发出、不加门槛**：`audioRegion.ts` 的 `IDLE` 状态没有
  `AUDIO.STOP` 处理器，未匹配的事件在 XState 里是安全的空操作——AUDIO region
  本来就还在 `IDLE` 时收到 `AUDIO.STOP` 不会有任何副作用，因此不需要额外判断
  "之前是否真的进了 PLAYING_STORY"，无条件发送更简单也同样正确。

### 2.3 `audioRegion.ts` 本身零改动

六个状态与全部既有转移（含 `AUDIO.DUCK`/`AUDIO.PLAY_HOST`/`AUDIO.FAIL` 等）逐字节
不变——本节点只是从 STORY region 一侧接上两个已经存在的事件名，不改变 AUDIO
region 自己的拓扑。`audioPreparing`/`audioPlayStory`/`audioStop`/`audioError` 等
既有 action（`context.ports.audio.send(...)`）也逐字节不变。

---

## 3. Scope

### Writable Scope

```
packages/runtime-kernel/src/machine.ts          （追加 xstate import + 两个新 action，均在 AUDIO 骨架区块）
packages/runtime-kernel/src/machine.test.ts     （追加集成测试）
packages/runtime-kernel/src/storyRegion.ts      （仅 3 处 actions 数组追加，见 2.1）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-032/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/runtime-kernel/src/audioRegion.ts / audioRegion.test.ts（六态与全部既有转移不得改）
packages/runtime-kernel/src/resultAudioResolution.ts、ports.ts（DEV-030/031 冻结，只读取 context.resultAudio）
packages/audio-engine/**、apps/renderer/**（本节点完全不涉及 Renderer——AUDIO
  region 是内部状态，从不通过 Presentation 命令暴露给客户端）
packages/runtime-kernel/src 内除 machine.ts/machine.test.ts/storyRegion.ts 外的一切
其余同既有节点惯例（chapter-schema/chapter-compiler/rule-engine/dice-engine/
  narrative-composer/persistence/shared，根配置，specs/baseline、audit、protocol，
  specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**）
```

### Forbidden Scope

```
修改 audioRegion.ts 的状态拓扑或既有转移（含 AUDIO.DUCK/AUDIO.PLAY_HOST/AUDIO.FAIL）
实现 PLAYING_HOST/DUCKED 的真实触发（AI Host 不存在，M5 的职责）
触碰 BGM/环境音路径（DEV-027 领域，Ports.presentation 而非 Ports.audio）
修改 Ports.audio 的 send() 载荷形状（AUDIO_PREPARING/AUDIO_PLAY_STORY/AUDIO_STOP 等 kind 不变）
实现真实异步 TTS 等待（DEV-034/035 的职责；本节点的 PREPARE→READY 是同步的，见 2.2）
修改 apps/renderer 任何文件
新增任何 npm 依赖
新建 getHealth()
```

---

## 4. Required Skills

### Required

- XState v5 跨 parallel region 事件触发（`enqueueActions`/`raise`）
- 门槛条件设计（何时"声道被占用"，何时不是）

### Forbidden / Unnecessary

- 任何真实音频/TTS SDK
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `packages/runtime-kernel/src/audioRegion.ts`（Read-only） | 已冻结的六态与事件名，本节点只消费不修改 |
| `packages/runtime-kernel/src/storyRegion.ts` | 三处需要追加 action 名的精确锚点 |
| `packages/runtime-kernel/src/machine.ts`（`context.resultAudio`，DEV-031 交付） | 门槛条件读取的数据源 |
| `specs/baseline/DEV_SPEC_V1.0.md` 第 32/38 节 | AUDIO region 定位、Ducking 由 Host 触发的产品事实 |
| `specs/dev/DAG.md` CR-005 | AUDIO region 六态定义与"声道仲裁"权威描述 |

---

## 6. Outputs

1. `machine.ts` 新增 action `onAudioChannelForResult`/`onAudioChannelStop`
2. `storyRegion.ts` 三处转移的 `actions` 数组各追加一个新 action 名
3. `specs/dev/DEV-032/DECISIONS.md`，至少覆盖：门槛条件为何是
   `source !== 'SUBTITLE_ONLY'`（2.2）、PREPARE→READY 为何同步折叠及未来重开
   边界（2.2）、为何不实现 PLAYING_HOST/DUCKED 真实触发（第 1 节）、为何不碰
   BGM/环境音路径（第 1 节）、`CR-019` 不适用的理由

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-032/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Acceptance**：四文件存在；`INDEX.md` 含 Task Order T001–T003。

---

### T002 — `machine.ts` + `storyRegion.ts` 两处 CR + 集成测试

- **Allowed Files**：`packages/runtime-kernel/src/machine.ts`、`storyRegion.ts`、`machine.test.ts`
- **Requirements**：按第 2.1/2.2 节精确实现。
- **Acceptance**：
  - 注入 `ports.audioResolution.findPregenerated` 恒定命中 → 跑完整条 `LOCK`
    链路后，AUDIO region 到达 `PLAYING_STORY`（无任何手动 `AUDIO.*` 发送）。
  - 默认 Ports（`resultAudio.source === 'SUBTITLE_ONLY'`）跑完整条 `LOCK` 链路 →
    AUDIO region 保持 `IDLE`（门槛条件确实生效，不是"永远触发"）。
  - 从 `PLAYING_STORY` 发送 `NARRATIVE.DONE`（两个分支各测一次：有下一场景 /
    无下一场景直达 `CHAPTER_END`）→ AUDIO region 回到 `IDLE`。
  - 场景本身无互动、`STORY.DONE` 直接到 `CHAPTER_END` 的路径 → AUDIO region 全程
    保持 `IDLE`，从未被触碰（证明改动没有越界到这条无关路径）。
  - 既有 `audioRegion.test.ts`（手动驱动六态）与既有 `machine.test.ts` 全部用例
    零回归。

---

### T003 — 全量验证、REPORT 与 commit

- **Allowed Files**：`specs/dev/DEV-032/INDEX.md`、`REPORT.md`、`DECISIONS.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-032.md`
- **Requirements**：
  1. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  2. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  3. **`DECISIONS.md` 必须已提交**，覆盖第 6 节列出的全部要点。
  4. 更新 `INDEX.md`：T001–T003 全部勾选，`Status:` 从 `IN_PROGRESS` 改为 `READY_FOR_REVIEW`。
  5. `git add -A && git commit`，提交信息首行：`DEV-032: audio state region`。
  6. 追加 LEDGER 行，发 `NODE_REPORT`。
  7. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-032 INDEX

Status: IN_PROGRESS

## Current Node

DEV-032 — Audio State Region

## Objective

把自 DEV-009 起一直只能手动驱动的 AUDIO region 六态骨架接上第一个真实触发源：
DEV-031 计算好的 Result 叙事音频决策（`context.resultAudio`）。`source !==
'SUBTITLE_ONLY'` 时自动 `IDLE → PREPARING → PLAYING_STORY`，`NARRATIVE.DONE` 时
自动回到 `IDLE`。`audioRegion.ts` 本身零改动；PLAYING_HOST/DUCKED（AI Host 触发，
M5）与 BGM/环境音（DEV-027，Presentation 通道）均不在本节点范围。

## Allowed Scope / Read-only Scope / Forbidden Scope
（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 machine.ts + storyRegion.ts 两处 CR + 集成测试
- [ ] T003 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001（每完成一个 Task 立即勾选并更新本字段）

## Exit Criteria

六条命令全部退出码 0；注入/默认两种场景的机器级集成测试证明门槛条件真实生效；
`DECISIONS.md` 已入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；已向 AUDITOR
发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **不改动 `audioRegion.ts` 的状态拓扑或既有转移**——只从 STORY 一侧接线。
2. **不实现 PLAYING_HOST/DUCKED 的真实触发**（AI Host 不存在，M5 的职责）。
3. **不触碰 BGM/环境音路径**（DEV-027 领域）。
4. **不新建 `getHealth()`**（纯逻辑扩展，无新增真实 IO）。
5. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
6. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现真实异步 TTS 等待（DEV-034/035 的职责；见 2.2 的未来重开边界）。
- 不实现 PLAYING_HOST/DUCKED 的真实触发（AI Host，M5）。
- 不触碰 BGM/环境音（DEV-027 已完整处理，属不同通道类别）。
- 不修改 `Ports.audio` 的 send 载荷形状。

---

## 11. Tests

### Integration tests

T002（机器级：注入命中场景、默认 SUBTITLE_ONLY 场景、两种 NARRATIVE.DONE 分支、
无互动直达 CHAPTER_END 场景）。

### Regression tests

`pnpm test` 覆盖全 workspace；既有 `audioRegion.test.ts`/`machine.test.ts` 全部零回归。

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
| A07 | 注入命中 Ports → `LOCK` 链路后 AUDIO region 自动到达 `PLAYING_STORY` | 集成测试 |
| A08 | 默认 Ports（`SUBTITLE_ONLY`）→ `LOCK` 链路后 AUDIO region 保持 `IDLE` | 集成测试 |
| A09 | `PLAYING_STORY` 后 `NARRATIVE.DONE`（有下一场景分支）→ AUDIO 回到 `IDLE` | 集成测试 |
| A10 | `PLAYING_STORY` 后 `NARRATIVE.DONE`（直达 CHAPTER_END 分支）→ AUDIO 回到 `IDLE` | 集成测试 |
| A11 | 场景无互动、直达 `CHAPTER_END` 的路径 → AUDIO 全程保持 `IDLE` | 集成测试 |
| A12 | `audioRegion.ts` 逐字节未变 | git diff 比对 |
| A13 | `Ports.audio` 既有 `send()` 载荷 kind（`AUDIO_PREPARING`/`AUDIO_PLAY_STORY`/`AUDIO_STOP` 等）未变 | 代码检查 |
| A14 | `apps/renderer/**`、`packages/audio-engine/**` 未被修改 | git diff 比对 |
| A15 | 未新增任何 npm 依赖 | 文件检查 |
| A16 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A17 | `specs/dev/DEV-032/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T003 全部勾选，`Status:` 表头改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A18 | `git log` 新增恰 1 条提交，首行 `DEV-032: audio state region`；提交时 `git status --porcelain` 为空 | 命令 |
| A19 | LEDGER 含 `NODE_REPORT-DEV-032` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A20 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT（含确认
`DECISIONS.md` 已提交）→ commit → 发 NODE_REPORT → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A20。
