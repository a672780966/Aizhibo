# DEV-050A ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-050A.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `permission:'MUTED'` 恒定 DROP（PERMISSION），与文本内容无关 | 测试检查 |
| A08 | 命中 `forbiddenLexicon.always`/`bySceneId` → DROP（HIDDEN_LEXICON），大小写/空白容错 | 测试检查 |
| A09 | 命中 `platformDenylist` → DROP（PLATFORM_DENYLIST） | 测试检查 |
| A10 | 重复文本（规范化后相同）第二次 → DROP（DUPLICATE） | 测试检查 |
| A11 | 超长文本 → DROP（LENGTH） | 测试检查 |
| A12 | 频率超限 → DROP（RATE_LIMIT），窗口过期后恢复放行 | 测试检查 |
| A13 | 被 DROP 的尝试不计入 C4/C5 历史状态 | 测试检查 |
| A14 | 同时触发多条规则时按 C1→C5 顺序返回最先命中的 rule | 测试检查 |
| A15 | 全部通过 → `{decision:'ALLOW'}` | 测试检查 |
| A16 | 可选配置项缺省值符合第 2.1 节（20/200/5-per-60000ms） | 测试检查 |
| A17 | `packages/chapter-compiler/**`、`packages/runtime-kernel/**` 未被修改 | git diff 比对 |
| A18 | 未接入 runtime-kernel 事件日志/DEV-046/DEV-057 | 源码检查 |
| A19 | 未新增第三方 npm 依赖；未创建 `ai-host` 外的新包 | 文件检查 |
| A20 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A21 | `specs/dev/DEV-050A/` 节点文档齐全，`INDEX.md` T001–T003 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A22 | `git log` 新增恰 1 条提交，首行 `DEV-050A: host egress gate (write-side safety boundary)` | 命令 |
| A23 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交** | 命令 |
| A24 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
