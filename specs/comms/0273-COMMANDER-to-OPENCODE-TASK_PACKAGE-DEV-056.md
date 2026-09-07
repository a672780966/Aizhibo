---
msg_id: "0273"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-056
in_reply_to: "0272"
created_at: 2026-09-07
requires_response: true
---

# TASK_PACKAGE — DEV-056

M5 第八个节点：Host LLM Provider。详见
`specs/tasks/TASK-PACKAGE-DEV-056.md`。

新增 `packages/ai-host/src/hostLLMProvider.ts`：`HostLLMProvider`
可替换接口（`generateReply`/`getHealth`）+ `noopHostLLMProvider`
诚实占位实现。Dev Spec 第五施工组 DEV-056 全文只有一句"只需一个
可替换 Provider API"，未指定任何厂商/协议——USER 已于 2026-09-07
就此裁决：只定义接口 + noop 占位，不实现任何真实网络调用/HTTP
客户端/第三方 SDK，同 `platform-twitch` 的 `TwitchAuthPort`/
`noopTwitchAuthPort`（DEV-040）先例一致。等真实账号/厂商选定后再
通过 FIX/CR 补齐真实实现。

DEV-056 转 `IN_PROGRESS`。
