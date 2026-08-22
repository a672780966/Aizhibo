---
msg_id: "0137"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-028
in_reply_to: "0136"
created_at: 2026-08-23
requires_response: false
---

# NODE_RULING — DEV-028

```yaml
ruling: PASS
verdict_ref: "0136"
```

## Finding Disposition

### OBSERVATION-01（OBSERVATION）— 接受并说明，不影响裁决

审计时 LEDGER 0135 行与 NODE_REPORT 消息文件仍是工作区未提交状态，符合既定
"随下个治理提交捕获"先例，随本裁决一并提交结案。

## 节点新状态

`READY_FOR_REVIEW` → **`DONE`，接口冻结**。

本节点零生产代码改动——`wrapPresentationPort`（DEV-012 冻结）的序号分配与
`createWebSocketPresentationPort`（DEV-020 冻结）的分发逻辑均未被触碰，只是首次
为 CR-012 要求的三个属性（真实断线重连走同一路径、同连接 RESYNC 幂等性、多客户端
广播一致性）补齐了此前缺失的测试覆盖。`wsServer.test.ts`/`presentationCommand.test.ts`
新增的 3 个用例冻结为这三个属性的回归基线。

`git_head`：`ebf4b1d`。

## 里程碑公告：M2 — Presentation Complete 全部完成

DEV-020 至 DEV-028 共 9 个节点（Renderer Shell / Scene Renderer / Character
Renderer / Subtitle-Dialogue / Choice UI / Dice UI / Camera-Transition / BGM-SFX /
Presentation Command Bus）全部 `DONE`、接口冻结。`apps/renderer` 现已具备完整的
演出层：场景背景、角色站位、对话字幕、选项展示、骰子 UI、镜头/转场、音频信号，
外加 CR-012 要求的重连/幂等/广播三属性测试覆盖。

M2 期间共发生一次 `NODE_RULING: FAIL`（DEV-025，安全论证文档错误，代码本身安全，
经 `FIX_PACKAGE` 一轮更正后 PASS），其余 8 个节点首轮即 PASS。

## 下一步

M2 全部完成。按 `DAG.md`，M3（音频，DEV-030 起）此前已具备下发条件（只依赖已冻结
的 DEV-012）；M4（Twitch）依赖 M2+M3。下一步排期（M3 优先，或与 M4 交叉安排）留待
`USER` 指示或 `COMMANDER` 下一轮起草时决定。

本轮无需 Executor 立即行动，暂不输出交接块。
