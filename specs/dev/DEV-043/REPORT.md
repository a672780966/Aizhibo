# DEV-043 REPORT

## 1. Status

READY_FOR_REVIEW

## 2. Implemented

- 新建 `packages/platform-twitch/src/messageDedup.ts`（Dev Spec 第 44 节：
  EventSub 至少一次投递，相同通知可能重复，必须基于 `message_id` 去重）：
  - `MessageDeduplicator`/`MessageDeduplicatorConfig` 接口与
    `createMessageDeduplicator`：`Set<string>`（O(1) 判重）+ FIFO 数组
    （记录插入顺序）。`seen(id)` 已见过返回 `true` 且**不重新插入**
    （重复不"续命"，Task Package 第 2.1 节要求的确定性行为）；未见过则
    插入并返回 `false`；超过 `maxSize`（默认 1000）淘汰队列头部最旧的
    一个（同步从 `Set` 删除）。纯内存、不持久化。
  - `createDedupingOnNotification(handler, deduplicator?)`：包装
    `TwitchChatNotification` 层 `onNotification` 回调，重复 `messageId`
    直接丢弃不调用 `handler`，首次见到才透传；不传 `deduplicator` 时
    内部新建默认实例。
  - 包装的是 DEV-041 的 notification 层（通用于全部订阅类型），**不是**
    DEV-042 的 `ChatHandler`/`NormalizedChatMessage` 层（D2）。
- 新建 `messageDedup.test.ts`（7 条，见 §4）。
- `platform-twitch/src/index.ts` 追加 1 行导出 `./messageDedup.js`。
- 未实现持久化/跨进程去重、投票解析/聚合（DEV-044）、重连算法
  （DEV-045）、发送消息 API（DEV-046）；未把去重接入
  `chatMessageAdapter.ts` 内部；未碰 `eventSubClient.ts`/`twitchAuth.ts`/
  `chatMessageAdapter.ts`/`runtime-kernel`/`Vote`/`PlatformPort`。

## 3. Changed Files

Writable Scope 内共 5 个文件（实现提交 4 + T001 已建 REPORT 回填）：

```text
packages/platform-twitch/src/messageDedup.ts       （新增，去重原语）
packages/platform-twitch/src/messageDedup.test.ts  （新增，7 条测试）
packages/platform-twitch/src/index.ts              （追加 1 行导出）
specs/dev/DEV-043/DECISIONS.md                     （新增，D1–D6）
specs/dev/DEV-043/REPORT.md                        （本文件，T001 模板 → T002 回填）
```

节点文档 `INDEX.md`/`REQUIREMENTS.md`/`ACCEPTANCE.md` 由 Commander 在
`04d4234` dispatch 时预填（INDEX 初始 IN_PROGRESS/T001 待勾选；
REQUIREMENTS/ACCEPTANCE 已是 Task Package 相应章节的整理/逐字抄录），本
节点对其零改动；INDEX.md 已勾选 T001–T002 并更新 Status（§7 提交内
diff）。`packages/audio-engine/**`、`packages/runtime-kernel/**`、
`apps/renderer/**`、`eventSubClient.ts`、`twitchAuth.ts`、
`chatMessageAdapter.ts` 及 `PROJECT_INDEX.md`/`DAG.md`/`tasks/**`/
`audit/**`/`protocol/**` 均未修改（见 §6 Scope Check 的空 diff 佐证）。

## 4. Tests Executed

六条命令严格按要求顺序执行，全部退出码 0：

| # | 命令 | 结果 |
|---|---|---|
| 1 | `pnpm install` | 0 |
| 2 | `pnpm typecheck` | 0；`tsc -b` + `tsc -b --noEmit` + renderer typecheck |
| 3 | `pnpm lint` | 0；`eslint .` |
| 4 | `pnpm format:check` | 0；Prettier 全绿（初跑 1 次失败→`prettier --write` 修复签名换行后重跑通过，见 §6） |
| 5 | `pnpm build` | 0；`tsc -b` |
| 6 | `pnpm test` | 0；110 test files passed，608 tests passed（DEV-042 基线 601，新增 7） |

新增 7 个测试：`messageDedup.test.ts`（A07 判重、A08 淘汰边界、A09 不续命
满窗、maxSize=0 边界、A10a 重复丢弃/A10b 不同触发/注入共享 deduplicator）。
既有全部包测试零回归。

## 5. Acceptance Results

