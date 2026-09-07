# TASK PACKAGE — DEV-064

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-064 |
| Node Name | OBS Control |
| Milestone | M6 — Operations（第五个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | 新建 `packages/platform-obs`；生产代码零 workspace/第三方依赖（只用 `node:crypto` 内置模块 + Node ≥22 原生全局 `WebSocket`）；测试专用 `devDependencies`：`ws`/`@types/ws`（版本对齐 `apps/renderer` 已有用法，起一个假 OBS WebSocket server） |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### 现实核对：第 48 节"OBS Layer"+第 49 节"OBS Scenes"是本节点唯一权威依据；Dev Spec 第 64 节本身只有标题零正文

`specs/baseline/DEV_SPEC_V1.0.md` 第 1789-1817 行：

```
第 48 节 OBS Layer：OBS 不承担业务逻辑，只做 Browser Source /
  Audio / 编码 / 推流 / Failover Scene。
第 49 节 OBS Scenes：至少 BOOT / LIVE / RECONNECTING /
  MAINTENANCE / ERROR / ENDING 六个场景。
  "Runtime 通过 OBS WebSocket 控制 failover。"
```

`specs/dev/DAG.md` 第 402 行（DEV-064）备注为空；第 403 行
（DEV-065 OBS Failover）备注"Failover **决策权只在 SAFETY
region**，OBS 与 PRESENTATION 均为执行端（CR-020）"——这明确划清
了 DEV-064（本节点，"怎么跟 OBS 说话"这个执行层）与 DEV-065
（"什么时候该切场"这个决策层，决策权在未来的 SAFETY region）的
边界。**本节点只做"控制"（怎么连接 OBS、怎么切场景），不做任何
"决定什么时候切场景"的判断逻辑**。

### 范围裁决（USER 2026-09-08 已裁决）：OBS WebSocket 是具体、外部、有文档的协议（同 DEV-041 EventSubClient 的 Twitch WebSocket 先例），本节点建真实客户端，不做接口+noop 占位

OBS WebSocket v5 协议（`obs-websocket` 官方协议，5.x 版本）是一个
具体、稳定、有公开文档的外部协议，不像 DEV-056（Host LLM
Provider）那样"Dev Spec 未指定厂商/协议"。同 DEV-040（Twitch
OAuth）/DEV-041（EventSub WebSocket）先例：**本节点建真实的 OBS
WebSocket v5 客户端**（Hello/Identify/Identified 握手 + 可选
SHA256 挑战-响应鉴权 + Request/RequestResponse 请求关联），注入式
WebSocket 实现便于测试（不需要真实 OBS 实例），凭据/地址可选，未
配置退化为 noop（同 DEV-040 "允许降级为不可用"的既定模式）。

### 范围裁决：不实现任何重连逻辑；不实现任何"何时切场景"的判断

- **不做重连**：本节点只负责连接、鉴权、发送切场景请求；连接
  断开后续调用诚实失败（超时/拒绝），不自动重连。理由：DAG.md
  第 403 行已经把"什么时候需要切场景/failover"的决策权划给未来
  DEV-065 的 SAFETY region；本节点作为纯执行端不应该自己发明一套
  重连策略去猜"应该在什么情况下继续尝试"——那本身就是一种决策。
  与 DEV-045（Twitch 断线重连）不同：DEV-045 的重连目标明确（保住
  聊天连接本身），而这里"该不该、什么时候重连 OBS 控制连接"没有
  独立的、单一目标，混在 Failover 决策边界内，留给未来节点。
- **不实现任何"何时该切场景"的判断逻辑**：`switchScene(scene)`
  只是"把这个场景请求发给 OBS"，不判断当前状态是否需要切换、不
  维护"当前场景"状态机——那是 DEV-065 OBS Failover（决策）+
  SAFETY region 的职责。

---

## 2. 架构设计

### 2.1 `packages/platform-obs/src/obsControlPort.ts`（新文件）

