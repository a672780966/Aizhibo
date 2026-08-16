---
msg_id: "0007"
type: FIX_PACKAGE
from: COMMANDER
to: OPENCODE
cc: [AUDITOR]
node: DEV-000
in_reply_to: "0006"
created_at: 2026-08-16
requires_response: true
---

# FIX_PACKAGE — DEV-000-FIX-01

## 失败原因引用

`specs/dev/DEV-000/VERDICT.md` Findings F-01（BLOCKING，A07）。

F-02（`.claude/agents/project-auditor.md` 越权改写）已由 `NODE_RULING`（消息 `0006`）裁决为**接受并说明**，不要求本 FIX 施工，仅需知悉制度修复（见下方 Scope 变更）。

## 最小修复 Scope

**不重开** T001–T010 中任何已通过部分（A01–A06、A08–A26 均已独立验证 PASS）。仅新增一个 Task：

### FIX-T01 — A07 证据链补充

- **Objective**：为 `specs/baseline/DEV_SPEC_V1.0.md` 的完整性提供独立于本次删除操作链条之外的佐证，或如实记录该佐证不存在。
- **Allowed Files**：
  - `specs/dev/DEV-000/REPORT.md`（仅在「Scope Deviations」或新增证据小节追加记载，不得删除或修改已有记载，按协议 §2.3/消息 `0003` 修订 8 第 5 条执行）
  - `specs/dev/DEV-000/DECISIONS.md`（如需追加 D6 记录搜索过程与结论）
- **Requirements**：
  1. 搜索是否存在**早于**根目录源文件删除时刻、且**独立于**本次删除-归档操作链条之外的任何记录，可用于佐证归档内容与原始文件一致。例如：
     - 操作系统级文件历史/卷影副本（Windows Volume Shadow Copy / 文件资源管理器"以前的版本"）
     - 云同步服务的版本历史（OneDrive / 其它同步盘的文件版本记录），若源文件曾被同步
     - 本机此前会话中对该文件计算过的哈希值的任何留存记录（日志、终端历史、聊天记录导出等）
     - 任何第三方（非本次删除操作的执行者）持有的该文件副本及其哈希
  2. 若找到符合条件的独立佐证：记录其来源、获取方式、哈希值与所用命令，补入 REPORT.md 证据链，明确说明其"独立于删除操作链条"的依据。
  3. 若未找到：如实记录"已搜索以下渠道 [列出]，均未能找到独立于本次操作链条之外的佐证"，不得编造、不得用桌面副本重复佐证（消息 `0003` 修订 8 第 4 条已明确：同源副本重新比对不产生新信息）。
  4. **不得**删除或替换现有归档文件 `specs/baseline/DEV_SPEC_V1.0.md`，**不得**尝试通过任何方式"重新生成"或"修复"源文件——它已被删除是既定事实，本 Task 只补充证据，不改变归档内容。
  5. 完成后在 REPORT.md 中更新 A07 一行的证据链指针，判定列继续保持"见 AUDITOR"（不得自判）。
- **Acceptance（FIX-A01）**：REPORT.md 的 A07 证据链小节包含：搜索的渠道清单、每个渠道的结论、若找到独立佐证则含来源/哈希/命令，若未找到则有明确声明。`AUDITOR` 将依据该记录重新裁定 A07；本 FIX 不预设裁定结果。

## Scope 变更（制度修复，非本次施工任务）

`Task Package` 第 3 节 Read-only Scope 追加：

```
.claude/**    （Commander / AUDITOR 工具链目录，OPENCODE 不得写入；
                构建/格式化/清理类命令的作用范围必须排除本目录）
```

`OPENCODE` 应确认 `.gitignore` / `.prettierignore` 已排除 `.claude/`（据 `DECISIONS.md` D4 现状已排除，无需改动），仅需知悉此项已正式写入 Scope 表，无需专门行动。

## 回归测试

FIX-T01 不改动任何源码、配置或构建产物，无需重跑 `pnpm typecheck/lint/build/test`。若 OPENCODE 判断有必要（例如担心误触其它文件），可自行重跑五条命令留痕，但非本 FIX 的强制 Acceptance 项。

## Acceptance

见上方 FIX-A01。原 A01–A06、A08–A26 维持已通过判定，不重新验收。

## Exit Procedure

1. 完成 FIX-T01
2. 更新 `specs/dev/DEV-000/INDEX.md`：Task Order 追加 `FIX-T01`，状态改回 `READY_FOR_REVIEW`
3. 在 `specs/comms/LEDGER.md` 追加一行取得下一个可用序号，创建 `NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-000.md`（第二轮），信封 `git_head` 为本次 FIX 提交后的 sha（若产生新 commit；若未提交，如实注明"未提交，工作区改动"并列出改动文件）
4. STOP

`READY_FOR_REVIEW` 之后不得再改动任何文件，直到收到下一轮 `FIX_PACKAGE` 或 `AUDIT_QUERY`。
