# DEV-030 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-030.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- **本节点只"定义解析链"，不接入任何真实 TTS/缓存/预生成**：`resolveAudioSource`
  是纯函数，接受四个来源各自能否命中的注入判定（Ports 模式）。默认实现
  `noopAudioResolutionPorts` 全部返回"不可用"——单独运行时任何请求 fallthrough 到
  `SUBTITLE_ONLY`，这是正确的当前行为。DEV-034/035/036 未来组合新 Port 接入，
  **不需要对本函数发 CR**。
- **只服务于 SPEECH**：BGM/SFX/AMBIENCE 已由 DEV-027 的 `resolveSceneAudio` 完整
  处理，不在本节点范围。
- **四级决策链**（CR-018）：`PREGENERATED → CACHE → RUNTIME_TTS → SUBTITLE_ONLY`
  ——顺着链条第一个命中就停，不做"最优选择"。`RUNTIME_TTS` 命中无 `file`
  （实际调用 TTS 是 DEV-034/035 的职责）。
- **不依赖 `chapter-schema`**：`AudioResolutionRequest` 用通用字段，未来接入点自己
  负责 `NarrativeBlock → AudioResolutionRequest` 映射。
- **不新建 `getHealth()`**：纯函数库无真实 IO，`CR-019` 不适用（同 chapter-schema、
  dice-engine 先例）。
- **拼接听感验证不在本节点做**：需要真实 TTS 输出，DEV-034 尚未建，如实记入
  DECISIONS Non-goals。

## Scope（Task Package 第 3 节）

Writable — 新建包：

```
packages/audio-engine/package.json
packages/audio-engine/tsconfig.json
packages/audio-engine/src/resolveAudioSource.ts
packages/audio-engine/src/resolveAudioSource.test.ts
packages/audio-engine/src/index.ts
```

Writable — 根配置（追加式）：根 `tsconfig.json` 仅追加一条 reference。

Writable — 节点文档与通信：

```
specs/dev/DEV-030/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

Forbidden（摘录）：不接真实 TTS/缓存/预生成读取；不接入 runtime-kernel 任何 action；
不新增 npm 依赖；不新建 `getHealth()`；不改 `apps/**` 与既有 `packages/*`。

## Task Order

T001 节点文档 → T002 新包脚手架 → T003 `resolveAudioSource` + 测试 → T004 index.ts
导出 + 全量验证 + REPORT + commit + NODE_REPORT。
