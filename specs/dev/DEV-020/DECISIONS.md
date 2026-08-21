# DEV-020 DECISIONS

## D1 — 包/应用边界：协议代码进 `apps/renderer`，不新建包、不改 runtime-kernel

`runtime-kernel` 自 DEV-009 起刻意保持 IO 无关（`Ports` 全是抽象接口，具体实现都在消费方）。
冻结的 17 包清单里没有"渲染桥接"包，本节点也不新建。Dev Spec 第 34/35 节明确指向 Web App，
`pnpm-workspace.yaml` 早已声明 `apps/*`（此前从未使用），因此正确家是新建应用
`apps/renderer`：服务端半（`src/server/`，Node 侧 `ws`）与客户端半（`src/ws/` + `src/App.tsx`，
浏览器侧）同放一个应用内，集成测试用真实 `ws` server + client 直接验证，无需浏览器环境。

## D2 — 类型边界纪律：客户端半只允许 `import type`

客户端半代码（`src/ws/*`、`src/App.tsx`）对 `runtime-kernel` 的任何导入必须是 `import type`
（项目 `verbatimModuleSyntax: true` 保证这类导入编译期完全擦除）；`wrapPresentationPort`/
`defaultPorts` 等值导入只允许出现在 `src/server/`。理由：`runtime-kernel` 经
`chapter-compiler`/`persistence` 传递依赖 `xstate`/`zod`/`node:sqlite`，若客户端半值导入任何
运行时符号，Vite 会把它们全部打进浏览器产物——服务器专用代码进不了浏览器 bundle 是结构保证，
不是约定。A09 由 grep 独立核实：`src/ws/client.ts`、`src/App.tsx` 仅 `import type`。

## D3 — `@interactive-story/runtime-kernel` 以 `workspace:*` 声明为 apps/renderer 依赖

服务端半必须值导入 `wrapPresentationPort`（T005 明确要求"用 DEV-012 的 wrapPresentationPort
包一层"），客户端半也有纯类型导入——pnpm 严格链接下，未声明的 workspace 包不可解析，必须
声明。A14 的"新增 npm 依赖"指注册表生态库（react/react-dom/ws 及其 @types/vite/
@vitejs/plugin-react，无任何额外前端生态库），`workspace:*` 是仓库自有包链接，不属其列。
这是全项目第一次有应用包依赖库包，比照既有包间依赖先例处理。

## D4 — `apps/renderer` 设 `composite: false` + `noEmit: true`，不加入根 `tsconfig.json` references

根 `tsconfig.json` 的 `composite: true` 引用图服务于"会被其它包 import 消费的库"（产生
`.d.ts` 声明输出）。`apps/renderer` 是最终应用，没有任何包会 import 它，用
composite/declaration 检查没有意义，还会让 `tsc -b` 的 `dist/` 与 Vite 构建产物混在一个目录。
因此它独立于 solution 图之外：`composite: false`、`noEmit: true`，用 `tsc --noEmit` 做纯类型
检查，根 `typecheck` 脚本为此追加第三步（D5③）。根 `tsconfig.json` 一字未动（A08）。

## D5 — 根配置三处改动的逐项理由（每处都是最小追加，git diff 由 A07 核验）

1. **`vitest.config.ts`**：`apps/renderer/src/**/*.test.ts` 不匹配既有 include
   `['tests/**/*.test.ts', 'packages/*/src/**/*.test.ts']`（A06 要求新测试被实际跑到）。
   追加同构数组元素 `'apps/*/src/**/*.test.ts'`，与既有 `packages/*/src/...` 写法完全对称。
2. **`eslint.config.js`**：`files: ['**/*.ts']` 不匹配 `.tsx`（A03 要求 `.tsx` 被实际 lint 到）。
   改为 `files: ['**/*.ts', '**/*.tsx']`。TypeScript-ESLint parser 原生理解 JSX，**不需要**
   `eslint-plugin-react(-hooks)`；超出"能正常 lint 通过"的规则引入留待以后（Non-goal）。
3. **根 `package.json` typecheck 脚本**：`apps/renderer` 非 composite 不被 `tsc -b` 图检查到
   （D4），追加第三步 `pnpm --filter @interactive-story/renderer run typecheck`；前两步
   `tsc -b && tsc -b --noEmit` 行为完全不变。根 `build` 脚本不动——它继续只表示"构建库图"
   （A05），`vite build` 是 `apps/renderer` 自己的脚本，无部署/CI 消费，不接入根聚合
   （Non-goal）。

## D6 — 跳空检测即触发全量 RESYNC，不发明"部分补发"协议

Dev Spec 第 35 节：Renderer **不维护剧情**，只能收 `PresentationCommand`。因此它对自己的
连续性不自信时，最简单的可靠方案就是重新发送 `RENDERER_HELLO` 要一次全量重放（CR-012 也要求
首连与重连走同一条路径）。`detectSeqGap` 是纯函数（首条消息永不算跳空，否则
`newSeq !== lastSeq + 1` 即跳空）；跳空时客户端重发 HELLO，**本条命令本身不丢弃**——照常更新
lastSeq、照常回调 App 渲染（A12 测试覆盖）。不单独设计增量补发协议。

## D7 — `createWebSocketPresentationPort` 只做传输，`commandSeq` 信封在调用方组合

`createWebSocketPresentationPort` 返回裸 `PresentationPort`（广播 send + `RENDERER_HELLO`
路由），`commandSeq` 信封与折叠状态由调用方组合 DEV-012 已冻结的 `wrapPresentationPort`
获得——组合点唯一（集成测试现在，未来 Runtime `Ports.presentation` 装配处），避免把包装
烧进库里造成二次包装/双信封。这与任务包 T005 验收"通过 `wrapPresentationPort(...).send(...)`
发送的命令客户端也能收到、`commandSeq` 连续"的调用形状逐字一致；本节点完全不重新实现
`commandSeq`/`PresentationState` 折叠逻辑（A11 集成测试用真实 `ws` server + client 验证
HELLO→RESYNC seq 1 → 手动命令 seq 2 连续不跳号）。

## D8 — npm 依赖版本选型（最新稳定 major，2026-08-21 查询 npm registry）

`react`/`react-dom` 19.2.8、`ws` 8.21.3、`vite` 8.2.2、`@vitejs/plugin-react` 6.1.0、
`@types/react` 19.2.18、`@types/react-dom` 19.2.4、`@types/ws` 8.18.1。不引入任何状态管理
库/UI 库/router（状态极简，`useState` 足够）。`ws` 的 `@types` 对应的 Node 类型来自根
`@types/node`（仓库既有布局，persistence 先例同源解析，无新增）。

## D9 — WS 地址约定与无长驻服务端进程

`WS_URL = 'ws://localhost:8787'`（App.tsx 常量）。本节点不交付长驻 ws 服务端进程（Writable
Scope 无 server 入口文件，服务端半由集成测试验证）；`dev` 启动的页面在无服务端时只显示空列表
——符合"Shell only"定位。长驻进程与真实部署留待 DEV-021+/OBS 集成节点。

## D10 — 非 JSON / 非数字 seq 帧的容忍策略

服务端对解析失败的非 JSON 帧直接忽略（不弹错不崩溃）；客户端同样忽略非 JSON 帧与非数字
`commandSeq` 信封（不触发跳空、不更新 lastSeq）。协议是本地环回、单一发送方，宽松容忍足够，
不引入错误上报机制（留待真实 OBS 场景）。