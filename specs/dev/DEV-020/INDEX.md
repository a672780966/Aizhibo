# DEV-020 INDEX

Status: DONE（接口冻结，`verdict_ref: "0100"`，`git_head` `8788347a92cbfba752de2102b0dd626d2a15a5c6`）

## Current Node

DEV-020 — Renderer Shell

## Objective

新建 `apps/renderer`（React + Vite + WebSocket），实现 Runtime ↔ Renderer 的 localhost
WebSocket 连接：服务端半用 `ws` 包装已冻结的 `wrapPresentationPort` 提供真实
`PresentationPort` 实现；客户端半做 `RENDERER_HELLO` 握手与 `commandSeq` 跳空检测。只做
管道，不做真实场景/角色渲染。

## Allowed Scope（新建应用）

```
apps/renderer/package.json
apps/renderer/tsconfig.json
apps/renderer/vite.config.ts
apps/renderer/index.html
apps/renderer/src/main.tsx
apps/renderer/src/App.tsx
apps/renderer/src/App.test.ts（若用纯逻辑测试即可覆盖 App 行为，无需渲染 DOM 组件测试）
apps/renderer/src/ws/seqGap.ts
apps/renderer/src/ws/seqGap.test.ts
apps/renderer/src/ws/client.ts
apps/renderer/src/ws/client.test.ts
apps/renderer/src/server/wsServer.ts
apps/renderer/src/server/wsServer.test.ts
```

## Allowed Scope（根配置，仅限三处）

```
vitest.config.ts   （仅追加一个 include 数组元素）
eslint.config.js   （仅把 files 数组加一个 '**/*.tsx'）
package.json       （仅在 typecheck 脚本末尾追加一步）
```

## Read-only Scope

```
packages/**（全部，含 runtime-kernel——本节点只读它的公开导出，不做任何追加式扩展）
tsconfig.json、tsconfig.base.json——本节点不需要改，不动
.prettierrc.json、.prettierignore
pnpm-workspace.yaml（已包含 apps/*，无需改动）
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
```

## Forbidden Scope

```
packages/* 下任何文件的修改
根 tsconfig.json（不得把 apps/renderer 加入 references——见 Task Package 2.5 节理由）
根 package.json 的 build/lint/format/format:check/test 脚本本体（只许动 typecheck 一行）
真实的场景/角色/字幕/选择/骰子 UI 渲染（DEV-021～025 的职责）
eslint-plugin-react/eslint-plugin-react-hooks/react-router 等额外前端生态依赖
把 vite build 接入根聚合 build 脚本
真实的 Twitch/OBS 集成
```

## Task Order

- [x] T001 节点文档
- [x] T002 根配置三处改动
- [x] T003 apps/renderer 应用脚手架
- [x] T004 detectSeqGap
- [x] T005 服务端半：createWebSocketPresentationPort
- [x] T006 客户端半：createRendererClient + App.tsx
- [x] T007 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T007 已完成。`AUDITOR` 独立审计 `AUDIT_PASS`（消息 0100，A01–A19 全部 VERIFIED/PASS，0 BLOCKING），
`COMMANDER` 裁决 PASS（消息 0101）。节点 `DONE`，接口冻结。

## Exit Criteria

六条命令全部退出码 0；真实 WebSocket server+client 集成测试通过（HELLO→RESYNC，
commandSeq 连续）；跳空检测测试通过；根配置三处改动的 git diff 均为最小追加；
`DECISIONS.md` 已入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；已向 AUDITOR 发出
NODE_REPORT。

## Next Node

DEV-021（Scene Renderer），在已冻结的 `apps/renderer` Shell 之上追加式扩展。

OpenCode 禁止自行推进下一 DEV Node。