# TASK PACKAGE — DEV-020

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-020 |
| Node Name | Renderer Shell |
| Milestone | M2 — Presentation Complete（**本节点是 M2 的第一个节点**） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | DEV-012（DONE，`verdict_ref: "0096"`） |
| Commander | Claude |
| Executor | Codex（协议角色名 `OPENCODE`） |

### 本节点是全项目第一次引入前端应用、第一次真实网络协议、第一次新增运行时 npm 依赖

请完整读完第 2 节再动手。这是继 DEV-009（首次 XState）、DEV-010（首次 SQLite）之后第三个
"引入全新技术"的重节点：第一次创建 `apps/*` 下的真实应用（React + Vite），第一次让
`PresentationCommand`（DEV-012 冻结的信封）真正通过 `localhost WebSocket`（Dev Spec 第 34
节）传输，第一次在根级构建/测试/Lint 配置上做必要的、经过深思熟虑的最小改动。

### Dev Spec 原文极简，具体协议设计由 Commander 补全

第 65 节 DEV-020 原文只有"React + WebSocket"五个字。第 34/35 节补充了关键约束：
Renderer 用 Web Renderer（OBS Browser Source 承载网页），Runtime 与 Renderer 之间走
`localhost WebSocket`，Renderer **只能**收到 `PresentationCommand`，**不能**反向调用
`renderer.nextScene()` 这类改变剧情的方法（第 35 节，只读消费）。本任务包据此补全具体协议
与文件结构，Codex 严格照办，不要重新发明协议形状。

### 范围收紧："Shell"只是管道，不做真实画面

DEV-021（Scene Renderer）、DEV-022（Character Renderer）等才是画真实内容的节点。本节点
交付的 React 应用只做：连接管理、`RENDERER_HELLO` 握手、`commandSeq` 跳空检测、把收到的
命令原样打印成调试列表——**不画场景/角色/字幕**，见第 10 节 Non-goals。

---

## 2. 架构设计（Commander 已核对真实代码与根配置后做出的决策，Codex 按此实现）

### 2.1 包/应用边界：`packages/runtime-kernel` 保持传输无关，新协议代码放进 `apps/renderer`

`runtime-kernel` 从 DEV-009 起刻意保持 IO 无关（`Ports` 全是抽象接口，具体实现——no-op、
虚拟、现在的真实 WebSocket——都放在消费方）。冻结 17 包列表里没有"渲染桥接"这个包，本
节点也**不新建包**。正确的家是 Dev Spec 明确指向的 Web App：新建 `apps/renderer`
（Rev 2 包列表虽只列 17 个 `packages/*`，但 `pnpm-workspace.yaml` 已经声明
`apps/*` 为工作区一部分，此前从未使用过），同时包含：

- **服务端半**（`src/server/`）：Node 侧，用 `ws` 库实现一个真正的
  `PresentationPort`（`createWebSocketPresentationPort`），套上 DEV-012 已冻结的
  `wrapPresentationPort` 装饰器获得 `commandSeq` 信封与折叠状态。
- **客户端半**（`src/ws/` + `src/App.tsx`）：浏览器侧 React 应用，用原生 `WebSocket`
  连接，负责 HELLO 握手与 `commandSeq` 跳空检测。

两半通过 `apps/renderer/src/**/*.test.ts` 里的集成测试直接验证（真实 `ws` server + 真实
`ws` client，不需要浏览器环境），不需要等到有真实产品部署流程。

**类型边界纪律**：`apps/renderer` 里任何从 `@interactive-story/runtime-kernel` 的导入
**必须**是 `import type { PresentationCommand, PresentationState, Ports, PresentationPort }`
这种纯类型导入（项目 `verbatimModuleSyntax: true` 已经保证这类导入编译期完全擦除）。
`wrapPresentationPort`/`defaultPorts` 等**值**导入只允许出现在 `src/server/` 下（服务端半，
运行在 Node，不会被打进浏览器 bundle）；`src/ws/`、`src/App.tsx` 等客户端半代码不得
`import`（值）`runtime-kernel` 的任何运行时导出，防止 Vite 意外把 `xstate`/`zod`/
`node:sqlite`（经由 `chapter-compiler`/`persistence` 的传递依赖）打进浏览器产物。

