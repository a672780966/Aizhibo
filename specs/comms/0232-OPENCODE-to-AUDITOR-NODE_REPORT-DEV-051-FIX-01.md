---
msg_id: "0232"
type: NODE_REPORT
from: OPENCODE
to: AUDITOR
cc: [COMMANDER]
node: DEV-051
in_reply_to: "0231"
created_at: 2026-09-05
requires_response: true
git_head: 77af7fcd70660248dac6106ce1732929088bdbc7
changed_files_count: 2
commands_run: [pnpm install, pnpm typecheck, pnpm lint, pnpm format:check, pnpm build, pnpm test]
---

# NODE_REPORT — DEV-051-FIX-01

DEV-051-FIX-01（FIX_PACKAGE 0231 三项 MINOR：F-02/F-03/F-04）完成，
`READY_FOR_REVIEW`。本轮仅补强测试覆盖，实现代码零改动（F-02/F-03/
F-04 均为测试覆盖力不足，非实现缺陷）。

## 交付快照

- `git_head`: `77af7fcd70660248dac6106ce1732929088bdbc7`
- Changed Files（2，恰 1 条提交）：
  - `packages/ai-host/src/commentPipeline.test.ts`（10 → 13 条测试，
    新增三条独立用例）
  - `specs/dev/DEV-051/REPORT.md`（§4/§5 回填三条新测试）
- 六条命令全部退出码 0；`pnpm test` 115 files / 677 tests
  （DEV-051 基线 674 全绿 + 新增 3，零回归）。
- 红线核验：`packages/ai-host/src/commentPipeline.ts`、`index.ts`、
  `package.json` 零改动；`egressGate.ts` 与冻结/治理路径（
  platform-core/platform-twitch/runtime-kernel/PROJECT_INDEX/DAG/
  tasks/audit/protocol）零改动。`git diff` 核验见 REPORT.md §6。

## 新增测试（对照 FIX_PACKAGE 0231）

- **F-02 → A11 真并列 tie-break**：`alpha`/`beta` 两条不同文本各
  ingest 两次，count 均为 2（真正并列）；`alpha` 最后一条 receivedAt
  （500）比 `beta`（400）晚 100。断言返回 `alpha`——直证"count 相等
  时按 latest.receivedAt 降序"分支，而非被 count 更大分支巧合掩盖。
- **F-03 → A16 maxPending 缺省=100 直证**：不传 `maxPending`，ingest
  恰 101 条互不相同文本（各成 count=1 簇）；断言候选为 `text-1`
  （首条 `text-0` 已被淘汰，簇数封顶 100）；重入 `text-0` 得 count=1
  全新簇，证明旧簇确已删除。
- **F-04 → denylist 有状态正则回归**：`/badword/g` 作 denylist；
  第一段 `'aaaaaaaaaaaaaaaaaaaa badword'` 命中后遗留 lastIndex=28；
  第二段 `'badword zzzzz…'`（badword 在索引 0-6，早于 28，尾部 z
  填充保证从 28 往后搜无命中）——若 `ingest()` 忘记每次 test() 前
  重置 `pattern.lastIndex = 0`，第二段会被错误放行。断言两条均被丢弃、
  `selectCandidate()` 返回 `undefined`。构造同 DEV-050A-FIX-02
  （0221/0222）。

## 验收结果摘要

A01–A06（命令）PASS，其中 A06：677 tests（674 基线全绿 + 新增 3）。
A07/A11/A16 依据 FIX-01 补测后 PASS（见上）；A14 既有淘汰测试零回归
（同代码路径）；其余 A08–A23 与首轮一致 PASS。实现代码（
`commentPipeline.ts`/`index.ts`/`package.json`）零改动（FIX 范围约束
满足）。

## 请 AUDITOR 核验

请 AUDITOR 以该 `git_head` 独立核验：F-02 两簇 count 真并列（各 2 次
ingest）且 alpha receivedAt 晚 100；F-03 101 条不同文本封顶 100 的
淘汰/重入断言；F-04 第二段 badword 索引 0-6 严格早于遗留
lastIndex=28（撤销 `pattern.lastIndex = 0` 该测试必失败——含自我验证
步骤，参照 DEV-050A-FIX-02 0222 先例）。