```typescript
type Health = {
  status: 'OK' | 'DEGRADED' | 'DOWN';
  lastSuccessAt?: number;
  latencyMs?: number;
  error?: string;
};

export type ObsScene = 'BOOT' | 'LIVE' | 'RECONNECTING' | 'MAINTENANCE' | 'ERROR' | 'ENDING';

export type ObsSwitchResult = { ok: true } | { ok: false; reason: string };

export interface ObsControlPort {
  switchScene(scene: ObsScene): Promise<ObsSwitchResult>;
  getHealth(): Promise<Health>;
}

export const noopObsControlPort: ObsControlPort = {
  switchScene: async () => ({ ok: false, reason: 'no OBS WebSocket connection configured' }),
  getHealth: async () => ({ status: 'DOWN', error: 'no OBS WebSocket connection configured' }),
};
```

- `ObsScene`：第 49 节明确给出的封闭六值集合，抄录规范原文。
- `Health` 本地镜像 `packages/shared/src/health.ts` 的契约（同
  DEV-035/040/041 先例，不引入 `@interactive-story/shared`
  workspace 依赖）。
- `noopObsControlPort`：未配置时的诚实占位单例（同
  `noopTwitchAuthPort`）。

### 2.2 `packages/platform-obs/src/obsWebSocketClient.ts`（新文件）

真实 OBS WebSocket v5 客户端。协议要点（`obs-websocket` 官方协议，
均为公开文档，不发明）：

1. 客户端连接 `ws://host:port`（OBS 默认端口 `4455`，但本节点不
   写死默认值，由调用方传入完整 `url`）。
2. 服务端先发 `Op 0 Hello`：`{"op":0,"d":{"obsWebSocketVersion":
   "...", "rpcVersion":1, "authentication"?: {"challenge":"...",
   "salt":"..."}}}`（`authentication` 字段只在 OBS 端开启密码时
   出现）。
3. 客户端回 `Op 1 Identify`：`{"op":1,"d":{"rpcVersion":1,
   "authentication"?: "<计算值>"}}`。鉴权计算值算法：
   `base64(sha256(base64(sha256(password + salt)) + challenge))`
   （用 Node 内置 `node:crypto` 的 `createHash('sha256')`，零第三方
   依赖）。若服务端要求鉴权但客户端未配置 `password`，直接失败，
   不发送任何猜测值。
4. 服务端回 `Op 2 Identified`：`{"op":2,"d":{"negotiatedRpcVersion":
   1}}`——握手完成，视为"已连接"。
5. 后续每次 `switchScene`：发 `Op 6 Request`：`{"op":6,"d":
   {"requestType":"SetCurrentProgramScene","requestId":"<uuid>",
   "requestData":{"sceneName":"<scene>"}}}`；等待匹配同一
   `requestId` 的 `Op 7 RequestResponse`：`{"op":7,"d":
   {"requestId":"...","requestStatus":{"result":true|false,
   "comment"?:"..."}}}`——`result:true` → `{ok:true}`；
   `result:false` → `{ok:false, reason: comment 或默认文案}`。

```typescript
export interface ObsControlProviderConfig {
  url: string;
  password?: string;
  webSocketImpl?: typeof WebSocket;
  connectTimeoutMs?: number;
  requestTimeoutMs?: number;
}

export function createObsControlProvider(config: ObsControlProviderConfig): ObsControlPort { ... }

export function createOptionalObsControlProvider(env: NodeJS.ProcessEnv): ObsControlPort {
  const url = env.OBS_WEBSOCKET_URL;
  if (!url) return noopObsControlPort;
  const providerConfig: ObsControlProviderConfig = { url };
  if (env.OBS_WEBSOCKET_PASSWORD) providerConfig.password = env.OBS_WEBSOCKET_PASSWORD;
  return createObsControlProvider(providerConfig);
}
```

- `webSocketImpl`：测试注入；默认全局 `WebSocket`（Node ≥22
  原生，同 `eventSubClient.ts` 先例注释"测试注入；默认全局
  WebSocket（Node ≥22 原生）"）。
- 连接与 identify 只发生一次（`createObsControlProvider` 内部
  发起一个共享的"就绪"Promise，`switchScene`/`getHealth` 都
  `await` 它）；**握手失败后该 Promise 永久 rejected，本节点不
  重试/不重连**（见上方范围裁决），后续调用会持续收到同一个
  诚实失败原因，直到调用方创建一个新的 provider 实例。
- `switchScene`/请求各自有独立超时（`requestTimeoutMs`，默认
  5000ms），连接建立也有超时（`connectTimeoutMs`，默认 5000ms）——
  防止一个不回应的假/真服务器让 Promise 永久悬挂。

