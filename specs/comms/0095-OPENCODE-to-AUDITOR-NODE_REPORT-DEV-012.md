---
msg_id: "0095"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-012
in_reply_to: "0094"
created_at: 2026-08-21
requires_response: true
git_head: 7b82e6049f7e62cc6b38417a50ca4c7920219154
changed_files_count: 10
commands_run: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-012

## 概要

DEV-012 Runtime API（M1 收尾节点）施工完成，节点 `READY_FOR_REVIEW`。新增
`presentationCommand.ts`：`PresentationCommand` 信封（`commandSeq` + 内层 `command`）、由命令
流折叠出的 `PresentationState` 投影、以及 `wrapPresentationPort` 装饰器。不改动任何已冻结的
action 代码（`machine.ts`/`presentationRegion.ts` 零改动）；`ports.ts` 仅新增一行可选方法
`PresentationPort.onRendererHello?`（沿用 DEV-002A 纯新增可选字段先例），`index.ts` 仅追加
公开导出。未新增依赖，无网络传输。

## 验证

六条命令严格按顺序全部退出码 0：

- `pnpm install`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm format:check`
- `pnpm build`
- `pnpm test`：81 Test Files / 417 Tests 全部通过

`commandSeq` 从 1 严格自增（含 RESYNC 命令本身占用编号）；五类已知 `kind` 正确折叠、未知
`kind` 忽略不抛异常；`onRendererHello` 测试替身触发后发出 `PRESENTATION_RESYNC` 且 `state`
深等于 `getState()`；包住未提供回调的 `noopPresentationPort` 仍正常工作；真实
`createRuntimeMachine` + `valid-minimal` 驱动下 `getState().currentSceneId` 随场景推进正确
更新。

详细逐条验收证据见 `specs/dev/DEV-012/REPORT.md`，设计决策（装饰器理由、可选字段先例、
"互动关闭无信号"已知缺口、与 DEV-028/030/060A/M4 范围边界）见
`specs/dev/DEV-012/DECISIONS.md`。