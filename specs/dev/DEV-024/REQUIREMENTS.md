# DEV-024 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-024.md` 抄录并整理，权威版本为 Task
Package 原文。**第 2 节务必先读**：Choice UI 是给 OBS Browser Source 采集进直播画面的
**展示**，不是可点击控件——真实投票来自 Twitch 聊天（M4 尚未建），不要做成按钮交互。
`visibleIf` 条件过滤必须在 Runtime 侧完成（Renderer 拿不到 `WorldState`）。

## 架构

- **产品事实（第 2.1 节）**：`Choice.id` 就是观众要在聊天里打的字母（`'A'|'B'|'C'|'D'`），
  `label` 是人类可读的选项说明——这两个字段是 Choice UI 唯一需要的展示内容。
  `actionType`/`ruleId` 是内部机制字段，不用于展示，不下发。
- **CR 边界（第 2.2/2.3 节）**：`visibleIf` 需要读 `WorldState`，而 `WorldState` 不透明
  （CR-008），判断必须在 Runtime 侧（`onOpen`）完成，只把**已过滤好**的列表发给 Renderer。
  对 `machine.ts` 的 `onOpen` action 发窄范围 CR：
  ```typescript
  onOpen: assign(({ context }) => {
    const scene =
      context.compiled !== null ? currentScene(context.compiled, context.currentSceneId) : undefined;
    const interaction =
      context.compiled !== null && scene?.interactionId !== undefined
        ? context.compiled.schemaResult.interactions.passed.find(
            (i) => i.value.id === scene.interactionId,
          )?.value
        : undefined;
    const choices =
      interaction !== undefined
        ? resolveVisibleChoices(interaction, context.snapshot.world)
        : [];
    context.ports.presentation.send({
      kind: 'INTERACTION_OPEN',
      choices,
      openDurationMs: interaction?.openDurationMs,
    });
    return interactionMove(context, 'OPEN', 'INTERACTION.OPEN');
  }),
  ```
  其余全部 action（`onAnnouncing`/`onVote`/`onLock`/`onResolve`/`onResolved` 与 STORY 的
  `onSceneEnter` 含 DEV-021/022/023 三次 CR 遗留代码）逐字节不变。
- **`resolveVisibleChoices`（第 2.4 节，新增 `packages/runtime-kernel/src/choiceResolution.ts`）**：
  ```typescript
  export interface DisplayChoice {
    id: Choice['id'];
    label: string;
  }
  export function resolveVisibleChoices(
    interaction: InteractionNode,
    world: WorldState,
  ): DisplayChoice[]
  ```
  对 `interaction.choices` 逐个判断：`visibleIf` 未定义 → 可见；否则用已冻结的
  `evaluateCondition`（`rule-engine`）对数组内每个 `Condition` 做 AND（全部满足才可见，与
  `SceneGuard`/其它多条件字段既有语义一致，不发明新组合规则）。可见的映射成 `{id, label}`，
  丢弃 `actionType`/`ruleId`/`visibleIf`（内部字段，不下发）。
- **`pickInteractionOpen`（第 2.5 节，新增 `apps/renderer/src/render/pickInteractionOpen.ts`）**：
  ```typescript
  export interface InteractionOpenView {
    choices: DisplayChoice[];
    openDurationMs?: number;
    key: number;   // 产生这批数据的命令 commandSeq，用于检测"新一轮开始"从而重置倒计时
  }
  export function pickInteractionOpen(
    commands: PresentationCommand[],
  ): InteractionOpenView | undefined
  ```
  取最近一条 `kind === 'INTERACTION_OPEN'` 的命令，没有则返回 `undefined`。
- **`App.tsx`（第 2.5 节）**：`key` 变化时（`useEffect`）重新从 `openDurationMs` 开始本地倒
  计时（用 `setInterval`/`Date.now()`——**这里允许使用裸 `Date.now()`**，倒计时是纯展示反馈，
  不写入 Runtime Event Log、不参与游戏状态判定，不适用 `runtime-kernel` 的确定性红线，沿用
  DEV-010 `getHealth()` 已确立的同一区分原则）；渲染选项列表（`"[A] 跟随向导"` 这类"字母 +
  文案"格式，方便观众照着打）。
- **已知简化，如实记录**：本地倒计时只是 UI 反馈，可能与 Runtime 侧真实的互动关闭时刻有
  毫秒级漂移（Renderer 不知道 `INTERACTION_OPEN` 命令实际发出的服务器时刻），不影响任何判定
  ——真正决定互动何时关闭的是 Runtime 侧的 `LOCK` 事件，不是这个倒计时。

## Requirements

- `Choice`/`InteractionNode`/`WorldState`/`Condition` 来自 `@interactive-story/chapter-schema`
  （已冻结）；`evaluateCondition` 来自 `@interactive-story/rule-engine`（已冻结，纯函数）。
- `DisplayChoice { id: Choice['id']; label: string }`；`resolveVisibleChoices` 对无/单/多
  `visibleIf` 条件均正确过滤，返回值只含 `id`/`label`。
- `machine.ts` 只改 `onOpen` 一处（第 2.3 节精确实施），`git diff` 只显示 `onOpen` action 内
  新增 `scene`/`interaction`/`choices` 计算 + `send` 参数追加两个字段；既有 `machine.test.ts`
  （未改动）全部测试仍然通过。
- `index.ts` 仅追加导出 `resolveVisibleChoices`/`DisplayChoice`，符号可从包外导入。
- `pickInteractionOpen` 对无命令/有命令两种情形正确返回；`App.tsx` 追加选项列表与本地倒计时
  渲染，不删除既有场景层/角色/对话框/调试列表/HELLO 逻辑（不要求 DOM 渲染测试，沿用先例）。
- 端到端：`createRuntimeMachine` 驱动 `valid-minimal` 到 `INTERACTION.OPEN`，捕获的命令含
  `choices: [{id:'A', label:'跟随向导'}]`、`openDurationMs: 15000`。

## Non-goals

不实现可点击投票控件（观众看的是直播画面，不能点击）；不实现实时票数/计票展示（需要额外的
批量/限流机制设计，明确延后，未来若做很可能是另一次 CR）；不实现骰子 UI（DEV-025）、镜头/
视差动画（DEV-026）、BGM/SFX（DEV-027）；不做 DOM 渲染测试（沿用先例）；不修改
`machine.test.ts`/`interactionRegion.*`/`visualResolution.*`/`characterResolution.*`；不新增
任何 npm 依赖。

## Task Order

T001 节点文档；T002 `resolveVisibleChoices`（含测试）；T003 `machine.ts` CR（`onOpen`，含端到端
验证）；T004 `index.ts` 追加导出；T005 `pickInteractionOpen` + `App.tsx` 渲染（含测试）；T006
全量验证、REPORT、DECISIONS、commit 与 NODE_REPORT。