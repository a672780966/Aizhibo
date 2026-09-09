# DEV-081 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-081.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install --frozen-lockfile` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0，新增测试数量 > 0，既有测试零回归 | 命令 |
| A07 | `packages/platform-bilibili/package.json` 依赖恰为 `@interactive-story/platform-core`（workspace），无第三方 SDK | 读源码 |
| A08 | `bilibiliAuth.ts` 的 `startGame`/`heartbeat`/`endGame` 真实按 §1 第 4 点签名 POST 对应端点，凭据缺失/请求失败均返回 `{ok:false,reason}`，不抛异常 | 读源码 + 测试 |
| A09 | `createOptionalBilibiliAuthProvider(env)` 在 `BILIBILI_APP_ID`/`BILIBILI_ACCESS_KEY_ID`/`BILIBILI_ACCESS_KEY_SECRET`/`BILIBILI_ANCHOR_CODE` 任一缺失时返回 `noopBilibiliAuthPort`，三个方法恒 `{ok:false}` | 测试 |
| A10 | HMAC-SHA256 签名计算有独立单元测试，对已知输入产出确定性十六进制结果（不依赖真实网络） | 测试 |
| A11 | 包头编码/解码（16 字节 `packetLen/headerLen/protoVersion/op/seq`）有独立单元测试，覆盖 encode→decode 恒等与已知真实样例包解码 | 测试 |
| A12 | `liveConnectClient.ts` 的 `connect()` 在 `startGame()` 失败时直接转 `ERROR`，不打开 WebSocket | 测试 |
| A13 | 认证成功（收到 op=8 且 `code===0`）后转 `CONNECTED`；认证失败或提前 `onclose`/`onerror` 转 `ERROR` | 测试 |
| A14 | `CONNECTED` 后用注入 `clock` 断言两条独立心跳均被排定：20 秒 HTTP `heartbeat`、30 秒 WS op=2 包 | 测试 |
| A15 | 只对 `cmd === 'LIVE_OPEN_PLATFORM_DM'` 的 op=5 包调用 `onMessage`，其余 `cmd` 静默跳过 | 测试 |
| A16 | `disconnect()` 取消两条心跳定时器、关闭 WebSocket，转 `STOPPED` | 测试 |
| A17 | `normalizeBilibiliChatMessage` 的 `receivedAt` 等于 `message.timestamp * 1000`，`platform:'bilibili'`，其余字段逐一对应 `openId`/`msgId`/`text`；字段缺失/类型不对返回 `undefined` | 测试 |
| A18 | `sendChat.ts` 只导出 `unsupportedBilibiliSendChat` 常量，`sendChat()` 恒返回 `{ok:false,reason}`，不存在任何 config 化工厂函数 | 读源码 |
| A19 | 全部测试注入假 `fetchImpl`/`webSocketImpl`/`clock`，零真实网络/WebSocket 调用 | 读测试代码 |
| A20 | 不存在任何 `messageDedup.ts`、Brotli 解压、多主机 failover/自动重试或等价模块 | 读文件列表 + 读源码 |
| A21 | 不存在任何组装 `LivePlatformAdapter` 的顶层类型/对象/函数；不存在任何 import `@interactive-story/host-memory` 的代码 | 读源码 |
| A22 | Forbidden Scope 全部条目零违反（`git diff --stat` 核对改动文件范围） | 命令 + 读 diff |
