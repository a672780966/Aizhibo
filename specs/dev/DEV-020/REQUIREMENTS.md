# DEV-020 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-020.md` 抄录并整理，权威版本为 Task
Package 原文（第 2 节架构设计务必先读）。

## 架构

- 包/应用边界：`packages/runtime-kernel` 保持传输无关，协议代码（服务端半 + 客户端半）全部
  放进新建应用 `apps/renderer`（`pnpm-workspace.yaml` 已声明 `apps/*`，此前未使用）。不新建
  包。
- 类型边界纪律：`apps/renderer` 里对 `@interactive-story/runtime-kernel` 的导入**必须**是
  `import type`（`verbatimModuleSyntax: true` 保证编译期完全擦除）；`wrapPresentationPort`/
  `defaultPorts` 等**值**导入只允许出现在 `src/server/` 下，客户端半（`src/ws/`、`src/App.tsx`）
  不得值导入，防止 Vite 把 `xstate`/`zod`/`node:sqlite` 传递依赖打进浏览器产物。

## Requirements

- `detectSeqGap(lastSeq, newSeq)`：`lastSeq === undefined`（首条消息）永远返回 `false`；
  否则 `newSeq !== lastSeq + 1` 即为跳空（跳号/重复/乱序均算）。
- `createWebSocketPresentationPort(wss)`：`send` 广播给全部已连接 client；`onRendererHello`
  注册一次，对每个 client 的 message 帧判定 `type === 'RENDERER_HELLO'` 时统一调用 handler
  （首连/重连同路径，CR-012）。用 DEV-012 已冻结的 `wrapPresentationPort` 组合获得
  `commandSeq` 信封与折叠状态，不重新实现。
- 客户端 `createRendererClient(socket)`：`onOpen` 即发 `{ type: 'RENDERER_HELLO' }`；
  `onMessage` 收到信封先做跳空检测，跳空时重发 `RENDERER_HELLO`（信封本身不丢弃，照常处理），
  随后更新 `getLastSeq()`。通过最小注入接口 `SocketLike` 解耦浏览器 `WebSocket` 全局。
- `App.tsx`：唯一接触浏览器 `WebSocket` 全局的位置，构造 `SocketLike` 适配器；维护"收到的
  命令"数组渲染成调试列表（`<pre>`，不画场景/角色/字幕）。
- 根配置仅三处最小改动（Task Package 2.5）：`vitest.config.ts` include 追加
  `'apps/*/src/**/*.test.ts'`；`eslint.config.js` files 追加 `'**/*.tsx'`；根 `package.json`
  typecheck 脚本末尾追加 `pnpm --filter @interactive-story/renderer run typecheck`。
  `apps/renderer` 不加入根 `tsconfig.json` references（`composite: false`、`noEmit: true`）。

## Non-goals

不实现真实场景/角色/字幕/选择/骰子/镜头/BGM UI（DEV-021～027）；不把 `vite build` 接入根
聚合 build；不引入任何前端组件测试框架、状态管理库、UI 库、`eslint-plugin-react*` 等额外
生态依赖；不做真实 OBS/Twitch 集成。

## Task Order

T001 节点文档；T002 根配置三处改动；T003 `apps/renderer` 应用脚手架；T004 `detectSeqGap`；
T005 服务端半 `createWebSocketPresentationPort`；T006 客户端半 `createRendererClient` +
`App.tsx`；T007 全量验证、REPORT、commit 与 NODE_REPORT。