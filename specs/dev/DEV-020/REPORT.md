# DEV-020 REPORT

## Status

READY_FOR_REVIEW

## Implemented

- T001–T007 completed.
- `apps/renderer`（`@interactive-story/renderer`，React 19 + Vite 8 + `ws`）首次落地：服务端半
  `src/server/wsServer.ts` 用 `ws` 实现真实 `PresentationPort`（广播 send + `RENDERER_HELLO`
  路由）；客户端半 `src/ws/` 实现 `detectSeqGap` 纯函数与 `createRendererClient`（SocketLike
  最小注入接口解耦浏览器 WebSocket 全局）；`src/App.tsx` 唯一接触 `WebSocket` 全局，
  `RENDERER_HELLO` 握手 + 跳空重连 + 命令调试列表。
- `commandSeq` 信封与折叠状态**不重新实现**：集成测试组合 DEV-012 已冻结的
  `wrapPresentationPort(createWebSocketPresentationPort(wss))` 验证完整管道（A11）。
- 根配置三处最小改动（D5 逐项理由）：`vitest.config.ts` include 追加 `apps/*` glob、
  `eslint.config.js` files 追加 `**/*.tsx`、根 `package.json` typecheck 追加第三步。
  `apps/renderer` 独立于根 composite 引用图（`composite: false` + `noEmit: true`）。
  `packages/**` 全程只读，零 diff（A13）。

## Changed Files

```text
apps/renderer/package.json
apps/renderer/tsconfig.json
apps/renderer/vite.config.ts
apps/renderer/index.html
apps/renderer/src/main.tsx
apps/renderer/src/App.tsx
apps/renderer/src/App.test.ts
apps/renderer/src/ws/seqGap.ts
apps/renderer/src/ws/seqGap.test.ts
apps/renderer/src/ws/client.ts
apps/renderer/src/ws/client.test.ts
apps/renderer/src/server/wsServer.ts
apps/renderer/src/server/wsServer.test.ts
vitest.config.ts
eslint.config.js
package.json
pnpm-lock.yaml
specs/dev/DEV-020/INDEX.md
specs/dev/DEV-020/REQUIREMENTS.md
specs/dev/DEV-020/ACCEPTANCE.md
specs/dev/DEV-020/REPORT.md
specs/dev/DEV-020/DECISIONS.md
specs/comms/LEDGER.md
```

`pnpm-lock.yaml` 随 `pnpm install` 引入新依赖（react/vite/ws 族，12 增 3 删）自然更新；
根 `tsconfig.json`、`packages/**`、治理/规范文件全部零改动。

## Tests Executed

六条命令严格按要求顺序执行：

| Command | Exit code | Result |
|---|---:|---|
| `pnpm install` | 0 | PASS; 12 packages added, 3 removed |
| `pnpm typecheck` | 0 | PASS; `tsc -b && tsc -b --noEmit` + 第三步 renderer 独立 typecheck |
| `pnpm lint` | 0 | PASS; `eslint .`，`apps/renderer` 的 2 个 `.tsx` 文件被实际 lint |
| `pnpm format:check` | 0 | PASS; 全部文件 Prettier 风格 |
| `pnpm build` | 0 | PASS; `tsc -b`，仍只构建库图，未接入 `vite build` |
| `pnpm test` | 0 | PASS; 85 Test Files / 432 Tests（apps/renderer 新增 4 文件/15 条，既有 81 文件/417 条零回归） |

额外冒烟验证（不计入六条命令）：`pnpm --filter @interactive-story/renderer run build`
（`vite build`）退出码 0——验证 React 插件链/产物可构建；产物 `apps/renderer/dist/` 已被
.gitignore 忽略，不入库。

## Acceptance Results

