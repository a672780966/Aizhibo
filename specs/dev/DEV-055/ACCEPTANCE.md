# DEV-055 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-055.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `audioChannelBusy=true` 时返回 `canSpeak:false, reason:'audioChannelBusy'`，且与其余因子取值无关 | 测试检查 |
| A08 | `audioChannelBusy=false` 时返回 `canSpeak:true, reason:'clear'`，且与其余因子取值无关（含"看起来不该说话"的极端组合） | 测试检查 |
| A09 | 可选字段（`lastHostSpeechTimeMs`/`selectedCommentImportance`）缺省时不抛错 | 测试检查 |
| A10 | 未新增第三方 npm 依赖 | 文件检查 |
| A11 | `platform-core/**`、`platform-twitch/**`、`runtime-kernel/**`、`egressGate.ts`、`commentPipeline.ts`、`hostPersona.ts`、`hostMood.ts` 均未被修改 | git diff 比对 |
| A12 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A13 | `specs/dev/DEV-055/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A14 | `git log` 新增恰 1 条提交，首行 `DEV-055: host scheduler (audio-channel preemption rule only)` | 命令 |
| A15 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A16 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
