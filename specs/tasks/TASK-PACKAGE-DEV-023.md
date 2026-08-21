# TASK PACKAGE — DEV-023

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-023 |
| Node Name | Subtitle / Dialogue |
| Milestone | M2 — Presentation Complete（第四个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-022（DONE，`verdict_ref: "0108"`） |
| Commander | Claude |
| Executor | Codex（协议角色名 `OPENCODE`） |

### 本节点是第三次对 `onSceneEnter` 发窄范围 CR——比前两次更简单

`SceneNode.narration?: string[]` 是纯字符串数组，**不需要任何跨文件引用解析**（不像
`layers`/`characters` 需要查 `visuals`/`npc` 集合）——本节点不需要新增任何 `resolveX`
纯函数，`onSceneEnter` 只多传一个字段。已核对现有测试同前两次 CR 一样不依赖完整
payload 形状，向后兼容。

### 已发现一个真实缺口：`onStoryPlaying` 目前完全不发任何 Presentation 命令

已核对 `machine.ts`：进入 `STORY_PLAYING` 时（`onStoryPlaying`）不调用任何
`ports.presentation.send`——场景的旁白/对白目前**只能**通过 `SCENE_ENTER` 命令带出去
（进入场景那一刻），这是本节点选择"把 `narration` 加进 `SCENE_ENTER`"而不是新开一个
命令类型的直接原因（`onStoryPlaying` 是空动作，凭空新增一次 send 反而是更大的改动，
且没有新增数据来源——`narration` 本来就属于 `SceneNode`，跟着场景一起下发最自然）。

---

## 2. 架构设计（Commander 已核对真实代码后做出的决策）

### 2.1 CR：`onSceneEnter` 追加 `narration` 字段

**现状**（DEV-022 已冻结）：

```typescript
context.ports.presentation.send({
  kind: 'SCENE_ENTER',
  sceneId: context.currentSceneId,
  visualSceneId: scene?.visualSceneId,
  layers,
  characters,
});
```

**授权改为**（**只新增这一个字段**，`scene`/`layers`/`characters` 的既有计算逐字节不变）：

```typescript
context.ports.presentation.send({
  kind: 'SCENE_ENTER',
  sceneId: context.currentSceneId,
  visualSceneId: scene?.visualSceneId,
  layers,
  characters,
  narration: scene?.narration ?? [],
});
```

`onResultPlaying` **不需要改动**——它已经发送 `{kind:'RESULT_PLAYING', text:
context.narrationText}`（DEV-009 起就有，本节点直接复用，不重新设计）。

**验收时逐行核对**：`git diff` 只在 `onSceneEnter` 的 `send` 调用里新增
`narration: scene?.narration ?? []` 一行，前两次 CR 遗留的 `scene`/`layers`/
`characters` 计算与 `audio.send`/`storyMove` 逐字节不变，`onResultPlaying`/其余全部
action 不变。

### 2.2 Renderer 侧：统一对话框——场景旁白与结算叙事共用同一套点击推进机制

```typescript
// apps/renderer/src/render/pickDialogueLines.ts
export interface DialogueLines {
  lines: string[];
  key: number;   // 产生这批 lines 的命令的 commandSeq，用于检测"内容已换"从而重置阅读进度
}
export function pickDialogueLines(commands: PresentationCommand[]): DialogueLines
```

比较最近一条 `SCENE_ENTER`（取其 `narration`）与最近一条 `RESULT_PLAYING`（取其
`text` 包成单元素数组）两者的 `commandSeq`，**谁的 `commandSeq` 更大就用谁**（新场景
覆盖旧结算文本，新结算文本覆盖旧场景旁白——两者不会同时出现，`commandSeq` 天然给出
"最近发生的是哪一个"）。都不存在时返回 `{lines: [], key: 0}`。

```typescript
// apps/renderer/src/render/lineIndex.ts
export function clampLineIndex(index: number, lines: string[]): number
export function nextLineIndex(index: number, lines: string[]): number
```

