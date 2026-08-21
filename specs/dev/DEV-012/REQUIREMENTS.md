# DEV-012 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-012.md` 抄录并整理，权威版本为 Task
Package 原文。

## Scope

在 `packages/runtime-kernel` 新增 `presentationCommand.ts` 与 `presentationCommand.test.ts`；
仅追加 `ports.ts` 的 `PresentationPort.onRendererHello?` 可选方法与 `index.ts` 的公开导出。
不得修改任何已冻结的 action/state 代码，不得新增依赖，不得定义具体 Presentation schema。

## Requirements

- `wrapPresentationPort(inner)` 返回 `SequencedPresentationPort`：`send(command)` 从 1 起严格
  自增 `commandSeq`（含 RESYNC 命令本身），套上 `{ commandSeq, command }` 信封后转发。
- `getState()` 从"目前为止收到的命令流"折叠出 `PresentationState`（`phase`/`currentSceneId`/
  `lastResultText`），只读投影、不得另存第二份真相；未知 `kind` 忽略不抛异常。
- `inner.onRendererHello?.(handler)` 注册后，handler 触发时经同一 `send` 路径发出
  `{ kind: 'PRESENTATION_RESYNC', state: getState() }`，编号自然延续。
- `ports.ts` 只追加一行可选方法签名 `onRendererHello?(handler: () => void): void;`，
  `noopPresentationPort` 不改动仍结构兼容。
- `index.ts` 追加导出 `wrapPresentationPort` 与 `PresentationCommand`/
  `PresentationState`/`SequencedPresentationPort` 三个类型。

## Task Order

T001 节点文档；T002 `ports.ts` 追加 `onRendererHello?`；T003 信封 + 折叠状态 + 装饰器；
T004 Public exports；T005 全量验证、报告、提交与 NODE_REPORT。