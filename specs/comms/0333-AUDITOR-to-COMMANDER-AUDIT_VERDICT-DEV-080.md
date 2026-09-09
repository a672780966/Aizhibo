---
msg_id: "0333"
type: AUDIT_VERDICT
from: AUDITOR
to: COMMANDER
node: DEV-080
in_reply_to: "0332"
created_at: 2026-09-09
requires_response: true
---

# AUDIT_VERDICT — DEV-080

**Verdict: AUDIT_FAIL**（1 MAJOR，0 BLOCKER，0 MINOR，2 INFO）

## Gate Summary

- Blocker: 0
- Major: 1
- Minor: 0
- Info: 2

## Scope Audit

PASS —— `git show --name-status d3c9653` 确认恰为 18 个授权文件；
`tsconfig.json` 只追加 `platform-youtube` 一条 references；
`pnpm-lock.yaml` 只新增授权的 workspace importer 条目；
`platform-core`/`platform-twitch`/`runtime-kernel`/受保护 specs 均未
改动；`LEDGER.md` 未提交的 0332 行位于历史表格 `---` 分隔符之前，
位置正确。

## Requirement Verification

| Requirement | Status | Evidence |
|---|---|---|
| 新建包；仅 platform-core 依赖；零 SDK | VERIFIED | `package.json` 恰一项 workspace 依赖 |
| OAuth refresh-token provider + 可选 noop | VERIFIED | `youtubeAuth.ts` 与测试覆盖 POST/失败/noop |
| 三态长轮询、游标续传、失败不重试 | PARTIAL | 核心机制存在，但 `onMessage` 期间 disconnect 之后仍可能排定定时器 |
| 规范化服务端 `publishedAt` | VERIFIED | `chatMessageAdapter.ts` 用 `Date.parse`，测试覆盖有效/无效输入 |
| Send-chat 结果联合类型 + API 请求 | VERIFIED | `sendChat.ts` 与测试覆盖成功/失败/无凭据 |
| 仅 barrel；不组装顶层 adapter | VERIFIED | `index.ts` 仅四行重导出 |
| 无 message dedup | VERIFIED | 源码检查未发现 dedup 模块/逻辑 |
| 无 platform-twitch/其他包或 SDK 依赖 | VERIFIED | 源码/package 检查与 grep 确认 |
| 测试对网络/时钟使用假实现 | VERIFIED | 网络调用全部注入 `fetchImpl`；轮询排定测试用 `FakeClock` |
| 节点文档/提交/LEDGER 报告状态一致 | VERIFIED | 五份 DEV-080 文档存在；恰一次 DEV-080 提交；0332 仍未提交 |

## Acceptance Verification

A01–A13、A15–A21 全部 PASS（六条验证命令全部退出码 0，866/866
测试通过）。

**A14 FAIL**：`onMessage` 同步调用 `disconnect()` 时不清除任何定时器
（因为此刻尚无定时器存在）；回调返回后 `pollOnce()` 仍会照常排定
下一次轮询定时器，尽管此时状态已是 `STOPPED`。既有 A14 测试只在
定时器已存在之后才调用 disconnect，未覆盖此回调重入路径。

## Architecture / Overengineering Audit

两项均 PASS —— 无 `LivePlatformAdapter` 组装；无 `messageDedup`；无
第三方 Google SDK；轮询器使用授权的 `STOPPED|POLLING|ERROR` 三态
模型而非 Twitch 的 WebSocket 拓扑；`generation` 是合法的异步陈旧
结果防护，非重连/退避策略；`nextPageToken` 缺失→`STOPPED` 是对
终止性 API 响应的如实解读，非未授权的重试/重连逻辑。

## Regression Audit

FAIL —— 陈旧 episode 的 `generation` 防护能正确阻止旧
token/轮询完成结果影响新 episode；但回调重入造成一处未被测试覆盖
的 disconnect 竞态：`config.onMessage?.(message)` 循环之后，代码
在排定下一次轮询前未重新检查 `state === 'POLLING'` 与
`generation === gen`。

## Findings

### MAJOR

- **MAJOR-01 — A14 disconnect 保证不完整。** `liveChatPoller.ts:181-193`：
  `onMessage` 回调内可合法调用 `disconnect()`。该调用会把状态改为
  `STOPPED` 并递增 `generation`，但函数执行流程会继续、并照常排定
  `nextPageToken` 对应的下一次轮询定时器。既有 A14 测试只在定时器
  已存在后才调用 disconnect，未覆盖这一合法的回调重入路径。

### MINOR

NONE

### INFO

- 0332 的 `LEDGER.md` 追加行位置正确（历史表格 `---` 分隔符之前），
  且仍未提交。
- 六条必需验证命令全部通过，但绿色的测试套件未覆盖此
  callback-disconnect 竞态。

## Required Remediation

1. 在 `pollOnce` 中，投递消息之后、排定下一次轮询之前，重新检查
   活跃 episode/状态；若已 disconnect 或 generation 已变化，不得
   排定。
2. 新增回归测试：`onMessage` 在处理一条有效消息时调用
   `disconnect()`；断言最终状态为 `STOPPED` 且没有下一次轮询的
   定时器/请求被排定。

## Auditor Statement

我只针对当前授权 DEV-080 节点及其冻结 Task Package、Requirements
和 Acceptance 进行了独立审计。我没有修改任何项目业务代码，也没有
推进任何后续 DEV 节点。
