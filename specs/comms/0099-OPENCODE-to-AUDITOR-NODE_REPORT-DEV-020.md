---
msg_id: "0099"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-020
in_reply_to: "0098"
created_at: 2026-08-21
requires_response: true
git_head: 8788347a92cbfba752de2102b0dd626d2a15a5c6
changed_files_count: 23
commands_run: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-020

## 概要

DEV-020 Renderer Shell（M2 第一个节点）施工完成，节点 `READY_FOR_REVIEW`。全项目首次引入
前端应用与真实网络协议：新建 `apps/renderer`（React 19 + Vite 8 + `ws`），服务端半
`createWebSocketPresentationPort` 用 `ws` 实现真实 `PresentationPort`（广播 send +
`RENDERER_HELLO` 路由），`commandSeq` 信封与折叠状态组合 DEV-012 已冻结的
`wrapPresentationPort` 获得，**不重新实现**；客户端半实现 `detectSeqGap` 纯函数 +
`createRendererClient`（`SocketLike` 最小注入接口），`RENDERER_HELLO` 握手 + 跳空重发 +
命令调试列表。根配置仅三处最小改动（`vitest.config.ts` include 追加 `apps/*` glob、
`eslint.config.js` files 追加 `**/*.tsx`、根 `package.json` typecheck 追加第三步）；
`apps/renderer` 独立于根 composite 引用图，根 `tsconfig.json` 与 `packages/**` 全程零改动。

## 验证

六条命令严格按顺序全部退出码 0：

- `pnpm install`
- `pnpm typecheck`（含新追加的 `apps/renderer` 独立检查第三步）
- `pnpm lint`（`apps/renderer` 的 2 个 `.tsx` 文件被实际 lint）
- `pnpm format:check`
- `pnpm build`（仍只构建库图，`vite build` 未接入根聚合）
- `pnpm test`：85 Test Files / 432 Tests 全部通过（apps/renderer 新增 4 文件/15 条，既有
  81 文件/417 条零回归）

关键协议验证：真实 `ws.WebSocketServer`（随机端口）+ 真实 `ws` client 集成测试——
`RENDERER_HELLO` 触发 `PRESENTATION_RESYNC` 信封（commandSeq 1），随后
`wrapPresentationPort(...).send(...)` 命令 commandSeq 2 连续不跳号；RESYNC 携带当前折叠状态
且自身占用编号。客户端跳空检测：连续递增不重发 HELLO，跳空/乱序触发一次额外 HELLO 重发且
原命令不丢弃（lastSeq 更新 + onCommand 全量送达）；首条消息永不算跳空；非 JSON 帧忽略。
`detectSeqGap` 四条路径（首条/连续/跳号/乱序）全部按 Task Package 2.3 判定。
额外冒烟：`pnpm --filter @interactive-story/renderer run build`（vite build）退出码 0，产物
已 gitignore。

详细逐条验收证据见 `specs/dev/DEV-020/REPORT.md`（A01–A19），设计决策（包/应用边界、类型
边界纪律、`composite: false` 理由、根配置三处逐项理由、跳空即全量 RESYNC 理由，及裸传输端口
与 `wrapPresentationPort` 的组合点、`workspace:*` 依赖声明、版本选型）见
`specs/dev/DEV-020/DECISIONS.md`（D1–D10，已随提交入库）。