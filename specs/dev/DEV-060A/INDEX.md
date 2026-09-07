# DEV-060A INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-060A — Operator API

## Objective

新建 `packages/operator-api`：11 个 Operator Action 的端点/鉴权/
`OPERATOR_OVERRIDE` 审计落库（第 53-54 节）。CR-013 已批准把 DEV-060
拆为本节点（Operator API，优先）与 DEV-060B（Console UI，后置）。
11 个 action 中只有 `Restore LKG`/`Mute Host`/`Unmute Host` 三个有
真实可调用目标，其余 8 个因目标子系统不存在（`runtime-kernel` 冻结
无对应 `RootEvent`；`SAFETY`/OBS 均是占位/不存在）而诚实占位，不
发 CR、不假装生效（USER 2026-09-07 已就此裁决）。

## Allowed Scope

```
packages/ai-host/src/hostPermission.ts        （新增）
packages/ai-host/src/hostPermission.test.ts   （新增）
packages/ai-host/src/index.ts                 （追加一行导出）
packages/operator-api/package.json            （新增）
packages/operator-api/tsconfig.json           （新增）
packages/operator-api/src/index.ts            （新增）
packages/operator-api/src/operatorActions.ts       （新增）
packages/operator-api/src/operatorActions.test.ts  （新增）
packages/operator-api/src/operatorAuth.ts          （新增）
packages/operator-api/src/operatorAuth.test.ts     （新增）
packages/operator-api/src/operatorOverrideLog.ts       （新增）
packages/operator-api/src/operatorOverrideLog.test.ts  （新增）
packages/operator-api/src/operatorDispatch.ts       （新增）
packages/operator-api/src/operatorDispatch.test.ts  （新增）
packages/operator-api/src/operatorHttpServer.ts       （新增）
packages/operator-api/src/operatorHttpServer.test.ts  （新增）
tsconfig.json                                  （根，追加一条 references 条目）
specs/dev/DEV-060A/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

## Read-only Scope

```
packages/ai-host/src/egressGate.ts、commentPipeline.ts、hostPersona.ts、hostMood.ts、hostScheduler.ts、hostLLMProvider.ts、hostTtsProvider.ts、hostAvatar.ts（Read-only，不 import）
packages/persistence/**、packages/runtime-kernel/**（Read-only，只按既有导出调用）
```

## Forbidden Scope

```
修改 packages/platform-core/**、packages/platform-twitch/**、packages/renderer/**
修改 packages/runtime-kernel/** 的任何文件
修改 packages/ai-host/src/egressGate.ts、commentPipeline.ts、hostPersona.ts、hostMood.ts、hostScheduler.ts、hostLLMProvider.ts、hostTtsProvider.ts、hostAvatar.ts
实现 SAFETY region 的任何真实状态转换逻辑
实现任何真实 OBS 集成
实现任何"热替换正在运行进程里的 RuntimeActor"的机制
新增第三方 npm 依赖
让 8 个未接通的 action 返回 ok:true 或产生任何真实副作用
```

## Task Order

- [x] T001 节点文档
- [x] T002 hostPermission.ts + operator-api 包骨架（actions/auth/override log）
- [x] T003 operatorDispatch.ts + operatorHttpServer.ts + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T003（已完成，READY_FOR_REVIEW）

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与
NODE_REPORT 消息文件已写入工作区但**未提交**。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
