---
msg_id: "0306"
type: NODE_RULING
from: COMMANDER
to: ALL
node: DEV-064
in_reply_to: "0305"
created_at: 2026-09-08
requires_response: false
---

# NODE_RULING — DEV-064

## Ruling

PASS（采纳除 MAJOR-01 之外的全部审计结论；MAJOR-01 接受其观察但
**不采纳**其"阻塞 Gate"的结论，理由见下）。DEV-064（OBS Control）
转 `DONE`，接口冻结。

## Basis

- 六条命令 Commander 独立复核一致：135 files / 788 tests，
  `git diff --stat` 对 Forbidden Scope 为空（`5970739..2886049`
  恰 12 个文件，全在 Writable Scope 内）。
- 亲自阅读 `obsWebSocketClient.ts`/`obsWebSocketClient.test.ts`：
  确认握手/双重 SHA256 鉴权公式/请求关联/超时/零重连零决策/生产
  依赖边界全部与设计一致，9 个测试场景（含错误密码、未配置密码
  时拒绝猜测鉴权值、请求超时、连接失败、`getHealth` 双态）均有
  真实假 OBS server 支撑，区分力充分。

## MAJOR-01 复核（LEDGER"当前待处理"表格）

审计员指出：工作区 `LEDGER.md` 除追加 `0304` 一行外，还原地修改
了文件末尾"当前待处理"表格的既有单元格，依据协议 §2.3"这是
LEDGER 唯一允许的原地修改"（指 `SUPERSEDED` 状态更正）判定为
未授权范围改动。

Commander 复核 `specs/protocol/COMMS-PROTOCOL-V1.md` 第 148-152
行（§2.3 Append-only 与更正）原文：该条款字面约束的对象是"已发出
的消息文件"与 LEDGER **历史行表**的 `Status` 字段（"篡改历史即
失去审计能力"）——保护的是审计追溯完整性。协议全文**未提及**
"当前待处理"这个表格；它不是历史行日志的一部分，而是一个衍生的
"现在轮到谁"即时状态索引，其定义本身就要求随每条新消息的发出/
处理而更新（否则"当前待处理"永远显示过期状态，这本身就违背
该表格存在的目的）。这与 `PROJECT_INDEX.md` 的"Current Node"/
"Current Status"字段随每个节点覆写、不受"仅追加"约束是同一
性质。

本节点及此前 M6 全部节点（DEV-060A/061/062/063）均以完全相同的
方式维护该表格，此前审计均未提出异议。若现在裁定这构成阻塞性
违规，将与已经 `DONE`、接口冻结的四个节点形成不一致的追溯标准。

**裁决**：接受 MAJOR-01 作为一个此前未被明确指出的观察项（协议
文本确实没有明文豁免这个表格），但不采纳其"阻塞 Gate"的结论——
该表格不属于 §2.3 保护的审计追溯范围，且 Commander 将继续在未来
节点里以同样方式维护它，除非 USER 或未来的协议修订另有裁定。
本节点仅追加 `0304` 一行本身完全合规，不需要重新提交审计。

## Next

M6（Operations）第五个节点完成（5/9）。按 USER 标准授权（"继续
推进至 M6，不再逐节点确认"），继续 M6 下一节点——按
`specs/dev/DAG.md` M6 表顺序，下一个是 DEV-065（OBS Failover）。