`clampLineIndex`：把 `index` 夹到 `[0, lines.length - 1]`（空数组返回 `0`）。
`nextLineIndex`：`index + 1` 后夹到同一范围（已在最后一行时不再前进）。

`App.tsx`：`pickDialogueLines(commands)` 的 `key` 变化时（`useEffect` 依赖
`lines.key`）把本地 `lineIndex` 状态重置为 `0`；点击对话框时调用 `nextLineIndex`
推进；渲染 `lines[clampLineIndex(lineIndex, lines)]` 与"第 N/M 行"提示。

**已知边界，如实记录**：本节点**不实现**"读完所有旁白才能继续剧情"的门控——Renderer
目前没有任何向 Runtime 回传信号的通道（唯一入站钩子是 DEV-020 的
`onRendererHello`，语义是重新握手/请求 RESYNC，不是"我看完了"）。真正的节奏门控如果
未来需要，是一次需要新增 `RootEvent` 的架构决策，不在本节点范围内顺带做掉。

---

## 3. Scope

### Writable Scope — `packages/runtime-kernel`，一处窄范围 CR

```
packages/runtime-kernel/src/machine.ts   （仅第 2.1 节描述的 onSceneEnter 内新增一行，
                                            其余内容——含前两次 CR 遗留代码——逐字节不变）
```

### Writable Scope — `apps/renderer`，新增文件

```
apps/renderer/src/render/pickDialogueLines.ts
apps/renderer/src/render/pickDialogueLines.test.ts
apps/renderer/src/render/lineIndex.ts
apps/renderer/src/render/lineIndex.test.ts
```

### Writable Scope — `apps/renderer`，仅追加式扩展既有文件

```
apps/renderer/src/App.tsx   （追加对话框渲染，不删除既有场景层/角色/调试列表/HELLO 逻辑）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-023/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/runtime-kernel/src/ 下除 machine.ts（唯一授权改动）外的全部既有文件（含
  machine.test.ts、visualResolution.*、characterResolution.*、index.ts——本节点不需要
  新增导出，index.ts 也不动）
packages/runtime-kernel/package.json、tsconfig.json
packages/chapter-schema/**、packages/chapter-compiler/**（含 test-fixtures/**）、
  packages/rule-engine/**、packages/dice-engine/**、packages/narrative-composer/**、
  packages/persistence/**、packages/shared/**
apps/renderer/src/ws/**、apps/renderer/src/server/**、apps/renderer/src/main.tsx、
  apps/renderer/src/render/composeLayers.*、composeCharacters.*、
  apps/renderer/package.json、tsconfig.json、vite.config.ts、index.html——DEV-020/021/022 冻结
根 tsconfig.json、tsconfig.base.json、vitest.config.ts、eslint.config.js、根 package.json
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
```

### Forbidden Scope

```
packages/* 除 runtime-kernel（限定一处）外的任何目录
apps/* 除 renderer（限定文件）外的任何目录
apps/renderer 内 DEV-020/021/022 冻结的文件
对 machine.ts 中 onSceneEnter 以外任何 action/guard 的修改；对 onSceneEnter 内既有代码
  （scene/layers/characters 计算、audio.send、storyMove 返回）的任何改动
`packages/runtime-kernel/src/index.ts` 的任何修改（本节点无新增导出）
任何根级配置文件的修改
新增任何"读完才能继续"的门控机制或新 RootEvent（见 2.2 节已知边界）
真实的选择 UI（DEV-024）、骰子 UI（DEV-025）、镜头/视差动画（DEV-026）
新增任何 npm 依赖
```

---

## 4. Required Skills

### Required

- 窄范围修改一个已被连续三次 CR 过的 XState action，精确控制 diff 边界
- React 本地状态管理（点击推进的分页/打字机式对话框，无需新库）

### Forbidden / Unnecessary

