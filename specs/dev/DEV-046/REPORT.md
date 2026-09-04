# DEV-046 REPORT

## 1. Status

READY_FOR_REVIEW

## 2. Implemented

- 新建 `packages/platform-twitch/src/sendChat.ts`：
  - `TwitchSendChatResult`（`{ok:true,messageId}|{ok:false,reason}`
    诚实结果类型，复用 DEV-040 `TwitchAuthPort` 模式）、
    `TwitchSendChatConfig`、`TwitchSendChat`、`noopTwitchSendChat`、
    `createTwitchSendChat`。
  - `createTwitchSendChat`：`sendChat(message)` 先
    `authPort.getAccessToken()`；`ok:false` → 直接返回
    `{ok:false, reason: result.reason}`，**不发起任何 HTTP 请求**
    （A07）；凭据可用则 `POST ${helixBaseUrl}/helix/chat/messages`
    （默认 `https://api.twitch.tv`，`endpoint()` 风格去尾部斜杠），
    header `Authorization: Bearer <token>` / `Client-Id: config.clientId`
    / `Content-Type: application/json`，body
    `{broadcaster_id, sender_id, message}`。
  - 响应处理与 `twitchAuth.ts` 同款风格：`!response.ok` →
    `{ok:false, reason: 'Twitch send chat request failed: <status>
    <statusText>'}`；`response.json().catch(() => undefined)` 防解析
    失败；类型守卫 `isSendChatResponseBody`（`data` 为非空数组、
    `data[0].message_id` 为 string、`data[0].is_sent` 为 boolean）不
    符 → `{ok:false, reason:'Twitch send chat response has an
    unexpected shape'}`；`is_sent:false` → `drop_reason?.message`
    （非 string 时回退 `'message was dropped by Twitch'`）；否则
    `{ok:true, messageId: data[0].message_id}`。`noUncheckedIndexedAccess`
    下守卫通过后以 `const first = body.data[0]!;` 一次断言取值。
  - 整体 `try/catch` + 本地 `errorMessage(error)` 辅助（与
    `twitchAuth.ts` 同款），`fetch`/处理抛异常一律落为
    `{ok:false, reason}`，自身永不抛出（A12）。
  - 局部 `errorMessage`/`isSendChatResponseBody`/`DEFAULT_HELIX_BASE_URL`
    均非导出（与 `twitchAuth.ts` 的私有辅助一致）。
  - `noopTwitchSendChat`：`sendChat` 恒定
    `{ok:false, reason:'no Twitch send-chat configured'}`，不发起
    `fetch`（A13）。
  - **不提供健康探测函数**（D1：发消息有真实、公开可见的副作用，
    探测即刷屏，不同于 twitchAuth 的无副作用 token 刷新）；不做本地
    消息校验/截断/重试（D2：Twitch API 自身经 `is_sent`/
    `drop_reason`/状态码裁决，本地复制是凭空发明未核实业务规则）；
    零新增 npm 依赖（A15）。
- 新建 `packages/platform-twitch/src/sendChat.test.ts`（8 条测试，覆盖
  A07–A14，见 §4）：局部 `fakeAuthPort`（不 import 自
  `twitchAuth.test.ts`）+ `defaultConfig`；全部 HTTP 行为经
  `fetchImpl` 注入，零真实网络连接（A07 断言 `fetchImpl` 从未被调用）。
- `packages/platform-twitch/src/index.ts` 追加 1 行导出
  `./sendChat.js`（与既有模块 re-export 风格一致，T002 全部公开符号）。
- 新建 `specs/dev/DEV-046/DECISIONS.md`（D1–D3，见 §3/§5 A18）。
- 未实现：健康探测函数（D1）、本地校验/截断/重试（D2）、
  `runtime-kernel`/`PlatformPort` 接线（D3，CR-010，留给未来 DEV-050A
  Egress Gate）；未碰 `packages/runtime-kernel/**`。

## 3. Changed Files

Writable Scope 内共 6 个文件（实现提交 6，含 INDEX.md 状态更新）：

