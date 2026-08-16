# PROJECT INDEX

本文件由 Claude Commander 独占维护。OpenCode 禁止修改。

## Product

- Product Name: AI 自驱动互动绘本直播系统
- Product Version: V4 (frozen)
- Dev Spec: Development Specification V1.0 — COMPLETE（第 0–72 节，3094 行）
- Spec 增补: `specs/audit/SPEC-ADDENDUM-001.md`（FROZEN）＋ `specs/audit/SPEC-ADDENDUM-002.md`（FROZEN——补齐 `DangerState`/`HostPolicy`/`ResultDictionary`，更正 WorldState 归属）
- Spec 源文件: `AI 自驱动互动绘本直播系统.md`（DEV-000 T002 归档为 `specs/baseline/DEV_SPEC_V1.0.md`）
- Repo Root: `c:\Users\admin\Music\Aizhibo`

## Current Milestone

M1 — Story Machine Complete

## Current Node

DEV-008 — Runtime Event Model（待下发；DEV-001 已 DONE）

## Current Status

DEV-000 `DONE`（接口冻结）。DEV-001 `DONE`（接口冻结）：`FIX_PACKAGE DEV-001-FIX-01`（消息 `0015`）已由 OpenCode 完成，`AUDITOR` 第二轮独立复核 A25/A26/A27 = VERIFIED（`specs/dev/DEV-001/VERDICT.md`「第二轮」章节），`NODE_RULING: PASS`（消息 `0018`，`verdict_ref: "0017"`）。

制度修复待执行：Commander 需在下发 DEV-008 Task Package 前，先独立提交当前工作区中的治理文件改动（见 Commander 决策记录）。

## Current Task Package

DEV-000、DEV-001 均已结案。DEV-008 Task Package 待 Commander 生成（先完成治理文件独立提交）。

## 通信协议

`specs/protocol/COMMS-PROTOCOL-V1.md` — ACTIVE

四方：`USER` / `COMMANDER` / `OPENCODE` / `AUDITOR`
账本：`specs/comms/LEDGER.md`（append-only，序号唯一来源）

**节点状态的唯一真相是 LEDGER。** 本文件与 LEDGER 冲突时以 LEDGER 为准。

验收分权：`AUDITOR` 独立认定事实，`COMMANDER` 依 VERDICT 裁决。
无 `verdict_ref` 的 `NODE_RULING: PASS` 无效。

## Completed Nodes

- DEV-000 — Repository Foundation（DONE，`verdict_ref: "0009"`，`git_head` `fac7e3e7ea4eeaa802985fab443da74bac9384fd`）
- DEV-001 — Chapter Schema（DONE，`verdict_ref: "0017"`，`git_head` `cbcbd8dc82910f542dee0bf81352d26241add06f`）

## In Progress Nodes

（无）

## Blocked Nodes

无。

## Last Accepted Node

DEV-001 — Chapter Schema（2026-08-16）

## Next Eligible Nodes

按 DAG Rev 2 执行序：

1. **DEV-008 — Runtime Event Model**（TODO，Task Package 待 Commander 生成）
2. DEV-002 — Chapter Compiler Core（待 DEV-008/DEV-001 后续排期）

## Project-level Blockers

无。BLK-001 已 CLOSED（`specs/BLOCKERS.md`）。

## 审计与规范变更

| 文档 | 状态 |
|---|---|
| `specs/audit/SPEC-AUDIT-001.md` | 已完成，20 条 CR |
| `specs/audit/SPEC-ADDENDUM-001.md` | **FROZEN** — D01–D20 定稿 |
| `specs/audit/SPEC-ADDENDUM-002.md` | **FROZEN** — `DangerState`/`HostPolicy`/`ResultDictionary` 补齐 + WorldState 归属更正 |
| `specs/audit/CR-RESOLUTIONS-001.md` | 已裁决 CR-010 / 012 / 017 / 018 |