### 2.2 WebSocket 消息协议

```typescript
// 客户端 → 服务端（入站，唯一一种消息类型）
interface RendererHelloMessage { type: 'RENDERER_HELLO' }

// 服务端 → 客户端（出站）：DEV-012 已冻结的信封，原样透传
// { commandSeq: number; command: unknown }
```

- 客户端连接建立（`ws.onopen`）后**立即**发送 `RENDERER_HELLO`——首次连接与重连**走同一条
  路径**（CR-012 原则的具体落地：本节点不为"首次"与"重连"写两套逻辑，`onopen` 永远发
  HELLO，服务端永远用同一个 `onRendererHello` 处理器响应）。
- 服务端收到 `RENDERER_HELLO` 后，通过 `wrapPresentationPort` 的装饰器发出一条
  `{kind: 'PRESENTATION_RESYNC', state: <当前 getState()>}` 命令（复用 DEV-012 已实现的
  RESYNC 机制，不重新发明）。
- 后续所有 `PresentationCommand` 信封原样通过 WebSocket 文本帧（`JSON.stringify`）广播给
  当前连接的客户端（同一时间实践上只有一个 OBS Browser Source 实例连接，广播语义足够，
  不需要按 client 区分）。

### 2.3 `commandSeq` 跳空检测（DEV-020 明确指派的 CR-012 要求）

```typescript
export function detectSeqGap(lastSeq: number | undefined, newSeq: number): boolean
```

纯函数：`lastSeq === undefined`（第一条消息）永远不算跳空；否则 `newSeq !== lastSeq + 1`
即为跳空。客户端收到每条命令都调用一次；检测到跳空时，**主动重新发送 `RENDERER_HELLO`**
（触发一次全量 RESYNC，用"重新握手"统一处理跳空，不单独发明"部分补发"协议——第 35 节
Renderer 本就不维护剧情，让它对自己的连续性不自信时直接要一次全量重放是最简单可靠的方案）。

### 2.4 客户端可测试性：不依赖真实浏览器 `WebSocket` 全局

`src/ws/client.ts` 的核心逻辑（收到消息时更新状态、判断跳空、决定是否重发 HELLO）实现为
接受一个最小注入接口，而不是直接绑定全局 `WebSocket`：

```typescript
export interface SocketLike {
  send(data: string): void;
  onOpen(handler: () => void): void;
  onMessage(handler: (data: string) => void): void;
}
export function createRendererClient(socket: SocketLike): { getLastSeq(): number | undefined }
```

`src/main.tsx`/`App.tsx` 里再用真实浏览器 `WebSocket` 构造一个满足 `SocketLike` 的适配器
传进去。这样 `client.ts` 的行为测试完全不需要 jsdom/浏览器环境，跟项目一贯的"用最小注入
接口换取纯函数可测试性"风格一致（`Ports` 模式的同类应用）。

### 2.5 根级配置的三处必要改动——每一处都有明确理由，不做任何其它改动

新技术栈（React/JSX、Vite 应用、非 composite 的 app 包）与现有根级 `tsc -b` composite
工程/`eslint`/`vitest` 配置有真实的适配缺口，核对如下：

1. **`vitest.config.ts`**：`include` 数组目前是 `['tests/**/*.test.ts',
   'packages/*/src/**/*.test.ts']`，不会匹配 `apps/renderer/src/**/*.test.ts`。追加
   一个数组元素 `'apps/*/src/**/*.test.ts'`（与既有 `packages/*/src/...` 完全同构的
   写法，只是把 `packages` 换成 `apps`），不改动其它内容。
2. **`eslint.config.js`**：`files: ['**/*.ts']` 不匹配 `.tsx`。改为
   `files: ['**/*.ts', '**/*.tsx']`。TypeScript-ESLint 的 parser 原生理解 `.tsx` 里的
   JSX 语法，**不需要**额外装 `eslint-plugin-react`/`eslint-plugin-react-hooks`（那属于
   代码质量打磨，留给以后需要时再加，本节点不做超出"能正常 lint 通过"之外的规则引入）。