```text
packages/platform-twitch/src/sendChat.ts       （新增，发送原语）
packages/platform-twitch/src/sendChat.test.ts  （新增，8 条测试）
packages/platform-twitch/src/index.ts          （追加 1 行导出）
specs/dev/DEV-046/DECISIONS.md                 （新增，D1–D3）
specs/dev/DEV-046/REPORT.md                    （本文件，T001 模板 → T002 回填）
specs/dev/DEV-046/INDEX.md                     （T001–T002 勾选 + Status=READY_FOR_REVIEW）
```

节点文档 `REQUIREMENTS.md`/`ACCEPTANCE.md` 由 Commander 在 `fabcd58`
dispatch 时预填，本节点零改动；`packages/platform-twitch/src/twitchAuth.ts`
（DEV-040 冻结）、`packages/runtime-kernel/**`、`packages/audio-engine/**`、
`apps/renderer/**` 及 `PROJECT_INDEX.md`/`DAG.md`/`tasks/**`/`audit/**`/
`protocol/**` 均未修改（见 §6 Scope Check 的空 diff 佐证）。

## 4. Tests Executed

六条命令严格按要求顺序执行，全部退出码 0：

| # | 命令 | 结果 |
|---|---|---|
| 1 | `pnpm install` | 0；13 workspace projects，Already up to date |
| 2 | `pnpm typecheck` | 0；`tsc -b` + `tsc -b --noEmit` + renderer typecheck |
| 3 | `pnpm lint` | 0；`eslint .` |
| 4 | `pnpm format:check` | 0；Prettier 全绿 |
| 5 | `pnpm build` | 0；`tsc -b` |
| 6 | `pnpm test` | 0；112 test files passed，630 tests passed（DEV-045 基线 622，新增 8） |

新增 8 条测试（`sendChat.test.ts`）：A07 凭据不可用不发请求、A08 成功
路径请求构造与返回、A09 `is_sent:false` 取 `drop_reason.message`、
A10 非 200 带状态码、A11 响应体形状异常、A12 `fetch` 抛异常被捕获、
A13 `noopTwitchSendChat` 恒定失败、A14 失败路径 `fetchImpl` 恰一次
不重试。既有全部包测试零回归。

## 5. Acceptance Results

