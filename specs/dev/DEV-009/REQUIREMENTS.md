# DEV-009 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-009.md` 抄录（Task Package 第 3/6/9/10
节），权威版本为 Task Package 原文。

## 3. Scope

### Writable Scope — 新增文件

```
packages/runtime-kernel/src/ports.ts
packages/runtime-kernel/src/ports.test.ts
packages/runtime-kernel/src/snapshot.ts
packages/runtime-kernel/src/snapshot.test.ts
packages/runtime-kernel/src/storyRegion.ts
packages/runtime-kernel/src/storyRegion.test.ts
packages/runtime-kernel/src/interactionRegion.ts
packages/runtime-kernel/src/interactionRegion.test.ts
packages/runtime-kernel/src/presentationRegion.ts
packages/runtime-kernel/src/presentationRegion.test.ts
packages/runtime-kernel/src/audioRegion.ts
packages/runtime-kernel/src/audioRegion.test.ts
packages/runtime-kernel/src/placeholderRegions.ts
packages/runtime-kernel/src/placeholderRegions.test.ts
packages/runtime-kernel/src/machine.ts
packages/runtime-kernel/src/machine.test.ts
```

### Writable Scope — 既有文件，仅追加

```
packages/runtime-kernel/package.json（追加 xstate 与 chapter-schema/chapter-compiler/
  rule-engine/dice-engine/narrative-composer 五个 dependencies）
packages/runtime-kernel/tsconfig.json（追加 references）
packages/runtime-kernel/src/index.ts（追加 export——严格遵守第 2.3 节的不透明类型原则，
  不导出内部 snapshot 结构）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-009/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md
specs/dev/DEV-009/DECISIONS.md（本节点设计决策数量很大，必须创建且写详细）
specs/dev/DEV-009/BLOCKERS.md（仅在需要时创建）
根 tsconfig.json（若发现 references 缺失才追加，通常已存在）
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/runtime-kernel/src/event.ts、diceEvent.ts（及其 .test.ts）——DEV-008 冻结，不改
packages/chapter-schema/**、packages/chapter-compiler/**、packages/rule-engine/**、
  packages/dice-engine/**、packages/narrative-composer/**、packages/shared/**
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
tsconfig.base.json、eslint.config.js、.prettierrc.json、vitest.config.ts
```

### Forbidden Scope

```
packages/* 除 runtime-kernel 外的任何目录
apps/**、chapters/**、assets/**、scripts/**、tools/**
tests/integration/**、tests/simulation/**、tests/replay/**、tests/soak/**
任何数据库文件 / migration、任何真实网络调用
Math.random()、裸 Date.now()（必须经 ClockPort）
真实的 Renderer/Audio/Twitch/AI Host 接入代码（M2/M3/M4/M5 均未建）
SQLite 或任何持久化实现（DEV-010）
Replay 校验逻辑（DEV-011）
对外 HTTP/IPC API（DEV-012）
`index.ts` 导出内部 snapshot 结构类型（违反第 2.3 节不透明类型原则）
```

## 6. Outputs

1. `ClockPort`/`PlatformPort`/`PresentationPort`/`AudioPort` 接口 + 默认实现
2. 不透明 `RuntimeSnapshot` 类型 + 具名访问器
3. STORY / INTERACTION 两个 Region 的完整状态机（含真实转移逻辑）
4. PRESENTATION / AUDIO 两个 Region 的状态骨架（无真实 IO 接入）
5. HOST / PLATFORM / SAFETY 三个占位 Region
6. `createRuntimeMachine(input: { ports?: Partial<Ports>; chapterRootDir: string; seed: string }): ...` 顶层机器构造函数
7. `specs/dev/DEV-009/DECISIONS.md`，详细记录第 2 节的全部架构决策

## 9. Constraints

1. **不透明 Snapshot 原则**：`index.ts` 绝不导出能让外部直接结构化访问内部字段的类型，只导出品牌类型 + 具名访问器。
2. **确定性**：机器内部不得出现裸 `Date.now()`/`Math.random()`，一切"现在几点"走 `ClockPort`。
3. **IO 全部可替换**：四个 Port 必须能在构造机器时被完全替换，默认值只是"不接真实系统"的占位，不是唯一实现路径。
4. **DICE 事件节奏是简化版**：本节点不实现"等待动画播完才发 PUBLISHED"，两个事件在同一次转移里依次产出，真实节奏控制留给 DEV-037。此简化必须记入 `DECISIONS.md`。
5. **不定义 Presentation/Audio 具体命令 schema**——那是 DEV-028/030 的职责，本节点的 Port 参数类型保持宽松占位。
6. **既有文件仅追加**（`package.json`/`tsconfig.json`/`index.ts`，只加不改）。
7. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
8. `CR-019`（getHealth 自落地起）**从本节点起适用**——最低要求：机器结构要能回答"当前 STORY 相位、是否卡在 ERROR"，由访问器满足；不新建 `getHealth()` 体系（留给 DEV-061）。
9. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

## 10. Non-goals / Out-of-scope

- 不实现真实的 SQLite 持久化（DEV-010）。
- 不实现"从 Event Log 重放重建状态并验证一致"的逻辑（DEV-011）——只保证 Event Log 本身单调递增、内容完整，不做重放验证。
- 不实现对外 HTTP/IPC API（DEV-012）。
- 不定义 Presentation/Audio 的具体命令 schema（DEV-028/030）。
- 不实现 Dice Buffer 的节奏/等待逻辑（DEV-037）——DICE 事件产出是简化的"立即依次发出"版本。
- 不实现 HOST/PLATFORM/SAFETY 的任何真实行为（M4/M5/M6）。
- 不接入真实 Twitch/Renderer/音频系统。
- 不创建真实产品内容。
- 不新建 `getHealth()` 健康检查体系（过度设计，留给 DEV-061 统一规划）。