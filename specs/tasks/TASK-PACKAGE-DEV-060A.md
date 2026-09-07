# TASK PACKAGE — DEV-060A

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-060A |
| Node Name | Operator API |
| Milestone | M6 — Operations（第一个/优先节点，CR-013 已批准；DEV-060B Console UI 后置） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | 新建 `packages/operator-api`；依赖已冻结的 `@interactive-story/persistence`、`@interactive-story/runtime-kernel`；`packages/ai-host` 追加一个新文件（不改动既有 8 个模块） |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### 现实核对：CR-013 把 DEV-060 拆成 Operator API（本节点）与 Console UI（DEV-060B，后置）

`specs/audit/SPEC-AUDIT-001.md` 第 361 行、`specs/dev/DAG.md` 第 398/406
行一致记载：**CR-013（P3）已批准**——DEV-060 拆为 Operator API（优先）
与 Console UI（后置，排在本组末尾或 M8）。本节点只做 API/端点层，
不做任何 UI/页面渲染。

### 现实核对：Dev Spec 第 53 节定义了恰好 11 个 Operator Action，第 54 节要求 `OPERATOR_OVERRIDE` 事件保证审计完整

`specs/baseline/DEV_SPEC_V1.0.md` 第 1899-1922 行（第 53 节）逐字列出
11 个 action：`Pause / Resume / Mute Host / Unmute Host / Close
Interaction / Force Resolve / Replay Current Audio / Restart Scene /
Restore LKG / Switch OBS Failover / Emergency Stop`。第 1926-1951 行
（第 54 节）："Operator 可以改变运行流程，但不能偷偷修改 Dice
history/Resolved result/Event log；需要人工修复时必须产生
`OPERATOR_OVERRIDE` Event，保证审计完整。"`specs/dev/DAG.md` 第 398
行把 CR-013 的 Operator API 范围概括为"11 个 action 的端点 + 鉴权 +
`OPERATOR_OVERRIDE` 落库"——本节点三个交付物都来自这句话。

### 现实核对（本节点的核心裁决）：11 个 action 中只有 3 个有真实可调用的目标，其余 8 个"诚实占位"，不发 CR 改冻结的 `runtime-kernel`

Commander 在起草本节点前，独立核查了现有代码库（结论已获 USER
2026-09-07 确认，见下）：

- **有真实目标，本节点即可真正生效（3 个）**：
  - `Restore LKG` → `@interactive-story/persistence` 已有
    `restoreSession()`/`loadLatestSnapshot()`，可直接调用。
  - `Mute Host` / `Unmute Host` → 目前 `ai-host` 没有任何"当前是否
    静音"的可变状态；本节点新增一个不冻结的小型存储原语（`
    packages/ai-host/src/hostPermission.ts`），与 DEV-053 `hostMood.ts`
    同构，属于新增文件，不修改任何既有 7 个模块。
- **没有真实目标，本节点不发明、不假装生效（8 个）**：
  - `Pause` / `Resume` / `Close Interaction` / `Force Resolve` /
    `Replay Current Audio` / `Restart Scene`——`packages/runtime-kernel/
    src/machine.ts` 的 `RootEvent` 联合类型（`BOOT` /
    `STORY.DONE` / `INTERACTION.OPEN` / `VOTE` / `LOCK` /
    `NARRATIVE.DONE` / `ASSETS.READY` / `ASSETS.FAIL` /
    `AUDIO.PREPARE`/`READY`/`FAIL`/`DUCK`/`UNDUCK`/`STOP`/`PLAY_HOST`）
    里**没有任何对应事件**。`runtime-kernel` 自 M1（DEV-009/012）起
    冻结，新增这些事件变体属于改接口，需要走 CR。
  - `Switch OBS Failover` / `Emergency Stop`——`packages/runtime-kernel/
    src/placeholderRegions.ts` 证实 `safetyRegion` 目前只是
    `idlePlaceholder('SAFETY')`（`IDLE` 单态占位），Dev Spec 第 55
    节完整的 `HEALTHY/DEGRADED/RECOVERING/FAILOVER/EMERGENCY_STOP`
    状态图零代码对应；仓库里也没有任何 OBS 相关代码
    （`obs-websocket-js` 或类似客户端）。这两个 action 的目标子
    系统要等后续 M6 节点 DEV-063（Watchdog）/DEV-065（OBS Failover）/
    DEV-067（Emergency Stop）建成才存在。

USER 已于 2026-09-07 就"是否现在就对 `runtime-kernel` 发起改接口
的 CR"这一问题裁决：**不发 CR，诚实占位**——本节点为全部 11 个
action 建好稳定的端点/鉴权/审计契约，但对上述 8 个目标不存在的
action，handler 诚实返回 `ok:false` + 具体原因，不假装生效，不
碰 `runtime-kernel` 的冻结导出，不发明 `SAFETY`/OBS 的真实逻辑。
等后续 M6 节点真正建成对应子系统时，再对本节点发窄范围 CR 补上
真实实现（同 M2 `onSceneEnter` 系列窄范围 CR 的先例，只是这次是
"先占位、后补 CR"而不是"先补 CR、再占位"）。

### 现实核对：仓库里目前没有任何 HTTP 服务器，也没有任何生产入口进程同时装配 `runtime-kernel` + `persistence` + `ports`

全仓库唯一的网络服务器形态代码是 `apps/renderer/src/server/wsServer.ts`
（`ws` 库，仅 WebSocket，且只在测试文件里真正 `listen`）。没有
`express`/`fastify`/`http.createServer` 的生产用法，也没有任何
脚本/入口把 `runtime-kernel` 的 `RuntimeActor`、`persistence` 的
`DatabaseSync`、真实 `Ports` 一起装配成一个长期运行的进程。因此：

- **本节点用 Node 内置 `node:http` 模块**（零新增第三方依赖，同
  DEV-035/040"不新增依赖"先例），不引入 `express`/`fastify`。
- **`Restore LKG` 的范围止于"从持久化重建一个 `RuntimeActor` 并
  报告成功/失败"**，不做"热替换正在运行进程里的那个 actor"——
  因为目前没有任何真实运行的生产进程可供热替换，这个概念没有
  真实宿主，属于未来某个尚未建造的集成节点的职责。

---

## 2. 架构设计

### 2.1 `packages/ai-host/src/hostPermission.ts`（新文件）

```typescript
export type HostPermissionState = 'ALLOWED' | 'MUTED';

