# TASK PACKAGE — DEV-040

## 1. Node Identity

| Field | Value |
|---|---|
| Node ID | DEV-040 |
| Node Name | Twitch OAuth |
| Milestone | M4 — Twitch Complete（第一个节点） |
| Status | ISSUED → 待 Codex 施工 |
| Dependencies | M2 + M3（M3 真实可施工范围已完成；DEV-038 推迟至 M5，见 `DAG.md`）——本节点是全项目第一个 Twitch/平台相关节点，仓库里没有任何可复用的既有代码 |
| Commander | Claude |
| Executor | pi（协议角色名 `OPENCODE`） |

### USER 已裁决：不绑定真实账号/密钥，占位实现即可

USER 明确指示（标准指令，适用于本节点及未来任何需要外部账号/密钥的节点）：
**目前不会绑定任何真实账号和密钥，占位就行**。本节点因此采用与 DEV-034+035
（TTS Provider）完全相同的模式——定义契约 + 写真正会发 HTTP 请求的实现，
未配置凭据时诚实退化为 noop，不强迫 USER 现在就有 Twitch 开发者账号/已完成
交互式登录授权。**Twitch OAuth 的"用户登录同意"step 本质是一次性人工操作
（访问 Twitch 授权页、登录、点击同意），不是代码能替 USER 完成的事**——这与
API key 场景不同但精神一致：代码只负责"给定已经拿到的凭据，如何刷新/获取
可用的 access token"，不负责"如何一开始拿到这些凭据"。

### 范围核对：只做"用 refresh_token 换 access_token"，不做交互式授权、不做
EventSub/Chat 客户端

`DAG.md` 第 212 行：`DEV-040 | Twitch OAuth`；第 45 节"必须支持"列表把
`OAuth refresh` 列为 Twitch Adapter 看门狗的能力之一（第 1761 行）；第 43 节
`LivePlatformAdapter` 统一接口（`connect/disconnect/onChat/sendChat/
getHealth`）是 **DEV-041/042/046** 的职责，本节点完全不碰。已核对仓库现状：
`packages/` 下没有 `platform-twitch`、`ai-host` 任何目录，`DAG.md` 第 339 行
"保留 17 包"清单明确列出 `platform-twitch`——本节点是这个包的第一次创建。
Twitch 官方 OAuth2 token 端点（`https://id.twitch.tv/oauth2/token`，
`grant_type=refresh_token`）是公开文档化的标准机器对机器接口，不涉及任何
交互式重定向。**本节点不实现**：交互式授权码流程（device code / authorization
code 的首次获取）、access token 的缓存/过期调度（留给未来消费方，如
DEV-041/045）、`/oauth2/validate` 校验端点（不在本节点范围，避免过度设计）。

---

## 2. 架构设计

### 2.1 `packages/platform-twitch/src/twitchAuth.ts`——契约 + 真实实现

```typescript
export interface TwitchTokenResult {
  accessToken: string;
  expiresInSeconds: number;
  scopes: string[];
}

export type TwitchAuthResult =
  | { ok: true; token: TwitchTokenResult }
  | { ok: false; reason: string };

export interface TwitchAuthPort {
  getAccessToken(): Promise<TwitchAuthResult>;
}

export const noopTwitchAuthPort: TwitchAuthPort = {
  getAccessToken: async () => ({ ok: false, reason: 'no Twitch OAuth credentials configured' }),
};

export interface TwitchAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  baseUrl?: string;          // 测试注入，默认 https://id.twitch.tv
  fetchImpl?: typeof fetch;  // 测试注入
}

export function createTwitchAuthProvider(config: TwitchAuthProviderConfig): TwitchAuthPort
```

- `getAccessToken()`：POST 到 `${baseUrl}/oauth2/token`，`Content-Type:
  application/x-www-form-urlencoded`，body 为
  `grant_type=refresh_token&refresh_token={refreshToken}&client_id={clientId}&client_secret={clientSecret}`。
- 非 200 或响应体不是预期 JSON 形状 → `{ok:false, reason: string}`（不抛异常，
  与 `TtsSynthesisResult` 一致的可辨识联合风格）。