- 任何富文本/打字机效果库——纯字符串数组分页足够
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `SceneNode.narration`（已冻结） | 场景旁白来源 |
| `RESULT_PLAYING` 命令的 `text` 字段（DEV-009 起已冻结，本节点不改） | 结算叙事来源 |
| `pickSceneLayers`/`pickSceneCharacters`（DEV-021/022 冻结） | 渲染模式先例，`pickDialogueLines` 照此风格实现 |

---

## 6. Outputs

1. `onSceneEnter` 的 `SCENE_ENTER` 命令载荷追加 `narration` 字段
2. `pickDialogueLines`/`DialogueLines`（`apps/renderer`）
3. `clampLineIndex`/`nextLineIndex`（`apps/renderer`）
4. `App.tsx` 新增统一对话框渲染（场景旁白 + 结算叙事共用）
5. `specs/dev/DEV-023/DECISIONS.md`，记录：为何不新开命令类型、`commandSeq` 比较决定
   显示来源的理由、"不做读完门控"的已知边界

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-023/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Acceptance**：四文件存在；`INDEX.md` 含 Task Order T001–T006。

---

### T002 — `machine.ts` CR #3

- **Allowed Files**：`packages/runtime-kernel/src/machine.ts`（**仅第 2.1 节描述的一行新增**）
- **Requirements**：按第 2.1 节精确实施。
- **Acceptance**：
  - `git diff` 只显示 `onSceneEnter` 的 `send` 调用新增 `narration` 一行，前两次 CR
    遗留代码与其余全部 action 逐字节不变。
  - 端到端：`createRuntimeMachine` 驱动 `valid-minimal` 到 `SCENE_ENTER`，捕获的命令
    含 `narration` 数组，与 `scene-start.json` 的 `narration` 字段一致
    （`["你站在森林入口。"]`）。
  - 既有 `machine.test.ts`（未改动）全部测试仍然通过。

---

### T003 — `pickDialogueLines`

- **Allowed Files**：`apps/renderer/src/render/pickDialogueLines.ts`、`pickDialogueLines.test.ts`
- **Requirements**：按第 2.2 节实现。
- **Acceptance**：只有 `SCENE_ENTER` 时返回其 `narration`；只有 `RESULT_PLAYING` 时
  返回 `[text]`；两者都存在时按 `commandSeq` 更大的为准；`SCENE_ENTER` 缺失
  `narration` 字段时返回 `[]`；都不存在时返回 `{lines:[], key:0}`。

---

### T004 — `clampLineIndex`/`nextLineIndex`

- **Allowed Files**：`apps/renderer/src/render/lineIndex.ts`、`lineIndex.test.ts`
- **Requirements**：按第 2.2 节实现。
- **Acceptance**：空数组、越界正负下标、最后一行再推进等边界情形均正确夹取。

---

### T005 — `App.tsx` 对话框渲染

- **Allowed Files**：`apps/renderer/src/App.tsx`（**仅追加**，不删除既有逻辑）
- **Requirements**：按第 2.2 节，`lines.key` 变化时重置 `lineIndex`；点击对话框区域用
  `nextLineIndex` 推进；显示当前行 + "第 N/M 行"提示。
- **Acceptance**：手动核查渲染逻辑正确调用 `pickDialogueLines`/`clampLineIndex`/
  `nextLineIndex`（不要求 DOM 渲染测试，沿用 DEV-020～022 先例）。

---

### T006 — 全量验证、REPORT 与 commit

- **Allowed Files**：`specs/dev/DEV-023/INDEX.md`、`REPORT.md`、`DECISIONS.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-023.md`
- **Requirements**：
  1. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  2. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  3. **`DECISIONS.md` 必须已提交**，覆盖第 6 节列出的全部要点。
  4. 更新 `INDEX.md`：T001–T006 全部勾选，**且把文件顶部的 `Status:` 一行从
     `IN_PROGRESS` 改为 `READY_FOR_REVIEW`**（DEV-021/DEV-022 均在这一步漏改，被
     Commander 在裁决时顺带订正，本节点请主动做对，不要重复同一个疏漏）。
  5. `git add -A && git commit`，提交信息首行：`DEV-023: subtitle dialogue`。
  6. 追加 LEDGER 行，发 `NODE_REPORT`。
  7. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`REPORT.md` 引用的全部文档已入库；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-023 INDEX