### 2.3 `packages/platform-obs/src/index.ts`（barrel）

```typescript
export * from './obsControlPort.js';
export * from './obsWebSocketClient.js';
```

---

## 3. Scope

### Writable Scope

```
packages/platform-obs/package.json            （新增）
packages/platform-obs/tsconfig.json            （新增）
packages/platform-obs/src/index.ts             （新增）
packages/platform-obs/src/obsControlPort.ts       （新增）
packages/platform-obs/src/obsControlPort.test.ts  （新增）
packages/platform-obs/src/obsWebSocketClient.ts       （新增）
packages/platform-obs/src/obsWebSocketClient.test.ts  （新增）
tsconfig.json                                       （根，追加一条 references 条目）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-064/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/platform-twitch/src/eventSubClient.ts、twitchAuth.ts（Read-only，风格参照，不 import）
packages/audio-engine/src/elevenLabsTtsProvider.ts（Read-only，风格参照，不 import）
apps/renderer/package.json（Read-only，只参照 ws/@types/ws 版本号）
```

### Forbidden Scope

```
修改除本节点 Writable Scope 之外的任何既有文件
import 或依赖 packages/error-registry、packages/health-registry、packages/watchdog、packages/platform-twitch、packages/runtime-kernel、packages/operator-api、packages/renderer 任何一个
新增任何生产代码第三方依赖（package.json 的 dependencies 必须省略或为空；ws/@types/ws 只能出现在 devDependencies，只用于测试起假 OBS server）
实现任何自动重连逻辑
实现任何"何时该切场景"的判断/决策逻辑（那是未来 DEV-065 的职责）
实现真实的 SAFETY region 状态机
新建任何 HTTP 端点或接入 packages/operator-api
```

---

## 4. Required Skills

### Required

- WebSocket 客户端协议实现（帧解析/请求-响应关联/超时处理），风格
  同 DEV-041 `eventSubClient.ts`、DEV-035 `elevenLabsTtsProvider.ts`
- Node 内置 `node:crypto` 做 SHA256 双重哈希鉴权计算
- 用 `ws` 库的 `WebSocketServer` 在测试里起一个假 OBS server（只
  在 `devDependencies`，不进生产代码）

### Forbidden / Unnecessary

- XState 或任何状态机框架（本节点判断分支足够简单，不需要）
- 任何真实 OBS 实例/进程
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/baseline/DEV_SPEC_V1.0.md` 第 1789-1817 行（第 48-49 节） | `ObsScene` 封闭六值集合与"OBS 不承担业务逻辑/只做执行"范围裁定的唯一权威来源 |
| `specs/dev/DAG.md` 第 402-403 行（DEV-064/065 备注） | 确认"控制"（本节点）与"决策"（DEV-065）边界划分 |
| `packages/platform-twitch/src/eventSubClient.ts`、`twitchAuth.ts`（DEV-040/041） | 真实外部协议客户端 + 可选凭据退化为 noop 的既有先例与代码风格 |
| `packages/audio-engine/src/elevenLabsTtsProvider.ts`（DEV-035） | 注入式 `fetchImpl`/超时处理/本地 Health 镜像的既有先例 |
| `apps/renderer/package.json` 的 `ws`/`@types/ws` 版本 | 测试假 OBS server 使用的库版本对齐依据 |
| OBS WebSocket 官方协议文档（`obs-websocket` 5.x，公开外部规范） | Hello/Identify/Identified 握手帧结构、SHA256 双重哈希鉴权算法、Request/RequestResponse 结构的权威来源（非本仓库内部规范，但是稳定公开协议，不属于"发明"） |
| USER 2026-09-08 裁决 | 确认建真实 WebSocket 客户端而非接口+noop 占位 |

---

## 6. Outputs

1. `ObsScene`/`ObsSwitchResult`/`ObsControlPort`/
   `noopObsControlPort`（`obsControlPort.ts`）
2. `ObsControlProviderConfig`/`createObsControlProvider`/
   `createOptionalObsControlProvider`（`obsWebSocketClient.ts`）
3. `specs/dev/DEV-064/DECISIONS.md`，至少覆盖：为何建真实
   WebSocket 客户端而不是接口+noop（OBS WebSocket 是具体外部协议，
   同 DEV-040/041 先例）、为何不实现任何重连逻辑（重连策略混在
   Failover 决策边界内，留给未来 DEV-065）、为何不实现任何"何时
   该切场景"的判断（那是 DEV-065 的职责，本节点纯执行端）、为何
   用 Node 内置 `crypto`/全局 `WebSocket` 而不引入第三方生产依赖、
   为何 `ws`/`@types/ws` 只作为测试依赖出现

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-064/{INDEX,REQUIREMENTS,ACCEPTANCE,REPORT}.md`
- **Acceptance**：四份节点文档存在；`INDEX.md` 含 Task Order T001–T003。

