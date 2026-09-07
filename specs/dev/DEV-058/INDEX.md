# DEV-058 INDEX

Status: IN_PROGRESS

## Current Node

DEV-058 — Host Avatar

## Objective

新增 `packages/ai-host/src/hostAvatar.ts`：`HostAvatarState`（口型
`mouth: 'open'|'closed'` + 呼吸 `breathing: 'inhale'|'exhale'`
两个独立二元状态）+ `idleHostAvatarState` 静止默认值。CR-014 已把
Host Avatar 范围砍定为"静态 PNG + 口型/呼吸微动，无 Live2D/VRM"，
本节点只定义状态形状，不实现任何带具体时间参数的驱动/切换逻辑
（USER 2026-09-07 已就此裁决），不接入 renderer/Presentation 层。

## Allowed Scope

```
packages/ai-host/src/hostAvatar.ts        （新增）
packages/ai-host/src/hostAvatar.test.ts   （新增）
packages/ai-host/src/index.ts             （追加导出）
specs/dev/DEV-058/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
packages/ai-host/src/egressGate.ts、commentPipeline.ts、hostPersona.ts、hostMood.ts、hostScheduler.ts、hostLLMProvider.ts、hostTtsProvider.ts（Read-only，不 import）
其余同既有节点惯例
```

## Forbidden Scope

```
修改 packages/platform-core/**、packages/platform-twitch/**、packages/runtime-kernel/**、packages/renderer/**、packages/ai-host/src/egressGate.ts、commentPipeline.ts、hostPersona.ts、hostMood.ts、hostScheduler.ts、hostLLMProvider.ts、hostTtsProvider.ts
实现任何带具体时间参数的动画驱动/状态切换逻辑
实现 Live2D/VRM 相关任何功能
定义任何真实 PNG 资源文件路径/加载逻辑
接入 renderer/Presentation 层
新增第三方 npm 依赖
创建除 ai-host 内文件外的任何新包
```

## Task Order

- [ ] T001 节点文档
- [ ] T002 hostAvatar.ts + 测试 + index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与
NODE_REPORT 消息文件已写入工作区但**未提交**。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定——**M5（AI Host
Complete）里程碑将在本节点 PASS 后全部 10 个节点完成**。

OpenCode 禁止自行推进下一 DEV Node。
