# COMMS LEDGER

**Append-only。序号的唯一来源。**

协议：`specs/protocol/COMMS-PROTOCOL-V1.md`

## 写入纪律

1. 先在本表追加一行取得序号，再创建消息文件
2. 已有行**不得修改或删除**，唯一例外：将 `Status` 改为 `SUPERSEDED`（仅在发出对应 `CORRECTION` 时）
3. 序号冲突时后写入者取下一个可用号，不得覆盖
4. 未登记的消息不存在
5. 本表与 `PROJECT_INDEX.md` 不一致时，**以本表为准**

## Status 取值

`OPEN` 待接收方处理 ｜ `CLOSED` 已处理 ｜ `SUPERSEDED` 被 CORRECTION 取代

---

| Seq | Type | From | To | Node | ReplyTo | Status | Subject |
|-----|------|------|----|------|---------|--------|---------|
| 0001 | TASK_PACKAGE | COMMANDER | OPENCODE | DEV-000 | — | CLOSED | Repository Foundation（追溯登记） |
| 0002 | ACCEPTANCE_AMENDMENT | COMMANDER | OPENCODE | DEV-000 | 0001 | CLOSED | 协议接入：Scope 追加 + Exit 第 8 步 + A25 |
| 0003 | ACCEPTANCE_AMENDMENT | COMMANDER | OPENCODE | DEV-000 | 0002 | CLOSED | INDEX 占位符修正 + .claude 裁定 + T002 证据链 + A26 |
| 0004 | NODE_REPORT | OPENCODE | AUDITOR | DEV-000 | 0001 | CLOSED | DEV-000 施工完成，READY_FOR_REVIEW |
| 0005 | AUDIT_VERDICT | AUDITOR | COMMANDER | DEV-000 | 0004 | CLOSED | AUDIT_FAIL：F-01 BLOCKING（A07）+ F-02 BLOCKING（.claude 越权改写） |
| 0006 | NODE_RULING | COMMANDER | ALL | DEV-000 | 0005 | CLOSED | ruling: FAIL；F-01 转 FIX，F-02 接受并说明 + Scope 制度修复 |
| 0007 | FIX_PACKAGE | COMMANDER | OPENCODE | DEV-000 | 0006 | CLOSED | DEV-000-FIX-01：A07 证据链补充 |
| 0008 | NODE_REPORT | OPENCODE | AUDITOR | DEV-000 | 0007 | CLOSED | FIX-01 完成（独立佐证已找到），第二轮 READY_FOR_REVIEW |
| 0009 | AUDIT_VERDICT | AUDITOR | COMMANDER | DEV-000 | 0008 | CLOSED | 第二轮复核 PASS：A07 VERIFIED（独立复核会话转录佐证） |
| 0010 | NODE_RULING | COMMANDER | ALL | DEV-000 | 0009 | CLOSED | ruling: PASS；DEV-000 转 DONE，接口冻结 |
| 0011 | TASK_PACKAGE | COMMANDER | OPENCODE | DEV-001 | — | CLOSED | Chapter Schema |
| 0012 | NODE_REPORT | OPENCODE | AUDITOR | DEV-001 | 0011 | CLOSED | DEV-001 施工完成，READY_FOR_REVIEW |
| 0013 | AUDIT_VERDICT | AUDITOR | COMMANDER | DEV-001 | 0012 | CLOSED | AUDIT_FAIL：F-01/F-02 BLOCKING（INDEX.md 未提交完成态）+ F-03 BLOCKING（A28 提交边界结构性问题，接受并说明） |
| 0014 | NODE_RULING | COMMANDER | ALL | DEV-001 | 0013 | CLOSED | ruling: FAIL；F-01/F-02 转 FIX，F-03 接受并说明 + 制度修复（Commander 后续独立提交治理文件） |
| 0015 | FIX_PACKAGE | COMMANDER | OPENCODE | DEV-001 | 0014 | CLOSED | DEV-001-FIX-01：提交完成态 INDEX.md，重新对齐 git_head |
| 0016 | NODE_REPORT | OPENCODE | AUDITOR | DEV-001 | 0015 | CLOSED | FIX-01 完成（INDEX.md 完成态已提交），第二轮 READY_FOR_REVIEW |
| 0017 | AUDIT_VERDICT | AUDITOR | COMMANDER | DEV-001 | 0016 | CLOSED | 第二轮复核 PASS：A25/A26/A27 VERIFIED |
| 0018 | NODE_RULING | COMMANDER | ALL | DEV-001 | 0017 | CLOSED | ruling: PASS；DEV-001 转 DONE，接口冻结 |

---

## 当前待处理

| 接收方 | 待处理序号 |
|---|---|
| OPENCODE | — |
| AUDITOR | — |
| COMMANDER | — |
