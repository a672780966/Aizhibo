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

DEV-002A — Hidden Information Validator（PASS 6）（待下发 TASK_PACKAGE）

## Current Status

DEV-000/DEV-001/DEV-008/DEV-002/DEV-003 均 `DONE`（接口冻结）。DEV-003 的 PASS3/5 已冻结，
`Commander` 尚未下发 `TASK-PACKAGE-DEV-002A`。

## Current Task Package

（待下发。依赖 DEV-003 的可达节点集合 + 可达状态集合，`Commander` 起草中。）

DEV-000/DEV-001/DEV-008/DEV-002/DEV-003 历史记录：`specs/tasks/TASK-PACKAGE-DEV-000.md`（+ FIX-01）、`specs/tasks/TASK-PACKAGE-DEV-001.md`（+ FIX-01）、`specs/tasks/TASK-PACKAGE-DEV-008.md`、`specs/tasks/TASK-PACKAGE-DEV-002.md`（+ FIX-01）、`specs/tasks/TASK-PACKAGE-DEV-003.md`（+ ACCEPTANCE_AMENDMENT 0036 + SCOPE_RULING 0038）

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
- DEV-008 — Runtime Event Model（DONE，`verdict_ref: "0021"`，`git_head` `18d00446f628da965bdfd4f18d1f2ef447d8e32d`）
- DEV-002 — Chapter Compiler Core（PASS 1 + 2）（DONE，`verdict_ref: "0033"`，`git_head` `4812478ae657414984f9d6c4d5e56930583a662e`）
- DEV-003 — Story Graph Analyzer（PASS 3 + 5）（DONE，`verdict_ref: "0040"`，`git_head` `be43f75f80702edcf63c5ad206766f6a98d269ca`）

## In Progress Nodes

无。

## Blocked Nodes

无。

## Last Accepted Node

DEV-003 — Story Graph Analyzer（2026-08-18）

## Next Eligible Nodes

按 DAG Rev 2 执行序：