| # | Result | Evidence |
|---|---|---|
| A01 | PASS | `pnpm install` exit code 0 |
| A02 | PASS | `pnpm typecheck` exit code 0：三步全过（含新追加的 renderer 独立检查步骤） |
| A03 | PASS | `pnpm lint` exit code 0；`eslint .` 覆盖 `apps/renderer` 的 `main.tsx`/`App.tsx` 两个 `.tsx` 文件 |
| A04 | PASS | `pnpm format:check` exit code 0，All matched files use Prettier code style |
| A05 | PASS | `pnpm build` exit code 0（`tsc -b`，仍只构建库图，`vite build` 未接入根聚合） |
| A06 | PASS | `pnpm test` exit code 0：85 files / 432 tests；既有 81/417 零回归，apps/renderer 4 个新测试文件被实际跑到 |
| A07 | PASS | 三文件 git diff 均为第 2.5 节描述的最小追加（`vitest.config.ts` include +1 元素、`eslint.config.js` files +`'**/*.tsx'`、根 `package.json` typecheck 末尾 +1 步） |
| A08 | PASS | 根 `tsconfig.json` 无 diff，`apps/renderer` 未加入 references |
| A09 | PASS | grep 核实 `src/ws/client.ts`、`src/App.tsx`（及客户端测试）对 `runtime-kernel` 全部为 `import type`；值导入仅存在于 `src/server/` |
| A10 | PASS | `seqGap.test.ts` 5 条：首条 `undefined` 永不算跳空 / 连续 / 跳号 / 重复 / 乱序 |
| A11 | PASS | `wsServer.test.ts` 真实 `ws.WebSocketServer`(port 0) + 真实 `ws` client：HELLO→`PRESENTATION_RESYNC` seq 1，`wrapPresentationPort(...).send(...)` 后 seq 2 连续不跳号；第二条验证 RESYNC 携带当前折叠状态且 RESYNC 自身占号 |
| A12 | PASS | `client.test.ts`：跳空触发额外 HELLO 重发且 lastSeq 照常更新、onCommand 全量送达（信封不丢弃）；乱序同样触发；非 JSON 帧忽略 |
| A13 | PASS | `packages/**` git diff 为空 |
| A14 | PASS | 新增依赖仅 `react`/`react-dom`/`ws`（19.2.8/19.2.8/8.21.3）+ `@types/react`/`@types/react-dom`/`@types/ws` + `vite` 8.2.2/`@vitejs/plugin-react` 6.1.0 + `workspace:*` 自有库链接；无任何额外前端生态库 |
| A15 | PASS | `DECISIONS.md` 存在并覆盖全部要点（D1 包边界 / D2 类型纪律 / D4 composite / D5 根配置三项 / D6 全量 RESYNC 理由，另含 D3/D7/D8/D9/D10） |
| A16 | PASS | `specs/dev/DEV-020/` 五份文档齐全（含已入库的 `DECISIONS.md`），`INDEX.md` T001–T007 全部勾选 |
| A17 | PASS | `git log` 新增恰 1 条提交，首行 `DEV-020: renderer shell`；提交时 `git status --porcelain` 为空 |
| A18 | PASS | LEDGER 0099 `NODE_REPORT-DEV-020` 记录 `git_head` 与提交一致 |
| A19 | PASS | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均无 diff |

## Scope Deviations

NONE。`App.test.ts` 按任务包 T006 的纯逻辑路线实现（`appendCommand`/`WS_URL`，不渲染 DOM，
不引入任何组件测试框架）；`@interactive-story/runtime-kernel` 的 `workspace:*` 声明是 T005
值导入 `wrapPresentationPort` 的 pnpm 严格链接必要条件，理由记入 DECISIONS D3。

## Known Issues

NONE。

## Blockers

NONE。

## Future Considerations

- 长驻 ws 服务端进程（server 入口）留待真实部署节点（OBS 集成 / DEV-028 总线）；本节点服务端
  半由集成测试验证，`dev` 无服务端时页面只显示空列表，符合 Shell 定位。
- 浏览器传输层自动重连未实现——`onopen` 恒发 `RENDERER_HELLO` 已覆盖重连握手路径（CR-012），
  真正的重连计时器留待 DEV-021+ 的连接管理需求。
- `eslint-plugin-react(-hooks)`、React Testing Library 等按任务包 Non-goals 不引入，待需要时
  再说。

## Decisions

见 `specs/dev/DEV-020/DECISIONS.md`。已随最终提交一并入库。