export interface HostPermissionStore {
  getPermission(): HostPermissionState;
  setPermission(permission: HostPermissionState): void;
}

export function createHostPermissionStore(
  initial: HostPermissionState = 'ALLOWED',
): HostPermissionStore {
  let current: HostPermissionState = initial;
  return {
    getPermission() {
      return current;
    },
    setPermission(permission) {
      current = permission;
    },
  };
}
```

- 与 DEV-053 `hostMood.ts` 同构：可变存储原语，零依赖，不做任何
  自动推导。
- **只有两个取值**（`ALLOWED`/`MUTED`），不复用 `egressGate.ts` 的
  三值 `HostPermission`（`ALLOWED|LIMITED|MUTED`）——`Mute
  Host`/`Unmute Host` 这两个 action 只对应这两个状态，`LIMITED`
  不是 11 个 action 里的任何一个，不发明用不到的第三态；同时保持
  本文件零依赖，不 `import` 任何既有 `ai-host` 模块（不需要为了
  复用一个类型定义就去读一个冻结文件）。
- 追加到 `packages/ai-host/src/index.ts`（第 9 行 `export`，不改
  既有 8 行）。

### 2.2 `packages/operator-api`（新包）

新增 `package.json`（`name: "@interactive-story/operator-api"`，
`dependencies`: `@interactive-story/persistence`、
`@interactive-story/runtime-kernel`，均 `workspace:*`；结构对齐
`packages/host-memory/package.json`）、`tsconfig.json`（对齐
`packages/host-memory/tsconfig.json`：`extends
"../../tsconfig.base.json"`，`outDir: "dist"`，`rootDir: "src"`，
`include: ["src/**/*"]`）。

#### 2.2.1 `src/operatorActions.ts`

```typescript
export type OperatorAction =
  | 'PAUSE'
  | 'RESUME'
  | 'MUTE_HOST'
  | 'UNMUTE_HOST'
  | 'CLOSE_INTERACTION'
  | 'FORCE_RESOLVE'
  | 'REPLAY_CURRENT_AUDIO'
  | 'RESTART_SCENE'
  | 'RESTORE_LKG'
  | 'SWITCH_OBS_FAILOVER'
  | 'EMERGENCY_STOP';

export const ALL_OPERATOR_ACTIONS: readonly OperatorAction[] = [
  'PAUSE',
  'RESUME',
  'MUTE_HOST',
  'UNMUTE_HOST',
  'CLOSE_INTERACTION',
  'FORCE_RESOLVE',
  'REPLAY_CURRENT_AUDIO',
  'RESTART_SCENE',
  'RESTORE_LKG',
  'SWITCH_OBS_FAILOVER',
  'EMERGENCY_STOP',
];

export function isOperatorAction(value: string): value is OperatorAction {
  return (ALL_OPERATOR_ACTIONS as readonly string[]).includes(value);
}

export interface OperatorActionResult {
  ok: boolean;
  action: OperatorAction;
  detail: string;
}
```

11 个字面量取值逐一对应 Dev Spec 第 53 节原文列表，一个不多、一个
不少（用大写+下划线命名风格，与 `RootEvent` 的 `INTERACTION.OPEN`
等点号风格区分，因为这是一个独立的、不进入 `runtime-kernel` 状态
机的动作枚举）。

#### 2.2.2 `src/operatorAuth.ts`

```typescript
export type OperatorAuthResult = { ok: true } | { ok: false; reason: string };

export interface OperatorAuthPort {
  authenticate(token: string | undefined): OperatorAuthResult;
}

export const noopOperatorAuthPort: OperatorAuthPort = {
  authenticate: () => ({ ok: false, reason: 'no OPERATOR_API_TOKEN configured' }),
};

export function createOperatorAuthProvider(expectedToken: string): OperatorAuthPort {
  return {
    authenticate(token) {
      if (token === undefined) return { ok: false, reason: 'missing operator token' };
      if (token !== expectedToken) return { ok: false, reason: 'invalid operator token' };
      return { ok: true };
    },
  };
}

