---
msg_id: "0178"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-042
in_reply_to: "0177"
created_at: 2026-09-05
requires_response: true
git_head: 204634c909ffcaf048f9a1c7eae4134af17f5b1a
changed_files_count: 13
commands_run: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-042

DEV-042（Chat Message Adapter）施工完成，`READY_FOR_REVIEW`。

交付全文见 `specs/dev/DEV-042/REPORT.md`；决策记录见
`specs/dev/DEV-042/DECISIONS.md`（D1–D7）；验收权威副本为
`specs/tasks/TASK-PACKAGE-DEV-042.md` 第 12 节（A01–A20，节点
`ACCEPTANCE.md` 逐行一致）。

## 交付快照

- `git_head`: `204634c909ffcaf048f9a1c7eae4134af17f5b1a`
- Changed Files（13，与实现提交一致）：
  - `packages/platform-core/package.json`、`tsconfig.json`（新增包骨架，零依赖）
  - `packages/platform-core/src/index.ts`（`NormalizedChatMessage` 五字段 +
    `ChatHandler`，纯类型零运行时）
  - `packages/platform-core/src/index.test.ts`（新增，2 条烟雾测试）
  - `packages/platform-twitch/src/chatMessageAdapter.ts`（新增，转换 + 包装）
  - `packages/platform-twitch/src/chatMessageAdapter.test.ts`（新增，9 条测试）
  - `packages/platform-twitch/src/index.ts`（追加 1 行导出）
  - `packages/platform-twitch/package.json`（追加 `@interactive-story/platform-core: workspace:*`）
  - `pnpm-lock.yaml`（platform-core 空 importer + platform-twitch 追加 link:../platform-core）
  - `tsconfig.json`（追加 1 条 references `./packages/platform-core`）
  - `specs/dev/DEV-042/DECISIONS.md`（新增，D1–D7）、`REPORT.md`（新增）、
    `INDEX.md`（T001–T003 勾选 + Status=READY_FOR_REVIEW）
- 六条命令严格按序全部退出码 0；109 个测试文件、601 个测试全部通过
  （DEV-041 基线 590：platform-core 2 + chatMessageAdapter 9，零回归）。
- `normalizeTwitchChatMessage`：subscriptionType ≠ `channel.chat.message` /
  `event` 非对象 / `chatter_user_id` 缺失或非 string / `message.text` 缺失
  或非 string → `undefined`（诚实失败，不抛异常）；成功 →
  `{platform:'twitch', viewerId, messageId: notification.messageId, text,
  receivedAt}`——`messageId` 透传 DEV-041 保留的 EventSub envelope
  message_id（D4，供 DEV-043 去重同一 key）。
- `createTwitchChatOnNotification(handler)`：与
  `EventSubClientConfig.onNotification` 形状兼容的外部包装，转换成功才调
  handler；不改冻结的 `eventSubClient.ts`（Constraint 2）。
- 未修改 audio-engine/runtime-kernel/renderer/eventSubClient.ts/twitchAuth.ts
  及 PROJECT_INDEX/DAG/tasks/audit/protocol；未定义 LivePlatformAdapter（A14）；
  未创建 packages/ai-host；未实现去重/投票解析/发送消息（DEV-043/044/046）；
  未推进其他 DEV 节点。
- **Scope Deviation（申报，非越界）**：T001 曾把 platform-core references
  追加在 platform-twitch 之后，clean build 暴露 TS2307（根 tsconfig
  references 顺序即 `tsc -b` 构建顺序，chapter-compiler 零 refs 却 import
  chapter-schema 的既有惯例）；已调整位置到 platform-twitch 之前，diff 净
  +1 行，A15 不受影响，`rm dist + tsc -b` clean 构建验证退出码 0。
- 本文件（NODE_REPORT 消息）与 LEDGER.md 追加行按 Constraint 8 留在工作区
  **未提交**，由 Commander 收尾统一提交。

请 AUDITOR 以该 `git_head` 独立核验 A01–A20。