---

### T002 — `obsControlPort.ts`（类型+noop）+ 包骨架

- **Allowed Files**：`packages/platform-obs/{package.json,tsconfig.json}`、`packages/platform-obs/src/{index,obsControlPort}.ts`、`packages/platform-obs/src/obsControlPort.test.ts`
- **Requirements**：按第 2.1 节实现。`package.json`（`name:
  "@interactive-story/platform-obs"`，**省略** `dependencies`
  字段；`devDependencies` 含 `"ws": "^8.21.3"` 与
  `"@types/ws": "^8.18.1"`，版本对齐 `apps/renderer/package.json`
  已有用法）/`tsconfig.json` 结构对齐 `packages/watchdog/`。
- **Acceptance（功能部分）**：
  - `noopObsControlPort.switchScene(<任意 ObsScene 值>)` 恒定返回
    `{ok:false, reason:'no OBS WebSocket connection configured'}`。
  - `noopObsControlPort.getHealth()` 恒定返回
    `{status:'DOWN', error:'no OBS WebSocket connection configured'}`。
  - `ObsScene` 六个字面量值（`BOOT`/`LIVE`/`RECONNECTING`/
    `MAINTENANCE`/`ERROR`/`ENDING`）均可赋值给 `switchScene` 的
    参数类型（类型契约测试，同 DEV-056/057 手写对象验证类型
    可用的先例）。
