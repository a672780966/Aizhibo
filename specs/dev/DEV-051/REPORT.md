# DEV-051 REPORT

## 1. Status

READY_FOR_REVIEW

## 2. Implemented

新增 `packages/ai-host/src/commentPipeline.ts`（Dev Spec 第 40 节：流水线
Safety→Priority→Topic Cluster→Select Candidate 四步，Deduplicate/
Normalize 已在 M4 完成）：

- **Safety**：`ingest()` 先做黑名单（注入式 `denylist: RegExp[]`，同
  DEV-050A C3 模式）与长度（`maxLength`，缺省 500）检查，命中即丢弃，
  不产生簇。
- **Topic Cluster**：归一化文本（`trim().toLowerCase()`）精确匹配聚类，
  同簇累加 `count`、更新 `latest`（簇内最近一条消息）。
- **Priority**：`selectCandidate()` 按簇大小（`count`）降序，并列按
  最近收到时间（`latest.receivedAt`）降序只读选出候选。
- **Select Candidate**：返回 `{ message, clusterSize }`；无任何簇时返回
  `undefined`。只读查询、不清空状态。
- **容量淘汰**：簇数超过 `maxPending`（缺省 100）时淘汰优先级最低的簇
  （count 最小，并列取 receivedAt 最旧）。
- **`clear()`**：清空全部簇。

零 LLM、零第三方依赖、无 embedding/语义聚类；黑名单/长度/容量默认值均
可经 `config` 覆盖。本节点不实现 Deduplicate/Normalize 之外的任何机制
改动，不接入 runtime-kernel/Host LLM Provider/Host Scheduler。

## 3. Changed Files

Writable Scope 内共 6 个文件（§7 恰 1 条提交；INDEX/REPORT/DECISIONS
随该提交入库，LEDGER 追加行与 NODE_REPORT 消息文件写入工作区但不提交）：

```text
packages/ai-host/src/commentPipeline.ts       （新增，流水线主体）
packages/ai-host/src/commentPipeline.test.ts  （新增，10 条测试）
packages/ai-host/src/index.ts                 （追加导出 ./commentPipeline.js）
packages/ai-host/package.json                 （追加 @interactive-story/platform-core workspace 依赖，SCOPE_RULING 0227 授权）
pnpm-lock.yaml                                （随 pnpm install 刷新）
specs/dev/DEV-051/DECISIONS.md                （新增，D1–D5）
specs/dev/DEV-051/REPORT.md                   （本文件，T001 模板 → T002 回填）
specs/dev/DEV-051/INDEX.md                    （T001–T002 勾选 + Status=READY_FOR_REVIEW）
```

## 4. Tests Executed

| 项 | 结果 |
|---|---|
| `pnpm test`（commentPipeline.test.ts） | 10 个测试全部通过 |
| `pnpm test`（全量 workspace） | 零回归：115 个测试文件，674 个测试全部通过 |

## 5. Acceptance Results

