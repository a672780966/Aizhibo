# DEV-042 REPORT

## 1. Status

READY_FOR_REVIEW

## 2. Implemented

- 新建 `packages/platform-core`（纯类型包，零依赖、零运行时逻辑，同
  `chapter-schema` 定位但连 zod 校验都不需要）：定义
  `NormalizedChatMessage`（`platform`/`viewerId`/`messageId`/`text`/
  `receivedAt`，Dev Spec 第 43 节 + DAG.md CR-017 裁决的 Runtime 核心唯一
  入站契约）与 `ChatHandler`。**不定义** `LivePlatformAdapter`（无消费方，
  D2）。
- 新建 `packages/platform-twitch/src/chatMessageAdapter.ts`：
  - `normalizeTwitchChatMessage(notification): NormalizedChatMessage |
    undefined`：`subscriptionType !== 'channel.chat.message'` → `undefined`；
    `event` 非对象 / `chatter_user_id` 缺失或非 string / `message.text`
    缺失或非 string → `undefined`（诚实失败，不抛异常不猜测）；成功 →
    `{ platform: 'twitch', viewerId: chatter_user_id, messageId:
    notification.messageId, text, receivedAt: notification.receivedAt }`。
  - `createTwitchChatOnNotification(handler: ChatHandler)`：返回与
    `EventSubClientConfig.onNotification` 形状完全兼容的包装函数，转换成功
    才调 `handler`。不改冻结的 `eventSubClient.ts`（Constraint 2）。
  - `messageId` 透传 DEV-041 已保留的 EventSub envelope `message_id`，供
    DEV-043 去重（D4）。
- 新建 `chatMessageAdapter.test.ts`（9 条）与 `platform-core/src/index.test.ts`
  （2 条烟雾测试）。
- `platform-twitch/src/index.ts` 追加导出 `./chatMessageAdapter.js`。
- `platform-twitch/package.json` 追加 workspace 内部依赖
  `@interactive-story/platform-core: workspace:*`（零第三方新增，Constraint 5）。
- 根 `tsconfig.json` 追加 1 条 references `./packages/platform-core`。
- 未做去重存储（DEV-043）、投票解析/聚合（A/B/C/D → Vote，DEV-044）、
  发送消息 API（DEV-046）、完整 `LivePlatformAdapter` 组装；未碰
  `runtime-kernel`/`Vote`/`PlatformPort`/`eventSubClient.ts`/`twitchAuth.ts`。

## 3. Changed Files

Writable Scope 内共 13 个文件（实现提交 11 + Commander 预填 2 未重提）：

```text
packages/platform-core/package.json                          （新增，包骨架）
packages/platform-core/tsconfig.json                         （新增，包骨架）
packages/platform-core/src/index.ts                          （新增，类型定义）
packages/platform-core/src/index.test.ts                     （新增，2 条烟雾测试）
packages/platform-twitch/src/chatMessageAdapter.ts           （新增，转换 + 包装）
packages/platform-twitch/src/chatMessageAdapter.test.ts      （新增，9 条测试）
packages/platform-twitch/src/index.ts                        （追加 1 行导出）
packages/platform-twitch/package.json                        （追加 platform-core 依赖）
pnpm-lock.yaml                                               （两个 importer 条目）
tsconfig.json                                                （追加 1 条 references）
specs/dev/DEV-042/REPORT.md                                  （本文件）
specs/dev/DEV-042/DECISIONS.md                               （新增，D1–D7）
specs/dev/DEV-042/INDEX.md                                   （Task 勾选 + Status 更新）
```

节点文档 `INDEX.md`/`REQUIREMENTS.md`/`ACCEPTANCE.md` 由 Commander 在
`530cd45` 预填（INDEX 初始 IN_PROGRESS/T001 待勾选）；`REQUIREMENTS.md`/
`ACCEPTANCE.md` 已是 Task Package 相应章节的整理/逐字抄录，本节点对其零
改动；INDEX.md 已真实勾选 T001–T003 并更新 Status（见 §7 提交内 diff）。
`packages/audio-engine/**`、`packages/runtime-kernel/**`、
`apps/renderer/**`、`eventSubClient.ts`、`twitchAuth.ts` 以及
`PROJECT_INDEX.md`/`DAG.md`/`tasks/**`/`audit/**`/`protocol/**` 均未修改。

## 4. Tests Executed

六条命令严格按要求顺序执行，全部退出码 0：

| # | 命令 | 结果 |
|---|---|---|
| 1 | `pnpm install` | 0；Scope 13 workspace projects；两个 importer 条目（platform-core 空、platform-twitch 追加 link:../platform-core） |
| 2 | `pnpm typecheck` | 0；`tsc -b` + `tsc -b --noEmit` + renderer typecheck |
| 3 | `pnpm lint` | 0 |
| 4 | `pnpm format:check` | 0 |
| 5 | `pnpm build` | 0 |
| 6 | `pnpm test` | 0；109 test files passed，601 tests passed（DEV-041 基线 590，新增 11：platform-core 2 + chatMessageAdapter 9） |

新增 11 个测试：`platform-core/src/index.test.ts`（2 条烟雾：五字段类型
齐全 + ChatHandler 可调用）；`chatMessageAdapter.test.ts`（9 条，覆盖
A07–A11 全部路径，见 §5）。既有全部包测试零回归。

