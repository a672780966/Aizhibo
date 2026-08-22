# DEV-026 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-026.md` 抄录并整理，权威版本为
Task Package 原文。**第 1/2 节务必先读**：核对全部 `chapter-schema` 源码后确认没有
"转场预设"字段——转场不是章节可配置数据，是 Renderer 每次收到新场景时统一套用的
一种内置淡入效果，不新增 schema 字段。`VisualScene.cameraPreset` 是纯字符串键，
Renderer 只做"preset 名 → 写死的 CSS 效果"映射，不做任何镜头 DSL 或动态参数系统。

## 架构

- **关键发现（第 1 节）**：`cameraPreset` 是 `chapter-schema` 中唯一与"镜头"相关的
  字段（`z.string().optional()`，已冻结）；**不存在**任何"转场预设"字段。处置：转场
  是 Renderer 每次收到新场景（`SCENE_ENTER`，`sceneId` 变化）时统一套用的**一种**
  内置过渡效果（淡入），不新增 schema 字段、不需要新的 CR 传递"用哪种转场"——这是
  "不做镜头 DSL"精神的延伸。
- **CR（第 2.1 节）**：`onSceneEnter` 的 `SCENE_ENTER` 载荷追加 `cameraPreset` 一行：
  ```typescript
  context.ports.presentation.send({
    kind: 'SCENE_ENTER',
    sceneId: context.currentSceneId,
    visualSceneId: scene?.visualSceneId,
    layers,
    characters,
    narration: scene?.narration ?? [],
    cameraPreset:
      context.compiled !== null && scene !== undefined
        ? resolveCameraPreset(context.compiled, scene.visualSceneId)
        : undefined,
  });
  ```
  既有 `scene`/`layers`/`characters`/`narration` 计算与其余全部 action 逐字节不变。
- **`resolveCameraPreset`（第 2.2 节，新增 `packages/runtime-kernel/src/cameraResolution.ts`）**：
  ```typescript
  export function resolveCameraPreset(
    compiled: CompileResult,
    visualSceneId: string,
  ): string | undefined
  ```
  在 `compiled.schemaResult.visuals.passed` 里找 `id === visualSceneId && 'layers' in
  value`（`VisualScene`），返回其 `cameraPreset`（可能 `undefined`，字段 optional）。
  **故意不修改 `resolveVisualLayers`**（DEV-021 冻结）——虽然两者都要先找到同一个
  `VisualScene` 条目、存在少量重复查找，但保持每个函数单一职责、不打开一个已冻结
  函数的返回值形状，比省一次查找更重要。
- **Renderer 映射（第 2.3 节）**：
  - `cameraPreset.ts`：`resolveCameraPresetStyle(preset)` 内置小映射表（如
    `closeup: scale(1.15)`、`wide: scale(0.9)`），`undefined` 或**任何未收录字符串**
    一律回退 `{transform: 'scale(1)'}`（安全默认，不抛异常——章节作者未来可能用到
    映射表暂未收录的新预设名）。
  - `pickSceneMeta.ts`：`pickCameraPreset` 取最近一条 `SCENE_ENTER` 的 `cameraPreset`；
    `pickSceneEnterKey` 取最近一条 `SCENE_ENTER` 的 `commandSeq`（无则 `0`），作为场景
    容器 React 元素的 `key`——场景切换时 `key` 变化触发 React 重挂载，天然重放一次
    CSS `@keyframes fadeIn`，不需要额外的过渡状态机。
- **`App.tsx`（仅追加）**：场景层容器（`<section aria-label="scene layers">`）追加
  `key={pickSceneEnterKey(commands)}`、内联 `transform`（来自
  `resolveCameraPresetStyle(pickCameraPreset(commands))`）、追加 `fadeIn` CSS 动画。
  不删除既有场景层/角色/对话框/选项/骰子/调试列表逻辑。

## Requirements

- `VisualScene.cameraPreset` 来自 `chapter-schema`（已冻结）；`currentScene`（冻结）取
  当前场景的 `visualSceneId`。
- `resolveCameraPreset` 对带 `cameraPreset` 的 `VisualScene` 返回正确值；对
  `valid-minimal` 的 `vs-start`（无 `cameraPreset`）返回 `undefined`；对不存在的
  `visualSceneId` 也返回 `undefined`（不抛异常）。
- `machine.ts` 只在 `onSceneEnter` 的 `send` 调用里新增 `cameraPreset` 一行（含其条件
  表达式），`git diff` 其余内容逐字节不变；既有 `machine.test.ts`（未改动）全部测试
  仍然通过。
- `index.ts` 仅追加导出 `resolveCameraPreset`，符号可从包外导入。
- `resolveCameraPresetStyle` 对已收录/未收录/`undefined` 三种 preset 输入均返回安全
  `CameraStyle`；`pickCameraPreset`/`pickSceneEnterKey` 对无命令/有命令情形正确返回。
- `App.tsx` 追加 `key`/`transform`/`fadeIn` 动画（不要求 DOM 渲染测试，沿用先例）。
- 端到端：`createRuntimeMachine` 驱动 `valid-minimal` 到 `SCENE_ENTER`，捕获的命令含
  `cameraPreset: undefined`（`vs-start` 未设置该字段，如实反映）。

## Non-goals

不实现任何镜头运动/推拉摇移的动态参数系统（"不做镜头 DSL"）；不新增章节作者可配置的
转场类型（无 schema 支持）；不实现 BGM/SFX（DEV-027）、Presentation Command Bus 完整
基础设施（DEV-028）；不做 DOM 渲染测试；不修改 `machine.test.ts`/`visualResolution.*`/
`characterResolution.*`/`choiceResolution.*`/`interactionRegion.*`；不新增任何 npm
依赖。

## Task Order

T001 节点文档；T002 `resolveCameraPreset`（含测试）；T003 `machine.ts` CR（含端到端
验证）；T004 `index.ts` 追加导出；T005 `cameraPreset.ts` + `pickSceneMeta.ts`（含测试）；
T006 `App.tsx` 镜头/转场渲染；T007 全量验证、REPORT、DECISIONS、commit 与 NODE_REPORT。