export function createOptionalOperatorAuthProvider(env: NodeJS.ProcessEnv): OperatorAuthPort {
  const expectedToken = env.OPERATOR_API_TOKEN;
  if (!expectedToken) return noopOperatorAuthPort;
  return createOperatorAuthProvider(expectedToken);
}
```

同 DEV-040 `TwitchAuthPort`/`noopTwitchAuthPort`/
`createOptionalTwitchAuthProvider` 的诚实占位模式：环境变量
`OPERATOR_API_TOKEN` 未配置 → 退化为**拒绝一切请求**的 noop
单例（鉴权的安全默认值是"拒绝"，不是"放行"，这与 TwitchAuth
"允许降级为不可用"的语义不同，务必按此实现，不要反过来做成未配置
就放行）；配置了 → 精确字符串比较 Bearer token。Dev Spec 未定义
具体鉴权协议，不发明比 Bearer token 更复杂的机制。

#### 2.2.3 `src/operatorOverrideLog.ts`

```typescript
import type { DatabaseSync } from 'node:sqlite';
import { appendEvents, loadEvents } from '@interactive-story/persistence';
import type { RuntimeEvent } from '@interactive-story/runtime-kernel';
import type { OperatorAction } from './operatorActions.js';

export interface OperatorOverrideLogInput {
  sessionId: string;
  chapterId: string;
  action: OperatorAction;
  detail: string;
}

export function appendOperatorOverrideEvent(
  db: DatabaseSync,
  input: OperatorOverrideLogInput,
): RuntimeEvent {
  const existing = loadEvents(db, input.sessionId);
  let maxSequence = 0;
  for (const event of existing) {
    if (event.sequence > maxSequence) maxSequence = event.sequence;
  }
  const nextSequence = maxSequence + 1;
  const event: RuntimeEvent = {
    id: `op-${nextSequence}`,
    sequence: nextSequence,
    timestamp: new Date().toISOString(),
    type: 'OPERATOR_OVERRIDE',
    payload: { action: input.action, detail: input.detail },
    chapterId: input.chapterId,
    sessionId: input.sessionId,
    visibility: 'HIDDEN',
  };
  appendEvents(db, input.sessionId, [event]);
  return event;
}
```

- 走**持久化层旁路**：直接构造 `RuntimeEvent` 并调用
  `appendEvents`，不经过 `RuntimeActor.send()`（因为 `RootEvent`
  没有对应事件变体，且本节点裁决不改 `runtime-kernel`）。这意味着
  这条事件只出现在持久化的 `runtime_events` 表里，不会出现在某个
  存活 actor 内存中的 `getEventLog()` 结果里——如实记录，不隐藏
  这个取舍。
- `visibility: 'HIDDEN'`：这是内部审计事件，不是要展示给观众的
  事实，符合 CR-008/DEV-050 `getPublicState()` 投影"隐藏事实不
  外泄"的既有纪律。
- `sequence` 通过读取该 `sessionId` 已持久化事件的最大 `sequence`
  值 +1 计算（不依赖任何存活 actor 的内存计数器，因为可能没有
  存活 actor）。
- `id` 格式 `op-${sequence}`，与 `machine.ts` 内部 `emitLog` 的
  `ev-${seq}` 风格对齐但前缀不同，方便审计时一眼区分"来自 actor
  内存"还是"来自 Operator API 旁路"。

#### 2.2.4 `src/operatorDispatch.ts`

```typescript
import type { DatabaseSync } from 'node:sqlite';
import { loadLatestSnapshot, restoreSession } from '@interactive-story/persistence';
import { appendOperatorOverrideEvent } from './operatorOverrideLog.js';
import type { OperatorAction, OperatorActionResult } from './operatorActions.js';

export interface HostPermissionPort {
  setPermission(permission: 'ALLOWED' | 'MUTED'): void;
}

export interface OperatorDispatchDeps {
  db: DatabaseSync;
  sessionId: string;
  chapterId: string;
  chapterRootDir: string;
  seed: string;
  hostPermission: HostPermissionPort;
}

const NOT_WIRED_REASON: Record<
  Exclude<OperatorAction, 'MUTE_HOST' | 'UNMUTE_HOST' | 'RESTORE_LKG'>,
  string
> = {
  PAUSE: 'requires a new PAUSE RootEvent on the frozen runtime-kernel machine; deferred pending future CR',
  RESUME: 'requires a new RESUME RootEvent on the frozen runtime-kernel machine; deferred pending future CR',
  CLOSE_INTERACTION:
    'requires a new CLOSE_INTERACTION RootEvent on the frozen runtime-kernel machine; deferred pending future CR',
  FORCE_RESOLVE:
    'requires a new FORCE_RESOLVE RootEvent on the frozen runtime-kernel machine; deferred pending future CR',
  REPLAY_CURRENT_AUDIO:
    'requires a new REPLAY_CURRENT_AUDIO RootEvent on the frozen runtime-kernel machine; deferred pending future CR',
  RESTART_SCENE:
    'requires a new RESTART_SCENE RootEvent on the frozen runtime-kernel machine; deferred pending future CR',
  SWITCH_OBS_FAILOVER: 'OBS integration not yet built (planned DEV-064/DEV-065)',
  EMERGENCY_STOP: 'SAFETY region not yet built beyond placeholder (planned DEV-063/DEV-067)',
};

