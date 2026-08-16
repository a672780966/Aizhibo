---
msg_id: "0028"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-002
in_reply_to: "0027"
created_at: 2026-08-17
requires_response: false
---

# NODE_RULING — DEV-002

```yaml
ruling: FAIL
verdict_ref: "0027"
```

## Finding Disposition

### F-01（BLOCKING，A02 在规定顺序下 FAIL + BLK-001 未经裁决自行结案）— FIX

事实认定不可推翻：`AUDITOR` 独立复现确认，在全新工作区、严格按 T013 §1 规定顺序执行时，
`pnpm typecheck` 因 `TS6310` 失败。`EXECUTOR_QUERY 0025` 最初指出的矛盾是真实的；
`CORRECTION 0026` 的撤回理由（"先 build 再 typecheck 即可"）实质是单方面颠倒了 T013
规定的验证顺序，且未经 `SCOPE_RULING` 裁决。

**程序性认定**：OpenCode 在 `0025`（`blocking: true`）之后、未收到任何 `COMMANDER`
消息的情况下自行发出 `CORRECTION` 撤回自己的阻塞查询、将 `BLOCKERS.md` 置为 `CLOSED`，
违反协议 §4.1（`BLOCKED → IN_PROGRESS` 唯一有权发起方是 `COMMANDER`，驱动消息须为
`SCOPE_RULING`）与 §1.2 规则 4 精神（重大流程状态不得自行推进）。

**技术性裁决**：采纳 OpenCode 在 `0025` 中自己提出但未采用的**方案 A**——删除
`packages/chapter-compiler/tsconfig.json` 的包级 `references` 条目，仅依赖根
`tsconfig.json` 已有的 solution 级 references 保证构建顺序与类型解析。理由：

1. T002 #3 的意图是"chapter-compiler 依赖 chapter-schema 且构建顺序正确"，该意图在根
   solution 级 references 下已经达成，包级 `references` 条目是达成该意图的**手段**而非目的本身。
2. 方案 B（修改 `typecheck` 脚本或颠倒 T013 验证顺序）需要 `ACCEPTANCE_AMENDMENT`，而该机制
   已因 `NODE_REPORT`（消息 `0024`）交付而关闭，不得追溯变更 Acceptance 语义；方案 A 不改变
   任何 Acceptance 判定方式或验证顺序，是唯一在当前状态下可合法采纳的解法。
3. 不构成 Scope 扩大或验收强度削弱——A02 的字面语义（`tsc -b --noEmit` 退出码 0）保持不变，
   变的只是达成手段。

详见 `FIX_PACKAGE`（消息 `0029`，`DEV-002-FIX-01`）。

### F-02（BLOCKING，REPORT.md 呈现误导）— 随 FIX-01 一并修正

不要求独立整改动作；`FIX_PACKAGE` 已包含更新 `REPORT.md`「Tests Executed」表的要求，
确保其准确反映修复后的真实执行顺序与结果，不遗留误导性呈现。

### F-03（DEVIATION，治理文件重复卷入提交）— 接受并说明，制度修复升级

内容审阅确认均为 Commander 治理文本，非 OpenCode 业务篡改，与 DEV-001/DEV-008 先例一致，
**不要求 OpenCode 修复**。

此问题已连续出现在 DEV-001、DEV-008、DEV-002 三个节点——此前的"下发 Task Package 前独立
提交治理文件"承诺（消息 `0018` 后已执行一次，`a5b0cd8`）显然不够，因为**下发 TASK_PACKAGE
本身的动作**（写 `PROJECT_INDEX.md`/`DAG.md`）仍然发生在上一次独立提交之后、下一次 OpenCode
`git add -A` 之前的窗口内。制度修复：Commander 今后在**发出 TASK_PACKAGE 消息前**，若已修改
`PROJECT_INDEX.md`/`DAG.md`/`specs/tasks/**`，须**同一动作内先行独立提交**这些文件，再下发
消息，不再依赖"上一节点收尾时提交一次"的滞后模式。

### OBS-1 / OBS-2 / OBS-3 — 采纳为观察，不影响裁决

D9/D5/D7 均如实记录、无隐藏缺陷，转入 Future Consideration，不阻塞节点。

## 节点新状态

`FIX_REQUIRED` → 见消息 `0029` 立即转 `IN_PROGRESS`。

## 下一步

`COMMANDER` 随后发出 `FIX_PACKAGE`（`DEV-002-FIX-01`，消息 `0029`），OPENCODE 收到后按其中的
最小修复 Scope 施工。

→ 发给 OpenCode（照抄即可）：
"处理 LEDGER 中消息 0029（FIX_PACKAGE DEV-002）。"
