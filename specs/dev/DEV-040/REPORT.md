# DEV-040 REPORT

## 1. Status

READY_FOR_REVIEW

## 2. Implemented

- 新建 `packages/platform-twitch` workspace 包（首个 Twitch/平台相关包，M4 第一个
  节点），结构与 `audio-engine` 一致（`package.json`/`tsconfig.json`/`src/index.ts`），
  零 npm 依赖。
- 新增 `twitchAuth.ts`：`TwitchAuthPort`/`TwitchAuthResult`/`TwitchTokenResult`/
  `noopTwitchAuthPort`（凭据缺失时的诚实失败实现）契约；`createTwitchAuthProvider`
  （原生 `fetch` POST `${baseUrl}/oauth2/token`，
  `application/x-www-form-urlencoded`，`grant_type=refresh_token` 换
  access_token，HTTP 错误/网络异常/非预期响应体统一转 `{ok:false,reason}` 不抛
  异常）；`createOptionalTwitchAuthProvider`（三环境变量任一缺失时严格返回
  `noopTwitchAuthPort` 本体）；`getTwitchAuthHealth`/`getOptionalTwitchAuthHealth`
  （复用 `getAccessToken()` 做主动探测，不引入 `/oauth2/validate`）。
- `index.ts` 导出全部公开符号。
- 未实现交互式授权首次获取、未实现 EventSub/Chat 客户端、未实现 access token
  缓存/过期调度、未接入任何消费方（DEV-041/042/046 职责）。

## 3. Changed Files

Writable Scope 内共 9 个文件：

```text
packages/platform-twitch/package.json                  （新增）
packages/platform-twitch/tsconfig.json                 （新增）
packages/platform-twitch/src/twitchAuth.ts             （新增）
packages/platform-twitch/src/twitchAuth.test.ts        （新增）
packages/platform-twitch/src/index.ts                  （新增）
tsconfig.json                                          （追加 1 条 references）
specs/dev/DEV-040/INDEX.md                             （Task 勾选 + Status 更新）
specs/dev/DEV-040/DECISIONS.md                         （新增，D1–D8）
specs/dev/DEV-040/REPORT.md                            （本文件）
```

节点文档 `INDEX.md`/`REQUIREMENTS.md`/`ACCEPTANCE.md` 由 Commander 在
`9080614` 预填；`REQUIREMENTS.md`/`ACCEPTANCE.md` 已是 Task Package 相应章节的
逐字/整理抄录（ACCEPTANCE 21 行与权威副本逐行一致，已脚本比对），本节点对其
零改动并在 Scope Deviations 说明。`packages/audio-engine/**`、
`packages/runtime-kernel/**`、`apps/renderer/**` 以及
`PROJECT_INDEX.md`/`DAG.md`/`tasks/**`/`audit/**`/`protocol/**` 均未修改。

## 4. Tests Executed

六条命令严格按要求顺序执行，全部退出码 0：

| # | 命令 | 结果 |
|---|---|---|
| 1 | `pnpm install` | 0；Scope: all 12 workspace projects，Already up to date |
| 2 | `pnpm typecheck` | 0 |
| 3 | `pnpm lint` | 0 |
| 4 | `pnpm format:check` | 0；All matched files use Prettier code style |
| 5 | `pnpm build` | 0 |
| 6 | `pnpm test` | 0；106 test files passed，574 tests passed（DEV-037 基线 562，新增 12） |

新增 12 个测试（`twitchAuth.test.ts`）：身份等价（5 例）、请求构造 + 成功映射、
HTTP 错误、网络异常、非预期响应体、字段缺失、无状态两次换取、`getOptional`
凭据缺失零网络（spy）、`getTwitchAuthHealth` 200/非 200/异常。全部网络调用
通过注入的 `fetchImpl` 假实现；凭据缺失的零网络断言通过
`vi.spyOn(globalThis,'fetch')` 验证——测试全程零真实网络请求。`DECISIONS.md`
（D1–D8）已包含零依赖、交互式授权、缓存调度、`/oauth2/validate`、Health
落地方式等全部决策记录。