| # | 判定 | 结果 | 依据 |
|---|---|---|---|
| A01 | `pnpm install` 退出码 0 | PASS | Tests Executed #1 |
| A02 | `pnpm typecheck` 退出码 0 | PASS | Tests Executed #2 |
| A03 | `pnpm lint` 退出码 0 | PASS | Tests Executed #3 |
| A04 | `pnpm format:check` 退出码 0 | PASS | Tests Executed #4 |
| A05 | `pnpm build` 退出码 0 | PASS | Tests Executed #5 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | PASS | 110 files / 608 tests；DEV-042 基线 601 全绿 + 新增 7 |
| A07 | 同一 messageId 第二次 seen() 返回 true，第一次返回 false | PASS | 测试：`seen('msg-1')` → false，再 `seen('msg-1')` → true |
| A08 | 超过 maxSize 后最旧 id 被淘汰，淘汰后再传入视为未见过 | PASS | 测试：maxSize=3 填满后第 4 个新 id 挤掉 msg-1；msg-2/msg-3 仍 true，msg-1 重新传入 false |
| A09 | 重复 id 不重新插入淘汰顺序末尾（不续命） | PASS | 测试：maxSize=3 见 A 后重复见 A，再连见 3 个新 id，第 1 个即挤掉 A（A 未续命到队尾）；A 重传 false |
| A10 | createDedupingOnNotification：重复 messageId 丢弃，不同 messageId 都触发 handler | PASS | 测试 A10a：同 id 两帧 handler 恰 1 次且收到第一帧；A10b：3 个不同 id 各触发 1 次共 3 次 |
| A11 | 未新增第三方 npm 依赖 | PASS | 零新增；仅原生 Set/Array + workspace 内类型 import（`package.json`/`pnpm-lock.yaml` 无 diff） |
| A12 | `eventSubClient.ts`/`twitchAuth.ts`/`chatMessageAdapter.ts`/`runtime-kernel/**`/`apps/renderer/**` 未被修改 | PASS | 交付 diff 为空（见 §6 Scope Check） |
| A13 | 未引入任何数据库/持久化依赖；未创建 packages/ai-host | PASS | 纯内存 Set/Array；无新包 |
| A14 | `DECISIONS.md` 存在，覆盖第 6 节全部要点 | PASS | D1–D4（为何有界内存而非持久化/为何包装 notification 层/maxSize=1000 理由/重复不续命理由） |
| A15 | `specs/dev/DEV-043/` 节点文档齐全，INDEX.md T001–T002 全部勾选，Status=READY_FOR_REVIEW | PASS | INDEX/REQUIREMENTS/ACCEPTANCE/DECISIONS/REPORT 五份齐全；INDEX Task 全勾 + Status 已更新 |
| A16 | `git log` 新增恰 1 条提交，首行 `DEV-043: message deduplication (bounded fifo)` | PASS | 本次交付 commit 核验（§7） |
| A17 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但未提交 | PASS | commit 后 `git status --porcelain`（见 §8） |
| A18 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | PASS | 交付 diff 为空（见 §6 Scope Check） |

## 6. Scope Check

只施工 DEV-043。没有推进任何其他 DEV 节点；没有实现持久化/跨进程去重
（纯进程内有界内存，D1）、投票解析/聚合（DEV-044）、重连算法
（DEV-045）、发送消息 API（DEV-046）；没有把去重绑死在
`ChatHandler`/`NormalizedChatMessage` 层（包装 `TwitchChatNotification`
层，D2）；没有新增任何第三方 npm 依赖（A11）；没有创建 `packages/ai-host`。
`packages/audio-engine/**`、`packages/runtime-kernel/**`、`apps/renderer/**`、
`eventSubClient.ts`、`twitchAuth.ts`、`chatMessageAdapter.ts` 以及
`PROJECT_INDEX.md`/`DAG.md`/`tasks/**`/`audit/**`/`protocol/**` 均未修改。
Constraints 1–8 全部遵守。

**Scope Deviations（申报，非越界）**：① format:check 初跑失败（Prettier
要求 `createMessageDeduplicator` 签名压单行），`prettier --write` 修复
`messageDedup.ts` 后重跑通过；② `messageDedup.test.ts` A08 断言顺序初版
有误——淘汰后立刻重传 `msg-1`（返回 false 但将其重新插入窗口，挤掉
msg-2）污染后续断言，调整为先断言 msg-2/msg-3 存活、最后才重传 msg-1；
属测试断言顺序修正，实现与验收语义未变，修正后 A08 语义与 Task Package
判定逐字一致（msg-1 淘汰后重传 → false）；③ Writable Scope 列出的节点
文档 `REQUIREMENTS.md` 与 `ACCEPTANCE.md` 由 Commander 预填于 `04d4234`，
本节点未再改动（同 DEV-041/042 先例）；REPORT.md 为 T001 新建模板 →
T002 回填。此申报与 DEV-035/036/040/041/042 对 Commander 预填文件的处理
先例一致。

## 7. Commit

提交信息首行：`DEV-043: message deduplication (bounded fifo)`。

`DECISIONS.md` 已包含在该提交中。LEDGER 追加行与 NODE_REPORT 消息文件
（`specs/comms/`）已写入工作区但**未提交**，留给 Commander 收尾统一提交
（Constraint 8 / A17）。

## 8. Handoff

NODE_REPORT 发往 `AUDITOR`，抄送 `COMMANDER`；审核锚点与交付快照见
`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-043.md`。
