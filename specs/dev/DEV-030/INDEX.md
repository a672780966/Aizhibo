# DEV-030 INDEX

Status: DONE

## Current Node

DEV-030 — Audio Manifest

## Objective

首次创建 `packages/audio-engine`，定义全系统统一音频解析链（`PREGENERATED → CACHE
→ RUNTIME_TTS → SUBTITLE_ONLY`，CR-018）：纯函数 + 可注入判定端口，默认端口全部
返回"不可用"（如实反映当前无预生成/无缓存/无 TTS Provider），未来节点通过注入真实
Port 实现接入，不需要对本函数发 CR。只服务于 SPEECH（叙事旁白），BGM/SFX/AMBIENCE
已由 DEV-027 完整处理。

## Allowed Scope（新建包 + 根配置追加）

```
packages/audio-engine/package.json
packages/audio-engine/tsconfig.json
packages/audio-engine/src/resolveAudioSource.ts
packages/audio-engine/src/resolveAudioSource.test.ts
packages/audio-engine/src/index.ts
根 tsconfig.json（仅追加一条 solution 级 reference）
```

## Allowed Scope（节点文档与通信）

```
specs/dev/DEV-030/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加；0138 行开工标记 ISSUED→CLOSED 为唯一允许的原地位改）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

## Read-only Scope

```
packages/chapter-schema/**、packages/chapter-compiler/**、packages/rule-engine/**、
  packages/dice-engine/**、packages/narrative-composer/**、packages/runtime-kernel/**、
  packages/persistence/**、packages/shared/**
apps/renderer/**（本节点不涉及 Renderer，全部只读）
eslint.config.js、.prettierrc.json、vitest.config.ts、根 package.json、tsconfig.base.json
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
```

## Forbidden Scope

```
packages/* 除新建的 audio-engine 外的任何目录
apps/**（本节点不改 Renderer）
接入任何真实 TTS Provider/HTTP 调用（DEV-034/035 的职责）
接入任何真实缓存/数据库（DEV-036/持久化 的职责）
实现 PREGENERATED 目录扫描/预生成产物读取（DEV-074，M7）
把 `resolveAudioSource` 接入 `runtime-kernel` 的任何 action（本节点是纯定义，接入
  是未来 M3 节点的职责）
新增任何 npm 依赖
新建 `getHealth()`
```

## Task Order

- [x] T001 节点文档
- [x] T002 新包脚手架
- [x] T003 resolveAudioSource
- [x] T004 index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

无（节点已 DONE，接口冻结）

## Exit Criteria

六条命令全部退出码 0；四级 fallback 全部路径与优先级顺序测试通过；`DECISIONS.md`
已入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

DEV-031 — Master Audio Player（按 `specs/dev/DAG.md`；是否下发留待 `USER`/`COMMANDER`
下一轮决定）。

OpenCode 禁止自行推进下一 DEV Node。
