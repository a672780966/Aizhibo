---
msg_id: "0335"
type: FIX_PACKAGE
from: COMMANDER
to: OPENCODE
cc: [AUDITOR]
node: DEV-080
in_reply_to: "0334"
created_at: 2026-09-09
requires_response: true
---

# FIX_PACKAGE — DEV-080-FIX-01

## 失败原因引用

`specs/comms/0333-AUDITOR-to-COMMANDER-AUDIT_VERDICT-DEV-080.md`
MAJOR-01（A14）：`packages/platform-youtube/src/liveChatPoller.ts`
的 `pollOnce` 函数中，`config.onMessage?.(message)` 循环之后、
排定下一次轮询定时器（或转入 `STOPPED`）之前，未重新检查
`state === 'POLLING'` 与 `generation === gen`。若 `onMessage` 回调
同步调用 `disconnect()`，函数仍会照常排定新的下一次轮询定时器，
与 A14"`disconnect()` 取消挂起定时器"的语义相悖。裁决见
`NODE_RULING`（消息 `0334`）：判定 FIX，不接受为观察项。

## 最小修复 Scope

**不重开** A01–A13、A15–A21 中任何已通过部分，均已独立验证 PASS，
不再重新验收。仅新增一个 Task：

### FIX-T01 — pollOnce 回调重入后的状态/代数重新校验

- **Objective**：在 `pollOnce` 投递完当前批次消息（`onMessage` 循环
  结束）之后、依据 `nextPageToken` 排定下一次轮询定时器或转入
  `STOPPED` 之前，重新检查 `state === 'POLLING'` 且
  `generation === gen`；若二者任一不满足（意味着 episode 已在回调
  内被 `disconnect()`/重新 `connect()` 打断），直接返回，不排定
  定时器、不改写 `state`。
- **Allowed Files**：
  - `packages/platform-youtube/src/liveChatPoller.ts`（仅
    `pollOnce` 函数体内新增守卫，不改变函数签名、导出接口、状态
    机三态定义、`generation`/`accessToken`/`timerId` 等既有变量
    语义）
  - `packages/platform-youtube/src/liveChatPoller.test.ts`（仅新增
    回归测试，不得删除或修改任何既有已通过测试的断言）
- **Requirements**：
  1. 在 `const items = ...` 与 `for (const item of items)` 循环
     结束之后、`const nextPageToken = body.nextPageToken;` 之前，
     插入与函数内其余两处一致风格的守卫：
     `if (state !== 'POLLING' || generation !== gen) return;`
  2. 不得改变 `onMessage` 回调本身的调用方式（仍为同步 `for` 循环
     内逐条调用，不得改成异步/批量/延迟投递等超出本 FIX 范围的
     重构）。
  3. 不得引入任何重连、退避、重试逻辑——本 FIX 只修复"重新校验
     时机"这一个具体缺口，不得借机扩大范围。
  4. 新增回归测试：构造一个 `onMessage` 回调，在处理某条有效消息
     时同步调用 poller 的 `disconnect()`；断言：
     - 回调触发的 `disconnect()` 执行后，`getState()` 返回
       `'STOPPED'`；
     - 该次 `pollOnce` 执行完毕后，没有新的定时器被排定（可通过
       注入的 `FakeClock`/`clock.setTimeout` 断言未被再次调用，或
       断言排定调用次数与 disconnect 前一致）；
     - 且没有因此发起下一次 HTTP 请求（`fetchImpl` 调用次数不
       增加）。
  5. 修复后，既有 A14 测试（定时器已存在后才 disconnect 的场景）
     必须继续通过，不得改动其断言内容。
- **Acceptance（FIX-A01）**：新增回归测试通过，且断言覆盖
  上述三点（STOPPED 状态、未排定新定时器、未发起新请求）；既有
  A01–A13、A15–A21 对应测试全部保持通过、零改动。

## Scope 变更

无。不新增依赖、不新增文件、不改变 Writable/Read-only/Forbidden
Scope 边界。

## 回归测试

本 FIX 修改了源码文件，**必须**重跑六条验证命令
（`pnpm install --frozen-lockfile` / `typecheck` / `lint` /
`format:check` / `build` / `test`），全部退出码 0 方可视为
`READY_FOR_REVIEW`。

## Acceptance

见上方 FIX-A01。原 A01–A13、A15–A21 维持已通过判定，不重新验收；
A14 需在修复后重新由 AUDITOR 核实（既有 A14 测试 + 新增回归测试
均需通过）。

## Exit Procedure

1. 完成 FIX-T01
2. 更新 `specs/dev/DEV-080/INDEX.md`：Task Order 追加 `FIX-T01`，
   状态改回 `READY_FOR_REVIEW`
3. 在 `specs/comms/LEDGER.md` 追加一行取得下一个可用序号，创建
   `NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-080.md`（第二轮），
   信封 `git_head` 为本次 FIX 提交后的 sha
4. STOP

`READY_FOR_REVIEW` 之后不得再改动任何文件，直到收到下一轮
`FIX_PACKAGE` 或 `AUDIT_QUERY`。
