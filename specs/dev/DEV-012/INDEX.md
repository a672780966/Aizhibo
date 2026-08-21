# DEV-012 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-012 — Runtime API

## Objective

冻结 M1 的第三个、也是最后一个对外契约：Presentation Command。用装饰器包装已冻结的
`PresentationPort`，增加带 `commandSeq` 的信封、从命令流折叠得到的 `PresentationState`
投影，以及统一的首连/重连 `PRESENTATION_RESYNC` 路径；不改动既有 action 代码。

## Allowed Scope

新增：

```text
packages/runtime-kernel/src/presentationCommand.ts
packages/runtime-kernel/src/presentationCommand.test.ts
```

既有文件仅追加：

```text
packages/runtime-kernel/src/ports.ts   # 仅 PresentationPort.onRendererHello?
packages/runtime-kernel/src/index.ts   # 仅公开导出
```

节点文档与通信文件：

```text
specs/dev/DEV-012/{INDEX,REQUIREMENTS,ACCEPTANCE,REPORT,DECISIONS}.md
specs/comms/LEDGER.md                  # 仅追加
specs/comms/NNNN-OPENCODE-to-*.md      # 仅自己发出的消息
```

## Read-only and Forbidden Scope

`runtime-kernel/src` 的其它既有文件、所有其它 packages、fixtures、规范正本、
PROJECT_INDEX、DAG、tasks、audit、protocol 与工具配置均未修改。不得修改冻结的 action/state
代码，不定义具体 Presentation/Audio schema，不实现 Operator、平台接口、网络传输或新增依赖。

## Task Order

- [x] T001 节点文档
- [x] T002 ports.ts 追加 onRendererHello?
- [x] T003 presentationCommand.ts：信封 + 折叠状态 + 装饰器
- [x] T004 Public exports
- [x] T005 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

—（T001–T005 全部完成，等待 AUDITOR 审核）

## Exit Criteria

六条命令全部退出码 0；`commandSeq` 严格单调；`getState()` 正确折叠；RESYNC 路径验证通过；
`ports.ts`/`index.ts` 的 diff 仅有追加；`DECISIONS.md` 已入库；REPORT.md 为
`READY_FOR_REVIEW`；已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。OpenCode 禁止自行推进下一 DEV Node。