3. **根 `package.json` 的 `typecheck` 脚本**：`apps/renderer` 是一个**非 composite** 的
   应用包（原因见下），不会被 `tsc -b` 的 solution 引用图检查到。脚本改为
   `"tsc -b && tsc -b --noEmit && pnpm --filter @interactive-story/renderer run typecheck"`
   （在已有两步之后追加第三步，前两步的既有行为完全不变）。

**为什么 `apps/renderer` 不加入根 `tsconfig.json` 的 `references`**：该文件的
`composite: true` 图是给"会被其它包 `import` 消费的库"用的（会产生 `.d.ts` 声明输出）。
`apps/renderer` 是最终应用，没有任何包会 `import` 它，用 `composite`/`declaration` 检查
它没有意义，也会让 `tsc -b` 的 `dist/` 输出和 Vite 自己的构建产物混淆。因此
`apps/renderer/tsconfig.json` 设 `composite: false`、`noEmit: true`，独立于 solution
图之外，用它自己的 `tsc --noEmit` 脚本做纯类型检查——这也是为什么根 `typecheck` 脚本需要
额外追加一步来覆盖它，而根 `tsconfig.json` 本身不用改。

**根 `build` 脚本不改**：它继续只表示"构建库图"（`tsc -b`）。`apps/renderer` 真正的产物
构建是 `vite build`，本节点把它做成 `apps/renderer` 自己的 `build` 脚本，但**不**接入根
聚合命令——目前没有任何部署/CI 流程消费这个产物，接入属于 Non-goal（见第 10 节）。

---

## 3. Scope

### Writable Scope — 新建应用

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

### Writable Scope — 根配置，仅限第 2.5 节列出的三处改动

```
vitest.config.ts   （仅追加一个 include 数组元素）
eslint.config.js   （仅把 files 数组加一个 '**/*.tsx'）
package.json       （仅在 typecheck 脚本末尾追加一步）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-020/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/**（全部，含 runtime-kernel——本节点只读它的公开导出，不做任何追加式扩展）
tsconfig.json、tsconfig.base.json——本节点不需要改，不动
.prettierrc.json、.prettierignore
pnpm-workspace.yaml（已包含 apps/*，无需改动）
specs/baseline/DEV_SPEC_V1.0.md、specs/audit/**、specs/protocol/**
specs/PROJECT_INDEX.md、specs/dev/DAG.md、specs/tasks/**
specs/comms/ 中所有非 OPENCODE 发出的消息文件
```

### Forbidden Scope

```
packages/* 下任何文件的修改
根 tsconfig.json（不得把 apps/renderer 加入 references——见 2.5 节理由）
根 package.json 的 build/lint/format/format:check/test 脚本本体（只许动 typecheck 一行）
真实的场景/角色/字幕/选择/骰子 UI 渲染（DEV-021～025 的职责）
`eslint-plugin-react`/`eslint-plugin-react-hooks`/`react-router` 等额外前端生态依赖
把 `vite build` 接入根聚合 build 脚本
真实的 Twitch/OBS 集成
```

---

## 4. Required Skills

### Required

- React 18+ 基础（函数组件、`useEffect`/`useState`）
- Vite 项目脚手架与基本配置
- Node.js `ws` 库（`WebSocketServer`）与浏览器原生 `WebSocket` API
- TypeScript 项目在"库"与"应用"两种角色下的 tsconfig 差异（composite vs. noEmit）

### Forbidden / Unnecessary

- 任何状态管理库（Redux/Zustand 等）——本节点状态极简，`useState` 足够
- 任何 UI 组件库/CSS 框架
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `PresentationCommand`/`PresentationState`/`PresentationPort`/`wrapPresentationPort`（`runtime-kernel`，DEV-012 冻结） | 服务端半的信封与折叠状态复用 |
| `ws`（新增 npm 依赖） | Node 侧 WebSocket 服务器 |
| `react`/`react-dom`/`vite`/`@vitejs/plugin-react`（新增 npm 依赖） | 客户端应用脚手架 |

