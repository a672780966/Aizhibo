# DEV-030 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-030.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0 | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | 全默认 Port 时任意请求得到 `SUBTITLE_ONLY` | 测试检查 |
| A08 | 四种注入组合分别得到正确的 `source`/`file` | 测试检查 |
| A09 | 优先级顺序正确（先命中先用，不做"最优选择"） | 测试检查 |
| A10 | `packages/audio-engine` 无 `chapter-schema` 依赖 | 文件检查 |
| A11 | 未新建 `getHealth()` | 文件检查 |
| A12 | 未接入任何真实 IO（TTS/缓存/文件系统扫描） | 代码检查 |
| A13 | `packages/**`（除新建 `audio-engine` 外）全部未被修改 | git diff 比对 |
| A14 | `apps/renderer/**` 未被修改 | git diff 比对 |
| A15 | 未新增任何 npm 依赖 | 文件检查 |
| A16 | 根 `tsconfig.json` 仅新增一条 reference | git diff 比对 |
| A17 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A18 | `specs/dev/DEV-030/` 节点文档齐全（含 `DECISIONS.md`，已入库），`INDEX.md` T001–T004 全部勾选，`Status:` 表头改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A19 | `git log` 新增恰 1 条提交，首行 `DEV-030: audio manifest`；提交时 `git status --porcelain` 为空 | 命令 |
| A20 | LEDGER 含 `NODE_REPORT-DEV-030` 记录，`git_head` 一致 | LEDGER + 命令比对 |
| A21 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