- 网络异常（`fetch` 抛错）→ 同样捕获为 `{ok:false, reason}`，不让异常冒出
  接口之外。
- 成功 → 解析 Twitch 响应体 `{access_token, expires_in, scope}`（`scope`
  为字符串数组），映射为 `TwitchTokenResult`，返回 `{ok:true, token}`。
- **零新增 npm 依赖**：Node ≥22 原生 `fetch`/`URLSearchParams` 已足够构造
  `application/x-www-form-urlencoded` body，不需要任何 OAuth 客户端库或
  Twitch 官方 SDK。
- **不持久化/不缓存** `refreshToken`/`accessToken`——每次调用都是一次独立
  的、无状态的换取请求；是否缓存、何时提前刷新，是未来消费方（EventSub
  Client 建立连接前）的职责，本节点不预设。

### 2.2 `createOptionalTwitchAuthProvider(env)`——凭据可选的组合入口

```typescript
export function createOptionalTwitchAuthProvider(env: NodeJS.ProcessEnv): TwitchAuthPort {
  const clientId = env.TWITCH_CLIENT_ID;
  const clientSecret = env.TWITCH_CLIENT_SECRET;
  const refreshToken = env.TWITCH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return noopTwitchAuthPort;
  return createTwitchAuthProvider({ clientId, clientSecret, refreshToken });
}
```

三个环境变量任一缺失都直接返回 `noopTwitchAuthPort` **本体**（`===` 身份比较，
不是行为相同的另一份实现）——诚实反映"现在没有可用的真实凭据"，零副作用，
零网络请求。这是 USER"占位就行"指示的具体落地方式，与 DEV-035
`createOptionalElevenLabsTtsProvider` 完全同构。

### 2.3 `getTwitchAuthHealth`/`getOptionalTwitchAuthHealth`——CR-019

`platform-twitch` 是全新的包，第一次引入即已是真实网络 IO，CR-019 从创建起
就适用。参照 DEV-035 `getElevenLabsHealth` 的风格：

```typescript
export async function getTwitchAuthHealth(config: TwitchAuthProviderConfig): Promise<Health>
export async function getOptionalTwitchAuthHealth(env: NodeJS.ProcessEnv): Promise<Health>
```

- 探测方式：直接调用一次 `createTwitchAuthProvider(config).getAccessToken()`
  ——`ok:true` → `OK`（含 `latencyMs`）；`ok:false` → `DOWN`（含 `error`，
  取自 `reason`）。**不额外引入 `/oauth2/validate` 端点**（第 1 节已说明
  排除理由），复用本节点唯一实现的能力做探测，与 DEV-035"按需主动探测、
  不引入模块级可变状态"的先例一致。
- `getOptionalTwitchAuthHealth`：三个环境变量任一缺失 → 直接返回
  `{status:'DOWN', error:'no Twitch OAuth credentials configured'}`，零
  网络请求；否则委托 `getTwitchAuthHealth`。

---

## 3. Scope

### Writable Scope

```
packages/platform-twitch/                                  （新增包）
packages/platform-twitch/package.json
packages/platform-twitch/tsconfig.json
packages/platform-twitch/src/twitchAuth.ts
packages/platform-twitch/src/twitchAuth.test.ts
packages/platform-twitch/src/index.ts
tsconfig.json                                               （追加 references 一条）
```

### Writable Scope — 节点文档与通信

