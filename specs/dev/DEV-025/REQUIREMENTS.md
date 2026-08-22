# DEV-025 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-025.md` 抄录并整理，权威版本为 Task
Package 原文。**第 1/2 节务必先读**：`DICE.*` 事件目前只写进 Runtime Event Log，从不
转发给 Presentation——本节点是第一次让骰子数据流向 Renderer。**LOOP 阶段是本地视觉
过渡，不是真实等待**；真正的节奏控制是 DEV-037（M3，尚未建）的职责，本节点不越权实现。

## 架构

- **关键约束（第 1 节）**：当前 `onResolve` 的掷骰计算是同步瞬间完成的，没有真实的
  "骰子在滚动中"这段时间。本节点的 `LOOP` 阶段是 Renderer 本地用固定时长播放的纯展示
  动画（收到结果后倒着演一段"正在摇"的效果再揭晓），**不是**在等待真实计算——真正把
  "摇骰子的观感时长"接入叙事节奏是 DEV-037 的职责。
- **CR #1（第 2.1 节）**：`onLock` 追加纯信号 `DICE_INTRO`（无需携带数据，投票已锁定，
  具体摇几颗骰子由后续 `DICE_RESULT` 携带）：
  ```typescript
  onLock: assign(({ context }) => {
    context.ports.presentation.send({ kind: 'DICE_INTRO' });
    return interactionMove(context, 'LOCKING', 'INTERACTION.LOCKING');
  }),
  ```
- **CR #2（第 2.2 节）**：`onResolve` 在 `const outcome = resolveGroups(...)` 之后、
  `buildNarrativeInputs` 之前新增 `DICE_RESULT` 下发。只下发展示相关字段
  （`diceType`/`rawValue`/`modifier`/`finalValue`/`quality`），丢弃 `seed`/
  `rollIndex`/`appliedModifiers`（重放/内部记账字段，不用于展示，与 DEV-024 丢弃
  `Choice.actionType`/`ruleId` 同一原则）。`DICE_RESULT` 的安全性来自 `onResolve`
  内**显式手写、只含五个具名字段**的对象字面量（非展开 `record`、非信任事件整体
  可见性标注）——冻结的 `DICE.PUBLISHED` 事件（`machine.ts:349-352`）实际与
  `HIDDEN` 的 `DICE.ROLLED` 共用同一未裁剪的 `record` 对象，其 `visibility:'PUBLIC'`
  标注**不代表**该 record 的每个字段都已被审计为对观众安全；`quality` 亦从未在
  `DiceRollRecordPayloadSchema` 中被声明为正式字段。这正是本节点不能简单转发/展开
  该事件 payload、而必须手写白名单的原因（FIX-01 更正，依 `AUDIT_VERDICT` 消息
  `0120` BLOCKING-01）。
  ```typescript
  context.ports.presentation.send({
    kind: 'DICE_RESULT',
    results: outcome.diceRecords.map((d) => ({
      diceType: d.diceType,
      rawValue: d.rawValue,
      modifier: d.modifier,
      finalValue: d.finalValue,
      quality: d.quality,
    })),
  });
  ```
- **Renderer 三阶段（第 2.3 节）**：服务端驱动 INTRO/RESOLVE，本地计时驱动 LOOP。
  `pickDiceState`（新增 `apps/renderer/src/render/pickDiceState.ts`）：
  ```typescript
  export type DicePhase = 'IDLE' | 'INTRO' | 'RESOLVE';
  export interface DiceResultView {
    diceType: string;
    rawValue: number;
    modifier: number;
    finalValue: number;
    quality: string;
  }
  export interface DiceView {
    phase: DicePhase;
    results: DiceResultView[];
    key: number;   // 产生这批数据的命令 commandSeq
  }
  export function pickDiceState(commands: PresentationCommand[]): DiceView
  ```
  比较最近一条 `DICE_INTRO` 与最近一条 `DICE_RESULT` 的 `commandSeq`：都不存在→
  `{phase:'IDLE', results:[], key:0}`；`DICE_RESULT` 更新→`{phase:'RESOLVE', results:
  <映射>, key:<其 seq>}`；`DICE_INTRO` 更新（或只有它）→`{phase:'INTRO', results:[],
  key:<其 seq>}`。
- **`App.tsx`（第 2.3 节，仅追加）**：`pickDiceState` 返回 `INTRO` 且 `key` 变化时，
  本地进入"摇骰子动画"视觉状态（CSS 循环动画，不需要新库），维持到 `pickDiceState`
  返回 `RESOLVE`（真实数据到达）为止——这就是"LOOP"阶段，**完全是本地视觉过渡，不
  是等待服务端**。`RESOLVE` 到达后停止动画，展示 `results`（如"D20：14 + 2 = 16
  （SUCCESS）"这类格式）。

## Requirements

- `DiceRollResult`（`dice-engine`，已冻结）是 `outcome.diceRecords` 的元素类型；
  `outcome` 来自 `resolveGroups`（`interactionRegion`，冻结）。
- `machine.ts` 只改 `onLock`/`onResolve` 两处（第 2.1/2.2 节精确实施），`git diff` 只
  显示这两处新增的 `send` 调用；其余全部 action（含 `onSceneEnter`/`onOpen` 及历次
  CR 遗留代码）逐字节不变。`index.ts` 不动（无新增导出）。
- 端到端：`createRuntimeMachine` 驱动 `valid-minimal` 走完一轮互动，依次捕获到
  `kind:'DICE_INTRO'`（`LOCK` 后）与 `kind:'DICE_RESULT'`（`LOCKED` 后，`results`
  含正确的 `diceType`/`rawValue`/`modifier`/`finalValue`/`quality`，且不含
  `seed`/`rollIndex`/`appliedModifiers`）。
- `pickDiceState` 对四种组合（无命令/仅 `DICE_INTRO`/仅 `DICE_RESULT`/两者都有按
  `commandSeq` 取较大）均正确返回。
- `App.tsx` 只追加——新增 Dice UI 渲染（INTRO 信号 → 本地 LOOP 动画 → RESOLVE 展示），
  不删除既有场景层/角色/对话框/选项/调试列表/HELLO 逻辑（不要求 DOM 渲染测试，沿用
  先例）。
- 既有 `machine.test.ts`（未改动）全部测试仍然通过。

## Non-goals

不实现真实的骰子摇动节奏控制/延迟安全阀（DEV-037）；不实现镜头/视差动画（DEV-026）、
BGM/SFX（DEV-027）；不做 DOM 渲染测试（沿用先例）；不修改 `machine.test.ts`/
`interactionRegion.*`/`index.ts`；不展示 `seed`/`rollIndex`/`appliedModifiers` 等内部
记账字段；不新增任何 npm 依赖。

## Task Order

T001 节点文档；T002 `machine.ts` CR（`onLock` + `onResolve`，含端到端验证）；T003
`pickDiceState`（含测试）；T004 `App.tsx` Dice UI 渲染；T005 全量验证 + REPORT +
DECISIONS + commit + NODE_REPORT。