| # | 判定 | 结果 | 说明 |
|---|---|---|---|
| A01 | `pnpm install` 退出码 0 | PASS | 见 §3（package.json 追加 platform-core 依赖，SCOPE_RULING 0227 授权） |
| A02 | `pnpm typecheck` 退出码 0 | PASS | typecheck 通过 |
| A03 | `pnpm lint` 退出码 0 | PASS | lint 通过 |
| A04 | `pnpm format:check` 退出码 0 | PASS | format 检查通过 |
| A05 | `pnpm build` 退出码 0 | PASS | build 通过 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | PASS | 全量 115 文件 / 674 测试全绿（见 §4） |
| A07 | 命中黑名单的评论被丢弃，不产生簇 | PASS | 测试：含黑名单词的评论 ingest 后候选为该安全评论 |
| A08 | 超过 `maxLength` 的评论被丢弃 | PASS | 测试：超长评论 ingest 后 `selectCandidate()` 返回 `undefined` |
| A09 | 归一化后相同文本聚为同一簇，`count` 正确累加，`latest` 正确更新 | PASS | 测试：`Hello There` 与 `  hello there  ` 同簇，count=2 且 latest 为后收到的一条 |
| A10 | 不同文本各自独立成簇 | PASS | 测试：不同文本各自 count=1 |
| A11 | `selectCandidate()` 按簇大小降序、并列按最近时间降序选出候选 | PASS | 测试：count 大的簇胜出；并列时 receivedAt 更新的簇胜出 |
| A12 | 无任何簇时 `selectCandidate()` 返回 `undefined` | PASS | 测试：空流水线返回 `undefined` |
| A13 | `selectCandidate()` 连续调用（不 ingest/clear）结果一致，验证只读不清空 | PASS | 测试：连续 select 结果一致（D5） |
| A14 | 簇数超过 `maxPending` 时正确淘汰优先级最低的簇 | PASS | 测试：容量超限淘汰 count 最小/最旧的簇（D4） |
| A15 | `clear()` 清空全部簇，之后可重新正常 `ingest` | PASS | 测试：clear 后 select 为 undefined，再 ingest 恢复正常（D5） |
| A16 | 缺省 `maxLength`（500）/`maxPending`（100）符合文档 | PASS | 缺省 500/100，可经 config 覆盖（D4） |
| A17 | 未新增第三方 npm 依赖 | PASS | 仅追加 workspace 内 `@interactive-story/platform-core`（SCOPE_RULING 0227），零第三方（D1） |
| A18 | `platform-core/**`、`platform-twitch/**`、`runtime-kernel/**`、`egressGate.ts` 均未被修改 | PASS | 见 §6 Scope Check 空 diff 佐证 |
| A19 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | PASS | D1–D5 覆盖五要点（见 DECISIONS.md） |
| A20 | `specs/dev/DEV-051/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | PASS | 五份文档齐全；INDEX Task 全勾 + Status 已更新 |
| A21 | `git log` 新增恰 1 条提交，首行 `DEV-051: comment pipeline (safety, priority, topic cluster, select candidate)` | PASS | 见 §7 |
| A22 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | PASS | 见 §8 |
| A23 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | PASS | 见 §6 Scope Check 空 diff 佐证 |

## 6. Scope Check

只施工 DEV-051。严格在 Writable Scope 内改动（见 §3 六个文件），未触碰
Forbidden Scope 任何文件：`packages/platform-core/**`、
`packages/platform-twitch/**`、`packages/runtime-kernel/**`、
`packages/ai-host/src/egressGate.ts` 零改动（A18）；未实现真正的语义
聚类/情感分析/关键词权重（D2/D3）；未接入 runtime-kernel/Host LLM
Provider/Host Scheduler；未新增任何第三方 npm 依赖，仅追加 workspace
内 `@interactive-story/platform-core` 依赖且经 SCOPE_RULING 0227 授权
（A17）；未创建除 ai-host 内文件外的任何新包；
`specs/PROJECT_INDEX.md`/`DAG.md`/`tasks/**`/`audit/**`/`protocol/**`
零改动（A23）。Forbidden Scope 全部遵守，无越界。

**Scope Deviations（申报）**：`REQUIREMENTS.md` 与 `ACCEPTANCE.md` 由
Commander 在 dispatch 时预填，本节点零改动（同 DEV-041/042/043 先例）；
`packages/ai-host/package.json` 追加 platform-core 依赖属于 Writable
Scope 内 `index.ts`（追加导出）的必要配套，已按 SCOPE_RULING 0227
授权执行；`pnpm-lock.yaml` 为 `pnpm install` 后的锁文件刷新，随提交
入库，未手工改动。`DECISIONS.md`/`REPORT.md`/`INDEX.md` 为 T001
新建/模板，T002 回填定稿。

## 7. Commit

提交信息首行：`DEV-051: comment pipeline (safety, priority, topic cluster, select candidate)`。

恰 1 条提交，包含：`commentPipeline.ts`、`commentPipeline.test.ts`、
`index.ts` 导出、`package.json`（platform-core 依赖 + SCOPE_RULING
0227）、`pnpm-lock.yaml` 刷新、`DECISIONS.md`/`REPORT.md`/`INDEX.md`
节点文档。LEDGER 追加行与 NODE_REPORT 消息文件已写入工作区但**未提交**
（A21/A22）。

## 8. Handoff

LEDGER 追加行与 NODE_REPORT 消息文件（`specs/comms/`）留给 Commander
收尾统一提交，不在本次提交范围内（A22，Constraint 8）。NODE_REPORT
发往 `AUDITOR`，抄送 `COMMANDER`；审核锚点与交付快照见
`specs/comms/NNNN-OPENCODE-to-AUDITOR-NODE_REPORT-DEV-051.md`。
