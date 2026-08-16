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

---

## 当前待处理

| 接收方 | 待处理序号 |
|---|---|
| OPENCODE | —（0001, 0002, 0003 已处理，T010 进行中） |
| AUDITOR | —（cc 0002 / 0003，无需响应） |
| COMMANDER | — |
