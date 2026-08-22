# DEV-031 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-031.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- **本节点把 DEV-030 冻结的 `resolveAudioSource` 接入 Runtime**，接入点是唯一
  已经端到端产出真实叙事文本的路径：Result 叙事（`onResolve` 计算 `narrationText`
  + `onResultPlaying` 下发 `RESULT_PLAYING`）。Chapter Intro/Boss/Ending 类
  Master Audio 内容目前没有任何叙事发射代码，本节点不实现它们（发明新逻辑属于
  超出范围）。
- **新增纯函数 `resolveResultAudio`**（`packages/runtime-kernel/src/resultAudioResolution.ts`）：
  `resolved.length === 0` 或 `text === ''` → `undefined`；否则用
  `resolved` 原顺序拼接 `narrativeId` 得到 `contentId`（不排序——顺序影响合成
  文本，因此也必须影响缓存 key），`voiceId` 固定 `'narrator-default'`、
  `voiceSettings` 固定 `{}`（占位符，见 DECISIONS），调用
  `resolveAudioSource` 并原样返回。
- **`Ports` 追加 `audioResolution: AudioResolutionPorts` 字段**（追加式，向后
  兼容），`defaultPorts.audioResolution = noopAudioResolutionPorts`。`Ports.audio`/
  `noopAudioPort`/`audioRegion.ts` 不受影响，仍留给 DEV-032。
- **两处 CR**（precedent: DEV-025）：`onResolve` 计算并存入 `context.resultAudio`；
  `onResultPlaying` 把 `context.resultAudio` 放进 `RESULT_PLAYING` 命令的 `audio`
  字段。其余全部 action 逐字节不动。
- **`presentationCommand.ts` 的 `foldState` 不需要改**——历次 SCENE_ENTER CR 的
  新增字段同样未被纳入 RESYNC 快照，本次遵循同一先例。
- **Renderer**：新增 `pickResultAudio.ts`（防御性映射，仿 `pickSceneAudio.ts`），
  `App.tsx` 追加一个不 loop 的 `<audio>` 元素，仅当 `source` 为
  `PREGENERATED`/`CACHE` 且 `file` 存在时渲染；key 复用既有 `dialogue.key`。
  不新增 Renderer 的 workspace 依赖（类型经 `runtime-kernel/index.ts` 透传）。

## Scope（Task Package 第 3 节）

Writable：

```
packages/runtime-kernel/package.json / tsconfig.json（各追加一行）
packages/runtime-kernel/src/ports.ts / ports.test.ts
packages/runtime-kernel/src/resultAudioResolution.ts / .test.ts（新增）
packages/runtime-kernel/src/machine.ts（仅两处）/ machine.test.ts（追加）
packages/runtime-kernel/src/index.ts（追加导出）
apps/renderer/src/render/pickResultAudio.ts / .test.ts（新增）
apps/renderer/src/App.tsx（仅追加）
specs/dev/DEV-031/*.md
specs/comms/LEDGER.md（仅追加）、specs/comms/NNNN-OPENCODE-to-*.md
```

Forbidden（摘录）：不改 `audio-engine/**`；`machine.ts` 不改两处之外的 action；不接
AUDIO region/`Ports.audio`；不实现 Chapter Intro/Boss/Ending；不实现真实 TTS/缓存/
预生成扫描；不实现多角色配音；不新增除 audio-engine 外依赖；不新建 `getHealth()`。

## Task Order

T001 节点文档 → T002 依赖声明+Ports 字段 → T003 `resolveResultAudio` → T004
`machine.ts` 两处 CR + 集成测试 → T005 `index.ts` 导出 + Renderer → T006 全量验证 +
REPORT + commit + NODE_REPORT。
