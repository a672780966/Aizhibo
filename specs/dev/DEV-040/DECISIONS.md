# DEV-040 DECISIONS

## D1 — 零新增 npm 依赖（原生 `fetch` + `URLSearchParams`）

Twitch OAuth2 token 端点（`https://id.twitch.tv/oauth2/token`，
`grant_type=refresh_token`）是标准机器对机器接口，Node ≥22 原生
`fetch`/`URLSearchParams`/`Response` 已足够构造
`application/x-www-form-urlencoded` 请求体与解析 JSON 响应，不需要任何
OAuth 客户端库或 Twitch 官方 SDK。新增依赖只会扩大攻击面与维护面，与
`audio-engine`（DEV-034/035）先例一致，本包同样保持零依赖。

## D2 — 不实现交互式授权首次获取

Twitch OAuth 的"用户登录同意"是一次性人工操作（访问授权页、登录、点击
同意），不是代码职责。本节点只负责"给定已经拿到的凭据（refresh_token），
如何换取可用的 access_token"。授权码/device code 首次获取流程即使实现，
在 USER 明确裁决不绑定真实账号/密钥（占位即可）的前提下也无消费方与
验收路径，属于投机性代码。

## D3 — 不实现 access token 缓存/过期调度/提前刷新

每次 `getAccessToken()` 都是一次独立、无状态的换取请求，不持久化/不缓存
任何凭据与结果。是否缓存、何时提前刷新是未来消费方（EventSub Client
建立连接前，如 DEV-041/045）的职责——本节点若预设过期调度策略，等于为
不存在的消费方编造策略。

## D4 — 不额外引入 `/oauth2/validate`

健康探测复用本节点唯一实现的能力：直接调用一次 `getAccessToken()`，
`ok:true` → `OK`，`ok:false` → `DOWN`。`/oauth2/validate` 校验端点是
另一条真实网络路径，本节点引入它会同时扩大实现面与测试面而换不来任何
新信息，违背"按需主动探测、不引入模块级可变状态"的先例（DEV-035 D5）。

## D5 — `Health` 类型落地：本地类型镜像，不引入 workspace 依赖

`shared` 的 `Health`（`{status, lastSuccessAt?, latencyMs?, error?}`，
DEV-010 冻结）经 `packages/persistence/src/health.ts` 与
`packages/audio-engine/src/elevenLabsTtsProvider.ts` 两处复用/镜像验证为
稳定形状。本包采用与 DEV-035 完全相同的模式：在 `twitchAuth.ts` 内声明
逐字段一致的本地 `Health` 类型。选择此而非依赖
`@interactive-story/shared` 的理由与 DEV-035 一致：保持
`platform-twitch` 零依赖（与 `audio-engine` 相同），避免引入跨包构建
顺序与 workspace 依赖面。`shared` 是 `d.ts` 形状不变的冻结契约
（`export type { Health }`），本地镜像与该契约结构等价，风险为零；审计
可见两个文件直接可比。

## D6 — 凭据可选退化为 `noopTwitchAuthPort` 本体

`TWITCH_CLIENT_ID`/`TWITCH_CLIENT_SECRET`/`TWITCH_REFRESH_TOKEN` 任一
缺失（含空串）时，`createOptionalTwitchAuthProvider` 与
`getOptionalTwitchAuthHealth` 都直接返回/报告"no Twitch OAuth
credentials configured"，零副作用、零网络请求。前者返回 `noopTwitchAuthPort`
**本体**（`===` 身份比较，不是行为相同的另一份实现），诚实反映"现在没有
可用的真实凭据"——这是 USER"占位就行"裁决的具体落地，与 DEV-035
`createOptionalElevenLabsTtsProvider` 同构。缺失时健康检查用
`vi.spyOn(globalThis,'fetch')` 断言未发起任何请求。

## D7 — 错误处理统一转可辨识联合，不抛异常

HTTP 非 2xx、响应体非预期 JSON 形状、`fetch` 抛出的网络异常，一律捕获并
转为 `{ok:false, reason}`（`reason` 取自 `Error.message`），不让异常冒出
`TwitchAuthPort` 接口之外——与 `TtsSynthesisResult` 的可辨识联合风格一致
（DEV-034/035）。

## D8 — 健康探测不带凭据注入通道

`getOptionalTwitchAuthHealth(env)` 签名仅收 `env`（Task Package 2.3 节
原文），因此不提供 `fetchImpl`/`baseUrl` 透传参数；凭据缺失的零网络断言
通过 spy 全局 `fetch` 完成。注入 `fetchImpl` 的完整健康路径（200/非 200/
异常 → `OK`/`DOWN`/`DOWN`）由 `getTwitchAuthHealth(config)` 直接覆盖。