### CR 处置状态

**20 条全部结案，规范层无待批项。**

| 状态 | CR |
|---|---|
| ✅ 已批准 | CR-004 ~ CR-009（P1 架构）、CR-013 ~ CR-016（P3 削减） |
| ✅ 已裁决 | CR-010、CR-012、CR-017、CR-018 |
| ✅ 已冻结 | CR-001 / 002 / 003 / 011 → ADDENDUM-001 |
| 📌 跨节点约束 | CR-019（getHealth 自落地起）、CR-020（Failover 决策权归 SAFETY） |

### ADDENDUM-001 的五项 USER 产品裁决

| # | 定稿 |
|---|---|
| D06 | 角色站位 **固定五档 slot** |
| D08 | Boss **复用普通 Interaction，零新增运行时模块** |
| D10 | DOWNED / SPECTATOR **不能投票，能聊天** |
| D11 | DOWNED 默认 **`AUTO_SPEND_LIFE`**（3 HP + 2 复起 = 5 次耐受） |
| D13 | Recovery 主力触发器 **`RESULT_QUALITY`** |

## Commander 决策记录

| 日期 | 决策 |
|---|---|
| 2026-08-16 | 仓库根直接采用 `c:\Users\admin\Music\Aizhibo`，不嵌套 `interactive-story/` |
| 2026-08-16 | 开 BLK-001（规范截断）→ 收到完整规范后关闭 |
| 2026-08-16 | 作废反推 DAG，替换为第 65/66/68 节官方 DAG（Rev 1） |
| 2026-08-16 | 作废 TASK-PACKAGE-DEV-000 v1（误将 CI 与 Shared Types 列为禁止），发布 v2 |
| 2026-08-16 | 完成 SPEC-AUDIT-001；用户批准 P1 全部 + P3 全部 + 授权起草增补稿 |
| 2026-08-16 | DAG 升级至 Rev 2：DEV-008 前移、DEV-007 后移并改为 headless driver、DEV-033 上移 M1、新增 DEV-002A、PASS 归属重划、Region 重建模、包数 19→17 |
| 2026-08-16 | DEV-001 置为 BLOCKED，待增补稿批准 |
| 2026-08-16 | 建立 COMMS-PROTOCOL-V1：四方文件信道 + append-only LEDGER + 强审核员模式（事实认定不可推翻）；DEV-000 追溯接入 |
| 2026-08-16 | 裁决 CR-010/012/017/018；新增 DEV-050A Host Egress Gate；修正 DEV-002A 与 DEV-003 的执行序矛盾 |
| 2026-08-16 | 发出修订 0003（INDEX 占位符 / `.claude` 裁定 / T002 证据链 / A26）；记录 T002 先删后验的不可逆操作风险 |
| 2026-08-16 | USER 裁决 D06 / D08 / D10 / D11 / D13；其余 15 项按已冻结原则推导定稿；**ADDENDUM-001 冻结，DEV-001 规范阻塞解除** |
| 2026-08-16 | 收到 DEV-000 `NODE_REPORT`（消息 `0004`），转交 `AUDITOR` 独立审计 |
| 2026-08-16 | `AUDITOR` 出具 `AUDIT_VERDICT`（消息 `0005`）：`AUDIT_FAIL`，F-01 BLOCKING（A07）+ F-02 BLOCKING（`.claude` 越权改写）+ F-03 DEVIATION + 3 项 OBSERVATION |
| 2026-08-16 | 发出 `NODE_RULING: FAIL`（消息 `0006`）：F-01 转 FIX；F-02 裁决为接受并说明（原字节不可逆丢失，补救无意义），`.claude/**` 正式纳入 Read-only Scope；F-03 与 3 项 OBSERVATION 转 Future Consideration，不追溯要求修复 |
| 2026-08-16 | 发出 `FIX_PACKAGE DEV-000-FIX-01`（消息 `0007`）：要求补充 A07 独立第三方佐证，若找不到则如实记录缺口；不重开已通过的 A01–A06/A08–A26 |
| 2026-08-16 | 收到 FIX-01 第二轮 `NODE_REPORT`（消息 `0008`，`git_head` `fac7e3e7...`）：OpenCode 找到独立佐证（仓库外会话转录 `a5bfaf5e-*.jsonl` 中早于删除时刻的 Read 记录），转交 `AUDITOR` 复核 |
| 2026-08-16 | `AUDITOR` 第二轮 `AUDIT_VERDICT`（消息 `0009`）：PASS。独立定位并阅读该会话转录、自行重建正文、独立计算哈希，与归档文件逐字节一致；独立性与时间顺序核实通过。A07 = VERIFIED |
| 2026-08-16 | 发出 `NODE_RULING: PASS`（消息 `0010`，`verdict_ref: "0009"`）：**DEV-000 转 DONE，接口冻结**；同步更新本文件与 `DAG.md` |
| 2026-08-16 | 起草 `SPEC-ADDENDUM-002`（FROZEN）：补齐 `DangerState`/`HostPolicy`/`ResultDictionary` 三处此前被引用但未定义的类型；更正 DEV-000 中「WorldState 属 DEV-004」的错误表述——正确归属为 DEV-001（静态形状）+ DEV-004（求值逻辑） |
| 2026-08-16 | 发出 `TASK_PACKAGE DEV-001`（消息 `0011`）：`packages/chapter-schema`，T001–T020，A01–A28；DEV-001 转 `IN_PROGRESS` |
| 2026-08-16 | 收到 DEV-001 `NODE_REPORT`（消息 `0012`，`git_head` `363834e...`），转交 `AUDITOR` 独立审计 |
| 2026-08-16 | `AUDITOR` 出具 `AUDIT_VERDICT`（消息 `0013`）：`AUDIT_FAIL`。F-01/F-02 BLOCKING：`git_head` 冻结的 `INDEX.md` 仍是 T001 骨架版本，完成态从未提交；F-03 BLOCKING：A28 无法用一次干净 diff 证明只读路径未被修改（自仓库首个提交起即存在的结构性问题，未发现篡改语义实证） |
| 2026-08-16 | 发出 `NODE_RULING: FAIL`（消息 `0014`）：F-01/F-02 转 FIX；F-03 裁决为接受并说明，制度修复为 Commander 后续下发 Task Package 前先行独立提交自己的治理文件改动，避免与 OpenCode 的 `git add -A` 混入同一提交 |
| 2026-08-16 | 发出 `FIX_PACKAGE DEV-001-FIX-01`（消息 `0015`）：要求 OpenCode 以新提交（不得 amend）固化 `INDEX.md` 完成态；不重开已通过的 A01–A24 |
| 2026-08-16 | 收到 FIX-01 第二轮 `NODE_REPORT`（消息 `0016`，`git_head` `cbcbd8d...`）：OpenCode 以独立新提交（非 amend）固化完成态 INDEX.md，转交 `AUDITOR` 复核 |
| 2026-08-16 | `AUDITOR` 第二轮 `AUDIT_VERDICT`（消息 `0017`）：PASS。独立核实新提交非 amend、仅改动 INDEX.md 一个文件、未触碰任何已通过源码；A25/A26/A27 = VERIFIED |
| 2026-08-16 | 发出 `NODE_RULING: PASS`（消息 `0018`，`verdict_ref: "0017"`）：**DEV-001 转 DONE，接口冻结**；同步更新本文件与 `DAG.md`。制度修复承诺生效：下发 DEV-008 前先独立提交治理文件 |

## Authority

只有 Claude Commander 可以决定：Current Node / Next Node / Node PASS / Node FAIL。
OpenCode 不得自行更改项目级推进状态，不得自行进入下一 DEV 节点。