| # | 判定 | 结果 | 依据 |
|---|---|---|---|
| A01 | `pnpm install` 退出码 0 | PASS | Tests Executed #1 |
| A02 | `pnpm typecheck` 退出码 0 | PASS | Tests Executed #2 |
| A03 | `pnpm lint` 退出码 0 | PASS | Tests Executed #3 |
| A04 | `pnpm format:check` 退出码 0 | PASS | Tests Executed #4 |
| A05 | `pnpm build` 退出码 0 | PASS | Tests Executed #5 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | PASS | 112 files / 630 tests；DEV-045 基线 622 全绿 + 新增 8 |
| A07 | 凭据不可用 → 直接失败，`fetchImpl` 从未被调用 | PASS | 测试：`fakeAuthPort(false)` → `{ok:false,reason:'no credentials'}` 且 `expect(fetchImpl).not.toHaveBeenCalled()` |
| A08 | 成功路径：请求 URL/method/header/body 字段正确，返回 `{ok:true,messageId}` | PASS | 测试：`lastUrl === 'https://helix.example/helix/chat/messages'`、method POST、`Authorization:'Bearer tok'`/`Client-Id:'client-1'`、body 三字段逐项相等、结果 `{ok:true,messageId:'msg-1'}` |
| A09 | `is_sent:false` → `{ok:false,reason}`（取自 `drop_reason.message`） | PASS | 测试：`drop_reason:{code:'automod_denied',message:'blocked by AutoMod'}` → reason 恰为 `'blocked by AutoMod'` |
| A10 | 非 200 → `{ok:false,reason}` | PASS | 测试：400 'Bad Request' → `result.ok===false` 且 reason 含 `'400'` |
| A11 | 响应体形状异常 → `{ok:false,reason}` | PASS | 测试：`{unexpected:true}` → reason 恰为 `'Twitch send chat response has an unexpected shape'` |
| A12 | `fetch` 抛异常 → `{ok:false,reason}`，不抛出未捕获异常 | PASS | 测试：`fetchImpl` throw `Error('network down')` → `resolves.toEqual({ok:false,reason:'network down'})` |
| A13 | `noopTwitchSendChat` 恒定 `{ok:false,reason}`，不发起 `fetch` | PASS | 测试：`noopTwitchSendChat.sendChat('hi')` → `{ok:false,reason:'no Twitch send-chat configured'}`（无 fetchImpl 配置可言） |
| A14 | 失败场景下 `fetchImpl` 只被调用一次（不重试） | PASS | 测试：500 响应后 `expect(fetchImpl).toHaveBeenCalledTimes(1)` |
| A15 | 未新增第三方 npm 依赖 | PASS | 零新增；纯注入模式，`package.json`/`pnpm-lock.yaml` 无 diff |
| A16 | `runtime-kernel/**` 未被修改，且未被 import/依赖 | PASS | `git status --short packages/runtime-kernel/` 为空；源码无 `runtime-kernel` import（D3，§6） |
| A17 | 未创建 `packages/ai-host` 或额外新包 | PASS | 目录不存在；未新建任何包 |
| A18 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | PASS | D1（不提供健康探测）/D2（不做本地校验/截断/重试）/D3（CR-010 不接线，留给 DEV-050A） |
| A19 | `specs/dev/DEV-046/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | PASS | INDEX/REQUIREMENTS/ACCEPTANCE/DECISIONS/REPORT 五份齐全；INDEX Task 全勾 + Status 已更新（§7） |
| A20 | `git log` 新增恰 1 条提交，首行 `DEV-046: twitch send chat` | PASS | 本次交付 commit 核验（§7） |
| A21 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | PASS | commit 后 `git status --porcelain`（见 §8） |
| A22 | `PROJECT_INDEX.md`/`DAG.md`/`tasks/**`/`audit/**`/`protocol/**` 均未被修改 | PASS | 交付 diff 为空（见 §6 Scope Check） |

## 6. Scope Check

只施工 DEV-046。没有推进任何其他 DEV 节点；没有提供健康探测函数
（D1）；没有实现本地消息校验/截断/重试（D2）；没有把
`createTwitchSendChat` 接入 `PlatformPort`/`runtime-kernel` 任何调用点
（D3，CR-010）；没有 import/依赖 `runtime-kernel`（A16）；没有新增
任何第三方 npm 依赖（A15）；没有创建 `packages/ai-host` 或额外新包
（A17）。`packages/platform-twitch/src/twitchAuth.ts`（DEV-040 冻结）、
`packages/runtime-kernel/**`、`packages/audio-engine/**`、`apps/renderer/**`
以及 `PROJECT_INDEX.md`/`DAG.md`/`tasks/**`/`audit/**`/`protocol/**`
均未修改。Constraints 1–7 全部遵守。

**Scope Deviations（申报，非越界）**：Writable Scope 列出的节点文档
`REQUIREMENTS.md` 与 `ACCEPTANCE.md` 由 Commander 预填于 `fabcd58`，本
节点未再改动（同 DEV-041/042/043/044/045 先例）；REPORT.md 为 T001
新建模板 → T002 回填。无其他申报。

## 7. Commit

提交信息首行：`DEV-046: twitch send chat`。

提交内容仅限 Writable Scope 内 6 个文件（§3），恰 1 条新提交；
`git add` 逐一列名，未使用 `git add -A`。`DECISIONS.md` 已包含在该
提交中。LEDGER 追加行与 NODE_REPORT 消息文件（`specs/comms/`）已写入
工作区但**未提交**，留给 Commander 收尾统一提交（Constraint 7 / A21）。

## 8. Handoff

NODE_REPORT 发往 `AUDITOR`，抄送 `COMMANDER`；审核锚点与交付快照见
`specs/comms/0202-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-046.md`。
