# DEV-023 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-023.md` 抄录并整理，权威版本为 Task
Package 原文。**第 2 节务必先读**：`onSceneEnter` 只新增一行；`onResultPlaying` 已有的
`RESULT_PLAYING`/`text` 不需要改动。Renderer 侧做场景旁白与结算叙事共用的点击推进对话框，
用 `commandSeq` 大小判断显示来源。

## 架构

- **CR #3（第 2.1 节）**：`onSceneEnter` 的 `SCENE_ENTER` 命令载荷追加 `narration` 字段——
  只新增 `narration: scene?.narration ?? []` 这一行，`scene`/`layers`/`characters` 的既有计算
  逐字节不变，`audio.send`/`storyMove` 返回及全部其它 action 不变。`onResultPlaying` 不需要
  改动（已发送 `{kind:'RESULT_PLAYING', text: context.narrationText}`，DEV-009 起就有，直接
  复用）。`narration` 是纯字符串数组，**不需要任何跨文件引用解析**（不像 `layers`/`characters`
  需要查 `visuals`/`npc` 集合）——本节点不需要新增任何 `resolveX` 纯函数。
- **`pickDialogueLines`（第 2.2 节，`apps/renderer/src/render/pickDialogueLines.ts`）**：
  ```typescript
  export interface DialogueLines {
    lines: string[];
    key: number;   // 产生这批 lines 的命令的 commandSeq，用于检测"内容已换"从而重置阅读进度
  }
  export function pickDialogueLines(commands: PresentationCommand[]): DialogueLines
  ```
  比较最近一条 `SCENE_ENTER`（取其 `narration`）与最近一条 `RESULT_PLAYING`（取其 `text` 包成
  单元素数组）两者的 `commandSeq`，谁的 `commandSeq` 更大就用谁（新场景覆盖旧结算文本，新结算
  文本覆盖旧场景旁白——两者不会同时出现，`commandSeq` 天然给出"最近发生的是哪一个"）。都不存在
  时返回 `{lines: [], key: 0}`。
- **`lineIndex`（`apps/renderer/src/render/lineIndex.ts`）**：
  ```typescript
  export function clampLineIndex(index: number, lines: string[]): number
  export function nextLineIndex(index: number, lines: string[]): number
  ```
  `clampLineIndex`：把 `index` 夹到 `[0, lines.length - 1]`（空数组返回 `0`）。`nextLineIndex`：
  `index + 1` 后夹到同一范围（已在最后一行时不再前进）。
- **`App.tsx`（第 2.2 节）**：`pickDialogueLines(commands)` 的 `key` 变化时（`useEffect` 依赖
  `lines.key`）把本地 `lineIndex` 状态重置为 `0`；点击对话框时调用 `nextLineIndex` 推进；渲染
  `lines[clampLineIndex(lineIndex, lines)]` 与"第 N/M 行"提示。
- **已知边界，如实记录**：本节点**不实现**"读完所有旁白才能继续剧情"的门控——Renderer 目前
  没有任何向 Runtime 回传信号的通道（唯一入站钩子是 DEV-020 的 `onRendererHello`，语义是重新
  握手/请求 RESYNC，不是"我看完了"）。真正的节奏门控如果未来需要，是一次需要新增 `RootEvent`
  的架构决策，不在本节点范围内顺带做掉。

## Requirements

- `PresentationCommand`（`commandSeq` + `command: unknown`）来自 `@interactive-story/runtime-kernel`
  已冻结导出，本节点不新增导出、不改 `index.ts`。
- `DialogueLines { lines: string[]; key: number }`；`pickDialogueLines(commands)` 返回当前应显示
  的对话行与来源命令的 `commandSeq`。
- `clampLineIndex`/`nextLineIndex` 边界情形：空数组、越界正负下标、最后一行再推进均正确夹取。
- `App.tsx` 追加统一对话框渲染（场景旁白 + 结算叙事共用），`key` 变化重置 `lineIndex`，点击推进，
  显示当前行 + "第 N/M 行"提示；不删除既有场景层/角色/调试列表/HELLO 逻辑。
- 端到端：`createRuntimeMachine` 驱动 `valid-minimal` 到 `SCENE_ENTER`，捕获的命令含 `narration`
  数组，与 `scene-start.json` 的 `narration` 字段一致（`["你站在森林入口。"]`）。

## Non-goals

不实现"读完才能继续"的门控（无回传通道，见上文）；不实现打字机逐字显示效果（分页显示整行即可）；
不实现选择 UI（DEV-024）、骰子 UI（DEV-025）、镜头/视差动画（DEV-026）；不做 DOM 渲染测试（沿用
DEV-020/021/022 先例）；不修改 `machine.test.ts`/`visualResolution.*`/`characterResolution.*`/
`index.ts`；不新增任何 npm 依赖。

## Task Order

T001 节点文档；T002 `machine.ts` CR #3（含端到端验证）；T003 `pickDialogueLines`（含测试）；
T004 `clampLineIndex`/`nextLineIndex`（含测试）；T005 `App.tsx` 对话框渲染；T006 全量验证、REPORT、
DECISIONS、commit 与 NODE_REPORT。
