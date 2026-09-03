---
msg_id: "0169"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-040
in_reply_to: "0168"
created_at: 2026-09-04
requires_response: false
---

# NODE_RULING — DEV-040

## Ruling

**PASS**

`verdict_ref: "0168"`

## 裁决说明

`AUDITOR` 独立审计（消息 `0168`）：AUDIT_FAIL，唯一原因是 A19（"恰 1 条
提交"）字面未达成——实际是 `11d4cb1`（实现主体）+ `4670bd5`（仅 LEDGER
追加与执行方自己的 NODE_REPORT 消息，零代码/零依赖/零 Forbidden Scope）
两次提交。其余 A01–A18、A20–A21 全部独立 VERIFIED，Architecture/
Regression/Overengineering 三项均 PASS，562→574 测试零回归。

**裁决采纳 Auditor 提出的选项 (a)：把 A19 按"恰 1 条实质提交"的立法意图
认定为成立，覆盖字面文本，判 PASS。** 理由：

1. A19 这条验收项存在的目的是防止执行方在一次 NODE_REPORT 周期内偷偷推进
   多个不相关改动、或把 Forbidden Scope 内容混入历史——是一条**防越界**
   条款，不是"提交次数"本身的目的。第二次提交 `4670bd5` 经 Auditor 独立
   核实，内容 100% 限定在 Writable Scope 授权文件内（`LEDGER.md` 追加 +
   执行方自己发出的消息文件），零代码、零依赖、零 Forbidden Scope——不存在
   A19 实际要防范的那类风险。
2. 不选择"要求执行方重新整理为单一提交并重发 NODE_REPORT"（选项 b）：这
   等同于要求 rewrite 已经落地的本地提交历史（squash/amend），本项目与
   USER 的既定纪律是**尽量不重写已发生的提交历史**，为此付出的成本
   （重新触发一轮 pi 调用、重新审计）与它能消除的风险不成比例——两次
   提交本身就是"更细粒度"，不是"更混乱"。
3. **制度修复（面向未来节点，防止同类偏离再次发生）**：DEV-037 建立的
   惯例是执行方的实现提交（如 `39733c8`）**不包含** LEDGER 追加与自己的
   NODE_REPORT 消息文件，这两项留待 Commander 收尾时与 AUDIT_VERDICT/
   NODE_RULING 一并提交（如 `8bc61c5`）。DEV-040 的 dispatch 提示词没有
   把这条惯例说清楚，导致执行方（合理地）按 Task Package T003 步骤 6→7
   的字面顺序（先 commit，再"追加 LEDGER 行，发 NODE_REPORT"）多做了一次
   提交。**今后每次 `pi` dispatch 提示词必须显式追加一句**：
   "追加 LEDGER 行与发出 NODE_REPORT 消息文件后，不要再额外提交/不要
   `git add` 它们——留在工作区未提交状态，由 Commander 收尾时统一提交"。
   已记录进 Commander 操作记忆，后续节点的 dispatch 提示词将固定包含
   这一句。

**DEV-040 转 `DONE`，接口冻结**：

- 新建 `packages/platform-twitch` 包：`TwitchAuthPort`/`noopTwitchAuthPort`/
  `createTwitchAuthProvider`（真实 Twitch OAuth2 token 端点客户端，原生
  fetch，零新增依赖）/`createOptionalTwitchAuthProvider`（凭据不全时严格
  身份等价退化为 noop）/`getTwitchAuthHealth`（CR-019 本包首次适用）。
- 未接入任何消费方（`LivePlatformAdapter`/EventSub/Chat 均未实现），未做
  交互式授权首次获取/token 缓存调度/`/oauth2/validate`——全部正确留给
  DEV-041/042/045/046 或未来消费方。

`git_head`（最终，含两次提交）：`4670bd5adf54bf9346d462caa2187c1a0357a8b9`

## Next

M4 下一个节点 DEV-041（EventSub Client）具备下发条件。本节点闭环也标志着
USER "再做 5 轮" 指示（DEV-035/036/037 + DEV-038 现实核对与推迟 +
DEV-040）已完成——按惯例先向 USER 汇报本轮结果小结，再决定是否继续下一轮。
