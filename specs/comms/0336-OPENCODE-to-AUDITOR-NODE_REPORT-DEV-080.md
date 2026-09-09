---
msg_id: "0336"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-080
in_reply_to: "0335"
created_at: 2026-09-09
requires_response: true
git_head: 3e70b31
changed_files_count: 3
commands_run: [pnpm install --frozen-lockfile, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-080（第二轮）

DEV-080-FIX-01（FIX-T01）完成，`READY_FOR_REVIEW`。修复仅针对
MAJOR-01（A14 语义缺口）；A01–A13、A15–A21 维持第一轮已通过判定，
未重新验收、零改动。

## FIX 提交快照

- `git_head`: 3e70b31（`DEV-080-FIX-01: guard pollOnce after onMessage
  delivery (MAJOR-01 disconnect reentrancy)`）
- Changed Files（3，与 FIX 提交一致）：
  - `packages/platform-youtube/src/liveChatPoller.ts`（+3 行：`pollOnce`
    内 `onMessage` 投递循环结束之后、`const nextPageToken =
    body.nextPageToken;` 之前插入守卫
    `if (state !== 'POLLING' || generation !== gen) return;`，与函数内
    请求返回后、响应形状校验前其余两处守卫逐字同风格。回调内同步
    `disconnect()`/重新 `connect()` 打断 episode 后直接返回——不再排定
    下一次轮询定时器、不改写 `state`。函数签名、导出接口、三态定义、
    `generation`/`accessToken`/`timerId` 语义零改动；`onMessage` 仍为
    `for` 循环内同步逐条调用，未引入任何重连/退避/重试/异步投递逻辑）
  - `packages/platform-youtube/src/liveChatPoller.test.ts`（+1 回归测试，
    夹在 A14 测试与 stale-response 测试之间；既有测试断言零删除零修改）
  - `specs/dev/DEV-080/INDEX.md`（Task Order 追加 `FIX-T01` 勾选行，
    Status = READY_FOR_REVIEW）

## FIX-T01 回归测试（新增，`liveChatPoller.test.ts`）

构造 `onMessage` 回调在处理有效消息（`textItem('m1')`）时同步调用
`holder.client!.disconnect()`（回调重入）；`fetchImpl` 返回带
`nextPageToken: 'TOKEN-1'` 的响应（走「排定下一次」分支而非
`nextPageToken` 缺失分支），断言三点：

1. 回调内 `disconnect()` 执行后 `getState()` 返回 `'STOPPED'`（且
   `getHealth()` 为 `{ status: 'DOWN', error: 'state: STOPPED' }`）——
   `disconnect()` 是同步调用，消息投递结束时状态已翻转；
2. 该次 `pollOnce` 执行完毕后未排定新定时器——注入 `FakeClock` 的
   `timers.length === 0` 且 `timeouts.length === 0`（修复前该场景会
   照常登记一个 timeout=2500 的定时器）；
3. 未因此发起下一次 HTTP 请求——`fetchImpl` 调用次数恰为 1，无增长。

未用 `let client` + 延后赋值（`prefer-const` 告警），改用 holder 对象
承接 poller 引用，与仓库既有测试风格一致。

## A14 既有测试保持

「disconnect() 取消挂起定时器」场景（定时器**已存在**后才 disconnect，
即 `clock.timers.length === 1` 后调 `disconnect()`）的既有 A14 测试
断言内容零改动、继续通过——新守卫只覆盖「排定前被打断」的时机，两场景
互补无冲突。晚到响应丢弃（episode 代数）测试同样零改动通过。

## 验证（六条命令全部退出码 0）

| 命令 | 退出码 |
|---|---|
| `pnpm install --frozen-lockfile` | 0 |
| `pnpm typecheck` | 0 |
| `pnpm lint` | 0 |
| `pnpm format:check` | 0 |
| `pnpm build` | 0 |
| `pnpm test` | 0 |

`pnpm test`：154 测试文件、**867 全部通过**（866 + 1 新增回归测试，
零回归），含 `liveChatPoller.test.ts` 11/11 通过。

## 范围与残留

- Writable/Read-only/Forbidden Scope 边界零变化：仅 FIX_PACKAGE 授权
  的两个包文件 + Exit Procedure 指定的 INDEX.md 进入 FIX 提交；其余
  一切文件未改动。
- 新增依赖：无。新文件：无（消息文件除外）。
- 工作区残留：`git status` 仅剩本 LEDGER 追加行（seq 0336，置于历史
  表格内、`---` 分隔符之前、`当前待处理` 表格之前，Status = OPEN 待
  AUDITOR 处理）与消息文件两处未提交改动，留待 Commander/AUDITOR
  收尾。