---

## 6. Outputs

1. `apps/renderer`：可独立 `pnpm --filter @interactive-story/renderer dev` 启动的 React 应用
2. `createWebSocketPresentationPort`（服务端半，`src/server/wsServer.ts`）
3. `createRendererClient`/`detectSeqGap`（客户端半，`src/ws/`）
4. 根配置三处改动（第 2.5 节）
5. `specs/dev/DEV-020/DECISIONS.md`，记录：包/应用边界决策、类型边界纪律理由、
   `composite: false` 理由、根配置三处改动的逐项理由、跳空检测即触发全量 RESYNC 而非
   部分补发的理由

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-020/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`
- **Acceptance**：四文件存在；`INDEX.md` 含 Task Order T001–T007。

---

### T002 — 根配置三处改动

- **Allowed Files**：`vitest.config.ts`、`eslint.config.js`、`package.json`（根）
- **Requirements**：按第 2.5 节逐条实施，每处都是最小追加，不改动任何既有内容。
- **Acceptance**：`git diff` 对三个文件分别只显示第 2.5 节描述的那一处改动；此刻 `apps/renderer` 尚未创建，三条命令（`pnpm test`/`pnpm lint`/根 `typecheck`）应仍然对现有 workspace 正常工作（`typecheck` 脚本新增的第三步此时会因 `apps/renderer` 不存在而报错——属预期，留到 T003 创建应用后一并验证，本 Task 的验收只看 diff 正确性，不强求此刻命令全绿）。

---

### T003 — `apps/renderer` 应用脚手架

- **Allowed Files**：`apps/renderer/package.json`、`tsconfig.json`、`vite.config.ts`、`index.html`、`src/main.tsx`
- **Requirements**：
  1. `package.json`：`name: "@interactive-story/renderer"`；`dependencies`：`react`、
     `react-dom`、`ws`；`devDependencies`：`vite`、`@vitejs/plugin-react`、
     `@types/react`、`@types/react-dom`、`@types/ws`（版本选最新稳定 major，记入
     `DECISIONS.md`）；`scripts`：`"dev": "vite"`、`"build": "vite build"`、
     `"typecheck": "tsc --noEmit"`。
  2. `tsconfig.json`：`extends` 根 `tsconfig.base.json`，覆盖
     `composite: false`、`noEmit: true`、`jsx: "react-jsx"`、
     `lib: ["ES2023", "DOM", "DOM.Iterable"]`，`include` 覆盖 `src/**/*`。
  3. `vite.config.ts`：标准 `@vitejs/plugin-react` 配置。
  4. `index.html` + `src/main.tsx`：最小 React 挂载骨架（挂载 `App` 组件）。
- **Acceptance**：`pnpm install` 成功；`pnpm --filter @interactive-story/renderer run typecheck` 退出码 0；此时根 `typecheck` 脚本（T002 已改）应能完整跑通全部三步。

---

### T004 — `detectSeqGap`

- **Allowed Files**：`src/ws/seqGap.ts`、`src/ws/seqGap.test.ts`
- **Requirements**：按第 2.3 节实现。
- **Acceptance**：`lastSeq === undefined` 永远返回 `false`；`newSeq === lastSeq + 1` 返回 `false`；其余（跳号、重复、乱序）返回 `true`。

---

### T005 — 服务端半：`createWebSocketPresentationPort`

- **Allowed Files**：`src/server/wsServer.ts`、`src/server/wsServer.test.ts`
- **Requirements**：
  1. `createWebSocketPresentationPort(wss: WebSocketServer): PresentationPort`——
     `send` 广播给全部当前连接的 client；`onRendererHello(handler)` 注册一次，内部对
     每个 client 的 `message` 事件判定 `type === 'RENDERER_HELLO'` 时统一调用
     `handler`（不区分首连/重连，第 2.2 节已述）。
  2. 用 DEV-012 的 `wrapPresentationPort` 包一层再交给上层（本节点不重新实现
     `commandSeq`/`PresentationState` 折叠逻辑）。
  3. **只导入类型**（`import type`）来自 `runtime-kernel` 的 `PresentationPort`/
     `PresentationCommand`/`PresentationState`；**值**导入 `wrapPresentationPort` 也
     仅限本文件（服务端半），符合第 2.1 节类型边界纪律。
- **Acceptance**：真实起一个 `ws.WebSocketServer`（`localhost`，随机可用端口），用真实
  `ws` 客户端连接、发送 `RENDERER_HELLO`，断言收到一条 `commandSeq` 递增、
  `command.kind === 'PRESENTATION_RESYNC'` 的信封；随后通过
  `wrapPresentationPort(...).send(...)` 发送的命令客户端也能收到，`commandSeq` 与
  RESYNC 那条连续不跳号。

---

### T006 — 客户端半：`createRendererClient` + `App.tsx`

- **Allowed Files**：`src/ws/client.ts`、`src/ws/client.test.ts`、`src/App.tsx`、`src/App.test.ts`
- **Requirements**：
  1. 按第 2.4 节实现 `SocketLike`/`createRendererClient`：`onOpen` 时发送
     `RENDERER_HELLO`；`onMessage` 收到的信封先做 `detectSeqGap` 检查，跳空时重发
     `RENDERER_HELLO`（无论如何都要处理这条信封本身，不丢弃），随后更新
     `getLastSeq()`。
  2. `App.tsx`：用真实浏览器 `WebSocket` 构造 `SocketLike` 适配器（仅在这一处接触真实
     `WebSocket` 全局），维护一个"收到的命令"数组渲染成简单调试列表（`<pre>` 或等价
     最简展示，不做任何场景/角色渲染）。
- **Acceptance**：用一个手写的假 `SocketLike`（测试替身，不需要 jsdom）驱动
  `createRendererClient`：验证 `onOpen` 触发即发 HELLO；连续递增 `commandSeq` 不触发
  重发 HELLO；人为制造一次跳空后触发一次额外的 HELLO 重发。

---

### T007 — 全量验证、REPORT 与 commit

- **Allowed Files**：`specs/dev/DEV-020/INDEX.md`、`REPORT.md`、`DECISIONS.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-020.md`
- **Requirements**：
  1. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  2. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  3. **`DECISIONS.md` 必须已提交**，覆盖第 6 节列出的全部要点。
  4. 更新 `INDEX.md`：T001–T007 全部勾选。
  5. `git add -A && git commit`，提交信息首行：`DEV-020: renderer shell`。
  6. 追加 LEDGER 行，发 `NODE_REPORT`。
  7. **STOP**。
- **Acceptance**：六条命令全部退出码 0；`REPORT.md` 引用的全部文档已入库；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-020 INDEX

Status: IN_PROGRESS

## Current Node

DEV-020 — Renderer Shell

## Objective

新建 `apps/renderer`（React + Vite + WebSocket），实现 Runtime ↔ Renderer 的 localhost
WebSocket 连接：服务端半用 `ws` 包装已冻结的 `wrapPresentationPort` 提供真实
`PresentationPort` 实现；客户端半做 `RENDERER_HELLO` 握手与 `commandSeq` 跳空检测。只做
管道，不做真实场景/角色渲染。

## Allowed Scope（新建应用）
（抄录 Task Package 第 3 节实际条目）

## Allowed Scope（根配置，仅限三处）
（抄录 Task Package 第 3 节实际条目——vitest.config.ts / eslint.config.js / package.json，
逐行核对每处都是第 2.5 节描述的最小追加）

## Read-only Scope
（抄录 Task Package 第 3 节实际条目）

## Forbidden Scope
（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 根配置三处改动
- [ ] T003 apps/renderer 应用脚手架
- [ ] T004 detectSeqGap
- [ ] T005 服务端半：createWebSocketPresentationPort
- [ ] T006 客户端半：createRendererClient + App.tsx
- [ ] T007 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001（每完成一个 Task 立即勾选并更新本字段）

## Exit Criteria

六条命令全部退出码 0；真实 WebSocket server+client 集成测试通过（HELLO→RESYNC，
commandSeq 连续）；跳空检测测试通过；根配置三处改动的 git diff 均为最小追加；
`DECISIONS.md` 已入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；已向 AUDITOR 发出
NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **不修改 `packages/**` 下任何文件**——本节点只读消费 `runtime-kernel` 的既有导出。
2. **类型边界纪律**：客户端半代码不得值导入 `runtime-kernel` 任何运行时符号（第 2.1 节）。
3. **根配置只许第 2.5 节列出的三处最小改动**，不得借机顺手改动其它规则/脚本。
4. **不把 `apps/renderer` 加入根 `tsconfig.json` 的 `references`**（第 2.5 节已说明理由）。
5. **不引入额外前端生态依赖**（状态管理库、UI 框架、react-router 等）。
6. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
7. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现真实的场景/背景/前景渲染（DEV-021）。
- 不实现真实的角色渲染（位置/表情/微动，DEV-022）。
- 不实现字幕/对话框（DEV-023）、选择 UI（DEV-024）、骰子 UI（DEV-025）、镜头/转场
  （DEV-026）、BGM/SFX（DEV-027）。
- 不把 `vite build` 接入根聚合 `build` 脚本（没有任何部署/CI 流程消费它）。
- 不实现 Presentation Command Bus 的完整序号分配/分发基础设施（DEV-028——本节点的
  `commandSeq` 来自复用 DEV-012 现成的 `wrapPresentationPort`，不是重新设计一套）。
- 不做真实 OBS/Twitch 集成测试。
- 不引入任何前端组件测试框架（React Testing Library 等）——本节点的测试策略是纯逻辑
  层（`SocketLike`/`detectSeqGap`）与协议层（真实 `ws` server/client），不测 DOM 渲染
  细节。

---

## 11. Tests

### Unit tests

T004、T006（`client.ts`/`seqGap.ts` 部分）：覆盖第 7 节描述的具体行为。

### Integration tests

T005：真实 `ws` server + 真实 `ws` client 的端到端协议验证。

### Regression tests

`pnpm test` 覆盖全 workspace；既有全部包测试零回归。

---

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含新追加的 `apps/renderer` 独立检查步骤） | 命令 |
| A03 | `pnpm lint` 退出码 0（`.tsx` 文件被实际 lint 到） | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0（仍只构建库图，未接入 `vite build`） | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归，`apps/renderer` 新测试被实际跑到 | 命令输出 |
| A07 | `vitest.config.ts`/`eslint.config.js`/根 `package.json` 的 git diff 均恰为第 2.5 节描述的最小追加 | git diff 比对 |
| A08 | 根 `tsconfig.json` 未被修改（`apps/renderer` 未加入 `references`） | git diff 比对 |
| A09 | `apps/renderer` 内客户端半代码（`src/ws/client.ts`、`src/App.tsx`）不存在对 `runtime-kernel` 的值导入 | 代码/grep 检查 |
| A10 | `detectSeqGap` 对首条消息/连续/跳号/乱序四种情形判定正确 | 测试检查 |
| A11 | 真实 WS 集成测试：`RENDERER_HELLO` 触发 `PRESENTATION_RESYNC`，`commandSeq` 连续不跳号 | 测试检查 |
| A12 | 客户端跳空检测触发后重发 `RENDERER_HELLO`，且原命令本身不被丢弃 | 测试检查 |
| A13 | `packages/**` 全部未被修改 | git diff 比对 |
| A14 | 新增 npm 依赖仅限 `react`/`react-dom`/`ws` 及其对应 `@types`/`vite`/`@vitejs/plugin-react`，无额外前端生态库 | 文件检查 |
| A15 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A16 | `specs/dev/DEV-020/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T007 全部勾选 | 文件 + 文本检查 |
| A17 | `git log` 新增恰 1 条提交，首行 `DEV-020: renderer shell`；提交时 `git status --porcelain` 为空 | 命令 |
| A18 | LEDGER 含 `NODE_REPORT-DEV-020` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A19 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT（含确认 `DECISIONS.md` 已提交）→ commit → 发 NODE_REPORT → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A19。
