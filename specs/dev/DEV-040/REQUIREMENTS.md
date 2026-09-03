# DEV-040 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-040.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- `createTwitchAuthProvider`：真实 Twitch OAuth2 token 端点客户端，原生
  `fetch`/`URLSearchParams`，零新增依赖；用 `refresh_token` 换
  `access_token`；HTTP 错误/网络异常均转为 `{ok:false,reason}`，不抛异常；
  不缓存/不持久化任何凭据。
- `createOptionalTwitchAuthProvider`：`TWITCH_CLIENT_ID`/`TWITCH_CLIENT_SECRET`/
  `TWITCH_REFRESH_TOKEN` 任一缺失时**原样返回** `noopTwitchAuthPort`（身份
  相等，不是另一份实现）。
- `getTwitchAuthHealth`/`getOptionalTwitchAuthHealth`：CR-019 `platform-twitch`
  包首次适用——直接调用 `getAccessToken()` 本身做探测，不额外引入
  `/oauth2/validate`；凭据不全时不发请求直接 `DOWN`。
- 不实现交互式授权码/device code 首次获取（一次性人工操作，不是代码职责）。
- 不实现 access token 缓存/过期调度（未来消费方职责）。
- 不实现 `LivePlatformAdapter`/EventSub/Chat（DEV-041/042/046 职责）。

## Scope（Task Package 第 3 节）

Writable：新包 `packages/platform-twitch/*`、根 `tsconfig.json`（追加 1 条
references）、`specs/dev/DEV-040/*.md`、`specs/comms/LEDGER.md`（仅追加）、
`specs/comms/NNNN-OPENCODE-to-*.md`。

Forbidden（摘录）：不创建 `ai-host`；不实现 `LivePlatformAdapter`/EventSub；
不实现交互式授权首次获取；不实现缓存/过期调度；不实现
`/oauth2/validate`；不新增依赖；不改 `audio-engine`/`runtime-kernel`/
`apps/renderer`。

## Task Order

T001 新建包骨架 + 节点文档 → T002 `twitchAuth.ts` + 测试（**测试全程零真实
网络请求，全部通过注入 `fetchImpl`**）→ T003 `index.ts` 导出 + 全量验证 +
REPORT + commit + NODE_REPORT。