Status: IN_PROGRESS

## Current Node

DEV-023 — Subtitle / Dialogue

## Objective

第三次对 `onSceneEnter` 发窄范围 CR，追加 `narration` 字段（场景旁白，纯字符串数组，
无需跨文件解析）；`apps/renderer` 实现场景旁白与结算叙事共用的点击推进对话框，用
`commandSeq` 决定显示来源。不做"读完才能继续"的门控。

## Allowed Scope（runtime-kernel：CR）
（抄录 Task Package 第 3 节实际条目——machine.ts 只新增一行）

## Allowed Scope（apps/renderer：新增 + 仅追加）
（抄录 Task Package 第 3 节实际条目）

## Read-only Scope
（抄录 Task Package 第 3 节实际条目）

## Forbidden Scope
（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 machine.ts CR #3
- [ ] T003 pickDialogueLines
- [ ] T004 clampLineIndex/nextLineIndex
- [ ] T005 App.tsx 对话框渲染
- [ ] T006 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001（每完成一个 Task 立即勾选并更新本字段）

## Exit Criteria

六条命令全部退出码 0；`machine.ts` 的 git diff 精确限定在一行新增；端到端验证
`SCENE_ENTER` 含正确 `narration`；既有 `machine.test.ts` 零回归；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **`machine.ts` 只能在 `onSceneEnter` 的 `send` 调用里新增一行**，其余全部内容逐字节
   不变。
2. **不修改 `index.ts`**（本节点无新增导出）。
3. **不修改 `apps/renderer` 的 DEV-020/021/022 冻结文件**。
4. **不新增任何 npm 依赖**，不实现门控/新 RootEvent（第 2.2 节已说明理由）。
5. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
6. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现"读完旁白才能继续剧情"的门控（无回传通道，见 2.2 节）。
- 不实现打字机逐字显示效果（分页显示整行即可）。
- 不实现选择 UI（DEV-024）、骰子 UI（DEV-025）、镜头/视差动画（DEV-026）。
- 不做 DOM 渲染测试（沿用先例）。
- 不修改 `machine.test.ts`/`visualResolution.*`/`characterResolution.*`/`index.ts`。

---

## 11. Tests

### Unit tests

T003、T004：覆盖第 7 节描述的具体行为。

### Integration tests

T002：端到端驱动真实 actor 验证 CR 后的命令载荷。

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
| A07 | `machine.ts` 的 git diff 精确限定在一行新增 | git diff 逐行比对 |
| A08 | 端到端：`SCENE_ENTER` 命令含正确 `narration` | 测试检查 |
| A09 | `machine.test.ts` 未被修改且全部测试通过 | git diff + 命令输出 |
| A10 | `pickDialogueLines` 对四种输入组合（仅场景/仅结算/两者都有按 seq 取较大/都无）均正确 | 测试检查 |
| A11 | `clampLineIndex`/`nextLineIndex` 边界情形正确 | 测试检查 |
| A12 | `App.tsx` 的 git diff 只有新增，DEV-020～022 既有逻辑保留 | git diff 比对 |
| A13 | `apps/renderer` 的 DEV-020/021/022 冻结文件未被修改 | git diff 比对 |
| A14 | `packages/**`（除 `machine.ts` 一处外）全部未被修改，含 `index.ts` | git diff 比对 |
| A15 | 未新增任何 npm 依赖 | 文件检查 |
| A16 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A17 | `specs/dev/DEV-023/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T006 全部勾选 | 文件 + 文本检查 |
| A18 | `git log` 新增恰 1 条提交，首行 `DEV-023: subtitle dialogue`；提交时 `git status --porcelain` 为空 | 命令 |
| A19 | LEDGER 含 `NODE_REPORT-DEV-023` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A20 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT（含确认 `DECISIONS.md` 已提交）→ commit → 发 NODE_REPORT → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A20。
