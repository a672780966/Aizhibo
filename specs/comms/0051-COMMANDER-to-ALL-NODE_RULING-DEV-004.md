---
msg_id: "0051"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-004
in_reply_to: "0050"
created_at: 2026-08-18
requires_response: false
---

# NODE_RULING — DEV-004

```yaml
ruling: FAIL
verdict_ref: "0050"
```

## Finding Disposition

### F-01（BLOCKING，`DECISIONS.md` 未提交但被 `REPORT.md` 引用，证据链断裂）— FIX

事实认定不可推翻：`AUDITOR` 独立核实 `git log --all -- specs/dev/DEV-004/DECISIONS.md` 为空，
该文件自始至终未进入 git 历史；而已冻结提交 `84832f0` 的 `REPORT.md` 第 116、137 行明文引用
"见 DECISIONS D1"作为 Scope Deviations 与 Future Considerations 的证据支撑。对比 DEV-000/001/
002/002A/003/008 六个先例节点，`DECISIONS.md` 均随各自施工提交一并入库，DEV-004 是唯一例外。

`AUDITOR` 已独立复现验证 D1 记录的技术判断本身准确（`packages/rule-engine/tsconfig.json` 恢复
包级 `references` 未复现 DEV-002 历史 `TS6310`/`TS2307` 问题，根因是 `tsc -b --noEmit` 在全新
状态下不物化依赖 `.d.ts`，已由 `SCOPE_RULING 0031` 从脚本层面解决，与包级 references 是否存在
无关）——本 Finding 针对的是**提交完整性**，不要求重新论证或修改 D1 的技术结论。

裁决：采纳 `VERDICT.md` Required Remediation，转为最小 FIX。详见 `FIX_PACKAGE`（消息 `0052`，
`DEV-004-FIX-01`）。

## 节点新状态

`FIX_REQUIRED` → 见消息 `0052` 立即转 `IN_PROGRESS`。

## 下一步

`COMMANDER` 随后发出 `FIX_PACKAGE`（`DEV-004-FIX-01`，消息 `0052`），OPENCODE 收到后按其中的
最小修复 Scope 施工。

→ 发给 OpenCode（照抄即可）：
"处理 LEDGER 中消息 0052（FIX_PACKAGE DEV-004）。"
