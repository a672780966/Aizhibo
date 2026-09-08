# DEV-070 ACCEPTANCE

本文件由 OpenCode 自 `specs/tasks/TASK-PACKAGE-DEV-070.md` 第 12 节**逐字抄录**。
权威版本是 Task Package 中的 Acceptance 章节，不是本副本（协议 §1.4）。

| # | 判定 | 方式 |
|---|---|---|
| A01 | `pnpm install` 退出码 0 | 命令 |
| A02 | `pnpm typecheck` 退出码 0（含新包 `chapter-authoring-prompts` 真正被 `tsc -b` 构建） | 命令 |
| A03 | `pnpm lint` 退出码 0 | 命令 |
| A04 | `pnpm format:check` 退出码 0 | 命令 |
| A05 | `pnpm build` 退出码 0 | 命令 |
| A06 | `pnpm test` 退出码 0；既有全部测试零回归 | 命令输出 |
| A07 | `CHAPTER_AUTHORING_SCHEMA_PROMPT` 非空字符串 | 测试检查 |
| A08 | 十一个 Stage 标题全部存在 | 测试检查 |
| A09 | 18 个模块关键字全部存在（见 T002 Acceptance 逐条列出） | 测试检查 |
| A10 | 六个 Quality 取值全部存在 | 测试检查 |
| A11 | 五个角色 slot 取值全部存在 | 测试检查 |
| A12 | 字符串内容与本 Task Package 第 2.1 节逐字一致（人工核对） | 文件比对 |
| A13 | 未新增第三方 npm 依赖，`package.json` 无 workspace 依赖 | 文件检查 |
| A14 | 未 import `chapter-schema` 或任何其他既有包 | 代码检查 |
| A15 | 未真实调用任何 AI/LLM API；未实现 Compiler/Repair Loop 逻辑 | 代码检查 |
| A16 | 除本节点 Writable Scope 外任何既有文件均未被修改 | git diff 比对 |
| A17 | `DECISIONS.md` 存在，覆盖第 6 节列出的全部要点 | 文件检查 |
| A18 | `specs/dev/DEV-070/` 节点文档齐全，`INDEX.md` T001–T002 全部勾选，`Status:` 改为 `READY_FOR_REVIEW` | 文件 + 文本检查 |
| A19 | `git log` 新增恰 1 条提交，首行 `DEV-070: chapter authoring schema prompt (11-stage AI authoring instructions, verbatim from chapter-schema)` | 命令 |
| A20 | 提交后 LEDGER 追加行与 NODE_REPORT 消息文件存在于工作区但**未提交**；工作区无任何额外残留文件 | 命令 + `git status` 检查 |
| A21 | `specs/PROJECT_INDEX.md`、`specs/dev/DAG.md`、`specs/tasks/**`、`specs/audit/**`、`specs/protocol/**` 均未被修改 | git diff 比对 |
