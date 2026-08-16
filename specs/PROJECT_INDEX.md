# PROJECT INDEX

本文件由 Claude Commander 独占维护。OpenCode 禁止修改。

## Product

- Product Name: AI 自驱动互动绘本直播系统
- Product Version: V4 (frozen)
- Dev Spec: Development Specification V1.0 — COMPLETE（第 0–72 节，3094 行）
- Spec 增补: `specs/audit/SPEC-ADDENDUM-001-DRAFT.md` — **DRAFT，待批准**
- Spec 源文件: `AI 自驱动互动绘本直播系统.md`（DEV-000 T002 归档为 `specs/baseline/DEV_SPEC_V1.0.md`）
- Repo Root: `c:\Users\admin\Music\Aizhibo`

## Current Milestone

M1 — Story Machine Complete

## Current Node

DEV-000 — Repository Foundation

## Current Status

`IN_PROGRESS` — OPENCODE 施工中，进度约在 T003 ~ T004 之间

已完成迹象：git init、`.gitignore`/`.npmrc`/`.nvmrc`、`package.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`、`node_modules`、`specs/baseline/DEV_SPEC_V1.0.md` 归档、根目录源文件已删除、节点四份文档已建。
未完成：无 commit、无 `tsconfig`、无 `packages/shared`、无 `eslint`/`prettier`/`vitest` 配置、无 CI。

⚠ **风险记录**：T002 在取源文件哈希**之前**已删除仓库内源文件，A07 目前依赖用户桌面副本作替代证据。
**在 DEV-000 验收 PASS 之前，请勿删除 `Desktop\项目\AI 自驱动互动绘本直播系统.md`。**

## Current Task Package

`specs/tasks/TASK-PACKAGE-DEV-000.md`
＋ 修订 `0002`（协议接入，A25）
＋ 修订 `0003`（INDEX 占位符 / `.claude` 裁定 / T002 证据链，A26）

## 通信协议

`specs/protocol/COMMS-PROTOCOL-V1.md` — ACTIVE

四方：`USER` / `COMMANDER` / `OPENCODE` / `AUDITOR`
账本：`specs/comms/LEDGER.md`（append-only，序号唯一来源）

**节点状态的唯一真相是 LEDGER。** 本文件与 LEDGER 冲突时以 LEDGER 为准。

验收分权：`AUDITOR` 独立认定事实，`COMMANDER` 依 VERDICT 裁决。
无 `verdict_ref` 的 `NODE_RULING: PASS` 无效。

## Completed Nodes

（无）

## In Progress Nodes

- DEV-000 — Repository Foundation

## Blocked Nodes

- **DEV-001 — Chapter Schema** — 阻塞于 `SPEC-ADDENDUM-001-DRAFT` 未批准（CR-001/002/003）

## Last Accepted Node

（无）

## Next Eligible Nodes

按 DAG Rev 2 执行序：

1. DEV-000（进行中）
2. DEV-001 — Chapter Schema（**BLOCKED**，需增补稿批准）
3. DEV-008 — Runtime Event Model（执行序已前移）

## Project-level Blockers

无。BLK-001 已 CLOSED（`specs/BLOCKERS.md`）。

## 审计与规范变更

| 文档 | 状态 |
|---|---|
| `specs/audit/SPEC-AUDIT-001.md` | 已完成，20 条 CR |
| `specs/audit/SPEC-ADDENDUM-001-DRAFT.md` | DRAFT，20 项决策待批（D01–D20） |
| `specs/audit/CR-RESOLUTIONS-001.md` | 已裁决 CR-010 / 012 / 017 / 018 |

### CR 处置状态

| 状态 | CR |
|---|---|
| ✅ 已批准 | CR-004 ~ CR-009（P1 架构）、CR-013 ~ CR-016（P3 削减） |
| ✅ 已裁决 | CR-010（采纳，新增 DEV-050A）、CR-012（采纳，契约上移 DEV-012）、CR-017（部分采纳）、CR-018（采纳但机制修正为块级预生成） |
| 📝 起草待批 | CR-001 / 002 / 003（+ CR-011 顺带） → ADDENDUM-001 的 D01–D20 |
| 📌 已记录为跨节点约束 | CR-019（getHealth 自落地起）、CR-020（Failover 决策权归 SAFETY） |

**全部 20 条 CR 中，仅 CR-001/002/003/011 仍待批准**，且它们是 DEV-001 的唯一阻塞源。

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

## Authority

只有 Claude Commander 可以决定：Current Node / Next Node / Node PASS / Node FAIL。
OpenCode 不得自行更改项目级推进状态，不得自行进入下一 DEV 节点。
