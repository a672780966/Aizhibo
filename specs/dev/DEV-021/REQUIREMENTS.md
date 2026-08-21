# DEV-021 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-021.md` 抄录并整理，权威版本为 Task
Package 原文。**第 2 节务必先读**：本节点包含一次对 DEV-009 已冻结的 `onSceneEnter`
action 的**正式 Change Request**（不是追加）。

## 架构

- 「Renderer 不维护剧情」原则（Dev Spec 第 35 节）：`apps/renderer` **不能**自己读章节
  文件、自己查 `visualSceneId → VisualScene → layers → ImageAsset.file` 这条解析链——
  那是剧情/内容知识，必须由 Runtime 解析好，通过 `PresentationCommand` 原样交给
  Renderer 渲染。因此解析链的正确位置是 Runtime（`machine.ts` 的 `onSceneEnter`，本来就
  持有 `context.compiled`）。
- CR（第 2.2 节）：`onSceneEnter` 的 `SCENE_ENTER` 命令载荷从占位
  `{ kind, sceneId }` 丰富为 `{ kind, sceneId, visualSceneId, layers }`。**只改这一个
  action 的这一处调用**，`audio.send` 那一行、`storyMove` 返回值、其余全部 action 一律
  不动，git diff 会逐行核对。
- `resolveVisualLayers`（新增纯函数，`visualResolution.ts`，第 2.3 节）：在
  `compiled.schemaResult.visuals.passed` 里找 `id === visualSceneId` 且 `'layers' in
  value` 的条目（`VisualScene`）；对它的每个 `layer`，再找 `id === layer.assetId` 且
  `'file' in value` 的条目（`ImageAsset`），组装成 `ResolvedVisualLayer`。防御性处理：
  找不到 `VisualScene` 本身返回 `[]`；某个 `layer` 找不到对应 `ImageAsset` 时跳过该层
  （不抛异常，不中断其余层的渲染）。
- `composeLayers`（`apps/renderer/src/render/composeLayers.ts`，第 2.4 节）：按 `z` 升序
  排序（底层先渲染），透传 `assetId`/`file`/`parallax`。**不做真实视差动画计算**
  （parallax 数值原样传递，真正的镜头/视差运动是 DEV-026 的职责，本节点只保证数据不丢）。
- `App.tsx` 追加：收到 `kind === 'SCENE_ENTER'` 的命令时，取出 `layers` 字段，跑
  `composeLayers`，渲染成一组按 `zIndex` 定位的 `<img>`（`src={file}`），与既有的
  `<pre>` 调试 JSON 并存。

## Requirements

- `ResolvedVisualLayer { assetId: string; file: string; z: number; parallax?: number }`；
  `resolveVisualLayers(compiled: CompileResult, visualSceneId: string): ResolvedVisualLayer[]`。
- `RenderableLayer { assetId: string; file: string; zIndex: number; parallax?: number }`；
  `composeLayers(layers: ResolvedVisualLayer[]): RenderableLayer[]`，按 `z` 升序排序；
  `parallax` 未提供时不出现在结果对象里（`exactOptionalPropertyTypes` 一致性）。
- 端到端：`createRuntimeMachine` 驱动 `valid-minimal` 到 `SCENE_ENTER`，捕获的
  presentation 命令 `kind === 'SCENE_ENTER'` 且含 `visualSceneId: 'vs-start'`、`layers`
  与 T002 的返回值一致。
- `index.ts` 仅追加导出 `resolveVisualLayers` 与类型 `ResolvedVisualLayer`；符号可从包外
  导入。
- `App.tsx` 仅追加，不删除 DEV-020 既有调试列表/HELLO 相关代码；抽纯函数
  `pickSceneLayers(commands): RenderableLayer[]` 配测试验证（不要求 DOM 渲染测试，与
  DEV-020 先例一致）。

## Non-goals

不实现真实静态资源服务（图片加载不出来是预期行为——`file` 是 Chapter Pack 内相对路径，
真实资源服务是 DEV-075/部署管线的职责，如实记入 `DECISIONS.md`）；不实现角色渲染
（DEV-022）、字幕/对话框（DEV-023）、选择 UI（DEV-024）、骰子 UI（DEV-025）、镜头/视差
动画（DEV-026）；不做 DOM 渲染测试；不修改 `machine.test.ts`（已核实无需修改，保持
Read-only）；不处理场景切换时的过渡动画/淡入淡出；不新增任何 npm 依赖。

## Task Order

T001 节点文档；T002 `resolveVisualLayers`（含测试）；T003 `machine.ts` CR（含端到端验证，
测试落在 `visualResolution.test.ts`）；T004 `index.ts` 追加导出；T005 `composeLayers`
（含测试）；T006 `App.tsx` 场景层渲染（含 `pickSceneLayers` 纯函数测试）；T007 全量验证、
REPORT、DECISIONS、commit 与 NODE_REPORT。