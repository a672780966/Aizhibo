# DEV-060A REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-060A.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- `packages/ai-host/src/hostPermission.ts`（新文件）：
  `HostPermissionState = 'ALLOWED'|'MUTED'`、`HostPermissionStore`、
  `createHostPermissionStore(initial?)`，与 DEV-053 `hostMood.ts`
  同构，零依赖。
- 新建 `packages/operator-api` 包：
  - `operatorActions.ts`：11 个字面量 `OperatorAction`、
    `ALL_OPERATOR_ACTIONS`、`isOperatorAction`、
    `OperatorActionResult`。
  - `operatorAuth.ts`：`OperatorAuthPort`、
    `noopOperatorAuthPort`（未配置默认**拒绝**）、
    `createOperatorAuthProvider`、
    `createOptionalOperatorAuthProvider(env)`。
  - `operatorOverrideLog.ts`：`appendOperatorOverrideEvent` 直接
    构造 `RuntimeEvent`（`type:'OPERATOR_OVERRIDE'`,
    `visibility:'HIDDEN'`）并通过 `@interactive-story/persistence`
    的 `appendEvents` 落库（旁路 `RuntimeActor.send()`）。
  - `operatorDispatch.ts`：`dispatchOperatorAction` 是全部 11 个
    action 唯一入口，`MUTE_HOST`/`UNMUTE_HOST`/`RESTORE_LKG` 真实
    生效，其余 8 个诚实返回 `ok:false` + 具体原因；无论结果如何都
    无条件追加一条 `OPERATOR_OVERRIDE` 事件。
  - `operatorHttpServer.ts`：`node:http`（零新增依赖）单路由
    `POST /operator/action`，Bearer token 鉴权，JSON body。
- 根 `tsconfig.json` 追加 `{ "path": "./packages/operator-api" }`。

## 核心范围裁决（USER 2026-09-07）

11 个 action 中只有 3 个（`Restore LKG`/`Mute Host`/`Unmute Host`）
有真实可调用目标；其余 8 个因 `runtime-kernel`（M1 起冻结）没有
对应 `RootEvent`，或 `SAFETY`/OBS 子系统根本不存在（占位/未建成），
**本节点不发 CR 改冻结接口、不发明真实 SAFETY/OBS 逻辑，诚实占位**
——handler 返回 `ok:false` + 具体原因，不假装生效。

## Scope（Task Package 第 3 节）

Writable：见 `INDEX.md` Allowed Scope 逐条。

Forbidden（摘录）：不改 `platform-core`/`platform-twitch`/
`runtime-kernel`/`renderer`/ai-host 既有 8 个模块；不实现真实
SAFETY/OBS 逻辑；不新增 `RootEvent` 变体；不实现"热替换进程"；
不新增第三方依赖；8 个未接通 action 不得返回 `ok:true`。

## Task Order

T001 节点文档 → T002 基础原语（`hostPermission.ts` +
`operator-api` 包骨架：actions/auth/override log）→ T003
`operatorDispatch.ts` + `operatorHttpServer.ts` + 全量验证 +
REPORT + commit（**恰一条提交，LEDGER/NODE_REPORT 写入工作区但不
提交**）。
