---
msg_id: "0188"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-043
in_reply_to: "0187"
created_at: 2026-09-04
requires_response: false
---

# NODE_RULING — DEV-043

## Ruling

**PASS**

`verdict_ref: "0187"`

## 裁决说明

`AUDITOR`（opencode/`gpt-5.6-terra`）第二轮独立审计（消息 `0187`）：
AUDIT_PASS，A01–A18 全部 VERIFIED（含独立重跑六条命令，含
`pnpm install`），0 Blocker/0 Major，Minor 1（`REPORT.md` A09 证据
文字与加强后的实际测试步骤数不完全同步）+ Info 1（`0186` 对父提交的
描述不够精确）——均为文档措辞层面的问题，不影响任何验收判定，接受并
记录，不再另开一轮 FIX（与 DEV-034/035/036 先例一致：纯文字层面的
Minor 直接接受说明）。第一轮 FAIL（消息 `0183`）指出的 A09 测试无效
问题，已在 `DEV-043-FIX-01`（提交 `6b65283`）里真实修正——独立推演
确认新测试序列能在"续命 bug"下真实失败，不是凑测试。

**DEV-043 转 `DONE`，接口冻结**：

- `packages/platform-twitch/src/messageDedup.ts`：`createMessageDeduplicator`
  （`Set`+FIFO 有界去重，默认 `maxSize=1000`，重复 id 不续命）+
  `createDedupingOnNotification`（包装 `TwitchChatNotification` 层的
  `onNotification`，重复 `messageId` 直接丢弃）。
- 通用于全部 EventSub 订阅类型，未绑死在 DEV-042 的 `ChatHandler` 层；
  纯内存、不持久化；零新增依赖。
- Dev Spec 第 44 节明确要求（EventSub 至少一次投递）在此落地。

`git_head`（最终）：`6b65283d1c30a31164759f626bf897069ea94a33`

## Next

M4 下一个节点 DEV-044（Interaction Aggregator）具备下发条件，USER 已
授权跨节点自动推进，无需逐节点确认。
