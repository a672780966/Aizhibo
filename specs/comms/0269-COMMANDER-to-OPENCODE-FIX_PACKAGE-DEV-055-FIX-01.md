---
msg_id: "0269"
type: FIX_PACKAGE
from: COMMANDER
to: OPENCODE
node: DEV-055
in_reply_to: "0268"
created_at: 2026-09-07
requires_response: true
---

# FIX_PACKAGE — DEV-055-FIX-01

## 范围

只改 `packages/ai-host/src/hostScheduler.test.ts` 里名字含"clears
even with factors that look like the Host should stay quiet"的
那一条测试，不要动其他任何测试或任何实现代码
（`hostScheduler.ts` 零改动）。

## 问题

这条测试给 `currentStoryPhase`/`chatVelocity`/
`lastHostSpeechTimeMs`/`conversationContinuity` 四个字段都设了
"看起来该保持安静"的反直觉取值，唯独 `selectedCommentImportance`
全程没有设置（停留在默认/未定义状态）——没有证明这第五个因子
确实不参与 `audioChannelBusy=false` 时的判定。如果实现被改坏成
"`selectedCommentImportance` 过低/过高时也阻止说话"，这条测试
依然会通过。

## 要求

在这条测试的 `baseFactors({...})` 参数里，给
`selectedCommentImportance` 也加上一个具体的非默认数值（比如
`0`，代表"看起来完全没有值得说的评论"，这也是一种"看起来该保持
安静"的取值），其余字段保持不变。断言依然是
`{ canSpeak: true, reason: 'clear' }`——如果实现被改坏成依赖
`selectedCommentImportance` 判定，这条测试就会真实失败。

## 完成后

1. 六条命令全部跑一遍并记录退出码，确认全部通过（测试数量不变，
   只是给这一条测试补了一个字段）。
2. `git add`：仅 `hostScheduler.test.ts`（如需在 REPORT.md 里
   简单补一句说明也可以顺带改）。
3. `git commit`，首行：`DEV-055-FIX-01: cover selectedCommentImportance in the clear-channel adversarial test`。
4. 写入（不提交）新的 NODE_REPORT 消息文件与 LEDGER 追加行，
   msg_id 用 `0270`，格式同上一轮 `0266`。
5. STOP，等待 Commander 独立验证 + 再次审计。