- **Requirements（验证部分）**：本 Task 结束后不 commit（T002 是
  检查点，不是提交点），继续累积到 T003 一并提交。执行 `pnpm
  install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、
  `pnpm build`、`pnpm test`，全部确认退出码 0 后再进入 T003。

---

### T003 — `obsWebSocketClient.ts`（真实客户端）+ 假 OBS server 测试 + 全量验证、REPORT 与 commit

- **Allowed Files**：`packages/platform-obs/src/{obsWebSocketClient,obsWebSocketClient.test,index}.ts`、根 `tsconfig.json`、`specs/dev/DEV-064/{INDEX,REPORT,DECISIONS}.md`
- **Requirements**：按第 2.2、2.3 节实现；根 `tsconfig.json` 的
  `references` 数组末尾（`watchdog` 之后）追加
  `{ "path": "./packages/platform-obs" }`。
- **Acceptance（功能部分，测试用 `ws` 库的 `WebSocketServer` 起
  一个假 OBS server，随机端口，`afterEach` 关闭）**：
  - 假 server 发送不带 `authentication` 字段的 `Hello`（op0）→
    客户端回 `Identify`（op1，无 `authentication` 字段）→ 假
    server 回 `Identified`（op2）→ `switchScene('LIVE')` 请求
    发出后，假 server 收到 op6 `SetCurrentProgramScene` 请求（
    `requestData.sceneName === 'LIVE'`），回复 op7
    `requestStatus:{result:true}` → `switchScene` resolve 为
    `{ok:true}`。
  - 假 server 的 `Hello` 带 `authentication:{challenge,salt}` +
    配置了正确的 `password` → 断言客户端发出的 `Identify` 帧的
    `authentication` 字段恰好等于按官方算法独立计算出的期望值
    （`base64(sha256(base64(sha256(password+salt))+challenge))`）
    → 假 server 校验通过回 `Identified` → 后续 `switchScene`
    成功。
  - 同上但客户端配置了**错误**的 `password` → 假 server 校验用
    同样算法算出的期望值不匹配，不回 `Identified`（或回一个
    表示鉴权失败的关闭/错误）→ `switchScene`/`getHealth` 最终
    以诚实失败结束（`ok:false`/`status:'DOWN'`），不悬挂。
  - 假 server 要求鉴权但客户端**未配置** `password` → 客户端
    在收到带 `authentication` 字段的 `Hello` 后直接失败（不猜测
    发送任何鉴权值），`switchScene` 返回 `ok:false`。
  - 假 server 收到 op6 请求后**故意不回复** → 在配置的
    `requestTimeoutMs`（测试里传一个很短的值，如 50ms）内
    `switchScene` 以超时原因 `ok:false` 收尾，不悬挂。
  - 假 server 回复 op7 `requestStatus:{result:false,
    comment:'scene not found'}` → `switchScene` 返回
    `{ok:false, reason:'scene not found'}`（`comment` 原样透传）。
  - 连接目标地址在测试里指向一个**不存在的端口**（如
    `connectTimeoutMs` 传一个很短值 + 连接一个立即拒绝的地址）→
    `switchScene`/`getHealth` 在超时/连接错误后诚实失败，不悬挂。
  - `getHealth()` 在握手成功后返回 `status:'OK'`；在握手失败后
    返回 `status:'DOWN'` 且 `error` 字段包含失败原因。
  - `createOptionalObsControlProvider`：`env.OBS_WEBSOCKET_URL`
    未设置 → 返回的对象与 `noopObsControlPort` 是同一个引用
    （`toBe`，同 DEV-040 单例先例）；设置后指向假 server 地址 →
    `switchScene` 走真实握手路径成功。
- **Requirements（回归部分）**：`pnpm test` 全量跑通，既有全部包
  测试零改动通过。
- **Requirements（验证部分）**：
  1. `index.ts` 追加 `obsWebSocketClient.ts` 的导出。
  2. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  3. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  4. **`DECISIONS.md` 必须已提交**。
  5. 更新 `INDEX.md`：T001–T003 全部勾选，`Status:` 改为 `READY_FOR_REVIEW`。
  6. **写入（不提交）** `specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-064.md` 消息文件与 `specs/comms/LEDGER.md` 追加行（msg_id 取当前最大序号 + 1）。
  7. `git add`（仅本节点 Writable Scope 内文件，**不包含** LEDGER.md 与刚写的 NODE_REPORT 消息文件）`&& git commit`，首行：`DEV-064: obs control (real OBS WebSocket v5 client, no reconnect, no failover decision logic)`，**恰 1 条提交**。
  8. 自行核实：`git log -1` 只看到这一条新提交、NODE_REPORT 消息文件与 LEDGER 追加行存在于工作区但未提交；**工作区不得残留任何本次施工产生的临时/草稿文件**（在提交前先跑一次 `git status` 检查干净）。
  9. **STOP**。
- **Acceptance（命令部分）**：六条命令全部退出码 0；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-064 INDEX

Status: IN_PROGRESS

## Current Node

DEV-064 — OBS Control

## Objective

新建 `packages/platform-obs`：真实 OBS WebSocket v5 客户端
（Hello/Identify/Identified 握手 + 可选 SHA256 挑战鉴权 +
Request/RequestResponse 切场景请求），支持第 49 节六个封闭场景
（`BOOT`/`LIVE`/`RECONNECTING`/`MAINTENANCE`/`ERROR`/`ENDING`）。
第 64 节本身零正文，唯一权威范围来自第 48-49 节。只做"控制"
（怎么跟 OBS 说话），不做"决策"（何时切场景是未来 DEV-065 SAFETY
region 的职责，CR-020）。不实现任何重连逻辑（USER 2026-09-08 已
裁决建真实客户端而非接口+noop，但明确不含重连/决策）。生产代码
零 workspace/第三方依赖，只用 `node:crypto` + 原生 `WebSocket`；
`ws`/`@types/ws` 仅作测试依赖起假 OBS server。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 obsControlPort.ts（类型+noop）+ 包骨架
- [ ] T003 obsWebSocketClient.ts（真实客户端）+ 假 OBS server 测试 + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与
NODE_REPORT 消息文件已写入工作区但**未提交**；工作区不得残留任何
施工用临时文件。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **不实现任何自动重连逻辑**——握手失败/连接断开后诚实失败，
   不重试。
2. **不实现任何"何时该切场景"的判断/决策逻辑**——`switchScene`
   只是纯粹的执行请求转发。
3. **生产代码零第三方/workspace 依赖**——只用 `node:crypto` 内置
   模块 + Node ≥22 原生全局 `WebSocket`；`ws`/`@types/ws` 只能是
   `devDependencies`。
4. **鉴权计算值必须用真实的 OBS WebSocket v5 双重 SHA256 算法**
   （`base64(sha256(base64(sha256(password+salt))+challenge))`），
   不得简化/魔改。
5. **未配置 `password` 但服务端要求鉴权时，不得猜测/发送任何
   鉴权值**——直接失败。
6. **所有连接/请求都必须有超时**，不允许任何调用路径无限期悬挂。
7. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
8. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发
   `EXECUTOR_QUERY`，等 `SCOPE_RULING`。
9. **T003 提交后，LEDGER 追加行与自己的 NODE_REPORT 消息文件一律不
   要再提交**——写入工作区即可，留给 Commander 收尾统一提交；
   **提交前用 `git status` 自查工作区是否干净，不得留下任何额外
   的临时/草稿文件**（DEV-061 的 MAJOR-01 先例）。

---

## 10. Non-goals / Out-of-scope

- 任何自动重连逻辑。
- 任何"何时该切场景"的判断/决策逻辑（DEV-065 OBS Failover 的
  职责）。
- 真实的 SAFETY region 状态机。
- DEV-066（Crash Recovery）/DEV-067（Emergency Stop）的任何逻辑。
- 与 `operator-api`/`watchdog`/`error-registry`/`health-registry`
  的任何集成（未来集成节点的职责）。

---

## 11. Tests

### Unit tests

T002：`noopObsControlPort` 恒定诚实失败、`ObsScene` 六值类型
契约。

T003：真实握手（无鉴权/正确密码/错误密码/需要鉴权但未配置密码）、
切场景成功/失败（`result:true`/`result:false`+`comment` 透传）、
请求超时、连接超时/失败、`getHealth` OK/DOWN 两态、
`createOptionalObsControlProvider` 未配置返回 noop 单例引用。

### Regression tests

`pnpm test` 覆盖全 workspace；既有全部包测试零回归（新增独立包，
根 `tsconfig.json` 仅追加一条 reference）。

---

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含新包 `platform-obs` 真正被 `tsc -b` 构建） | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `noopObsControlPort` 的 `switchScene`/`getHealth` 恒定诚实失败 | 测试检查 |
| A08 | `ObsScene` 六个字面量值均可用 | 测试检查 |
| A09 | 无鉴权真实握手成功，`switchScene` 成功场景 `result:true` → `{ok:true}` | 测试检查 |
| A10 | 正确密码鉴权握手成功；客户端计算的鉴权值与官方算法独立计算值一致 | 测试检查 |
| A11 | 错误密码/需要鉴权但未配置密码，均诚实失败不悬挂 | 测试检查 |
| A12 | 请求超时诚实失败不悬挂；`requestStatus:{result:false,comment}` 透传为失败原因 | 测试检查 |
| A13 | 连接超时/失败诚实失败不悬挂 | 测试检查 |
| A14 | `getHealth()` 握手成功→OK、失败→DOWN 且 `error` 含原因 | 测试检查 |
| A15 | `createOptionalObsControlProvider` 未配置返回与 `noopObsControlPort` 同一引用；配置后走真实路径 | 测试检查 |
| A16 | 生产代码零第三方/workspace 依赖；`ws`/`@types/ws` 只在 `devDependencies` | 文件检查 |
| A17 | 未实现任何重连逻辑；未实现任何"何时切场景"判断；未实现真实 SAFETY region | 代码检查 |
| A18 | `error-registry`/`health-registry`/`watchdog`/`platform-twitch`/`runtime-kernel`/`operator-api`/`renderer` 均未被修改/import | git diff 比对 + 代码检查 |
| A19 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A20 | `specs/dev/DEV-064/` 节点文档齐全，`INDEX.md` T001–T003 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A21 | `git log` 新增恰 1 条提交，首行 `DEV-064: obs control (real OBS WebSocket v5 client, no reconnect, no failover decision logic)` | 命令 |
| A22 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交**；工作区无任何额外残留文件 | 命令 + `git status` 检查 |
| A23 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT → 仅
commit 代码+节点文档（一条提交）→ 写入但不提交 LEDGER/NODE_REPORT →
自行核实完成三要素、工作区无残留临时文件 → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A23。
