# DEV-058 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-058.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- `HostAvatarState`：`{ mouth: 'open'|'closed'; breathing:
  'inhale'|'exhale' }` 两个独立二元状态。
- `idleHostAvatarState`：静止默认值 `{ mouth: 'closed', breathing:
  'exhale' }`。
- CR-014 已把 Host Avatar 范围砍定为"静态 PNG + 口型/呼吸微动，无
  Live2D/VRM"。
- 不实现任何带具体时间参数的驱动/切换逻辑（USER 2026-09-07 裁决）。
- 零依赖：不 import `runtime-kernel`/`platform-core`/`renderer`/ai-host
  既有七个模块。

## Scope（Task Package 第 3 节）

Writable：`hostAvatar.ts(.test.ts)`、`index.ts`（追加）、
`specs/dev/DEV-058/*.md`、`specs/comms/LEDGER.md`（仅追加，写入不
提交）、`specs/comms/NNNN-OPENCODE-to-*.md`。

Forbidden（摘录）：不改 `platform-core`/`platform-twitch`/
`runtime-kernel`/`renderer`/ai-host 既有七个模块；不实现 Live2D/
VRM；不实现带时间参数的动画驱动逻辑；不定义真实 PNG 资源路径；不
接入 renderer/Presentation 层；不新增第三方依赖。

## Task Order

T001 节点文档 → T002 `hostAvatar.ts` + 测试 + `index.ts` 导出 +
全量验证 + REPORT + commit（**恰一条提交，LEDGER/NODE_REPORT 写入
工作区但不提交**）。M5（AI Host Complete）里程碑将在本节点 PASS
后全部 10 个节点完成。