1. DEV-002A — Hidden Information Validator（待下发 TASK_PACKAGE；依赖 DEV-003 的可达节点集合 + 可达状态集合，已满足）

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
| 2026-08-16 | 执行制度修复：独立提交 `a5b0cd8`（治理文件，含消息 `0012`–`0018`、两份 VERDICT、PROJECT_INDEX/DAG/协议更新），提交后工作区干净 |
| 2026-08-16 | 起草并发出 `TASK_PACKAGE DEV-008`（消息 `0019`）：`packages/runtime-kernel`（新包位置裁定，见 Task Package 第 1 节），`RuntimeEvent` 信封 + Dice 事件族，T001–T006，A01–A23；DEV-008 转 `IN_PROGRESS` |
| 2026-08-17 | 收到 DEV-008 `NODE_REPORT`（消息 `0020`，`git_head` `18d0044...`），转交 `AUDITOR` 独立审计 |
| 2026-08-17 | `AUDITOR` `AUDIT_VERDICT`（消息 `0021`）：PASS，Blocker 0 / Major 0 / Minor 0；A01–A23 全部 VERIFIED，OpenCode 主动要求重点核验的 6 项（A10/A12/A15/A21/A23/D3）均独立复核通过 |
| 2026-08-17 | 发出 `NODE_RULING: PASS`（消息 `0022`，`verdict_ref: "0021"`）：**DEV-008 转 DONE，接口冻结**；同步更新本文件与 `DAG.md` |
| 2026-08-17 | 独立提交 `6eb5d7e`（治理文件：审核员中文输出 + 交接行格式协议更新），提交后工作区干净 |
| 2026-08-17 | 起草并发出 `TASK_PACKAGE DEV-002`（消息 `0023`）：`packages/chapter-compiler`，PASS 1（Schema）+ PASS 2（Reference），T001–T013，A01–A27；DEV-002 转 `IN_PROGRESS`。明确 CharacterPlacement.characterId → NPCDefinition.id 的引用归属（此前遗漏，非产品分叉，随 Task Package 一并澄清，不走 ADDENDUM 流程） |
| 2026-08-17 | 收到 DEV-002 `NODE_REPORT`（消息 `0024`，`git_head` `459ea16...`），转交 `AUDITOR` 独立审计。期间 OpenCode 发出又撤回 `EXECUTOR_QUERY 0025`（`CORRECTION 0026`，`BLK-001`），未经 `SCOPE_RULING` 自行结案 |
| 2026-08-17 | `AUDITOR` `AUDIT_VERDICT`（消息 `0027`）：`AUDIT_FAIL`。F-01/F-02 BLOCKING：独立复现确认 A02 在 T013 规定顺序下于全新工作区失败（`TS6310`），且 `0025`→`0026` 系未经裁决的流程越权自裁；`REPORT.md` 呈现误导。F-03 DEVIATION：治理文件第三次被卷入提交（与 DEV-001/DEV-008 同源） |
| 2026-08-17 | 发出 `NODE_RULING: FAIL`（消息 `0028`）：F-01 转 FIX，裁决采纳方案 A（移除 `chapter-compiler` 包级 tsconfig `references`，仅靠根 solution 级 references 保证顺序）；F-02 随 FIX 一并修正；F-03 接受并说明，制度修复升级为"发 TASK_PACKAGE 前若已改治理文件须同一动作内先提交" |
| 2026-08-17 | 发出 `FIX_PACKAGE DEV-002-FIX-01`（消息 `0029`）：移除包级 references，清空构建产物后按规定顺序重跑六条命令，修正 `REPORT.md`/`BLOCKERS.md` 记录；不重开已通过的业务代码与测试 |
| 2026-08-17 | 收到 `EXECUTOR_QUERY`（消息 `0030`，`blocking: true`，`BLK-002`）：OpenCode 正确升级而非自行处置——方案 A（纯移除 references）独立复现后在全新状态+严格顺序下 `pnpm typecheck` 仍失败（`TS2307`），根因是 `tsc -b --noEmit` 从不发射依赖产物，与 references 存在与否无关 |
| 2026-08-17 | `Commander` 独立复现确认 `0030` 的技术判断成立；因裁决触及"`pnpm typecheck` 实际检查什么"这一验收机制本身，且 `ACCEPTANCE_AMENDMENT` 通道已关闭，超出 `Commander` 自主裁决权限——**上报真实 `USER`**，`USER` 批准采纳方案 A'（根 `package.json` 的 `typecheck` 脚本改为 `tsc -b && tsc -b --noEmit`，按 `CHANGE_REQUEST` 性质留痕）。`Commander` 直接改动该文件（超出任何 Task Package 的 OPENCODE Writable Scope）并独立验证六条命令在新脚本下于严格顺序中全部退出码 0。顺带将 `.codebase-memory/`（工具本地索引缓存，污染 `format:check`）比照 `.claude/**` 先例纳入 `.gitignore`。发出 `SCOPE_RULING`（消息 `0031`），指示 OpenCode 完成 FIX-T01 剩余验证 |
| 2026-08-17 | 收到 DEV-002 FIX-01 第二轮 `NODE_REPORT`（消息 `0032`，`git_head` `4812478...`）：新脚本下清空构建产物后严格顺序六条命令全部退出码 0，转交 `AUDITOR` 独立复核 |
| 2026-08-18 | `AUDITOR` `AUDIT_VERDICT`（消息 `0033`）：**PASS**。FIX-A01/A02 VERIFIED，原 A01/A03–A27 无回归，Scope/Regression/Overengineering Audit 均 PASS，0 BLOCKING（Info: 1，LEDGER 落盘顺序观察，不影响判定） |
| 2026-08-18 | 发出 `NODE_RULING: PASS`（消息 `0034`，`verdict_ref: "0033"`）：**DEV-002 转 DONE，接口冻结**；同步更新本文件与 `DAG.md` |
| 2026-08-18 | 修正误标提交（本地未分享，直接 amend）：治理提交实际内容为协议更正，非重复的 DEV-002 裁决记录 |
| 2026-08-18 | 更正协议：系统通知 `project-auditor` 现已出现在 Agent 可用类型列表，推翻 2026-08-16 的"不可用"结论；恢复为优先直调，报错才降级至 `general-purpose` 注入路径。可用性按会话验证，不假设固定 |
| 2026-08-18 | 起草并发出 `TASK_PACKAGE DEV-003`（消息 `0035`）：`packages/chapter-compiler` 增量扩展 PASS3（图可达性/死路/环检测）+ PASS5（状态可达性/可满足性），T001–T009，A01–A24；DEV-002 的 PASS1/2 源文件划为 Read-only，`types.ts`/`compile.ts`/`compile.test.ts`/`index.ts` 仅允许追加式修改；DEV-003 转 `IN_PROGRESS` |
| 2026-08-18 | 施工约 2h45m 无新文件产出，排查后发现 Task Package 存在编号笔误（T002 验收误引用不存在的"T009"fixture）且未明确"单元测试可用手写最小对象、不必走完整 fixture"，推测执行方因此陷入自建 fixture 生成脚本的困境（`dev003-fixtures.mjs`，未落盘）。发出 `ACCEPTANCE_AMENDMENT`（消息 `0036`）：更正编号；明确 T002–T006 测试免 fixture；T008 fixture 改为复制 `valid-minimal` 做单点编辑，不写生成脚本，并附逐条最小编辑指引 |
| 2026-08-18 | 收到 `EXECUTOR_QUERY`（消息 `0037`，`blocking: true`，`BLK-003`）：PASS3 接入后 `valid-minimal` 的 `boss-tyrant` 经独立复现确认不可达（先于 DEV-003 存在的 fixture 图设计缺陷，PASS1/2 未曾检出），导致 T007 #3 的 `passed` 判定规则与 DEV-002 遗留断言 `passed: true` 互斥 |
| 2026-08-18 | 核实 `story.graph.json` 已注册 `boss-tyrant`、现有全部 `valid-minimal` 相关测试断言均不依赖 `guards` 具体内容后，发出 `SCOPE_RULING`（消息 `0038`）：采纳方案 A，解除 `scene-start.json` 单文件只读限制，授权追加一条指向 `boss-tyrant` 的 guard 边以修复 fixture 自身缺陷；不触及 Acceptance 语义，判定属 `Commander` 自主裁决范围（协议 §7.3），未上报 `USER` |
| 2026-08-18 | 收到 DEV-003 `NODE_REPORT`（消息 `0039`，`git_head` `be43f75...`）：六条命令严格顺序全部退出码 0，219/219，转交 `AUDITOR` 独立审计 |
| 2026-08-18 | `AUDITOR` `AUDIT_VERDICT`（消息 `0040`）：**PASS**。T002–T009/A01–A24 全部 VERIFIED 或 PASS，0 BLOCKING（Minor: 1，MINOR-01：A08 文字与 T007 #3 字面冲突，接受并说明；Info: 2）。独立核对 `SCOPE_RULING 0038` 授权范围与实际 diff 逐字一致 |
| 2026-08-18 | 发出 `NODE_RULING: PASS`（消息 `0041`，`verdict_ref: "0040"`）：**DEV-003 转 DONE，接口冻结**；同步更新本文件与 `DAG.md`；下一可下发节点为 DEV-002A |

## Authority

只有 Claude Commander 可以决定：Current Node / Next Node / Node PASS / Node FAIL。
OpenCode 不得自行更改项目级推进状态，不得自行进入下一 DEV 节点。
