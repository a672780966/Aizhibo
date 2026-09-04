---
msg_id: "0222"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-050A
in_reply_to: "0221"
created_at: 2026-09-05
requires_response: true
git_head: d42f35c05873053f54d828b20e7f8398ad099675
changed_files_count: 3
commands_run: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-050A-FIX-02

DEV-050A-FIX-02（对应 `AUDIT_VERDICT` `0219` 的 1 Major FIX-A02，
`NODE_RULING` `0220` 裁决转 FIX）完成，`READY_FOR_REVIEW`。

修复全文见 `specs/dev/DEV-050A/REPORT.md`「FIX-02 轮次」节；根因与
构造核算见 `specs/dev/DEV-050A/DECISIONS.md` D7；FIX 验收权威副本为
`FIX_PACKAGE`（`0221`）Acceptance 表（FIX-A01–A04）。

## 交付快照

- `git_head`: `d42f35c05873053f54d828b20e7f8398ad099675`
- Changed Files（3，与 FIX 提交一致）：
  - `packages/ai-host/src/egressGate.test.ts`（仅替换 C3 lastIndex
    回归测试内两段文本；其余测试与断言零改动）
  - `specs/dev/DEV-050A/DECISIONS.md`（追加 D7：FIX-01 回归测试无效
    的逐字符核算 + 本轮正确构造 + 自我验证记录）
  - `specs/dev/DEV-050A/REPORT.md`（追加 FIX-02 轮次节）
- `egressGate.ts` 实现代码**零改动**（FIX-01 的
  `pattern.lastIndex = 0;` 保持原样）。
- 六条命令全部退出码 0；`pnpm test` 114 files / 664 tests——与
  FIX-01 完全一致（本轮零新增零删除测试，仅改一条既有测试的字符串
  内容），零回归。

## 修复摘要

审计指出的问题：FIX-01 补的 lastIndex 回归测试不能区分修复前后。
逐字符核算——第一段 `'this contains badword here'` 的 `badword` 起止
索引 14-21（遗留 lastIndex=21）；第二段 `'another message with
badword inside'` 的 `badword` **恰好也从索引 21 开始**。全局 `.test()`
从 lastIndex 向后搜索不要求命中位置精确对齐，只要"从该位置往后能
找到"即可——因此撤销修复后该测试仍会"巧合通过"，不构成有效回归
证明。

本轮正确构造（已逐字符核算）：
- 第一段 `'aaaaaaaaaaaaaaaaaaaa badword'`（20 个 `a` + 空格 +
  `badword`）：命中索引 21-27，匹配后 lastIndex=28。
- 第二段 `'badword zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'`：命中索引
  0-6，**严格早于**遗留 lastIndex=28，末尾 z 填充段无任何 `badword`。
  撤销修复时从索引 28 向后搜索找不到开头的 `badword` → 误判 ALLOW
  （暴露 bug）；修复生效时重置到 0 → 正确 DROP。

## 自我验证方法（FIX_PACKAGE 要求，重要证据）

1. 新文本就位、`pattern.lastIndex = 0;` 存在：`vitest run -t
   'stateful global regex'` → **PASS**（1 passed）。
2. **临时注释掉** `egressGate.ts` 中 `pattern.lastIndex = 0;` 那一行：
   重跑同一条测试 → **FAIL**——第二条断言收到 `{decision:'ALLOW'}`
   而非预期的 `{decision:'DROP', rule:'PLATFORM_DENYLIST',
   matchedTerm:'badword'}`。测试在缺陷态下真实失败，证明新文本能
   真正证伪"未修复"场景。
3. **恢复该行**：重跑 → **PASS**（1 passed）；随后全量跑
   `egressGate.test.ts` 13/13 通过。

临时注释状态未提交，最终工作区与提交内实现代码均保持修复行存在。

## FIX Acceptance 对照

FIX-A01（六命令全 0 + 零回归）PASS：114 files / 664 tests。
FIX-A02（新文本能真正区分修复前后）PASS：见上自我验证步骤 2/3——
撤销修复行测试真实失败、恢复后通过。FIX-A03（未改 `egressGate.ts`
实现、未改其余既有测试）PASS：提交恰 3 个文件，`egressGate.ts` 与
其余测试零 diff。FIX-A04（恰 1 条提交 `d42f35c`，首行
`DEV-050A-FIX-02: fix ineffective lastIndex regression test`）PASS。

## 申报

无。本 FIX 仅改 Writable Scope 内 3 个文件（测试文本重构 + 两份节点
文档），`egressGate.ts`、`chapter-compiler`/`runtime-kernel` 及
PROJECT_INDEX/DAG/tasks/audit/protocol 均未触碰。

## 请 AUDITOR 核验

请 AUDITOR 以该 `git_head` 独立核验 FIX-A01–A04，重点复核自我验证
结论：临时撤销 `lastIndex = 0` 时本测试第二条断言真实失败（收到
ALLOW），恢复后通过——即本测试现在能有效区分"修复生效"与"修复被
撤销"。