## 5. Acceptance Results

| # | 判定 | 结果 | 依据 |
|---|---|---|---|
| A01 | `pnpm install` 退出码 0 | PASS | Tests Executed #1 |
| A02 | `pnpm typecheck` 退出码 0 | PASS | Tests Executed #2 |
| A03 | `pnpm lint` 退出码 0 | PASS | Tests Executed #3 |
| A04 | `pnpm format:check` 退出码 0 | PASS | Tests Executed #4 |
| A05 | `pnpm build` 退出码 0 | PASS | Tests Executed #5 |
| A06 | `pnpm test` 退出码 0、零回归、零真实网络请求 | PASS | 106 files / 574 tests；fetch 全部注入 + spy 断言 |
| A07 | 凭据不全时返回 `noopTwitchAuthPort` 本体 | PASS | 测试用 `toBe` 身份比较（5 例） |
| A08 | 200 响应字段正确映射返回 `{ok:true,token}` | PASS | `access_token→accessToken`、`expires_in→expiresInSeconds`、`scope→scopes` 断言 |
| A09 | 非 200 / 网络异常 → `{ok:false,reason}` 不抛异常 | PASS | 400、抛异常、非 JSON、缺字段测试 |
| A10 | 请求 URL/method/header/body 构造正确 | PASS | URL/`POST`/`content-type`/`URLSearchParams` 四字段断言 |
| A11 | 凭据不全时健康检查 `DOWN` 且零网络请求 | PASS | spy `globalThis.fetch` 未被调用 |
| A12 | 健康检查 200/非 200/异常分别 `OK`/`DOWN`/`DOWN` | PASS | 三种注入 fetch 测试 |
| A13 | 未新增 npm 依赖 | PASS | 本包无 `dependencies`；`pnpm-lock` 仅因 workspace 索引变化 |
| A14 | audio-engine/runtime-kernel/renderer 未修改 | PASS | 交付 diff 为空 |
| A15 | 未创建 `ai-host` 或 EventSub/Chat 代码 | PASS | 仅新建 `platform-twitch` 5 文件 |
| A16 | 根 tsconfig 恰新增 1 条 `platform-twitch` references | PASS | 交付 diff 为 1 行 |
| A17 | `DECISIONS.md` 覆盖第 6 节全部要点 | PASS | D1–D8 |
| A18 | 节点文档齐全、T001–T003 勾选、Status=READY_FOR_REVIEW | PASS | `specs/dev/DEV-040/` |
| A19 | 恰 1 条新提交、首行符合要求、提交时 porcelain 为空 | PASS | 本次交付 commit 核验 |
| A20 | LEDGER 含 NODE_REPORT 且 git_head 一致 | PASS | commit 后追加消息与 LEDGER 行 |
| A21 | PROJECT_INDEX/DAG/tasks/audit/protocol 未修改 | PASS | 交付 diff 为空 |

## 6. Scope Check

只施工 DEV-040。没有推进任何其他 DEV 节点；没有新增外部依赖、真实账号/密钥
验证、交互式授权、EventSub/Chat 代码、token 缓存调度、`/oauth2/validate`
或其他禁止范围内容。

**Scope Deviations（申报，非越界）**：Writable Scope 列出的节点文档
`REQUIREMENTS.md` 与 `ACCEPTANCE.md` 由 Commander 预填于 `9080614`（T001
Allowed Files），内容已分别是 Task Package 的整理抄录与逐字抄录（21 行脚本
比对一致），本节点未再改动；INDEX.md 已真实勾选 T001–T003 并更新
Status。此申报与 DEV-035/036 对 Commander 预填文件的处理先例一致。

## 7. Commit

提交信息首行：`DEV-040: twitch oauth (token refresh provider)`。

`DECISIONS.md` 已包含在该提交中。

## 8. Handoff

NODE_REPORT 发往 `AUDITOR`，抄送 `COMMANDER`；审核锚点与交付快照见
`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-040.md`。
