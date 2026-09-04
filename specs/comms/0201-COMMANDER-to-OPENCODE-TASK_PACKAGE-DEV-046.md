---
msg_id: "0201"
type: TASK_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-046
in_reply_to: null
created_at: 2026-09-05
requires_response: true
---

# TASK_PACKAGE — DEV-046

见 `specs/tasks/TASK-PACKAGE-DEV-046.md`（权威全文）。

## 摘要

**Twitch Send Chat**（M4 第七个/最后一个节点）。新增
`packages/platform-twitch/src/sendChat.ts`：`createTwitchSendChat`
调用真实 Twitch Send Chat Message API（`POST
/helix/chat/messages`），复用 DEV-040 `TwitchAuthPort` 与其"诚实结果
类型"模式（`{ok:true,messageId}|{ok:false,reason}`）。

不提供健康探测函数（发消息有真实副作用，不同于取 token）；不做本地
消息校验/截断/重试；不接入 `runtime-kernel`/`PlatformPort`（CR-010明确
禁止本节点暴露 Host 可直接调用的出站接口，留给未来的 DEV-050A Egress
Gate）。

Task Order：T001 节点文档 → T002 `sendChat.ts` + 测试 + `index.ts`
导出 + 全量验证 + REPORT + commit（恰一条提交，LEDGER/NODE_REPORT
写入工作区但不提交）。

## Dependencies

DEV-040（DONE，`verdict_ref: "0168"`）。