```
specs/dev/DEV-040/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

### Read-only Scope

```
packages/shared/src/health.ts（DEV-010 冻结，Health 类型契约参照）
packages/persistence/src/health.ts、packages/audio-engine/src/elevenLabsTtsProvider.ts（DEV-035 冻结，getHealth/noop-optional 实现风格参照）
packages/audio-engine/package.json、tsconfig.json（新建包结构参照）
其余同既有节点惯例
```

### Forbidden Scope

```
创建 packages/ai-host（M5 的职责，本节点与 Host 无关）
实现 LivePlatformAdapter 的 connect/disconnect/onChat/sendChat（DEV-041/042/046 的职责）
实现 EventSub WebSocket 客户端（DEV-041 的职责）
实现交互式授权码/device code 首次获取流程（一次性人工操作，不是代码职责，见第 1 节）
实现 access token 缓存/过期调度/提前刷新逻辑（留给未来消费方）
实现 /oauth2/validate 校验端点调用（不在本节点范围）
新增任何 npm 依赖（Node 原生 fetch/URLSearchParams 已足够）
修改 packages/audio-engine/**、packages/runtime-kernel/**、apps/renderer/**
```

---

## 4. Required Skills

### Required

- Node 原生 `fetch`/`URLSearchParams` 构造 `application/x-www-form-urlencoded` 请求体
- 外部服务调用的错误处理（区分 HTTP 错误、网络错误、非预期响应体，全部转为可辨识联合，不抛异常）
- 新建 pnpm workspace 包的标准结构（`package.json`/`tsconfig.json`，参照 `audio-engine`）

### Forbidden / Unnecessary

- 任何第三方 HTTP 客户端库（axios/node-fetch/undici 等——原生已够用）
- 任何 Twitch 官方/第三方 OAuth SDK
- 第 70 节禁止清单全部

---

## 5. Inputs

| Input | 用途 |
|---|---|
| `specs/baseline/DEV_SPEC_V1.0.md` 第 43/44/45 节 | Twitch Adapter 架构定位、OAuth refresh 能力要求的产品依据 |
| `packages/audio-engine/src/elevenLabsTtsProvider.ts`（Read-only，DEV-035 冻结） | 外部 HTTP 服务 Provider 的实现风格参照（noop 可选退化、getHealth 主动探测、可辨识联合错误处理） |
| `packages/shared/src/health.ts`（Read-only） | `Health` 类型契约 |
| `packages/audio-engine/package.json`/`tsconfig.json`（Read-only） | 新建 workspace 包的结构参照 |
| USER 裁决记录（本文件第 1 节） | 不绑定真实账号/密钥，占位实现即可 |

---

## 6. Outputs

1. 新包 `packages/platform-twitch`（`package.json`/`tsconfig.json`/`src/index.ts`）
2. `TwitchAuthPort`/`TwitchAuthResult`/`TwitchTokenResult`/`noopTwitchAuthPort`（`twitchAuth.ts`）
3. `createTwitchAuthProvider`/`TwitchAuthProviderConfig`
4. `createOptionalTwitchAuthProvider`
5. `getTwitchAuthHealth`/`getOptionalTwitchAuthHealth`
6. `specs/dev/DEV-040/DECISIONS.md`，至少覆盖：为何零新增依赖（原生
   fetch/URLSearchParams）、为何不实现交互式授权首次获取（一次性人工操作）、
   为何不做缓存/过期调度（留给未来消费方）、为何不额外引入
   `/oauth2/validate`（复用 `getAccessToken` 本身做健康探测）、`Health`
   类型如何落地（复用/参照 `@interactive-story/shared` 的形状）

---

## 7. Task Breakdown

### T001 — 新建包骨架 + 节点文档

- **Allowed Files**：`packages/platform-twitch/package.json`、`tsconfig.json`、`specs/dev/DEV-040/INDEX.md`、`REQUIREMENTS.md`、`ACCEPTANCE.md`、`REPORT.md`、`tsconfig.json`（根，追加一条 references）
- **Requirements**：`package.json` 参照 `audio-engine` 结构（`name:
  "@interactive-story/platform-twitch"`、`private:true`、`type:"module"`、
  `main/types` 指向 `dist`、`exports`、`scripts.build: "tsc -b"`）；
  `tsconfig.json` `extends "../../tsconfig.base.json"`；根 `tsconfig.json`
  的 `references` 数组追加 `{ "path": "./packages/platform-twitch" }`。
- **Acceptance**：四份节点文档存在；`INDEX.md` 含 Task Order
  T001–T003；新包骨架可被 `pnpm install` 识别（workspace 通配符
  `packages/*` 已覆盖，无需改 `pnpm-workspace.yaml`）。

---

### T002 — `twitchAuth.ts` + 测试

- **Allowed Files**：`packages/platform-twitch/src/twitchAuth.ts`、`.test.ts`
- **Requirements**：按第 2.1/2.2/2.3 节实现。全部网络调用必须通过可注入的
  `fetchImpl` 测试，**测试不得发出任何真实网络请求**。
- **Acceptance**：
  - `createOptionalTwitchAuthProvider(env 缺任一变量)` 返回值**严格等于**
    （`===`）`noopTwitchAuthPort`（身份比较）。
  - 注入返回 200 + 正确 JSON body 的假 `fetch` → `getAccessToken()` 返回
    `{ok:true, token:{accessToken, expiresInSeconds, scopes}}`，字段映射
    正确（`access_token→accessToken`、`expires_in→expiresInSeconds`、
    `scope→scopes`）。
  - 注入返回非 200 的假 `fetch` → `{ok:false, reason}`，不抛异常。
  - 注入抛异常的假 `fetch` → `{ok:false, reason}`，不抛异常冒出接口之外。
  - 请求构造正确性：断言假 `fetch` 收到的 URL 为
    `${baseUrl}/oauth2/token`、method 为 `POST`、`Content-Type` 为
    `application/x-www-form-urlencoded`、body 含正确的
    `grant_type=refresh_token`/`refresh_token`/`client_id`/`client_secret`。
  - `getOptionalTwitchAuthHealth(env 缺任一变量)` → `{status:'DOWN',
    error: string}`，零网络请求（断言假 `fetch` 未被调用）。
  - `getTwitchAuthHealth` 对注入的 200/非 200/异常假 `fetch` 分别返回
    `OK`/`DOWN`/`DOWN`。

---

### T003 — `index.ts` 导出 + 全量验证、REPORT 与 commit

- **Allowed Files**：`packages/platform-twitch/src/index.ts`、`specs/dev/DEV-040/INDEX.md`、`REPORT.md`、`DECISIONS.md`、`specs/comms/LEDGER.md`（仅追加）、`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-040.md`
- **Requirements**：
  1. `index.ts` 导出 T002 全部公开符号。
  2. 依次执行并记录：`pnpm install`、`pnpm typecheck`、`pnpm lint`、`pnpm format:check`、`pnpm build`、`pnpm test`。
  3. 填写 `REPORT.md`，逐条对应第 12 节全部 A 项。
  4. **`DECISIONS.md` 必须已提交**，覆盖第 6 节列出的全部要点。
  5. 更新 `INDEX.md`：T001–T003 全部勾选，`Status:` 从 `IN_PROGRESS` 改为 `READY_FOR_REVIEW`。
  6. `git add -A && git commit`，提交信息首行：`DEV-040: twitch oauth (token refresh provider)`。
  7. 追加 LEDGER 行，发 `NODE_REPORT`。
  8. **在结束前自行核实**：`git log -1` 能看到你的提交、NODE_REPORT 消息文件
     已存在、LEDGER 已追加对应行。三者缺一都不算完成，不要提前停止。
  9. **STOP**。
- **Acceptance**：六条命令全部退出码 0；测试过程零真实网络请求；`git log` 新增恰 1 条提交。

---

## 8. Node INDEX Requirements

```markdown
# DEV-040 INDEX

Status: IN_PROGRESS

## Current Node

DEV-040 — Twitch OAuth

## Objective

全项目第一个 Twitch/平台相关节点：新建 `packages/platform-twitch` 包，实现
`TwitchAuthPort` 契约的真实版本——`createTwitchAuthProvider`（原生 fetch 调用
Twitch OAuth2 token 端点，用 refresh_token 换 access_token，零新增依赖）+
`createOptionalTwitchAuthProvider`（三个环境变量任一缺失时退化为
`noopTwitchAuthPort`）+ `getTwitchAuthHealth`（CR-019 本包首次适用）。不实现
交互式授权首次获取、不实现 EventSub/Chat 客户端、不实现 token 缓存调度——
这些是 DEV-041/042/045/046 或未来消费方的职责。

## Allowed Scope / Read-only Scope / Forbidden Scope

（抄录 Task Package 第 3 节实际条目）

## Task Order

- [ ] T001 新建包骨架 + 节点文档
- [ ] T002 twitchAuth.ts + 测试
- [ ] T003 index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

T001

## Exit Criteria

六条命令全部退出码 0；测试全程零真实网络请求；`noopTwitchAuthPort` 身份等价
测试通过；`DECISIONS.md` 已入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；
已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
```

---

## 9. Constraints

1. **测试全程不得发出任何真实网络请求**——全部通过 `fetchImpl` 注入假实现。
2. **凭据不全时必须原样返回 `noopTwitchAuthPort` 本体**，不是另一份行为相同的实现。
3. **不实现交互式授权首次获取流程**（第 1 节已说明理由：一次性人工操作）。
4. **不实现 access token 缓存/过期调度/提前刷新**（留给未来消费方）。
5. **不实现 `/oauth2/validate`**（第 2.3 节已说明理由）。
6. **不新增任何 npm 依赖**。
7. **`Allowed Files` 逐一真实改动**（协议附录 A 强约束）。
8. 遇到必须修改 Writable Scope 之外文件才能推进：停止该 Task，发 `EXECUTOR_QUERY`，等 `SCOPE_RULING`。

---

## 10. Non-goals / Out-of-scope

- 不实现 `LivePlatformAdapter`（`connect/disconnect/onChat/sendChat`，DEV-041/042/046）。
- 不实现 EventSub WebSocket 客户端（DEV-041）。
- 不实现交互式授权码/device code 首次获取（一次性人工操作，不在任何节点的验收范围内）。
- 不实现 access token 缓存/过期调度（未来消费方职责）。
- 不实现 `ai-host`/DEV-038 Audio Ducking 相关任何内容（`DAG.md` 已裁定推迟至 M5）。
- 不做真实 Twitch 开发者账号下的端到端手工验证（USER 是否配置真实凭据，由 USER 自行决定，不在本节点验收范围内）。

---

## 11. Tests

### Unit tests

T002：请求构造正确性、成功换取 token、HTTP 错误、网络异常、字段映射正确性、
凭据可选退化、`getHealth` 主动探测的四种结果，全部通过注入假 `fetch` 验证，
零真实网络请求。

### Regression tests

`pnpm test` 覆盖全 workspace；既有全部包测试零回归。

---

## 12. Acceptance

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归；测试全程零真实网络请求 | 命令输出 + 代码检查 |
| A07 | 凭据不全时 `createOptionalTwitchAuthProvider` 返回值 `===` `noopTwitchAuthPort` | 测试检查（身份比较） |
| A08 | 凭据齐全 + 200 响应 → 字段正确映射，返回 `{ok:true,token}` | 测试检查 |
| A09 | 非 200 / 网络异常 → `{ok:false,reason}`，不抛异常 | 测试检查 |
| A10 | 请求 URL/method/header/body 构造正确 | 测试检查 |
| A11 | 凭据不全时 `getOptionalTwitchAuthHealth` 返回 `DOWN`，零网络请求 | 测试检查 |
| A12 | `getTwitchAuthHealth` 对 200/非200/异常分别返回 `OK`/`DOWN`/`DOWN` | 测试检查 |
| A13 | 未新增任何 npm 依赖 | 文件检查 |
| A14 | `packages/audio-engine/**`、`packages/runtime-kernel/**`、`apps/renderer/**` 未被修改 | git diff 比对 |
| A15 | 未创建 `packages/ai-host` 或任何 EventSub/Chat 相关代码 | 文件检查 |
| A16 | 根 `tsconfig.json` 恰新增 1 条 `platform-twitch` 的 `references` | git diff 比对 |
| A17 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A18 | `specs/dev/DEV-040/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T003 全部勾选，`Status:` 表头改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A19 | `git log` 新增恰 1 条提交，首行 `DEV-040: twitch oauth (token refresh provider)`；提交时 `git status --porcelain` 为空 | 命令 |
| A20 | LEDGER 含 `NODE_REPORT-DEV-040` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A21 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |

---

## 13. Exit Procedure

同既有节点惯例：更新 INDEX → 按序验证 → 确认零回归 → 填 REPORT（含确认
`DECISIONS.md` 已提交）→ commit → 发 NODE_REPORT → 自行核实完成三要素 → STOP。

---

## REPORT.md 模板

沿用既有八节模板，Acceptance Results 覆盖 A01–A21。
