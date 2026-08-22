# DEV-027 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-027.md` 抄录并整理，权威版本为
Task Package 原文。**第 1/2 节务必先读**：`Ports.audio` 至今仍是 no-op
（`apps/renderer` 只给 `Ports.presentation` 接了 WebSocket）。Commander 已判断：现在给
`Ports.audio` 建独立传输是抢在 DEV-032（M3，声道仲裁）之前搭一套很可能被推翻重做的
基础设施——过度设计。本节点让 BGM/环境音走已经在工作的 Presentation 通道，**不碰
`onSceneEnter` 里既有的 `audio.send(...)` 那一行**，也不改 `ports.ts`/`audioRegion.ts`。

## 架构

- **关键架构决策（第 1 节）**：BGM/SFX 是纯"进场景就放对应音效"的简单需求，不涉及
  任何声道抢占/打断逻辑，走**已经在工作、已经测试过**的 Presentation WebSocket 通道
  即可（Renderer 本来就是网页，`<audio>` 标签放在同一个页面里）。`Ports.audio` 保持
  原样不动，留给 DEV-032 未来真正需要声道仲裁时再决定怎么建。这个决策记入
  `DECISIONS.md`，不是遗漏。
- **CR（第 2.1 节）**：`onSceneEnter` 的 **Presentation** `send` 追加 `audio` 一行，
  **紧随其后的 `context.ports.audio.send({kind:'SCENE_ENTER', sceneId})`（不同的、
  独立的、本节点不碰的一行）逐字节不变**：
  ```typescript
  context.ports.presentation.send({
    kind: 'SCENE_ENTER',
    sceneId: context.currentSceneId,
    visualSceneId: scene?.visualSceneId,
    layers,
    characters,
    narration: scene?.narration ?? [],
    cameraPreset: ...,
    audio:
      context.compiled !== null && scene !== undefined
        ? resolveSceneAudio(context.compiled, scene)
        : { ambience: [] },
  });
  context.ports.audio.send({ kind: 'SCENE_ENTER', sceneId: context.currentSceneId });
  ```
- **`resolveSceneAudio`（第 2.2 节，新增 `packages/runtime-kernel/src/audioResolution.ts`）**：
  ```typescript
  export interface ResolvedAudio {
    id: string;
    file: string;
    loop?: boolean;
    gain?: number;
  }
  export function resolveSceneAudio(
    compiled: CompileResult,
    scene: SceneNode,
  ): { bgm?: ResolvedAudio; ambience: ResolvedAudio[] }
  ```
  对 `scene.bgm`（若存在）与 `scene.ambience` 数组的每个 id，在
  `compiled.schemaResult.audio.passed` 里找 `id === <目标id>` 的 `AudioAsset`。
  **防御性处理**：找不到条目、或条目是 `source==='RUNTIME_TTS'`（没有 `file`，是
  DEV-034+ TTS 管线的资产，本节点不处理语音）——一律跳过（`bgm` 场景下整个字段
  省略，`ambience` 场景下从数组剔除），不抛异常。`loop`/`gain` 原样透传（可能是
  `undefined`）。
- **Renderer（第 2.3 节）**：
  - `pickSceneAudio`：取最近一条 `SCENE_ENTER` 命令的 `audio` 字段，没有则返回
    `{ambience: []}`。
  - `App.tsx`：为 `bgm`（若存在）与每条 `ambience` 渲染 `<audio autoPlay>` 元素，
    `key={resolved.id}`（同一 `id` 跨场景不重复播放/重启，不同 `id` 触发浏览器挂载
    新 `<audio>` 从头播放）；`loop` 用 `resolved.loop ?? true`（**BGM/环境音默认
    循环播放**——Renderer 侧合理的产品默认值，作者显式设 `loop:false` 时仍被尊重）；
    `volume` 用 `resolved.gain ?? 1`（夹到 `[0,1]`，超范围数值 clamp，防御性处理）。
- **已知边界（第 2.3 节，如实记录）**：不处理 SFX 一次性音效（骰子音效、UI 反馈音
  等——这些目前没有任何 `RuntimeEvent`/`PresentationCommand` 携带"现在该放哪个 SFX"
  的信号，本节点只做场景级 BGM/环境音（`SceneNode.bgm`/`ambience`，有真实 schema
  字段支撑），真正的事件触发型 SFX 留给未来需要时再设计（大概率是另一次 CR）。

## Requirements

- `SceneNode.bgm`/`ambience` 与 `AudioAsset` 均来自 `chapter-schema`（已冻结）；
  `AudioAsset` 是判别联合：`{id, kind, loop?, gain?, source:'PREPRODUCED'|
  'PREGENERATED', file}` 或 `{id, kind, loop?, gain?, source:'RUNTIME_TTS', ttsSpec}`。
- `resolveSceneAudio` 对 `valid-minimal` 的 `scene-start` 返回
  `bgm: {id:'bgm-main', file:'assets/audio/bgm-main.mp3'}`、
  `ambience: [{id:'amb-forest', file:'assets/audio/amb-forest.mp3'}]`；手写一个引用
  `RUNTIME_TTS` 类型资产的用例验证防御性跳过；`scene.bgm` 未定义时结果不含 `bgm`
  字段。
- `machine.ts` 只在 `onSceneEnter` 的 presentation `send` 里新增 `audio` 一行，紧随
  其后的 `audio.send(...)` 一行与既有六个字段计算、其余全部 action 逐字节不变；既有
  `machine.test.ts`（未改动）全部测试仍然通过。
- `index.ts` 仅追加导出 `resolveSceneAudio` 与类型 `ResolvedAudio`，符号可从包外导入。
- `pickSceneAudio` 对无命令/有命令（含无 `bgm` 只有 `ambience`）情形均正确返回。
- `App.tsx` 追加 `<audio autoPlay loop volume>` 渲染，不删除既有逻辑（不要求 DOM 渲染
  测试，沿用先例）。
- 端到端：`createRuntimeMachine` 驱动 `valid-minimal` 到 `SCENE_ENTER`，捕获的
  presentation 命令含正确 `audio.bgm`/`audio.ambience`。

## Non-goals

不给 `Ports.audio` 建独立传输/WebSocket 通道（留给 DEV-032）；不实现事件触发型 SFX
（骰子音效、UI 反馈音等，无 schema/信号支撑）；不实现 TTS/语音朗读（
`AudioAsset.source==='RUNTIME_TTS'`，DEV-034+ 的职责）；不实现声道占用仲裁/打断逻辑
（CR-005，DEV-032）；不处理浏览器自动播放策略兼容性；不做 DOM 渲染测试；不修改
`machine.test.ts`/`visualResolution.*`/`characterResolution.*`/`choiceResolution.*`/
`cameraResolution.*`/`interactionRegion.*`/`audioRegion.*`/`ports.ts`；不新增任何 npm
依赖。

## Task Order

T001 节点文档；T002 `resolveSceneAudio`（含测试）；T003 `machine.ts` CR（含端到端验证）；
T004 `index.ts` 追加导出；T005 `pickSceneAudio`（含测试）；T006 `App.tsx` 音频渲染；
T007 全量验证、REPORT、DECISIONS、commit 与 NODE_REPORT。