function runAction(deps: OperatorDispatchDeps, action: OperatorAction): OperatorActionResult {
  switch (action) {
    case 'MUTE_HOST':
      deps.hostPermission.setPermission('MUTED');
      return { ok: true, action, detail: 'host permission set to MUTED' };
    case 'UNMUTE_HOST':
      deps.hostPermission.setPermission('ALLOWED');
      return { ok: true, action, detail: 'host permission set to ALLOWED' };
    case 'RESTORE_LKG': {
      const existing = loadLatestSnapshot(deps.db, deps.sessionId);
      if (existing === undefined) {
        return { ok: false, action, detail: 'no persisted snapshot found for this session' };
      }
      restoreSession(deps.db, {
        sessionId: deps.sessionId,
        chapterRootDir: deps.chapterRootDir,
        seed: deps.seed,
      });
      return { ok: true, action, detail: 'restored latest persisted snapshot' };
    }
    default:
      return { ok: false, action, detail: NOT_WIRED_REASON[action] };
  }
}

export function dispatchOperatorAction(
  deps: OperatorDispatchDeps,
  action: OperatorAction,
): OperatorActionResult {
  const result = runAction(deps, action);
  appendOperatorOverrideEvent(deps.db, {
    sessionId: deps.sessionId,
    chapterId: deps.chapterId,
    action,
    detail: result.detail,
  });
  return result;
}
```

- `HostPermissionPort` 是本文件内**本地定义的最小结构类型**，不
  `import` `@interactive-story/ai-host`——同 DEV-035/040 用本地
  `Health` 类型镜像而不引入 workspace 依赖的先例，避免
  `operator-api` 反向依赖 `ai-host`（谁来真正传入一个
  `createHostPermissionStore()` 实例，是未来集成节点的职责，不是
  本节点的职责）。
- **`dispatchOperatorAction` 是全部 11 个 action 唯一的调用入口**，
  且**无论 `runAction` 返回 `ok:true` 还是 `ok:false`，都无条件
  追加一条 `OPERATOR_OVERRIDE` 事件**——审计完整性覆盖"尝试执行"
  本身，不只覆盖"成功执行"（对应 CR-013"`OPERATOR_OVERRIDE`
  落库"这句话的字面意思，也对应第 54 节"保证审计完整"的精神：
  一次操作意图，无论是否真的生效，都需要留痕）。
- `RESTORE_LKG` 先用 `loadLatestSnapshot` 判断是否存在快照，避免
  依赖 `restoreSession` 在无快照时抛异常这一控制流（该代码路径
  已存在于 `packages/persistence/src/recovery.ts`，本节点不修改
  它，只是不依赖异常做正常分支判断，符合仓库既有"用可辨识联合类型
  表达预期失败"的风格）。
- 8 个未接通的 action 各自有**具体、点名的**失败原因（不是一句
  通用的"not implemented"），方便审计与未来真正接通时逐一核对。

#### 2.2.5 `src/operatorHttpServer.ts`

```typescript
import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { isOperatorAction } from './operatorActions.js';
import type { OperatorAuthPort } from './operatorAuth.js';
import { dispatchOperatorAction, type OperatorDispatchDeps } from './operatorDispatch.js';

export interface OperatorHttpServerConfig {
  auth: OperatorAuthPort;
  dispatchDeps: OperatorDispatchDeps;
}

function extractBearerToken(header: string | undefined): string | undefined {
  if (header === undefined) return undefined;
  const match = /^Bearer (.+)$/.exec(header);
  return match?.[1];
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function isRequestBody(value: unknown): value is { action: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).action === 'string'
  );
}

async function handleRequest(
  config: OperatorHttpServerConfig,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== 'POST' || req.url !== '/operator/action') {
    sendJson(res, 404, { ok: false, reason: 'not found' });
    return;
  }

  const authResult = config.auth.authenticate(extractBearerToken(req.headers.authorization));
  if (!authResult.ok) {
    sendJson(res, 401, { ok: false, reason: authResult.reason });
    return;
  }

  let body: unknown;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    sendJson(res, 400, { ok: false, reason: 'invalid JSON body' });
    return;
  }

  const action = isRequestBody(body) ? body.action : undefined;
  if (action === undefined || !isOperatorAction(action)) {
    sendJson(res, 400, { ok: false, reason: 'unknown or missing action' });
    return;
  }

  sendJson(res, 200, dispatchOperatorAction(config.dispatchDeps, action));
}