## 5. Acceptance Results

| # | 判定 | 结果 | 依据 |
|---|---|---|---|
| A01 | `pnpm install` 退出码 0 | PASS | Tests Executed #1 |
| A02 | `pnpm typecheck` 退出码 0 | PASS | Tests Executed #2 |
| A03 | `pnpm lint` 退出码 0 | PASS | Tests Executed #3 |
| A04 | `pnpm format:check` 退出码 0 | PASS | Tests Executed #4 |
| A05 | `pnpm build` 退出码 0 | PASS | Tests Executed #5 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | PASS | 109 files / 601 tests；DEV-041 基线 590 全绿 + 新增 11 |
| A07 | 合法 channel.chat.message notification 正确映射为 NormalizedChatMessage | PASS | 测试：toEqual 整对象 + 五字段逐一断言，platform 恒 'twitch'，messageId/receivedAt 与输入相等 |
| A08 | subscriptionType 不匹配 → undefined | PASS | 测试：`channel.follow` → undefined |
| A09 | chatter_user_id 缺失/非字符串 → undefined | PASS | 测试 A09a（缺失）/A09b（`123` 数字）两路径 |
| A10 | message.text 缺失/非字符串 → undefined | PASS | 测试 A10a（空对象）/A10b（`42` 数字）两路径 |
| A11 | createTwitchChatOnNotification 成功时 handler 恰一次，失败时不调用 | PASS | 测试：spy 断言恰 1 次 + 参数即转换结果；类型不匹配/字段缺失两失败路径均 0 次 |
| A12 | 未新增第三方 npm 依赖 | PASS | platform-core 零依赖；platform-twitch 仅追加 workspace 内部依赖 |
| A13 | runtime-kernel/**、eventSubClient.ts、twitchAuth.ts、audio-engine/**、apps/renderer/** 未修改 | PASS | 交付 diff 为空（见 Scope Check） |
| A14 | platform-core 未定义 LivePlatformAdapter；未创建 ai-host | PASS | platform-core 仅 2 个类型声明；无新包 |
| A15 | 根 tsconfig 恰新增 1 条 platform-core references | PASS | diff +1 行（位置在 platform-twitch 之前，构建顺序见 D7/Scope Check） |
| A16 | DECISIONS.md 存在，覆盖第 6 节全部要点 | PASS | D1–D7（D1 新建包理由/D2 不定义 Adapter/D3 不碰 Vote/PlatformPort/D4 messageId 复用） |
| A17 | 节点文档齐全，INDEX.md T001–T003 全部勾选，Status=READY_FOR_REVIEW | PASS | `specs/dev/DEV-042/`（INDEX/REQUIREMENTS/ACCEPTANCE/REPORT/DECISIONS） |
| A18 | git log 新增恰 1 条提交，首行 `DEV-042: chat message adapter (platform-core + twitch normalizer)` | PASS | 本次交付 commit 核验（§7） |
| A19 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但未提交 | PASS | commit 后 `git status --porcelain` |
| A20 | PROJECT_INDEX/DAG/tasks/audit/protocol 未修改 | PASS | 交付 diff 为空（见 Scope Check） |

## 6. Scope Check

只施工 DEV-042。没有推进任何其他 DEV 节点；没有实现去重存储（DEV-043）、
投票解析/聚合（DEV-044）、发送消息 API（DEV-046）、完整 LivePlatformAdapter
组装；没有新增第三方依赖（仅 workspace 内部 platform-core ↔
platform-twitch）；没有定义 LivePlatformAdapter；没有创建 packages/ai-host。
`packages/audio-engine/**`、`packages/runtime-kernel/**`、`apps/renderer/**`、
`eventSubClient.ts`、`twitchAuth.ts` 以及 `PROJECT_INDEX.md`/`DAG.md`/
`tasks/**`/`audit/**`/`protocol/**` 均未修改。Constraints 1–8 全部遵守。

**Scope Deviations（申报，非越界）**：① T001 将 `platform-core` references
追加在 `platform-twitch` **之后**，clean build 时 TS2307（platform-twitch
先于 platform-core 编译，`.d.ts` 未产出——根 tsconfig references 顺序即
`tsc -b` 构建顺序，见 chapter-compiler 零 refs 却 import chapter-schema 的
既有惯例）。修复：references 位置调整到 `platform-twitch` **之前**，diff
仍是净 +1 行，A15 不受影响；clean build（`rm dist + tsbuildinfo` 后
`tsc -b`）验证退出码 0。② Writable Scope 列出的节点文档 `REQUIREMENTS.md`
与 `ACCEPTANCE.md` 由 Commander 预填于 `530cd45`，本节点未再改动（同
DEV-041 先例）；REPORT.md 为新建（T001 模板 → T003 回填）。此申报与
DEV-035/036/040/041 对 Commander 预填文件的处理先例一致。

## 7. Commit

提交信息首行：`DEV-042: chat message adapter (platform-core + twitch normalizer)`。

`DECISIONS.md` 已包含在该提交中。LEDGER 追加行与 NODE_REPORT 消息文件
（`specs/comms/`）已写入工作区但**未提交**，留给 Commander 收尾统一提交。

## 8. Handoff

NODE_REPORT 发往 `AUDITOR`，抄送 `COMMANDER`；审核锚点与交付快照见
`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-042.md`。
