# DEV-046 REQUIREMENTS

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-046.md` 抄录并整理，权威版本为
Task Package 原文（协议 §1.4）。

## 架构（Task Package 第 2 节要点）

- `createTwitchSendChat`：`sendChat(message)` 先取 token（`ok:false`
  直接失败不发请求），成功后 `POST /helix/chat/messages`
  （`broadcaster_id`/`sender_id`/`message`），200 + `is_sent:true` →
  `{ok:true,messageId}`；非 200/`is_sent:false`/响应体形状异常/`fetch`
  异常 → `{ok:false,reason}`。
- `noopTwitchSendChat` 恒定失败不发请求。
- 不提供健康探测函数（副作用不可接受）、不做本地校验/截断/重试。

## Scope（Task Package 第 3 节）

Writable：`sendChat.ts(.test.ts)`、`index.ts`（追加）、
`specs/dev/DEV-046/*.md`、`specs/comms/LEDGER.md`（仅追加，写入不
提交）、`specs/comms/NNNN-OPENCODE-to-*.md`（写入不提交）。

Forbidden（摘录）：不改/不依赖 `runtime-kernel`；不接入
`PlatformPort`（CR-010）；不提供健康探测函数；不做本地校验/截断/
重试；不新增第三方依赖。

## Task Order

T001 节点文档 → T002 `sendChat.ts` + 测试 + `index.ts` 导出 + 全量
验证 + REPORT + commit（**恰一条提交，LEDGER/NODE_REPORT 写入工作区
但不提交**）。
