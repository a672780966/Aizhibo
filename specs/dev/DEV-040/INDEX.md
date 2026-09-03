# DEV-040 INDEX

Status: READY_FOR_REVIEW

## Current Node

DEV-040 — Twitch OAuth

## Objective

全项目第一个 Twitch/平台相关节点：新建 `packages/platform-twitch` 包，实现
`TwitchAuthPort` 契约的真实版本——`createTwitchAuthProvider`（原生 fetch 调用
Twitch OAuth2 token 端点，用 refresh_token 换 access_token，零新增依赖）+
`createOptionalTwitchAuthProvider`（三个环境变量任一缺失时退化为
`noopTwitchAuthPort`）+ `getTwitchAuthHealth`（CR-019 本包首次适用）。不实现
交互式授权首次获取、不实现 EventSub/Chat 客户端、不实现 token 缓存调度——
这些是 DEV-041/042/045/046 或未来消费方的职责。USER 已裁决不绑定真实账号/
密钥，占位实现即可。

## Allowed Scope

```
packages/platform-twitch/                                  （新增包）
packages/platform-twitch/package.json
packages/platform-twitch/tsconfig.json
packages/platform-twitch/src/twitchAuth.ts
packages/platform-twitch/src/twitchAuth.test.ts
packages/platform-twitch/src/index.ts
tsconfig.json                                               （追加 references 一条）
specs/dev/DEV-040/INDEX.md、REQUIREMENTS.md、ACCEPTANCE.md、REPORT.md、DECISIONS.md
specs/comms/LEDGER.md（仅追加）
specs/comms/NNNN-OPENCODE-to-*.md（仅自己发出的消息）
```

## Read-only Scope

```
packages/shared/src/health.ts（DEV-010 冻结，Health 类型契约参照）
packages/persistence/src/health.ts、packages/audio-engine/src/elevenLabsTtsProvider.ts（DEV-035 冻结，getHealth/noop-optional 实现风格参照）
packages/audio-engine/package.json、tsconfig.json（新建包结构参照）
其余同既有节点惯例
```

## Forbidden Scope

```
创建 packages/ai-host（M5 的职责）
实现 LivePlatformAdapter 的 connect/disconnect/onChat/sendChat（DEV-041/042/046 职责）
实现 EventSub WebSocket 客户端（DEV-041 职责）
实现交互式授权码/device code 首次获取流程（一次性人工操作）
实现 access token 缓存/过期调度/提前刷新逻辑
实现 /oauth2/validate 校验端点调用
新增任何 npm 依赖
修改 packages/audio-engine/**、packages/runtime-kernel/**、apps/renderer/**
```

## Task Order

- [x] T001 新建包骨架 + 节点文档
- [x] T002 twitchAuth.ts + 测试
- [x] T003 index.ts 导出 + 全量验证 + REPORT + commit + NODE_REPORT

## Current Task

（全部完成，等待 AUDITOR 审计）

## Exit Criteria

六条命令全部退出码 0；测试全程零真实网络请求；`noopTwitchAuthPort` 身份等价
测试通过；`DECISIONS.md` 已入库；REPORT.md 完成且 Status = READY_FOR_REVIEW；
已向 AUDITOR 发出 NODE_REPORT。

## Next Node

由 Claude Commander 在当前节点验收 PASS 后决定。

OpenCode 禁止自行推进下一 DEV Node。