export function createOperatorHttpServer(config: OperatorHttpServerConfig): Server {
  return createServer((req, res) => {
    void handleRequest(config, req, res);
  });
}
```

- 单一路由：`POST /operator/action`，JSON body `{ "action":
  "<OperatorAction>" }`，`Authorization: Bearer <token>` 头。不做
  11 个 action 各自独立路径（`/operator/actions/pause` 等）这种
  更复杂的路由表——一个路由 + body 里的 action 字段足够表达全部
  11 个动作，避免为不存在的需求发明路由框架。
- 用 Node 内置 `node:http`，零新增依赖。
- 鉴权失败返回 `401`；未知/缺失 action 或非法 JSON 返回 `400`；
  方法/路径不对返回 `404`；成功走到 `dispatchOperatorAction` 后
  统一 `200`（无论内部 `ok` 是 `true` 还是 `false`——HTTP 层面
  "请求处理成功"与"action 语义上是否真的生效"是两个独立的判断，
  后者体现在响应体的 `ok` 字段里，不体现在 HTTP 状态码里）。

### 2.3 `packages/operator-api/src/index.ts`（新文件，barrel）

```typescript
export * from './operatorActions.js';
export * from './operatorAuth.js';
export * from './operatorOverrideLog.js';
export * from './operatorDispatch.js';
export * from './operatorHttpServer.js';
```

### 2.4 根 `tsconfig.json` 追加一条 project reference

在 `references` 数组末尾（`host-memory` 之后）追加：

```json
{ "path": "./packages/operator-api" }
```

**这一步是必须的**——`pnpm typecheck`/`pnpm build` 都是 `tsc -b`
读根 `tsconfig.json` 的 `references` 列表来决定构建哪些包、以什么
顺序构建；漏掉这一步会导致新包完全不参与 `tsc -b`，六条命令里的
`typecheck`/`build` 可能"假绿"（新包代码里的类型错误不会被
发现）。

---

## 3. Scope

### Writable Scope

```
packages/ai-host/src/hostPermission.ts        （新增）
packages/ai-host/src/hostPermission.test.ts   （新增）
packages/ai-host/src/index.ts                 （追加一行导出）
packages/operator-api/package.json            （新增）
packages/operator-api/tsconfig.json           （新增）
packages/operator-api/src/index.ts            （新增）
packages/operator-api/src/operatorActions.ts       （新增）
packages/operator-api/src/operatorActions.test.ts  （新增）
packages/operator-api/src/operatorAuth.ts          （新增）
packages/operator-api/src/operatorAuth.test.ts     （新增）
packages/operator-api/src/operatorOverrideLog.ts       （新增）
packages/operator-api/src/operatorOverrideLog.test.ts  （新增）
packages/operator-api/src/operatorDispatch.ts       （新增）
packages/operator-api/src/operatorDispatch.test.ts  （新增）
packages/operator-api/src/operatorHttpServer.ts       （新增）
packages/operator-api/src/operatorHttpServer.test.ts  （新增）
tsconfig.json                                  （根，追加一条 references 条目）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-060A/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加，写入不提交，同 Constraint 6）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息，写入不提交）
```

### Read-only Scope

```
packages/ai-host/src/egressGate.ts、commentPipeline.ts、hostPersona.ts、hostMood.ts、hostScheduler.ts、hostLLMProvider.ts、hostTtsProvider.ts、hostAvatar.ts（Read-only，不 import）
packages/persistence/**、packages/runtime-kernel/**（Read-only，只按既有导出调用，不修改其内容）
```

### Forbidden Scope

```
修改 packages/platform-core/**、packages/platform-twitch/**、packages/renderer/**
修改 packages/runtime-kernel/** 的任何文件（新增 RootEvent 变体、修改 placeholderRegions.ts 等一律禁止——本节点裁决不发 CR）
修改 packages/ai-host/src/egressGate.ts、commentPipeline.ts、hostPersona.ts、hostMood.ts、hostScheduler.ts、hostLLMProvider.ts、hostTtsProvider.ts、hostAvatar.ts
实现 SAFETY region 的任何真实状态转换逻辑（HEALTHY/DEGRADED/RECOVERING/FAILOVER/EMERGENCY_STOP）
实现任何真实 OBS 集成（obs-websocket 或类似客户端、真实 OBS 场景切换）
实现任何"热替换正在运行进程里的 RuntimeActor"的机制（Restore LKG 止于重建+报告成功/失败）
新增第三方 npm 依赖（只用 node:http/node:sqlite 等 Node 内置模块 + 已冻结的 workspace 包）
让 Pause/Resume/Close Interaction/Force Resolve/Replay Current Audio/Restart Scene/Switch OBS Failover/Emergency Stop 这 8 个 action 返回 ok:true 或产生任何真实副作用（诚实占位，不能假装生效）
```

---

## 4. Required Skills

### Required

- Node 内置 `node:http` 手写最小路由/鉴权/JSON body 解析（无框架）
- 判别联合类型（discriminated union）风格的错误处理，同 DEV-034/040/056/057 先例
- 新建 workspace 包（`package.json`/`tsconfig.json`/根 `tsconfig.json` project reference）

### Forbidden / Unnecessary

- 任何 HTTP 框架（`express`/`fastify`/`koa` 等）
- 任何 OBS SDK/客户端
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/baseline/DEV_SPEC_V1.0.md` 第 1899-1951 行（第 53-54 节） | 11 个 action 清单与 `OPERATOR_OVERRIDE` 审计要求的权威来源 |
| `specs/dev/DAG.md` 第 398 行 + `specs/audit/SPEC-AUDIT-001.md` 第 361 行（CR-013） | "Operator API 优先、Console UI 后置"拆分裁定的权威来源 |
| `packages/runtime-kernel/src/machine.ts`（`RootEvent`）、`placeholderRegions.ts`（`safetyRegion`） | 证明 8 个 action 目标子系统不存在的权威来源 |
| `packages/persistence/src/recovery.ts`/`snapshotStore.ts`/`eventStore.ts` | `Restore LKG`/`OPERATOR_OVERRIDE` 落库可直接复用的既有导出 |
| `packages/platform-twitch/src/twitchAuth.ts`（DEV-040） | 鉴权占位模式（未配置→noop）的既有先例 |
| `packages/ai-host/src/hostMood.ts`（DEV-053） | `hostPermission.ts` 存储原语结构的既有先例 |
| USER 2026-09-07 裁决 | 确认"不发 CR，诚实占位"这一核心范围决策 |

---

## 6. Outputs

1. `packages/ai-host/src/hostPermission.ts`：`HostPermissionState`/
   `HostPermissionStore`/`createHostPermissionStore`
2. `packages/operator-api` 新包：`OperatorAction`/
   `ALL_OPERATOR_ACTIONS`/`isOperatorAction`/`OperatorActionResult`
   （`operatorActions.ts`）、`OperatorAuthPort`/
   `noopOperatorAuthPort`/`createOperatorAuthProvider`/
   `createOptionalOperatorAuthProvider`（`operatorAuth.ts`）、
   `appendOperatorOverrideEvent`（`operatorOverrideLog.ts`）、
   `HostPermissionPort`/`OperatorDispatchDeps`/
   `dispatchOperatorAction`（`operatorDispatch.ts`）、
   `OperatorHttpServerConfig`/`createOperatorHttpServer`
   （`operatorHttpServer.ts`）
3. `specs/dev/DEV-060A/DECISIONS.md`，至少覆盖：为何不发 CR 改
   `runtime-kernel`（诚实占位，等真正需要时再发窄范围 CR）、为何
   `OPERATOR_OVERRIDE` 对全部 11 个 action 无条件记录（审计完整性
   覆盖"尝试"本身）、为何用直接构造 `RuntimeEvent`+`appendEvents`
   旁路而不是新增 `RootEvent` 变体、为何 `HostPermissionState` 只
   两个取值而不复用 `egressGate.ts` 的三值 `HostPermission`、为何
   用 `node:http` 原生模块而不引入框架、为何鉴权用简单 Bearer
   token 精确比较、为何 `Restore LKG` 止于"重建+报告"不做"热替换
   进程"

---

## 7. Task Breakdown

### T001 — 节点文档

- **Allowed Files**：`specs/dev/DEV-060A/{INDEX,REQUIREMENTS,ACCEPTANCE,REPORT}.md`
- **Acceptance**：四份节点文档存在；`INDEX.md` 含 Task Order T001–T003。

---

### T002 — 基础原语：`hostPermission.ts` + `operator-api` 包骨架（actions/auth/override log）

- **Allowed Files**：
  `packages/ai-host/src/hostPermission.ts`、`.test.ts`、`index.ts`；
  `packages/operator-api/package.json`、`tsconfig.json`；
  `packages/operator-api/src/{index,operatorActions,operatorAuth,operatorOverrideLog}.ts`
  与对应 `.test.ts`；根 `tsconfig.json`。
- **Requirements**：按第 2.1、2.2.1、2.2.2、2.2.3、2.3、2.4 节实现。
- **Acceptance（功能部分）**：
  - `createHostPermissionStore()` 默认 `getPermission()` 返回
    `'ALLOWED'`；`setPermission('MUTED')` 后 `getPermission()` 返回
    `'MUTED'`；可再切回 `'ALLOWED'`。
  - `ALL_OPERATOR_ACTIONS` 恰好包含 Dev Spec 第 53 节的 11 个 action
    （集合相等，不多不少）；`isOperatorAction` 对合法值返回
    `true`，对任意非法字符串返回 `false`。
  - `createOptionalOperatorAuthProvider(env)`：`env.OPERATOR_API_TOKEN`
    未设置 → 返回的 port 对**任意** token（包括 `undefined`）都
    `authenticate` 为 `{ok:false}`；设置后，正确 token → `{ok:true}`，
    错误 token → `{ok:false, reason:'invalid operator token'}`，
    `undefined` token → `{ok:false, reason:'missing operator token'}`。
  - `appendOperatorOverrideEvent`：对一个空事件表的 session 首次
    调用，写入 `sequence:1`、`type:'OPERATOR_OVERRIDE'`、
    `visibility:'HIDDEN'`、`payload` 含传入的 `action`/`detail`；
    连续调用两次，第二次 `sequence` 为 2（严格递增，不重复）；
    调用后可通过 `loadEvents` 读到刚写入的事件。
  - `tsc -b` 能识别并构建 `operator-api`（根 `tsconfig.json`
    `references` 已追加）。
- **Requirements（验证部分）**：执行 `pnpm install`、`pnpm
  typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、
  `pnpm test`，全部确认退出码 0 后再进入 T003（T002 阶段不
  commit，继续累积到 T003 一并提交）。

---

### T003 — `operatorDispatch.ts` + `operatorHttpServer.ts` + 全量验证、REPORT 与 commit

- **Allowed Files**：`packages/operator-api/src/{operatorDispatch,operatorHttpServer,index}.ts` 与对应 `.test.ts`、`specs/dev/DEV-060A/{INDEX,REPORT,DECISIONS}.md`
- **Requirements**：按第 2.2.4、2.2.5、2.3 节实现。
- **Acceptance（功能部分）**：
  - `dispatchOperatorAction` 对 `MUTE_HOST`/`UNMUTE_HOST` 返回
    `ok:true` 且 `hostPermission` 侧真实状态改变；对预先写好一条
    快照记录的 session，`RESTORE_LKG` 返回 `ok:true`；对没有任何
    快照记录的 session，`RESTORE_LKG` 返回 `ok:false` 且 `detail`
    含"no persisted snapshot"字样。
  - `dispatchOperatorAction` 对其余 8 个 action（`PAUSE`/`RESUME`/
    `CLOSE_INTERACTION`/`FORCE_RESOLVE`/`REPLAY_CURRENT_AUDIO`/
    `RESTART_SCENE`/`SWITCH_OBS_FAILOVER`/`EMERGENCY_STOP`）均返回
    `ok:false`，且各自 `detail` 与该 action 具体对应（不是同一句
    通用文案），且调用不抛异常。
  - **对全部 11 个 action 逐一调用一次** `dispatchOperatorAction`
    （可用 `ALL_OPERATOR_ACTIONS.forEach`/`it.each` 等方式覆盖，
    不要只测 3-4 个代表值），验证每次调用后该 session 的持久化
    事件表都新增恰好一条 `type:'OPERATOR_OVERRIDE'` 事件（用
    `loadEvents` 核实），`sequence` 跨 11 次调用严格递增无重复。
  - `createOperatorHttpServer` 起一个真实监听的 server（`port:0`，
    同 `apps/renderer/src/server/wsServer.test.ts` 的既有测试先例）：
    - 正确 Bearer token + 合法 `action` body → HTTP 200，响应体
      JSON 与 `dispatchOperatorAction` 的返回值字段一致。
    - 缺失/错误 token → HTTP 401。
    - 鉴权环境变量未配置（用 `noopOperatorAuthPort`）→ 任意请求
      HTTP 401（默认拒绝，不是默认放行）。
    - body 里 `action` 字段是未知字符串 → HTTP 400。
    - 请求体不是合法 JSON → HTTP 400。
    - 错误的方法或路径（如 `GET /operator/action`）→ HTTP 404。
- **Requirements（回归部分）**：`pnpm test` 全量跑通，既有全部包
  测试零改动通过。
- **Requirements（验证部分）**：
  1. `packages/operator-api/src/index.ts` 追加剩余两个模块的导出。
  2. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  3. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  4. **`DECISIONS.md` 必须已提交**，覆盖第 6 节列出的全部要点。
  5. 更新 `INDEX.md`：T001–T003 全部勾选，`Status:` 改为 `READY_FOR_REVIEW`。
  6. **写入（不提交）** `specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-060A.md` 消息文件与 `specs/comms/LEDGER.md` 追加行（msg_id 取当前最大序号 + 1）。
  7. `git add`（仅本节点 Writable Scope 内文件，**不包含** LEDGER.md 与刚写的 NODE_REPORT 消息文件）`&& git commit`，首行：`DEV-060A: operator API (11-action endpoint + auth + OPERATOR_OVERRIDE audit, honest stubs for 8 unbuilt targets)`，**恰 1 条提交**。
  8. 自行核实：`git log -1` 只看到这一条新提交、NODE_REPORT 消息文件与 LEDGER 追加行存在于工作区但未提交。
  9. **STOP**。
- **Acceptance（命令部分）**：六条命令全部退出码 0；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-060A INDEX

Status: IN_PROGRESS

## Current Node

DEV-060A — Operator API

## Objective

新建 `packages/operator-api`：11 个 Operator Action 的端点/鉴权/
`OPERATOR_OVERRIDE` 审计落库（第 53-54 节）。CR-013 已批准把 DEV-060
拆为本节点（Operator API，优先）与 DEV-060B（Console UI，后置）。
11 个 action 中只有 `Restore LKG`/`Mute Host`/`Unmute Host` 三个有
真实可调用目标，其余 8 个因目标子系统不存在（`runtime-kernel` 冻结
无对应 `RootEvent`；`SAFETY`/OBS 均是占位/不存在）而诚实占位，不
发 CR、不假装生效（USER 2026-09-07 已就此裁决）。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 节点文档
- [ ] T002 hostPermission.ts + operator-api 包骨架（actions/auth/override log）
- [ ] T003 operatorDispatch.ts + operatorHttpServer.ts + 全量验证 + REPORT + commit + NODE_REPORT（不单独提交 LEDGER/NODE_REPORT）

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；`git log` 新增恰 1 条提交；`DECISIONS.md` 已
入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；LEDGER 追加行与
NODE_REPORT 消息文件已写入工作区但**未提交**。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **不对 `runtime-kernel` 发起任何改接口的 CR**——不新增
   `RootEvent` 变体，不修改 `placeholderRegions.ts`（USER 2026-09-07
   裁决）。
2. **8 个目标不存在的 action 必须诚实返回 `ok:false` + 具体原因**，
   不允许返回 `ok:true` 或产生任何真实副作用。
3. **`dispatchOperatorAction` 对全部 11 个 action、无论 `ok`
   真假，都必须无条件追加一条 `OPERATOR_OVERRIDE` 事件**——这是
   审计完整性的核心不变式，不能有任何绕过路径。
4. **不实现任何真实 SAFETY region 状态转换逻辑或 OBS 集成**。
5. **不新增任何第三方 npm 依赖**（只用 `node:http`/`node:sqlite`
   等 Node 内置模块）。
6. **不实现"热替换正在运行进程里的 `RuntimeActor`"**——`Restore
   LKG` 止于"从持久化重建并报告成功/失败"。
7. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
8. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发
   `EXECUTOR_QUERY`，等 `SCOPE_RULING`。
9. **T003 提交后，LEDGER 追加行与自己的 NODE_REPORT 消息文件一律不
   要再提交**——写入工作区即可，留给 Commander 收尾统一提交。

---

## 10. Non-goals / Out-of-scope

- DEV-060B（Console UI）——本节点完全不做任何页面/UI。
- `Pause`/`Resume`/`Close Interaction`/`Force Resolve`/`Replay
  Current Audio`/`Restart Scene` 的真实生效逻辑（需要未来对
  `runtime-kernel` 发 CR）。
- `Switch OBS Failover`/`Emergency Stop` 的真实生效逻辑（需要
  DEV-063/065/067 先建成对应子系统）。
- 任何生产环境的入口进程/部署脚本（把 `runtime-kernel` +
  `persistence` + 真实 `Ports` + 本节点的 HTTP server 一起装配
  起来长期运行，是未来集成节点的职责）。
- Operator 权限分级/多用户/审计查询界面（Dev Spec 未定义，不发明）。

---

## 11. Tests

### Unit tests

T002：`hostPermission.ts` 存储原语读写；`operatorActions.ts` 的
11 个字面量集合相等性 + 类型守卫；`operatorAuth.ts` 未配置/正确/
错误/缺失 token 四种鉴权结果；`operatorOverrideLog.ts` 事件写入
形状与 `sequence` 递增。

T003：`operatorDispatch.ts` 对全部 11 个 action 逐一调用（3 个
真实生效 + 8 个诚实占位）及每次调用的审计事件落库；
`operatorHttpServer.ts` 真实监听端口下的鉴权/路由/JSON 处理全
路径（200/400/401/404）。

### Regression tests

`pnpm test` 覆盖全 workspace；既有全部包测试零回归（新增独立包/
文件，`ai-host`/根 `tsconfig.json` 仅追加，不修改任何既有导出）。

---

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含新包 `operator-api` 真正被 `tsc -b` 构建） | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `createHostPermissionStore()` 默认 `ALLOWED`，`setPermission` 读写往返正确 | 测试检查 |
| A08 | `ALL_OPERATOR_ACTIONS` 与 Dev Spec 第 53 节 11 个 action 集合相等；`isOperatorAction` 类型守卫正确 | 测试检查 |
| A09 | `createOptionalOperatorAuthProvider` 四种鉴权场景（未配置/正确/错误/缺失 token）结果正确，未配置时默认**拒绝**而非放行 | 测试检查 |
| A10 | `appendOperatorOverrideEvent` 写入的事件 `type`/`visibility`/`payload`/`sequence` 递增均正确，可被 `loadEvents` 读回 | 测试检查 |
| A11 | `dispatchOperatorAction` 对 `MUTE_HOST`/`UNMUTE_HOST`/`RESTORE_LKG`（有快照与无快照两种场景）行为正确 | 测试检查 |
| A12 | `dispatchOperatorAction` 对其余 8 个 action 均返回 `ok:false` + 各自具体原因，不抛异常，无真实副作用 | 测试检查 |
| A13 | 对全部 11 个 action 逐一调用，每次调用后均产生恰好一条新的 `OPERATOR_OVERRIDE` 持久化事件，`sequence` 跨 11 次调用严格递增无重复 | 测试检查 |
| A14 | `createOperatorHttpServer` 的 200/400/401/404 全路径（含鉴权未配置默认 401）均正确 | 测试检查 |
| A15 | 未新增第三方 npm 依赖（只用 Node 内置模块 + 已冻结 workspace 包） | 文件检查 |
| A16 | `platform-core/**`、`platform-twitch/**`、`runtime-kernel/**`、`renderer/**`、`ai-host` 既有 8 个模块均未被修改 | git diff 比对 |
| A17 | 未实现任何真实 SAFETY/OBS 逻辑；未新增 `RootEvent` 变体；未实现"热替换进程"机制 | 代码检查 |
| A18 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A19 | `specs/dev/DEV-060A/` 节点文档齐全，`INDEX.md` T001–T003 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A20 | `git log` 新增恰 1 条提交，首行 `DEV-060A: operator API (11-action endpoint + auth + OPERATOR_OVERRIDE audit, honest stubs for 8 unbuilt targets)` | 命令 |
| A21 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A22 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT → 仅
commit 代码+节点文档（一条提交）→ 写入但不提交 LEDGER/NODE_REPORT →
自行核实完成三要素 → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A22。
