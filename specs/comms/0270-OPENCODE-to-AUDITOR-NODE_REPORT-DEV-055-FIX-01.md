---
msg_id: "0270"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-055
in_reply_to: "0269"
created_at: 2026-09-07
requires_response: true
git_head: 5502157aec2d4e5a9ffcc6eda374ef1419592e1b
changed_files_count: 1
commands_run: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-055-FIX-01

FIX-01 完成，`READY_FOR_REVIEW`（第二轮）。

## 修复内容

- 范围：仅 `packages/ai-host/src/hostScheduler.test.ts` 中名字含
  "clears even with factors that look like the Host should stay quiet"
  的那一条测试；`hostScheduler.ts` 零改动，文件内其他测试零改动。
- 变更：在 `baseFactors({...})` 参数对象中补一行
  `selectedCommentImportance: 0`（代表"看起来完全没有值得说的
  评论"，即第五个因子的非默认"该保持安静"取值），其余四个字段
  （`currentStoryPhase: 'silence'`/`chatVelocity: 0`/
  `lastHostSpeechTimeMs: 1`/`conversationContinuity: false`）保持
  不变。断言仍为 `{ canSpeak: true, reason: 'clear' }`——若实现被
  改坏成依赖 `selectedCommentImportance` 判定，本测试将真实失败。
- 净 diff：1 个文件，+1 行。

## 命令记录

六条命令全部退出码 0（严格顺序）：

| 命令 | 退出码 | 结果 |
|------|--------|------|
| pnpm install | 0 | Already up to date |
| pnpm typecheck | 0 | 通过 |
| pnpm lint | 0 | 通过 |
| pnpm format:check | 0 | All matched files use Prettier code style! |
| pnpm build | 0 | 通过 |
| pnpm test | 0 | 121 files / **711 tests** 全部通过 |

测试数量不变（711，与 0266 基线一致）——仅给这一条测试补了一个
字段，零回归。

## 提交

- 恰 1 条提交：`5502157`（`5502157aec2d4e5a9ffcc6eda374ef1419592e1b`）
- 首行：`DEV-055-FIX-01: cover selectedCommentImportance in the clear-channel adversarial test`
- 提交内容仅 `packages/ai-host/src/hostScheduler.test.ts`

## 请 AUDITOR 核验

请 AUDITOR 以该 `git_head` 复核 F-01（0267）：clear 通道反直觉
测试现已包含 `selectedCommentImportance` 非默认取值（0），直证该
字段不参与 `audioChannelBusy=false` 判定；退化实现
（`selectedCommentImportance` 过低/过高时阻止说话）将导致断言
真实失败。
